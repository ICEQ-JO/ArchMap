import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from '../src/lib/api.js';

test('network failures explain how to recover, while server errors retain their detail', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    await assert.rejects(request('/api/analyze', { path: '.' }), /Cannot reach.*npm run dev/);
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ error: 'Choose a folder inside the configured repository root.' }),
        { status: 400 },
      );
    await assert.rejects(request('/api/analyze', { path: '..' }), /inside the configured/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
