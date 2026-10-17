import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

for (const width of [1440, 390]) {
  test(`OpenCode task captures source, automatically opens review, and preserves map at ${width}px`, async ({
    page,
  }) => {
    await mkdir('.archmap', { recursive: true });
    const root = await mkdtemp(path.resolve('.archmap/opencode-browser-'));
    await writeFile(path.join(root, 'main.ts'), 'export const version = 1;\n');
    await writeFile(path.join(root, 'auth.ts'), 'export const authenticate = true;\n');
    let phase = 'idle',
      started = false,
      completed = false;
    const calls: string[] = [];
    const session = { id: 'ses_browser', title: 'Update application version', directory: root };
    const opencode = createServer((req, res) => {
      calls.push(req.method! + ' ' + new URL(req.url!, 'http://local').pathname);
      const pathname = new URL(req.url!, 'http://local').pathname;
      res.setHeader('Content-Type', 'application/json');
      if (pathname === '/path') res.end(JSON.stringify({ directory: root }));
      else if (pathname === '/session') res.end(JSON.stringify([session]));
      else if (pathname === '/session/ses_browser') res.end(JSON.stringify(session));
      else if (pathname === '/session/status')
        res.end(JSON.stringify({ ses_browser: { type: phase } }));
      else if (pathname === '/session/ses_browser/message')
        res.end(
          JSON.stringify(
            started
              ? [
                  {
                    info: { id: 'turn_new', role: 'user', time: { created: 1 } },
                    parts: [{ type: 'text', text: 'Update application version to 2' }],
                  },
                  ...(completed
                    ? [
                        {
                          info: {
                            id: 'assistant',
                            role: 'assistant',
                            parentID: 'turn_new',
                            time: { created: 2, completed: 3 },
                          },
                          parts: [],
                        },
                      ]
                    : []),
                ]
              : [],
          ),
        );
      else res.writeHead(404).end('{}');
    }).listen(0, '127.0.0.1');
    await once(opencode, 'listening');
    const address = opencode.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/#workspace');
      await page.getByLabel('Repository folder').fill(root);
      await page.getByRole('button', { name: 'Map repository', exact: true }).click();
      await expect(page.locator('.react-flow__node')).toHaveCount(2);
      await page.getByRole('button', { name: 'Component', exact: true }).click();
      await page.getByLabel('New component name').fill('My planned cache');
      await page.getByRole('button', { name: 'Add component', exact: true }).click();
      await page.getByRole('button', { name: 'Changes', exact: true }).click();
      await page.getByRole('button', { name: 'Track an agent task', exact: true }).click();
      await page.getByLabel('OpenCode server address').fill(`http://127.0.0.1:${address.port}`);
      await page.getByText('Server authentication (optional)', { exact: true }).click();
      await page.getByLabel('OpenCode password').fill('synthetic-password');
      await page.getByRole('button', { name: 'Connect OpenCode', exact: true }).click();
      await expect(page.getByLabel('OpenCode session', { exact: true })).toContainText(
        session.title,
      );
      await page.getByRole('button', { name: 'Track next task', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Tracked coding task' })).toContainText(
        'WAITING FOR NEXT TASK',
      );
      started = true;
      phase = 'busy';
      await expect(page.getByRole('region', { name: 'Tracked coding task' })).toContainText(
        'SESSION WORKING',
        { timeout: 10000 },
      );
      await writeFile(path.join(root, 'main.ts'), 'export const version = 2;\n');
      phase = 'idle';
      completed = true;
      const dialog = page.getByRole('region', { name: 'Review architecture changes' });
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await expect(dialog).toContainText('Working-tree baseline captured');
      await expect(dialog).toContainText('Update application version');
      await expect(dialog.getByRole('status')).toContainText('1 modified');
      await dialog.locator('.wm-changes-file-list button').click();
      await expect(dialog.locator('.wm-changes-source-side').first()).toContainText('version = 1');
      await expect(dialog.locator('.wm-changes-source-side').last()).toContainText('version = 2');
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: `test-results/opencode-review-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Close change review', exact: true }).click();
      await expect(page.locator('.react-flow__node')).toHaveCount(3);
      const previousPolls = calls.filter((call) => call === 'GET /session/status').length;
      await page.getByRole('button', { name: 'Architecture', exact: true }).click();
      await page.getByRole('button', { name: 'Changes', exact: true }).click();
      await page.getByRole('button', { name: 'Track an agent task', exact: true }).click();
      await expect
        .poll(() => calls.filter((call) => call === 'GET /session/status').length)
        .toBeGreaterThan(previousPolls + 1);
      await expect(dialog).not.toBeVisible();
      await page
        .getByRole('button', { name: 'Disconnect and clear baseline', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: 'Connect OpenCode', exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel('OpenCode password')).toHaveValue('');
      expect(calls.every((call) => call.startsWith('GET '))).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      opencode.close();
      await once(opencode, 'close');
      await rm(root, { recursive: true, force: true });
    }
  });
}
