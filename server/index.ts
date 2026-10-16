import 'dotenv/config';
import path from 'node:path';
import { realpath } from 'node:fs/promises';
import { createApp } from './app.js';

const root = await realpath(path.resolve(process.env.ARCHMAP_ROOT || process.cwd()));
const app = createApp(root);
const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV === 'production') {
  const { default: express } = await import('express');
  app.use(express.static(path.resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
app.listen(port, '127.0.0.1', () => {
  console.log(`\n  ArchMap → http://localhost:${port}\n  Repository root: ${root}\n`);
});
