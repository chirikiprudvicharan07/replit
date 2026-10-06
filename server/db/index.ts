import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';

const { Pool } = pg;

interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

interface DbClient {
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
  exec: (sql: string) => Promise<void>;
  close?: () => Promise<void>;
  type: 'postgres' | 'pglite';
}

declare global {
  var _postgresPool: pg.Pool | undefined;
}

let dbInstance: DbClient | null = null;

export async function getDb(): Promise<DbClient> {
  if (dbInstance) {
    return dbInstance;
  }

  // 1. Cloud SQL Managed PostgreSQL (Object Method)
  if (
    process.env.SQL_HOST &&
    process.env.SQL_USER &&
    process.env.SQL_PASSWORD &&
    process.env.SQL_DB_NAME
  ) {
    console.log('[Database] Connecting to managed Cloud SQL instance via Object Method...');
    try {
      if (!global._postgresPool) {
        global._postgresPool = new Pool({
          host: process.env.SQL_HOST,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
          max: 10,
          connectionTimeoutMillis: 15000,
        });

        global._postgresPool.on('error', (err) => {
          console.error('Unexpected error on idle SQL pool client:', err);
        });
      }

      dbInstance = {
        type: 'postgres',
        query: async <T = any>(text: string, params?: any[]) => {
          const res = await global._postgresPool!.query(text, params);
          return {
            rows: res.rows as T[],
            rowCount: res.rowCount ?? res.rows.length,
          };
        },
        exec: async (sql: string) => {
          await global._postgresPool!.query(sql);
        },
        close: async () => {
          if (global._postgresPool) {
            await global._postgresPool.end();
            global._postgresPool = undefined;
          }
        },
      };
      return dbInstance;
    } catch (err: any) {
      console.warn(`[Database] Notice: Cloud SQL connection failed (${err.message}). Falling back...`);
    }
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim().length > 0) {
    console.log('[Database] Attempting connection to PostgreSQL via DATABASE_URL...');
    try {
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl:
          databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
            ? false
            : { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000,
      });

      // Test connection with timeout
      const client = await pool.connect();
      client.release();
      console.log('[Database] Connected to external PostgreSQL successfully.');

      dbInstance = {
        type: 'postgres',
        query: async <T = any>(text: string, params?: any[]) => {
          const res = await pool.query(text, params);
          return {
            rows: res.rows as T[],
            rowCount: res.rowCount ?? res.rows.length,
          };
        },
        exec: async (sql: string) => {
          await pool.query(sql);
        },
        close: async () => {
          await pool.end();
        },
      };
      return dbInstance;
    } catch (err: any) {
      console.warn(
        `[Database] Notice: External PostgreSQL connection to DATABASE_URL failed (${err.message}). Falling back to embedded PostgreSQL engine (PGlite)...`
      );
    }
  }

  console.log('[Database] Initializing embedded PostgreSQL engine (PGlite)...');
  const dataDir = path.resolve(process.cwd(), 'data/pgdata');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let pglite: PGlite;
  try {
    pglite = new PGlite(dataDir);
    await pglite.waitReady;
    console.log('[Database] Embedded PostgreSQL (PGlite) ready at:', dataDir);
  } catch (e: any) {
    console.warn(
      '[Database] Notice: pgdata filesystem locked or busy, falling back to clean memory-mapped PostgreSQL engine.'
    );
    pglite = new PGlite();
    await pglite.waitReady;
    console.log('[Database] Memory-mapped PostgreSQL engine ready.');
  }

  dbInstance = {
    type: 'pglite',
    query: async <T = any>(text: string, params?: any[]) => {
      const res = await pglite.query<T>(text, params);
      return {
        rows: (res.rows || []) as T[],
        rowCount: res.rows ? res.rows.length : 0,
      };
    },
    exec: async (sql: string) => {
      await pglite.exec(sql);
    },
    close: async () => {
      await pglite.close();
    },
  };

  return dbInstance;
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const db = await getDb();
  return db.query<T>(text, params);
}

export async function initDb(): Promise<void> {
  console.log('[Database] Initializing tables and schema...');
  const db = await getDb();

  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'TEACHER' NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id VARCHAR(36) PRIMARY KEY,
      teacher_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      academic_year VARCHAR(50) NOT NULL,
      description TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(36) PRIMARY KEY,
      class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) DEFAULT '',
      student_code VARCHAR(100) NOT NULL,
      date_of_birth VARCHAR(50) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id VARCHAR(36) PRIMARY KEY,
      student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      date VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,
      remarks TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      CONSTRAINT unique_student_date UNIQUE (student_id, date)
    );

    CREATE TABLE IF NOT EXISTS marks (
      id VARCHAR(36) PRIMARY KEY,
      student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject VARCHAR(255) NOT NULL,
      assessment_name VARCHAR(255) NOT NULL,
      score NUMERIC(6, 2) NOT NULL,
      max_score NUMERIC(6, 2) NOT NULL,
      assessment_date VARCHAR(20) NOT NULL,
      remarks TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id VARCHAR(36) PRIMARY KEY,
      class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      due_date VARCHAR(30) NOT NULL,
      max_score NUMERIC(6, 2) DEFAULT 100 NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id VARCHAR(36) PRIMARY KEY,
      assignment_id VARCHAR(36) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      status VARCHAR(30) NOT NULL,
      score NUMERIC(6, 2),
      submitted_at TIMESTAMP,
      remarks TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      CONSTRAINT unique_submission UNIQUE (assignment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS ai_analyses (
      id VARCHAR(36) PRIMARY KEY,
      teacher_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      overall_risk VARCHAR(20) NOT NULL,
      risk_score NUMERIC(5, 2) NOT NULL,
      summary TEXT NOT NULL,
      strengths JSONB NOT NULL,
      concerns JSONB NOT NULL,
      priority_areas JSONB NOT NULL,
      recommended_actions JSONB NOT NULL,
      intervention_plan JSONB NOT NULL,
      teacher_message TEXT NOT NULL,
      raw_structured_output JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interventions (
      id VARCHAR(36) PRIMARY KEY,
      teacher_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      ai_analysis_id VARCHAR(36) REFERENCES ai_analyses(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      priority VARCHAR(20) NOT NULL,
      status VARCHAR(30) DEFAULT 'PENDING' NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);
    CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);
    CREATE INDEX IF NOT EXISTS idx_marks_class ON marks(class_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);
    CREATE INDEX IF NOT EXISTS idx_ai_student ON ai_analyses(student_id);
    CREATE INDEX IF NOT EXISTS idx_interventions_student ON interventions(student_id);
    CREATE INDEX IF NOT EXISTS idx_interventions_teacher ON interventions(teacher_id);
  `;

  if (process.env.SQL_HOST) {
    console.log('[Database] Cloud SQL schema managed via Drizzle Kit.');
  } else {
    await db.exec(schemaSql);
    console.log('[Database] Schema initialized successfully.');
  }

  // Auto-seed if database is empty (ensures teacher@classpulse.edu and sample classes are ready)
  try {
    const userCheck = await db.query('SELECT id FROM users LIMIT 1');
    if (userCheck.rows.length === 0) {
      console.log('[Database] No teacher records found. Auto-seeding initial demo data...');
      const { runSeed } = await import('../seed.ts');
      await runSeed();
    }
  } catch (seedErr: any) {
    console.warn('[Database] Auto-seed check notice:', seedErr?.message || seedErr);
  }
}
