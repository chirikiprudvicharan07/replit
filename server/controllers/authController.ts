import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db/index.ts';
import { generateToken } from '../utils/jwt.ts';
import { generateId } from '../utils/id.ts';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/index.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { getSupabaseClient } from '../lib/supabase.ts';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function setAuthCookie(res: Response, token: string): void {
  res.cookie('classpulse_token', token, cookieOptions);
}

export async function register(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid input data',
      },
    });
    return;
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Check duplicate
  const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    res.status(409).json({
      success: false,
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists',
      },
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = generateId();

  await query(
    `INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'TEACHER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [userId, name.trim(), normalizedEmail, passwordHash]
  );

  const token = generateToken({
    userId,
    email: normalizedEmail,
    role: 'TEACHER',
  });
  setAuthCookie(res, token);

  res.status(201).json({
    success: true,
    message: 'Teacher registered successfully',
    data: {
      user: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        role: 'TEACHER',
      },
      token,
    },
  });
}

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid input data',
      },
    });
    return;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const cleanPassword = password.trim();

  const userRes = await query(
    'SELECT id, name, email, password_hash, role FROM users WHERE LOWER(email) = $1',
    [normalizedEmail]
  );

  if (userRes.rows.length === 0) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  const user = userRes.rows[0];
  const isMatch = await bcrypt.compare(cleanPassword, user.password_hash);

  if (!isMatch) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  setAuthCookie(res, token);

  res.json({
    success: true,
    message: 'Logged in successfully',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    },
  });
}

export async function loginWithGoogle(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    res.status(503).json({
      success: false,
      error: {
        code: 'GOOGLE_AUTH_NOT_CONFIGURED',
        message: 'Google sign-in is not configured on this server',
      },
    });
    return;
  }

  const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken : '';
  if (!accessToken) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Supabase access token is required' },
    });
    return;
  }

  const { data, error } = await getSupabaseClient().auth.getUser(accessToken);
  if (error || !data.user?.email) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_GOOGLE_SESSION', message: 'Google session is invalid or expired' },
    });
    return;
  }

  const email = data.user.email.toLowerCase().trim();
  const metadata = data.user.user_metadata as { full_name?: string; name?: string } | undefined;
  const name = metadata?.full_name || metadata?.name || email.split('@')[0];
  const existing = await query(
    'SELECT id, name, email, role FROM users WHERE LOWER(email) = $1',
    [email]
  );

  let user = existing.rows[0];
  if (!user) {
    const userId = generateId();
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'TEACHER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, name.trim(), email, passwordHash]
    );
    user = { id: userId, name: name.trim(), email, role: 'TEACHER' };
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  setAuthCookie(res, token);

  res.json({
    success: true,
    message: 'Signed in with Google successfully',
    data: { user, token },
  });
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.clearCookie('classpulse_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  res.json({
    success: true,
    message: 'Logged out successfully',
    data: null,
  });
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
    });
    return;
  }

  const userRes = await query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (userRes.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User profile not found' },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      user: userRes.rows[0],
    },
  });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
    });
    return;
  }

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid input data',
      },
    });
    return;
  }

  const { name, email } = parsed.data;

  if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2', [
      normalizedEmail,
      userId,
    ]);
    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Email is already taken by another account' },
      });
      return;
    }

    await query(
      'UPDATE users SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [name.trim(), normalizedEmail, userId]
    );
  } else {
    await query(
      'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [name.trim(), userId]
    );
  }

  const updatedUser = await query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: updatedUser.rows[0],
    },
  });
}