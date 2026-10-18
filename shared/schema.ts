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
  contentHash: z.string().max(100).optional(),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  evidence: z.array(evidenceSchema).max(100),
  origin: z.enum(['observed', 'manual', 'inferred']),
  members: z.array(z.string().max(500)).max(500).optional(),
});
export const linkSchema = z
  .object({
    id: z.string().max(1200),
    source: z.string().max(500),
    target: z.string().max(500),
    label: z.string().max(200),
    evidence: evidenceSchema.optional(),
    origin: z.enum(['observed', 'manual', 'inferred']),
  })
  .refine((edge) => edge.origin === 'manual' || Boolean(edge.evidence), {
    message: 'Source-backed connections require evidence.',
  });
export const flowStepSchema = z.object({
  id: z.string().max(1200),
  edgeId: z.string().max(1200),
  title: z.string().max(200),
  description: z.string().max(2000),
  evidence: evidenceSchema,
});
export const flowSchema = z.object({
  id: z.string().max(500),
  title: z.string().max(200),
  description: z.string().max(2000),
  origin: z.enum(['observed', 'inferred']),
  steps: z.array(flowStepSchema).min(1).max(100),
});
export const graphDataSchema = z.object({
  nodes: z.array(moduleSchema).max(500),
  edges: z.array(linkSchema).max(5000),
  flows: z.array(flowSchema).max(40).optional(),
});
function validateGraph(graph: z.infer<typeof graphDataSchema>, ctx: z.RefinementCtx) {
  const ids = new Set(graph.nodes.map((n) => n.id));
  if (ids.size !== graph.nodes.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate component IDs.' });
  const edgeIds = new Set(graph.edges.map((e) => e.id));
  if (edgeIds.size !== graph.edges.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate connection IDs.' });
  for (const edge of graph.edges)
    if (!ids.has(edge.source) || !ids.has(edge.target))
      ctx.addIssue({ code: 'custom', message: 'Connection references a missing component.' });
  if (new Set((graph.flows ?? []).map((f) => f.id)).size !== (graph.flows?.length ?? 0))
    ctx.addIssue({ code: 'custom', message: 'Duplicate walkthrough IDs.' });
  for (const flow of graph.flows ?? [])
    for (const step of flow.steps)
      if (!edgeIds.has(step.edgeId))
        ctx.addIssue({ code: 'custom', message: 'Walkthrough references a missing connection.' });
}
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
    level: z.enum(['architecture', 'modules']).optional(),
    summary: z.string().max(4000).optional(),
    focus: z.string().max(500).optional(),
    flows: z.array(flowSchema).max(40).optional(),
    alternate: graphDataSchema.optional(),
  })
  .superRefine((graph, ctx) => {
    validateGraph(graph, ctx);
    if (graph.alternate) validateGraph(graph.alternate, ctx);
  });
export const proposalSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string().max(200),
  summary: z.string().max(4000),
  engine: z.enum(['local', 'model']),
  graph: graphDataSchema.superRefine(validateGraph),
});
export type GraphData = z.infer<typeof graphDataSchema>;
export type Flow = z.infer<typeof flowSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Module = z.infer<typeof moduleSchema>;
export type Link = z.infer<typeof linkSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Answer = { text: string; evidence: Evidence[]; mode: 'search' | 'ai' };

export const changeStatusSchema = z.enum(['added', 'modified', 'removed']);
export const fileChangeSchema = z.object({
  file: z.string(),
  status: changeStatusSchema,
  before: moduleSchema.optional(),
  after: moduleSchema.optional(),
  beforeEvidence: evidenceSchema.optional(),
  afterEvidence: evidenceSchema.optional(),
  patch: z.string().max(200000).optional(),
});
export const dependencyChangeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string(),
  status: z.enum(['added', 'removed']),
  evidence: evidenceSchema,
});
export const comparisonSchema = z.object({
  baseline: z.object({
    ref: z.string(),
    revision: z.string(),
    filesScanned: z.number(),
    kind: z.enum(['git', 'working-tree']).optional(),
    capturedAt: z.string().optional(),
  }),
  current: z.object({
    revision: z.string().nullable(),
    analyzedAt: z.string(),
    filesScanned: z.number(),
  }),
  files: z.array(fileChangeSchema).max(1000),
  dependencies: z.array(dependencyChangeSchema).max(10000),
  relationships: z.array(z.object({ id: z.string(), status: z.enum(['added', 'removed']) })),
  graph: graphDataSchema.superRefine(validateGraph),
  areas: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      files: z.array(z.string()),
      status: changeStatusSchema,
    }),
  ),
  warnings: z.array(z.string()),
  partial: z.boolean(),
});
export type Comparison = z.infer<typeof comparisonSchema>;
export type FileChange = z.infer<typeof fileChangeSchema>;

export const refsSchema = z.object({
  branch: z.string().nullable(),
  sha: z.string().nullable(),
  dirty: z.boolean(),
  refs: z
    .array(
      z.object({
        name: z.string().max(300),
        sha: z.string().max(60),
        kind: z.enum(['branch', 'tag']),
      }),
    )
    .max(500),
  recent: z
    .array(
      z.object({ sha: z.string().max(60), date: z.string().max(40), subject: z.string().max(300) }),
    )
    .max(50),
});
export type Refs = z.infer<typeof refsSchema>;

export const codingSessionSchema = z.object({
  id: z.string().max(200),
  title: z.string().max(500),
  directory: z.string().max(2000),
});
export const agentConnectionSchema = z.object({
  connected: z.boolean(),
  baseUrl: z.string().optional(),
  root: z.string().optional(),
  tracking: z
    .object({
      session: codingSessionSchema,
      capturedAt: z.string(),
      expiresAt: z.string(),
      state: z.enum(['waiting', 'working', 'ready']),
      request: z.string().max(4000),
      turnId: z.string().max(200),
    })
    .nullable(),
});
export type CodingSession = z.infer<typeof codingSessionSchema>;
export type AgentConnection = z.infer<typeof agentConnectionSchema>;
