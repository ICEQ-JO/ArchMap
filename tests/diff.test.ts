import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unifiedDiff } from '../server/diff.js';

test('unified diff reports a changed line with context', () => {
  const diff = unifiedDiff('a\nb\nc\n', 'a\nB\nc\n');
  assert.match(diff, /^@@ -\d+,\d+ \+\d+,\d+ @@/);
  assert.ok(diff.includes('-b'));
  assert.ok(diff.includes('+B'));
  assert.ok(diff.includes(' a'));
});

test('unified diff marks a whole added file', () => {
  const diff = unifiedDiff('', 'one\ntwo');
  assert.ok(diff.split('\n').every((l) => l.startsWith('+') || l.startsWith('@@')));
});

test('unified diff marks a whole removed file', () => {
  const diff = unifiedDiff('one\ntwo', '');
  assert.ok(diff.split('\n').every((l) => l.startsWith('-') || l.startsWith('@@')));
});

test('identical content produces no diff', () => {
  assert.equal(unifiedDiff('same\ntext', 'same\ntext'), '');
});

test('a huge rewrite is bounded and its header counts only the lines shown', () => {
  const big = (n: number, tag: string) =>
    ['top', ...Array.from({ length: n }, (_, i) => `${tag}${i}`), 'bottom'].join('\n');
  const diff = unifiedDiff(big(5000, 'old'), big(5000, 'new'));
  const lines = diff.split('\n');
  const header = lines.shift()!;
  assert.ok(lines.length <= 2000 * 2 + 8, `patch should be bounded, got ${lines.length} lines`);
  assert.match(diff, /lines omitted from this large change/);
  const [, oldCount, newCount] = header.match(/^@@ -\d+,(\d+) \+\d+,(\d+) @@$/)!.map(Number);
  const oldShown = lines.filter((l) => l.startsWith('-') || l.startsWith(' ')).length;
  const newShown = lines.filter((l) => l.startsWith('+') || l.startsWith(' ')).length;
  assert.equal(oldCount, oldShown);
  assert.equal(newCount, newShown);
});
