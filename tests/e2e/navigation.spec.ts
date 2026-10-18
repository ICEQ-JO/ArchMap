import { test, expect } from '@playwright/test';

for (const width of [1440, 390, 320]) {
  test(`task navigation separates agents, models and evidence at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#workspace/example');
    await expect(page.locator('.react-flow__node')).toHaveCount(9);
    await expect(page.getByRole('complementary', { name: 'Source inspector' })).toHaveCount(0);
    if (width < 640) {
      await expect
        .poll(async () =>
          page
            .locator('.react-flow__viewport')
            .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a),
        )
        .toBeGreaterThan(0.7);
    }
    await page.getByRole('navigation').getByRole('button', { name: 'Ask', exact: true }).click();
    await page.getByLabel('Question about your codebase').fill('Map billing permissions');
    await page.getByRole('button', { name: 'Model and agent settings', exact: true }).click();
    await expect(page.getByLabel('Model API base URL')).toBeVisible();
    await expect(page.getByLabel('OpenCode server address')).toHaveCount(0);
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'Changes', exact: true })
      .click();
    await page.getByRole('button', { name: 'Track an agent task', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Connect OpenCode', exact: true })).toBeVisible();
    await expect(page.getByLabel('Model API key')).toHaveCount(0);
    await page.getByRole('navigation').getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(page.getByLabel('Question about your codebase')).toHaveValue(
      'Map billing permissions',
    );
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'Architecture', exact: true })
      .click();
    await expect(page.locator('.react-flow__node')).toHaveCount(9);
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'Changes', exact: true })
      .click();
    await page.getByRole('button', { name: 'Open repository', exact: true }).click();
    await page.getByRole('button', { name: /Image Studio/ }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(9);
    await page.waitForTimeout(600);
    await page.keyboard.press('Control+s');
    await expect(page.getByRole('status')).toContainText('Map saved');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}
