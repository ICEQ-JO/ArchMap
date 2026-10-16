import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { analyze, resolveRoot } from './analyzer.js';
import { explain } from './explain.js';
import type { Project } from '../shared/schema.js';

export function createApp(allowedRoot: string) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const host = req.hostname;
    if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(host)) {
      res.status(403).json({ error: 'This local service accepts localhost requests only.' });
      return;
    }
    if (req.path.startsWith('/api/')) {
      const origin = req.get('origin');
      if (
        origin &&
        origin !== `http://${req.get('host')}` &&
        origin !== `https://${req.get('host')}`
      ) {
        res.status(403).json({ error: 'Cross-origin repository access is blocked.' });
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  const projects = new Map<string, { project: Project; expires: number }>();
  function remember(project: Project) {
    for (const [id, cached] of projects) if (cached.expires < Date.now()) projects.delete(id);
    if (projects.size >= 5) projects.delete(projects.keys().next().value!);
    projects.set(project.id, { project, expires: Date.now() + 60 * 60 * 1000 });
    return project;
  }
  let scanning = false;
  app.get('/api/status', (_req, res) =>
    res.json({
      root: allowedRoot,
      ai: Boolean(process.env.ARCHMAP_AI_BASE_URL && process.env.ARCHMAP_AI_MODEL),
      model: process.env.ARCHMAP_AI_MODEL ?? null,
    }),
  );
  app.post('/api/analyze', async (req, res, next) => {
    if (scanning) {
      res
        .status(429)
        .json({ error: 'Another scan is running. Wait for it to finish and try again.' });
      return;
    }
    try {
      const input = z.object({ path: z.string().trim().min(1).max(2000) }).parse(req.body);
      scanning = true;
      const root = await resolveRoot(allowedRoot, input.path);
      res.json(remember(await analyze(root)));
    } catch (error) {
      next(error);
    } finally {
      scanning = false;
    }
  });
  app.get('/api/example', async (_req, res, next) => {
    try {
      const root = fileURLToPath(new URL('../examples/image-studio', import.meta.url));
      const project = await analyze(root, 'example');
      project.name = 'image-studio';
      res.json(remember(project));
    } catch (error) {
      next(error);
    }
  });
  app.post('/api/explain', async (req, res, next) => {
    try {
      const input = z
        .object({
          projectId: z.string(),
          question: z.string().trim().min(1).max(2000),
          selectedId: z.string().max(500).optional(),
        })
        .parse(req.body);
      const cached = projects.get(input.projectId);
      if (!cached || cached.expires < Date.now()) {
        res.status(404).json({
          error: 'This analysis session expired. Refresh the repository map to ask questions.',
        });
        return;
      }
      res.json(await explain(cached.project, input.question, input.selectedId));
    } catch (error) {
      next(error);
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const message =
        error instanceof z.ZodError
          ? 'Invalid request. Check the path or question and try again.'
          : error instanceof Error
            ? error.message
            : 'The request failed. Please try again.';
      const status = (error as { status?: number })?.status;
      res.status(status === 413 ? 413 : 400).json({ error: message });
    },
  );
  return app;
}
