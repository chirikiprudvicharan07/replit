import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.ts';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieHeader = req.headers.cookie || '';
  const cookieToken = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('classpulse_token='))
    ?.slice('classpulse_token='.length);
  const token = bearerToken || cookieToken || null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is missing or invalid',
      },
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Session expired or token is invalid. Please log in again.',
      },
    });
    return;
  }

  req.user = {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
  };

  next();
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access forbidden: insufficient permissions' },
      });
      return;
    }

    next();
  };
}