import { Response } from 'express';
import { query } from '../db/index.ts';
import { generateId } from '../utils/id.ts';
import { submissionSchema } from '../schemas/index.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { verifyAssignmentStudentOwnership } from '../middleware/ownership.ts';

export async function getSubmissions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const assignmentId = typeof req.query.assignmentId === 'string' ? req.query.assignmentId : null;
  const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : null;

  let sql = `
    SELECT sub.*, s.name as student_name, s.student_code, a.title as assignment_title, a.max_score
    FROM assignment_submissions sub
    JOIN assignments a ON sub.assignment_id = a.id
    JOIN classes c ON a.class_id = c.id
    JOIN students s ON sub.student_id = s.id
    WHERE c.teacher_id = $1
  `;
  const params: any[] = [teacherId];

  if (assignmentId) {
    params.push(assignmentId);
    sql += ` AND sub.assignment_id = $${params.length}`;
  }
  if (studentId) {
    params.push(studentId);
    sql += ` AND sub.student_id = $${params.length}`;
  }

  sql += ` ORDER BY sub.updated_at DESC`;

  const result = await query(sql, params);

  res.json({
    success: true,
    data: result.rows.map((r) => ({
      ...r,
      score: r.score != null ? Number(r.score) : null,
      maxScore: Number(r.max_score),
    })),
  });
}

export async function recordSubmission(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const parsed = submissionSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid submission data',
      },
    });
    return;
  }

  const { assignmentId, studentId, status, score, remarks } = parsed.data;

  if (!(await verifyAssignmentStudentOwnership(assignmentId, studentId, teacherId))) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have access to this assignment or student' },
    });
    return;
  }

  const existing = await query(
    'SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
    [assignmentId, studentId]
  );

  let id: string;
  const submittedAt = status === 'SUBMITTED' || status === 'LATE' ? 'CURRENT_TIMESTAMP' : null;

  if (existing.rows.length > 0) {
    id = existing.rows[0].id;
    await query(
      `UPDATE assignment_submissions
       SET status = $1, score = $2, submitted_at = ${submittedAt ? 'CURRENT_TIMESTAMP' : 'NULL'}, remarks = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [status, score ?? null, remarks || '', id]
    );
  } else {
    id = generateId();
    await query(
      `INSERT INTO assignment_submissions (id, assignment_id, student_id, status, score, submitted_at, remarks, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, ${submittedAt ? 'CURRENT_TIMESTAMP' : 'NULL'}, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, assignmentId, studentId, status, score ?? null, remarks || '']
    );
  }

  const result = await query('SELECT * FROM assignment_submissions WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Submission updated successfully',
    data: {
      ...result.rows[0],
      score: result.rows[0].score != null ? Number(result.rows[0].score) : null,
    },
  });
}

export async function updateSubmission(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const submissionId = req.params.id;

  const subRes = await query(
    `SELECT sub.id, sub.assignment_id, c.teacher_id
     FROM assignment_submissions sub
     JOIN assignments a ON sub.assignment_id = a.id
     JOIN classes c ON a.class_id = c.id
     WHERE sub.id = $1`,
    [submissionId]
  );

  if (subRes.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Submission not found' },
    });
    return;
  }

  if (subRes.rows[0].teacher_id !== teacherId) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to update this submission' },
    });
    return;
  }

  const { status, score, remarks } = req.body;

  await query(
    `UPDATE assignment_submissions
     SET status = COALESCE($1, status),
         score = $2,
         remarks = COALESCE($3, remarks),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [status, score !== undefined ? score : null, remarks, submissionId]
  );

  const updated = await query('SELECT * FROM assignment_submissions WHERE id = $1', [submissionId]);

  res.json({
    success: true,
    message: 'Submission updated successfully',
    data: {
      ...updated.rows[0],
      score: updated.rows[0].score != null ? Number(updated.rows[0].score) : null,
    },
  });
}

export async function deleteSubmission(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const submissionId = req.params.id;

  const subRes = await query(
    `SELECT sub.id, c.teacher_id
     FROM assignment_submissions sub
     JOIN assignments a ON sub.assignment_id = a.id
     JOIN classes c ON a.class_id = c.id
     WHERE sub.id = $1`,
    [submissionId]
  );

  if (subRes.rows.length === 0 || subRes.rows[0].teacher_id !== teacherId) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Permission denied' },
    });
    return;
  }

  await query('DELETE FROM assignment_submissions WHERE id = $1', [submissionId]);

  res.json({
    success: true,
    message: 'Submission deleted successfully',
    data: null,
  });
}