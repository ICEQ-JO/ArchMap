import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { refsSchema, type Refs } from '../shared/schema.js';

const exec = promisify(execFile);
// Read-only object/ref reads only. No checkout, no hooks, no working-tree writes.
const git = async (root: string, args: string[]) =>
  (
    await exec('git', ['--no-replace-objects', '-C', root, ...args], {
      maxBuffer: 4 * 1024 * 1024,
      timeout: 15000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })
  ).stdout;

export async function listRefs(root: string): Promise<Refs> {
  try {
    await git(root, ['rev-parse', '--is-inside-work-tree']);
  } catch {
    throw new Error('This folder is not a Git repository. Branches and diffs need Git.');
  }
  const branch = (await git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
  const sha = (await git(root, ['rev-parse', '--short', 'HEAD'])).trim();
  const dirty = (await git(root, ['status', '--porcelain'])).trim().length > 0;
  const listing = await git(root, [
    'for-each-ref',
    '--format=%(refname:short)\t%(objectname:short)\t%(refname)',
    'refs/heads',
    'refs/tags',
  ]);
  const refs: Refs['refs'] = [];
  for (const line of listing.split('\n').filter(Boolean)) {
    const [name, objectSha, full] = line.split('\t');
    if (!name || !objectSha || !full) continue;
    refs.push({ name, sha: objectSha, kind: full.startsWith('refs/tags/') ? 'tag' : 'branch' });
  }
  const recent = (await git(root, ['log', '-n', '20', '--format=%h\t%ad\t%s', '--date=short']))
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [commitSha, date, ...subject] = line.split('\t');
      return { sha: commitSha, date, subject: subject.join(' ').slice(0, 300) };
    });
  // ponytail: slice before validating so a repo with thousands of refs lists 500 instead of erroring.
  return refsSchema.parse({
    branch: branch === 'HEAD' ? null : branch,
    sha,
    dirty,
    refs: refs.slice(0, 500),
    recent,
  });
}
