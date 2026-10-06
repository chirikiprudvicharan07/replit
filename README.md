# ClassPulse AI

> **"Turn student performance data into early, actionable support."**

A competition-grade full-stack educational dashboard built for the **"Build to Ship — Full-Stack AI Launchpad"** hackathon. ClassPulse AI transforms everyday attendance records, marks, and coursework into early academic support indicators, helping teachers intervene before students fall behind.

---

## 1. Problem Statement

### E2 — Student Attendance & Performance Dashboard
> *"Create a system where teachers can track attendance, marks, assignments, and identify students who may require additional support."*

In modern classrooms, academic risk accumulates quietly: a missed morning attendance session, an incomplete homework assignment, a slight dip on a weekly quiz. By the time final examinations arrive, it is often too late for effective remediation.

**ClassPulse AI** solves this by establishing a continuous closed-loop educator workflow:
```
TRACK  ───►  ANALYZE  ───►  IDENTIFY SUPPORT NEED  ───►  RECOMMEND  ───►  INTERVENE  ───►  TRACK AGAIN
```

---

## 2. Key Features

- **Full User Authentication & Authorization**:
  - Secure registration, login, session validation, and logout.
  - `bcrypt` password hashing (salt rounds = 10).
  - Signed JSON Web Tokens (JWT) with user ID and `TEACHER` role claims.
  - Multi-tenant data isolation: all database queries verify teacher ownership via `req.user.id`.
- **Class & Student Roster Management**:
  - Manage multiple class cohorts and subjects.
  - Track student codes, contact info, and cohort enrollment.
- **Bulk & Daily Attendance Roll Call**:
  - Daily roll call with `PRESENT`, `ABSENT`, `LATE`, and `EXCUSED` status marking.
  - 1-click batch actions ("All Present", "All Absent").
  - Historical attendance calculations and percentage trends.
- **Formative Marks & Assessment Tracking**:
  - Record quiz, test, and exam scores with custom max marks.
  - Dynamic percentage computation, class average, high/low scoring tracking.
- **Assignments & Coursework Compliance**:
  - Create coursework with deadlines and max scores.
  - Track `SUBMITTED`, `LATE`, `MISSING`, and `PENDING` submissions with completion statistics.
- **AI Early Support Engine (Backend-Only Gemini Integration)**:
  - Calculates deterministic metrics first (attendance %, recent attendance trend, marks average, marks trend, assignment completion rate, missing coursework).
  - Passes deterministic metrics to Google Gemini (`@google/genai` SDK, model `gemini-3.8-flash`).
  - Enforces educational safety guidelines: academic support indicators only, never medical or psychological diagnoses.
  - Enforces strict structured JSON schema output validated via Zod.
  - Results are persisted to PostgreSQL (`ai_analyses` table) for historical comparison.
- **Actionable Intervention Workflow**:
  - Convert AI recommendations into active tracked intervention records with 1-click.
  - Track intervention lifecycle: `PENDING` ➔ `IN_PROGRESS` ➔ `COMPLETED` persisted directly to the database.
- **Interactive Visual Dashboard**:
  - Top KPI metrics: Total Classes, Total Students, Average Attendance %, Average Marks %, Pending Submissions, and Priority Support count.
  - Recharts visualizations: Attendance Trend Area Chart, Performance Timeline, Subject Benchmarks, and Risk Distribution Donut Chart.

---

## 3. Technology Stack

### Frontend
- **React 19** + **Vite 8**
- **React Router 7** for declarative client routing
- **Tailwind CSS v4** for clean, accessible SaaS styling
- **Recharts** for interactive visual analytics
- **Axios** with JWT bearer interceptors
- **Lucide React** for clean iconography

### Backend
- **Node.js** + **Express.js**
- **@google/genai** SDK (`gemini-3.8-flash`)
- **JSON Web Token (jsonwebtoken)**
- **bcryptjs** for credential hashing
- **Zod** for schema validation across API requests and Gemini outputs
- **cors** and centralized error middleware

### Database
- **PostgreSQL** (Standard connection via `DATABASE_URL`)
- Fully compatible with **Replit PostgreSQL**, **Supabase**, and local Postgres
- Features embedded WebAssembly PostgreSQL (`@electric-sql/pglite`) fallback when `DATABASE_URL` is omitted in temporary test sandboxes, ensuring zero environment friction while executing 100% compliant Postgres SQL.

---

## 4. Database Schema

The database consists of the following relational tables with foreign keys and cascading deletes:

