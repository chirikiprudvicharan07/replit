import axios from 'axios';

// Ensure same-origin '/api' is used in browser environments to prevent mixed-content and unreachable localhost:5000 errors
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) return '/api';
  if (envUrl.startsWith('/')) return envUrl;
  if (typeof window !== 'undefined') {
    // If the browser is accessing via Cloud Run, remote domain, or if env points to 5000, force relative '/api'
    if (
      envUrl.includes('localhost:5000') ||
      envUrl.includes('127.0.0.1:5000') ||
      !window.location.hostname.includes('localhost')
    ) {
      return '/api';
    }
  }
  return envUrl;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('classpulse_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('classpulse_token');
      localStorage.removeItem('classpulse_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth Services
export const authService = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { name: string; email: string; password: string }) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data: { name: string; email?: string }) => api.put('/profile', data),
};

// Classes
export const classService = {
  getAll: (search?: string) => api.get('/classes', { params: { search } }),
  getById: (id: string) => api.get(`/classes/${id}`),
  create: (data: { name: string; subject: string; academicYear: string; description?: string }) =>
    api.post('/classes', data),
  update: (id: string, data: { name: string; subject: string; academicYear: string; description?: string }) =>
    api.put(`/classes/${id}`, data),
  delete: (id: string) => api.delete(`/classes/${id}`),
};

// Students
export const studentService = {
  getAll: (params?: { classId?: string; search?: string; risk?: string }) =>
    api.get('/students', { params }),
  getById: (id: string) => api.get(`/students/${id}`),
  create: (data: { classId: string; name: string; email?: string; studentCode: string; dateOfBirth?: string }) =>
    api.post('/students', data),
  update: (id: string, data: { classId: string; name: string; email?: string; studentCode: string; dateOfBirth?: string }) =>
    api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
};

// Attendance
export const attendanceService = {
  getAll: (params?: { classId?: string; studentId?: string; date?: string; startDate?: string; endDate?: string }) =>
    api.get('/attendance', { params }),
  recordBulk: (data: {
    classId: string;
    date: string;
    records: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; remarks?: string }>;
  }) => api.post('/attendance', data),
  recordSingle: (data: {
    classId: string;
    studentId: string;
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    remarks?: string;
  }) => api.post('/attendance', data),
  update: (id: string, data: { status: string; remarks?: string }) => api.put(`/attendance/${id}`, data),
  delete: (id: string) => api.delete(`/attendance/${id}`),
};

// Marks
export const markService = {
  getAll: (params?: { classId?: string; studentId?: string; subject?: string }) =>
    api.get('/marks', { params }),
  create: (data: {
    studentId: string;
    classId: string;
    subject: string;
    assessmentName: string;
    score: number;
    maxScore: number;
    assessmentDate: string;
    remarks?: string;
  }) => api.post('/marks', data),
  update: (id: string, data: any) => api.put(`/marks/${id}`, data),
  delete: (id: string) => api.delete(`/marks/${id}`),
};

// Assignments
export const assignmentService = {
  getAll: (params?: { classId?: string; search?: string }) => api.get('/assignments', { params }),
  getById: (id: string) => api.get(`/assignments/${id}`),
  create: (data: { classId: string; title: string; description?: string; dueDate: string; maxScore?: number }) =>
    api.post('/assignments', data),
  update: (id: string, data: any) => api.put(`/assignments/${id}`, data),
  delete: (id: string) => api.delete(`/assignments/${id}`),
};

// Submissions
export const submissionService = {
  getAll: (params?: { assignmentId?: string; studentId?: string }) => api.get('/submissions', { params }),
  record: (data: {
    assignmentId: string;
    studentId: string;
    status: 'PENDING' | 'SUBMITTED' | 'LATE' | 'MISSING';
    score?: number | null;
    remarks?: string;
  }) => api.post('/submissions', data),
  update: (id: string, data: any) => api.put(`/submissions/${id}`, data),
  delete: (id: string) => api.delete(`/submissions/${id}`),
};

// AI Early Support
export const aiService = {
  analyzeStudent: (studentId: string) => api.post(`/ai/analyze-student/${studentId}`),
  getAnalyses: (params?: { studentId?: string; classId?: string; risk?: string; search?: string }) =>
    api.get('/ai/analyses', { params }),
  getAnalysisById: (id: string) => api.get(`/ai/analyses/${id}`),
};

// Interventions
export const interventionService = {
  getAll: (params?: { studentId?: string; status?: string; priority?: string; search?: string }) =>
    api.get('/interventions', { params }),
  create: (data: {
    studentId: string;
    aiAnalysisId?: string | null;
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  }) => api.post('/interventions', data),
  update: (id: string, data: { status?: string; title?: string; description?: string; priority?: string }) =>
    api.put(`/interventions/${id}`, data),
  delete: (id: string) => api.delete(`/interventions/${id}`),
};

// Dashboard Analytics
export const dashboardService = {
  getOverview: () => api.get('/dashboard/overview'),
  getAttendanceStats: () => api.get('/dashboard/attendance'),
  getPerformanceStats: () => api.get('/dashboard/performance'),
  getRiskDistribution: () => api.get('/dashboard/risk'),
};
