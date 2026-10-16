import { test, expect } from '@playwright/test';
for (const width of [1440, 390]) {
  test(`landing demonstrates source, product tasks and local setup at ${width}px`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: 'Inspect Identity', exact: true }).click();
    await expect(page.locator('.atlas-evidence')).toContainText('src/services/auth.ts:1');
    await expect(page.locator('.atlas-evidence code')).toContainText(
      'export function authenticate',
    );
    await page.getByRole('tab', { name: 'Follow a feature', exact: true }).click();
    await expect(page.getByRole('tabpanel')).toContainText('Follow the feature. Keep the source.');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Review a change', exact: true })).toBeFocused();
    await expect(page.locator('.preview-change')).toContainText('Illustrative review');
    await page.getByRole('button', { name: /Follow the connections/ }).click();
    await expect(page.locator('.atlas-source-window')).toContainText('reserveCredits');
    await page.getByRole('button', { name: /Review what actually changed/ }).click();
    await expect(page.locator('.atlas-source-window')).toContainText(
      'No prompts or tools sent to OpenCode.',
    );
    await page.getByRole('button', { name: 'Copy installation commands', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain('npm run dev');
    await page.getByText('Does it work with my project?', { exact: true }).click();
    await expect(page.locator('.atlas-questions details').first()).toContainText(
      '400 source files',
    );
    if (width < 640) {
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Open navigation', exact: true }),
      ).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}
