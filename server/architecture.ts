import dagre from '@dagrejs/dagre';
import type { CallSite } from './calls.js';
import type { GraphData, Module, Project, Flow } from '../shared/schema.js';

export function humanize(name: string) {
  return name
    .replace(/\.[cm]?[jt]sx?$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}
function responsibility(node: Module): [string, string, Module['kind']] {
  const text = `${node.file} ${node.exports.join(' ')}`.toLowerCase();
  const rules: [RegExp, string, string, Module['kind']][] = [
    [/auth|session|permission/, 'identity', 'Identity & access', 'service'],
    [/credit|billing|payment|subscription/, 'billing', 'Billing & credits', 'service'],
    [/worker|processor|consumer|scheduler/, 'workers', 'Background workers', 'service'],
    [/queue|broker|messag|pubsub/, 'messaging', 'Job queue & messaging', 'service'],
    [/provider|llm|inference|openai|anthropic/, 'providers', 'Model providers', 'external'],
    [/database|prisma|drizzle|schema|repository/, 'data', 'Database & records', 'data'],
    [/storage|upload|bucket|s3|blob/, 'storage', 'File storage', 'data'],
    [/(?:^|\/)(?:api|routes|handlers|controllers)\//, 'api', 'API & request handlers', 'entry'],
    [/component|\.tsx|\.jsx|\/pages\/|\/views\//, 'interface', 'User interface', 'ui'],
    [/test|spec|fixture/, 'tests', 'Tests & fixtures', 'module'],
    [/config|settings/, 'config', 'Configuration', 'module'],
    [/util|helper|lib\//, 'utilities', 'Shared utilities', 'module'],
  ];
  // File location takes precedence over exported names for API boundaries.
  if (/(?:^|\/)(?:api|routes|handlers|controllers)\//.test(node.file))
    return ['api', 'API & request handlers', 'entry'];
  for (const [pattern, id, label, kind] of rules) if (pattern.test(text)) return [id, label, kind];
  if (node.kind === 'entry') return ['application', 'Application entry points', 'entry'];
  const folders = node.file
    .split('/')
    .slice(0, -1)
    .filter((p) => !['src', 'app', 'source'].includes(p));
  const folder = folders.slice(0, 2).join('/') || 'application';
  return [`area:${folder}`, humanize(folders.at(-1) || 'Application logic'), 'module'];
}
export function layoutGraph<T extends GraphData>(graph: T): T {
  const layout = new dagre.graphlib.Graph();
  layout.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 55, marginx: 30, marginy: 30 });
  layout.setDefaultEdgeLabel(() => ({}));
  for (const node of graph.nodes) layout.setNode(node.id, { width: 245, height: 130 });
  for (const edge of graph.edges) layout.setEdge(edge.source, edge.target);
  dagre.layout(layout);
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const position = layout.node(node.id);
      return { ...node, position: { x: position.x - 122, y: position.y - 65 } };
    }),
  };
}
export function buildArchitecture(project: Project, calls: CallSite[] = []): Project {
  const groups = new Map<string, Module>();
  const membership = new Map<string, string>();
  for (const node of project.nodes) {
    const [role, label, kind] = responsibility(node);
    const id = `area:${role}`;
    membership.set(node.id, id);
    const existing = groups.get(id);
    if (existing) {
      existing.members!.push(node.id);
      existing.lines += node.lines;
      existing.exports = [...new Set([...existing.exports, ...node.exports])].slice(0, 200);
      existing.evidence = [...existing.evidence, ...node.evidence].slice(0, 100);
    } else
      groups.set(id, {
        ...node,
        id,
        label,
        kind,
        members: [node.id],
        file: node.file,
        origin: 'inferred',
        evidence: [...node.evidence],
        exports: [...node.exports],
      });
  }
  for (const group of groups.values()) {
    const files = group.members!;
    group.description = `${files.length} source file${files.length === 1 ? '' : 's'}: ${files
      .slice(0, 6)
      .join(', ')}${files.length > 6 ? `, +${files.length - 6} more` : ''}`;
  }
  const edges = new Map<string, Project['edges'][number]>();
  for (const edge of project.edges) {
    const source = membership.get(edge.source)!;
    const target = membership.get(edge.target)!;
    if (source === target) continue;
    const id = `${source}->${target}`;
    if (!edges.has(id))
      edges.set(id, { ...edge, id, source, target, label: 'Imports source', origin: 'observed' });
  }
  const byFunction = new Map<string, CallSite[]>();
  for (const call of calls) {
    const source = membership.get(call.file);
    const target = membership.get(call.target);
    if (!source || !target || source === target) continue;
    const id = `${source}->${target}`;
    edges.set(id, {
      id,
      source,
      target,
      label: `Calls ${call.symbol}`,
      evidence: call.evidence,
      origin: 'observed',
    });
    const key = `${call.file}#${call.caller}`;
    byFunction.set(key, [...(byFunction.get(key) ?? []), call]);
  }
  const flows: Flow[] = [...byFunction]
    .filter(([, steps]) => steps.length >= 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 30)
    .map(([id, sites]) => ({
      id,
      title: humanize(sites[0].caller),
      origin: 'observed',
      description: `Imported calls in ${sites[0].caller} (${sites[0].file}).`,
      steps: sites.slice(0, 100).map((call, index) => ({
        id: `${id}:${index}`,
        edgeId: `${membership.get(call.file)}->${membership.get(call.target)}`,
        title: humanize(call.symbol),
        description: `${call.caller} calls ${call.symbol} at ${call.file}:${call.evidence.line}.${call.conditional ? ' This call is inside a conditional or loop.' : ''}`,
        evidence: call.evidence,
      })),
    }));
  const graph = layoutGraph({ nodes: [...groups.values()], edges: [...edges.values()], flows });
  return {
    ...project,
    ...graph,
    level: 'architecture',
    summary: `${project.filesScanned} source files organized into ${groups.size} responsibility areas. Boundaries are inferred from source structure; connections retain observed imports and call sites.`,
    alternate: { nodes: project.nodes, edges: project.edges, flows: [] },
  };
}
