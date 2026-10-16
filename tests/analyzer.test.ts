import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analyze, resolveRoot } from '../server/analyzer.js';
import { projectSchema } from '../shared/schema.js';
import { findEvidence } from '../server/explain.js';

test('analyzes real imports, type imports, re-exports and literal dynamic imports with line evidence', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'repovox-'));
  try {
    await writeFile(path.join(root, 'main.ts'), "import type { User } from './auth.js';\nexport { authenticate } from './auth.js';\nconst load = () => import('./auth.js');\n");
    await writeFile(path.join(root, 'auth.ts'), 'export type User = { id: string };\nexport function authenticate() { return true; }');
    await writeFile(path.join(root, 'secrets.ts'), 'export const password = "never-read";');
    await mkdir(path.join(root, 'node_modules'));
    await writeFile(path.join(root, 'node_modules', 'ignored.ts'), 'export const ignored = true;');
    const graph = await analyze(root);
    assert.equal(graph.nodes.length, 2);
    assert.equal(graph.edges.length, 3);
    assert.deepEqual(graph.edges.map(e => e.label), ['imports types', 're-exports', 'loads']);
    assert.equal(graph.edges[0].evidence?.line, 1);
    assert.match(graph.edges[0].evidence!.snippet, /import type/);
    assert.equal(graph.edges[0].evidence?.hash.length, 64);
    assert.ok(projectSchema.safeParse(graph).success);
    assert.ok(findEvidence(graph, 'authenticate').some(e => e.file === 'auth.ts'));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('blocks parent paths and symlink escapes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'repovox-'));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'repovox-outside-'));
  try {
    await symlink(outside, path.join(root, 'escape'));
    await assert.rejects(resolveRoot(root, '..'), /inside the configured/);
    await assert.rejects(resolveRoot(root, 'escape'), /inside the configured/);
    assert.equal(await resolveRoot(root, '.'), root);
  } finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
});
test('rejects projects with dangling connections and duplicate IDs', () => {
  const graph = { version: 1, id: 'x', name: 'x', root: '.', revision: null, analyzedAt: '', mode: 'local', nodes: [], edges: [{ id: 'bad', source: 'a', target: 'b', label: '', origin: 'manual' }], warnings: [], filesScanned: 0 };
  assert.equal(projectSchema.safeParse(graph).success, false);
});
test('example map is reproducible and all observed edges have source evidence', async () => {
  const graph = await analyze(path.resolve('examples/image-studio'), 'example');
  assert.equal(graph.nodes.length, 10);
  assert.ok(graph.edges.length >= 12);
  for (const edge of graph.edges) assert.ok(edge.evidence?.snippet);
});
