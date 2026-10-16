import 'dotenv/config';
import path from 'node:path';
import { createLocalServer } from './http.js';
import { realpath } from 'node:fs/promises';
import { createApp } from './app.js';

const root = await realpath(path.resolve(process.env.ARCHMAP_ROOT || process.cwd()));
const app = createApp(root);
const httpServer = createLocalServer(app);
const port = Number(process.env.PORT || 4310);
if (process.env.NODE_ENV === 'production') {
  const { default: express } = await import('express');
  app.use(express.static(path.resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}
httpServer.on('error', (error) => {
  console.error(`Could not start ArchMap on port ${port}: ${error.message}`);
  process.exit(1);
});
httpServer.listen(port, '127.0.0.1', () => {
  console.log(`\n  ArchMap → http://localhost:${port}\n  Repository root: ${root}\n`);
});
