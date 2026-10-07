import type { Request, Response } from 'express';
import { createApp } from '../server/app.ts';
import { initDb } from '../server/db/index.ts';
import { validateJwtConfiguration } from '../server/utils/jwt.ts';

validateJwtConfiguration();

const app = createApp();
const databaseReady = initDb();

export default async function handler(req: Request, res: Response): Promise<void> {
  await databaseReady;
  app(req, res);
}
