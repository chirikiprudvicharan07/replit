import { Response } from 'express';
import { query } from '../db/index.ts';
import { generateId } from '../utils/id.ts';
import { markSchema } from '../schemas/index.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { verifyClassOwnership, verifyStudentOwnership, verifyMarkOwnership } from '../middleware/ownership.ts';

export async function getMarks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const classId = typeof req.query.classId === 'string' ? req.query.classId : null;
  const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : null;
  const subject = typeof req.query.subject === 'string' ? req.query.subject : null;

  let sql = `
    SELECT m.*, s.name as student_name, s.student_code, c.name as class_name,
           ROUND((m.score / m.max_score * 100)::numeric, 1) as percentage
    FROM marks m
    JOIN students s ON m.student_id = s.id
    JOIN classes c ON m.class_id = c.id
    WHERE c.teacher_id = $1
  `;
  const params: any[] = [teacherId];

  if (classId) {
    params.push(classId);
    sql += ` AND m.class_id = $${params.length}`;
  }
  if (studentId) {
    params.push(studentId);
    sql += ` AND m.student_id = $${params.length}`;
  }
  if (subject) {
    params.push(subject);
    sql += ` AND LOWER(m.subject) = LOWER($${params.length})`;
  }

  sql += ` ORDER BY m.assessment_date DESC, s.name ASC`;

  const result = await query(sql, params);

  // Format numerical scores
  const marks = result.rows.map((r) => ({
    ...r,
    score: Number(r.score),
    maxScore: Number(r.max_score),
    percentage: Number(r.percentage),
  }));

  res.json({
    success: true,
    data: marks,
  });
}

export async function createMark(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const parsed = markSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid assessment mark data',
      },
    });
    return;
  }

  const { studentId, classId, subject, assessmentName, score, maxScore, assessmentDate, remarks } =
    parsed.data;

  const ownsClass = await verifyClassOwnership(classId, teacherId);
  const ownsStudent = await verifyStudentOwnership(studentId, teacherId);

  if (!ownsClass || !ownsStudent) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not own this class or student' },
    });
    return;
  }

  const id = generateId();

  await query(
    `INSERT INTO marks (id, student_id, class_id, subject, assessment_name, score, max_score, assessment_date, remarks, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, studentId, classId, subject.trim(), assessmentName.trim(), score, maxScore, assessmentDate, remarks || '']
  );

  const mark = await query(
    `SELECT m.*, ROUND((m.score / m.max_score * 100)::numeric, 1) as percentage
     FROM marks m WHERE m.id = $1`,
    [id]
  );

  res.status(201).json({
    success: true,
    message: 'Assessment score recorded successfully',
    data: {
      ...mark.rows[0],
      score: Number(mark.rows[0].score),
      maxScore: Number(mark.rows[0].max_score),
      percentage: Number(mark.rows[0].percentage),
    },
  });
}

export async function updateMark(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const markId = req.params.id;

  const isOwner = await verifyMarkOwnership(markId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to update this mark' },
    });
    return;
  }

  const parsed = markSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid assessment mark update data',
      },
    });
    return;
  }

  const existing = await query('SELECT * FROM marks WHERE id = $1', [markId]);
  const current = existing.rows[0];

  const subject = parsed.data.subject ?? current.subject;
  const assessmentName = parsed.data.assessmentName ?? current.assessment_name;
  const score = parsed.data.score ?? current.score;
  const maxScore = parsed.data.maxScore ?? current.max_score;
  const assessmentDate = parsed.data.assessmentDate ?? current.assessment_date;
  const remarks = parsed.data.remarks ?? current.remarks;

  await query(
    `UPDATE marks
     SET subject = $1, assessment_name = $2, score = $3, max_score = $4, assessment_date = $5, remarks = $6, updated_at = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [subject, assessmentName, score, maxScore, assessmentDate, remarks, markId]
  );

  const updated = await query(
    `SELECT m.*, ROUND((m.score / m.max_score * 100)::numeric, 1) as percentage
     FROM marks m WHERE m.id = $1`,
    [markId]
  );

  res.json({
    success: true,
    message: 'Mark updated successfully',
    data: {
      ...updated.rows[0],
      score: Number(updated.rows[0].score),
      maxScore: Number(updated.rows[0].max_score),
      percentage: Number(updated.rows[0].percentage),
    },
  });
}

export async function deleteMark(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const markId = req.params.id;

  const isOwner = await verifyMarkOwnership(markId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this mark' },
    });
    return;
  }

  await query('DELETE FROM marks WHERE id = $1', [markId]);

  res.json({
    success: true,
    message: 'Assessment score deleted successfully',
    data: null,
  });
}
