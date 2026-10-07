import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authService } from '../services/api.ts';
import { Button } from '../components/Button.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import { User, Mail, Shield, Database, Sparkles, CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authService.updateProfile({ name, email });
      if (res.data.success) {
        updateUser(res.data.data.user);
        setSuccess('Profile details updated successfully');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Teacher Profile & Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account credentials and review system security architecture
        </p>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Account Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" /> Account Information
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Role</label>
            <input
              type="text"
              disabled
              value={user?.role || 'TEACHER'}
              className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-100 text-slate-500 rounded-lg cursor-not-allowed"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" size="sm" isLoading={saving}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Security Architecture & Data Isolation Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" /> Platform Security & Data Isolation Architecture
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Database className="w-3.5 h-3.5 text-blue-600" /> PostgreSQL Multi-Tenant Isolation
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Every class, student, attendance, score, and AI analysis record is scoped with foreign keys to <code>teacher_id</code>. Ownership verification middleware prohibits unauthorized cross-tenant data access.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Server-Side Gemini AI Pipeline
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              All AI inferences are executed exclusively inside the Express backend using <code>@google/genai</code>. Raw outputs are strictly parsed and validated against deterministic Zod schemas before persisting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
