import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { once } from 'node:events';
import { get } from 'node:http';
import { createApp } from '../server/app.js';

test('local API enforces origin and host, analyzes a repository, and searches grounded evidence', async () => {
  const server = createApp(path.resolve('.')).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal(
      (await fetch(`${base}/api/status`, { headers: { Origin: 'https://untrusted.example' } }))
        .status,
      403,
    );
    assert.equal(
      await new Promise<number | undefined>((resolve, reject) => {
        get(`${base}/api/status`, { headers: { Host: 'untrusted.example' } }, (response) => {
          response.resume();
          resolve(response.statusCode);
        }).on('error', reject);
      }),
      403,
    );
    const post = (route: string, body: unknown) =>
      fetch(base + route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    assert.equal((await post('/api/analyze', { path: '..' })).status, 400);
    assert.equal((await post('/api/analyze', { path: '' })).status, 400);
    const response = await post('/api/analyze', { path: 'examples/image-studio' });
    assert.equal(response.status, 200);
    const graph = await response.json();
    assert.equal(graph.nodes.length, 10);
    const result = await post('/api/explain', { projectId: graph.id, question: 'authenticate' });
    const answer = await result.json();
    assert.equal(result.status, 200);
    assert.equal(answer.mode, 'search');
    assert.ok(answer.evidence.some((e: { file: string }) => e.file.includes('auth')));
    assert.equal(
      (await post('/api/explain', { projectId: 'missing', question: 'auth' })).status,
      404,
    );
  } finally {
    server.close();
    await once(server, 'close');
  }
});
