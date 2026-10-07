import { Response } from 'express';
import { query } from '../db/index.ts';
import { generateId } from '../utils/id.ts';
import { classSchema } from '../schemas/index.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export async function getClasses(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  let sql = `
    SELECT c.*,
           COUNT(DISTINCT s.id) AS student_count
    FROM classes c
    LEFT JOIN students s ON s.class_id = c.id
    WHERE c.teacher_id = $1
  `;
  const params: any[] = [teacherId];

  if (search) {
    sql += ` AND (LOWER(c.name) LIKE $2 OR LOWER(c.subject) LIKE $2 OR LOWER(c.academic_year) LIKE $2)`;
    params.push(`%${search}%`);
  }

  sql += ` GROUP BY c.id ORDER BY c.created_at DESC`;

  const result = await query(sql, params);

  const classesWithStats = await Promise.all(
    result.rows.map(async (cls) => {
      // Calculate overall class average marks & attendance
      const attRes = await query(
        `SELECT status FROM attendance WHERE class_id = $1`,
        [cls.id]
      );
      const totalAtt = attRes.rows.length;
      let presentAtt = 0;
      attRes.rows.forEach((r) => {
        if (r.status === 'PRESENT') presentAtt += 1;
        else if (r.status === 'LATE') presentAtt += 0.5;
      });
      const avgAttendance = totalAtt > 0 ? Number(((presentAtt / totalAtt) * 100).toFixed(1)) : 100;

      const marksRes = await query(
        `SELECT score, max_score FROM marks WHERE class_id = $1`,
        [cls.id]
      );
      let totalMarksPct = 0;
      marksRes.rows.forEach((m) => {
        const sc = Number(m.score);
        const mx = Number(m.max_score);
        if (mx > 0) totalMarksPct += (sc / mx) * 100;
      });
      const avgPerformance =
        marksRes.rows.length > 0
          ? Number((totalMarksPct / marksRes.rows.length).toFixed(1))
          : 0;

      return {
        ...cls,
        studentCount: Number(cls.student_count || 0),
        avgAttendance,
        avgPerformance,
      };
    })
  );

  res.json({
    success: true,
    data: classesWithStats,
  });
}

export async function createClass(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const parsed = classSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid class data',
      },
    });
    return;
  }

  const { name, subject, academicYear, description } = parsed.data;
  const id = generateId();

  await query(
    `INSERT INTO classes (id, teacher_id, name, subject, academic_year, description, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, teacherId, name.trim(), subject.trim(), academicYear.trim(), description || '']
  );

  const newClass = await query('SELECT * FROM classes WHERE id = $1', [id]);

  res.status(201).json({
    success: true,
    message: 'Class created successfully',
    data: newClass.rows[0],
  });
}

export async function getClassById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const classId = req.params.id;

  const result = await query(
    `SELECT * FROM classes WHERE id = $1`,
    [classId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Class not found' },
    });
    return;
  }

  const cls = result.rows[0];
  // Strict ownership check: Teacher A cannot view Teacher B's class
  if (cls.teacher_id !== teacherId) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to access this class' },
    });
    return;
  }

  // Aggregate class statistics
  const studentsRes = await query(
    `SELECT s.*, 
            (SELECT COUNT(*) FROM attendance WHERE student_id = s.id) as total_attendance,
            (SELECT COUNT(*) FROM attendance WHERE student_id = s.id AND status = 'PRESENT') as present_attendance,
            (SELECT COUNT(*) FROM attendance WHERE student_id = s.id AND status = 'LATE') as late_attendance,
            (SELECT AVG(score / max_score * 100) FROM marks WHERE student_id = s.id) as avg_marks,
            (SELECT overall_risk FROM ai_analyses WHERE student_id = s.id ORDER BY created_at DESC LIMIT 1) as latest_risk,
            (SELECT risk_score FROM ai_analyses WHERE student_id = s.id ORDER BY created_at DESC LIMIT 1) as latest_risk_score
     FROM students s
     WHERE s.class_id = $1
     ORDER BY s.name ASC`,
    [classId]
  );

  const students = studentsRes.rows.map((s) => {
    const tot = Number(s.total_attendance || 0);
    const pres = Number(s.present_attendance || 0) + Number(s.late_attendance || 0) * 0.5;
    const attPct = tot > 0 ? Number(((pres / tot) * 100).toFixed(1)) : 100;
    const marksPct = s.avg_marks != null ? Number(Number(s.avg_marks).toFixed(1)) : 0;
    return {
      ...s,
      attendancePercentage: attPct,
      averageMarks: marksPct,
      latestRisk: s.latest_risk || 'NOT_ANALYZED',
      latestRiskScore: s.latest_risk_score != null ? Number(s.latest_risk_score) : null,
    };
  });

  const assignmentsRes = await query(
    `SELECT * FROM assignments WHERE class_id = $1 ORDER BY due_date ASC`,
    [classId]
  );

  res.json({
    success: true,
    data: {
      ...cls,
      students,
      assignments: assignmentsRes.rows,
      studentCount: students.length,
    },
  });
}

export async function updateClass(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const classId = req.params.id;

  const existing = await query('SELECT teacher_id FROM classes WHERE id = $1', [classId]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Class not found' },
    });
    return;
  }
  if (existing.rows[0].teacher_id !== teacherId) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to update this class' },
    });
    return;
  }

  const parsed = classSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid class data',
      },
    });
    return;
  }

  const { name, subject, academicYear, description } = parsed.data;

  await query(
    `UPDATE classes 
     SET name = $1, subject = $2, academic_year = $3, description = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 AND teacher_id = $6`,
    [name.trim(), subject.trim(), academicYear.trim(), description || '', classId, teacherId]
  );

  const updated = await query('SELECT * FROM classes WHERE id = $1', [classId]);

  res.json({
    success: true,
    message: 'Class updated successfully',
    data: updated.rows[0],
  });
}

export async function deleteClass(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const classId = req.params.id;

  const existing = await query('SELECT teacher_id FROM classes WHERE id = $1', [classId]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Class not found' },
    });
    return;
  }
  if (existing.rows[0].teacher_id !== teacherId) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this class' },
    });
    return;
  }

  await query('DELETE FROM classes WHERE id = $1 AND teacher_id = $2', [classId, teacherId]);

  res.json({
    success: true,
    message: 'Class deleted successfully',
    data: null,
  });
}
