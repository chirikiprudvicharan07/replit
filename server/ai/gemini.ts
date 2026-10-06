import { GoogleGenAI, Type } from '@google/genai';
import { geminiSupportOutputSchema, GeminiSupportOutput } from '../schemas/index.ts';
import { StudentDeterministicMetrics } from '../services/metrics.ts';

const SYSTEM_INSTRUCTION = `You are an educational performance analysis assistant for ClassPulse AI.
Analyze only the academic data provided (attendance, marks, assignments, and calculated deterministic trends).
Do not diagnose medical, psychological, learning, or clinical conditions.
Always use the language "academic support indicator" instead of "diagnosis".
Identify observable academic performance patterns.
Provide practical, empathetic, and actionable support recommendations for a teacher.
Do not fabricate information.
If insufficient information is available, clearly state that the data is insufficient.
Ensure riskScore is a number from 0 to 100 where 0 means minimal concern and 100 means urgent support needed.
Return only valid structured JSON conforming to the requested schema.`;

export async function generateStudentAiSupport(
  metrics: StudentDeterministicMetrics
): Promise<GeminiSupportOutput> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.warn('[Gemini AI] GEMINI_API_KEY is not set. Generating deterministic rule-based support analysis.');
    return generateRuleBasedAnalysis(metrics);
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `Please analyze the academic performance metrics for student ${metrics.student.name} (Code: ${metrics.student.studentCode}, Class: ${metrics.student.className}, Subject: ${metrics.student.subject}):

Deterministic Metrics Summary:
1. Attendance:
   - Overall Attendance: ${metrics.attendance.percentage}% (${metrics.attendance.presentCount} present, ${metrics.attendance.absentCount} absent, ${metrics.attendance.lateCount} late)
   - Recent Attendance (Last 5 records): ${metrics.attendance.recentPercentage}%
   - Attendance Trend: ${metrics.attendance.trend}
   - Recent History: ${JSON.stringify(metrics.attendance.recentRecords)}

2. Academic Marks & Assessments:
   - Average Score: ${metrics.performance.averageScorePct}% across ${metrics.performance.totalAssessments} assessment(s)
   - Recent Average: ${metrics.performance.recentAverageScorePct}%
   - Marks Trend: ${metrics.performance.trend} (${metrics.performance.changePoints > 0 ? '+' : ''}${metrics.performance.changePoints} percentage point change)
   - Subject Breakdown: ${JSON.stringify(metrics.performance.subjectBreakdown)}
   - Recent Marks: ${JSON.stringify(metrics.performance.recentMarks)}

3. Assignments & Coursework:
   - Completion Rate: ${metrics.assignments.completionRatePct}%
   - Total Assigned: ${metrics.assignments.totalAssignments}
   - Missing: ${metrics.assignments.missingCount}, Late: ${metrics.assignments.lateCount}, Submitted: ${metrics.assignments.submittedCount}, Pending: ${metrics.assignments.pendingCount}
   - Recent Assignments: ${JSON.stringify(metrics.assignments.recentAssignments)}

Provide an early support analysis with:
- overallRisk (LOW, MEDIUM, or HIGH)
- riskScore (0 to 100)
- summary (2-3 sentences explaining observable patterns)
- strengths (array of positive observations)
- concerns (array of risk indicators)
- priorityAreas (e.g. attendance stability, formative assessment, homework habits)
- recommendedActions (concrete actions for the teacher with priority)
- interventionPlan (staged 2-4 week plan with objectives and actions)
- teacherMessage (a supportive, encouraging message the teacher can adapt when speaking with the student or parent)`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallRisk: {
              type: Type.STRING,
              description: 'Risk level: LOW, MEDIUM, or HIGH',
            },
            riskScore: {
              type: Type.NUMBER,
              description: 'Academic risk score from 0 to 100',
            },
            summary: {
              type: Type.STRING,
              description: 'Executive summary of student academic support indicators',
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Observed academic strengths',
            },
            concerns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Observed academic concerns and warning signs',
            },
            priorityAreas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key academic focus areas',
            },
            recommendedActions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING },
                },
                required: ['title', 'description', 'priority'],
              },
            },
            interventionPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeframe: { type: Type.STRING },
                  objective: { type: Type.STRING },
                  actions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['timeframe', 'objective', 'actions'],
              },
            },
            teacherMessage: {
              type: Type.STRING,
              description: 'Sample constructive communication for the student or caregiver',
            },
          },
          required: [
            'overallRisk',
            'riskScore',
            'summary',
            'strengths',
            'concerns',
            'priorityAreas',
            'recommendedActions',
            'interventionPlan',
            'teacherMessage',
          ],
        },
      },
    });

    const rawJsonText = response.text?.trim() || '{}';
    const parsedJson = JSON.parse(rawJsonText);

    // Zod validation
    const validatedOutput = geminiSupportOutputSchema.parse(parsedJson);
    return validatedOutput;
  } catch (error: any) {
    console.error('[Gemini AI] Analysis generation error:', error?.message || error);
    // If Gemini API fails (e.g. rate limit or network issue), fall back to deterministic rule engine
    console.warn('[Gemini AI] Falling back to deterministic rule-based analysis.');
    return generateRuleBasedAnalysis(metrics);
  }
}

/**
 * Deterministic rule-based analysis fallback when AI key is unavailable or during network outage.
 * Ensures the platform is robust, never breaks, and meets educational safety standards.
 */
