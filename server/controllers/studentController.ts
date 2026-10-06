import { Response } from 'express';
import { query } from '../db/index.ts';
import { generateId } from '../utils/id.ts';
import { studentSchema } from '../schemas/index.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { verifyClassOwnership, verifyStudentOwnership } from '../middleware/ownership.ts';
import { calculateStudentMetrics } from '../services/metrics.ts';

export async function getStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const classId = typeof req.query.classId === 'string' ? req.query.classId : null;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const riskFilter = typeof req.query.risk === 'string' ? req.query.risk.toUpperCase() : null;

  let sql = `
    SELECT s.id, s.class_id, s.name, s.email, s.student_code, s.date_of_birth, s.created_at,
           c.name as class_name, c.subject, c.academic_year,
           (SELECT COUNT(*) FROM attendance WHERE student_id = s.id) as total_attendance,
           (SELECT COUNT(*) FROM attendance WHERE student_id = s.id AND status = 'PRESENT') as present_attendance,
           (SELECT COUNT(*) FROM attendance WHERE student_id = s.id AND status = 'LATE') as late_attendance,
           (SELECT AVG(score / max_score * 100) FROM marks WHERE student_id = s.id) as avg_marks,
           (SELECT overall_risk FROM ai_analyses WHERE student_id = s.id ORDER BY created_at DESC LIMIT 1) as latest_risk,
           (SELECT risk_score FROM ai_analyses WHERE student_id = s.id ORDER BY created_at DESC LIMIT 1) as latest_risk_score,
           (SELECT COUNT(*) FROM assignments a WHERE a.class_id = s.class_id) as total_assignments,
           (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.student_id = s.id AND sub.status = 'MISSING') as missing_assignments
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE c.teacher_id = $1
  `;
  const params: any[] = [teacherId];

  if (classId) {
    params.push(classId);
    sql += ` AND s.class_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (LOWER(s.name) LIKE $${params.length} OR LOWER(s.student_code) LIKE $${params.length} OR LOWER(s.email) LIKE $${params.length})`;
  }

  sql += ` ORDER BY s.name ASC`;

  const result = await query(sql, params);

  let formatted = result.rows.map((s) => {
    const tot = Number(s.total_attendance || 0);
    const pres = Number(s.present_attendance || 0) + Number(s.late_attendance || 0) * 0.5;
    const attPct = tot > 0 ? Number(((pres / tot) * 100).toFixed(1)) : 100;
    const marksPct = s.avg_marks != null ? Number(Number(s.avg_marks).toFixed(1)) : 0;
    return {
      id: s.id,
      classId: s.class_id,
      className: s.class_name,
      subject: s.subject,
      academicYear: s.academic_year,
      name: s.name,
      email: s.email,
      studentCode: s.student_code,
      dateOfBirth: s.date_of_birth,
      createdAt: s.created_at,
      attendancePercentage: attPct,
      averageMarks: marksPct,
      latestRisk: s.latest_risk || 'NOT_ANALYZED',
      latestRiskScore: s.latest_risk_score != null ? Number(s.latest_risk_score) : null,
      totalAssignments: Number(s.total_assignments || 0),
      missingAssignments: Number(s.missing_assignments || 0),
    };
  });

  if (riskFilter && riskFilter !== 'ALL') {
    formatted = formatted.filter((s) => s.latestRisk === riskFilter);
  }

  res.json({
    success: true,
    data: formatted,
  });
}

