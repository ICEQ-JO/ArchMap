import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';
import { analyze } from '../server/analyzer.js';
import { collectCalls } from '../server/calls.js';
import { materializeProposal, proposeMap } from '../server/proposals.js';
import { projectSchema, proposalSchema } from '../shared/schema.js';

const fixture = path.resolve('examples/image-studio');
test('architecture groups responsibilities, retains detail, and walks actual source call sites', async () => {
  const project = await analyze(fixture, 'example', true);
  assert.equal(project.nodes.length, 9);
  assert.equal(project.alternate?.nodes.length, 10);
  assert.ok(project.nodes.every((n) => n.origin === 'inferred'));
  const flow = project.flows!.find((f) => f.title === 'Generate Image')!;
  assert.deepEqual(
    flow.steps.map((s) => s.title),
    ['Authenticate', 'Reserve Credits', 'Enqueue'],
  );
  assert.ok(flow.steps[0].evidence.snippet.includes('authenticate(token)'));
  assert.equal(flow.steps[0].evidence.line, 6);
  assert.ok(project.edges.every((e) => e.evidence));
  assert.ok(projectSchema.safeParse(project).success);
  const invalid = structuredClone(project);
  invalid.flows![0].steps[0].edgeId = 'missing';
  assert.equal(projectSchema.safeParse(invalid).success, false);
});

test('call-site extraction excludes shadowed imports and deferred callbacks and flags branches', () => {
  const source = ts.createSourceFile(
    'main.ts',
    `import { execute as run } from './task';
 export function first() { if (true) run(); }
 export function shadow(run: () => void) { run(); }
 export function callback() { setTimeout(() => run(), 1); }
 export const arrow = () => run();`,
    ts.ScriptTarget.Latest,
    true,
  );
  const calls = collectCalls(
    'main.ts',
    source,
    () => 'task.ts',
    (_file, node) => ({
      id: String(node.pos),
      file: 'main.ts',
      line: 1,
      endLine: 1,
      snippet: node.getText(source),
      hash: 'test',
    }),
  );
  assert.deepEqual(
    calls.map((c) => c.caller),
    ['first', 'arrow'],
  );
  assert.equal(calls[0].conditional, true);
  assert.equal(calls[1].conditional, false);
  assert.equal(calls[0].symbol, 'execute');
});

test('local feature proposal is reviewable and never mutates the existing graph', async () => {
  const project = await analyze(fixture, 'example', true);
  const before = JSON.stringify(project);
  const proposal = await proposeMap(project, 'authentication');
  assert.equal(proposal.engine, 'local');
  assert.ok(proposal.graph.nodes.some((n) => n.id === 'area:identity'));
  assert.ok(proposal.graph.nodes.length < project.nodes.length);
  assert.equal(JSON.stringify(project), before);
  assert.ok(proposalSchema.safeParse(proposal).success);
  await assert.rejects(proposeMap(project, 'unmatchablefeaturexyz'), /No source-backed/);
});

test('model map references must resolve to inspected files, evidence and actual dependencies', async () => {
  const project = await analyze(fixture, 'example', true);
  const evidence = project.flows![0].steps[0].evidence;
  const spec = {
    title: 'Authentication',
    summary: 'Interpretation of the inspected generation handler.',
    components: [
      {
        id: 'api',
        label: 'Generation endpoint',
        description: 'Entry point',
        kind: 'entry',
        files: ['src/api/generate.ts'],
      },
      {
        id: 'auth',
        label: 'Identity check',
        description: 'Authentication',
        kind: 'service',
        files: ['src/services/auth.ts'],
      },
    ],
    relationships: [
      { source: 'api', target: 'auth', label: 'Authenticates user', evidenceId: evidence.id },
    ],
    flows: [
      {
        id: 'auth-flow',
        title: 'Authenticate request',
        description: 'Model interpretation',
        steps: [
          {
            source: 'api',
            target: 'auth',
            title: 'Check identity',
            description: 'Calls authenticate',
            evidenceId: evidence.id,
          },
        ],
      },
    ],
  };
  const proposal = materializeProposal(project, spec);
  assert.equal(proposal.engine, 'model');
  assert.equal(proposal.graph.edges[0].origin, 'inferred');
  assert.equal(proposal.graph.flows![0].steps[0].evidence.snippet, evidence.snippet);
  const forged = structuredClone(spec);
  forged.relationships[0].evidenceId = 'invented';
  assert.throws(() => materializeProposal(project, forged), /without matching inspected evidence/);
  const escaped = structuredClone(spec);
  escaped.components[0].files = ['../../outside.ts'];
  assert.throws(() => materializeProposal(project, escaped), /outside the inspected source/);
  const falseLink = structuredClone(spec);
  falseLink.components[1].files = ['src/services/storage.ts'];
  assert.throws(() => materializeProposal(project, falseLink), /outside the observed source/);
});
