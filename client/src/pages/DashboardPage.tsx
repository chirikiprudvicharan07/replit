import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import { Badge } from '../components/Badge.tsx';
import { Button } from '../components/Button.tsx';
import { AttendanceTrendChart } from '../charts/AttendanceTrendChart.tsx';
import { PerformanceChart } from '../charts/PerformanceChart.tsx';
import { SubjectBarChart } from '../charts/SubjectBarChart.tsx';
import { RiskDonutChart } from '../charts/RiskDonutChart.tsx';
import {
  GraduationCap,
  Users,
  CalendarCheck,
  TrendingUp,
  FileQuestion,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<any>(null);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, attRes, perfRes, riskRes] = await Promise.all([
        dashboardService.getOverview(),
        dashboardService.getAttendanceStats(),
        dashboardService.getPerformanceStats(),
        dashboardService.getRiskDistribution(),
      ]);

      if (ovRes.data.success) setOverview(ovRes.data.data);
      if (attRes.data.success) setAttendanceTrend(attRes.data.data);
      if (perfRes.data.success) setPerformanceData(perfRes.data.data);
      if (riskRes.data.success) setRiskDistribution(riskRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Calculating dashboard analytics..." />;
  }

  const metrics = overview?.metrics || {
    totalClasses: 0,
    totalStudents: 0,
    avgAttendance: 0,
    avgPerformance: 0,
    pendingAssignments: 0,
    studentsRequiringSupport: 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.name || 'Teacher'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Academic overview and early support indicators across your classes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/attendance">
            <Button size="sm" variant="outline" icon={<CalendarCheck className="w-3.5 h-3.5" />}>
              Mark Attendance
            </Button>
          </Link>
          <Link to="/ai-insights">
            <Button size="sm" variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />}>
              AI Early Support
            </Button>
          </Link>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Top 6 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Classes</span>
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.totalClasses}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active sections</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Students</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.totalStudents}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total enrolled</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.avgAttendance}%</div>
          <div className="text-[11px] text-slate-500 mt-1">Overall average</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Marks Avg</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.avgPerformance}%</div>
          <div className="text-[11px] text-slate-500 mt-1">Across all tests</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Pending</span>
            <FileQuestion className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.pendingAssignments}</div>
          <div className="text-[11px] text-slate-500 mt-1">Submissions due</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Support</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{metrics.studentsRequiringSupport}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">Need intervention</div>
        </div>
      </div>

      {/* Urgent Students Attention Banner */}
      {overview?.urgentStudents && overview.urgentStudents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Priority Academic Support Watchlist
              </h2>
            </div>
            <Link
              to="/ai-insights"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
            >
              View All Support Indicators <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {overview.urgentStudents.map((stu: any) => (
              <div
                key={stu.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {stu.score}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/students/${stu.id}`}
                        className="text-xs font-semibold text-slate-900 hover:text-blue-600"
                      >
                        {stu.name}
                      </Link>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">{stu.className}</span>
                      <Badge variant={stu.risk === 'HIGH' ? 'high' : 'medium'}>
                        {stu.risk === 'HIGH' ? 'High Support' : 'Medium Support'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      {stu.summary || 'Observable attendance and assignment completion gaps.'}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Link to={`/students/${stu.id}`}>
                    <Button size="sm" variant="outline">
                      Review Profile
                    </Button>
                  </Link>
                  <Link to={`/interventions?studentId=${stu.id}`}>
                    <Button size="sm" variant="secondary" icon={<ClipboardCheck className="w-3.5 h-3.5" />}>
                      Intervene
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Attendance Trend Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Attendance Trend</h2>
              <p className="text-xs text-slate-500">Daily attendance percentage over recent sessions</p>
            </div>
            <Link to="/attendance" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Details
            </Link>
          </div>
          <AttendanceTrendChart data={attendanceTrend} />
        </div>

        {/* Academic Marks Assessment Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Assessment Performance Timeline</h2>
              <p className="text-xs text-slate-500">Average score (%) across recent assessments</p>
            </div>
            <Link to="/marks" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Details
            </Link>
          </div>
          <PerformanceChart data={performanceData?.timeline || []} />
        </div>

        {/* Subject-Level Performance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Subject Performance Benchmark</h2>
              <p className="text-xs text-slate-500">Class average across evaluated academic subjects</p>
            </div>
          </div>
          <SubjectBarChart data={performanceData?.subjectBreakdown || []} />
        </div>

        {/* Support Risk Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Support Indicator Distribution</h2>
              <p className="text-xs text-slate-500">AI early identification breakdown across roster</p>
            </div>
            <Link to="/ai-insights" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              View Insights
            </Link>
          </div>
          <RiskDonutChart data={riskDistribution} />
        </div>
      </div>
    </div>
  );
};
