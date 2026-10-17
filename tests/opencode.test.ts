import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { OpenCodeReview, localOpenCodeUrl } from '../server/opencode.js';
import { createApp } from '../server/app.js';
import { comparisonSchema } from '../shared/schema.js';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archmap-opencode-'));
  await writeFile(path.join(root, 'main.ts'), 'export const existingDirtyValue = 7;\n');
  const calls: { method: string; route: string; auth?: string }[] = [];
  let phase = 'idle',
    userId = 'old',
    complete = true;
  let foreignPath = false;
  let foreign = false,
    oversized = false,
    redirect = false,
    requireAuth = false,
    invalidStatus = false;
  const session = () => ({
    id: 'ses_local',
    title: 'Add authentication',
    directory: foreign ? path.dirname(root) : root,
  });
  const server = createServer((req, res) => {
    const url = new URL(req.url!, 'http://local');
    calls.push({ method: req.method!, route: url.pathname, auth: req.headers.authorization });
    assert.equal(url.searchParams.get('directory'), null);
    if (
      requireAuth &&
      req.headers.authorization !==
        `Basic ${Buffer.from('opencode:fixture-password').toString('base64')}`
    ) {
      res.writeHead(401).end();
      return;
    }
    if (redirect) {
      res.writeHead(302, { Location: 'http://127.0.0.1:1/private' }).end();
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    if (oversized) {
      res.end(JSON.stringify({ text: 'x'.repeat(1024 * 1024 + 1) }));
      return;
    }
    if (url.pathname === '/path')
      res.end(JSON.stringify({ directory: foreignPath ? path.dirname(root) : root }));
    else if (url.pathname === '/session')
      res.end(
        JSON.stringify([
          session(),
          { id: 'ses_foreign', title: 'Private other repo', directory: path.dirname(root) },
        ]),
      );
    else if (url.pathname === '/session/ses_local') res.end(JSON.stringify(session()));
    else if (url.pathname === '/session/status')
      res.end(JSON.stringify({ ses_local: { type: invalidStatus ? 'unknown' : phase } }));
    else if (url.pathname === '/session/ses_local/message')
      res.end(
        JSON.stringify([
          {
            info: { id: userId, role: 'user', time: { created: userId === 'old' ? 1 : 2 } },
            parts: [{ type: 'text', text: 'Add authentication to the API' }],
          },
          ...(complete
            ? [
                {
                  info: {
                    id: 'assistant',
                    role: 'assistant',
                    parentID: userId,
                    time: { created: 3, completed: 4 },
                  },
                  parts: [],
                },
              ]
            : []),
        ]),
      );
    else res.writeHead(404).end('{}');
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No address');
  const bridge = new OpenCodeReview(root);
  const input = {
    path: '.',
    baseUrl: `http://127.0.0.1:${address.port}`,
    username: 'opencode',
    password: '',
  };
  return {
    root,
    bridge,
    input,
    calls,
    setPhase: (value: string) => {
      phase = value;
    },
    setTurn: (id: string, done: boolean) => {
      userId = id;
      complete = done;
    },
    foreignPath: () => {
      foreignPath = true;
    },
    foreign: () => {
      foreign = true;
    },
    oversized: () => {
      oversized = true;
    },
    redirect: () => {
      redirect = true;
    },
    requireAuth: () => {
      requireAuth = true;
    },
    invalidStatus: () => {
      invalidStatus = true;
    },
    close: async () => {
      bridge.disconnect();
      server.close();
      await once(server, 'close');
      await rm(root, { recursive: true, force: true });
    },
  };
}

test('captures dirty working source before a task, observes completion, and reviews independently of agent claims', async () => {
  const f = await fixture();
  try {
    await f.bridge.connect(f.input);
    assert.equal((await f.bridge.sessions()).length, 1);
    assert.equal((await f.bridge.track('ses_local')).tracking?.state, 'waiting');
    assert.equal((await f.bridge.poll()).tracking?.state, 'waiting');
    f.setTurn('new', false);
    f.setPhase('busy');
    assert.equal((await f.bridge.poll()).tracking?.state, 'working');
    await writeFile(
      path.join(f.root, 'main.ts'),
      'export const existingDirtyValue = 8;\nexport const authenticated = true;\n',
    );
    await assert.rejects(f.bridge.review(), /still working/);
    f.setPhase('idle');
    f.setTurn('new', true);
    const state = await f.bridge.poll();
    assert.equal(state.tracking?.state, 'ready');
    assert.equal(state.tracking?.request, 'Add authentication to the API');
    const report = await f.bridge.review();
    assert.ok(comparisonSchema.safeParse(report).success);
    assert.equal(report.baseline.kind, 'working-tree');
    assert.equal(report.files.length, 1);
    assert.match(report.files[0].beforeEvidence!.snippet, /existingDirtyValue = 7/);
    assert.match(report.files[0].afterEvidence!.snippet, /existingDirtyValue = 8/);
    assert.ok(report.warnings.some((w) => w.includes('not proven')));
    assert.ok(f.calls.every((c) => c.method === 'GET'));
    f.setTurn('another', false);
    assert.equal((await f.bridge.poll()).tracking?.state, 'waiting');
    f.setTurn('another', true);
    assert.equal((await f.bridge.poll()).tracking?.state, 'ready'); // fast task completed between polls
    assert.equal(f.bridge.disconnect().connected, false);
    await assert.rejects(f.bridge.review(), /Connect to OpenCode again/);
  } finally {
    await f.close();
  }
});

test('rejects non-loopback origins, redirects, foreign sessions and busy captures; auth never leaves server state', async () => {
  for (const url of [
    'https://127.0.0.1:4096',
    'http://example.com',
    'http://127.0.0.1.evil.test',
    'http://127.0.0.1/private',
    'http://user:pass@127.0.0.1',
    'http://127.0.0.1?x=1',
  ])
    assert.throws(() => localOpenCodeUrl(url));
  assert.equal(localOpenCodeUrl('http://localhost:4096'), 'http://127.0.0.1:4096');
  const f = await fixture();
  try {
    f.requireAuth();
    await assert.rejects(f.bridge.connect(f.input), /authentication failed/);
    const state = await f.bridge.connect({ ...f.input, password: 'fixture-password' });
    assert.ok(!JSON.stringify(state).includes('fixture-password'));
    f.setPhase('busy');
    await assert.rejects(f.bridge.track('ses_local'), /become idle/);
    await assert.rejects(f.bridge.track('../foreign'), /./);
    f.foreign();
    const count = f.calls.length;
    await assert.rejects(f.bridge.track('ses_local'), /different repository/);
    assert.deepEqual(
      f.calls.slice(count).map((c) => c.route),
      ['/session/ses_local'],
    );
  } finally {
    await f.close();
  }
  const redirect = await fixture();
  try {
    redirect.redirect();
    await assert.rejects(redirect.bridge.connect(redirect.input), /Cannot reach/);
  } finally {
    await redirect.close();
  }
  const large = await fixture();
  try {
    large.oversized();
    await assert.rejects(large.bridge.connect(large.input), /1 MB/);
  } finally {
    await large.close();
  }
});

test('adapter API retains origin, root and symlink boundaries and rejects unknown operations', async () => {
  const f = await fixture();
  const app = createApp(f.root).listen(0, '127.0.0.1');
  await once(app, 'listening');
  const address = app.address();
  if (!address || typeof address === 'string') throw new Error('No address');
  const post = (route: string, body: unknown, origin?: string) =>
    fetch(`http://127.0.0.1:${address.port}/api/opencode/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
      body: JSON.stringify(body),
    });
  try {
    await symlink(path.dirname(f.root), path.join(f.root, 'escape'));
    assert.equal((await post('connect', { ...f.input, path: '..' })).status, 400);
    assert.equal((await post('connect', { ...f.input, path: 'escape' })).status, 400);
    assert.equal((await post('connect', f.input, 'https://foreign.test')).status, 403);
    assert.equal((await post('connect', f.input)).status, 200);
    assert.equal((await post('shell', { command: 'never execute' })).status, 404);
    assert.equal((await post('track', { sessionId: 'ses_local' })).status, 200);
    const response = await post('review', {});
    assert.equal(response.status, 200);
    assert.equal((await response.json()).files.length, 0);
    await post('disconnect', {});
  } finally {
    app.close();
    await once(app, 'close');
    await f.close();
  }
});

test('unknown upstream status never turns into a completion signal', async () => {
  const f = await fixture();
  try {
    await f.bridge.connect(f.input);
    await f.bridge.track('ses_local');
    f.invalidStatus();
    await assert.rejects(f.bridge.poll());
    assert.equal(f.bridge.status().tracking?.state, 'waiting');
  } finally {
    await f.close();
  }
});

test('connecting verifies the server existing project without initializing a directory override', async () => {
  const f = await fixture();
  try {
    f.foreignPath();
    await assert.rejects(f.bridge.connect(f.input), /same repository folder/);
    assert.equal(f.bridge.status().connected, false);
    assert.deepEqual(
      f.calls.map((c) => c.route),
      ['/path'],
    );
  } finally {
    await f.close();
  }
});

async function withEnv(url: string, run: () => Promise<void>) {
  const previous = process.env.ARCHMAP_OPENCODE_URL;
  process.env.ARCHMAP_OPENCODE_URL = url;
  try {
    await run();
  } finally {
    if (previous === undefined) delete process.env.ARCHMAP_OPENCODE_URL;
    else process.env.ARCHMAP_OPENCODE_URL = previous;
  }
}

test('auto-connects to a local OpenCode server scoped to the repository', async () => {
  const f = await fixture();
  try {
    await withEnv(f.input.baseUrl, async () => {
      const state = await f.bridge.autoConnect({ path: '.' });
      assert.equal(state.connected, true);
      assert.equal(state.root, f.root);
      assert.equal(state.baseUrl, `http://127.0.0.1:${new URL(f.input.baseUrl).port}`);
      assert.equal((await f.bridge.sessions()).length, 1);
    });
  } finally {
    await f.close();
  }
});

test('auto-connect reports when no local server matches the repository', async () => {
  const f = await fixture();
  try {
    await withEnv('http://127.0.0.1:1', async () => {
      await assert.rejects(f.bridge.autoConnect({ path: '.' }), /No local OpenCode server/);
      assert.equal(f.bridge.status().connected, false);
    });
  } finally {
    await f.close();
  }
});
