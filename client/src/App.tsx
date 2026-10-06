import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { DashboardLayout } from './layouts/DashboardLayout.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ClassesPage } from './pages/ClassesPage.tsx';
import { ClassDetailPage } from './pages/ClassDetailPage.tsx';
import { StudentsPage } from './pages/StudentsPage.tsx';
import { StudentProfilePage } from './pages/StudentProfilePage.tsx';
import { AttendancePage } from './pages/AttendancePage.tsx';
import { MarksPage } from './pages/MarksPage.tsx';
import { AssignmentsPage } from './pages/AssignmentsPage.tsx';
import { AiInsightsPage } from './pages/AiInsightsPage.tsx';
import { InterventionsPage } from './pages/InterventionsPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { LoadingSpinner } from './components/LoadingSpinner.tsx';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Checking authentication session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="classes/:classId" element={<ClassDetailPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/:studentId" element={<StudentProfilePage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="marks" element={<MarksPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="ai-insights" element={<AiInsightsPage />} />
            <Route path="interventions" element={<InterventionsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
