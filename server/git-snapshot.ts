import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import {
  isWithin,
  MAX_BYTES,
  MAX_FILES,
  prioritizeFiles,
  type SourceSnapshot,
} from './analyzer.js';

const exec = promisify(execFile);
const git = async (root: string, args: string[], maxBuffer = 4 * 1024 * 1024) =>
  (
    await exec('git', ['--no-replace-objects', '-C', root, ...args], {
      maxBuffer,
      timeout: 15000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })
  ).stdout;

// Object reads do not check out files, follow tree symlinks, run hooks, or apply filters.
export async function readGitSnapshot(
  root: string,
  ref: string,
  focus = '',
): Promise<SourceSnapshot> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/@~^{}-]{0,199}$/.test(ref))
    throw new Error('Choose a local Git commit, branch, or tag.');
  let revision: string;
  try {
    revision = (
      await git(root, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`])
    ).trim();
  } catch {
    throw new Error('Baseline not found. Choose an existing local Git commit, branch, or tag.');
  }
  const top = (await git(root, ['rev-parse', '--show-toplevel'])).trim();
  const prefix = path.relative(top, root).split(path.sep).join('/');
  const listing = await git(root, [
    'ls-tree',
    '-r',
    '-l',
    '-z',
    '--full-tree',
    revision,
    '--',
    prefix || '.',
  ]);
  const entries = new Map<string, { oid: string; size: number }>();
  for (const entry of listing.split('\0').filter(Boolean)) {
    const match = /^(\d+) blob ([a-f0-9]+)\s+(\d+)\t([\s\S]+)$/.exec(entry);
    if (!match || !['100644', '100755'].includes(match[1])) continue;
    const name = prefix ? match[4].slice(prefix.length + 1) : match[4];
    if (prefix && !match[4].startsWith(prefix + '/')) continue;
    if (!isWithin(root, path.resolve(root, name)) || name.includes('\\')) continue;
    entries.set(name, { oid: match[2], size: Number(match[3]) });
  }
  const files = new Map<string, string>();
  const warnings: string[] = [];
  let bytes = 0;
  let skipped = 0;
  for (const file of prioritizeFiles([...entries.keys()], true, focus)) {
    if (files.size >= MAX_FILES || bytes >= MAX_BYTES) {
      warnings.push('Analysis limit reached: baseline limited to 400 files or 8 MB.');
      break;
    }
    const entry = entries.get(file)!;
    if (entry.size > 256 * 1024 || bytes + entry.size > MAX_BYTES) {
      skipped++;
      continue;
    }
    const content = await git(root, ['cat-file', 'blob', entry.oid], 512 * 1024);
    if (content.includes('\0')) {
      skipped++;
      continue;
    }
    files.set(file, content);
    bytes += entry.size;
  }
  if (skipped) warnings.push(`${skipped} oversized or binary baseline files skipped.`);
  const configEntry = entries.get('tsconfig.json');
  const config =
    configEntry && configEntry.size <= 256 * 1024
      ? await git(root, ['cat-file', 'blob', configEntry.oid], 512 * 1024)
      : undefined;
  return { files, config, revision, warnings };
}
