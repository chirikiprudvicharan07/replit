import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { classService, studentService } from '../services/api.ts';
import { Button } from '../components/Button.tsx';
import { Modal } from '../components/Modal.tsx';
import { Badge } from '../components/Badge.tsx';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import { SearchFilterBar } from '../components/SearchFilterBar.tsx';
import {
  Users,
  CalendarCheck,
  Award,
  BookOpen,
  Plus,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export const ClassDetailPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student filter & search
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');

  // Add Student Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    studentCode: '',
    dateOfBirth: '',
  });

  useEffect(() => {
    if (classId) {
      loadClass();
    }
  }, [classId]);

  const loadClass = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await classService.getById(classId!);
      if (res.data.success) {
        setClassData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not load class details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStudent(true);
    setError(null);
    try {
      const res = await studentService.create({
        classId: classId!,
        ...studentForm,
      });
      if (res.data.success) {
        setIsModalOpen(false);
        setStudentForm({ name: '', email: '', studentCode: '', dateOfBirth: '' });
        loadClass();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to add student');
    } finally {
      setSavingStudent(false);
    }
  };

  const openAddStudent = () => {
    setEditingStudentId(null);
    setStudentForm({ name: '', email: '', studentCode: '', dateOfBirth: '' });
    setIsModalOpen(true);
  };

  const openEditStudent = (student: any) => {
    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name || '',
      email: student.email || '',
      studentCode: student.student_code || '',
      dateOfBirth: student.date_of_birth || '',
    });
    setIsModalOpen(true);
  };

  const closeStudentModal = () => {
    setIsModalOpen(false);
    setEditingStudentId(null);
    setStudentForm({ name: '', email: '', studentCode: '', dateOfBirth: '' });
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentId) {
      await handleAddStudent(e);
      return;
    }

    setSavingStudent(true);
    setError(null);
    try {
      const res = await studentService.update(editingStudentId, {
        classId: classId!,
        ...studentForm,
      });
      if (res.data.success) {
        closeStudentModal();
        await loadClass();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update student');
    } finally {
      setSavingStudent(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading class details and roster..." />;
  }

  if (!classData) {
    return (
      <EmptyState
        title="Class not found"
        description="The requested class does not exist or you do not have permission to view it."
        actionText="Back to Classes"
        onAction={() => window.history.back()}
      />
    );
  }

  // Filter students
  let students = classData.students || [];
  if (search) {
    students = students.filter(
      (s: any) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.student_code.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (riskFilter !== 'ALL') {
    students = students.filter((s: any) => s.latestRisk === riskFilter);
  }

  // Sort
  students.sort((a: any, b: any) => {
    if (sortBy === 'attendance') return b.attendancePercentage - a.attendancePercentage;
    if (sortBy === 'marks') return b.averageMarks - a.averageMarks;
    if (sortBy === 'risk') return (b.latestRiskScore || 0) - (a.latestRiskScore || 0);
    return a.name.localeCompare(b.name);
  });

  // Calculate Class Metrics
  const totalStudents = classData.students?.length || 0;
  const avgAttendance =
    totalStudents > 0
      ? Number(
          (
            classData.students.reduce((acc: number, s: any) => acc + s.attendancePercentage, 0) /
            totalStudents
          ).toFixed(1)
        )
      : 100;
  const avgMarks =
    totalStudents > 0
      ? Number(
          (
            classData.students.reduce((acc: number, s: any) => acc + s.averageMarks, 0) /
            totalStudents
          ).toFixed(1)
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/classes"
          className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Classes
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{classData.name}</h1>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                {classData.subject}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Academic Year: <strong className="text-slate-700">{classData.academic_year}</strong> ·{' '}
              {classData.description || 'Active syllabus cohort'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/attendance">
              <Button size="sm" variant="outline" icon={<CalendarCheck className="w-3.5 h-3.5" />}>
                Mark Attendance
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={openAddStudent}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Enroll Student
            </Button>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Class Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Students</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalStudents}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Enrolled cohort</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Class Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{avgAttendance}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Average presence</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Average Marks</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{avgMarks}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Assessment average</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Assignments</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {classData.assignments?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total coursework units</div>
        </div>
      </div>

      {/* Student Roster Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Enrolled Student Roster</h2>
            <p className="text-xs text-slate-500">
              Track attendance, average scores, and early support indicators per student
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Showing <strong>{students.length}</strong> of {totalStudents} students
          </span>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Filter student by name or code..."
            filterLabel="Support Risk"
            filterValue={riskFilter}
            onFilterChange={setRiskFilter}
            filterOptions={[
              { label: 'All Students', value: 'ALL' },
              { label: 'High Support', value: 'HIGH' },
              { label: 'Medium Support', value: 'MEDIUM' },
              { label: 'Low Support', value: 'LOW' },
            ]}
          >
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700"
              >
                <option value="name">Name (A-Z)</option>
                <option value="attendance">Attendance (High to Low)</option>
                <option value="marks">Average Marks (High to Low)</option>
                <option value="risk">Support Need (Highest First)</option>
              </select>
            </div>
          </SearchFilterBar>
        </div>

        {students.length === 0 ? (
          <EmptyState
            title="No students match criteria"
            description="Adjust search filters or enroll new students to this section."
            actionText="Enroll Student"
            onAction={openAddStudent}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Student Code</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Avg Marks</th>
                  <th className="py-3 px-4">Support Indicator</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((stu: any) => (
                  <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/students/${stu.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600 flex items-center gap-1.5"
                      >
                        {stu.name}
                      </Link>
                      {stu.email && <span className="text-[11px] text-slate-400 block">{stu.email}</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{stu.student_code}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          stu.attendancePercentage < 75
                            ? 'text-rose-600'
                            : stu.attendancePercentage < 85
                            ? 'text-amber-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {stu.attendancePercentage}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          stu.averageMarks < 50
                            ? 'text-rose-600'
                            : stu.averageMarks < 70
                            ? 'text-amber-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {stu.averageMarks}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {stu.latestRisk === 'HIGH' && (
                        <Badge variant="high">
                          High Support {stu.latestRiskScore ? `(${stu.latestRiskScore})` : ''}
                        </Badge>
                      )}
                      {stu.latestRisk === 'MEDIUM' && (
                        <Badge variant="medium">
                          Medium Support {stu.latestRiskScore ? `(${stu.latestRiskScore})` : ''}
                        </Badge>
                      )}
                      {stu.latestRisk === 'LOW' && (
                        <Badge variant="low">Low Support</Badge>
                      )}
                      {stu.latestRisk === 'NOT_ANALYZED' && (
                        <span className="text-slate-400 text-xs">Not Analyzed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/students/${stu.id}`}>
                          <Button size="sm" variant="ghost" icon={<ChevronRight className="w-3.5 h-3.5" />}>
                            Profile
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditStudent(stu)}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enroll Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeStudentModal}
        title={editingStudentId ? 'Update Student' : 'Enroll Student in Class'}
        description={
          editingStudentId
            ? `Update this student in ${classData.name}`
            : `Add a new student directly into ${classData.name}`
        }
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Student Full Name *</label>
            <input
              type="text"
              required
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              placeholder="e.g. Maya Lin"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Student Code / ID *</label>
            <input
              type="text"
              required
              value={studentForm.studentCode}
              onChange={(e) => setStudentForm({ ...studentForm, studentCode: e.target.value })}
              placeholder="e.g. STU-1025"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={studentForm.email}
              onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
              placeholder="student@school.edu"
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
            <Button type="button" variant="ghost" size="sm" onClick={closeStudentModal}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={savingStudent}>
              {editingStudentId ? 'Save Changes' : 'Enroll Student'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};