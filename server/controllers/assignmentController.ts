import { Response } from 'express';
import { query } from '../db/index.ts';
import { generateId } from '../utils/id.ts';
import { assignmentSchema } from '../schemas/index.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { verifyClassOwnership, verifyAssignmentOwnership } from '../middleware/ownership.ts';

export async function getAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const classId = typeof req.query.classId === 'string' ? req.query.classId : null;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  let sql = `
    SELECT a.*, c.name as class_name, c.subject,
           COUNT(s.id) as total_students,
           COUNT(CASE WHEN sub.status = 'SUBMITTED' THEN 1 END) as submitted_count,
           COUNT(CASE WHEN sub.status = 'LATE' THEN 1 END) as late_count,
           COUNT(CASE WHEN sub.status = 'MISSING' THEN 1 END) as missing_count,
           COUNT(CASE WHEN sub.status = 'PENDING' OR sub.status IS NULL THEN 1 END) as pending_count
    FROM assignments a
    JOIN classes c ON a.class_id = c.id
    LEFT JOIN students s ON s.class_id = c.id
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
    WHERE c.teacher_id = $1
  `;
  const params: any[] = [teacherId];

  if (classId) {
    params.push(classId);
    sql += ` AND a.class_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (LOWER(a.title) LIKE $${params.length} OR LOWER(a.description) LIKE $${params.length})`;
  }

  sql += ` GROUP BY a.id, c.name, c.subject ORDER BY a.due_date ASC`;

  const result = await query(sql, params);

  const assignments = result.rows.map((r) => ({
    ...r,
    maxScore: Number(r.max_score),
    totalStudents: Number(r.total_students || 0),
    submittedCount: Number(r.submitted_count || 0),
    lateCount: Number(r.late_count || 0),
    missingCount: Number(r.missing_count || 0),
    pendingCount: Number(r.pending_count || 0),
  }));

  res.json({
    success: true,
    data: assignments,
  });
}

export async function createAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const parsed = assignmentSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid assignment data',
      },
    });
    return;
  }

  const { classId, title, description, dueDate, maxScore } = parsed.data;

  const isOwner = await verifyClassOwnership(classId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have access to this class' },
    });
    return;
  }

  const assignmentId = generateId();

  await query(
    `INSERT INTO assignments (id, class_id, title, description, due_date, max_score, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [assignmentId, classId, title.trim(), description || '', dueDate, maxScore || 100]
  );

  // Auto-create initial PENDING submissions for all students in class
  const studentsRes = await query('SELECT id FROM students WHERE class_id = $1', [classId]);
  for (const s of studentsRes.rows) {
    const subId = generateId();
    await query(
      `INSERT INTO assignment_submissions (id, assignment_id, student_id, status, score, remarks, created_at, updated_at)
       VALUES ($1, $2, $3, 'PENDING', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [subId, assignmentId, s.id]
    );
  }

  const assignment = await query('SELECT * FROM assignments WHERE id = $1', [assignmentId]);

  res.status(201).json({
    success: true,
    message: 'Assignment created successfully',
    data: assignment.rows[0],
  });
}

export async function getAssignmentById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const assignmentId = req.params.id;

  const isOwner = await verifyAssignmentOwnership(assignmentId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to view this assignment' },
    });
    return;
  }

  const assignRes = await query(
    `SELECT a.*, c.name as class_name, c.subject
     FROM assignments a
     JOIN classes c ON a.class_id = c.id
     WHERE a.id = $1`,
    [assignmentId]
  );

  if (assignRes.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Assignment not found' },
    });
    return;
  }

  // Submissions for this assignment
  const subRes = await query(
    `SELECT sub.*, s.name as student_name, s.student_code
     FROM assignment_submissions sub
     JOIN students s ON sub.student_id = s.id
     WHERE sub.assignment_id = $1
     ORDER BY s.name ASC`,
    [assignmentId]
  );

  res.json({
    success: true,
    data: {
      ...assignRes.rows[0],
      submissions: subRes.rows.map((sub) => ({
        ...sub,
        score: sub.score != null ? Number(sub.score) : null,
      })),
    },
  });
}

export async function updateAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const assignmentId = req.params.id;

  const isOwner = await verifyAssignmentOwnership(assignmentId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to update this assignment' },
    });
    return;
  }

  const parsed = assignmentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid assignment data',
      },
    });
    return;
  }

  const existing = await query('SELECT * FROM assignments WHERE id = $1', [assignmentId]);
  const current = existing.rows[0];

  const title = parsed.data.title ?? current.title;
  const description = parsed.data.description ?? current.description;
  const dueDate = parsed.data.dueDate ?? current.due_date;
  const maxScore = parsed.data.maxScore ?? current.max_score;

  await query(
    `UPDATE assignments
     SET title = $1, description = $2, due_date = $3, max_score = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [title, description, dueDate, maxScore, assignmentId]
  );

  const updated = await query('SELECT * FROM assignments WHERE id = $1', [assignmentId]);

  res.json({
    success: true,
    message: 'Assignment updated successfully',
    data: updated.rows[0],
  });
}

export async function deleteAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const assignmentId = req.params.id;

  const isOwner = await verifyAssignmentOwnership(assignmentId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this assignment' },
    });
    return;
  }

  await query('DELETE FROM assignments WHERE id = $1', [assignmentId]);

  res.json({
    success: true,
    message: 'Assignment deleted successfully',
    data: null,
  });
}