| Table | Description |
|---|---|
| `users` | Teacher accounts (`id`, `name`, `email`, `password_hash`, `role`, timestamps) |
| `classes` | Class cohorts owned by teacher (`id`, `teacher_id`, `name`, `subject`, `academic_year`, `description`) |
| `students` | Students enrolled in classes (`id`, `class_id`, `name`, `email`, `student_code`, `date_of_birth`) |
| `attendance` | Daily attendance entries (`id`, `student_id`, `class_id`, `date`, `status`, `remarks`, unique constraint on `(student_id, date)`) |
| `marks` | Assessment evaluations (`id`, `student_id`, `class_id`, `subject`, `assessment_name`, `score`, `max_score`, `assessment_date`, `remarks`) |
| `assignments` | Coursework assignments (`id`, `class_id`, `title`, `description`, `due_date`, `max_score`) |
| `assignment_submissions` | Student submissions (`id`, `assignment_id`, `student_id`, `status`, `score`, `submitted_at`, `remarks`) |
| `ai_analyses` | Persisted Gemini early support evaluations (`id`, `teacher_id`, `student_id`, `class_id`, `overall_risk`, `risk_score`, `summary`, `strengths`, `concerns`, `priority_areas`, `recommended_actions`, `intervention_plan`, `teacher_message`, `raw_structured_output`) |
| `interventions` | Actionable support plans (`id`, `teacher_id`, `student_id`, `ai_analysis_id`, `title`, `description`, `priority`, `status`) |

---

## 5. API Endpoints

### Authentication
- `POST /api/auth/register` — Register a new teacher account
- `POST /api/auth/login` — Authenticate and receive JWT token
- `POST /api/auth/logout` — End user session
- `GET /api/auth/me` — Retrieve active teacher profile

### Profile
- `GET /api/profile` — Get teacher profile details
- `PUT /api/profile` — Update teacher profile

### Classes
- `GET /api/classes` — List teacher's classes with student counts and averages
- `POST /api/classes` — Create a new class
- `GET /api/classes/:id` — Get class details with enrolled student roster
- `PUT /api/classes/:id` — Update class information
- `DELETE /api/classes/:id` — Delete class and cascade records

### Students
- `GET /api/students` — List students (supports `?classId=`, `?search=`, `?risk=`)
- `POST /api/students` — Enroll new student in a class
- `GET /api/students/:id` — Full student profile with attendance, marks, and AI history
- `PUT /api/students/:id` — Update student record
- `DELETE /api/students/:id` — Remove student record

### Attendance
- `GET /api/attendance` — Query roll call (`?classId=`, `?date=`, `?studentId=`)
- `POST /api/attendance` — Record attendance (supports single entry or bulk roster array)
- `PUT /api/attendance/:id` — Update attendance status or remarks
- `DELETE /api/attendance/:id` — Delete attendance record

### Marks
- `GET /api/marks` — Query marks ledger (`?classId=`, `?studentId=`, `?subject=`)
- `POST /api/marks` — Record assessment score
- `PUT /api/marks/:id` — Edit assessment score
- `DELETE /api/marks/:id` — Delete assessment record

### Assignments & Submissions
- `GET /api/assignments` — List coursework with submission statistics
- `POST /api/assignments` — Create coursework assignment
- `GET /api/assignments/:id` — Get assignment details with submission list
- `PUT /api/assignments/:id` — Update assignment
- `DELETE /api/assignments/:id` — Delete assignment
- `GET /api/submissions` — Query submissions
- `POST /api/submissions` — Record submission
- `PUT /api/submissions/:id` — Update grade or status (`PENDING`, `SUBMITTED`, `LATE`, `MISSING`)

### AI Early Support Engine
- `POST /api/ai/analyze-student/:studentId` — Trigger early support analysis
- `GET /api/ai/analyses` — List persisted analyses (`?risk=`, `?search=`, `?classId=`)
- `GET /api/ai/analyses/:id` — View full structured AI analysis record

### Interventions
- `GET /api/interventions` — List interventions (`?status=`, `?priority=`, `?studentId=`)
- `POST /api/interventions` — Create intervention plan
- `PUT /api/interventions/:id` — Update status (`PENDING` ➔ `IN_PROGRESS` ➔ `COMPLETED`)
- `DELETE /api/interventions/:id` — Delete intervention