export async function createStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const parsed = studentSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid student data',
      },
    });
    return;
  }

  const { classId, name, email, studentCode, dateOfBirth } = parsed.data;

  // Verify class belongs to this teacher
  const isOwner = await verifyClassOwnership(classId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not own this class' },
    });
    return;
  }

  const id = generateId();
  await query(
    `INSERT INTO students (id, class_id, name, email, student_code, date_of_birth, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, classId, name.trim(), email || '', studentCode.trim(), dateOfBirth || '']
  );

  const newStudent = await query(
    `SELECT s.*, c.name as class_name, c.subject
     FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE s.id = $1`,
    [id]
  );

  res.status(201).json({
    success: true,
    message: 'Student registered successfully',
    data: newStudent.rows[0],
  });
}

export async function getStudentById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const studentId = req.params.id;

  const isOwner = await verifyStudentOwnership(studentId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to access this student record' },
    });
    return;
  }

  const studentRes = await query(
    `SELECT s.*, c.name as class_name, c.subject, c.academic_year
     FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE s.id = $1`,
    [studentId]
  );

  if (studentRes.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Student not found' },
    });
    return;
  }

  const student = studentRes.rows[0];

  // Attendance history
  const attRes = await query(
    `SELECT id, date, status, remarks, created_at
     FROM attendance
     WHERE student_id = $1
     ORDER BY date DESC`,
    [studentId]
  );

  // Marks history
  const marksRes = await query(
    `SELECT id, subject, assessment_name, score, max_score, assessment_date, remarks,
            ROUND((score / max_score * 100)::numeric, 1) as percentage
     FROM marks
     WHERE student_id = $1
     ORDER BY assessment_date DESC`,
    [studentId]
  );

  // Assignments & submissions
  const assignRes = await query(
    `SELECT a.id, a.title, a.description, a.due_date, a.max_score,
            sub.id as submission_id, sub.status as submission_status, sub.score as submission_score, sub.submitted_at
     FROM assignments a
     LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = $1
     WHERE a.class_id = $2
     ORDER BY a.due_date DESC`,
    [studentId, student.class_id]
  );

  // AI analyses history
  const aiRes = await query(
    `SELECT id, overall_risk, risk_score, summary, strengths, concerns, priority_areas,
            recommended_actions, intervention_plan, teacher_message, created_at
     FROM ai_analyses
     WHERE student_id = $1 AND teacher_id = $2
     ORDER BY created_at DESC`,
    [studentId, teacherId]
  );

  // Interventions
  const intRes = await query(
    `SELECT *
     FROM interventions
     WHERE student_id = $1 AND teacher_id = $2
     ORDER BY created_at DESC`,
    [studentId, teacherId]
  );

  // Calculated metrics
  const calculatedMetrics = await calculateStudentMetrics(studentId, teacherId);

  res.json({
    success: true,
    data: {
      ...student,
      attendance: attRes.rows,
      marks: marksRes.rows,
      assignments: assignRes.rows,
      aiAnalyses: aiRes.rows,
      interventions: intRes.rows,
      metrics: calculatedMetrics,
    },
  });
}

export async function updateStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const studentId = req.params.id;

  const isOwner = await verifyStudentOwnership(studentId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to update this student' },
    });
    return;
  }

  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid student data',
      },
    });
    return;
  }

  const { classId, name, email, studentCode, dateOfBirth } = parsed.data;

  // Check if moving to another class that teacher also owns
  const ownsTargetClass = await verifyClassOwnership(classId, teacherId);
  if (!ownsTargetClass) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not own target class' },
    });
    return;
  }

  await query(
    `UPDATE students 
     SET class_id = $1, name = $2, email = $3, student_code = $4, date_of_birth = $5, updated_at = CURRENT_TIMESTAMP
     WHERE id = $6`,
    [classId, name.trim(), email || '', studentCode.trim(), dateOfBirth || '', studentId]
  );

  const updated = await query('SELECT * FROM students WHERE id = $1', [studentId]);

  res.json({
    success: true,
    message: 'Student record updated successfully',
    data: updated.rows[0],
  });
}

export async function deleteStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const studentId = req.params.id;

  const isOwner = await verifyStudentOwnership(studentId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this student' },
    });
    return;
  }

  await query('DELETE FROM students WHERE id = $1', [studentId]);

  res.json({
    success: true,
    message: 'Student record deleted successfully',
    data: null,
  });
}
