import { Response } from 'express';
import { query } from '../db/index.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export async function getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;

  // 1. Total Classes
  const classCountRes = await query(
    'SELECT COUNT(*) as count FROM classes WHERE teacher_id = $1',
    [teacherId]
  );
  const totalClasses = Number(classCountRes.rows[0].count);

  // 2. Total Students
  const studentCountRes = await query(
    `SELECT COUNT(s.id) as count 
     FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE c.teacher_id = $1`,
    [teacherId]
  );
  const totalStudents = Number(studentCountRes.rows[0].count);

  // 3. Overall Average Attendance
  const attRes = await query(
    `SELECT att.status
     FROM attendance att
     JOIN classes c ON att.class_id = c.id
     WHERE c.teacher_id = $1`,
    [teacherId]
  );
  const totalAttRecords = attRes.rows.length;
  let presentCount = 0;
  attRes.rows.forEach((r) => {
    if (r.status === 'PRESENT') presentCount += 1;
    else if (r.status === 'LATE') presentCount += 0.5;
  });
  const avgAttendance =
    totalAttRecords > 0 ? Number(((presentCount / totalAttRecords) * 100).toFixed(1)) : 100;

  // 4. Overall Average Performance
  const marksRes = await query(
    `SELECT m.score, m.max_score
     FROM marks m
     JOIN classes c ON m.class_id = c.id
     WHERE c.teacher_id = $1`,
    [teacherId]
  );
  let totalPct = 0;
  marksRes.rows.forEach((m) => {
    const sc = Number(m.score);
    const mx = Number(m.max_score);
    if (mx > 0) totalPct += (sc / mx) * 100;
  });
  const avgPerformance =
    marksRes.rows.length > 0
      ? Number((totalPct / marksRes.rows.length).toFixed(1))
      : 0;

  // 5. Pending Assignments / Missing Assignments
  const assignSubRes = await query(
    `SELECT sub.status
     FROM assignment_submissions sub
     JOIN assignments a ON sub.assignment_id = a.id
     JOIN classes c ON a.class_id = c.id
     WHERE c.teacher_id = $1`,
    [teacherId]
  );
  let pendingSubmissions = 0;
  let missingSubmissions = 0;
  let submittedCount = 0;
  let lateCount = 0;

  assignSubRes.rows.forEach((r) => {
    if (r.status === 'PENDING') pendingSubmissions++;
    else if (r.status === 'MISSING') missingSubmissions++;
    else if (r.status === 'SUBMITTED') submittedCount++;
    else if (r.status === 'LATE') lateCount++;
  });

  // 6. Students Requiring Support (HIGH or MEDIUM)
  const riskStudentsRes = await query(
    `SELECT s.id, s.name, s.student_code, c.name as class_name,
            (SELECT overall_risk FROM ai_analyses WHERE student_id = s.id ORDER BY created_at DESC LIMIT 1) as risk,
            (SELECT risk_score FROM ai_analyses WHERE student_id = s.id ORDER BY created_at DESC LIMIT 1) as score,
            (SELECT summary FROM ai_analyses WHERE student_id = s.id ORDER BY created_at DESC LIMIT 1) as summary
     FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE c.teacher_id = $1`,
    [teacherId]
  );

  let highSupportCount = 0;
  let mediumSupportCount = 0;
  let lowSupportCount = 0;
  let notAnalyzedCount = 0;

  const urgentStudents: any[] = [];

  riskStudentsRes.rows.forEach((s) => {
    if (s.risk === 'HIGH') {
      highSupportCount++;
      urgentStudents.push({
        id: s.id,
        name: s.name,
        studentCode: s.student_code,
        className: s.class_name,
        risk: 'HIGH',
        score: Number(s.score || 80),
        summary: s.summary,
      });
    } else if (s.risk === 'MEDIUM') {
      mediumSupportCount++;
      urgentStudents.push({
        id: s.id,
        name: s.name,
        studentCode: s.student_code,
        className: s.class_name,
        risk: 'MEDIUM',
        score: Number(s.score || 50),
        summary: s.summary,
      });
    } else if (s.risk === 'LOW') {
      lowSupportCount++;
    } else {
      notAnalyzedCount++;
    }
  });

  // Active Interventions Count
  const intRes = await query(
    `SELECT status, COUNT(*) as count 
     FROM interventions 
     WHERE teacher_id = $1 
     GROUP BY status`,
    [teacherId]
  );
  const interventionCounts: Record<string, number> = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  intRes.rows.forEach((r) => {
    interventionCounts[r.status] = Number(r.count);
  });

  res.json({
    success: true,
    data: {
      metrics: {
        totalClasses,
        totalStudents,
        avgAttendance,
        avgPerformance,
        pendingAssignments: pendingSubmissions,
        missingAssignments: missingSubmissions,
        studentsRequiringSupport: highSupportCount + mediumSupportCount,
        highSupportCount,
        mediumSupportCount,
        lowSupportCount,
        notAnalyzedCount,
      },
      assignmentStatus: {
        submitted: submittedCount,
        late: lateCount,
        pending: pendingSubmissions,
        missing: missingSubmissions,
      },
      interventions: interventionCounts,
      urgentStudents: urgentStudents.slice(0, 5),
    },
  });
}

