import { z } from 'zod';

export const UserRole = z.enum(['TEACHER']);

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional(),
});

export const classSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  subject: z.string().min(1, 'Subject is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  description: z.string().optional().default(''),
});

export const studentSchema = z.object({
  classId: z.string().uuid().or(z.string().min(1)),
  name: z.string().min(1, 'Student name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  studentCode: z.string().min(1, 'Student code is required'),
  dateOfBirth: z.string().optional().or(z.literal('')),
});

export const AttendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

export const attendanceRecordSchema = z.object({
  studentId: z.string().uuid().or(z.string().min(1)),
  classId: z.string().uuid().or(z.string().min(1)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status: AttendanceStatusEnum,
  remarks: z.string().optional().default(''),
});

export const bulkAttendanceSchema = z.object({
  classId: z.string().uuid().or(z.string().min(1)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  records: z.array(
    z.object({
      studentId: z.string().uuid().or(z.string().min(1)),
      status: AttendanceStatusEnum,
      remarks: z.string().optional().default(''),
    })
  ),
});

export const markSchema = z.object({
  studentId: z.string().uuid().or(z.string().min(1)),
  classId: z.string().uuid().or(z.string().min(1)),
  subject: z.string().min(1, 'Subject is required'),
  assessmentName: z.string().min(1, 'Assessment name is required'),
  score: z.number().min(0, 'Score cannot be negative'),
  maxScore: z.number().min(1, 'Max score must be greater than 0'),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  remarks: z.string().optional().default(''),
});

export const assignmentSchema = z.object({
  classId: z.string().uuid().or(z.string().min(1)),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid due date is required'),
  maxScore: z.number().min(1, 'Max score must be at least 1').default(100),
});

export const SubmissionStatusEnum = z.enum(['PENDING', 'SUBMITTED', 'LATE', 'MISSING']);

export const submissionSchema = z.object({
  assignmentId: z.string().uuid().or(z.string().min(1)),
  studentId: z.string().uuid().or(z.string().min(1)),
  status: SubmissionStatusEnum,
  score: z.number().min(0).optional().nullable(),
  submittedAt: z.string().optional().nullable(),
  remarks: z.string().optional().default(''),
});

export const RiskLevelEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const RecommendedActionSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: RiskLevelEnum,
});

export const InterventionPlanStepSchema = z.object({
  timeframe: z.string(),
  objective: z.string(),
  actions: z.array(z.string()),
});

export const geminiSupportOutputSchema = z.object({
  overallRisk: RiskLevelEnum,
  riskScore: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  priorityAreas: z.array(z.string()),
  recommendedActions: z.array(RecommendedActionSchema),
  interventionPlan: z.array(InterventionPlanStepSchema),
  teacherMessage: z.string(),
});

export const InterventionStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']);

export const interventionSchema = z.object({
  studentId: z.string().uuid().or(z.string().min(1)),
  aiAnalysisId: z.string().uuid().or(z.string().min(1)).optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: RiskLevelEnum,
  status: InterventionStatusEnum.default('PENDING'),
});

export const updateInterventionStatusSchema = z.object({
  status: InterventionStatusEnum,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ClassInput = z.infer<typeof classSchema>;
export type StudentInput = z.infer<typeof studentSchema>;
export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
export type MarkInput = z.infer<typeof markSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type GeminiSupportOutput = z.infer<typeof geminiSupportOutputSchema>;
export type InterventionInput = z.infer<typeof interventionSchema>;
