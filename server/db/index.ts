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

let dbInstance: DbClient | null = null;

export async function getDb(): Promise<DbClient> {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim().length > 0) {
    console.log('[Database] Connecting to PostgreSQL via DATABASE_URL...');
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    });

    // Test connection
    const client = await pool.connect();
    client.release();
    console.log('[Database] Connected to PostgreSQL successfully.');

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
  } else {
    console.log('[Database] DATABASE_URL not set. Initializing embedded PostgreSQL engine (PGlite)...');
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
      console.warn('[Database] Notice: pgdata filesystem locked or busy, falling back to clean memory-mapped PostgreSQL engine.');
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
  }

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

  await db.exec(schemaSql);
  console.log('[Database] Schema initialized successfully.');
}
