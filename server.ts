import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createApp } from './server/app.ts';
import { initDb } from './server/db/index.ts';
import { validateJwtConfiguration } from './server/utils/jwt.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = Number(process.env.PORT || 3000);
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`[ClassPulse] Starting application in ${isProduction ? 'production' : 'development'} mode...`);

  validateJwtConfiguration();
  // Initialize DB schema & tables
  await initDb();

  const app = createApp();

  if (!isProduction) {
    // Development mode: Vite middleware attached directly to Express
    console.log('[ClassPulse] Mounting Vite middleware for rapid full-stack HMR...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve pre-built static client files
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      console.log('[ClassPulse] Serving static production build from:', distPath);
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
}

startServer().catch((err) => {
  console.error('[ClassPulse] Fatal server startup error:', err);
  process.exit(1);
});
