import { Response } from 'express';
import { query } from '../db/index.ts';
import { generateId } from '../utils/id.ts';
import { interventionSchema, updateInterventionStatusSchema } from '../schemas/index.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { verifyStudentOwnership, verifyInterventionOwnership } from '../middleware/ownership.ts';

export async function getInterventions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : null;
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : null;
  const priority = typeof req.query.priority === 'string' ? req.query.priority.toUpperCase() : null;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  let sql = `
    SELECT i.*, s.name as student_name, s.student_code, c.name as class_name, c.subject
    FROM interventions i
    JOIN students s ON i.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE i.teacher_id = $1
  `;
  const params: any[] = [teacherId];

  if (studentId) {
    params.push(studentId);
    sql += ` AND i.student_id = $${params.length}`;
  }
  if (status && status !== 'ALL') {
    params.push(status);
    sql += ` AND i.status = $${params.length}`;
  }
  if (priority && priority !== 'ALL') {
    params.push(priority);
    sql += ` AND i.priority = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (LOWER(i.title) LIKE $${params.length} OR LOWER(s.name) LIKE $${params.length} OR LOWER(s.student_code) LIKE $${params.length})`;
  }

  sql += ` ORDER BY CASE i.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, i.created_at DESC`;

  const result = await query(sql, params);

  res.json({
    success: true,
    data: result.rows,
  });
}

export async function createIntervention(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const parsed = interventionSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid intervention data',
      },
    });
    return;
  }

  const { studentId, aiAnalysisId, title, description, priority, status } = parsed.data;

  const ownsStudent = await verifyStudentOwnership(studentId, teacherId);
  if (!ownsStudent) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have access to this student' },
    });
    return;
  }

  const id = generateId();

  await query(
    `INSERT INTO interventions (id, teacher_id, student_id, ai_analysis_id, title, description, priority, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, teacherId, studentId, aiAnalysisId || null, title.trim(), description.trim(), priority, status || 'PENDING']
  );

  const saved = await query(
    `SELECT i.*, s.name as student_name, s.student_code
     FROM interventions i
     JOIN students s ON i.student_id = s.id
     WHERE i.id = $1`,
    [id]
  );

  res.status(201).json({
    success: true,
    message: 'Intervention action created successfully',
    data: saved.rows[0],
  });
}

export async function updateIntervention(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const interventionId = req.params.id;

  const isOwner = await verifyInterventionOwnership(interventionId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to update this intervention' },
    });
    return;
  }

  const parsed = updateInterventionStatusSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid update data',
      },
    });
    return;
  }

  const existing = await query('SELECT * FROM interventions WHERE id = $1', [interventionId]);
  const current = existing.rows[0];

  const status = req.body.status ?? current.status;
  const title = req.body.title ?? current.title;
  const description = req.body.description ?? current.description;
  const priority = req.body.priority ?? current.priority;

  await query(
    `UPDATE interventions
     SET status = $1, title = $2, description = $3, priority = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 AND teacher_id = $6`,
    [status, title, description, priority, interventionId, teacherId]
  );

  const updated = await query(
    `SELECT i.*, s.name as student_name, s.student_code
     FROM interventions i
     JOIN students s ON i.student_id = s.id
     WHERE i.id = $1`,
    [interventionId]
  );

  res.json({
    success: true,
    message: 'Intervention updated successfully',
    data: updated.rows[0],
  });
}

export async function deleteIntervention(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const interventionId = req.params.id;

  const isOwner = await verifyInterventionOwnership(interventionId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this intervention' },
    });
    return;
  }

  await query('DELETE FROM interventions WHERE id = $1 AND teacher_id = $2', [interventionId, teacherId]);

  res.json({
    success: true,
    message: 'Intervention deleted successfully',
    data: null,
  });
}
