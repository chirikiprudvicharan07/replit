import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentService, classService } from '../services/api.ts';
import { Button } from '../components/Button.tsx';
import { Badge } from '../components/Badge.tsx';
import { Modal } from '../components/Modal.tsx';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import { SearchFilterBar } from '../components/SearchFilterBar.tsx';
import { Users, Sparkles, ChevronRight, AlertTriangle, ArrowUpDown, Plus } from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [sortBy, setSortBy] = useState('risk');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [classForm, setClassForm] = useState({
    name: '',
    subject: '',
    academicYear: '2025-2026',
    description: '',
  });
  const [studentForm, setStudentForm] = useState({
    classId: '',
    name: '',
    email: '',
    studentCode: '',
    dateOfBirth: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedRisk, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stuRes, clsRes] = await Promise.all([
        studentService.getAll({
          classId: selectedClass === 'ALL' ? undefined : selectedClass,
          risk: selectedRisk === 'ALL' ? undefined : selectedRisk,
          search: search || undefined,
        }),
        classService.getAll(),
      ]);

      if (stuRes.data.success) setStudents(stuRes.data.data);
      if (clsRes.data.success) setClasses(clsRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not load students');
    } finally {
      setLoading(false);
    }
  };

  // Sort local list
  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === 'risk') return (b.latestRiskScore || 0) - (a.latestRiskScore || 0);
    if (sortBy === 'attendance-asc') return a.attendancePercentage - b.attendancePercentage;
    if (sortBy === 'attendance-desc') return b.attendancePercentage - a.attendancePercentage;
    if (sortBy === 'marks-asc') return a.averageMarks - b.averageMarks;
    if (sortBy === 'marks-desc') return b.averageMarks - a.averageMarks;
    return a.name.localeCompare(b.name);
  });

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setShowClassForm(false);
    setStudentForm({ classId: '', name: '', email: '', studentCode: '', dateOfBirth: '' });
    setClassForm({ name: '', subject: '', academicYear: '2025-2026', description: '' });
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStudent(true);
    setError(null);

    try {
      const res = await studentService.create(studentForm);
      if (res.data.success) {
        closeAddModal();
        await loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to add student');
    } finally {
      setSavingStudent(false);
    }
  };

  const handleCreateClass = async () => {
    if (!classForm.name.trim() || !classForm.subject.trim() || !classForm.academicYear.trim()) {
      setError('Class name, subject, and academic year are required');
      return;
    }

    setIsCreatingClass(true);
    setError(null);
    try {
      const res = await classService.create(classForm);
      if (res.data.success) {
        const createdClass = res.data.data;
        setClasses((currentClasses) => [createdClass, ...currentClasses]);
        setStudentForm((currentForm) => ({ ...currentForm, classId: createdClass.id }));
        setClassForm({ name: '', subject: '', academicYear: '2025-2026', description: '' });
        setShowClassForm(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create class');
    } finally {
      setIsCreatingClass(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Student Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor attendance, assessment trends, and academic support indicators
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Student
          </Button>
          <Link to="/ai-insights">
            <Button size="sm" variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />}>
              AI Support Engine
            </Button>
          </Link>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search student by name, student code, or email..."
        >
          {/* Class Filter */}
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

          {/* Risk Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Support:</span>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Indicators</option>
              <option value="HIGH">High Support</option>
              <option value="MEDIUM">Medium Support</option>
              <option value="LOW">Low Support</option>
              <option value="NOT_ANALYZED">Not Analyzed</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="risk">Support Need (Highest First)</option>
              <option value="attendance-asc">Attendance (Lowest First)</option>
              <option value="attendance-desc">Attendance (Highest First)</option>
              <option value="marks-asc">Marks (Lowest First)</option>
              <option value="marks-desc">Marks (Highest First)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </SearchFilterBar>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading student roster..." />
      ) : sortedStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="w-10 h-10" />}
          title="No students found"
          description="Try adjusting your search criteria or enroll new students in your classes."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Marks Average</th>
                  <th className="py-3 px-4">Missing Work</th>
                  <th className="py-3 px-4">Support Indicator</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/students/${s.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600"
                      >
                        {s.name}
                      </Link>
                      {s.email && <span className="text-[11px] text-slate-400 block">{s.email}</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{s.studentCode}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-700">{s.className}</span>
                      <span className="text-[11px] text-slate-400 block">{s.subject}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          s.attendancePercentage < 75
                            ? 'text-rose-600'
                            : s.attendancePercentage < 85
                            ? 'text-amber-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {s.attendancePercentage}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          s.averageMarks < 50
                            ? 'text-rose-600'
                            : s.averageMarks < 70
                            ? 'text-amber-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {s.averageMarks}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.missingAssignments > 0 ? (
                        <span className="text-rose-600 font-semibold">
                          {s.missingAssignments} missing
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.latestRisk === 'HIGH' && (
                        <Badge variant="high">
                          High Support ({s.latestRiskScore ?? 75})
                        </Badge>
                      )}
                      {s.latestRisk === 'MEDIUM' && (
                        <Badge variant="medium">
                          Medium Support ({s.latestRiskScore ?? 50})
                        </Badge>
                      )}
                      {s.latestRisk === 'LOW' && (
                        <Badge variant="low">Low Support ({s.latestRiskScore ?? 15})</Badge>
                      )}
                      {s.latestRisk === 'NOT_ANALYZED' && (
                        <span className="text-slate-400 text-xs">Not Analyzed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link to={`/students/${s.id}`}>
                        <Button size="sm" variant="ghost" icon={<ChevronRight className="w-3.5 h-3.5" />}>
                          View Profile
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title="Add Student"
        description="Enroll a student in one of your classes"
      >
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700">Class *</label>
              <button
                type="button"
                onClick={() => setShowClassForm((visible) => !visible)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                {showClassForm ? 'Choose existing class' : '+ Add new class'}
              </button>
            </div>
            {showClassForm ? (
              <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                <p className="text-[11px] text-slate-500">Create a class and it will be selected automatically.</p>
                <input
                  required
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="Class / section name"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  required
                  value={classForm.subject}
                  onChange={(e) => setClassForm({ ...classForm, subject: e.target.value })}
                  placeholder="Subject"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  required
                  value={classForm.academicYear}
                  onChange={(e) => setClassForm({ ...classForm, academicYear: e.target.value })}
                  placeholder="Academic year"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={classForm.description}
                  onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="button" size="sm" onClick={handleCreateClass} isLoading={isCreatingClass}>
                  Create and Select Class
                </Button>
              </div>
            ) : (
              <select
                required
                value={studentForm.classId}
                onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a class</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} - {classItem.subject}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Student Full Name *</label>
            <input
              required
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              placeholder="e.g. Ananya Sharma"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Student Code / ID *</label>
            <input
              required
              value={studentForm.studentCode}
              onChange={(e) => setStudentForm({ ...studentForm, studentCode: e.target.value })}
              placeholder="e.g. STU-001"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={studentForm.email}
              onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
              placeholder="student@example.com"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={studentForm.dateOfBirth}
              onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={savingStudent}>
              Add Student
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
