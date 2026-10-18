import type { Comparison, FileChange } from './schema';

const stop = new Set([
  'what',
  'changed',
  'change',
  'changes',
  'the',
  'in',
  'to',
  'for',
  'how',
  'does',
  'show',
  'me',
  'and',
  'a',
  'an',
  'of',
]);
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/authentication|authorization|authenticate/g, 'auth')
    .replace(/subscriptions?/g, 'subscription')
    .replace(/payments?/g, 'payment')
    .replace(/generation|generate/g, 'generat');

/** Deterministic scope selection, not semantic inference or a correctness review. */
export function focusChanges(report: Comparison, question = '', areaId?: string | null) {
  const terms = normalize(question)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !stop.has(t));
  const area = report.areas.find((a) => a.id === areaId);
  const files = report.files.filter((file) => {
    if (areaId && !area?.files.includes(file.file)) return false;
    const areas = report.areas.filter((a) => a.files.includes(file.file));
    const text = normalize(
      [
        file.file,
        ...areas.map((a) => a.label),
        ...report.dependencies
          .filter((d) => d.source === file.file)
          .map((d) => `${d.target} ${d.label} ${d.evidence.snippet}`),
        ...(file.before?.exports ?? []),
        ...(file.after?.exports ?? []),
      ].join(' '),
    );
    return !terms.length || terms.some((term) => text.includes(term));
  });
  const paths = new Set(files.map((f) => f.file));
  const dependencies = report.dependencies.filter(
    (d) => paths.has(d.source) || paths.has(d.target),
  );
  const contextFiles = [...new Set(dependencies.flatMap((d) => [d.source, d.target]))].filter(
    (f) => !paths.has(f),
  );
  const matchedNodeIds = new Set(
    report.areas.filter((a) => a.files.some((f) => paths.has(f))).map((a) => a.id),
  );
  // One-hop neighbors provide structural context, not a claim of transitive impact.
  const nodeIds = new Set(matchedNodeIds);
  for (const edge of report.graph.edges) {
    if (matchedNodeIds.has(edge.source)) nodeIds.add(edge.target);
    if (matchedNodeIds.has(edge.target)) nodeIds.add(edge.source);
  }
  return {
    files,
    dependencies,
    contextFiles,
    nodeIds,
    matchedNodeIds,
    terms,
    brief: files.map(describeChange),
  };
}
/** Plain-language head line for a change review. Deterministic, from the report only. */
export function summarizeChanges(report: Comparison) {
  const count = (status: FileChange['status']) =>
    report.files.filter((file) => file.status === status).length;
  const added = count('added'),
    modified = count('modified'),
    removed = count('removed');
  const depAdded = report.dependencies.filter((d) => d.status === 'added').length;
  const depRemoved = report.dependencies.filter((d) => d.status === 'removed').length;
  const dependencies = depAdded + depRemoved;
  const areas = report.areas.map((area) => area.label);
  const parts: string[] = [];
  if (report.files.length) {
    parts.push(`${report.files.length} file${report.files.length === 1 ? '' : 's'} changed`);
    if (added) parts.push(`${added} added`);
    if (modified) parts.push(`${modified} modified`);
    if (removed) parts.push(`${removed} removed`);
    if (areas.length) parts.push(`${areas.length} area${areas.length === 1 ? '' : 's'} touched`);
    if (dependencies)
      parts.push(`${dependencies} dependency change${dependencies === 1 ? '' : 's'}`);
  }
  const text = report.files.length
    ? parts.join(' · ')
    : report.partial
      ? 'No changes found in the files inspected on both sides. Coverage is incomplete.'
      : 'No JavaScript or TypeScript source changes in the inspected scope.';
  return { added, modified, removed, dependencies, areas, partial: report.partial, text };
}
export function describeChange(file: FileChange) {
  const old = new Set(file.before?.exports ?? []),
    current = new Set(file.after?.exports ?? []);
  const added = [...current].filter((name) => !old.has(name));
  const removed = [...old].filter((name) => !current.has(name));
  const parts = [
    file.status === 'added'
      ? 'Source file added.'
      : file.status === 'removed'
        ? 'Source file removed.'
        : 'Source content modified.',
  ];
  if (added.length) parts.push(`Exports added: ${added.join(', ')}.`);
  if (removed.length) parts.push(`Exports removed: ${removed.join(', ')}.`);
  if (file.status === 'modified' && !added.length && !removed.length)
    parts.push('Exported names are unchanged; behavior may still differ.');
  return { file: file.file, text: parts.join(' ') };
}