function generateRuleBasedAnalysis(metrics: StudentDeterministicMetrics): GeminiSupportOutput {
  const attPct = metrics.attendance.percentage;
  const marksPct = metrics.performance.averageScorePct;
  const completionPct = metrics.assignments.completionRatePct;

  // Calculate composite risk score (0-100)
  // Higher = more risk
  let riskScore = 0;

  // Attendance component (up to 40 pts)
  if (attPct < 70) riskScore += 40;
  else if (attPct < 85) riskScore += 25;
  else if (attPct < 90) riskScore += 10;

  // Marks component (up to 40 pts)
  if (marksPct < 50) riskScore += 40;
  else if (marksPct < 65) riskScore += 25;
  else if (marksPct < 75) riskScore += 10;

  // Assignments component (up to 20 pts)
  if (completionPct < 60) riskScore += 20;
  else if (completionPct < 80) riskScore += 10;
  else if (metrics.assignments.missingCount > 1) riskScore += 5;

  // Recent trends adjustment
  if (metrics.attendance.trend === 'DECLINING') riskScore += 5;
  if (metrics.performance.trend === 'DECLINING') riskScore += 5;
  if (metrics.performance.trend === 'IMPROVING') riskScore = Math.max(0, riskScore - 8);

  riskScore = Math.min(100, Math.max(0, Math.round(riskScore)));

  let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (riskScore >= 60) overallRisk = 'HIGH';
  else if (riskScore >= 30) overallRisk = 'MEDIUM';

  const strengths: string[] = [];
  const concerns: string[] = [];
  const priorityAreas: string[] = [];

  if (attPct >= 90) strengths.push(`Consistent attendance record (${attPct}%) demonstrating dependable classroom presence.`);
  else concerns.push(`Attendance rate is at ${attPct}%, leading to missed instructional units.`);

  if (marksPct >= 75) strengths.push(`Solid grasp of foundational concepts with ${marksPct}% assessment average.`);
  else concerns.push(`Average assessment score is ${marksPct}%, indicating gaps in key competencies.`);

  if (completionPct >= 85) strengths.push(`Reliable homework submission rate (${completionPct}% completed).`);
  else concerns.push(`${metrics.assignments.missingCount} assignment(s) currently marked missing.`);

  if (metrics.performance.trend === 'IMPROVING') strengths.push(`Upward momentum observed in recent assessment scores (+${metrics.performance.changePoints}%).`);
  if (metrics.performance.trend === 'DECLINING') concerns.push(`Recent performance dip of ${metrics.performance.changePoints}% across recent evaluation cycles.`);

  if (strengths.length === 0) strengths.push('Actively enrolled and engaged in ongoing classroom learning opportunities.');
  if (concerns.length === 0) concerns.push('No acute warning indicators detected at this time.');

  if (attPct < 85) priorityAreas.push('Attendance regularity and morning check-ins');
  if (marksPct < 65) priorityAreas.push('Core conceptual mastery and quiz review');
  if (completionPct < 80) priorityAreas.push('Structured homework submission routines');
  if (priorityAreas.length === 0) priorityAreas.push('Enrichment and continuous academic reinforcement');

  const recommendedActions = [
    {
      title: overallRisk === 'HIGH' ? 'One-on-One Academic Check-In' : 'Progress Review & Encouragement',
      description: `Schedule a 15-minute diagnostic conference to review ${metrics.student.subject} topics and identify specific blockers.`,
      priority: overallRisk,
    },
    {
      title: 'Targeted Assignment Remediation',
      description: `Offer a grace period or guided workshop session to resolve ${metrics.assignments.missingCount} missing submissions.`,
      priority: overallRisk === 'HIGH' ? 'HIGH' as const : 'MEDIUM' as const,
    },
    {
      title: 'Peer Learning & Study Buddy',
      description: 'Pair student with a collaborative study partner for upcoming coursework milestones.',
      priority: 'LOW' as const,
    },
  ];

  const interventionPlan = [
    {
      timeframe: 'Week 1',
      objective: 'Diagnostic & Academic Alignment',
      actions: [
        'Conduct individualized 10-minute check-in with student',
        'Audit specific assignment gaps and outline recovery targets',
      ],
    },
    {
      timeframe: 'Weeks 2-3',
      objective: 'Skill Reinforcement & Active Practice',
      actions: [
        'Provide structured scaffolded practice worksheets',
        'Monitor weekly attendance checks and morning arrival promptness',
      ],
    },
    {
      timeframe: 'Week 4',
      objective: 'Progress Evaluation & Milestone Celebration',
      actions: [
        'Evaluate subsequent assessment performance change',
        'Acknowledge verified turnaround milestones and adjust ongoing support',
      ],
    },
  ];

  const teacherMessage = `Hello ${metrics.student.name}, I want to commend your efforts in ${metrics.student.subject}. I noticed a few areas where we can partner together to help you build confidence on upcoming topics. Let's set up a quick time to look over our study plan together!`;

  return {
    overallRisk,
    riskScore,
    summary: `Student exhibits an overall ${overallRisk.toLowerCase()} academic support indicator (Risk Score: ${riskScore}/100) with ${attPct}% attendance, ${marksPct}% assessment average, and ${completionPct}% assignment completion rate.`,
    strengths,
    concerns,
    priorityAreas,
    recommendedActions,
    interventionPlan,
    teacherMessage,
  };
}
