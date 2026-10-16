import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { analyze } from '../server/analyzer.js';
import { arrangeSparse } from '../src/lib/layout.js';

test('sparse maps use a bounded grid without changing graph evidence or source data', async () => {
  const graph = await analyze(path.resolve('examples/image-studio'));
  graph.edges = graph.edges.slice(0, 1);
  const before = structuredClone(graph);
  const compact = arrangeSparse(graph);
  assert.deepEqual(compact.edges, before.edges);
  assert.deepEqual(graph, before);
  assert.equal(new Set(compact.nodes.map((n) => n.position.x)).size, 4);
  assert.ok(Math.max(...compact.nodes.map((n) => n.position.y)) <= 410);
  assert.deepEqual(
    compact.nodes.map(({ position, ...source }) => source),
    before.nodes.map(({ position, ...source }) => source),
  );
});

test('connected layouts retain their positions', async () => {
  const graph = await analyze(path.resolve('examples/image-studio'));
  assert.deepEqual(arrangeSparse(graph).nodes, graph.nodes);
});
