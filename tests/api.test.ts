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

test('model settings remain server-side, validate URLs, and clear keys on reconfiguration', async () => {
  const before = {
    base: process.env.ARCHMAP_AI_BASE_URL,
    model: process.env.ARCHMAP_AI_MODEL,
    key: process.env.ARCHMAP_AI_KEY,
  };
  const server = createApp(path.resolve('.')).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No address');
  const post = (route: string, body: unknown) =>
    fetch(`http://127.0.0.1:${address.port}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  try {
    const saved = await post('/api/model', {
      baseUrl: 'http://localhost:11434/v1',
      model: 'test-model',
      apiKey: 'synthetic-test-key',
    });
    assert.equal(saved.status, 200);
    const text = await saved.text();
    assert.ok(!text.includes('synthetic-test-key'));
    assert.equal(JSON.parse(text).ai, true);
    assert.equal((await post('/api/model', { baseUrl: 'file:///etc', model: 'test' })).status, 400);
    assert.equal(
      (await post('/api/model', { baseUrl: 'https://user:password@example.com/v1', model: 'test' }))
        .status,
      400,
    );
    await post('/api/model', { baseUrl: 'http://localhost:11435/v1', model: 'different-model' });
    assert.equal(process.env.ARCHMAP_AI_KEY, undefined);
    const disconnected = await post('/api/model/disconnect', {});
    assert.equal((await disconnected.json()).ai, false);
  } finally {
    for (const [name, value] of Object.entries({
      ARCHMAP_AI_BASE_URL: before.base,
      ARCHMAP_AI_MODEL: before.model,
      ARCHMAP_AI_KEY: before.key,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    server.close();
    await once(server, 'close');
  }
});
