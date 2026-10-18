import { analyze } from './analyzer.js';
import { readGitSnapshot } from './git-snapshot.js';
import { buildArchitecture, layoutGraph } from './architecture.js';
import { unifiedDiff } from './diff.js';
import { comparisonSchema, type Comparison, type Project } from '../shared/schema.js';
import { createHash } from 'node:crypto';

export function compareProjects(before: Project, after: Project, ref: string): Comparison {
  const partial = before.warnings.length > 0 || after.warnings.length > 0;
  const oldFiles = new Map(before.nodes.map((n) => [n.file, n]));
  const newFiles = new Map(after.nodes.map((n) => [n.file, n]));
  const files: Comparison['files'] = [];
  for (const file of [...new Set([...oldFiles.keys(), ...newFiles.keys()])].sort()) {
    const old = oldFiles.get(file),
      current = newFiles.get(file);
    if (partial && (!old || !current)) continue;
    if (
      old &&
      current &&
      (old.contentHash ?? old.evidence[0]?.hash) ===
        (current.contentHash ?? current.evidence[0]?.hash)
    )
      continue;
    files.push({
      file,
      status: !old ? 'added' : !current ? 'removed' : 'modified',
      before: old,
      after: current,
    });
  }
  const key = (e: Project['edges'][number]) => JSON.stringify([e.source, e.target, e.label]);
  const oldEdges = new Map(before.edges.map((e) => [key(e), e]));
  const newEdges = new Map(after.edges.map((e) => [key(e), e]));
  const dependencies: Comparison['dependencies'] = [];
  for (const [edges, other, status] of [
    [oldEdges, newEdges, 'removed'],
    [newEdges, oldEdges, 'added'],
  ] as const)
    for (const [id, edge] of edges)
      if (!partial && !other.has(id) && edge.evidence)
        dependencies.push({
          source: edge.source,
          target: edge.target,
          label: edge.label,
          status,
          evidence: edge.evidence,
        });
  const oldGraph = buildArchitecture(before),
    newGraph = buildArchitecture(after);
  const oldAreas = new Map(oldGraph.nodes.map((n) => [n.id, n]));
  const newAreas = new Map(newGraph.nodes.map((n) => [n.id, n]));
  const touched = new Set(files.map((f) => f.file));
  const areas: Comparison['areas'] = [];
  const graphNodes = [];
  for (const id of new Set([...oldAreas.keys(), ...newAreas.keys()])) {
    const old = oldAreas.get(id),
      current = newAreas.get(id),
      node = current ?? old!;
    const changedFiles = [
      ...new Set([...(old?.members ?? []), ...(current?.members ?? [])]),
    ].filter((f) => touched.has(f));
    if (changedFiles.length)
      areas.push({
        id,
        label: node.label,
        files: changedFiles,
        status: partial ? 'modified' : !old ? 'added' : !current ? 'removed' : 'modified',
      });
    graphNodes.push(node);
  }
  const graphEdges = new Map(oldGraph.edges.map((e) => [e.id, e]));
  for (const e of newGraph.edges) graphEdges.set(e.id, e);
  const relationships: Comparison['relationships'] = [];
  if (!partial) {
    for (const edge of oldGraph.edges)
      if (!newGraph.edges.some((e) => e.id === edge.id))
        relationships.push({ id: edge.id, status: 'removed' });
    for (const edge of newGraph.edges)
      if (!oldGraph.edges.some((e) => e.id === edge.id))
        relationships.push({ id: edge.id, status: 'added' });
  }
  const warnings = [
    ...before.warnings.map((w) => `Baseline: ${w}`),
    ...after.warnings.map((w) => `Working tree: ${w}`),
    'Compared inspected JavaScript/TypeScript source only. Renames appear as removal and addition. Static dependencies do not establish runtime behavior.',
  ];
  if (partial)
    warnings.unshift(
      'Incomplete coverage: additions, removals, and dependency changes are withheld. Only modifications to files inspected on both sides are reported.',
    );
  return comparisonSchema.parse({
    baseline: {
      ref,
      revision: before.revision ?? 'unversioned',
      filesScanned: before.filesScanned,
    },
    current: {
      revision: after.revision,
      analyzedAt: after.analyzedAt,
      filesScanned: after.filesScanned,
    },
    files,
    dependencies,
    relationships,
    areas,
    graph: layoutGraph({ nodes: graphNodes, edges: [...graphEdges.values()] }),
    warnings,
    partial,
  });
}
export async function compareRevisions(root: string, ref = 'HEAD', focus = '', compare?: string) {
  const before = await readGitSnapshot(root, ref, focus);
  const beforeProject = await analyze(root, 'local', true, focus, before);
  let afterProject: Project;
  let currentFiles: Map<string, string>;
  if (compare) {
    const after = await readGitSnapshot(root, compare, focus);
    currentFiles = after.files;
    afterProject = await analyze(root, 'local', true, focus, after);
  } else {
    currentFiles = new Map<string, string>();
    afterProject = await analyze(root, 'local', true, focus, undefined, true, (file, content) =>
      currentFiles.set(file, content),
    );
  }
  const report = compareProjects(
    { ...beforeProject, ...beforeProject.alternate!, level: 'modules' },
    { ...afterProject, ...afterProject.alternate!, level: 'modules' },
    ref,
  );
  if (compare)
    report.baseline = { ...report.baseline, kind: 'git', revision: before.revision, ref };
  return addChangeEvidence(report, before.files, currentFiles);
}
export const compareWorkingTree = (root: string, ref = 'HEAD', focus = '') =>
  compareRevisions(root, ref, focus);
export function addChangeEvidence(
  report: Comparison,
  beforeFiles: Map<string, string>,
  currentFiles: Map<string, string>,
) {
  for (const change of report.files) {
    const old = beforeFiles.get(change.file),
      current = currentFiles.get(change.file);
    const oldLines = old?.split(/\r?\n/) ?? [],
      newLines = current?.split(/\r?\n/) ?? [];
    let first = 0;
    while (
      first < oldLines.length &&
      first < newLines.length &&
      oldLines[first] === newLines[first]
    )
      first++;
    const excerpt = (content: string, lines: string[]) => {
      const start = Math.max(0, Math.min(first, lines.length - 1) - 3);
      return {
        id: `${change.file}:${start + 1}:change`,
        file: change.file,
        line: start + 1,
        endLine: Math.min(start + 13, lines.length),
        snippet: lines
          .slice(start, start + 13)
          .join('\n')
          .slice(0, 20000),
        hash: createHash('sha256').update(content).digest('hex'),
      };
    };
    if (old !== undefined) change.beforeEvidence = excerpt(old, oldLines);
    if (current !== undefined) change.afterEvidence = excerpt(current, newLines);
    const patch = unifiedDiff(old ?? '', current ?? '');
    if (patch) change.patch = patch.slice(0, 200000);
  }
  return comparisonSchema.parse(report);
}
