import { createApp } from './server/app.ts';
import { initDb } from './server/db/index.ts';
import http from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

async function runTestSuite() {
  console.log('========================================================');
  console.log('🚀 ClassPulse AI - Comprehensive Integration Test Suite');
  console.log('========================================================\n');

  let baseUrl = 'http://127.0.0.1:3000/api';
  let server: http.Server | null = null;

  // Check if live dev server is already running on port 3000
  let isPort3000Running = false;
  try {
    const health = await fetch('http://127.0.0.1:3000/api/health');
    if (health.ok) {
      isPort3000Running = true;
      console.log('[Test Suite] Connected to active ClassPulse AI server at http://127.0.0.1:3000/api\n');
    }
  } catch (err) {
    isPort3000Running = false;
  }

  if (!isPort3000Running) {
    console.log('[Test Suite] Initializing standalone test instance...');
    await initDb();
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(3001, () => resolve()));
    baseUrl = 'http://127.0.0.1:3001/api';
    console.log('[Test Suite] Standalone test server running at http://127.0.0.1:3001/api\n');
  }

  const results: TestResult[] = [];

  const runTest = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`  ✓ [PASS] ${name}`);
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message });
      console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    }
  };

  let tokenA = '';
  let tokenB = '';
  let teacherAId = '';
  let teacherBId = '';
  let classAId = '';
  let classBId = '';
  let studentAId = '';
  let assignmentAId = '';
  let markAId = '';
  let interventionAId = '';

  const timestamp = Date.now();

  try {
    // 1. User Registration
    await runTest('1. User Registration (Teacher A)', async () => {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Professor Alpha',
          email: `alpha_${timestamp}@school.edu`,
          password: 'securepassword123',
        }),
      });
      const data = await res.json();
      if (res.status !== 201 || !data.success || !data.data.token) {
        throw new Error(`Registration failed with status ${res.status}: ${JSON.stringify(data)}`);
      }
      tokenA = data.data.token;
      teacherAId = data.data.user.id;
    });

    // 2. User Login & Password Hash Verification
    await runTest('2. User Login & bcrypt Password Verification', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `alpha_${timestamp}@school.edu`,
          password: 'securepassword123',
        }),
      });
      const data = await res.json();
      if (res.status !== 200 || !data.success || !data.data.token) {
        throw new Error(`Login failed with status ${res.status}: ${JSON.stringify(data)}`);
      }
      // Ensure password_hash is not returned
      if ((data.data.user as any).password_hash || (data.data.user as any).passwordHash) {
        throw new Error('Security violation: password hash leaked in user response!');
      }
    });

    // 3. Rejection of Invalid Credentials
    await runTest('3. Rejection of Invalid Credentials (401)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `alpha_${timestamp}@school.edu`,
          password: 'WRONG_PASSWORD',
        }),
      });
      if (res.status !== 401) {
        throw new Error(`Expected 401 Unauthorized but received ${res.status}`);
      }
    });

    // 4. Protected Route & Token Validation
    await runTest('4. Protected Route Authentication (GET /api/auth/me)', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const data = await res.json();
      if (res.status !== 200 || !data.success || data.data.user.id !== teacherAId) {
        throw new Error(`Expected authenticated profile matching ${teacherAId}`);
      }
    });

    // 5. Rejection of Missing/Invalid Token
    await runTest('5. Rejection of Missing Token (401)', async () => {
      const res = await fetch(`${baseUrl}/classes`);
      if (res.status !== 401) {
        throw new Error(`Expected 401 Unauthorized but received ${res.status}`);
      }
    });

    // 6. Multi-Tenant Teacher Data Isolation (Teacher A cannot access Teacher B's data)
    await runTest('6. Multi-Tenant Data Isolation (Teacher A cannot access Teacher B data)', async () => {
      // Register Teacher B
      const regB = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Professor Beta',
          email: `beta_${timestamp}@school.edu`,
          password: 'securepassword123',
        }),
      });
      const bData = await regB.json();
      tokenB = bData.data.token;
      teacherBId = bData.data.user.id;

      // Teacher B creates a private class
      const clsB = await fetch(`${baseUrl}/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          name: 'Secret Biology Section',
          subject: 'Biology',
          academicYear: '2025-2026',
          description: 'Class belonging exclusively to Teacher B',
        }),
      });
      const clsBData = await clsB.json();
      classBId = clsBData.data.id;

      // Teacher A attempts to access Teacher B's class
      const attempt = await fetch(`${baseUrl}/classes/${classBId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      if (attempt.status !== 403) {
        throw new Error(
          `Security failure: Teacher A accessed Teacher B class with status ${attempt.status} (expected 403 Forbidden)`
        );
      }
    });

    // 7. Classes CRUD
    await runTest('7. Classes CRUD Operations', async () => {
      // Create
      const createRes = await fetch(`${baseUrl}/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Grade 10 Algebra',
          subject: 'Mathematics',
          academicYear: '2025-2026',
          description: 'Algebra 1 curriculum',
        }),
      });
      const createData = await createRes.json();
      if (createRes.status !== 201 || !createData.data.id) {
        throw new Error(`Failed to create class: ${JSON.stringify(createData)}`);
      }
      classAId = createData.data.id;

      // Get
      const getRes = await fetch(`${baseUrl}/classes/${classAId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const getData = await getRes.json();
      if (getRes.status !== 200 || getData.data.name !== 'Grade 10 Algebra') {
        throw new Error('Failed to retrieve created class');
      }

      // Update
      const updateRes = await fetch(`${baseUrl}/classes/${classAId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Grade 10 Honors Algebra',
          subject: 'Mathematics',
          academicYear: '2025-2026',
          description: 'Advanced Honors syllabus',
        }),
      });
      const updateData = await updateRes.json();
      if (updateRes.status !== 200 || updateData.data.name !== 'Grade 10 Honors Algebra') {
        throw new Error('Failed to update class details');
      }
    });

    // 8. Students CRUD
    await runTest('8. Students CRUD Operations', async () => {
      // Create student in class A
      const createRes = await fetch(`${baseUrl}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          classId: classAId,
          name: 'Alex Mercer',
          email: 'alex.mercer@school.edu',
          studentCode: 'STU-9901',
          dateOfBirth: '2009-08-14',
        }),
      });
      const createData = await createRes.json();
      if (createRes.status !== 201 || !createData.data.id) {
        throw new Error(`Failed to enroll student: ${JSON.stringify(createData)}`);
      }
      studentAId = createData.data.id;

      // Read student profile
      const getRes = await fetch(`${baseUrl}/students/${studentAId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const getData = await getRes.json();
      if (getRes.status !== 200 || getData.data.student_code !== 'STU-9901') {
        throw new Error('Failed to retrieve enrolled student');
      }
    });

    // 9. Attendance CRUD (Bulk & Single)
    await runTest('9. Attendance CRUD (Single & Bulk Recording)', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Record single attendance
      const singleRes = await fetch(`${baseUrl}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          classId: classAId,
          studentId: studentAId,
          date: today,
          status: 'PRESENT',
          remarks: 'Prompt arrival',
        }),
      });
      if (singleRes.status !== 201) {
        throw new Error(`Failed single attendance recording: ${singleRes.status}`);
      }

      // Query attendance
      const queryRes = await fetch(`${baseUrl}/attendance?classId=${classAId}&date=${today}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const queryData = await queryRes.json();
      if (queryData.data.length === 0 || queryData.data[0].status !== 'PRESENT') {
        throw new Error('Failed to query logged attendance');
      }
    });

    // 10. Marks & Assessment CRUD
    await runTest('10. Marks & Assessment Scores CRUD', async () => {
      const today = new Date().toISOString().split('T')[0];
      const createRes = await fetch(`${baseUrl}/marks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          classId: classAId,
          studentId: studentAId,
          subject: 'Mathematics',
          assessmentName: 'Polynomial Quiz',
          score: 85,
          maxScore: 100,
          assessmentDate: today,
          remarks: 'Good algebraic notation',
        }),
      });
      const createData = await createRes.json();
      if (createRes.status !== 201 || !createData.data.id) {
        throw new Error(`Failed to record mark: ${JSON.stringify(createData)}`);
      }
      markAId = createData.data.id;
    });

    // 11. Assignments & Submissions Tracking
    await runTest('11. Assignments & Auto-Initialized Submissions', async () => {
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const createRes = await fetch(`${baseUrl}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          classId: classAId,
          title: 'Polynomial Factoring Worksheet',
          description: 'Solve questions 1-20',
          dueDate: nextWeek,
          maxScore: 50,
        }),
      });
      const createData = await createRes.json();
      if (createRes.status !== 201 || !createData.data.id) {
        throw new Error(`Failed to create assignment: ${JSON.stringify(createData)}`);
      }
      assignmentAId = createData.data.id;

      // Verify auto-created submission for enrolled student
      const subRes = await fetch(`${baseUrl}/assignments/${assignmentAId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const subData = await subRes.json();
      if (subData.data.submissions.length === 0 || subData.data.submissions[0].status !== 'PENDING') {
        throw new Error('Failed auto-initialized submission for student');
      }

      // Grade submission
      const submissionId = subData.data.submissions[0].id;
      const updateSub = await fetch(`${baseUrl}/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          status: 'SUBMITTED',
          score: 48,
          remarks: 'Exemplary work',
        }),
      });
      if (updateSub.status !== 200) {
        throw new Error('Failed to update submission status and score');
      }
    });

    // 12. Dashboard Analytics Queries
    await runTest('12. Dashboard Analytics (Overview, Trends, Risk)', async () => {
      const res = await fetch(`${baseUrl}/dashboard/overview`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const data = await res.json();
      if (res.status !== 200 || !data.success || data.data.metrics.totalStudents < 1) {
        throw new Error('Dashboard analytics overview query failed');
      }
    });

    // 13. AI Early Academic Support Engine & Zod Validation
    await runTest('13. AI Early Academic Support Engine & Structured Output', async () => {
      const res = await fetch(`${baseUrl}/ai/analyze-student/${studentAId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
      });
      const data = await res.json();
      if (res.status !== 201 || !data.success || !data.data.overallRisk) {
        throw new Error(`AI analysis generation failed: ${JSON.stringify(data)}`);
      }

      // Verify required structured fields
      const a = data.data;
      if (
        !['LOW', 'MEDIUM', 'HIGH'].includes(a.overallRisk) ||
        typeof a.riskScore !== 'number' ||
        !a.summary ||
        !Array.isArray(a.strengths) ||
        !Array.isArray(a.concerns) ||
        !Array.isArray(a.priorityAreas) ||
        !Array.isArray(a.recommendedActions) ||
        !Array.isArray(a.interventionPlan) ||
        !a.teacherMessage
      ) {
        throw new Error('AI output failed schema invariants validation!');
      }
    });

    // 14. AI Analysis Persistence in PostgreSQL
    await runTest('14. AI Analysis Persistence & Querying', async () => {
      const res = await fetch(`${baseUrl}/ai/analyses?studentId=${studentAId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const data = await res.json();
      if (res.status !== 200 || data.data.length === 0) {
        throw new Error('Persisted AI analysis record could not be retrieved from PostgreSQL');
      }
    });

    // 15. Actionable Interventions Lifecycle (PENDING ➔ IN_PROGRESS ➔ COMPLETED)
    await runTest('15. Actionable Interventions Lifecycle', async () => {
      // Create intervention
      const createRes = await fetch(`${baseUrl}/interventions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          studentId: studentAId,
          title: 'Targeted Review Session',
          description: 'Review quadratic equation concepts',
          priority: 'HIGH',
          status: 'PENDING',
        }),
      });
      const createData = await createRes.json();
      if (createRes.status !== 201 || !createData.data.id) {
        throw new Error('Failed to create intervention');
      }
      interventionAId = createData.data.id;

      // Update to IN_PROGRESS
      const progRes = await fetch(`${baseUrl}/interventions/${interventionAId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      const progData = await progRes.json();
      if (progData.data.status !== 'IN_PROGRESS') {
        throw new Error('Failed to advance intervention to IN_PROGRESS');
      }

      // Update to COMPLETED
      const compRes = await fetch(`${baseUrl}/interventions/${interventionAId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      const compData = await compRes.json();
      if (compData.data.status !== 'COMPLETED') {
        throw new Error('Failed to complete intervention');
      }
    });

    // 16. Search & Filter
    await runTest('16. Search and Filtering Functionality', async () => {
      const searchRes = await fetch(`${baseUrl}/students?search=Alex`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const searchData = await searchRes.json();
      if (searchData.data.length !== 1 || searchData.data[0].name !== 'Alex Mercer') {
        throw new Error('Search query failed to return expected student match');
      }
    });
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n========================================================');
  console.log('📊 Test Suite Results Summary:');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Passed: ${passedCount} / ${results.length}`);
  console.log('========================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
