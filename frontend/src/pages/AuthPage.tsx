import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { currentUser } from '../lib/api';

export const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const isRegister = location.pathname === '/register';
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'TEAM_MEMBER' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) await register(form);
      else await login(form.email, form.password);
      const next = new URLSearchParams(location.search).get('next');
      const destination =
        next && next.startsWith('/') && !next.startsWith('//')
          ? next
          : currentUser()?.role === 'FACULTY'
          ? '/faculty/dashboard'
          : '/dashboard';
      navigate(destination);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Unable to connect to CapstoneHub';
      if (raw.includes("Can't reach database") || raw.toLowerCase().includes('prisma')) {
        setError('Database connection error. Please ensure the database server is running at localhost:5432.');
      } else {
        setError(raw);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      {/* Left branding panel */}
      <section className="hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between border-r border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 font-semibold text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-mono text-xs font-semibold text-white">
              CH
            </div>
            <span>CapstoneHub</span>
          </div>

          <div className="mt-24 max-w-lg">
            <span className="spec-key bg-slate-800 text-slate-300 border-slate-700">
              ACADEMIC SOFTWARE ENGINEERING
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight leading-tight text-white">
              Project management and lifecycle traceability for engineering capstones.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Centralize SRS requirements, backlog ordering, sprint execution, code commits, and faculty evaluations in a single workspace.
            </p>

            <div className="mt-8 space-y-2 border-t border-slate-800 pt-6 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>SRS Requirements Specification (IEEE 830)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span>Agile Sprints & Kanban Board Execution</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span>Automated Traceability Matrix to Git Commits</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Faculty Advisor Feedback & Evaluation</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 font-mono">
          CapstoneHub · Department of Computer Science & Engineering
        </p>
      </section>

      {/* Right authentication form */}
      <section className="flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-sm">
          {/* Mobile brand mark */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-mono text-xs font-semibold text-white">
              CH
            </div>
            <span className="text-base font-semibold text-slate-900">CapstoneHub</span>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              {isRegister ? 'Create an account' : 'Sign in to workspace'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {isRegister
                ? 'Join your capstone project team or register as an advisor.'
                : 'Enter your credentials to access your capstone projects.'}
            </p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {isRegister && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-700">Full name</span>
                <div className="relative">
                  <UserRound className="absolute left-3 top-2.5 text-slate-400" size={15} />
                  <input
                    className="input pl-9"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Jane Doe"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Academic email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  className="input pl-9"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="student@university.edu"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Password</span>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  className="input pl-9"
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder="••••••••"
                />
              </div>
            </label>

            {isRegister && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-700">Role in program</span>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="TEAM_MEMBER">Student / Team Member</option>
                  <option value="FACULTY">Faculty Advisor / Evaluator</option>
                </select>
              </label>
            )}

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                {error}
              </div>
            )}

            <button className="btn-primary w-full mt-2" disabled={busy}>
              {busy ? 'Authenticating…' : isRegister ? 'Register workspace account' : 'Sign in'}
              <ArrowRight size={14} />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            {isRegister ? 'Already registered?' : 'Need an account?'}{' '}
            <Link
              className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              to={isRegister ? '/login' : '/register'}
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>

          {/* Quick demo preview sign in */}
          <div className="mt-8 border-t border-slate-200/80 pt-5">
            <p className="text-center text-[10px] font-medium text-slate-400 font-mono tracking-wider">
              OFFLINE / PREVIEW ACCESS
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                id="demo-student"
                onClick={() => {
                  const u = { id: 'lead-1', name: 'Jane Doe', email: 'jane.doe@university.edu', role: 'TEAM_LEAD' as const };
                  localStorage.setItem('capstonehub_token', 'demo-token');
                  localStorage.setItem('capstonehub_user', JSON.stringify(u));
                  window.location.href = '/dashboard';
                }}
                className="btn-secondary text-xs py-1.5 justify-center font-mono"
              >
                Team Lead Demo
              </button>
              <button
                type="button"
                id="demo-faculty"
                onClick={() => {
                  const u = { id: 'fac-1', name: 'Dr. Alan Turing', email: 'turing@university.edu', role: 'FACULTY' as const };
                  localStorage.setItem('capstonehub_token', 'demo-token');
                  localStorage.setItem('capstonehub_user', JSON.stringify(u));
                  window.location.href = '/faculty/dashboard';
                }}
                className="btn-secondary text-xs py-1.5 justify-center font-mono"
              >
                Faculty Demo
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