### Dashboard
- `GET /api/dashboard/overview` — Top metrics, priority support watchlist, intervention counts
- `GET /api/dashboard/attendance` — Timeline attendance percentage trend
- `GET /api/dashboard/performance` — Assessment timeline scores and subject breakdown
- `GET /api/dashboard/risk` — Support risk distribution counts

---

## 6. AI Architecture & Security

```
React Client
    │
    ▼ (HTTPS / Bearer JWT)
Express Backend
    │
    ├─► JWT Verification & Multi-Tenant Teacher Ownership Check
    │
    ├─► PostgreSQL Deterministic Calculation Service:
    │     • Overall attendance % & recent trend
    │     • Assessment average % & score trajectories
    │     • Coursework completion % & missing assignments
    │
    ├─► Server-Side Gemini API (@google/genai, gemini-3.8-flash):
    │     • System instruction: Academic support indicator only
    │     • Strict responseSchema enforcement
    │
    ├─► Zod Validation (geminiSupportOutputSchema)
    │
    ├─► PostgreSQL Persistence (ai_analyses table)
    │
    ▼
JSON Response to Client
```

### Security Invariants:
1. **Zero Browser Exposure**: `GEMINI_API_KEY` is strictly accessed via `process.env.GEMINI_API_KEY` on the server. Never bundled into client-side code.
2. **Deterministic Pre-Computation**: Gemini is never asked to calculate raw numerical percentages or averages; arithmetic is deterministically computed in PostgreSQL/Node.js first.
3. **Structured Schema Validation**: Model output is parsed and verified through Zod before database persistence.
4. **Ownership Enforcement**: Teacher A can never access or analyze students belonging to Teacher B (`403 FORBIDDEN`).

---

## 7. Setup & Run Instructions

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
git clone <repository-url>
cd classpulse-ai
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables:
```ini
DATABASE_URL=postgresql://user:password@localhost:5432/classpulse
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
VITE_API_BASE_URL=/api
```

*(Note: If `DATABASE_URL` is omitted, the app automatically initializes an embedded PostgreSQL engine in `./data/pgdata`, allowing out-of-the-box local testing.)*

### Seed Demo Data
Populate realistic demo records (1 teacher, 2 classes, 18 students with high/medium/low support patterns, attendance logs, marks, assignments, and sample AI analysis):
```bash
npm run seed
```

### Running in Development
```bash
npm run dev
```
Visit `http://localhost:3000` in your browser.

### Building for Production
```bash
npm run build
npm run start
```

---

## 8. Demo Credentials & Test Guide

### Evaluator Quick Login:
- **Email**: `teacher@classpulse.edu`
- **Password**: `password123`
*(A 1-click "Autofill" button is also provided on the sign-in screen.)*

### Recommended Evaluation Flow:
1. **Sign In**: Log in using the demo teacher credentials.
2. **Dashboard**: Inspect the top 6 KPI cards, attendance trend area chart, performance timeline, and priority support watchlist.
3. **Classes & Roster**: Open `Grade 10 - Section A` to review the student roster and enrolled metrics.
4. **Student Profile**: Navigate to high-risk student **Marcus Brody** (`STU-1001`). Observe low attendance (57.1%), marks average (46.5%), and 2 missing assignments.
5. **Trigger AI Support**: Click **"Analyze with AI"** or **"Re-Analyze with AI"**. Notice the deterministic metrics computed by the backend, structured Gemini analysis, and instant persistence to PostgreSQL.
6. **Actionable Intervention**: Scroll to **"Actionable Teacher Recommendations"** and click **"Create Intervention"**. Change status from `PENDING` ➔ `IN_PROGRESS` and observe the update reflected on `/interventions` and the dashboard.
7. **Daily Roll Call**: Open `/attendance` and log roll call for today using the bulk controls ("All Present", "Late", "Absent").
8. **Marks Entry**: Open `/marks` and record a new quiz score. Verify the updated class average and student trajectory.

---

## 9. Portability & Replit Deployment

ClassPulse AI was architected from day one to be 100% portable:
- **Replit**:
  1. Import repository into Replit.
  2. Create a Replit PostgreSQL database.
  3. In Replit Secrets, set:
     - `DATABASE_URL` (from Replit PostgreSQL)
     - `GEMINI_API_KEY`
     - `JWT_SECRET`
  4. Run `npm run seed` in shell to populate initial data.
  5. Click **Run** (`npm run dev` or `npm run start`).
- **Supabase / Neon / Render**:
  Provide the PostgreSQL connection string in `DATABASE_URL`, build with `npm run build`, and deploy with `npm run start`.
