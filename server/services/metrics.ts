import { query } from '../db/index.ts';

export interface StudentDeterministicMetrics {
  student: {
    id: string;
    name: string;
    studentCode: string;
    className: string;
    subject: string;
  };
  attendance: {
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    percentage: number;
    recentPercentage: number;
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE' | 'INSUFFICIENT_DATA';
    recentRecords: Array<{ date: string; status: string; remarks?: string }>;
  };
  performance: {
    totalAssessments: number;
    averageScorePct: number;
    recentAverageScorePct: number;
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE' | 'INSUFFICIENT_DATA';
    changePoints: number;
    subjectBreakdown: Array<{ subject: string; averagePct: number; count: number }>;
    recentMarks: Array<{ assessmentName: string; score: number; maxScore: number; pct: number; date: string }>;
  };
  assignments: {
    totalAssignments: number;
    submittedCount: number;
    missingCount: number;
    lateCount: number;
    pendingCount: number;
    completionRatePct: number;
    recentAssignments: Array<{ title: string; dueDate: string; status: string; score?: number | null }>;
  };
}

export async function calculateStudentMetrics(studentId: string, teacherId: string): Promise<StudentDeterministicMetrics | null> {
  // 1. Get student and verify ownership
  const studentRes = await query(
    `SELECT s.id, s.name, s.student_code, c.name as class_name, c.subject
     FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE s.id = $1 AND c.teacher_id = $2`,
    [studentId, teacherId]
  );

  if (studentRes.rows.length === 0) {
    return null;
  }

  const studentRow = studentRes.rows[0];

  // 2. Get attendance records ordered by date DESC
  const attRes = await query(
    `SELECT date, status, remarks
     FROM attendance
     WHERE student_id = $1
     ORDER BY date DESC`,
    [studentId]
  );

  const attRecords = attRes.rows;
  const totalAtt = attRecords.length;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;

  attRecords.forEach((r) => {
    if (r.status === 'PRESENT') presentCount++;
    else if (r.status === 'ABSENT') absentCount++;
    else if (r.status === 'LATE') lateCount++;
    else if (r.status === 'EXCUSED') excusedCount++;
  });

  const effectivePresent = presentCount + lateCount * 0.5;
  const attPct = totalAtt > 0 ? Number(((effectivePresent / totalAtt) * 100).toFixed(1)) : 100;

  // Recent attendance (last 5 records)
  const recentAtt = attRecords.slice(0, 5);
  let recentPresentCount = 0;
  recentAtt.forEach((r) => {
    if (r.status === 'PRESENT') recentPresentCount += 1;
    else if (r.status === 'LATE') recentPresentCount += 0.5;
  });
  const recentAttPct = recentAtt.length > 0 ? Number(((recentPresentCount / recentAtt.length) * 100).toFixed(1)) : attPct;

  let attTrend: 'IMPROVING' | 'DECLINING' | 'STABLE' | 'INSUFFICIENT_DATA' = 'STABLE';
  if (totalAtt < 3) {
    attTrend = 'INSUFFICIENT_DATA';
  } else if (recentAttPct > attPct + 5) {
    attTrend = 'IMPROVING';
  } else if (recentAttPct < attPct - 5) {
    attTrend = 'DECLINING';
  }

  // 3. Get marks ordered by assessment_date DESC
  const marksRes = await query(
    `SELECT subject, assessment_name, score, max_score, assessment_date
     FROM marks
     WHERE student_id = $1
     ORDER BY assessment_date DESC`,
    [studentId]
  );

  const marksRecords = marksRes.rows.map((m) => {
    const scoreNum = Number(m.score);
    const maxNum = Number(m.max_score);
    const pct = maxNum > 0 ? Number(((scoreNum / maxNum) * 100).toFixed(1)) : 0;
    return {
      subject: m.subject,
      assessmentName: m.assessment_name,
      score: scoreNum,
      maxScore: maxNum,
      pct,
      date: m.assessment_date,
    };
  });

  const totalMarks = marksRecords.length;
  const avgScorePct =
    totalMarks > 0
      ? Number((marksRecords.reduce((acc, m) => acc + m.pct, 0) / totalMarks).toFixed(1))
      : 0;

  // Recent vs older marks trend
  const recentMarks = marksRecords.slice(0, 3);
  const olderMarks = marksRecords.slice(3);
  const recentAvgPct =
    recentMarks.length > 0
      ? Number((recentMarks.reduce((acc, m) => acc + m.pct, 0) / recentMarks.length).toFixed(1))
      : avgScorePct;
  const olderAvgPct =
    olderMarks.length > 0
      ? Number((olderMarks.reduce((acc, m) => acc + m.pct, 0) / olderMarks.length).toFixed(1))
      : avgScorePct;

  const changePoints = Number((recentAvgPct - olderAvgPct).toFixed(1));

  let marksTrend: 'IMPROVING' | 'DECLINING' | 'STABLE' | 'INSUFFICIENT_DATA' = 'STABLE';
  if (totalMarks < 2) {
    marksTrend = 'INSUFFICIENT_DATA';
  } else if (changePoints > 5) {
    marksTrend = 'IMPROVING';
  } else if (changePoints < -5) {
    marksTrend = 'DECLINING';
  }

  // Subject breakdown
  const subjectMap = new Map<string, { totalPct: number; count: number }>();
  marksRecords.forEach((m) => {
    const existing = subjectMap.get(m.subject) || { totalPct: 0, count: 0 };
    existing.totalPct += m.pct;
    existing.count += 1;
    subjectMap.set(m.subject, existing);
  });

  const subjectBreakdown = Array.from(subjectMap.entries()).map(([subj, data]) => ({
    subject: subj,
    averagePct: Number((data.totalPct / data.count).toFixed(1)),
    count: data.count,
  }));

  // 4. Get assignments and submissions
  const assignRes = await query(
    `SELECT a.id, a.title, a.due_date, a.max_score,
            sub.status, sub.score, sub.submitted_at
     FROM assignments a
     JOIN students s ON s.class_id = a.class_id
     LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
     WHERE s.id = $1
     ORDER BY a.due_date DESC`,
    [studentId]
  );

  const assignRows = assignRes.rows;
  const totalAssign = assignRows.length;
  let assignSubmittedCount = 0;
  let assignMissingCount = 0;
  let assignLateCount = 0;
  let assignPendingCount = 0;

  assignRows.forEach((r) => {
    const status = r.status || 'PENDING';
    if (status === 'SUBMITTED') assignSubmittedCount++;
    else if (status === 'MISSING') assignMissingCount++;
    else if (status === 'LATE') assignLateCount++;
    else assignPendingCount++;
  });

  const completionRatePct =
    totalAssign > 0
      ? Number((((assignSubmittedCount + assignLateCount) / totalAssign) * 100).toFixed(1))
      : 100;

  const recentAssignments = assignRows.slice(0, 5).map((r) => ({
    title: r.title,
    dueDate: r.due_date,
    status: r.status || 'PENDING',
    score: r.score != null ? Number(r.score) : null,
  }));

  return {
    student: {
      id: studentRow.id,
      name: studentRow.name,
      studentCode: studentRow.student_code,
      className: studentRow.class_name,
      subject: studentRow.subject,
    },
    attendance: {
      totalRecords: totalAtt,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      percentage: attPct,
      recentPercentage: recentAttPct,
      trend: attTrend,
      recentRecords: attRecords.slice(0, 5).map((r) => ({
        date: r.date,
        status: r.status,
        remarks: r.remarks || undefined,
      })),
    },
    performance: {
      totalAssessments: totalMarks,
      averageScorePct: avgScorePct,
      recentAverageScorePct: recentAvgPct,
      trend: marksTrend,
      changePoints,
      subjectBreakdown,
      recentMarks: marksRecords.slice(0, 5),
    },
    assignments: {
      totalAssignments: totalAssign,
      submittedCount: assignSubmittedCount,
      missingCount: assignMissingCount,
      lateCount: assignLateCount,
      pendingCount: assignPendingCount,
      completionRatePct,
      recentAssignments,
    },
  };
}
