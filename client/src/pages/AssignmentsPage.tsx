import React, { useState, useEffect } from 'react';
import { assignmentService, classService, submissionService } from '../services/api.ts';
import { Button } from '../components/Button.tsx';
import { Modal } from '../components/Modal.tsx';
import { Badge } from '../components/Badge.tsx';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import { SearchFilterBar } from '../components/SearchFilterBar.tsx';
import {
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

export const AssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [search, setSearch] = useState('');

  // Create Assignment Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    classId: '',
    title: '',
    description: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    maxScore: 100,
  });

  // Submissions Review Modal
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<any>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    loadClasses();
    loadAssignments();
  }, [selectedClass, search]);

  const loadClasses = async () => {
    try {
      const res = await classService.getAll();
      if (res.data.success) {
        setClasses(res.data.data);
      }
    } catch (err: any) {}
  };

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentService.getAll({
        classId: selectedClass === 'ALL' ? undefined : selectedClass,
        search: search || undefined,
      });
      if (res.data.success) {
        setAssignments(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setCreateForm({
      classId: classes[0]?.id || '',
      title: '',
      description: '',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      maxScore: 100,
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await assignmentService.create({
        classId: createForm.classId,
        title: createForm.title,
        description: createForm.description,
        dueDate: createForm.dueDate,
        maxScore: Number(createForm.maxScore),
      });
      if (res.data.success) {
        setIsCreateModalOpen(false);
        loadAssignments();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAssignment = async (id: string, title: string) => {
    if (!window.confirm(`Delete assignment "${title}"?`)) return;
    try {
      await assignmentService.delete(id);
      loadAssignments();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete assignment');
    }
  };

  const handleViewSubmissions = async (assignmentId: string) => {
    setLoadingSubmissions(true);
    setIsSubmissionsModalOpen(true);
    try {
      const res = await assignmentService.getById(assignmentId);
      if (res.data.success) {
        setActiveAssignment(res.data.data);
      }
    } catch (err: any) {
      setError('Could not load assignment submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleUpdateSubmissionStatus = async (
    submissionId: string,
    status: string,
    score?: number | null
  ) => {
    try {
      await submissionService.update(submissionId, { status, score });
      if (activeAssignment) {
        handleViewSubmissions(activeAssignment.id);
      }
      loadAssignments();
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Assignments & Coursework</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage homework submissions, deadlines, and completion compliance
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreateModal} icon={<Plus className="w-4 h-4" />}>
          Create Assignment
        </Button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search assignment title or description..."
        >
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </SearchFilterBar>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading coursework assignments..." />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10" />}
          title="No assignments created"
          description="Create coursework to monitor homework turn-in rates and missing assignments."
          actionText="Create Assignment"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {assignments.map((a) => {
            const total = a.totalStudents || 0;
            const completed = a.submittedCount + a.lateCount;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {a.class_name} · {a.subject}
                    </span>
                    <button
                      onClick={() => handleDeleteAssignment(a.id, a.title)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete Assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {a.description || 'No additional instructions provided.'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Due: <strong>{a.due_date}</strong></span>
                    </div>
                    <span>Max Score: <strong>{a.maxScore}</strong></span>
                  </div>

                  {/* Submission Breakdown Bars */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">Completion: {completionRate}%</span>
                      <span className="text-slate-500">
                        {completed} / {total} turned in
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${total > 0 ? (a.submittedCount / total) * 100 : 0}%` }}
                        title={`Submitted: ${a.submittedCount}`}
                      />
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${total > 0 ? (a.lateCount / total) * 100 : 0}%` }}
                        title={`Late: ${a.lateCount}`}
                      />
                      <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${total > 0 ? (a.missingCount / total) * 100 : 0}%` }}
                        title={`Missing: ${a.missingCount}`}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-[11px] text-slate-500 mt-2.5 text-center">
                      <div>
                        <span className="text-emerald-700 font-bold block">{a.submittedCount}</span>
                        <span>Submitted</span>
                      </div>
                      <div>
                        <span className="text-amber-700 font-bold block">{a.lateCount}</span>
                        <span>Late</span>
                      </div>
                      <div>
                        <span className="text-rose-700 font-bold block">{a.missingCount}</span>
                        <span>Missing</span>
                      </div>
                      <div>
                        <span className="text-slate-700 font-bold block">{a.pendingCount}</span>
                        <span>Pending</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleViewSubmissions(a.id)}
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Review Student Submissions
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Assignment Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Assignment"
        description="Assign coursework to a class and automatically initialize submission tracking"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Class *</label>
            <select
              required
              value={createForm.classId}
              onChange={(e) => setCreateForm({ ...createForm, classId: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.subject})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Assignment Title *</label>
            <input
              type="text"
              required
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder="e.g. Kinematics Problem Set 2"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={createForm.dueDate}
                onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Max Score *</label>
              <input
                type="number"
                min="1"
                required
                value={createForm.maxScore}
                onChange={(e) => setCreateForm({ ...createForm, maxScore: parseInt(e.target.value, 10) || 100 })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Instructions / Description</label>
            <textarea
              rows={3}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Questions to solve, submission guidelines..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={creating}>
              Create Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Submissions Modal */}
      <Modal
        isOpen={isSubmissionsModalOpen}
        onClose={() => setIsSubmissionsModalOpen(false)}
        title={activeAssignment?.title || 'Submissions'}
        description={`Due: ${activeAssignment?.due_date} · Max Score: ${activeAssignment?.max_score}`}
        maxWidth="lg"
      >
        {loadingSubmissions ? (
          <LoadingSpinner message="Loading submissions roster..." />
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto max-h-[55vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3 text-right">Quick Mark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeAssignment?.submissions || []).map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">{sub.student_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{sub.student_code}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            sub.status === 'SUBMITTED'
                              ? 'low'
                              : sub.status === 'LATE'
                              ? 'medium'
                              : sub.status === 'MISSING'
                              ? 'high'
                              : 'neutral'
                          }
                        >
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium">
                        {sub.score != null ? `${sub.score} / ${activeAssignment?.max_score}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleUpdateSubmissionStatus(sub.id, 'SUBMITTED', activeAssignment?.max_score)}
                            className="px-2 py-0.5 text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-medium"
                          >
                            Full Credit
                          </button>
                          <button
                            onClick={() => handleUpdateSubmissionStatus(sub.id, 'MISSING', null)}
                            className="px-2 py-0.5 text-[11px] bg-rose-50 text-rose-700 hover:bg-rose-100 rounded font-medium"
                          >
                            Missing
                          </button>
                          <button
                            onClick={() => handleUpdateSubmissionStatus(sub.id, 'LATE', Math.round(activeAssignment?.max_score * 0.7))}
                            className="px-2 py-0.5 text-[11px] bg-amber-50 text-amber-700 hover:bg-amber-100 rounded font-medium"
                          >
                            Late
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
