import type { Project } from '../../shared/schema';

/** Compact sparse scans without inventing relationships or changing saved layouts. */
export function arrangeSparse(project: Project): Project {
  function arrange(graph: Pick<Project, 'nodes' | 'edges' | 'flows'>) {
    if (graph.nodes.length < 3 || graph.edges.length >= graph.nodes.length / 2) return graph;
    const columns = Math.min(4, Math.ceil(Math.sqrt(graph.nodes.length)));
    return {
      ...graph,
      nodes: graph.nodes.map((node, index) => ({
        ...node,
        position: { x: (index % columns) * 340, y: Math.floor(index / columns) * 205 },
      })),
    };
  }
  return {
    ...project,
    ...arrange(project),
    alternate: project.alternate ? arrange(project.alternate) : undefined,
  };
}
