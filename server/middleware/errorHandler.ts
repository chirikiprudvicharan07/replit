import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error('[ClassPulse Error Handler]:', err);

  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data provided',
        details: formattedErrors,
      },
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
  const message = err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}
