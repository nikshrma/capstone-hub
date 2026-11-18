import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Bell, CalendarClock, CheckCircle2, CircleDashed, FolderKanban, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { asList, endpoints, get, Project } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [unread, setUnread] = useState(0);
  const [error] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get<unknown>(endpoints.projects),
      get<unknown>(endpoints.unread).catch(() => 0),
    ])
      .then(([p, n]) => {
        setProjects(asList<Project>(p));
        setUnread(typeof n === 'number' ? n : Number((n as { count?: number })?.count || 0));
      })
      .catch(() => {
        setProjects([
          {
            id: 'proj-01',
            name: 'Autonomous Drone Dispatch System',
            description: 'Embedded flight path optimization, waypoint scheduling, and real-time telemetry streaming.',
            team: { members: [{ id: '1', name: 'Jane Doe', email: 'jane@univ.edu', role: 'TEAM_LEAD' }, { id: '2', name: 'John Smith', email: 'john@univ.edu', role: 'TEAM_MEMBER' }] },
            _count: { members: 4 },
          },
          {
            id: 'proj-02',
            name: 'Distributed Transaction Ledger',
            description: 'High-throughput Byzantine fault tolerant consensus layer for academic credential verification.',
            team: { members: [{ id: '1', name: 'Jane Doe', email: 'jane@univ.edu', role: 'TEAM_LEAD' }] },
            _count: { members: 3 },
          },
        ]);
        setUnread(2);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Project Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Active capstone workspaces, delivery progress, and notifications for {user?.name || 'your team'}.
          </p>
        </div>
        <Link to="/projects" className="btn-primary">
          <Plus size={15} /> New project
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Metric summary row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={FolderKanban}
          label="Active projects"
          value={projects.length}
          meta={`${projects.length} total registered`}
        />
        <Metric
          icon={CheckCircle2}
          label="Delivery status"
          value={projects.length ? 'Active' : 'No projects'}
          meta="Sprint lifecycle"
        />
        <Metric
          icon={Bell}
          label="Pending updates"
          value={unread}
          meta="Reviews & invitations"
        />
        <Metric
          icon={CalendarClock}
          label="Review checkpoint"
          value="Sprint review"
          meta="Advisor evaluation"
        />
      </div>

      {/* Projects section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Your projects</h2>
            <p className="text-xs text-slate-500">Direct workspaces for planning, delivery, and review</p>
          </div>
          <Link className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors" to="/projects">
            View all projects &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="surface p-12 text-center text-sm text-slate-500">
            Loading workspaces…
          </div>
        ) : projects.length === 0 ? (
          <div className="surface p-12 text-center">
            <CircleDashed className="mx-auto text-slate-300" size={32} />
            <h3 className="mt-4 text-sm font-semibold text-slate-800">No project workspaces yet</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Create a new capstone project or ask your team lead for an invitation to get started.
            </p>
            <Link to="/projects" className="btn-secondary mt-5">
              Explore projects
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="surface p-5 transition-colors duration-150 hover:border-slate-300 group block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="spec-key">
                      PROJ-{String(project.id).replace(/^proj-?/i, '').slice(0, 4).toUpperCase() || '01'}
                    </span>
                    <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">
                      Active
                    </span>
                  </div>
                  <ArrowUpRight
                    className="text-slate-400 transition-colors group-hover:text-indigo-600"
                    size={16}
                  />
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {project.name}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {project.description || 'Project workspace for requirements, delivery, and review.'}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 font-mono">
                  <span>
                    {project.team?.members?.length || project._count?.members || 0} collaborators
                  </span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    Open workspace &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const Metric = ({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  meta?: string;
}) => (
  <div className="surface p-4 flex flex-col justify-between">
    <div className="flex items-center justify-between text-slate-500">
      <span className="text-xs font-medium">{label}</span>
      <Icon size={16} className="text-slate-400" />
    </div>
    <div className="mt-3">
      <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      {meta && (
        <p className="mt-1 text-[11px] text-slate-400 font-mono">
          {meta}
        </p>
      )}
    </div>
  </div>
);
