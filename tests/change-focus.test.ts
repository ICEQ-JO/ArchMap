import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../server/analyzer.js';
import { compareProjects } from '../server/comparison.js';
import { focusChanges } from '../shared/change-focus.js';

async function fixture() {
  const beforeFiles = new Map([
    [
      'auth.ts',
      "import { read } from './database.js';\nexport function authenticate() { return read(); }",
    ],
    ['database.ts', 'export function read() { return true; }'],
    ['billing.ts', 'export function charge() { return 1; }'],
    ['obsolete-auth.ts', 'export const oldAuth = true;'],
  ]);
  const afterFiles = new Map(beforeFiles);
  afterFiles.set(
    'auth.ts',
    "import { read } from './database.js';\nimport { charge } from './billing.js';\nexport function authorize() { return read() && charge(); }",
  );
  afterFiles.set('billing.ts', 'export function charge() { return 2; }');
  afterFiles.delete('obsolete-auth.ts');
  const before = await analyze('/virtual', 'local', false, '', {
    files: beforeFiles,
    revision: 'before',
    warnings: [],
  });
  const after = await analyze('/virtual', 'local', false, '', {
    files: afterFiles,
    revision: 'after',
    warnings: [],
  });
  return compareProjects(before, after, 'HEAD');
}

test('feature questions match exports, paths and responsibility names with cited source summaries', async () => {
  const report = await fixture();
  const focused = focusChanges(report, 'What changed in authentication?');
  assert.deepEqual(
    focused.files.map((f) => f.file),
    ['auth.ts', 'obsolete-auth.ts'],
  );
  assert.match(focused.brief[0].text, /Exports added: authorize/);
  assert.match(focused.brief[0].text, /Exports removed: authenticate/);
  assert.ok(focused.files[0].before?.evidence.length);
  assert.ok(focused.files[0].after?.evidence.length);
  assert.equal(focused.dependencies.length, 1);
  assert.deepEqual(focused.contextFiles, ['billing.ts']);
  const dataArea = report.graph.nodes.find((n) => n.label === 'Database & records')!;
  assert.ok(focused.nodeIds.has(dataArea.id));
  assert.equal(focused.matchedNodeIds.has(dataArea.id), false);
  assert.deepEqual(
    focusChanges(report, 'authorize').files.map((f) => f.file),
    ['auth.ts'],
  );
});

test('unmatched filters stay empty, area restrictions combine with questions, and removal remains mapped', async () => {
  const report = await fixture();
  assert.equal(focusChanges(report, 'nonexistent-feature').files.length, 0);
  assert.equal(focusChanges(report, 'nonexistent-feature').nodeIds.size, 0);
  const identity = report.areas.find((a) => a.label === 'Identity & access')!;
  assert.ok(focusChanges(report, 'obsolete', identity.id).matchedNodeIds.has(identity.id));
  assert.equal(focusChanges(report, 'billing', 'missing-area').files.length, 0);
  assert.equal(focusChanges(report).files.length, report.files.length);
  const brief = focusChanges(report, 'billing').brief.find((b) => b.file === 'billing.ts')!;
  assert.match(brief.text, /behavior may still differ/);
  assert.equal(report.files.length, 3);
});
