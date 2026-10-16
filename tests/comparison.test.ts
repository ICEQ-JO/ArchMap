import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { compareWorkingTree, compareProjects } from '../server/comparison.js';
import { readGitSnapshot } from '../server/git-snapshot.js';
import { analyze } from '../server/analyzer.js';
import { comparisonSchema } from '../shared/schema.js';
import { createApp } from '../server/app.js';
import { once } from 'node:events';
const exec = promisify(execFile);
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archmap-diff-'));
  const git = async (...args: string[]) => (await exec('git', ['-C', root, ...args])).stdout;
  await git('init', '-q');
  await mkdir(path.join(root, 'src'));
  await writeFile(
    path.join(root, 'src', 'main.ts'),
    "import { authenticate } from './auth.js';\nexport function handle() { return authenticate(); }\n",
  );
  await writeFile(
    path.join(root, 'src', 'auth.ts'),
    'export function authenticate() { return true; }\n',
  );
  await writeFile(path.join(root, 'src', 'old.ts'), 'export const obsolete = true;\n');
  await git('add', '.');
  await git(
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.com',
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '-qm',
    'baseline',
  );
  return { root, git };
}

test('Git comparison finds content and topology changes without changing HEAD, index or worktree', async () => {
  const { root, git } = await fixture();
  try {
    await writeFile(
      path.join(root, 'src', 'main.ts'),
      "import { enqueue } from './queue.js';\nexport function handle() { return enqueue(); }\n",
    );
    await writeFile(
      path.join(root, 'src', 'queue.ts'),
      'export function enqueue() { return 1; }\n',
    );
    await rm(path.join(root, 'src', 'old.ts'));
    const status = await git('status', '--porcelain');
    const head = await git('rev-parse', 'HEAD');
    const index = await readFile(path.join(root, '.git', 'index'));
    const report = await compareWorkingTree(root);
    assert.ok(comparisonSchema.safeParse(report).success);
    assert.deepEqual(
      report.files.map((f) => [f.file, f.status]),
      [
        ['src/main.ts', 'modified'],
        ['src/old.ts', 'removed'],
        ['src/queue.ts', 'added'],
      ],
    );
    assert.deepEqual(
      report.dependencies.map((d) => [d.target, d.status]),
      [
        ['src/auth.ts', 'removed'],
        ['src/queue.ts', 'added'],
      ],
    );
    assert.match(report.files[0].before!.evidence[0].snippet, /authenticate/);
    assert.match(report.files[0].after!.evidence[0].snippet, /enqueue/);
    assert.ok(
      report.areas.some((a) => a.label === 'Job queue & messaging' && a.status === 'added'),
    );
    assert.equal(report.partial, false);
    assert.equal(await git('status', '--porcelain'), status);
    assert.equal(await git('rev-parse', 'HEAD'), head);
    assert.deepEqual(await readFile(path.join(root, '.git', 'index')), index);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('line movement is a content change, not a dependency change; empty modules have hashes', async () => {
  const { root } = await fixture();
  try {
    const main = path.join(root, 'src', 'main.ts');
    await writeFile(main, '\n\n' + (await readFile(main, 'utf8')));
    let report = await compareWorkingTree(root);
    assert.equal(report.files.length, 1);
    assert.equal(report.dependencies.length, 0);
    assert.equal(report.relationships.length, 0);
    await writeFile(path.join(root, 'src', 'empty.ts'), '// no exports\n');
    report = await compareWorkingTree(root);
    assert.ok(report.files.find((f) => f.file === 'src/empty.ts')?.after?.contentHash);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('historical aliases resolve against historical source, and subfolder scans stay scoped', async () => {
  const { root, git } = await fixture();
  try {
    await writeFile(
      path.join(root, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } } }),
    );
    await writeFile(
      path.join(root, 'src', 'main.ts'),
      "import { authenticate } from '@/auth';\nexport const handler = authenticate;\n",
    );
    await git('add', '.');
    await git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-qm',
      'aliases',
    );
    await rm(path.join(root, 'src', 'auth.ts'));
    const snapshot = await readGitSnapshot(root, 'HEAD');
    const before = await analyze(root, 'local', false, '', snapshot);
    assert.equal(before.edges[0]?.target, 'src/auth.ts');
    const sub = await readGitSnapshot(path.join(root, 'src'), 'HEAD');
    assert.deepEqual([...sub.files.keys()].sort(), ['auth.ts', 'main.ts', 'old.ts']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects bad refs, skips historical symlinks and secret paths, and never follows escaped live config', async () => {
  const { root, git } = await fixture();
  const outside = await mkdtemp(path.join(os.tmpdir(), 'archmap-outside-'));
  try {
    await writeFile(path.join(outside, 'private.ts'), 'export const sentinel = 1;');
    await symlink(path.join(outside, 'private.ts'), path.join(root, 'escape.ts'));
    await writeFile(path.join(root, 'secrets.ts'), 'export const hidden = true;');
    await symlink(path.join(outside, 'private.ts'), path.join(root, 'tsconfig.json'));
    await git('add', '.');
    await git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-qm',
      'boundaries',
    );
    const snapshot = await readGitSnapshot(root, 'HEAD');
    assert.ok(!snapshot.files.has('escape.ts'));
    assert.ok(!snapshot.files.has('secrets.ts'));
    assert.equal(snapshot.config, undefined);
    const report = await compareWorkingTree(root);
    assert.ok(!report.graph.nodes.some((n) => n.members?.includes('escape.ts')));
    await assert.rejects(readGitSnapshot(root, '--output=bad'), /Choose/);
    await assert.rejects(readGitSnapshot(root, 'HEAD;touch x'), /Choose/);
    await assert.rejects(readGitSnapshot(root, 'not-a-local-ref'), /Baseline not found/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('handles deletion of all source and an empty baseline; incomplete scans withhold absence claims', async () => {
  const { root, git } = await fixture();
  try {
    await rm(path.join(root, 'src'), { recursive: true });
    const removed = await compareWorkingTree(root);
    assert.equal(removed.files.filter((f) => f.status === 'removed').length, 3);
    const empty = await analyze(root, 'local', false, '', {
      files: new Map(),
      revision: 'empty',
      warnings: [],
    });
    await writeFile(path.join(root, 'new.ts'), 'export const x = 1;');
    const current = await analyze(root);
    assert.equal(compareProjects(empty, current, 'empty').files[0].status, 'added');
    const partial = compareProjects(
      { ...empty, warnings: ['Analysis limit reached'] },
      current,
      'empty',
    );
    assert.equal(partial.partial, true);
    assert.equal(partial.files.length, 0);
    assert.equal(partial.dependencies.length, 0);
    assert.equal((await git('rev-parse', 'HEAD')).trim().length, 40);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('comparison API enforces configured root and foreign origin boundaries', async () => {
  const { root } = await fixture();
  const server = createApp(root).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No address');
  const post = (body: unknown, headers = {}) =>
    fetch(`http://127.0.0.1:${address.port}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await post({ path: '..' })).status, 400);
    assert.equal(
      (await post({ path: '.', ref: 'HEAD' }, { Origin: 'https://untrusted.example' })).status,
      403,
    );
    const response = await post({ path: '.', ref: 'HEAD' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).files.length, 0);
  } finally {
    server.close();
    await once(server, 'close');
    await rm(root, { recursive: true, force: true });
  }
});

test('change evidence starts near the actual edit, including edits beyond retained AST statements', async () => {
  const { root, git } = await fixture();
  try {
    const content = Array.from({ length: 80 }, (_, i) => `export const value${i} = ${i};`).join(
      '\n',
    );
    await writeFile(path.join(root, 'src/long.ts'), content);
    await git('add', '.');
    await git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-qm',
      'long source',
    );
    await writeFile(
      path.join(root, 'src/long.ts'),
      content.replace('value70 = 70', 'value70 = 999'),
    );
    const report = await compareWorkingTree(root);
    const file = report.files.find((f) => f.file === 'src/long.ts')!;
    assert.ok(file.beforeEvidence!.line > 60);
    assert.match(file.beforeEvidence!.snippet, /value70 = 70/);
    assert.match(file.afterEvidence!.snippet, /value70 = 999/);
    assert.equal(file.afterEvidence!.hash, file.after!.contentHash);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('repository filesystem-monitor hooks are not executed during discovery', async () => {
  const { root, git } = await fixture();
  try {
    const hook = path.join(root, 'monitor.sh'),
      marker = path.join(root, 'executed');
    await writeFile(hook, '#!/bin/sh\ntouch "$(dirname "$0")/executed"\n', { mode: 0o755 });
    await git('config', 'core.fsmonitor', hook);
    await compareWorkingTree(root);
    await assert.rejects(readFile(marker), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
