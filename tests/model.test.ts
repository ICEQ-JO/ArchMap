import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import path from 'node:path';
import { analyze } from '../server/analyzer.js';
import { explain } from '../server/explain.js';

test('optional model receives bounded evidence only when explicitly asked', async () => {
  let requests = 0;
  let received: { messages: { content: string }[] } | undefined;
  const provider = createServer(async (req, res) => {
    requests++;
    assert.equal(req.url, '/v1/chat/completions');
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    received = JSON.parse(Buffer.concat(chunks).toString());
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        choices: [{ message: { content: 'The endpoint imports authenticate [1].' } }],
      }),
    );
  }).listen(0, '127.0.0.1');
  await once(provider, 'listening');
  const address = provider.address();
  if (!address || typeof address === 'string') throw new Error('Missing provider address');
  const before = { base: process.env.ARCHMAP_AI_BASE_URL, model: process.env.ARCHMAP_AI_MODEL };
  process.env.ARCHMAP_AI_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
  process.env.ARCHMAP_AI_MODEL = 'test-model';
  try {
    const project = await analyze(path.resolve('examples/image-studio'));
    assert.equal(requests, 0, 'Scanning must not make an inference request');
    const answer = await explain(project, 'authenticate');
    assert.equal(requests, 1);
    assert.equal(answer.mode, 'ai');
    assert.match(answer.text, /authenticate/);
    const payload = JSON.parse(received!.messages[1].content);
    assert.ok(payload.evidence.length > 0 && payload.evidence.length <= 8);
    assert.ok(payload.evidence.every((e: { snippet: string }) => e.snippet.length <= 2500));
    assert.ok(!received!.messages[1].content.includes(project.root));
    assert.match(received!.messages[0].content, /untrusted data/);
  } finally {
    if (before.base === undefined) delete process.env.ARCHMAP_AI_BASE_URL;
    else process.env.ARCHMAP_AI_BASE_URL = before.base;
    if (before.model === undefined) delete process.env.ARCHMAP_AI_MODEL;
    else process.env.ARCHMAP_AI_MODEL = before.model;
    provider.close();
    await once(provider, 'close');
  }
});

test('model-backed feature maps are validated against inspected evidence and stay proposals', async () => {
  const { proposeMap } = await import('../server/proposals.js');
  const project = await analyze(path.resolve('examples/image-studio'), 'example', true);
  let calls = 0;
  let contextBytes = 0;
  const provider = createServer(async (req, res) => {
    calls++;
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const context = JSON.parse(body.messages[1].content);
    contextBytes = JSON.stringify(context.source).length;
    const entry = context.source.find(
      (n: { fileId: string }) => n.fileId === 'src/api/generate.ts',
    );
    const evidence = entry.evidence.find((e: { snippet: string }) =>
      e.snippet.includes('authenticate(token)'),
    );
    const map = {
      title: 'Request authentication',
      summary: 'An interpretation of the generation endpoint.',
      components: [
        {
          id: 'api',
          label: 'Image API',
          description: 'Request entry',
          kind: 'entry',
          files: ['src/api/generate.ts'],
        },
        {
          id: 'auth',
          label: 'Authentication',
          description: 'Identity check',
          kind: 'service',
          files: ['src/services/auth.ts'],
        },
      ],
      relationships: [
        { source: 'api', target: 'auth', label: 'Checks identity', evidenceId: evidence.id },
      ],
      flows: [],
    };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(map) } }] }));
  }).listen(0, '127.0.0.1');
  await once(provider, 'listening');
  const address = provider.address();
  if (!address || typeof address === 'string') throw new Error('No provider address');
  const before = { base: process.env.ARCHMAP_AI_BASE_URL, model: process.env.ARCHMAP_AI_MODEL };
  process.env.ARCHMAP_AI_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
  process.env.ARCHMAP_AI_MODEL = 'test-model';
  try {
    const original = JSON.stringify(project);
    const proposal = await proposeMap(project, 'Map authentication');
    assert.equal(calls, 1);
    assert.equal(proposal.engine, 'model');
    assert.equal(proposal.graph.nodes.length, 2);
    assert.ok(contextBytes < 50000);
    assert.equal(JSON.stringify(project), original);
  } finally {
    if (before.base === undefined) delete process.env.ARCHMAP_AI_BASE_URL;
    else process.env.ARCHMAP_AI_BASE_URL = before.base;
    if (before.model === undefined) delete process.env.ARCHMAP_AI_MODEL;
    else process.env.ARCHMAP_AI_MODEL = before.model;
    provider.close();
    await once(provider, 'close');
  }
});
