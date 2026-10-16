import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { analyze } from '../server/analyzer.js';
import { dependencyWalk, refreshProject } from '../src/lib/graph.js';

test('dependency walks terminate at cycles and stay within the selected component', async () => {
  const graph = await analyze(path.resolve('examples/image-studio'));
  graph.edges.push({
    id: 'cycle',
    source: 'src/services/queue.ts',
    target: 'src/api/generate.ts',
    label: 'relates to',
    origin: 'manual',
  });
  const walk = dependencyWalk(graph, 'src/api/generate.ts');
  assert.ok(walk.length > 0 && walk.length <= graph.edges.length);
  assert.equal(walk[0].source, 'src/api/generate.ts');
  assert.ok(!walk.some((e) => e.source === 'src/services/worker.ts'));
});

test('refresh preserves layout and manual elements but drops dangling manual connections', async () => {
  const fresh = await analyze(path.resolve('examples/image-studio'));
  const previous = structuredClone(fresh);
  previous.nodes[0].position = { x: 900, y: -200 };
  previous.nodes.push({
    id: 'manual',
    label: 'Cache',
    file: '',
    kind: 'data',
    description: '',
    exports: [],
    lines: 0,
    position: { x: 0, y: 0 },
    evidence: [],
    origin: 'manual',
  });
  previous.edges.push({
    id: 'manual-link',
    source: previous.nodes[0].id,
    target: 'manual',
    label: 'relates to',
    origin: 'manual',
  });
  previous.edges.push({
    id: 'stale',
    source: 'deleted-module',
    target: 'manual',
    label: 'relates to',
    origin: 'manual',
  });
  const merged = refreshProject(fresh, previous);
  assert.deepEqual(merged.nodes[0].position, { x: 900, y: -200 });
  assert.ok(merged.nodes.some((n) => n.id === 'manual'));
  assert.ok(merged.edges.some((e) => e.id === 'manual-link'));
  assert.ok(!merged.edges.some((e) => e.id === 'stale'));
});
