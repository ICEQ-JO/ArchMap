import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { analyze, resolveRoot } from './analyzer.js';
import { proposeMap } from './proposals.js';
import { explain } from './explain.js';
import { compareWorkingTree } from './comparison.js';
import { OpenCodeReview } from './opencode.js';
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
  const opencode = new OpenCodeReview(allowedRoot);
  app.get('/api/opencode/status', (_req, res) => res.json(opencode.status()));
  app.post('/api/opencode/connect', async (req, res, next) => {
    try {
      const input = z
        .object({
          path: z.string().trim().min(1).max(2000),
          baseUrl: z.string().url().max(2000),
          username: z
            .string()
            .max(100)
            .regex(/^[^:\r\n]+$/)
            .default('opencode'),
          password: z.string().max(2000).default(''),
        })
        .parse(req.body);
      res.json(await opencode.connect(input));
    } catch (error) {
      next(error);
    }
  });
  app.post('/api/opencode/disconnect', (_req, res) => res.json(opencode.disconnect()));
  app.get('/api/opencode/sessions', async (_req, res, next) => {
    try {
      res.json(await opencode.sessions());
    } catch (error) {
      next(error);
    }
  });
  app.post('/api/opencode/poll', async (_req, res, next) => {
    try {
      res.json(await opencode.poll());
    } catch (error) {
      next(error);
    }
  });
  app.post('/api/opencode/:action', async (req, res, next) => {
    if (!['track', 'review'].includes(req.params.action)) {
      res.status(404).json({ error: 'Unknown OpenCode operation.' });
      return;
    }
    if (scanning) {
      res.status(429).json({ error: 'Another scan is running. Try again when it finishes.' });
      return;
    }
    try {
      scanning = true;
      if (req.params.action === 'review') res.json(await opencode.review());
      else {
        const input = z
          .object({ sessionId: z.string().min(1).max(200), focus: z.string().max(500).default('') })
          .parse(req.body);
        res.json(await opencode.track(input.sessionId, input.focus));
      }
    } catch (error) {
      next(error);
    } finally {
      scanning = false;
    }
  });
  const status = () => ({
    root: allowedRoot,
    ai: Boolean(process.env.ARCHMAP_AI_BASE_URL && process.env.ARCHMAP_AI_MODEL),
    model: process.env.ARCHMAP_AI_MODEL ?? null,
    baseUrl: process.env.ARCHMAP_AI_BASE_URL ?? null,
  });
  app.get('/api/status', (_req, res) => res.json(status()));
  app.post('/api/model', (req, res, next) => {
    try {
      const input = z
        .object({
          baseUrl: z.string().url().max(2000),
          model: z.string().trim().min(1).max(200),
          apiKey: z.string().max(2000).optional(),
        })
        .parse(req.body);
      const url = new URL(input.baseUrl);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw new Error(
          'Use an HTTP(S) API base URL without embedded credentials, a query, or a fragment.',
        );
      process.env.ARCHMAP_AI_BASE_URL = input.baseUrl.replace(/\/$/, '');
      process.env.ARCHMAP_AI_MODEL = input.model;
      if (input.apiKey) process.env.ARCHMAP_AI_KEY = input.apiKey;
      else delete process.env.ARCHMAP_AI_KEY;
      res.json(status());
    } catch (error) {
      next(error);
    }
  });
  app.post('/api/model/disconnect', (_req, res) => {
    delete process.env.ARCHMAP_AI_BASE_URL;
    delete process.env.ARCHMAP_AI_MODEL;
    delete process.env.ARCHMAP_AI_KEY;
    res.json(status());
  });
  app.post('/api/analyze', async (req, res, next) => {
    if (scanning) {
      res
        .status(429)
        .json({ error: 'Another scan is running. Wait for it to finish and try again.' });
      return;
    }
    try {
      const input = z
        .object({
          path: z.string().trim().min(1).max(2000),
          view: z.enum(['architecture', 'modules']).optional(),
          focus: z.string().max(500).optional(),
        })
        .parse(req.body);
      scanning = true;
      const root = await resolveRoot(allowedRoot, input.path);
      res.json(remember(await analyze(root, 'local', input.view === 'architecture', input.focus)));
    } catch (error) {
      next(error);
    } finally {
      scanning = false;
    }
  });
  app.get('/api/example', async (req, res, next) => {
    try {
      const root = fileURLToPath(new URL('../examples/image-studio', import.meta.url));
      const project = await analyze(root, 'example', req.query.view === 'architecture');
      project.name = 'image-studio';
      res.json(remember(project));
    } catch (error) {
      next(error);
    }
  });
  app.post('/api/compare', async (req, res, next) => {
    if (scanning) {
      res.status(429).json({ error: 'Another scan is running. Try again when it finishes.' });
      return;
    }
    try {
      const input = z
        .object({
          path: z.string().trim().min(1).max(2000),
          ref: z.string().trim().min(1).max(200).default('HEAD'),
          focus: z.string().max(500).default(''),
        })
        .parse(req.body);
      scanning = true;
      const root = await resolveRoot(allowedRoot, input.path);
      res.json(await compareWorkingTree(root, input.ref, input.focus));
    } catch (error) {
      next(error);
    } finally {
      scanning = false;
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
  app.post('/api/propose', async (req, res, next) => {
    try {
      const input = z
        .object({ projectId: z.string(), prompt: z.string().trim().min(3).max(2000) })
        .parse(req.body);
      const cached = projects.get(input.projectId);
      if (!cached || cached.expires < Date.now()) {
        res.status(404).json({ error: 'Refresh this repository to start a mapping session.' });
        return;
      }
      res.json(await proposeMap(cached.project, input.prompt));
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
