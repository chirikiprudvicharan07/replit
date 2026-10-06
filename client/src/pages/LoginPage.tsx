import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Button } from '../components/Button.tsx';
import { ErrorAlert } from '../components/ErrorAlert.tsx';
import { GraduationCap, Lock, Mail } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.login({ email, password });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        navigate('/dashboard');
      } else {
        setError(res.data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || err.response?.data?.message || 'Invalid credentials'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('teacher@classpulse.edu');
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          ClassPulse AI
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600">
          Turn student performance data into early, actionable support.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
            Sign In to Teacher Dashboard
          </h3>

          {error && <ErrorAlert message={error} onDismiss={() => setError(null)} className="mb-4" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.edu"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full">
              Sign In
            </Button>
          </form>

          {/* Quick Demo Fill Credentials for Hackathon Evaluator */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
              <div className="font-semibold text-blue-950 flex items-center justify-between">
                <span>Evaluator Quick Login</span>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-xs bg-blue-600 text-white font-medium px-2 py-0.5 rounded hover:bg-blue-700 transition-colors"
                >
                  Autofill
                </button>
              </div>
              <p className="text-[11px] text-blue-800 mt-1">
                Email: <code className="bg-blue-100/80 px-1 py-0.2 rounded font-mono">teacher@classpulse.edu</code>
                <br />
                Password: <code className="bg-blue-100/80 px-1 py-0.2 rounded font-mono">password123</code>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-600">
            Do not have an account?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
              Register as Teacher
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
