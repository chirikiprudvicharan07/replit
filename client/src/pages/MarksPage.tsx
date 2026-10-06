import React, { useState, useEffect } from 'react';
import { markService, classService, studentService } from '../services/api.ts';
import { Button } from '../components/Button.tsx';
import { Modal } from '../components/Modal.tsx';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import { SearchFilterBar } from '../components/SearchFilterBar.tsx';
import { Award, Plus, Trash2, Edit3, TrendingUp, Filter } from 'lucide-react';

export const MarksPage: React.FC = () => {
  const [marks, setMarks] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [search, setSearch] = useState('');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    classId: '',
    studentId: '',
    subject: '',
    assessmentName: '',
    score: 80,
    maxScore: 100,
    assessmentDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  useEffect(() => {
    loadClasses();
    loadMarks();
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      const res = await classService.getAll();
      if (res.data.success) {
        setClasses(res.data.data);
      }
    } catch (err: any) {}
  };

  const loadMarks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await markService.getAll({
        classId: selectedClass === 'ALL' ? undefined : selectedClass,
      });
      if (res.data.success) {
        setMarks(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not load marks records');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelectInModal = async (classId: string) => {
    const selected = classes.find((c) => c.id === classId);
    setForm((prev) => ({
      ...prev,
      classId,
      subject: selected ? selected.subject : prev.subject,
    }));

    try {
      const res = await studentService.getAll({ classId });
      if (res.data.success) {
        setStudents(res.data.data);
        if (res.data.data.length > 0) {
          setForm((prev) => ({ ...prev, studentId: res.data.data[0].id }));
        }
      }
    } catch (err) {}
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    const firstClass = classes[0];
    setForm({
      classId: firstClass?.id || '',
      studentId: '',
      subject: firstClass?.subject || 'Mathematics',
      assessmentName: '',
      score: 80,
      maxScore: 100,
      assessmentDate: new Date().toISOString().split('T')[0],
      remarks: '',
    });
    if (firstClass) {
      handleClassSelectInModal(firstClass.id);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (m: any) => {
    setEditingId(m.id);
    setForm({
      classId: m.class_id,
      studentId: m.student_id,
      subject: m.subject,
      assessmentName: m.assessment_name,
      score: Number(m.score),
      maxScore: Number(m.max_score),
      assessmentDate: m.assessment_date,
      remarks: m.remarks || '',
    });
    // Load students for this class
    try {
      const res = await studentService.getAll({ classId: m.class_id });
      if (res.data.success) setStudents(res.data.data);
    } catch (err) {}
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await markService.update(editingId, {
          subject: form.subject,
          assessmentName: form.assessmentName,
          score: Number(form.score),
          maxScore: Number(form.maxScore),
          assessmentDate: form.assessmentDate,
          remarks: form.remarks,
        });
      } else {
        await markService.create({
          classId: form.classId,
          studentId: form.studentId,
          subject: form.subject,
          assessmentName: form.assessmentName,
          score: Number(form.score),
          maxScore: Number(form.maxScore),
          assessmentDate: form.assessmentDate,
          remarks: form.remarks,
        });
      }
      setIsModalOpen(false);
      loadMarks();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save assessment score');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (markId: string) => {
    if (!window.confirm('Delete this assessment score?')) return;
    try {
      await markService.delete(markId);
      loadMarks();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete score');
    }
  };

  // Filter marks
  const filteredMarks = marks.filter((m) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      m.student_name.toLowerCase().includes(term) ||
      m.assessment_name.toLowerCase().includes(term) ||
      m.subject.toLowerCase().includes(term)
    );
  });

  // Calculate stats
  const total = filteredMarks.length;
  let totalScorePct = 0;
  let highestPct = 0;
  let lowestPct = 100;

  filteredMarks.forEach((m) => {
    const pct = m.percentage;
    totalScorePct += pct;
    if (pct > highestPct) highestPct = pct;
    if (pct < lowestPct) lowestPct = pct;
  });

  const averagePct = total > 0 ? Number((totalScorePct / total).toFixed(1)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Marks & Assessments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log formative evaluations, test scores, and grade trajectories
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreateModal} icon={<Plus className="w-4 h-4" />}>
          Record Assessment Score
        </Button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Evaluations Logged</span>
          <span className="text-xl font-bold text-slate-900">{total}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-blue-600 block">Average Score</span>
          <span className="text-xl font-bold text-blue-700">{averagePct}%</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Top Mark</span>
          <span className="text-xl font-bold text-emerald-700">{total > 0 ? highestPct : 0}%</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-rose-600 block">Lowest Mark</span>
          <span className="text-xl font-bold text-rose-700">{total > 0 ? lowestPct : 0}%</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by student name, assessment, or subject..."
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

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Loading assessment scores ledger..." />
      ) : filteredMarks.length === 0 ? (
        <EmptyState
          icon={<Award className="w-10 h-10" />}
          title="No assessment marks found"
          description="Record formative quizzes or unit exam scores to observe performance patterns."
          actionText="Record Score"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Assessment Name</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Raw Score</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMarks.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{m.student_name}</td>
                    <td className="py-3 px-4 text-slate-800">{m.assessment_name}</td>
                    <td className="py-3 px-4 text-slate-600">{m.subject}</td>
                    <td className="py-3 px-4 text-slate-500">{m.class_name}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {m.score} / {m.maxScore}
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-slate-500">{m.assessment_date}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          className="text-slate-400 hover:text-blue-600 p-1 rounded"
                          title="Edit Score"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          title="Delete Score"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Assessment Score' : 'Record Assessment Score'}
        description="Enter score values for academic performance tracking"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {!editingId && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Class *</label>
              <select
                required
                value={form.classId}
                onChange={(e) => handleClassSelectInModal(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.subject})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!editingId && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Student *</label>
              <select
                required
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.student_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Assessment Name *</label>
            <input
              type="text"
              required
              value={form.assessmentName}
              onChange={(e) => setForm({ ...form, assessmentName: e.target.value })}
              placeholder="e.g. Unit 3 Test: Quadratic Formulas"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g. Mathematics"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Score *</label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={form.score}
                onChange={(e) => setForm({ ...form, score: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Max Score *</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={form.maxScore}
                onChange={(e) => setForm({ ...form, maxScore: parseFloat(e.target.value) || 100 })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Assessment Date *</label>
            <input
              type="date"
              required
              value={form.assessmentDate}
              onChange={(e) => setForm({ ...form, assessmentDate: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={saving}>
              {editingId ? 'Update Score' : 'Save Score'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
