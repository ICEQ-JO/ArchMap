import { test, expect } from '@playwright/test';
import path from 'node:path';

test('example: inspect evidence, walk, edit, undo, save, export and restore', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore a live example' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(10);
  await page
    .getByRole('complementary', { name: 'Repository explorer' })
    .getByRole('button', { name: 'generate.ts', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'generate.ts', exact: true })).toBeVisible();
  await expect(page.locator('.evidence-card').first()).toContainText('import');
  await page.getByRole('button', { name: /Walk from this component/ }).click();
  await expect(page.locator('.walk-player')).toContainText('Static dependency traversal');
  await page.getByRole('button', { name: 'Next walk step' }).click();
  await expect(page.locator('.walk-player-top')).toContainText('2 /');
  await page.getByRole('button', { name: 'Close dependency walk' }).click();
  await page.getByLabel('Display name').fill('Generation endpoint');
  await page.getByLabel('Display name').blur();
  await expect(
    page.locator('.architecture-node strong').filter({ hasText: 'Generation endpoint' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo last edit' }).click();
  await expect(
    page.locator('.architecture-node strong').filter({ hasText: 'Generation endpoint' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Component', exact: true }).click();
  await page.getByLabel('New component name').fill('Future cache');
  await page.getByRole('button', { name: 'Add component', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(11);
  await page.getByRole('button', { name: 'Save', exact: false }).click();
  await expect(page.getByRole('status')).toContainText('Map saved');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('image-studio.archmap.json');
  await page.goto('/#workspace');
  await page.reload();
  await expect(page.locator('.react-flow__node')).toHaveCount(11);
  await expect(page.getByRole('status')).toContainText('Restored');
  expect(failures).toEqual([]);
});

test('local scanning, local question search and rejected paths', async ({ page }) => {
  await page.goto('/#workspace');
  await page.getByLabel('Repository folder').fill('../');
  await page.getByRole('button', { name: 'Map repository' }).click();
  await expect(page.getByRole('alert')).toContainText('inside the configured');
  await page.getByLabel('Repository folder').fill(path.resolve('examples/image-studio'));
  await page.getByRole('button', { name: 'Map repository' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(10);
  await page.getByRole('button', { name: 'Ask the map' }).click();
  await page.getByRole('textbox', { name: 'Question about your codebase' }).fill('authenticate');
  await page.getByRole('button', { name: 'Ask question', exact: true }).click();
  await expect(page.locator('.answer-mode')).toHaveText('LOCAL EVIDENCE SEARCH');
  await expect(page.locator('.ask-content')).toContainText('auth');
});

test('import rejects malformed maps and accepts a valid portable map', async ({
  page,
  request,
}) => {
  await page.goto('/#workspace');
  await page.getByLabel('Import map file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"nodes":[]}'),
  });
  await expect(page.getByRole('alert')).toContainText('Could not import');
  const response = await request.get('/api/example');
  const graph = await response.json();
  await page.getByLabel('Import map file').setInputFiles({
    name: 'sample.archmap.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(graph)),
  });
  await expect(page.locator('.react-flow__node')).toHaveCount(10);
  await page.getByRole('button', { name: 'Ask the map' }).click();
  await expect(page.getByRole('textbox', { name: 'Question about your codebase' })).toBeDisabled();
});

test('mobile landing and workspace remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Explore a live example' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(10);
  await page.getByRole('button', { name: 'Toggle explorer' }).click();
  await page
    .getByRole('complementary', { name: 'Repository explorer' })
    .getByRole('button', { name: 'worker.ts', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'worker.ts', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('loads with large cookies left by other localhost apps', async ({ page, context }) => {
  await context.addCookies(
    Array.from({ length: 18 }, (_, i) => ({
      name: `unrelated_dev_app_${i}`,
      value: 'x'.repeat(2800),
      url: 'http://localhost:4310',
    })),
  );
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Explore a live example' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(10);
});
