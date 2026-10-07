import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createApp } from './app.ts';
import { initDb } from './db/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer() {
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`[ClassPulse] Starting application in ${isProduction ? 'production' : 'development'} mode...`);

  try {
    await initDb();
  } catch (err) {
    console.error('[ClassPulse] Database initialization warning:', err);
  }

  const app = createApp();

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../dist');
    if (fs.existsSync(distPath)) {
      const express = (await import('express')).default;
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
          return next();
        }
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ClassPulse] Server is running on http://0.0.0.0:${PORT}`);
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    console.error('[ClassPulse] Fatal server startup error:', err);
    process.exit(1);
  });
}