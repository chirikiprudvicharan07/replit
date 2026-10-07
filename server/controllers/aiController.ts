import { Response } from 'express';
import { query } from '../db/index.ts';
import { generateId } from '../utils/id.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { verifyStudentOwnership, verifyAiAnalysisOwnership } from '../middleware/ownership.ts';
import { calculateStudentMetrics } from '../services/metrics.ts';
import { generateStudentAiSupport } from '../ai/gemini.ts';

export async function analyzeStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const studentId = req.params.studentId;

  const isOwner = await verifyStudentOwnership(studentId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to analyze this student record',
      },
    });
    return;
  }

  // 1. Calculate deterministic metrics
  const metrics = await calculateStudentMetrics(studentId, teacherId);
  if (!metrics) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Student data could not be retrieved' },
    });
    return;
  }

  // 2. Student class ID lookup
  const studentRow = await query('SELECT class_id FROM students WHERE id = $1', [studentId]);
  const classId = studentRow.rows[0].class_id;

  // 3. Generate structured AI support assessment
  const aiOutput = await generateStudentAiSupport(metrics);

  // 4. Persist analysis to PostgreSQL
  const analysisId = generateId();

  await query(
    `INSERT INTO ai_analyses (
      id, teacher_id, student_id, class_id,
      overall_risk, risk_score, summary,
      strengths, concerns, priority_areas,
      recommended_actions, intervention_plan,
      teacher_message, raw_structured_output,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8, $9, $10,
      $11, $12,
      $13, $14,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )`,
    [
      analysisId,
      teacherId,
      studentId,
      classId,
      aiOutput.overallRisk,
      aiOutput.riskScore,
      aiOutput.summary,
      JSON.stringify(aiOutput.strengths),
      JSON.stringify(aiOutput.concerns),
      JSON.stringify(aiOutput.priorityAreas),
      JSON.stringify(aiOutput.recommendedActions),
      JSON.stringify(aiOutput.interventionPlan),
      aiOutput.teacherMessage,
      JSON.stringify(aiOutput),
    ]
  );

  const savedRecord = await query(
    `SELECT a.*, s.name as student_name, s.student_code, c.name as class_name
     FROM ai_analyses a
     JOIN students s ON a.student_id = s.id
     JOIN classes c ON a.class_id = c.id
     WHERE a.id = $1`,
    [analysisId]
  );

  const row = savedRecord.rows[0];

  res.status(201).json({
    success: true,
    message: 'AI early academic support analysis completed and saved',
    data: {
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentCode: row.student_code,
      classId: row.class_id,
      className: row.class_name,
      overallRisk: row.overall_risk,
      riskScore: Number(row.risk_score),
      summary: row.summary,
      strengths: typeof row.strengths === 'string' ? JSON.parse(row.strengths) : row.strengths,
      concerns: typeof row.concerns === 'string' ? JSON.parse(row.concerns) : row.concerns,
      priorityAreas: typeof row.priority_areas === 'string' ? JSON.parse(row.priority_areas) : row.priority_areas,
      recommendedActions: typeof row.recommended_actions === 'string' ? JSON.parse(row.recommended_actions) : row.recommended_actions,
      interventionPlan: typeof row.intervention_plan === 'string' ? JSON.parse(row.intervention_plan) : row.intervention_plan,
      teacherMessage: row.teacher_message,
      createdAt: row.created_at,
      metrics,
    },
  });
}

export async function getAnalyses(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : null;
  const classId = typeof req.query.classId === 'string' ? req.query.classId : null;
  const risk = typeof req.query.risk === 'string' ? req.query.risk.toUpperCase() : null;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  let sql = `
    SELECT a.*, s.name as student_name, s.student_code, c.name as class_name, c.subject
    FROM ai_analyses a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON a.class_id = c.id
    WHERE a.teacher_id = $1
  `;
  const params: any[] = [teacherId];

  if (studentId) {
    params.push(studentId);
    sql += ` AND a.student_id = $${params.length}`;
  }
  if (classId) {
    params.push(classId);
    sql += ` AND a.class_id = $${params.length}`;
  }
  if (risk && risk !== 'ALL') {
    params.push(risk);
    sql += ` AND a.overall_risk = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (LOWER(s.name) LIKE $${params.length} OR LOWER(s.student_code) LIKE $${params.length} OR LOWER(c.name) LIKE $${params.length})`;
  }

  sql += ` ORDER BY a.created_at DESC`;

  const result = await query(sql, params);

  const analyses = result.rows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    studentCode: row.student_code,
    classId: row.class_id,
    className: row.class_name,
    subject: row.subject,
    overallRisk: row.overall_risk,
    riskScore: Number(row.risk_score),
    summary: row.summary,
    strengths: typeof row.strengths === 'string' ? JSON.parse(row.strengths) : row.strengths,
    concerns: typeof row.concerns === 'string' ? JSON.parse(row.concerns) : row.concerns,
    priorityAreas: typeof row.priority_areas === 'string' ? JSON.parse(row.priority_areas) : row.priority_areas,
    recommendedActions: typeof row.recommended_actions === 'string' ? JSON.parse(row.recommended_actions) : row.recommended_actions,
    interventionPlan: typeof row.intervention_plan === 'string' ? JSON.parse(row.intervention_plan) : row.intervention_plan,
    teacherMessage: row.teacher_message,
    createdAt: row.created_at,
  }));

  res.json({
    success: true,
    data: analyses,
  });
}

export async function getAnalysisById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const analysisId = req.params.id;

  const isOwner = await verifyAiAnalysisOwnership(analysisId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to view this analysis' },
    });
    return;
  }

  const result = await query(
    `SELECT a.*, s.name as student_name, s.student_code, c.name as class_name, c.subject
     FROM ai_analyses a
     JOIN students s ON a.student_id = s.id
     JOIN classes c ON a.class_id = c.id
     WHERE a.id = $1`,
    [analysisId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Analysis record not found' },
    });
    return;
  }

  const row = result.rows[0];

  res.json({
    success: true,
    data: {
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentCode: row.student_code,
      classId: row.class_id,
      className: row.class_name,
      subject: row.subject,
      overallRisk: row.overall_risk,
      riskScore: Number(row.risk_score),
      summary: row.summary,
      strengths: typeof row.strengths === 'string' ? JSON.parse(row.strengths) : row.strengths,
      concerns: typeof row.concerns === 'string' ? JSON.parse(row.concerns) : row.concerns,
      priorityAreas: typeof row.priority_areas === 'string' ? JSON.parse(row.priority_areas) : row.priority_areas,
      recommendedActions: typeof row.recommended_actions === 'string' ? JSON.parse(row.recommended_actions) : row.recommended_actions,
      interventionPlan: typeof row.intervention_plan === 'string' ? JSON.parse(row.intervention_plan) : row.intervention_plan,
      teacherMessage: row.teacher_message,
      createdAt: row.created_at,
    },
  });
}
