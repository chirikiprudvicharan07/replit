import React, { useState, useEffect } from 'react';
import { classService, attendanceService } from '../services/api.ts';
import { Button } from '../components/Button.tsx';
import { Badge } from '../components/Badge.tsx';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { CalendarCheck, CheckCheck, Save, Clock, AlertCircle } from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, { status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; remarks: string }>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadClassRosterAndAttendance();
    }
  }, [selectedClassId, selectedDate]);

  const loadClasses = async () => {
    try {
      const res = await classService.getAll();
      if (res.data.success && res.data.data.length > 0) {
        setClasses(res.data.data);
        setSelectedClassId(res.data.data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not load classes');
      setLoading(false);
    }
  };

  const loadClassRosterAndAttendance = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // 1. Get class details for student list
      const classRes = await classService.getById(selectedClassId);
      const studentList = classRes.data.data.students || [];
      setStudents(studentList);

      // 2. Get attendance for this date
      const attRes = await attendanceService.getAll({
        classId: selectedClassId,
        date: selectedDate,
      });

      const existingRecords = attRes.data.data || [];
      const recordsMap: Record<string, { status: any; remarks: string }> = {};

      studentList.forEach((s: any) => {
        const found = existingRecords.find((r: any) => r.student_id === s.id);
        if (found) {
          recordsMap[s.id] = { status: found.status, remarks: found.remarks || '' };
        } else {
          // Default to PRESENT for easy roll call
          recordsMap[s.id] = { status: 'PRESENT', remarks: '' };
        }
      });

      setAttendanceRecords(recordsMap);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (
    studentId: string,
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  ) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleMarkAll = (status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    const updated: Record<string, any> = {};
    students.forEach((s) => {
      updated[s.id] = {
        ...attendanceRecords[s.id],
        status,
      };
    });
    setAttendanceRecords(updated);
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const records = Object.entries(attendanceRecords).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        remarks: data.remarks || '',
      }));

      const res = await attendanceService.recordBulk({
        classId: selectedClassId,
        date: selectedDate,
        records,
      });

      if (res.data.success) {
        setSuccessMessage(`Saved roll call for ${records.length} students on ${selectedDate}!`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save attendance records');
    } finally {
      setSaving(false);
    }
  };

  // Stats for current date selection
  const total = students.length;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;

  Object.values(attendanceRecords).forEach((r) => {
    if (r.status === 'PRESENT') presentCount++;
    else if (r.status === 'ABSENT') absentCount++;
    else if (r.status === 'LATE') lateCount++;
    else if (r.status === 'EXCUSED') excusedCount++;
  });

  const dailyRate =
    total > 0 ? Number((((presentCount + lateCount * 0.5) / total) * 100).toFixed(1)) : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Attendance Roll Call</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log daily classroom presence, late arrivals, and absences
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSaveAttendance}
          isLoading={saving}
          icon={<Save className="w-4 h-4" />}
        >
          Save Roll Call
        </Button>
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

      {/* Class & Date Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Select Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 min-w-48"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.subject})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Roll Call Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Quick Batch Actions */}
        <div className="flex items-center gap-2 pt-2 sm:pt-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMarkAll('PRESENT')}
            icon={<CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
          >
            All Present
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMarkAll('ABSENT')}
            icon={<AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
          >
            All Absent
          </Button>
        </div>
      </div>

      {/* Summary Stats for Day */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Cohort</span>
          <span className="text-xl font-bold text-slate-900">{total}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Present</span>
          <span className="text-xl font-bold text-emerald-700">{presentCount}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-rose-600 block">Absent</span>
          <span className="text-xl font-bold text-rose-700">{absentCount}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-amber-600 block">Late</span>
          <span className="text-xl font-bold text-amber-700">{lateCount}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-blue-600 block">Attendance Rate</span>
          <span className="text-xl font-bold text-blue-700">{dailyRate}%</span>
        </div>
      </div>

      {/* Student Attendance List */}
      {loading ? (
        <LoadingSpinner message="Loading roll call records..." />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="w-10 h-10" />}
          title="No students in this class"
          description="Enroll students to this class section first before recording attendance."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Historical Rate</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => {
                  const record = attendanceRecords[s.id] || { status: 'PRESENT', remarks: '' };
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{s.student_code}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            s.attendancePercentage < 75
                              ? 'text-rose-600'
                              : s.attendancePercentage < 85
                              ? 'text-amber-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {s.attendancePercentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {/* Segmented status buttons */}
                        <div className="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-lg w-max mx-auto">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'PRESENT')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                              record.status === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'LATE')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                              record.status === 'LATE'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'ABSENT')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                              record.status === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'EXCUSED')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                              record.status === 'EXCUSED'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Excused
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={record.remarks}
                          onChange={(e) => handleRemarksChange(s.id, e.target.value)}
                          placeholder="Optional remark..."
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
