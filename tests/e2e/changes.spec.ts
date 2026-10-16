import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
const exec = promisify(execFile);
let root: string;
test.beforeAll(async () => {
  await mkdir('.archmap', { recursive: true });
  root = await mkdtemp(path.resolve('.archmap/change-review-'));
  const git = async (...args: string[]) => exec('git', ['-C', root, ...args]);
  await git('init', '-q');
  await mkdir(path.join(root, 'src'));
  await writeFile(
    path.join(root, 'src/auth.ts'),
    'export function authenticate() { return true; }\n',
  );
  await writeFile(
    path.join(root, 'src/main.ts'),
    "import { authenticate } from './auth.js';\nexport function handle() { return authenticate(); }\n",
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
    'baseline',
  );
  await writeFile(
    path.join(root, 'src/main.ts'),
    "import { enqueue } from './queue.js';\nexport function handle() { return enqueue(); }\n",
  );
  await writeFile(path.join(root, 'src/queue.ts'), 'export function enqueue() { return 1; }\n');
});
test.afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

for (const width of [1440, 390, 320]) {
  test(`review real Git changes and evidence at ${width}px without altering the editable map`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/#workspace');
    await page.getByLabel('Repository folder').fill(root);
    await page.getByRole('button', { name: 'Map repository' }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(3);
    await page.getByRole('button', { name: 'Component', exact: true }).click();
    await page.getByLabel('New component name').fill('My sketch');
    await page.getByRole('button', { name: 'Add component', exact: true }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(4);
    await page.getByRole('button', { name: 'Changes', exact: true }).click();
    const dialog = page.getByRole('region', { name: 'Review architecture changes' });
    await expect(dialog).toBeVisible();
    await page.getByLabel('Baseline revision').fill('missing-ref');
    await page.getByRole('button', { name: 'Compare changes', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Baseline not found');
    await page.getByLabel('Baseline revision').fill('HEAD');
    await page.getByRole('button', { name: 'Compare changes', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('2 dependency changes');
    await expect(dialog.locator('.react-flow__node')).toHaveCount(3);
    await page.getByLabel('Filter changed files').fill('What changed in authentication?');
    await expect(dialog.locator('.wm-changes-file-list button')).toHaveCount(1);
    await dialog.getByText('Read change brief', { exact: true }).click();
    await expect(dialog.getByRole('region', { name: 'Source change brief' })).toContainText(
      'Exported names are unchanged',
    );
    await dialog.locator('.wm-changes-file-list button').click();
    await expect(dialog.getByRole('heading', { name: 'src/main.ts' })).toBeVisible();
    await expect(dialog.locator('.wm-changes-source-side').first()).toContainText('authenticate');
    await expect(dialog.locator('.wm-changes-source-side').last()).toContainText('enqueue');
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `test-results/change-review-${width}.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.react-flow__node')).toHaveCount(4);
    expect(errors).toEqual([]);
  });
}
