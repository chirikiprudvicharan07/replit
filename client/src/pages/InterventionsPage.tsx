import React, { useState, useEffect } from 'react';
import { interventionService, studentService } from '../services/api.ts';
import { Button } from '../components/Button.tsx';
import { Badge } from '../components/Badge.tsx';
import { Modal } from '../components/Modal.tsx';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import { SearchFilterBar } from '../components/SearchFilterBar.tsx';
import {
  ClipboardList,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const InterventionsPage: React.FC = () => {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    title: '',
    description: '',
    priority: 'HIGH' as 'LOW' | 'MEDIUM' | 'HIGH',
    status: 'PENDING' as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
  });

  useEffect(() => {
    loadStudents();
    loadInterventions();
  }, [statusFilter, priorityFilter, search]);

  const loadStudents = async () => {
    try {
      const res = await studentService.getAll();
      if (res.data.success) {
        setStudents(res.data.data);
      }
    } catch (err) {}
  };

  const loadInterventions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await interventionService.getAll({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
        search: search || undefined,
      });
      if (res.data.success) {
        setInterventions(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not load interventions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (interventionId: string, newStatus: string) => {
    try {
      await interventionService.update(interventionId, { status: newStatus });
      loadInterventions();
    } catch (err: any) {
      setError('Could not update intervention status');
    }
  };

  const handleDelete = async (interventionId: string, title: string) => {
    if (!window.confirm(`Delete intervention "${title}"?`)) return;
    try {
      await interventionService.delete(interventionId);
      loadInterventions();
    } catch (err: any) {
      setError('Failed to delete intervention');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await interventionService.create(form);
      setIsModalOpen(false);
      setForm({
        studentId: '',
        title: '',
        description: '',
        priority: 'HIGH',
        status: 'PENDING',
      });
      loadInterventions();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create intervention');
    } finally {
      setSaving(false);
    }
  };

  // Counts
  const pendingCount = interventions.filter((i) => i.status === 'PENDING').length;
  const inProgressCount = interventions.filter((i) => i.status === 'IN_PROGRESS').length;
  const completedCount = interventions.filter((i) => i.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Intervention Action Plans
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Turn early academic indicators into active, tracked support plans
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (students.length > 0 && !form.studentId) {
              setForm((prev) => ({ ...prev, studentId: students[0].id }));
            }
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Create Intervention
        </Button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Segmented Status Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-xl">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All Actions ({interventions.length})
        </button>
        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'PENDING'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-800 hover:bg-amber-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-blue-800 hover:bg-blue-50'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          In Progress ({inProgressCount})
        </button>
        <button
          onClick={() => setStatusFilter('COMPLETED')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'COMPLETED'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Completed ({completedCount})
        </button>
      </div>

      {/* Search and Priority Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by student name or intervention title..."
        >
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </SearchFilterBar>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading active intervention plans..." />
      ) : interventions.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-10 h-10" />}
          title="No interventions found"
          description="Create customized support plans or convert AI recommendations from student profiles."
          actionText="Create Intervention"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="space-y-3.5">
          {interventions.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-all"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <Badge variant={item.priority === 'HIGH' ? 'high' : item.priority === 'MEDIUM' ? 'medium' : 'low'}>
                    {item.priority} Priority
                  </Badge>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-semibold text-slate-700">{item.student_name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">({item.student_code})</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  {item.description}
                </p>

                <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
                  <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                  {item.class_name && (
                    <>
                      <span>·</span>
                      <span>Class: {item.class_name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Workflow Status Controls */}
              <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <select
                    value={item.status}
                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none cursor-pointer ${
                      item.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : item.status === 'IN_PROGRESS'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>

                <button
                  onClick={() => handleDelete(item.id, item.title)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded"
                  title="Delete Intervention"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Student Intervention"
        description="Establish an actionable academic recovery plan"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Student *</label>
            <select
              required
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.student_code} - {s.class_name || s.className})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Intervention Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Bi-Weekly Mathematics Factoring Workshop"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="HIGH">HIGH Priority</option>
                <option value="MEDIUM">MEDIUM Priority</option>
                <option value="LOW">LOW Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Initial Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDING">PENDING</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Support Plan Details *</label>
            <textarea
              rows={4}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Action steps, weekly review times, homework targets..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={saving}>
              Create Intervention
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
