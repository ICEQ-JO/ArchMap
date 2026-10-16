import type { Project, Link } from '../../shared/schema';
export function dependencyWalk(project: Project, start?: string): Link[] {
  const imported = new Set(project.edges.map(e => e.target));
  const root = start || project.nodes.find(n => !imported.has(n.id))?.id || project.nodes[0]?.id;
  if (!root) return [];
  const seen = new Set<string>();
  const result: Link[] = [];
  function visit(id: string) {
    if (seen.has(id)) return;
    seen.add(id);
    for (const edge of project.edges.filter(e => e.source === id)) {
      result.push(edge);
      visit(edge.target);
    }
  }
  visit(root);
  return result.slice(0, 100);
}
export function refreshProject(fresh: Project, previous: Project): Project {
  const positions = new Map(previous.nodes.map(n => [n.id, n.position]));
  const nodes = [...fresh.nodes.map(n => ({ ...n, position: positions.get(n.id) ?? n.position })), ...previous.nodes.filter(n => n.origin === 'manual' && !fresh.nodes.some(f => f.id === n.id))];
  const ids = new Set(nodes.map(n => n.id));
  return { ...fresh, nodes, edges: [...fresh.edges, ...previous.edges.filter(e => e.origin === 'manual' && ids.has(e.source) && ids.has(e.target))] };
}
export function downloadProject(project: Project) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '-')}.archmap.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const SAVE_KEY = 'archmap.project.v1';
