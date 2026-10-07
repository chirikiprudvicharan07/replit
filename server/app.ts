import express, { Express } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.ts';
import profileRoutes from './routes/profileRoutes.ts';
import classRoutes from './routes/classRoutes.ts';
import studentRoutes from './routes/studentRoutes.ts';
import attendanceRoutes from './routes/attendanceRoutes.ts';
import markRoutes from './routes/markRoutes.ts';
import assignmentRoutes from './routes/assignmentRoutes.ts';
import submissionRoutes from './routes/submissionRoutes.ts';
import aiRoutes from './routes/aiRoutes.ts';
import interventionRoutes from './routes/interventionRoutes.ts';
import dashboardRoutes from './routes/dashboardRoutes.ts';
import { errorHandler } from './middleware/errorHandler.ts';

export function createApp(): Express {
  const app = express();

  const allowedOrigins = process.env.CORS_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === 'production' && (!allowedOrigins || allowedOrigins.length === 0)) {
    throw new Error('CORS_ORIGIN must contain at least one allowed HTTPS origin in production');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    allowedOrigins?.some((origin) => !origin.startsWith('https://'))
  ) {
    throw new Error('Production CORS_ORIGIN entries must use HTTPS');
  }

  app.use(
    cors({
      origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
    })
  );
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'ClassPulse AI API service is healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API modules
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/classes', classRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/marks', markRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/interventions', interventionRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}