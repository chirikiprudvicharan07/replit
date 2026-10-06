import { pgTable, varchar, text, numeric, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('TEACHER').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const classes = pgTable('classes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  teacherId: varchar('teacher_id', { length: 36 })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  academicYear: varchar('academic_year', { length: 50 }).notNull(),
  description: text('description').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const students = pgTable('students', {
  id: varchar('id', { length: 36 }).primaryKey(),
  classId: varchar('class_id', { length: 36 })
    .references(() => classes.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).default(''),
  studentCode: varchar('student_code', { length: 100 }).notNull(),
  dateOfBirth: varchar('date_of_birth', { length: 50 }).default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const attendance = pgTable(
  'attendance',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    studentId: varchar('student_id', { length: 36 })
      .references(() => students.id, { onDelete: 'cascade' })
      .notNull(),
    classId: varchar('class_id', { length: 36 })
      .references(() => classes.id, { onDelete: 'cascade' })
      .notNull(),
    date: varchar('date', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    remarks: text('remarks').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('unique_student_date').on(table.studentId, table.date),
  ]
);

export const marks = pgTable('marks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: varchar('student_id', { length: 36 })
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  classId: varchar('class_id', { length: 36 })
    .references(() => classes.id, { onDelete: 'cascade' })
    .notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  assessmentName: varchar('assessment_name', { length: 255 }).notNull(),
  score: numeric('score', { precision: 6, scale: 2 }).notNull(),
  maxScore: numeric('max_score', { precision: 6, scale: 2 }).notNull(),
  assessmentDate: varchar('assessment_date', { length: 20 }).notNull(),
  remarks: text('remarks').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const assignments = pgTable('assignments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  classId: varchar('class_id', { length: 36 })
    .references(() => classes.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').default(''),
  dueDate: varchar('due_date', { length: 30 }).notNull(),
  maxScore: numeric('max_score', { precision: 6, scale: 2 }).default('100').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const assignmentSubmissions = pgTable(
  'assignment_submissions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    assignmentId: varchar('assignment_id', { length: 36 })
      .references(() => assignments.id, { onDelete: 'cascade' })
      .notNull(),
    studentId: varchar('student_id', { length: 36 })
      .references(() => students.id, { onDelete: 'cascade' })
      .notNull(),
    status: varchar('status', { length: 30 }).notNull(),
    score: numeric('score', { precision: 6, scale: 2 }),
    submittedAt: timestamp('submitted_at'),
    remarks: text('remarks').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('unique_submission').on(table.assignmentId, table.studentId),
  ]
);

export const aiAnalyses = pgTable('ai_analyses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  teacherId: varchar('teacher_id', { length: 36 })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  studentId: varchar('student_id', { length: 36 })
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  classId: varchar('class_id', { length: 36 })
    .references(() => classes.id, { onDelete: 'cascade' })
    .notNull(),
  overallRisk: varchar('overall_risk', { length: 20 }).notNull(),
  riskScore: numeric('risk_score', { precision: 5, scale: 2 }).notNull(),
  summary: text('summary').notNull(),
  strengths: jsonb('strengths').notNull(),
  concerns: jsonb('concerns').notNull(),
  priorityAreas: jsonb('priority_areas').notNull(),
  recommendedActions: jsonb('recommended_actions').notNull(),
  interventionPlan: jsonb('intervention_plan').notNull(),
  teacherMessage: text('teacher_message').notNull(),
  rawStructuredOutput: jsonb('raw_structured_output').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const interventions = pgTable('interventions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  teacherId: varchar('teacher_id', { length: 36 })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  studentId: varchar('student_id', { length: 36 })
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  aiAnalysisId: varchar('ai_analysis_id', { length: 36 })
    .references(() => aiAnalyses.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  priority: varchar('priority', { length: 20 }).notNull(),
  status: varchar('status', { length: 30 }).default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
