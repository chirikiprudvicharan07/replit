import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { studentService, aiService, interventionService } from '../services/api.ts';
import { Button } from '../components/Button.tsx';
import { Badge } from '../components/Badge.tsx';
import { Modal } from '../components/Modal.tsx';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import {
  ArrowLeft,
  Sparkles,
  CalendarCheck,
  Award,
  BookOpen,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Clock,
  Plus,
} from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Analysis trigger state
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Active Tab: 'insights' | 'attendance' | 'marks' | 'assignments' | 'interventions'
  const [activeTab, setActiveTab] = useState<'insights' | 'attendance' | 'marks' | 'assignments' | 'interventions'>('insights');

  // Convert Recommendation to Intervention Modal
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [interventionForm, setInterventionForm] = useState({
    title: '',
    description: '',
    priority: 'HIGH' as 'LOW' | 'MEDIUM' | 'HIGH',
    aiAnalysisId: '',
  });
  const [savingIntervention, setSavingIntervention] = useState(false);

  useEffect(() => {
    if (studentId) {
      loadStudent();
    }
  }, [studentId]);

  const loadStudent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await studentService.getById(studentId!);
      if (res.data.success) {
        setStudent(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not load student profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeWithAi = async () => {
    setAnalyzing(true);
    setError(null);
    setAiSuccessMessage(null);
    try {
      const res = await aiService.analyzeStudent(studentId!);
      if (res.data.success) {
        setAiSuccessMessage('AI early support analysis completed and persisted to PostgreSQL!');
        setActiveTab('insights');
        await loadStudent();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'AI analysis could not be completed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOpenConvertModal = (action: { title: string; description: string; priority: string }, analysisId: string) => {
    setInterventionForm({
      title: action.title,
      description: action.description,
      priority: action.priority as any,
      aiAnalysisId: analysisId,
    });
    setIsInterventionModalOpen(true);
  };

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingIntervention(true);
    setError(null);
    try {
      const res = await interventionService.create({
        studentId: studentId!,
        aiAnalysisId: interventionForm.aiAnalysisId || null,
        title: interventionForm.title,
        description: interventionForm.description,
        priority: interventionForm.priority,
        status: 'IN_PROGRESS',
      });

      if (res.data.success) {
        setIsInterventionModalOpen(false);
        setActiveTab('interventions');
        loadStudent();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not create intervention');
    } finally {
      setSavingIntervention(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading student profile & performance metrics..." />;
  }

  if (!student) {
    return (
      <EmptyState
        title="Student not found"
        description="The student record does not exist or you do not have permission to view it."
        actionText="Back to Students"
        onAction={() => window.history.back()}
      />
    );
  }

  const latestAnalysis = student.aiAnalyses && student.aiAnalyses.length > 0 ? student.aiAnalyses[0] : null;
  const metrics = student.metrics;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/students"
        className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Students
      </Link>

      {/* Student Profile Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{student.name}</h1>
            <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {student.student_code}
            </span>
            {latestAnalysis && (
              <Badge variant={latestAnalysis.overall_risk === 'HIGH' ? 'high' : latestAnalysis.overall_risk === 'MEDIUM' ? 'medium' : 'low'}>
                {latestAnalysis.overall_risk === 'HIGH' ? 'High Support' : latestAnalysis.overall_risk === 'MEDIUM' ? 'Medium Support' : 'Low Support'} ({latestAnalysis.risk_score}/100)
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enrolled in: <strong className="text-slate-800">{student.class_name}</strong> ·{' '}
            Subject: <strong className="text-slate-800">{student.subject}</strong> ·{' '}
            {student.email || 'No email provided'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="md"
            variant="primary"
            onClick={handleAnalyzeWithAi}
            isLoading={analyzing}
            icon={<Sparkles className="w-4 h-4" />}
          >
            {latestAnalysis ? 'Re-Analyze with AI' : 'Analyze with AI'}
          </Button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {aiSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>{aiSuccessMessage}</span>
          <button onClick={() => setAiSuccessMessage(null)} className="text-emerald-700 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* 4 Deterministic Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics?.attendance?.percentage ?? 100}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {metrics?.attendance?.presentCount} present · {metrics?.attendance?.absentCount} absent · {metrics?.attendance?.lateCount} late
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Assessment Average</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics?.performance?.averageScorePct ?? 0}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Across {metrics?.performance?.totalAssessments ?? 0} assessment(s) · Trend: {metrics?.performance?.trend}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Coursework Completion</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics?.assignments?.completionRatePct ?? 100}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {metrics?.assignments?.missingCount} missing · {metrics?.assignments?.lateCount} late
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Support Risk Score</span>
            <Sparkles className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {latestAnalysis ? `${latestAnalysis.risk_score}/100` : 'Not Analyzed'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {latestAnalysis ? `${latestAnalysis.overall_risk} academic support need` : 'Click Analyze with AI'}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'insights'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Early Support Insights {latestAnalysis && <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />}
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          Attendance Records ({student.attendance?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('marks')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'marks'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Assessment Marks ({student.marks?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'assignments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Assignments & Submissions ({student.assignments?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('interventions')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'interventions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Interventions ({student.interventions?.length || 0})
        </button>
      </div>

      {/* Tab 1: AI Insights */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {!latestAnalysis ? (
            <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center">
              <Sparkles className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">No AI Analysis Run Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
                Click "Analyze with AI" to evaluate attendance consistency, assessment trajectories, and coursework patterns for early academic support recommendations.
              </p>
              <Button size="sm" onClick={handleAnalyzeWithAi} isLoading={analyzing}>
                Generate First Support Analysis
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Executive Summary */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Academic Support Assessment</h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Evaluated on {new Date(latestAnalysis.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  {latestAnalysis.summary}
                </p>
              </div>

              {/* Strengths & Concerns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Strengths */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Observed Strengths
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {((typeof latestAnalysis.strengths === 'string' ? JSON.parse(latestAnalysis.strengths) : latestAnalysis.strengths) || []).map((s: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Concerns */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Key Warning Indicators
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {((typeof latestAnalysis.concerns === 'string' ? JSON.parse(latestAnalysis.concerns) : latestAnalysis.concerns) || []).map((c: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">!</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Actions -> Actionable Interventions */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-500" /> Actionable Teacher Recommendations
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Convert any recommended action into an active tracked intervention record
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {((typeof latestAnalysis.recommended_actions === 'string' ? JSON.parse(latestAnalysis.recommended_actions) : latestAnalysis.recommended_actions) || []).map((act: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-900">{act.title}</h5>
                          <Badge variant={act.priority === 'HIGH' ? 'high' : act.priority === 'MEDIUM' ? 'medium' : 'low'}>
                            {act.priority} Priority
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{act.description}</p>
                      </div>
                      <div className="shrink-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenConvertModal(act, latestAnalysis.id)}
                          icon={<Plus className="w-3.5 h-3.5" />}
                        >
                          Create Intervention
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Intervention Plan */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" /> Staged Multi-Week Intervention Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {((typeof latestAnalysis.intervention_plan === 'string' ? JSON.parse(latestAnalysis.intervention_plan) : latestAnalysis.intervention_plan) || []).map((step: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                        {step.timeframe}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900 mt-1 mb-2">{step.objective}</h5>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {(step.actions || []).map((a: string, aIdx: number) => (
                          <li key={aIdx} className="flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold">·</span>
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Constructive Teacher Communication Template */}
              {latestAnalysis.teacher_message && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Sample Supportive Communication
                  </h4>
                  <p className="text-xs italic text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                    "{latestAnalysis.teacher_message}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Attendance Records Table */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Attendance Log</h3>
            <span className="text-xs text-slate-500">
              Total sessions: <strong>{student.attendance?.length || 0}</strong>
            </span>
          </div>

          {!student.attendance || student.attendance.length === 0 ? (
            <EmptyState title="No attendance records" description="No roll call entries found for this student." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {student.attendance.map((att: any) => (
                    <tr key={att.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-medium text-slate-900">{att.date}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={
                            att.status === 'PRESENT'
                              ? 'present'
                              : att.status === 'ABSENT'
                              ? 'absent'
                              : att.status === 'LATE'
                              ? 'late'
                              : 'excused'
                          }
                        >
                          {att.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{att.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Marks & Assessments Table */}
      {activeTab === 'marks' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Assessment Scores</h3>
            <span className="text-xs text-slate-500">
              Evaluations: <strong>{student.marks?.length || 0}</strong>
            </span>
          </div>

          {!student.marks || student.marks.length === 0 ? (
            <EmptyState title="No marks recorded" description="No graded assessments logged yet for this student." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Assessment</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Score</th>
                    <th className="py-2.5 px-4">Percentage</th>
                    <th className="py-2.5 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {student.marks.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{m.assessment_name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{m.subject}</td>
                      <td className="py-2.5 px-4 font-mono">
                        {m.score} / {m.max_score}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`font-bold ${
                            m.percentage < 50
                              ? 'text-rose-600'
                              : m.percentage < 70
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {m.percentage}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{m.assessment_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Assignments Submissions Table */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Assignments & Coursework Submissions</h3>
            <span className="text-xs text-slate-500">
              Total assigned: <strong>{student.assignments?.length || 0}</strong>
            </span>
          </div>

          {!student.assignments || student.assignments.length === 0 ? (
            <EmptyState title="No assignments" description="No assignments assigned in this class yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Assignment Title</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {student.assignments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-medium text-slate-900">{a.title}</td>
                      <td className="py-2.5 px-4 text-slate-500">{a.due_date}</td>
                      <td className="py-2.5 px-4">
                        {a.submission_status === 'SUBMITTED' && <Badge variant="low">Submitted</Badge>}
                        {a.submission_status === 'LATE' && <Badge variant="medium">Late</Badge>}
                        {a.submission_status === 'MISSING' && <Badge variant="high">Missing</Badge>}
                        {(!a.submission_status || a.submission_status === 'PENDING') && (
                          <Badge variant="neutral">Pending</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {a.submission_score != null ? `${a.submission_score} / ${a.max_score}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Interventions */}
      {activeTab === 'interventions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Student Academic Interventions</h3>
            <Button
              size="sm"
              onClick={() => {
                setInterventionForm({ title: '', description: '', priority: 'HIGH', aiAnalysisId: '' });
                setIsInterventionModalOpen(true);
              }}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Intervention
            </Button>
          </div>

          {!student.interventions || student.interventions.length === 0 ? (
            <EmptyState
              title="No active interventions"
              description="Convert an AI recommendation or add a manual support plan for this student."
              actionText="Add Intervention"
              onAction={() => {
                setInterventionForm({ title: '', description: '', priority: 'HIGH', aiAnalysisId: '' });
                setIsInterventionModalOpen(true);
              }}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {student.interventions.map((int: any) => (
                <div key={int.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{int.title}</h4>
                      <Badge variant={int.priority === 'HIGH' ? 'high' : int.priority === 'MEDIUM' ? 'medium' : 'low'}>
                        {int.priority}
                      </Badge>
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {int.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{int.description}</p>
                  </div>
                  <Link to="/interventions">
                    <Button size="sm" variant="ghost">
                      Manage Workflow
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Convert Intervention Modal */}
      <Modal
        isOpen={isInterventionModalOpen}
        onClose={() => setIsInterventionModalOpen(false)}
        title="Create Student Intervention"
        description={`Establish an actionable support plan for ${student.name}`}
      >
        <form onSubmit={handleCreateIntervention} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Intervention Action Title *</label>
            <input
              type="text"
              required
              value={interventionForm.title}
              onChange={(e) => setInterventionForm({ ...interventionForm, title: e.target.value })}
              placeholder="e.g. Weekly Quadratic Equation Remediation Session"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Priority Level</label>
            <select
              value={interventionForm.priority}
              onChange={(e) => setInterventionForm({ ...interventionForm, priority: e.target.value as any })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="HIGH">HIGH (Urgent Support)</option>
              <option value="MEDIUM">MEDIUM (Moderate Gaps)</option>
              <option value="LOW">LOW (Check-in)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Action Description & Milestones *</label>
            <textarea
              rows={4}
              required
              value={interventionForm.description}
              onChange={(e) => setInterventionForm({ ...interventionForm, description: e.target.value })}
              placeholder="Specific intervention strategy, meeting times, practice worksheets..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsInterventionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={savingIntervention}>
              Save to PostgreSQL
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
