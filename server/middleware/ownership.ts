import { query } from '../db/index.ts';

export async function verifyClassOwnership(classId: string, teacherId: string): Promise<boolean> {
  const result = await query(
    'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
    [classId, teacherId]
  );
  return result.rows.length > 0;
}

export async function verifyStudentOwnership(studentId: string, teacherId: string): Promise<boolean> {
  const result = await query(
    `SELECT s.id 
     FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE s.id = $1 AND c.teacher_id = $2`,
    [studentId, teacherId]
  );
  return result.rows.length > 0;
}

export async function verifyAssignmentOwnership(assignmentId: string, teacherId: string): Promise<boolean> {
  const result = await query(
    `SELECT a.id 
     FROM assignments a
     JOIN classes c ON a.class_id = c.id
     WHERE a.id = $1 AND c.teacher_id = $2`,
    [assignmentId, teacherId]
  );
  return result.rows.length > 0;
}

export async function verifyMarkOwnership(markId: string, teacherId: string): Promise<boolean> {
  const result = await query(
    `SELECT m.id 
     FROM marks m
     JOIN classes c ON m.class_id = c.id
     WHERE m.id = $1 AND c.teacher_id = $2`,
    [markId, teacherId]
  );
  return result.rows.length > 0;
}

export async function verifyAttendanceOwnership(attendanceId: string, teacherId: string): Promise<boolean> {
  const result = await query(
    `SELECT att.id 
     FROM attendance att
     JOIN classes c ON att.class_id = c.id
     WHERE att.id = $1 AND c.teacher_id = $2`,
    [attendanceId, teacherId]
  );
  return result.rows.length > 0;
}

export async function verifyInterventionOwnership(interventionId: string, teacherId: string): Promise<boolean> {
  const result = await query(
    'SELECT id FROM interventions WHERE id = $1 AND teacher_id = $2',
    [interventionId, teacherId]
  );
  return result.rows.length > 0;
}

export async function verifyAiAnalysisOwnership(analysisId: string, teacherId: string): Promise<boolean> {
  const result = await query(
    'SELECT id FROM ai_analyses WHERE id = $1 AND teacher_id = $2',
    [analysisId, teacherId]
  );
  return result.rows.length > 0;
}
