import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analyze, resolveRoot } from '../server/analyzer.js';
import { projectSchema } from '../shared/schema.js';
import { findEvidence } from '../server/explain.js';

test('analyzes real imports, type imports, re-exports and literal dynamic imports with line evidence', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archmap-'));
  try {
    await writeFile(
      path.join(root, 'main.ts'),
      "import type { User } from './auth.js';\nexport { authenticate } from './auth.js';\nconst load = () => import('./auth.js');\n",
    );
    await writeFile(
      path.join(root, 'auth.ts'),
      'export type User = { id: string };\nexport function authenticate() { return true; }',
    );
    await writeFile(path.join(root, 'secrets.ts'), 'export const password = "never-read";');
    await mkdir(path.join(root, 'node_modules'));
    await writeFile(path.join(root, 'node_modules', 'ignored.ts'), 'export const ignored = true;');
    const graph = await analyze(root);
    assert.equal(graph.nodes.length, 2);
    assert.equal(graph.edges.length, 3);
    assert.deepEqual(
      graph.edges.map((e) => e.label),
      ['imports types', 're-exports', 'loads'],
    );
    assert.equal(graph.edges[0].evidence?.line, 1);
    assert.match(graph.edges[0].evidence!.snippet, /import type/);
    assert.equal(graph.edges[0].evidence?.hash.length, 64);
    assert.ok(projectSchema.safeParse(graph).success);
    assert.ok(findEvidence(graph, 'authenticate').some((e) => e.file === 'auth.ts'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('blocks parent paths and symlink escapes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archmap-'));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'archmap-outside-'));
  try {
    await symlink(outside, path.join(root, 'escape'));
    await assert.rejects(resolveRoot(root, '..'), /inside the configured/);
    await assert.rejects(resolveRoot(root, 'escape'), /inside the configured/);
    assert.equal(await resolveRoot(root, '.'), root);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
test('rejects projects with dangling connections and duplicate IDs', () => {
  const graph = {
    version: 1,
    id: 'x',
    name: 'x',
    root: '.',
    revision: null,
    analyzedAt: '',
    mode: 'local',
    nodes: [],
    edges: [{ id: 'bad', source: 'a', target: 'b', label: '', origin: 'manual' }],
    warnings: [],
    filesScanned: 0,
  };
  assert.equal(projectSchema.safeParse(graph).success, false);
});
test('example map is reproducible and all observed edges have source evidence', async () => {
  const graph = await analyze(path.resolve('examples/image-studio'), 'example');
  assert.equal(graph.nodes.length, 10);
  assert.equal(graph.edges.length, 11);
  for (const edge of graph.edges) assert.ok(edge.evidence?.snippet);
});

test('feature focus prioritizes matching source before the bounded file limit', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archmap-focus-'));
  try {
    await Promise.all(
      Array.from({ length: 405 }, (_, i) =>
        writeFile(
          path.join(root, `module-${String(i).padStart(3, '0')}.ts`),
          `export const value${i} = ${i};`,
        ),
      ),
    );
    await writeFile(
      path.join(root, 'zzz-authentication.ts'),
      'export function authenticate() { return true; }',
    );
    const project = await analyze(root, 'local', true, 'authentication');
    assert.equal(project.filesScanned, 400);
    assert.ok(project.alternate?.nodes.some((n) => n.file === 'zzz-authentication.ts'));
    assert.equal(project.focus, 'authentication');
    assert.ok(project.warnings.some((w) => w.includes('Analysis limit')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const baseUrl of [undefined, './src']) {
  test(`resolves path aliases against the repository in live and historical scans (baseUrl: ${baseUrl ?? 'omitted'})`, async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'archmap-alias-'));
    const outside = await mkdtemp(path.join(os.tmpdir(), 'archmap-alias-outside-'));
    try {
      await mkdir(path.join(root, 'src'));
      await symlink(outside, path.join(root, 'linked'));
      await writeFile(path.join(outside, 'escaped.ts'), 'export const escaped = true;');
      const config = JSON.stringify({
        compilerOptions: {
          baseUrl,
          paths: {
            '~/*': [baseUrl ? './*' : './src/*'],
            'outside/*': [path.join(outside, '*')],
            'linked/*': [baseUrl ? '../linked/*' : './linked/*'],
          },
        },
      });
      const main =
        "import { authenticate } from '~/auth';\nimport { escaped } from 'outside/escaped';\nimport { escaped as linked } from 'linked/escaped';\nexport function handle() { return authenticate(); }\n";
      const auth = 'export function authenticate() { return "working tree"; }';
      await writeFile(path.join(root, 'tsconfig.json'), config);
      await writeFile(path.join(root, 'src/main.ts'), main);
      await writeFile(path.join(root, 'src/auth.ts'), auth);
      const historicalAuth = 'export function authenticate() { return "historical source"; }';
      const historicalFiles = new Map([
        ['src/main.ts', main],
        ['src/auth.ts', historicalAuth],
      ]);
      for (const snapshot of [
        undefined,
        { files: historicalFiles, config, revision: 'baseline', warnings: [] },
      ]) {
        const graph = await analyze(root, 'local', false, '', snapshot);
        assert.equal(graph.nodes.length, 2);
        assert.equal(graph.edges.length, 1);
        assert.equal(graph.edges[0].source, 'src/main.ts');
        assert.equal(graph.edges[0].target, 'src/auth.ts');
        assert.match(graph.edges[0].evidence!.snippet, /from '~\/auth'/);
        const target = graph.nodes.find((n) => n.file === 'src/auth.ts')!;
        assert.ok(
          target.evidence.some((e) =>
            e.snippet.includes(snapshot ? 'historical source' : 'working tree'),
          ),
        );
        assert.ok(projectSchema.safeParse(graph).success);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });
}
