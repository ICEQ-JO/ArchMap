import { test, expect } from '@playwright/test';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

test('example: inspect evidence, walk, edit, undo, save, export and restore', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore a live example' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
  await page.getByRole('button', { name: 'Switch map view' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(10);
  await page.getByRole('button', { name: 'Browse components' }).click();
  await page
    .getByRole('complementary', { name: 'Repository explorer' })
    .getByRole('button', { name: 'generate.ts', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'generate.ts', exact: true })).toBeVisible();
  await expect(page.locator('.wm-evidence-card').first()).toContainText('import');
  await page.getByRole('button', { name: /Walk from this component/ }).click();
  await expect(page.locator('.wm-walk-player')).toContainText('Static dependency traversal');
  await page.getByRole('button', { name: 'Next walk step' }).click();
  await expect(page.locator('.wm-walk-player-top')).toContainText('2 /');
  await page.getByRole('button', { name: 'Close dependency walk' }).click();
  await page.getByLabel('Display name').fill('Generation endpoint');
  await page.getByLabel('Display name').blur();
  await expect(
    page.locator('.wm-architecture-node strong').filter({ hasText: 'Generation endpoint' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo last edit' }).click();
  await expect(
    page.locator('.wm-architecture-node strong').filter({ hasText: 'Generation endpoint' }),
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
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await page.getByRole('button', { name: 'Explain', exact: true }).click();
  await page.getByRole('textbox', { name: 'Question about your codebase' }).fill('authenticate');
  await page.getByRole('button', { name: 'Ask question', exact: true }).click();
  await expect(page.locator('.wm-answer-mode')).toHaveText('LOCAL EVIDENCE SEARCH');
  await expect(page.locator('.wm-agent-scroll')).toContainText('auth');
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
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
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
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
  await page.getByRole('button', { name: 'Browse components' }).click();
  await page
    .getByRole('complementary', { name: 'Repository explorer' })
    .getByRole('button', { name: 'Background workers', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Background workers', exact: true }),
  ).toBeVisible();
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
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
});

test('named feature flows coordinate source evidence and map highlighting', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  await page.goto('/#workspace/example');
  await page.getByRole('button', { name: /^Flows/ }).click();
  await page.getByRole('button', { name: 'Generate Image 3 source connections' }).click();
  await expect(page.getByRole('region', { name: 'Flow walkthrough' })).toContainText(
    'Authenticate',
  );
  await expect(page.locator('.wm-evidence-card').first()).toContainText('authenticate(token)');
  await page.getByRole('button', { name: 'Show this connection on the map' }).click();
  await expect(page.locator('.wm-architecture-node.is-traced')).toHaveCount(2);
  await page.getByRole('button', { name: /^Flows/ }).click();
  await page.getByRole('button', { name: 'Next flow step' }).click();
  await expect(page.getByRole('region', { name: 'Flow walkthrough' })).toContainText(
    'Reserve Credits',
  );
  await expect(page.locator('.wm-evidence-card').first()).toContainText(
    'reserveCredits(user.id, 1)',
  );
  await page.getByRole('button', { name: 'Close guided flow' }).click();
  await expect(page.getByRole('heading', { name: 'Follow the connections.' })).toBeVisible();
  expect(failures).toEqual([]);
});

test('feature proposals require review, can be discarded, applied and undone', async ({ page }) => {
  await page.goto('/#workspace/example');
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await page.getByLabel('Question about your codebase').fill('authentication');
  await page.getByRole('button', { name: 'Propose map' }).click();
  const review = page.getByRole('region', { name: 'Map proposal' });
  await expect(review).toContainText('SOURCE-BASED PROPOSAL');
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(review).toHaveCount(0);
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByRole('button', { name: 'Propose map' }).click();
  await page.getByRole('button', { name: 'Apply proposed map' }).click();
  const count = await page.locator('.react-flow__node').count();
  expect(count).toBeLessThan(9);
  await page.getByRole('button', { name: 'Undo last edit' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
});

test('blank architecture sketches work without a repository connection', async ({ page }) => {
  await page.goto('/#workspace');
  await page.getByRole('button', { name: 'Start a blank architecture map' }).click();
  await page.getByLabel('New component name').fill('Payment API');
  await page.getByRole('button', { name: 'Add component', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expect(page.locator('.wm-origin-tag')).toHaveText('MANUAL');
  await page.getByLabel('Responsibility').fill('Validates payment requests.');
  await page.getByLabel('Responsibility').blur();
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeDisabled();
});

test('model settings clear the credential field and never include keys in map exports', async ({
  page,
}) => {
  await page.route('**/api/model', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        root: '.',
        ai: true,
        model: 'test-model',
        baseUrl: 'http://localhost:11434/v1',
      }),
    }),
  );
  await page.goto('/#workspace/example');
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
  await page.getByRole('button', { name: 'Connections', exact: true }).click();
  await page.getByLabel('Model name', { exact: true }).fill('test-model');
  await page.getByLabel('Model API key').fill('synthetic-key');
  await page.getByRole('button', { name: 'Use this model' }).click();
  await expect(page.getByLabel('Model API key')).toHaveValue('');
  await expect(page.locator('.wm-model-current')).toContainText('test-model');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const file = await (await download).path();
  expect(await readFile(file!, 'utf8')).not.toContain('synthetic-key');
});
