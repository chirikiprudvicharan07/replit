import { Response } from 'express';
import { query } from '../db/index.ts';
import { generateId } from '../utils/id.ts';
import { attendanceRecordSchema, bulkAttendanceSchema } from '../schemas/index.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { verifyClassOwnership, verifyAttendanceOwnership, verifyStudentClassOwnership } from '../middleware/ownership.ts';

export async function getAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const classId = typeof req.query.classId === 'string' ? req.query.classId : null;
  const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : null;
  const date = typeof req.query.date === 'string' ? req.query.date : null;
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : null;
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : null;

  let sql = `
    SELECT att.*, s.name as student_name, s.student_code, c.name as class_name
    FROM attendance att
    JOIN students s ON att.student_id = s.id
    JOIN classes c ON att.class_id = c.id
    WHERE c.teacher_id = $1
  `;
  const params: any[] = [teacherId];

  if (classId) {
    params.push(classId);
    sql += ` AND att.class_id = $${params.length}`;
  }
  if (studentId) {
    params.push(studentId);
    sql += ` AND att.student_id = $${params.length}`;
  }
  if (date) {
    params.push(date);
    sql += ` AND att.date = $${params.length}`;
  }
  if (startDate) {
    params.push(startDate);
    sql += ` AND att.date >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    sql += ` AND att.date <= $${params.length}`;
  }

  sql += ` ORDER BY att.date DESC, s.name ASC`;

  const result = await query(sql, params);

  res.json({
    success: true,
    data: result.rows,
  });
}

export async function recordAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;

  // Check if bulk or single
  if (Array.isArray(req.body.records)) {
    const parsedBulk = bulkAttendanceSchema.safeParse(req.body);
    if (!parsedBulk.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsedBulk.error.issues[0]?.message || 'Invalid bulk attendance data',
        },
      });
      return;
    }

    const { classId, date, records } = parsedBulk.data;
    const isOwner = await verifyClassOwnership(classId, teacherId);
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this class' },
      });
      return;
    }
    for (const rec of records) {
      if (!(await verifyStudentClassOwnership(rec.studentId, classId, teacherId))) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'One or more students do not belong to this class' },
        });
        return;
      }
    }

    // Process each record with UPSERT
    for (const rec of records) {
      const existing = await query(
        'SELECT id FROM attendance WHERE student_id = $1 AND date = $2',
        [rec.studentId, date]
      );

      if (existing.rows.length > 0) {
        await query(
          `UPDATE attendance 
           SET status = $1, remarks = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [rec.status, rec.remarks || '', existing.rows[0].id]
        );
      } else {
        const id = generateId();
        await query(
          `INSERT INTO attendance (id, student_id, class_id, date, status, remarks, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [id, rec.studentId, classId, date, rec.status, rec.remarks || '']
        );
      }
    }

    res.json({
      success: true,
      message: `Recorded attendance for ${records.length} students on ${date}`,
      data: { count: records.length, date, classId },
    });
    return;
  }

  // Single attendance record
  const parsed = attendanceRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid attendance data',
      },
    });
    return;
  }

  const { studentId, classId, date, status, remarks } = parsed.data;
  const isOwner = await verifyClassOwnership(classId, teacherId);
  const ownsStudentInClass = await verifyStudentClassOwnership(studentId, classId, teacherId);
  if (!isOwner || !ownsStudentInClass) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have access to this class' },
    });
    return;
  }

  const existing = await query(
    'SELECT id FROM attendance WHERE student_id = $1 AND date = $2',
    [studentId, date]
  );

  let id: string;
  if (existing.rows.length > 0) {
    id = existing.rows[0].id;
    await query(
      `UPDATE attendance 
       SET status = $1, remarks = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [status, remarks || '', id]
    );
  } else {
    id = generateId();
    await query(
      `INSERT INTO attendance (id, student_id, class_id, date, status, remarks, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, studentId, classId, date, status, remarks || '']
    );
  }

  const record = await query('SELECT * FROM attendance WHERE id = $1', [id]);

  res.status(201).json({
    success: true,
    message: 'Attendance recorded successfully',
    data: record.rows[0],
  });
}

export async function updateAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const attendanceId = req.params.id;

  const isOwner = await verifyAttendanceOwnership(attendanceId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to update this attendance entry' },
    });
    return;
  }

  const { status, remarks } = req.body;
  if (!status || !['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(status)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid status provided' },
    });
    return;
  }

  await query(
    `UPDATE attendance 
     SET status = $1, remarks = COALESCE($2, remarks), updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [status, remarks, attendanceId]
  );

  const updated = await query('SELECT * FROM attendance WHERE id = $1', [attendanceId]);

  res.json({
    success: true,
    message: 'Attendance updated successfully',
    data: updated.rows[0],
  });
}

export async function deleteAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;
  const attendanceId = req.params.id;

  const isOwner = await verifyAttendanceOwnership(attendanceId, teacherId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this attendance record' },
    });
    return;
  }

  await query('DELETE FROM attendance WHERE id = $1', [attendanceId]);

  res.json({
    success: true,
    message: 'Attendance record deleted successfully',
    data: null,
  });
}