export async function getAttendanceStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;

  // Aggregate attendance by date
  const result = await query(
    `SELECT att.date,
            COUNT(*) as total,
            COUNT(CASE WHEN att.status = 'PRESENT' THEN 1 END) as present,
            COUNT(CASE WHEN att.status = 'LATE' THEN 1 END) as late,
            COUNT(CASE WHEN att.status = 'ABSENT' THEN 1 END) as absent,
            COUNT(CASE WHEN att.status = 'EXCUSED' THEN 1 END) as excused
     FROM attendance att
     JOIN classes c ON att.class_id = c.id
     WHERE c.teacher_id = $1
     GROUP BY att.date
     ORDER BY att.date ASC
     LIMIT 30`,
    [teacherId]
  );

  const trend = result.rows.map((r) => {
    const tot = Number(r.total);
    const pres = Number(r.present) + Number(r.late) * 0.5;
    const rate = tot > 0 ? Number(((pres / tot) * 100).toFixed(1)) : 100;
    return {
      date: r.date,
      total: tot,
      present: Number(r.present),
      late: Number(r.late),
      absent: Number(r.absent),
      excused: Number(r.excused),
      rate,
    };
  });

  res.json({
    success: true,
    data: trend,
  });
}

export async function getPerformanceStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;

  // 1. Assessment average over time
  const timelineRes = await query(
    `SELECT m.assessment_date as date, m.assessment_name,
            ROUND(AVG(m.score / m.max_score * 100)::numeric, 1) as average_pct
     FROM marks m
     JOIN classes c ON m.class_id = c.id
     WHERE c.teacher_id = $1
     GROUP BY m.assessment_date, m.assessment_name
     ORDER BY m.assessment_date ASC
     LIMIT 20`,
    [teacherId]
  );

  // 2. Subject breakdown
  const subjectRes = await query(
    `SELECT m.subject,
            ROUND(AVG(m.score / m.max_score * 100)::numeric, 1) as average_pct,
            COUNT(*) as assessment_count
     FROM marks m
     JOIN classes c ON m.class_id = c.id
     WHERE c.teacher_id = $1
     GROUP BY m.subject
     ORDER BY average_pct DESC`,
    [teacherId]
  );

  res.json({
    success: true,
    data: {
      timeline: timelineRes.rows.map((r) => ({
        date: r.date,
        assessmentName: r.assessment_name,
        averagePct: Number(r.average_pct),
      })),
      subjectBreakdown: subjectRes.rows.map((r) => ({
        subject: r.subject,
        averagePct: Number(r.average_pct),
        count: Number(r.assessment_count),
      })),
    },
  });
}

export async function getRiskDistribution(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teacherId = req.user!.id;

  const result = await query(
    `SELECT 
        COALESCE((SELECT overall_risk FROM ai_analyses WHERE student_id = s.id ORDER BY created_at DESC LIMIT 1), 'NOT_ANALYZED') as risk_level,
        COUNT(*) as count
     FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE c.teacher_id = $1
     GROUP BY risk_level`,
    [teacherId]
  );

  const distribution: Record<string, number> = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    NOT_ANALYZED: 0,
  };

  result.rows.forEach((r) => {
    distribution[r.risk_level] = Number(r.count);
  });

  res.json({
    success: true,
    data: [
      { name: 'High Support', value: distribution.HIGH, key: 'HIGH' },
      { name: 'Medium Support', value: distribution.MEDIUM, key: 'MEDIUM' },
      { name: 'Low Support', value: distribution.LOW, key: 'LOW' },
      { name: 'Not Analyzed', value: distribution.NOT_ANALYZED, key: 'NOT_ANALYZED' },
    ],
  });
}
