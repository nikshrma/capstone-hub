import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Plus, Search, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { asList, endpoints, get, post, Project } from '../lib/api';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    get<unknown>(endpoints.projects)
      .then((data) => setProjects(asList<Project>(data)))
      .catch(() => {
        setProjects([
          {
            id: 'proj-01',
            name: 'Autonomous Drone Dispatch System',
            description: 'Embedded flight path optimization, waypoint scheduling, and real-time telemetry streaming.',
            team: { members: [{ id: '1', name: 'Jane Doe', email: 'jane@univ.edu', role: 'TEAM_LEAD' }] },
            _count: { members: 4 },
          },
          {
            id: 'proj-02',
            name: 'Distributed Transaction Ledger',
            description: 'High-throughput Byzantine fault tolerant consensus layer for academic credential verification.',
            team: { members: [{ id: '1', name: 'Jane Doe', email: 'jane@univ.edu', role: 'TEAM_LEAD' }] },
            _count: { members: 3 },
          },
          {
            id: 'proj-03',
            name: 'Smart Campus Energy Grid Monitor',
            description: 'IoT sensor network aggregation and predictive energy load balancing.',
            team: { members: [{ id: '1', name: 'Jane Doe', email: 'jane@univ.edu', role: 'TEAM_LEAD' }] },
            _count: { members: 5 },
          },
        ]);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = projects.filter((p) =>
    `${p.name} ${p.description || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await post(endpoints.projects, form);
      setOpen(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Dedicated capstone spaces for requirements, sprints, deliverables, and reviews.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus size={15} /> Create project
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Search and filters bar */}
      <div className="surface flex items-center gap-2.5 px-3.5 py-2">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          placeholder="Search by project name or description…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded"
          >
            Clear
          </button>
        )}
      </div>

      {/* Project grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((project) => (
          <Link
            to={`/projects/${project.id}`}
            key={project.id}
            className="surface group p-5 transition-colors duration-150 hover:border-slate-300 block"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="spec-key">
                PROJ-{String(project.id).replace(/^proj-?/i, '').slice(0, 4).toUpperCase() || '01'}
              </span>
              <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">
                Active
              </span>
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {project.name}
            </h2>
            <p className="mt-1.5 min-h-[2.5rem] line-clamp-2 text-xs leading-relaxed text-slate-500">
              {project.description || 'A focused workspace for project delivery.'}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-slate-400" />
                {project.team?.members?.length || project._count?.members || 0} members
              </span>
              <span className="flex items-center gap-1 text-slate-400 group-hover:text-indigo-600 transition-colors">
                Workspace <ArrowUpRight size={13} />
              </span>
            </div>
          </Link>
        ))}
        {!filtered.length && (
          <div className="surface col-span-full p-12 text-center text-sm text-slate-500">
            No projects match your search query.
          </div>
        )}
      </div>

      {/* Create project modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <form onSubmit={create} className="surface w-full max-w-lg p-6 shadow-modal">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Create new project</h2>
                <p className="text-xs text-slate-500 mt-0.5">Initialize a new capstone workspace</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <label className="block text-xs font-medium text-slate-700">
                Project title
                <input
                  className="input mt-1"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Distributed Database Engine"
                />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Description & scope
                <textarea
                  className="input mt-1 min-h-24 resize-y"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Briefly state project objectives, target users, and expected scope."
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy}>
                {busy ? 'Creating…' : 'Create workspace'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
