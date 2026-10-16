import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'node:http';
import { once } from 'node:events';
import { createLocalServer, MAX_HEADER_BYTES } from '../server/http.js';

// Exercise the actual parser used in development and production, rather than
// Express alone: rejected headers never reach application middleware.
test('accepts shared localhost cookies and retains a bounded header limit', async () => {
  const server = createLocalServer((_req, res) => res.end('ArchMap')).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  const statusFor = (bytes: number) =>
    new Promise<number | undefined>((resolve, reject) => {
      get(
        `http://127.0.0.1:${address.port}`,
        { headers: { Cookie: `other_app=${'x'.repeat(bytes)}` } },
        (response) => {
          response.resume();
          response.on('end', () => resolve(response.statusCode));
        },
      ).on('error', reject);
    });
  try {
    assert.equal(await statusFor(48 * 1024), 200);
    assert.equal(await statusFor(MAX_HEADER_BYTES + 1024), 431);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
