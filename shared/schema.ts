import { z } from 'zod';

export const evidenceSchema = z.object({
  id: z.string().max(500),
  file: z.string().max(500),
  line: z.number().int().positive(),
  endLine: z.number().int().positive(),
  snippet: z.string().max(20000),
  hash: z.string().max(100),
});
export const moduleSchema = z.object({
  id: z.string().max(500),
  label: z.string().max(120),
  file: z.string().max(500),
  kind: z.enum(['entry', 'module', 'service', 'data', 'ui', 'external']),
  description: z.string().max(2000),
  exports: z.array(z.string().max(200)).max(200),
  lines: z.number().int().nonnegative(),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  evidence: z.array(evidenceSchema).max(100),
  origin: z.enum(['observed', 'manual']),
});
export const linkSchema = z.object({
  id: z.string().max(1200),
  source: z.string().max(500),
  target: z.string().max(500),
  label: z.string().max(200),
  evidence: evidenceSchema.optional(),
  origin: z.enum(['observed', 'manual']),
});
export const projectSchema = z
  .object({
    version: z.literal(1),
    id: z.string().max(100),
    name: z.string().max(200),
    root: z.string().max(2000),
    revision: z.string().nullable(),
    analyzedAt: z.string(),
    mode: z.enum(['example', 'local']),
    nodes: z.array(moduleSchema).max(500),
    edges: z.array(linkSchema).max(5000),
    warnings: z.array(z.string()).max(100),
    filesScanned: z.number(),
  })
  .superRefine((graph, ctx) => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    if (ids.size !== graph.nodes.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate component IDs.' });
    if (new Set(graph.edges.map((e) => e.id)).size !== graph.edges.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate connection IDs.' });
    for (const edge of graph.edges)
      if (!ids.has(edge.source) || !ids.has(edge.target))
        ctx.addIssue({ code: 'custom', message: 'Connection references a missing component.' });
  });
export type Evidence = z.infer<typeof evidenceSchema>;
export type Module = z.infer<typeof moduleSchema>;
export type Link = z.infer<typeof linkSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Answer = { text: string; evidence: Evidence[]; mode: 'search' | 'ai' };
