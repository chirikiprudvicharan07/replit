import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initDb, query } from './db/index.ts';
import { generateId } from './utils/id.ts';

export async function runSeed(): Promise<void> {
  console.log('[Seed] Starting database seed...');

  // Clear existing demo data
  console.log('[Seed] Clearing existing demo records...');
  await query('DELETE FROM users WHERE email = $1', ['teacher@classpulse.edu']);

  // 1. Create Teacher
  const teacherId = generateId();
  const passwordHash = await bcrypt.hash('password123', 10);

  await query(
    `INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'TEACHER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [teacherId, 'Dr. Sarah Mitchell', 'teacher@classpulse.edu', passwordHash]
  );
  console.log('[Seed] Created Teacher: Dr. Sarah Mitchell (teacher@classpulse.edu)');

  // 2. Create Classes
  const class1Id = generateId();
  const class2Id = generateId();

  await query(
    `INSERT INTO classes (id, teacher_id, name, subject, academic_year, description, created_at, updated_at)
     VALUES 
     ($1, $2, 'Grade 10 - Section A', 'Mathematics & Algebra', '2025-2026', 'Foundations of algebra, quadratic relations, and geometry.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
     ($3, $2, 'Grade 11 - Advanced', 'Physics & Mechanics', '2025-2026', 'Classical mechanics, kinematics, and laboratory analysis.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [class1Id, teacherId, class2Id]
  );
  console.log('[Seed] Created 2 classes.');

  // 3. Create Students with deliberate, realistic educational profiles:
  // Profile 1: High Academic Support Needed (e.g., Leo Vance, Marcus Brody, Chloe Bennett)
  // Profile 2: Medium Academic Support Needed (e.g., Maya Lin, Jordan Rivera, Samira Khan)
  // Profile 3: Low Support / High Performing (e.g., Elena Rostova, David Kim, Lucas Silva, Sophia Martinez...)
  const studentData = [
    // Class 1 (Math)
    {
      name: 'Marcus Brody',
      code: 'STU-1001',
      email: 'marcus.brody@school.edu',
      classId: class1Id,
      profile: 'HIGH_SUPPORT',
    },
    {
      name: 'Chloe Bennett',
      code: 'STU-1002',
      email: 'chloe.bennett@school.edu',
      classId: class1Id,
      profile: 'HIGH_SUPPORT',
    },
    {
      name: 'Maya Lin',
      code: 'STU-1003',
      email: 'maya.lin@school.edu',
      classId: class1Id,
      profile: 'MEDIUM_SUPPORT',
    },
    {
      name: 'Jordan Rivera',
      code: 'STU-1004',
      email: 'jordan.rivera@school.edu',
      classId: class1Id,
      profile: 'MEDIUM_SUPPORT',
    },
    {
      name: 'Elena Rostova',
      code: 'STU-1005',
      email: 'elena.rostova@school.edu',
      classId: class1Id,
      profile: 'LOW_SUPPORT',
    },
    {
      name: 'David Kim',
      code: 'STU-1006',
      email: 'david.kim@school.edu',
      classId: class1Id,
      profile: 'LOW_SUPPORT',
    },
    {
      name: 'Sophia Martinez',
      code: 'STU-1007',
      email: 'sophia.m@school.edu',
      classId: class1Id,
      profile: 'LOW_SUPPORT',
    },
    {
      name: 'Aiden Patel',
      code: 'STU-1008',
      email: 'aiden.patel@school.edu',
      classId: class1Id,
      profile: 'LOW_SUPPORT',
    },
    {
      name: 'Hannah Abbott',
      code: 'STU-1009',
      email: 'hannah.a@school.edu',
      classId: class1Id,
      profile: 'MEDIUM_SUPPORT',
    },
    {
      name: 'Oliver Queen',
      code: 'STU-1010',
      email: 'oliver.q@school.edu',
      classId: class1Id,
      profile: 'LOW_SUPPORT',
    },

    // Class 2 (Physics)
    {
      name: 'Leo Vance',
      code: 'STU-2001',
      email: 'leo.vance@school.edu',
      classId: class2Id,
      profile: 'HIGH_SUPPORT',
    },
    {
      name: 'Samira Khan',
      code: 'STU-2002',
      email: 'samira.khan@school.edu',
      classId: class2Id,
      profile: 'MEDIUM_SUPPORT',
    },
    {
      name: 'Lucas Silva',
      code: 'STU-2003',
      email: 'lucas.silva@school.edu',
      classId: class2Id,
      profile: 'LOW_SUPPORT',
    },
    {
      name: 'Emily Watson',
      code: 'STU-2004',
      email: 'emily.w@school.edu',
      classId: class2Id,
      profile: 'LOW_SUPPORT',
    },
    {
      name: 'Nathan Drake',
      code: 'STU-2005',
      email: 'nathan.d@school.edu',
      classId: class2Id,
      profile: 'MEDIUM_SUPPORT',
    },
    {
      name: 'Zara Washington',
      code: 'STU-2006',
      email: 'zara.w@school.edu',
      classId: class2Id,
      profile: 'LOW_SUPPORT',
    },
    {
      name: 'Liam Chen',
      code: 'STU-2007',
      email: 'liam.chen@school.edu',
      classId: class2Id,
      profile: 'LOW_SUPPORT',
    },
    {
      name: 'Isabella Gomez',
      code: 'STU-2008',
      email: 'isabella.g@school.edu',
      classId: class2Id,
      profile: 'LOW_SUPPORT',
    },
  ];

  const studentMap: Array<{ id: string; name: string; profile: string; classId: string }> = [];

  for (const s of studentData) {
    const sId = generateId();
    await query(
      `INSERT INTO students (id, class_id, name, email, student_code, date_of_birth, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, '2009-04-12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [sId, s.classId, s.name, s.email, s.code]
    );
    studentMap.push({ id: sId, name: s.name, profile: s.profile, classId: s.classId });
  }
  console.log(`[Seed] Created ${studentMap.length} students.`);

  // 4. Create Assignments for each class
  const class1Assignments = [
    { title: 'Algebra Problem Set 1: Quadratics', dueDate: '2026-09-15', maxScore: 50 },
    { title: 'Polynomial Functions Quiz Prep', dueDate: '2026-09-22', maxScore: 100 },
    { title: 'Midterm Math Review Sheet', dueDate: '2026-09-29', maxScore: 50 },
    { title: 'Trigonometry Word Problems', dueDate: '2026-10-04', maxScore: 100 },
  ];

  const class2Assignments = [
    { title: 'Kinematics Lab Report 1', dueDate: '2026-09-14', maxScore: 100 },
    { title: "Newton's Laws Calculation Set", dueDate: '2026-09-21', maxScore: 50 },
    { title: 'Friction and Vector Analysis', dueDate: '2026-09-28', maxScore: 100 },
    { title: 'Rotational Motion Experiment', dueDate: '2026-10-05', maxScore: 50 },
  ];

  const allAssignments: Array<{ id: string; classId: string; title: string }> = [];

  for (const a of class1Assignments) {
    const aId = generateId();
    await query(
      `INSERT INTO assignments (id, class_id, title, description, due_date, max_score, created_at, updated_at)
       VALUES ($1, $2, $3, 'Mandatory graded coursework', $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [aId, class1Id, a.title, a.dueDate, a.maxScore]
    );
    allAssignments.push({ id: aId, classId: class1Id, title: a.title });
  }

  for (const a of class2Assignments) {
    const aId = generateId();
    await query(
      `INSERT INTO assignments (id, class_id, title, description, due_date, max_score, created_at, updated_at)
       VALUES ($1, $2, $3, 'Mandatory laboratory report', $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [aId, class2Id, a.title, a.dueDate, a.maxScore]
    );
    allAssignments.push({ id: aId, classId: class2Id, title: a.title });
  }
  console.log(`[Seed] Created ${allAssignments.length} assignments.`);

  // 5. Seed Attendance across recent 14 school days
  const attendanceDates = [
    '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19',
    '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26',
    '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'
  ];

  for (const stu of studentMap) {
    for (let i = 0; i < attendanceDates.length; i++) {
      const date = attendanceDates[i];
      let status = 'PRESENT';
      let remarks = '';

      if (stu.profile === 'HIGH_SUPPORT') {
        // Attendance ~ 55% - 65%
        if (i % 3 === 0) {
          status = 'ABSENT';
          remarks = 'Unexcused morning absence';
        } else if (i % 4 === 0) {
          status = 'LATE';
          remarks = 'Arrived 20 mins late';
        }
      } else if (stu.profile === 'MEDIUM_SUPPORT') {
        // Attendance ~ 80%
        if (i === 4 || i === 9) {
          status = 'ABSENT';
          remarks = 'Parent notified illness';
        } else if (i === 7) {
          status = 'LATE';
          remarks = 'Traffic delay';
        }
      } else {
        // LOW_SUPPORT (~95%+)
        if (i === 8 && stu.name.startsWith('D')) {
          status = 'EXCUSED';
          remarks = 'School competition';
        }
      }

      const attId = generateId();
      await query(
        `INSERT INTO attendance (id, student_id, class_id, date, status, remarks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [attId, stu.id, stu.classId, date, status, remarks]
      );
    }
  }
  console.log('[Seed] Created attendance records.');

  // 6. Seed Marks for assessments
  const assessmentsMath = [
    { name: 'Quiz 1: Expressions', date: '2026-09-17', max: 50 },
    { name: 'Unit Test: Quadratic Equations', date: '2026-09-25', max: 100 },
    { name: 'Midterm Assessment', date: '2026-10-01', max: 100 },
  ];

  const assessmentsPhysics = [
    { name: 'Quiz 1: 1D Kinematics', date: '2026-09-18', max: 50 },
    { name: 'Lab Practical: Forces & Incline', date: '2026-09-24', max: 100 },
    { name: 'Midterm Mechanics Exam', date: '2026-10-02', max: 100 },
  ];

  for (const stu of studentMap) {
    const list = stu.classId === class1Id ? assessmentsMath : assessmentsPhysics;
    const subj = stu.classId === class1Id ? 'Mathematics' : 'Physics';

    for (const asm of list) {
      let scorePct = 85;
      if (stu.profile === 'HIGH_SUPPORT') {
        // Scores in 40-52% range
        scorePct = 42 + Math.floor(Math.random() * 12);
      } else if (stu.profile === 'MEDIUM_SUPPORT') {
        // Scores in 60-70% range
        scorePct = 62 + Math.floor(Math.random() * 10);
      } else {
        // Scores in 86-98% range
        scorePct = 86 + Math.floor(Math.random() * 12);
      }

      const score = Number(((scorePct / 100) * asm.max).toFixed(1));
      const markId = generateId();

      await query(
        `INSERT INTO marks (id, student_id, class_id, subject, assessment_name, score, max_score, assessment_date, remarks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [markId, stu.id, stu.classId, subj, asm.name, score, asm.max, asm.date]
      );
    }
  }
  console.log('[Seed] Created marks records.');

  // 7. Seed Submissions for assignments
  for (const assign of allAssignments) {
    const studentsInClass = studentMap.filter((s) => s.classId === assign.classId);

    for (const stu of studentsInClass) {
      let status = 'SUBMITTED';
      let score: number | null = 45;

      if (stu.profile === 'HIGH_SUPPORT') {
        // High risk students have missing or late submissions
        if (assign.title.includes('Review') || assign.title.includes('Experiment')) {
          status = 'MISSING';
          score = null;
        } else {
          status = 'LATE';
          score = 22;
        }
      } else if (stu.profile === 'MEDIUM_SUPPORT') {
        if (assign.title.includes('Word Problems')) {
          status = 'MISSING';
          score = null;
        } else {
          status = 'SUBMITTED';
          score = 36;
        }
      } else {
        status = 'SUBMITTED';
        score = 48;
      }

      const subId = generateId();
      await query(
        `INSERT INTO assignment_submissions (id, assignment_id, student_id, status, score, submitted_at, remarks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, ${status === 'SUBMITTED' || status === 'LATE' ? 'CURRENT_TIMESTAMP' : 'NULL'}, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [subId, assign.id, stu.id, status, score]
      );
    }
  }
  console.log('[Seed] Created assignment submissions.');

  // 8. Seed Sample AI Analysis & Intervention for high-support student (Marcus Brody)
  const marcus = studentMap.find((s) => s.name === 'Marcus Brody')!;
  const aiAnalysisId = generateId();

  const marcusAnalysis = {
    overallRisk: 'HIGH',
    riskScore: 78,
    summary:
      'Marcus demonstrates critical academic support indicators characterized by 57.1% attendance rate, 46.5% average assessment score in Mathematics, and 2 missing coursework assignments.',
    strengths: [
      'Attends foundational introductory lessons when present in morning sessions',
      'Demonstrated partial understanding during early Expressions formative assessment',
    ],
    concerns: [
      'Frequent unexcused absences (6 out of 14 sessions missed)',
      'Substantial performance gap on Quadratic Equations unit test (44%)',
      'Missing required homework assignments leading to cumulative learning deficits',
    ],
    priorityAreas: [
      'Attendance regularity and morning arrival support',
      'Algebraic factoring and quadratic formula remediation',
      'Coursework completion timeline and accountability checkpoints',
    ],
    recommendedActions: [
      {
        title: 'One-on-One Diagnostic Conference',
        description: 'Conduct a dedicated 15-minute conference to review missed quadratic equation concepts and diagnose root blockers.',
        priority: 'HIGH',
      },
      {
        title: 'Homework Remediation Contract',
        description: 'Establish a structured 1-week catch-up schedule for the two missing problem sets with partial credit option.',
        priority: 'HIGH',
      },
      {
        title: 'Caregiver Outreach & Attendance Check',
        description: 'Coordinate with student counselor or family regarding unexcused morning absences.',
        priority: 'MEDIUM',
      },
    ],
    interventionPlan: [
      {
        timeframe: 'Week 1',
        objective: 'Diagnostic Check-in & Missing Work Audit',
        actions: [
          'Review Quadratic Unit Test error log',
          'Provide guided step-by-step factoring reference sheet',
        ],
      },
      {
        timeframe: 'Weeks 2-3',
        objective: 'Guided Practice & Attendance Monitoring',
        actions: [
          'Pair with peer study partner for homework checkpoints',
          'Track daily morning arrival promptness',
        ],
      },
      {
        timeframe: 'Week 4',
        objective: 'Post-Remediation Formative Re-check',
        actions: [
          'Administer 10-minute re-assessment on quadratic equations',
          'Celebrate turnaround milestones and evaluate ongoing support need',
        ],
      },
    ],
    teacherMessage:
      'Marcus, I want to partner with you to help you get completely back on track in Math. Quadratic equations can feel overwhelming at first, but with a bit of targeted practice, you will master it. Let us connect tomorrow after 4th period to map out a clear game plan together.',
  };

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
      aiAnalysisId,
      teacherId,
      marcus.id,
      marcus.classId,
      marcusAnalysis.overallRisk,
      marcusAnalysis.riskScore,
      marcusAnalysis.summary,
      JSON.stringify(marcusAnalysis.strengths),
      JSON.stringify(marcusAnalysis.concerns),
      JSON.stringify(marcusAnalysis.priorityAreas),
      JSON.stringify(marcusAnalysis.recommendedActions),
      JSON.stringify(marcusAnalysis.interventionPlan),
      marcusAnalysis.teacherMessage,
      JSON.stringify(marcusAnalysis),
    ]
  );

  // Intervention for Marcus
  const interventionId = generateId();
  await query(
    `INSERT INTO interventions (id, teacher_id, student_id, ai_analysis_id, title, description, priority, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'HIGH', 'IN_PROGRESS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      interventionId,
      teacherId,
      marcus.id,
      aiAnalysisId,
      'Quadratic Equations Recovery Plan',
      'Weekly 15-minute diagnostic conference and structured homework catch-up plan for 2 missing assignments.',
    ]
  );

  console.log('[Seed] Database seed completed successfully!');
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDb()
    .then(() => runSeed())
    .then(() => {
      console.log('[Seed] Finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}
