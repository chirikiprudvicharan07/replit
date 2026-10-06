import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { classService } from '../services/api.ts';
import { Button } from '../components/Button.tsx';
import { Modal } from '../components/Modal.tsx';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import { SearchFilterBar } from '../components/SearchFilterBar.tsx';
import { GraduationCap, Plus, Users, Calendar, ArrowRight, Trash2, BookOpen } from 'lucide-react';

export const ClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    academicYear: '2025-2026',
    description: '',
  });

  useEffect(() => {
    loadClasses();
  }, [search]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const res = await classService.getAll(search);
      if (res.data.success) {
        setClasses(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await classService.create(formData);
      if (res.data.success) {
        setIsModalOpen(false);
        setFormData({ name: '', subject: '', academicYear: '2025-2026', description: '' });
        loadClasses();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create class');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (classId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will also remove enrolled students, marks, and attendance.`)) {
      return;
    }
    try {
      await classService.delete(classId);
      loadClasses();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete class');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Class Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize academic sections, subjects, and student cohorts
          </p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Create New Class
        </Button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by class name, subject, or academic year..."
      />

      {loading ? (
        <LoadingSpinner message="Loading your classes..." />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-10 h-10" />}
          title="No classes found"
          description="Create your first class cohort to start tracking attendance, coursework marks, and early student support."
          actionText="Create Class"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {cls.subject}
                  </span>
                  <button
                    onClick={() => handleDelete(cls.id, cls.name)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                    title="Delete Class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-1">{cls.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {cls.description || 'No class description provided.'}
                </p>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Students
                    </span>
                    <span className="text-sm font-bold text-slate-800">{cls.studentCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Attendance
                    </span>
                    <span className="text-sm font-bold text-slate-800">{cls.avgAttendance}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Avg Marks
                    </span>
                    <span className="text-sm font-bold text-slate-800">{cls.avgPerformance}%</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{cls.academic_year}</span>
                </div>
                <Link
                  to={`/classes/${cls.id}`}
                  className="font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  Manage Roster <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Class"
        description="Add a class cohort to track student academic progress"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Class / Section Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Grade 10 - Section B"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g. Mathematics, Chemistry, World History"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Academic Year *</label>
            <input
              type="text"
              required
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              placeholder="e.g. 2025-2026"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief overview or syllabus objectives..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={creating}>
              Create Class
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
