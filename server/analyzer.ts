import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ts from 'typescript';
import dagre from '@dagrejs/dagre';
import type { Evidence, Module, Project } from '../shared/schema.js';

const exec = promisify(execFile);
const MAX_FILES = 400;
const MAX_BYTES = 8 * 1024 * 1024;
const extensions = /\.(?:[cm]?[jt]sx?)$/i;
const excluded =
  /(^|\/)(?:node_modules|\.git|dist|build|coverage|\.next|\.env[^/]*|vendor|\.archmap|secrets?|credentials?)(\/|$)/i;
const secretFile =
  /(?:^|[/.])(?:credentials?|secrets?|private[-_]?key)(?:[/.]|$)|\.(?:pem|key|p12|pfx)$/i;
const normalize = (p: string) => p.split(path.sep).join('/');
export function isWithin(root: string, candidate: string) {
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}
export async function resolveRoot(allowedRoot: string, requested: string) {
  const base = await realpath(allowedRoot);
  const target = await realpath(path.resolve(base, requested));
  if (!isWithin(base, target))
    throw new Error('Choose a folder inside the configured repository root.');
  if (!(await stat(target)).isDirectory())
    throw new Error('The repository path must be a directory.');
  return target;
}

async function discover(root: string): Promise<string[]> {
  // git respects ignore rules and does not execute repository code or hooks.
  try {
    const { stdout: top } = await exec('git', ['-C', root, 'rev-parse', '--show-toplevel']);
    if (path.resolve(top.trim()) === root) {
      const { stdout } = await exec(
        'git',
        ['-C', root, 'ls-files', '-co', '--exclude-standard', '-z'],
        { maxBuffer: 4 * 1024 * 1024 },
      );
      return [...new Set(stdout.split('\0').filter(Boolean))].sort();
    }
  } catch {
    /* Non-git folders use the bounded walker. */
  }
  const files: string[] = [];
  let visited = 0;
  async function walk(dir: string) {
    const entries = await readdir(path.join(root, dir), { withFileTypes: true });
    for (const entry of entries) {
      if (++visited > 20000) return;
      const rel = normalize(path.join(dir, entry.name));
      if (excluded.test(rel) || secretFile.test(rel) || entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(rel);
      else if (entry.isFile()) files.push(rel);
    }
  }
  await walk('');
  return files.sort();
}
function kindFor(file: string): Module['kind'] {
  if (/(?:^|\/)(?:index|main|app|server|route)\.[cm]?[jt]sx?$/.test(file)) return 'entry';
  if (/(?:storage|database|store|repository|schema)/i.test(file)) return 'data';
  if (/(?:services|worker|queue|provider|auth)/i.test(file)) return 'service';
  if (/\.[jt]sx$/.test(file) || /components/.test(file)) return 'ui';
  return 'module';
}
function exportedNames(source: ts.SourceFile) {
  const names: string[] = [];
  for (const stmt of source.statements) {
    if (ts.isExportAssignment(stmt)) names.push('default');
    if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause))
      names.push(...stmt.exportClause.elements.map((x) => x.name.text));
    if (
      ts.canHaveModifiers(stmt) &&
      ts.getModifiers(stmt)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if ('name' in stmt && stmt.name && ts.isIdentifier(stmt.name as ts.Node))
        names.push((stmt.name as ts.Identifier).text);
      if (ts.isVariableStatement(stmt))
        for (const d of stmt.declarationList.declarations)
          if (ts.isIdentifier(d.name)) names.push(d.name.text);
    }
  }
  return [...new Set(names)].slice(0, 200);
}
export async function analyze(root: string, mode: Project['mode'] = 'local'): Promise<Project> {
  const candidates = (await discover(root)).filter(
    (f) => extensions.test(f) && !excluded.test(f) && !secretFile.test(f),
  );
  const warnings: string[] = [];
  const sources = new Map<string, { source: ts.SourceFile; content: string; hash: string }>();
  let bytes = 0;
  let skipped = 0;
  for (const file of candidates) {
    if (sources.size >= MAX_FILES || bytes >= MAX_BYTES) {
      warnings.push(
        'Analysis limit reached: 400 files or 8 MB. Use a smaller project folder for a focused map.',
      );
      break;
    }
    const full = path.join(root, file);
    try {
      if (!isWithin(root, await realpath(full))) {
        skipped++;
        continue;
      }
      const info = await stat(full);
      if (!info.isFile() || info.size > 256 * 1024 || bytes + info.size > MAX_BYTES) {
        skipped++;
        continue;
      }
      const content = await readFile(full, 'utf8');
      if (content.includes('\0')) {
        skipped++;
        continue;
      }
      sources.set(file, {
        source: ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true),
        content,
        hash: createHash('sha256').update(content).digest('hex'),
      });
      bytes += info.size;
    } catch {
      skipped++;
    }
  }
  if (!sources.size)
    throw new Error(
      'No JavaScript or TypeScript source files found. Choose a source folder containing .ts, .tsx, .js, or .jsx files.',
    );
  if (skipped)
    warnings.push(`${skipped} unreadable, oversized, binary, or out-of-root files skipped.`);
  let options: ts.CompilerOptions = {
    allowJs: true,
    jsx: ts.JsxEmit.ReactJSX,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
  };
  try {
    const configPath = path.join(root, 'tsconfig.json');
    const config = ts.parseConfigFileTextToJson(configPath, await readFile(configPath, 'utf8'));
    if (config.config)
      options = {
        ...options,
        ...ts.convertCompilerOptionsFromJson(config.config.compilerOptions ?? {}, root).options,
      };
  } catch {
    /* Default resolution covers relative JS/TS imports. */
  }
  const evidenceFor = (file: string, node: ts.Node): Evidence => {
    const { source, content, hash } = sources.get(file)!;
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const endLine = Math.min(source.getLineAndCharacterOfPosition(node.end).line + 1, line + 12);
    return {
      id: `${file}:${line}`,
      file,
      line,
      endLine,
      snippet: content
        .split(/\r?\n/)
        .slice(line - 1, endLine)
        .join('\n')
        .slice(0, 20000),
      hash,
    };
  };
  const nodes: Module[] = [...sources].map(([file, { source, content }], index) => {
    const exports = exportedNames(source);
    return {
      id: file,
      file,
      label: path.basename(file),
      kind: kindFor(file),
      description: exports.length
        ? `Exports ${exports.slice(0, 5).join(', ')}${exports.length > 5 ? ', …' : ''}.`
        : 'Source module. Select a connection to inspect its import evidence.',
      exports,
      lines: content.split(/\r?\n/).length,
      position: { x: (index % 4) * 290, y: Math.floor(index / 4) * 150 },
      evidence: source.statements.slice(0, 1).map((n) => evidenceFor(file, n)),
      origin: 'observed',
    };
  });
  const edges: Project['edges'] = [];
  let unresolved = 0;
  for (const [file, { source }] of sources) {
    function visit(node: ts.Node) {
      let specifier: ts.StringLiteralLike | undefined;
      let label = 'imports';
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        specifier = node.moduleSpecifier;
        if (ts.isExportDeclaration(node)) label = 're-exports';
        else if (node.importClause?.isTypeOnly) label = 'imports types';
      } else if (
        ts.isCallExpression(node) &&
        node.arguments.length === 1 &&
        ts.isStringLiteralLike(node.arguments[0]) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      ) {
        specifier = node.arguments[0];
        label = 'loads';
      }
      if (specifier) {
        const resolved = ts.resolveModuleName(
          specifier.text,
          path.join(root, file),
          options,
          ts.sys,
        ).resolvedModule;
        const target = resolved && normalize(path.relative(root, resolved.resolvedFileName));
        if (target && sources.has(target) && target !== file) {
          const evidence = evidenceFor(file, node);
          const id = `${file}->${target}:${evidence.line}`;
          if (!edges.some((e) => e.id === id))
            edges.push({ id, source: file, target, label, evidence, origin: 'observed' });
        } else if (specifier.text.startsWith('.')) unresolved++;
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  if (unresolved)
    warnings.push(
      `${unresolved} relative import(s) point to files outside this scan or could not be resolved.`,
    );
  // Layered layout handles cycles and multiple entry points without implying execution order.
  const layout = new dagre.graphlib.Graph();
  layout.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40, marginx: 30, marginy: 30 });
  layout.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) layout.setNode(node.id, { width: 226, height: 106 });
  for (const edge of edges) layout.setEdge(edge.source, edge.target);
  dagre.layout(layout);
  for (const node of nodes) {
    const position = layout.node(node.id);
    node.position = { x: position.x - 113, y: position.y - 53 };
  }
  let revision: string | null = null;
  try {
    revision = (await exec('git', ['-C', root, 'rev-parse', 'HEAD'])).stdout.trim();
  } catch {
    /* No revision for non-git folders. */
  }
  return {
    version: 1,
    id: randomUUID(),
    name: path.basename(root),
    root,
    revision,
    analyzedAt: new Date().toISOString(),
    mode,
    nodes,
    edges,
    warnings,
    filesScanned: sources.size,
  };
}
