import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { aiService, studentService, interventionService } from '../services/api.ts';
import { Button } from '../components/Button.tsx';
import { Badge } from '../components/Badge.tsx';
import { Modal } from '../components/Modal.tsx';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import { SearchFilterBar } from '../components/SearchFilterBar.tsx';
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  CalendarCheck,
  Award,
  BookOpen,
  ClipboardList,
  Plus,
} from 'lucide-react';

export const AiInsightsPage: React.FC = () => {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [sortBy, setSortBy] = useState('score-desc');

  // Convert to intervention modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingIntervention, setSavingIntervention] = useState(false);
  const [interventionForm, setInterventionForm] = useState({
    studentId: '',
    studentName: '',
    title: '',
    description: '',
    priority: 'HIGH' as 'LOW' | 'MEDIUM' | 'HIGH',
    aiAnalysisId: '',
  });

  useEffect(() => {
    loadAnalyses();
  }, [selectedRisk, search]);

  const loadAnalyses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.getAnalyses({
        risk: selectedRisk === 'ALL' ? undefined : selectedRisk,
        search: search || undefined,
      });
      if (res.data.success) {
        setAnalyses(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not load AI analyses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenIntervene = (item: any) => {
    const topAction = item.recommendedActions && item.recommendedActions.length > 0
      ? item.recommendedActions[0]
      : { title: `Academic support for ${item.studentName}`, description: item.summary, priority: item.overallRisk };

    setInterventionForm({
      studentId: item.studentId,
      studentName: item.studentName,
      title: topAction.title,
      description: topAction.description,
      priority: (topAction.priority || item.overallRisk) as any,
      aiAnalysisId: item.id,
    });
    setIsModalOpen(true);
  };

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingIntervention(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await interventionService.create({
        studentId: interventionForm.studentId,
        aiAnalysisId: interventionForm.aiAnalysisId,
        title: interventionForm.title,
        description: interventionForm.description,
        priority: interventionForm.priority,
        status: 'IN_PROGRESS',
      });
      if (res.data.success) {
        setIsModalOpen(false);
        setSuccessMessage(`Intervention created for ${interventionForm.studentName} and moved to IN_PROGRESS!`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create intervention');
    } finally {
      setSavingIntervention(false);
    }
  };

  // Sort
  const sortedAnalyses = [...analyses].sort((a, b) => {
    if (sortBy === 'score-desc') return b.riskScore - a.riskScore;
    if (sortBy === 'score-asc') return a.riskScore - b.riskScore;
    if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'name') return a.studentName.localeCompare(b.studentName);
    return 0;
  });

  // Counts
  const highCount = analyses.filter((a) => a.overallRisk === 'HIGH').length;
  const mediumCount = analyses.filter((a) => a.overallRisk === 'MEDIUM').length;
  const lowCount = analyses.filter((a) => a.overallRisk === 'LOW').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              AI Early Support Engine
            </h1>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Active Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify observable academic performance patterns and actionable teacher support steps
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Segmented Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-xl">
        <button
          onClick={() => setSelectedRisk('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            selectedRisk === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All Indicators ({analyses.length})
        </button>
        <button
          onClick={() => setSelectedRisk('HIGH')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            selectedRisk === 'HIGH'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-700 hover:bg-rose-50'
          }`}
        >
          High Support ({highCount})
        </button>
        <button
          onClick={() => setSelectedRisk('MEDIUM')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            selectedRisk === 'MEDIUM'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-700 hover:bg-amber-50'
          }`}
        >
          Medium Support ({mediumCount})
        </button>
        <button
          onClick={() => setSelectedRisk('LOW')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            selectedRisk === 'LOW'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          Low Support ({lowCount})
        </button>
      </div>

      {/* Search & Sort Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search student by name, student code, or class..."
        >
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="score-desc">Support Need (Highest Score First)</option>
              <option value="score-asc">Support Need (Lowest Score First)</option>
              <option value="date-desc">Evaluation Date (Most Recent)</option>
              <option value="name">Student Name (A-Z)</option>
            </select>
          </div>
        </SearchFilterBar>
      </div>

      {loading ? (
        <LoadingSpinner message="Evaluating academic support indicators..." />
      ) : sortedAnalyses.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-10 h-10" />}
          title="No AI support analyses found"
          description="Navigate to any student profile and click 'Analyze with AI' to generate and persist early support evaluations."
          actionText="View Students"
          onAction={() => (window.location.href = '/students')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedAnalyses.map((item) => {
            const concernsList = item.concerns || [];
            const actionsList = item.recommendedActions || [];
            const topConcern = concernsList.length > 0 ? concernsList[0] : 'No acute indicators.';
            const topAction = actionsList.length > 0 ? actionsList[0] : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{item.studentName}</h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {item.studentCode} · {item.className}
                      </p>
                    </div>

                    <Badge
                      variant={
                        item.overallRisk === 'HIGH'
                          ? 'high'
                          : item.overallRisk === 'MEDIUM'
                          ? 'medium'
                          : 'low'
                      }
                    >
                      {item.overallRisk} ({item.riskScore}/100)
                    </Badge>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {item.summary}
                  </p>

                  {/* Top Concern */}
                  <div className="mt-3 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Primary Risk Factor:
                    </span>
                    <p className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold shrink-0">!</span>
                      <span className="line-clamp-2">{topConcern}</span>
                    </p>
                  </div>

                  {/* Recommended Action */}
                  {topAction && (
                    <div className="mt-3 p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 text-xs">
                      <div className="flex items-center gap-1.5 text-blue-900 font-semibold mb-0.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{topAction.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {topAction.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenIntervene(item)}
                      icon={<Plus className="w-3 h-3" />}
                    >
                      Intervene
                    </Button>
                    <Link
                      to={`/students/${item.studentId}`}
                      className="font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      Profile <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Convert to Intervention Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Establish Student Intervention Plan"
        description={`Convert recommendation into an active support record for ${interventionForm.studentName}`}
      >
        <form onSubmit={handleCreateIntervention} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Intervention Title *</label>
            <input
              type="text"
              required
              value={interventionForm.title}
              onChange={(e) => setInterventionForm({ ...interventionForm, title: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
            <select
              value={interventionForm.priority}
              onChange={(e) => setInterventionForm({ ...interventionForm, priority: e.target.value as any })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="HIGH">HIGH Priority</option>
              <option value="MEDIUM">MEDIUM Priority</option>
              <option value="LOW">LOW Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Support Action & Objectives *</label>
            <textarea
              rows={4}
              required
              value={interventionForm.description}
              onChange={(e) => setInterventionForm({ ...interventionForm, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
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

