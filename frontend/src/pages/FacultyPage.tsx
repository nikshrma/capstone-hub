import React, { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, ClipboardCheck, FolderKanban, Gauge, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { asList, endpoints, get, Project } from '../lib/api';

export const FacultyPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<Record<string, unknown>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([get<unknown>(endpoints.faculty), get<unknown>('/faculty/projects')])
      .then(([d, p]) => {
        const response = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
        setDashboard((response.summary || response) as Record<string, unknown>);
        setProjects(asList<Project>(p));
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Unable to load faculty dashboard')
      );
  }, []);

  const metric = (keys: string[]) => {
    for (const key of keys) if (dashboard[key] !== undefined) return String(dashboard[key]);
    return '—';
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Faculty Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Requirement review queue, milestone health, and delivery metrics across advised projects.
        </p>
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
          label="Advised projects"
          value={metric(['totalProjects'])}
          meta="Registered cohorts"
        />
        <Metric
          icon={ClipboardCheck}
          label="Pending reviews"
          value={metric(['pendingReviewsCount', 'totalPendingReviews'])}
          meta="Awaiting evaluation"
        />
        <Metric
          icon={Gauge}
          label="Average progress"
          value={
            metric(['overallAverageProgress']) +
            (dashboard.overallAverageProgress !== undefined ? '%' : '')
          }
          meta="Milestone completion"
        />
        <Metric
          icon={Activity}
          label="Unread updates"
          value={metric(['unreadNotificationsCount'])}
          meta="Activity alerts"
        />
      </div>

      {/* Advised projects section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Advised projects</h2>
            <p className="text-xs text-slate-500">Continuous milestone review and delivery health</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{projects.length} connected</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const progress = Math.max(0, Math.min(100, Number(project.overallProgressPercentage ?? 0)));
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="surface group p-5 transition-colors duration-150 hover:border-slate-300 block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="spec-key">
                      PROJ-{String(project.id).replace(/^proj-?/i, '').slice(0, 4).toUpperCase() || '01'}
                    </span>
                    <span className="badge bg-slate-100 text-slate-700 border-slate-200">
                      Cohort 2026
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
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {project.description || 'Project progress overview and review workspace.'}
                </p>

                {/* Milestone progress bar */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="mb-1.5 flex justify-between text-xs font-mono text-slate-500">
                    <span>Milestone progress</span>
                    <span className="font-semibold text-slate-800">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded bg-slate-100">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300 rounded"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Users size={13} className="text-slate-400" />
                    {project.team?.members?.length || project._count?.members || 0} collaborators
                  </span>
                  <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                    Review workspace &rarr;
                  </span>
                </div>
              </Link>
            );
          })}
          {!projects.length && (
            <div className="surface col-span-full p-12 text-center text-sm text-slate-500">
              No faculty projects currently assigned.
            </div>
          )}
        </div>
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
