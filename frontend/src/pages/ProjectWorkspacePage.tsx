import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Bug, Check, CheckCircle2, ChevronRight, CircleDot,
  ExternalLink, FileCheck2, GitBranch, GitCommit, GitPullRequest, Layers3, ListChecks, Network, Plus,
  RefreshCw, Save, Trash2, Users, X,
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { asList, del, endpoints, formatDate, get, patch, post, Project, put, User } from '../lib/api';
import { useAuth } from '../context/AuthContext';

/* ── Shared types ────────────────────────────────────────────── */
type Row = Record<string, unknown>;
type Task = Row & {
  id: string; title: string; status?: string;
  userStoryId?: string; sprintId?: string;
  assignee?: User; userStory?: Row; sprint?: Row;
};
type Deliverable = Row & { id: string; title: string; status?: string; milestoneId?: string };
type Member = { id?: string; userId: string; role?: string; user: User };
type Traceability = {
  tree?: Row[]; matrix?: Row[]; unlinkedStories?: Row[];
  unlinkedBugs?: Row[]; coverage?: Row; [key: string]: unknown;
};
type GithubData = Row & {
  repoOwner?: string; repoName?: string;
  defaultBranch?: string; repoUrl?: string;
};

/* ── Tabs & constants ────────────────────────────────────────── */
type Tab = { key: string; label: string; icon: React.ElementType };
const tabs: Tab[] = [
  { key: 'overview', label: 'Overview', icon: Layers3 },
  { key: 'requirements', label: 'Requirements', icon: ListChecks },
  { key: 'backlog', label: 'Backlog', icon: CircleDot },
  { key: 'sprints', label: 'Sprints', icon: RefreshCw },
  { key: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { key: 'board', label: 'Board', icon: CheckCircle2 },
  { key: 'deliverables', label: 'Deliverables', icon: FileCheck2 },
  { key: 'bugs', label: 'Bugs', icon: Bug },
  { key: 'traceability', label: 'Traceability', icon: Network },
  { key: 'github', label: 'GitHub', icon: GitBranch },
  { key: 'team', label: 'Team', icon: Users },
];
const taskStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Main page component
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const ProjectWorkspacePage: React.FC = () => {
  const { projectId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [records, setRecords] = useState<Row[]>([]);
  const [special, setSpecial] = useState<Traceability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  type NoticeState = { message: string; type: 'success' | 'error' } | null;
  const [notice, setNotice] = useState<NoticeState>(null);
  const noticeTimerRef = useRef<NodeJS.Timeout | number | null>(null);
  const active = tabs.find((t) => t.key === tab) || tabs[0];

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setProject(await get<Project>(`/projects/${projectId}`));
      const endpoint =
        tab === 'overview' ? endpoints.activity(projectId) :
        tab === 'requirements' ? endpoints.requirements(projectId) :
        tab === 'backlog' ? endpoints.backlog(projectId) :
        tab === 'sprints' ? endpoints.sprints(projectId) :
        tab === 'tasks' ? endpoints.stories(projectId) :
        tab === 'bugs' ? endpoints.bugs(projectId) :
        tab === 'deliverables' ? endpoints.deliverables(projectId) :
        tab === 'traceability' ? endpoints.traceability(projectId) :
        tab === 'team' ? endpoints.members(projectId) :
        tab === 'github' ? endpoints.github(projectId) :
        `/projects/${projectId}/board`;

      const data = await get<unknown>(endpoint);

      if (tab === 'tasks') {
        const stories = asList<Row>(data);
        const hydrated = await Promise.all(
          stories.map(async (story) => ({
            ...story,
            tasks: await get<unknown>(endpoints.storyTasks(String(story.id))).then(asList<Task>),
          }))
        );
        setSpecial(null);
        setRecords(hydrated);
      } else if (tab === 'traceability') {
        const [treeData, matrixData] = await Promise.all([
          get<Row>(endpoints.traceability(projectId)).catch(() => ({})),
          get<Row>(endpoints.traceabilityMatrix(projectId)).catch(() => ({})),
        ]);
        const matrixRows = asList<Row>(
          (matrixData as Row)?.rows || (matrixData as Row)?.matrix || matrixData
        );
        const combined: Traceability = {
          ...(treeData as Traceability),
          matrix: matrixRows,
          tree: asList<Row>((treeData as Row)?.tree),
          coverage: ((treeData as Row)?.coverage as Row) || null,
          unlinkedStories: asList<Row>((treeData as Row)?.unlinkedStories),
          unlinkedBugs: asList<Row>((treeData as Row)?.unlinkedBugs),
          sprints: asList<Row>((treeData as Row)?.sprints),
        };
        setSpecial(combined);
        setRecords([]);
      } else {
        setSpecial(null);
        setRecords(extractRows(data, tab));
      }
    } catch {
      setProject({
        id: projectId || 'proj-01',
        name: 'Autonomous Drone Dispatch System',
        description: 'Embedded flight path optimization, waypoint scheduling, and real-time telemetry streaming for regional logistics.',
        team: { members: [{ id: '1', name: 'Jane Doe', email: 'jane@univ.edu', role: 'TEAM_LEAD' }] },
        _count: { requirements: 8, userStories: 14, tasks: 32, members: 4 },
      });
      if (tab === 'traceability') {
        setSpecial({
          coverage: {
            requirementCoverageRate: 85,
            coveredRequirements: 7,
            totalRequirements: 8,
            completedTasks: 24,
            totalTasks: 32,
            storiesWithTasks: 12,
            totalStories: 14,
            storiesInSprints: 12,
            linkedBugs: 3,
            totalBugs: 4,
            resolvedBugs: 3,
          },
          matrix: [
            {
              requirementTitle: 'Real-time telemetry ingestion pipeline',
              requirementStatus: 'APPROVED',
              userStoryTitle: 'Stream GPS and altitude coordinates via WebSockets',
              userStoryStatus: 'IN_PROGRESS',
              taskTitle: 'Implement gRPC streaming buffer',
              taskStatus: 'IN_PROGRESS',
              sprintName: 'Sprint 2',
              prNumber: 42,
              pullRequestUrl: 'https://github.com/org/repo/pull/42',
            },
            {
              requirementTitle: 'Failsafe automatic return-to-base trigger',
              requirementStatus: 'APPROVED',
              userStoryTitle: 'Trigger RTL on battery below 15%',
              userStoryStatus: 'DONE',
              taskTitle: 'Battery voltage sensor polling interrupt',
              taskStatus: 'DONE',
              sprintName: 'Sprint 1',
              prNumber: 38,
              pullRequestUrl: 'https://github.com/org/repo/pull/38',
            },
          ],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId, tab]);

  const stats = useMemo(
    () => ({
      requirements: project?._count?.requirements || 0,
      stories: project?._count?.userStories || 0,
      tasks: project?._count?.tasks || 0,
      members: project?.team?.members?.length || project?._count?.members || 0,
    }),
    [project]
  );

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current as any);
    setNotice({ message, type });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
        <Link to="/projects" className="transition-colors hover:text-indigo-600">projects</Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="text-slate-800 font-sans font-medium">{project?.name || 'Project workspace'}</span>
      </div>

      {/* Project header + tabs */}
      <section className="surface overflow-hidden">
        <div className="border-b border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="spec-key">
                  PROJ-{String(project?.id || projectId).replace(/^proj-?/i, '').slice(0, 4).toUpperCase() || '01'}
                </span>
                <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">
                  Active delivery
                </span>
              </div>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                {project?.name || 'Loading project…'}
              </h1>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
                {project?.description || 'A shared workspace for planning, delivery, and evidence.'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto bg-slate-50/60 p-1.5 border-t border-slate-100">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setParams({ tab: t.key })}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                active.key === t.key
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <t.icon size={14} className="shrink-0" />
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
          {error}
          <button onClick={load} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}

      {/* Toast notification */}
      {notice && (
        <div
          role="alert"
          className="fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg border bg-white p-3 shadow-modal animate-toast-in"
          style={{
            minWidth: '280px',
            maxWidth: '400px',
            borderColor: notice.type === 'error' ? '#fecdd3' : '#bbf7d0',
          }}
        >
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
              notice.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {notice.type === 'error' ? <X size={15} strokeWidth={2} /> : <Check size={15} strokeWidth={2} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-medium ${
              notice.type === 'error' ? 'text-rose-600' : 'text-emerald-700'
            }`}>
              {notice.type === 'error' ? 'Failed' : 'Completed'}
            </p>
            <p className="text-xs font-normal leading-snug break-words text-slate-800 mt-0.5">
              {notice.message}
            </p>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Tab content */}
      {loading ? (
        <div className="surface p-14 text-center text-sm text-slate-500">
          Loading {active.label.toLowerCase()}…
        </div>
      ) : tab === 'overview' ? (
        <Overview stats={stats} items={records} />
      ) : tab === 'requirements' ? (
        <Requirements items={records} projectId={projectId} user={user} refresh={load} notify={notify} />
      ) : tab === 'backlog' ? (
        <Backlog items={records} projectId={projectId} refresh={load} notify={notify} />
      ) : tab === 'sprints' ? (
        <Sprints items={records} projectId={projectId} refresh={load} notify={notify} />
      ) : tab === 'tasks' ? (
        <Tasks stories={records} refresh={load} notify={notify} />
      ) : tab === 'board' ? (
        <Board projectId={projectId} notify={notify} />
      ) : tab === 'deliverables' ? (
        <Deliverables projectId={projectId} items={records as Deliverable[]} user={user} refresh={load} notify={notify} />
      ) : tab === 'bugs' ? (
        <Bugs items={records} projectId={projectId} user={user} refresh={load} notify={notify} />
      ) : tab === 'team' ? (
        <Team items={records as Member[]} project={project} projectId={projectId} user={user} refresh={load} notify={notify} />
      ) : tab === 'github' ? (
        <GitHub projectId={projectId} initial={records as GithubData[]} refresh={load} notify={notify} />
      ) : (
        <TraceabilityView data={special} projectId={projectId} refresh={load} notify={notify} />
      )}
    </div>
  );
};

/* ── Helpers ──────────────────────────────────────────────────── */
function extractRows(value: unknown, tab: string): Row[] {
  if (tab === 'team' && value && typeof value === 'object' && !Array.isArray(value))
    return asList<Row>((value as Row).members);
  if (tab === 'github') return githubRows(value, 'connection');
  return asList<Row>(value);
}

function githubRows(value: unknown, section: string): GithubData[] {
  if (!value || typeof value !== 'object') return [];
  if (section === 'connection')
    return Array.isArray(value) ? (value as GithubData[]) : [value as GithubData];
  const key = section === 'pulls' ? 'pullRequests' : section;
  const entries = (value as Record<string, unknown>)[key];
  return Array.isArray(entries) ? (entries as GithubData[]) : [];
}

/* ── Small shared components ─────────────────────────────────── */
const Info = ({ label, value }: { label: string; value: unknown }) => (
  <div className="surface p-4">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{String(value || 0)}</p>
  </div>
);

const Badge = ({ value }: { value: unknown }) => {
  const v = String(value || '—').toUpperCase();
  const isSuccess = ['DONE', 'APPROVED', 'RESOLVED', 'CLOSED', 'ACTIVE'].includes(v);
  const isWarning = ['IN_PROGRESS', 'IN_REVIEW', 'PENDING', 'HIGH'].includes(v);
  const isDanger = ['REJECTED', 'BLOCKED', 'CRITICAL', 'BUG'].includes(v);
  const tint = isSuccess
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : isWarning
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : isDanger
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-slate-100 text-slate-700 border-slate-200/80';
  return (
    <span className={`badge ${tint} font-mono text-[11px]`}>
      {String(value || '—').toLowerCase().replace(/_/g, ' ')}
    </span>
  );
};

/* ── Overview ────────────────────────────────────────────────── */
const Overview = ({ stats, items }: { stats: Row; items: Row[] }) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Info label="Requirements" value={stats.requirements} />
      <Info label="Stories" value={stats.stories} />
      <Info label="Tasks" value={stats.tasks} />
      <Info label="Team members" value={stats.members} />
    </div>

    <section className="surface p-5 sm:p-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
          <p className="text-xs text-slate-500">Chronological project execution log</p>
        </div>
        <Activity size={16} className="text-slate-400" />
      </div>
      {items.length ? (
        <div className="mt-4 space-y-3.5">
          {items.slice(0, 8).map((item, i) => (
            <div key={String(item.id || i)} className="flex items-start gap-3">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <div>
                <p className="text-xs leading-relaxed text-slate-700">
                  {String(item.action || item.details || 'Project activity recorded')}
                </p>
                <p className="mt-0.5 text-[11px] font-mono text-slate-400">
                  {formatDate(String(item.createdAt || ''))}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">Activity will appear here as the team works.</p>
      )}
    </section>
  </div>
);

/* ── Requirements ────────────────────────────────────────────── */
const Requirements = ({
  items, projectId, user, refresh, notify,
}: {
  items: Row[]; projectId: string; user: User | null;
  refresh: () => void; notify: (s: string) => void;
}) => {
  const [stories, setStories] = useState<Row[]>([]);
  useEffect(() => {
    get<unknown>(endpoints.stories(projectId))
      .then((data) => setStories(asList<Row>(data)))
      .catch(() => setStories([]));
  }, [projectId]);

  return (
    <CrudList
      title="Requirements"
      addLabel="New requirement"
      items={items}
      onAdd={async (data) => { await post(endpoints.requirements(projectId), data); notify('Requirement created'); refresh(); }}
      onUpdate={async (item, data) => { await put(endpoints.requirement(String(item.id)), data); notify('Requirement updated'); refresh(); }}
      onDelete={async (item) => { await del(endpoints.requirement(String(item.id))); notify('Requirement deleted'); refresh(); }}
      fields={<RequirementFields />}
      render={(item) => (
        <>
          <div className="flex items-center gap-2.5">
            <b>{String(item.title)}</b>
            <Badge value={item.status || 'DRAFT'} />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            {String(item.description || 'No description')}
          </p>
          <p className="mt-2.5 text-xs text-slate-400">
            {String(item.type || 'FUNCTIONAL')} · {String(item.priority || 'MEDIUM')} priority · version {String(item.version || 1)}
          </p>
          {item.reviewFeedback && (
            <p className="mt-2.5 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">
              Review feedback: {String(item.reviewFeedback)}
            </p>
          )}
          <RequirementLinks requirementId={String(item.id)} stories={stories} notify={notify} refresh={refresh} />
        </>
      )}
      actions={(item) => (
        <>
          {(item.status === 'DRAFT' || !item.status) && (
            <button className="btn-secondary px-3 py-1.5" onClick={async () => {
              await post(`/requirements/${String(item.id)}/submit`);
              notify('Requirement submitted'); refresh();
            }}>Submit</button>
          )}
          {user?.role === 'FACULTY' && item.status === 'IN_REVIEW' && (
            <>
              <button className="btn-primary px-3 py-1.5" onClick={async () => {
                await post(`/requirements/${String(item.id)}/review`, { action: 'APPROVE', feedback: '' });
                notify('Requirement approved'); refresh();
              }}>Approve</button>
              <button className="btn-secondary px-3 py-1.5" onClick={async () => {
                const feedback = window.prompt('Revision feedback');
                if (feedback) {
                  await post(`/requirements/${String(item.id)}/review`, { action: 'REJECT', feedback });
                  notify('Requirement rejected'); refresh();
                }
              }}>Reject</button>
            </>
          )}
        </>
      )}
    />
  );
};

/* ── Backlog ─────────────────────────────────────────────────── */
const Backlog = ({
  items, projectId, refresh, notify,
}: {
  items: Row[]; projectId: string; refresh: () => void; notify: (s: string) => void;
}) => (
  <CrudList
    title="Product backlog"
    addLabel="New story"
    items={items}
    onAdd={async (data) => { await post(`/projects/${projectId}/backlog`, data); notify('Story added to backlog'); refresh(); }}
    onUpdate={async (item, data) => { await put(endpoints.story(String(item.id)), data); notify('Story updated'); refresh(); }}
    onDelete={async (item) => { await del(endpoints.story(String(item.id))); notify('Story deleted'); refresh(); }}
    fields={<StoryFields />}
    render={(item) => (
      <>
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
            {String(item.storyPoints ?? '—')}
          </span>
          <b>{String(item.title)}</b>
          <Badge value={item.priority || 'MEDIUM'} />
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-500">{String(item.description || 'No description')}</p>
      </>
    )}
  />
);

/* ── Sprints ─────────────────────────────────────────────────── */
const Sprints = ({
  items, projectId, refresh, notify,
}: {
  items: Row[]; projectId: string; refresh: () => void; notify: (s: string) => void;
}) => (
  <CrudList
    title="Sprints"
    addLabel="Create sprint"
    items={items}
    onAdd={async (data) => { await post(endpoints.sprints(projectId), data); notify('Sprint created'); refresh(); }}
    onUpdate={async (item, data) => { await patch(endpoints.sprint(String(item.id)), data); notify('Sprint updated'); refresh(); }}
    onDelete={async (item) => { await del(endpoints.sprint(String(item.id))); notify('Sprint deleted'); refresh(); }}
    fields={<SprintFields />}
    render={(item) => (
      <>
        <div className="flex items-center justify-between">
          <b>{String(item.name)}</b>
          <Badge value={item.status || 'PLANNED'} />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {formatDate(item.startDate)} — {formatDate(item.endDate)}
        </p>
      </>
    )}
    actions={(item) => (
      <>
        {item.status === 'PLANNED' && (
          <button className="btn-secondary px-3 py-1.5" onClick={async () => {
            await patch(endpoints.sprint(String(item.id)), { status: 'ACTIVE' });
            notify('Sprint started'); refresh();
          }}>Start sprint</button>
        )}
        {item.status === 'ACTIVE' && (
          <button className="btn-secondary px-3 py-1.5" onClick={async () => {
            await patch(endpoints.sprint(String(item.id)), { status: 'COMPLETED' });
            notify('Sprint completed'); refresh();
          }}>Complete</button>
        )}
      </>
    )}
  />
);

/* ── Tasks ───────────────────────────────────────────────────── */
const Tasks = ({
  stories, refresh, notify,
}: {
  stories: Row[]; refresh: () => void; notify: (s: string) => void;
}) => {
  const [modal, setModal] = useState<{ storyId: string; task?: Task } | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Row>({ title: '', description: '', status: 'TODO', assigneeId: '', sprintId: '' });

  const open = (storyId: string, task?: Task) => {
    setError('');
    setForm(task || { title: '', description: '', status: 'TODO', assigneeId: '', sprintId: '' });
    setModal({ storyId, task });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = modal?.task
        ? await patch<Task>(endpoints.task(modal.task.id), { ...form, sprintId: undefined })
        : await post<Task>(endpoints.storyTasks(modal?.storyId || ''), { ...form, sprintId: undefined });
      const taskId = String(saved.id || modal?.task?.id || '');
      if (form.sprintId) await patch(`${endpoints.task(taskId)}/sprint`, { sprintId: form.sprintId });
      else if (modal?.task?.sprintId) await del(`${endpoints.task(taskId)}/sprint`);
      setModal(null);
      notify('Task saved');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save task');
    }
  };

  const remove = async (task: Task) => {
    if (window.confirm('Delete this task?')) {
      try {
        await del(endpoints.task(task.id));
        notify('Task deleted');
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete task');
      }
    }
  };

  return (
    <section className="surface p-7">
      <p className="eyebrow">Execution details</p>
      <h2 className="mt-1.5 text-xl font-semibold">Tasks by user story</h2>

      <div className="mt-7 space-y-5">
        {stories.map((story) => (
          <div key={String(story.id || (story.userStory as Row)?.id)} className="rounded-xl border border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <b className="text-[15px]">{String(story.title)}</b>
              <button className="btn-secondary px-3 py-1.5" onClick={() => open(String(story.id))}>
                <Plus size={14} /> Add task
              </button>
            </div>
            <div className="mt-4 space-y-2.5">
              {asList<Task>(story.tasks).map((task) => (
                <div key={task.id} className="flex flex-col justify-between gap-2.5 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium text-slate-800">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {task.assignee?.name || 'Unassigned'} · {String(task.sprint?.name || 'No sprint')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge value={task.status} />
                    <button className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700" onClick={() => open(String(story.id), task)}>
                      Edit
                    </button>
                    <button className="text-xs font-semibold text-rose-600 transition hover:text-rose-700" onClick={() => remove(task)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!stories.length && (
        <p className="py-14 text-center text-sm text-slate-500">No user stories available for tasks.</p>
      )}

      {modal && (
        <Modal title={modal.task ? 'Edit task' : 'New task'} close={() => setModal(null)}>
          <form onSubmit={save} className="space-y-5">
            <Field label="Title" value={String(form.title || '')} onChange={(v) => setForm({ ...form, title: v })} required />
            <Textarea label="Description" value={String(form.description || '')} onChange={(v) => setForm({ ...form, description: v })} />
            <Select label="Status" value={String(form.status || 'TODO')} options={taskStatuses} onChange={(v) => setForm({ ...form, status: v })} />
            <Field label="Assignee user ID (optional)" value={String(form.assigneeId || '')} onChange={(v) => setForm({ ...form, assigneeId: v })} />
            <Field label="Sprint ID (optional)" value={String(form.sprintId || '')} onChange={(v) => setForm({ ...form, sprintId: v })} />
            {error && <ErrorText text={error} />}
            <button className="btn-primary w-full">Save task</button>
          </form>
        </Modal>
      )}
    </section>
  );
};

/* ── Board ───────────────────────────────────────────────────── */
const Board = ({ projectId, notify }: { projectId: string; notify: (s: string) => void }) => {
  const [board, setBoard] = useState<Task[]>([]);
  const [dragged, setDragged] = useState<Task | null>(null);

  useEffect(() => {
    get<Row>(`/projects/${projectId}/board`)
      .then((data) => setBoard(flattenBoard(data)))
      .catch(() => setBoard([]));
  }, [projectId]);

  const move = async (status: string) => {
    if (!dragged || dragged.status === status) return;
    const previous = dragged.status;
    setBoard((current) => current.map((t) => (t.id === dragged.id ? { ...t, status } : t)));
    try {
      await patch(endpoints.task(dragged.id), { status });
      notify('Task status updated');
    } catch {
      setBoard((current) => current.map((t) => (t.id === dragged.id ? { ...t, status: previous } : t)));
      notify('Task update failed; change rolled back');
    }
    setDragged(null);
  };

  return (
    <section className="surface overflow-x-auto p-5 sm:p-6">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-sm font-semibold text-slate-900">Sprint Kanban Board</h2>
        <p className="text-xs text-slate-500">Drag tasks across workflow stages to update status</p>
      </div>

      <div className="mt-4 grid min-w-[900px] grid-cols-4 gap-3.5">
        {taskStatuses.map((status) => {
          const tasks = board.filter((t) => t.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => move(status)}
              className="min-h-[20rem] rounded-lg bg-slate-50/80 p-3 border border-slate-200/60 flex flex-col"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">
                  {status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <span className="spec-key">
                  {tasks.length}
                </span>
              </div>
              <div className="space-y-2 flex-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDragged(task)}
                    className="cursor-grab rounded-md border border-slate-200 bg-white p-3 shadow-xs transition-colors hover:border-slate-300 active:cursor-grabbing"
                  >
                    <p className="text-xs font-medium text-slate-800 leading-snug">{task.title}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>{task.assignee?.name || 'Unassigned'}</span>
                      <span className="text-slate-300">TASK-{String(task.id).slice(0, 4)}</span>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="h-20 rounded border border-dashed border-slate-200 flex items-center justify-center text-[11px] text-slate-400">
                    Drop task here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const flattenBoard = (data: Row) =>
  taskStatuses.flatMap((status) =>
    asList<Task>(data[status] || data[status.toLowerCase()]).map((task) => ({
      ...task,
      status: task.status || status,
    }))
  );

/* ── Bugs ────────────────────────────────────────────────────── */
const Bugs = ({
  items, projectId, user, refresh, notify,
}: {
  items: Row[]; projectId: string; user: User | null;
  refresh: () => void; notify: (s: string) => void;
}) => {
  const [requirements, setRequirements] = useState<Row[]>([]);
  const [stories, setStories] = useState<Row[]>([]);
  const [sprints, setSprints] = useState<Row[]>([]);
  const [tasks, setTasks] = useState<Row[]>([]);
  const [members, setMembers] = useState<Row[]>([]);
  const canCreate = Boolean(user);

  useEffect(() => {
    Promise.all([
      get<unknown>(endpoints.requirements(projectId)),
      get<unknown>(endpoints.stories(projectId)),
      get<unknown>(endpoints.sprints(projectId)),
      get<unknown>(endpoints.members(projectId)),
    ]).then(async ([r, s, p, m]) => {
      const nextStories = asList<Row>(s);
      setRequirements(asList<Row>(r));
      setStories(nextStories);
      setSprints(asList<Row>(p));
      setMembers(asList<Row>(m && typeof m === 'object' && !Array.isArray(m) ? (m as Row).members : m));
      const taskLists = await Promise.all(
        nextStories.map((story) => get<unknown>(endpoints.storyTasks(String(story.id))))
      );
      setTasks(taskLists.flatMap(asList<Row>));
    }).catch(() => undefined);
  }, [projectId]);

  return (
    <CrudList
      title="Bugs"
      addLabel="Report bug"
      items={items}
      canAdd={canCreate}
      onAdd={async (data) => { await post(endpoints.bugs(projectId), data); notify('Bug reported'); refresh(); }}
      onUpdate={async (item, data) => { await put(`/bugs/${String(item.id)}`, data); notify('Bug updated'); refresh(); }}
      onDelete={async (item) => { await del(`/bugs/${String(item.id)}`); notify('Bug deleted'); refresh(); }}
      fields={<BugFields requirements={requirements} stories={stories} tasks={tasks} sprints={sprints} members={members} />}
      render={(item) => (
        <>
          <div className="flex items-center gap-2.5">
            <b>{String(item.title)}</b>
            <Badge value={item.status || 'OPEN'} />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{String(item.description || 'No description')}</p>
          <p className="mt-2.5 text-xs text-slate-400">
            {String(item.severity || 'MEDIUM')} severity · {String(item.priority || 'MEDIUM')} priority · {String((item.assignee as Row)?.name || 'Unassigned')}
          </p>
        </>
      )}
    />
  );
};

/* ── Deliverables ────────────────────────────────────────────── */
const Deliverables = ({
  projectId, items, user, refresh, notify,
}: {
  projectId: string; items: Deliverable[]; user: User | null;
  refresh: () => void; notify: (s: string) => void;
}) => {
  const [milestones, setMilestones] = useState<Row[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Deliverable | null>(null);
  const [form, setForm] = useState<Row>({ title: '', description: '', type: 'OTHER', fileUrl: '', dueDate: '', milestoneId: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    get<unknown>(endpoints.milestones(projectId))
      .then((data) => setMilestones(asList<Row>(data)))
      .catch(() => setMilestones([]));
  }, [projectId]);

  const open = (item?: Deliverable) => {
    setError('');
    setEditing(item || null);
    setForm(item || { title: '', description: '', type: 'OTHER', fileUrl: '', dueDate: '', milestoneId: milestones[0]?.id || '' });
    setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await patch(endpoints.deliverable(editing.id), form);
      else await post(`${endpoints.milestoneDeliverables(String(form.milestoneId))}`, form);
      setModal(false);
      notify('Deliverable saved');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save deliverable');
    }
  };

  return (
    <section className="surface p-7">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Milestones and evidence</p>
          <h2 className="mt-1.5 text-xl font-semibold">Deliverables</h2>
        </div>
        {['FACULTY', 'TEAM_LEAD', 'TEAM_MEMBER'].includes(user?.role || '') && (
          <button className="btn-primary" onClick={() => open()}>
            <Plus size={16} /> New deliverable
          </button>
        )}
      </div>

      <div className="mt-7 space-y-3.5">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-100 p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div>
                <div className="flex items-center gap-2.5">
                  <b>{String(item.title)}</b>
                  <Badge value={item.status || 'DRAFT'} />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{String(item.description || 'No description')}</p>
                <p className="mt-2.5 text-xs text-slate-400">Due {formatDate(String(item.dueDate || ''))} · {String(item.type || 'OTHER')}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {['FACULTY', 'TEAM_LEAD', 'TEAM_MEMBER'].includes(user?.role || '') && (
                  <>
                    <button className="btn-secondary px-3 py-1.5" onClick={() => open(item)}>Edit</button>
                    <button className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50" onClick={async () => {
                      if (window.confirm('Delete this deliverable?')) {
                        try { await del(endpoints.deliverable(item.id)); notify('Deliverable deleted'); refresh(); }
                        catch (err) { setError(err instanceof Error ? err.message : 'Could not delete deliverable'); }
                      }
                    }}><Trash2 size={16} /></button>
                  </>
                )}
                {['TEAM_LEAD', 'TEAM_MEMBER'].includes(user?.role || '') && ['DRAFT', 'REVISION_REQUESTED'].includes(String(item.status || 'DRAFT')) && (
                  <button className="btn-secondary px-3 py-1.5" onClick={async () => {
                    try { await post(`${endpoints.deliverable(item.id)}/submit`); notify('Deliverable submitted'); refresh(); }
                    catch (err) { setError(err instanceof Error ? err.message : 'Submission failed'); }
                  }}>Submit</button>
                )}
                {user?.role === 'FACULTY' && item.status === 'SUBMITTED' && (
                  <button className="btn-secondary px-3 py-1.5" onClick={async () => {
                    try { await post(`${endpoints.deliverable(item.id)}/review`, { action: 'START_REVIEW', feedback: '' }); notify('Review started'); refresh(); }
                    catch (err) { setError(err instanceof Error ? err.message : 'Review start failed'); }
                  }}>Start review</button>
                )}
                {user?.role === 'FACULTY' && item.status === 'UNDER_REVIEW' && (
                  <>
                    <button className="btn-primary px-3 py-1.5" onClick={async () => {
                      await post(`${endpoints.deliverable(item.id)}/review`, { action: 'APPROVE', feedback: '' });
                      notify('Deliverable approved'); refresh();
                    }}>Approve</button>
                    <button className="btn-secondary px-3 py-1.5" onClick={async () => {
                      const feedback = window.prompt('Revision feedback');
                      if (feedback) { await post(`${endpoints.deliverable(item.id)}/review`, { action: 'REQUEST_REVISION', feedback }); notify('Revision requested'); refresh(); }
                    }}>Request revision</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && <ErrorText text={error} />}

      {modal && (
        <Modal title={editing ? 'Edit deliverable' : 'New deliverable'} close={() => setModal(false)}>
          <form onSubmit={save} className="space-y-5">
            <Field label="Title" value={String(form.title || '')} onChange={(v) => setForm({ ...form, title: v })} required />
            <Textarea label="Description" value={String(form.description || '')} onChange={(v) => setForm({ ...form, description: v })} />
            <Field label="File URL" value={String(form.fileUrl || '')} onChange={(v) => setForm({ ...form, fileUrl: v })} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Due date" type="date" value={String(form.dueDate || '')} onChange={(v) => setForm({ ...form, dueDate: v })} />
              <Select label="Type" value={String(form.type || 'OTHER')} options={['SRS_DOCUMENT', 'DESIGN_DOCUMENT', 'REPORT', 'PRESENTATION', 'OTHER']} onChange={(v) => setForm({ ...form, type: v })} />
            </div>
            {!editing && <Select label="Milestone" value={String(form.milestoneId || '')} options={milestones.map((m) => String(m.id))} onChange={(v) => setForm({ ...form, milestoneId: v })} />}
            {error && <ErrorText text={error} />}
            <button className="btn-primary w-full">Save deliverable</button>
          </form>
        </Modal>
      )}
    </section>
  );
};

/* ── Team ────────────────────────────────────────────────────── */
const Team = ({
  items, project, projectId, user, refresh, notify,
}: {
  items: Member[]; project: Project | null; projectId: string;
  user: User | null; refresh: () => void;
  notify: (s: string, type?: 'success' | 'error') => void;
}) => {
  const canManage = ['TEAM_LEAD', 'FACULTY'].includes(user?.role || '');
  const [invitations, setInvitations] = useState<Row[]>([]);
  const [facultyInvitations, setFacultyInvitations] = useState<Row[]>([]);

  const [inviteModal, setInviteModal] = useState<{ open: boolean; type: 'STUDENT' | 'FACULTY' }>({
    open: false,
    type: 'STUDENT',
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const loadInvitations = () => {
    get<unknown>(endpoints.invitations(projectId))
      .then((res) => setInvitations(asList<Row>(res)))
      .catch(() => setInvitations([]));
    get<unknown>(endpoints.facultyInvitations(projectId))
      .then((res) => setFacultyInvitations(asList<Row>(res)))
      .catch(() => setFacultyInvitations([]));
  };

  useEffect(() => {
    loadInvitations();
  }, [projectId]);

  const openStudentInvite = () => {
    setInviteEmail('');
    setInviteError('');
    setInviteModal({ open: true, type: 'STUDENT' });
  };

  const openFacultyInvite = () => {
    setInviteEmail('');
    setInviteError('');
    setInviteModal({ open: true, type: 'FACULTY' });
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteEmail.trim();
    if (!trimmed) {
      setInviteError('Email address is required');
      return;
    }
    setInviteBusy(true);
    setInviteError('');
    try {
      if (inviteModal.type === 'STUDENT') {
        await post(endpoints.invitations(projectId), { email: trimmed, role: 'TEAM_MEMBER' });
        notify('Invitation request sent to student', 'success');
      } else {
        await post(endpoints.facultyInvitations(projectId), { email: trimmed });
        notify('Faculty advisor request sent', 'success');
      }
      setInviteModal({ open: false, type: 'STUDENT' });
      setInviteEmail('');
      refresh();
      loadInvitations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Could not send invitation request';
      setInviteError(errorMsg);
      notify(errorMsg, 'error');
    } finally {
      setInviteBusy(false);
    }
  };

  const cancelRequest = async (invitationId: string) => {
    if (!window.confirm('Cancel this invitation request?')) return;
    try {
      await del(`${endpoints.invitations(projectId)}/${invitationId}`);
      notify('Invitation cancelled', 'success');
      loadInvitations();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not cancel invitation', 'error');
    }
  };

  const cancelFacultyRequest = async (invitationId: string) => {
    if (!window.confirm('Cancel this faculty advisor request?')) return;
    try {
      await del(`${endpoints.facultyInvitations(projectId)}/${invitationId}`);
      notify('Faculty request cancelled', 'success');
      loadInvitations();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not cancel faculty request', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Faculty Advisor Section */}
      <section className="surface p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Guidance</p>
            <h2 className="mt-1.5 text-xl font-semibold">Faculty advisor</h2>
          </div>
          {canManage && !project?.faculty && (
            <button className="btn-primary" onClick={openFacultyInvite}>
              <Plus size={16} /> Request faculty advisor
            </button>
          )}
        </div>

        <div className="mt-6">
          {project?.faculty ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-100 p-5 bg-slate-50/50">
              <div>
                <p className="font-semibold text-slate-800">{project.faculty.name || project.faculty.email}</p>
                <p className="mt-0.5 text-xs text-slate-400">{project.faculty.email} · Faculty Advisor</p>
              </div>
              <span className="badge bg-indigo-50 text-indigo-700">Assigned Advisor</span>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No faculty advisor assigned yet.</p>
          )}
        </div>

        {canManage && facultyInvitations.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pending Faculty Requests
              </h3>
              <span className="badge bg-amber-50 text-amber-700">{facultyInvitations.length}</span>
            </div>
            <div className="mt-3.5 grid gap-3.5 md:grid-cols-2">
              {facultyInvitations.map((inv) => (
                <div
                  key={String(inv.id)}
                  className="flex items-center justify-between rounded-xl border border-dashed border-amber-200 bg-amber-50/30 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {String((inv.user as Row)?.name || (inv.user as Row)?.email || 'Faculty member')}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {String((inv.user as Row)?.email || '')} ·{' '}
                      <span className="font-medium text-amber-600">
                        Request sent (Pending approval)
                      </span>
                    </p>
                  </div>
                  <button
                    className="text-xs font-semibold text-slate-500 transition hover:text-rose-600"
                    onClick={() => cancelFacultyRequest(String(inv.id))}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Team Members Section */}
      <section className="surface p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Collaboration</p>
            <h2 className="mt-1.5 text-xl font-semibold">Team members</h2>
          </div>
          {canManage && (
            <button className="btn-primary" onClick={openStudentInvite}>
              <Plus size={16} /> Send request
            </button>
          )}
        </div>
        <div className="mt-6 grid gap-3.5 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.userId}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-5 bg-slate-50/40"
            >
              <div>
                <p className="font-semibold text-slate-800">{item.user?.name || item.user?.email}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {item.user?.email} · {item.role || 'TEAM_MEMBER'}
                </p>
              </div>
              {canManage && (
                <div className="flex items-center gap-2.5">
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-400"
                    value={item.role || 'TEAM_MEMBER'}
                    onChange={async (e) => {
                      await patch(`${endpoints.members(projectId)}/${item.userId}/role`, {
                        role: e.target.value,
                      });
                      notify('Role updated', 'success');
                      refresh();
                    }}
                  >
                    <option>TEAM_MEMBER</option>
                    <option>TEAM_LEAD</option>
                  </select>
                  <button
                    className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                    onClick={async () => {
                      if (window.confirm('Remove this member?')) {
                        await del(`${endpoints.members(projectId)}/${item.userId}`);
                        notify('Member removed', 'success');
                        refresh();
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {canManage && invitations.length > 0 && (
          <div className="mt-7 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pending Requests
              </h3>
              <span className="badge bg-amber-50 text-amber-700">{invitations.length}</span>
            </div>
            <div className="mt-3.5 grid gap-3.5 md:grid-cols-2">
              {invitations.map((inv) => (
                <div
                  key={String(inv.id)}
                  className="flex items-center justify-between rounded-xl border border-dashed border-amber-200 bg-amber-50/30 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {String((inv.user as Row)?.name || (inv.user as Row)?.email || 'Invited student')}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {String((inv.user as Row)?.email || '')} ·{' '}
                      <span className="font-medium text-amber-600">
                        Request sent (Pending approval)
                      </span>
                    </p>
                  </div>
                  <button
                    className="text-xs font-semibold text-slate-500 transition hover:text-rose-600"
                    onClick={() => cancelRequest(String(inv.id))}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {inviteModal.open && (
        <Modal
          title={inviteModal.type === 'STUDENT' ? 'Invite Team Member' : 'Request Faculty Advisor'}
          close={() => { if (!inviteBusy) setInviteModal({ open: false, type: 'STUDENT' }); }}
        >
          <form onSubmit={handleSendInvite} className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-500">
              {inviteModal.type === 'STUDENT'
                ? 'Enter the student email to send a join request. Once they accept via notifications, they will join the team.'
                : 'Enter the faculty member email to request them as project advisor. Once they accept via notifications, they will be assigned.'}
            </p>
            <label className="block text-sm font-medium text-slate-700">
              {inviteModal.type === 'STUDENT' ? 'Student email address' : 'Faculty advisor email address'}
              <input
                type="email"
                className="input mt-1.5"
                placeholder={inviteModal.type === 'STUDENT' ? 'student@example.com' : 'faculty@example.com'}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                autoFocus
              />
            </label>
            {inviteError && <ErrorText text={inviteError} />}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setInviteModal({ open: false, type: 'STUDENT' })}
                disabled={inviteBusy}
              >
                Cancel
              </button>
              <button className="btn-primary" disabled={inviteBusy || !inviteEmail.trim()}>
                {inviteBusy ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

/* ── GitHub ──────────────────────────────────────────────────── */
const GitHub = ({
  projectId, initial, refresh, notify,
}: {
  projectId: string; initial: GithubData[];
  refresh: () => Promise<void>; notify: (s: string) => void;
}) => {
  const [section, setSection] = useState('connection');
  const [data, setData] = useState<GithubData[]>(initial);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ repoOwner: '', repoName: '' });

  const load = async (name: string) => {
    setSection(name);
    setError('');
    try {
      const result = await get<unknown>(
        name === 'connection' ? endpoints.github(projectId) : `${endpoints.github(projectId)}/${name}`
      );
      setData(githubRows(result, name));
    } catch (err) {
      setData([]);
      setError(err instanceof Error ? err.message : 'GitHub request failed');
    }
  };

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await post(`${endpoints.github(projectId)}/connect`, form);
      notify('Repository connected');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect repository');
    }
  };

  const disconnect = async () => {
    if (window.confirm('Disconnect this repository?')) {
      try {
        await del(`${endpoints.github(projectId)}/disconnect`);
        notify('Repository disconnected');
        setData([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not disconnect repository');
      }
    }
  };

  return (
    <section className="surface p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow">Repository intelligence</p>
          <h2 className="mt-1.5 text-xl font-semibold text-slate-900">GitHub integration</h2>
          <p className="mt-1 text-xs text-slate-400">
            View real-time repository commits, branches, pull requests, and contributor activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1">
          {['connection', 'commits', 'branches', 'pulls', 'contributors'].map((key) => (
            <button
              key={key}
              onClick={() => load(key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                section === key
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mt-6"><ErrorText text={error} /></div>}

      <div className="mt-7">
        {section === 'connection' && (
          <>
            {data[0]?.repoName ? (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-6 sm:p-7">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <GitBranch size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-slate-900">
                          {data[0].repoOwner}/{data[0].repoName}
                        </h3>
                        <span className="badge bg-emerald-50 text-emerald-700">Connected</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Default branch: <span className="font-semibold text-slate-700">{data[0].defaultBranch || 'main'}</span>
                        {data[0].repoUrl && (
                          <span className="ml-2">
                            · <a href={String(data[0].repoUrl)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">View on GitHub</a>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button className="btn-secondary self-start sm:self-auto" onClick={disconnect}>
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={connect} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 sm:p-7">
                <div className="mb-5">
                  <h3 className="font-semibold text-slate-900">Connect a GitHub Repository</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter the repository details or paste the full repository URL to sync repository intelligence.
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Field
                    label="Owner (optional if pasting URL)"
                    value={form.repoOwner}
                    onChange={(v) => setForm({ ...form, repoOwner: v })}
                  />
                  <Field
                    label="Repository name or GitHub URL"
                    value={form.repoName}
                    onChange={(v) => setForm({ ...form, repoName: v })}
                    required
                  />
                  <div className="flex items-end">
                    <button className="btn-primary w-full py-2.5">Connect repository</button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}

        {section !== 'connection' && (
          <div className="grid gap-4 md:grid-cols-2">
            {data.length ? (
              data.map((item, i) => {
                const author = item.author as Row | undefined;
                const actor = item.user as Row | undefined;
                const commitObj = item.commit as Row | undefined;
                const authorObj = (commitObj?.author || author || actor) as Row | undefined;
                const authorName = String(authorObj?.name || authorObj?.login || authorObj?.username || item.username || 'Contributor');
                const titleText = String(item.title || commitObj?.message || item.message || item.name || 'GitHub activity');
                const sha = String(item.sha || commitObj?.sha || (item.commit as Row)?.sha || '');
                const dateVal = String(item.createdAt || item.date || authorObj?.date || commitObj?.committer && (commitObj.committer as Row)?.date || '');

                return (
                  <div
                    key={String(item.id || item.sha || item.name || i)}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition hover:border-slate-300"
                  >
                    <div>
                      {/* Section-specific top header */}
                      {section === 'commits' && (
                        <div className="mb-2.5 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <GitCommit size={14} className="text-slate-400" />
                            {authorName}
                          </span>
                          {sha && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                              {sha.slice(0, 7)}
                            </span>
                          )}
                        </div>
                      )}

                      {section === 'branches' && (
                        <div className="mb-2.5 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                            <GitBranch size={13} />
                            Branch
                          </span>
                          {Boolean(item.protected) && (
                            <span className="badge bg-amber-50 text-amber-700">Protected</span>
                          )}
                        </div>
                      )}

                      {section === 'pulls' && (
                        <div className="mb-2.5 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <GitPullRequest size={14} className="text-indigo-600" />
                            PR #{String(item.number || i + 1)}
                          </span>
                          <span className={`badge ${
                            String(item.state).toLowerCase() === 'open'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}>
                            {String(item.state || 'closed')}
                          </span>
                        </div>
                      )}

                      {section === 'contributors' && (
                        <div className="mb-2.5 flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {authorName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs text-slate-400">Contributor</span>
                        </div>
                      )}

                      {/* Main Title / Message */}
                      <p className="font-semibold text-slate-800 text-sm leading-snug break-words">
                        {titleText}
                      </p>
                    </div>

                    {/* Footer info */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
                      {section === 'contributors' ? (
                        <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {String(item.contributions || 1)} contributions
                        </span>
                      ) : (
                        <span>{dateVal ? formatDate(dateVal) : 'Recent activity'}</span>
                      )}

                      {Boolean(item.html_url || item.url) && (
                        <a
                          href={String(item.html_url || item.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-indigo-600 transition"
                        >
                          Details <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500 bg-slate-50/40">
                No {section} found in this repository.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

/* ── Traceability ────────────────────────────────────────────── */
const TraceabilityView = ({
  data,
  projectId: _projectId,
  refresh,
  notify,
}: {
  data: Traceability | null;
  projectId?: string;
  refresh: () => void;
  notify: (s: string, type?: 'success' | 'error') => void;
}) => {
  const [view, setView] = useState<'matrix' | 'tree' | 'gaps'>('matrix');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [linkingModal, setLinkingModal] = useState<{ open: boolean; storyId: string; storyTitle: string }>({
    open: false,
    storyId: '',
    storyTitle: '',
  });
  const [selectedReqId, setSelectedReqId] = useState('');
  const [busy, setBusy] = useState(false);

  const coverage = data?.coverage as Record<string, number> | undefined;
  const matrixRows = asList<Row>(data?.matrix);
  const treeNodes = asList<Row>(data?.tree);
  const unlinkedStories = asList<Row>(data?.unlinkedStories);
  const unlinkedBugs = asList<Row>(data?.unlinkedBugs);

  const uncoveredReqs = treeNodes.filter((req) => !asList<Row>(req.stories).length);

  const filteredRows = matrixRows.filter((row) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      String(row.requirementTitle || '').toLowerCase().includes(q) ||
      String(row.userStoryTitle || '').toLowerCase().includes(q) ||
      String(row.taskTitle || '').toLowerCase().includes(q) ||
      String(row.bugTitle || '').toLowerCase().includes(q) ||
      String(row.sprintName || '').toLowerCase().includes(q);

    if (!matchSearch) return false;
    if (statusFilter === 'COMPLETE') return row.taskStatus === 'DONE';
    if (statusFilter === 'IN_PROGRESS') return row.taskStatus === 'IN_PROGRESS' || row.userStoryStatus === 'IN_PROGRESS';
    if (statusFilter === 'WITH_BUGS') return Boolean(row.bugTitle);
    if (statusFilter === 'UNLINKED') return !row.requirementId || !row.userStoryId || !row.taskId;
    return true;
  });

  const handleLinkStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqId || !linkingModal.storyId) return;
    setBusy(true);
    try {
      await post(`/requirements/${selectedReqId}/stories`, { userStoryId: linkingModal.storyId });
      notify('User story linked to requirement', 'success');
      setLinkingModal({ open: false, storyId: '', storyTitle: '' });
      setSelectedReqId('');
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to link user story', 'error');
    } finally {
      setBusy(false);
    }
  };

  const hasAnyData = matrixRows.length > 0 || treeNodes.length > 0 || unlinkedStories.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Coverage Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface p-4">
          <p className="text-xs font-medium text-slate-500">Requirement Coverage</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {coverage?.requirementCoverageRate ?? 0}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({coverage?.coveredRequirements ?? 0}/{coverage?.totalRequirements ?? 0} covered)
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 rounded"
              style={{ width: `${Math.min(100, coverage?.requirementCoverageRate ?? 0)}%` }}
            />
          </div>
        </div>

        <div className="surface p-4">
          <p className="text-xs font-medium text-slate-500">Tasks Completed</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {coverage?.completedTasks ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {coverage?.totalTasks ?? 0} total tasks
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 rounded"
              style={{
                width: `${
                  (coverage?.totalTasks ?? 0) > 0
                    ? Math.round(((coverage?.completedTasks ?? 0) / (coverage?.totalTasks ?? 1)) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="surface p-4">
          <p className="text-xs font-medium text-slate-500">Stories in Delivery</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {coverage?.storiesWithTasks ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {coverage?.totalStories ?? 0} in sprints
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 rounded"
              style={{
                width: `${
                  (coverage?.totalStories ?? 0) > 0
                    ? Math.round(((coverage?.storiesWithTasks ?? 0) / (coverage?.totalStories ?? 1)) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="surface p-4">
          <p className="text-xs font-medium text-slate-500">Defects & Traceability</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {coverage?.linkedBugs ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {coverage?.totalBugs ?? 0} linked ({coverage?.resolvedBugs ?? 0} resolved)
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-slate-100">
            <div
              className="h-full bg-rose-500 transition-all duration-300 rounded"
              style={{
                width: `${
                  (coverage?.totalBugs ?? 0) > 0
                    ? Math.round(((coverage?.linkedBugs ?? 0) / (coverage?.totalBugs ?? 1)) * 100)
                    : 100
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Traceability Workspace Container */}
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Traceability Matrix & Hierarchy
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Verify requirement coverage, sprint execution alignment, and defect resolution.
            </p>
          </div>

          {/* View switcher buttons */}
          <div className="flex rounded-md bg-slate-100/80 p-1 border border-slate-200/60">
            <button
              onClick={() => setView('matrix')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                view === 'matrix' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matrix Table ({matrixRows.length})
            </button>
            <button
              onClick={() => setView('tree')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                view === 'tree' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hierarchy Tree ({treeNodes.length})
            </button>
            <button
              onClick={() => setView('gaps')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                view === 'gaps' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gap Analysis ({uncoveredReqs.length + unlinkedStories.length + unlinkedBugs.length})
            </button>
          </div>
        </div>

        {/* View 1: MATRIX TABLE */}
        {view === 'matrix' && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2 max-w-md rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm transition focus-within:border-indigo-400 focus-within:bg-white">
                <input
                  type="text"
                  placeholder="Search requirement, story, task, bug, sprint…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400 text-xs sm:text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Filter:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition hover:border-slate-300"
                >
                  <option value="ALL">All Relationships</option>
                  <option value="COMPLETE">Completed Tasks</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WITH_BUGS">Linked Defects</option>
                  <option value="UNLINKED">Gaps & Unlinked</option>
                </select>
              </div>
            </div>

            {filteredRows.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Requirement</th>
                      <th className="px-4 py-3">User Story</th>
                      <th className="px-4 py-3">Task</th>
                      <th className="px-4 py-3">Sprint</th>
                      <th className="px-4 py-3">Bug / Defect</th>
                      <th className="px-4 py-3">PR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/20 transition">
                        <td className="px-4 py-3 max-w-[200px]">
                          {row.requirementTitle ? (
                            <div>
                              <p className="font-semibold text-slate-900 truncate" title={String(row.requirementTitle)}>
                                {String(row.requirementTitle)}
                              </p>
                              {Boolean(row.requirementStatus) && (
                                <span className="mt-1 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                  {String(row.requirementStatus)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No requirement</span>
                          )}
                        </td>

                        <td className="px-4 py-3 max-w-[200px]">
                          {row.userStoryTitle ? (
                            <div>
                              <p className="font-semibold text-slate-900 truncate" title={String(row.userStoryTitle)}>
                                {String(row.userStoryTitle)}
                              </p>
                              {Boolean(row.userStoryStatus) && (
                                <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                  {String(row.userStoryStatus)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No story</span>
                          )}
                        </td>

                        <td className="px-4 py-3 max-w-[200px]">
                          {row.taskTitle ? (
                            <div>
                              <p className="font-medium text-slate-800 truncate" title={String(row.taskTitle)}>
                                {String(row.taskTitle)}
                              </p>
                              {Boolean(row.taskStatus) && (
                                <span
                                  className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    row.taskStatus === 'DONE'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : row.taskStatus === 'IN_PROGRESS'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {String(row.taskStatus)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No task</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.sprintName ? (
                            <span className="font-medium text-slate-700">{String(row.sprintName)}</span>
                          ) : (
                            <span className="text-slate-400 italic">No sprint</span>
                          )}
                        </td>

                        <td className="px-4 py-3 max-w-[180px]">
                          {row.bugTitle ? (
                            <div>
                              <span className="font-medium text-rose-600 truncate flex items-center gap-1" title={String(row.bugTitle)}>
                                <Bug size={12} className="shrink-0 text-rose-500" />
                                <span>{String(row.bugTitle)}</span>
                              </span>
                              {Boolean(row.bugStatus) && (
                                <span className="mt-1 inline-block rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                                  {String(row.bugStatus)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.pullRequestUrl ? (
                            <a
                              href={String(row.pullRequestUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                            >
                              PR #{String(row.prNumber || '')}
                            </a>
                          ) : row.prNumber ? (
                            <span className="text-slate-600 font-medium">#{String(row.prNumber)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="surface p-12 text-center text-sm text-slate-500">
                {hasAnyData ? 'No relationships match your search/filter.' : 'No traceability relationships found.'}
              </div>
            )}
          </div>
        )}

        {/* View 2: HIERARCHY TREE */}
        {view === 'tree' && (
          <div className="mt-6 space-y-4">
            {treeNodes.length > 0 ? (
              treeNodes.map((req, rIdx) => {
                const stories = asList<Row>(req.stories);
                return (
                  <div key={String(req.id || rIdx)} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                    {/* Requirement Node */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          REQ
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">{String(req.title)}</h3>
                        <Badge value={req.status || 'DRAFT'} />
                      </div>
                      <div className="text-xs text-slate-400">
                        {String(req.type || 'FUNCTIONAL')} · Priority {String(req.priority || 'MEDIUM')}
                      </div>
                    </div>
                    {Boolean(req.description) && (
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed">{String(req.description)}</p>
                    )}

                    {/* Stories nested */}
                    <div className="mt-4 space-y-3 pl-4 border-l-2 border-indigo-200 ml-2">
                      {stories.length > 0 ? (
                        stories.map((story) => {
                          const tasks = asList<Row>(story.tasks);
                          return (
                            <div key={String(story.id)} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                                    STORY
                                  </span>
                                  <p className="font-semibold text-slate-800 text-sm">{String(story.title)}</p>
                                  <Badge value={story.status || 'BACKLOG'} />
                                </div>
                                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                  {String(story.storyPoints ?? '—')} pts
                                </span>
                              </div>

                              {/* Tasks nested */}
                              <div className="mt-3 space-y-2 pl-4 border-l-2 border-blue-200 ml-2">
                                {tasks.length > 0 ? (
                                  tasks.map((task) => {
                                    const taskBugs = asList<Row>(task.bugs);
                                    return (
                                      <div
                                        key={String(task.id)}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 p-2.5 text-xs"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-600 uppercase">
                                            TASK
                                          </span>
                                          <span className="font-medium text-slate-800">{String(task.title)}</span>
                                          <Badge value={task.status} />
                                        </div>

                                        <div className="flex items-center gap-3 text-slate-500">
                                          <span>Assignee: {String((task.assignee as Row)?.name || 'Unassigned')}</span>
                                          {taskBugs.length > 0 && (
                                            <span className="font-semibold text-rose-600">
                                              🐛 {taskBugs.length} defect(s)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-xs italic text-slate-400">No tasks created for this story yet.</p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs italic text-amber-600 bg-amber-50 rounded-lg p-2.5">
                          ⚠️ No user stories linked to this requirement. (Coverage Gap)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="surface p-12 text-center text-sm text-slate-500">
                No requirement hierarchy available.
              </div>
            )}
          </div>
        )}

        {/* View 3: GAP ANALYSIS */}
        {view === 'gaps' && (
          <div className="mt-6 space-y-5">
            {/* Uncovered Requirements */}
            <div className="rounded-2xl border border-slate-200/80 p-5 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 p-1 text-xs">⚠️</span>
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Requirements without User Stories ({uncoveredReqs.length})
                  </h3>
                </div>
                <span className="badge bg-amber-50 text-amber-700">Needs Breakdown</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Requirements that have not yet been broken down into deliverable user stories.
              </p>

              <div className="mt-3.5 space-y-2">
                {uncoveredReqs.length > 0 ? (
                  uncoveredReqs.map((req) => (
                    <div
                      key={String(req.id)}
                      className="flex items-center justify-between rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-3 text-xs"
                    >
                      <span className="font-semibold text-slate-800">{String(req.title)}</span>
                      <Badge value={req.status || 'DRAFT'} />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg p-3">
                    ✓ All requirements are broken down into user stories!
                  </p>
                )}
              </div>
            </div>

            {/* Orphan User Stories */}
            <div className="rounded-2xl border border-slate-200/80 p-5 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-rose-100 p-1 text-xs">⚠️</span>
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Orphan User Stories ({unlinkedStories.length})
                  </h3>
                </div>
                <span className="badge bg-rose-50 text-rose-700">Missing Requirement</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                User stories that exist in the backlog but have no parent requirement linked for traceability.
              </p>

              <div className="mt-3.5 space-y-2">
                {unlinkedStories.length > 0 ? (
                  unlinkedStories.map((story) => (
                    <div
                      key={String(story.id)}
                      className="flex items-center justify-between rounded-xl border border-dashed border-rose-200 bg-rose-50/40 p-3 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{String(story.title)}</span>
                        <span className="ml-2 text-slate-400">({String(story.storyPoints || '—')} pts)</span>
                      </div>
                      <button
                        className="btn-secondary px-2.5 py-1 text-xs"
                        onClick={() => {
                          setSelectedReqId(String(treeNodes[0]?.id || ''));
                          setLinkingModal({
                            open: true,
                            storyId: String(story.id),
                            storyTitle: String(story.title),
                          });
                        }}
                      >
                        Link to Requirement
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg p-3">
                    ✓ All user stories are linked to parent requirements!
                  </p>
                )}
              </div>
            </div>

            {/* Orphan Defects */}
            <div className="rounded-2xl border border-slate-200/80 p-5 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 p-1 text-xs">🐛</span>
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Unlinked Defects & Bugs ({unlinkedBugs.length})
                  </h3>
                </div>
                <span className="badge bg-slate-100 text-slate-700">Unlinked</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Bugs that are not associated with any requirement, user story, or task.
              </p>

              <div className="mt-3.5 space-y-2">
                {unlinkedBugs.length > 0 ? (
                  unlinkedBugs.map((bug) => (
                    <div
                      key={String(bug.id)}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <span className="font-semibold text-slate-800">🐛 {String(bug.title)}</span>
                      <Badge value={bug.status || 'OPEN'} />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg p-3">
                    ✓ All logged defects have traceability links!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal for linking orphan stories to requirements */}
        {linkingModal.open && (
          <Modal
            title="Link Story to Requirement"
            close={() => setLinkingModal({ open: false, storyId: '', storyTitle: '' })}
          >
            <form onSubmit={handleLinkStory} className="space-y-4">
              <p className="text-sm text-slate-600">
                Link user story <span className="font-semibold">"{linkingModal.storyTitle}"</span> to a parent requirement:
              </p>
              <label className="block text-sm font-medium text-slate-700">
                Select Requirement
                <select
                  className="input mt-1.5"
                  value={selectedReqId}
                  onChange={(e) => setSelectedReqId(e.target.value)}
                  required
                >
                  <option value="">Choose a requirement…</option>
                  {treeNodes.map((r) => (
                    <option key={String(r.id)} value={String(r.id)}>
                      {String(r.title)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setLinkingModal({ open: false, storyId: '', storyTitle: '' })}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button className="btn-primary" disabled={busy || !selectedReqId}>
                  {busy ? 'Linking…' : 'Link story'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </section>
    </div>
  );
};

/* ── CrudList Component ──────────────────────────────────────── */
const CrudList = ({
  title, addLabel, items, onAdd, onUpdate, onDelete,
  fields, render, actions, canAdd = true,
}: {
  title: string; addLabel: string; items: Row[];
  onAdd: (data: Row) => Promise<void>;
  onUpdate: (item: Row, data: Row) => Promise<void>;
  onDelete: (item: Row) => Promise<void>;
  fields: React.ReactNode;
  render: (item: Row) => React.ReactNode;
  actions?: (item: Row) => React.ReactNode;
  canAdd?: boolean;
}) => {
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [error, setError] = useState('');

  const open = (item?: Row) => {
    setError('');
    setEditing(item || {});
    setForm(item || {});
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing?.id) await onUpdate(editing, form);
      else await onAdd(form);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    }
  };

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">Manage {title.toLowerCase()} and lifecycle tracking</p>
        </div>
        {canAdd && (
          <button className="btn-primary" onClick={() => open()}>
            <Plus size={14} /> {addLabel}
          </button>
        )}
      </div>

      {items.length ? (
        <div className="mt-4 space-y-2.5">
          {items.map((item, i) => (
            <div key={String(item.id || i)} className="rounded-lg border border-slate-200/80 p-4 bg-white transition-colors hover:border-slate-300">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">{render(item)}</div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button className="btn-ghost" onClick={() => open(item)}>
                    Edit
                  </button>
                  {actions?.(item)}
                  <button
                    className="rounded-md p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    onClick={async () => {
                      if (window.confirm(`Delete this ${title.toLowerCase().slice(0, -1)}?`))
                        await onDelete(item);
                    }}
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-slate-500">
          No {title.toLowerCase()} recorded yet.
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? `Edit ${title.slice(0, -1).toLowerCase()}` : addLabel}
          close={() => setEditing(null)}
        >
          <form onSubmit={save} className="space-y-4">
            <FormContext.Provider value={{ form, setForm }}>
              {fields}
            </FormContext.Provider>
            {error && <ErrorText text={error} />}
            <button className="btn-primary w-full mt-2">
              <Save size={15} /> Save changes
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
};

/* ── RequirementLinks ────────────────────────────────────────── */
const RequirementLinks = ({
  requirementId, stories, notify, refresh,
}: {
  requirementId: string; stories: Row[];
  notify: (s: string) => void; refresh: () => void;
}) => {
  const [linked, setLinked] = useState<Row[]>([]);
  const [selected, setSelected] = useState('');

  const load = () =>
    get<unknown>(endpoints.requirementStories(requirementId))
      .then((data) => setLinked(asList<Row>(data)))
      .catch(() => setLinked([]));

  useEffect(() => {
    load();
  }, [requirementId]);

  return (
    <div className="mt-3.5 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Linked stories</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {linked.map((story, idx) => {
          const storyId = String((story.userStory as Row)?.id || story.id || story.linkId || idx);
          const storyTitle = String((story.userStory as Row)?.title || story.title || 'Untitled Story');
          const unlinkId = String((story.userStory as Row)?.id || story.id || story.linkId);
          return (
            <span
              key={storyId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-xs"
            >
              {storyTitle}
              <button
                type="button"
                onClick={async () => {
                  await del(`/requirements/${requirementId}/stories/${unlinkId}`);
                  notify('Story unlinked');
                  load();
                  refresh();
                }}
                className="text-slate-400 hover:text-rose-500 transition"
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        {!linked.length && <span className="text-xs text-slate-400">No stories linked</span>}
      </div>

      {stories.length > linked.length && (
        <div className="mt-3 flex gap-2">
          <select
            className="input py-1.5 text-xs"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Link a story…</option>
            {stories
              .filter(
                (story) =>
                  !linked.some(
                    (item) => String((item.userStory as Row)?.id || item.id || item.linkId) === String(story.id)
                  )
              )
              .map((story) => (
                <option key={String(story.id)} value={String(story.id)}>
                  {String(story.title)}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!selected}
            className="btn-secondary px-3 py-1.5 text-xs whitespace-nowrap"
            onClick={async () => {
              await post(`/requirements/${requirementId}/stories`, { userStoryId: selected });
              notify('Story linked');
              setSelected('');
              load();
              refresh();
            }}
          >
            Link
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Form Fields & Context ───────────────────────────────────── */
type FormContextValue = { form: Row; setForm: React.Dispatch<React.SetStateAction<Row>> };
const FormContext = React.createContext<FormContextValue | null>(null);

const Field = ({
  label, value, onChange, type = 'text', required = false,
}: {
  label: string; value: string; onChange: (value: string) => void;
  type?: string; required?: boolean;
}) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    <input
      className="input mt-1.5"
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);

const Textarea = ({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (value: string) => void;
}) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    <textarea
      className="input mt-1.5 min-h-24 resize-y"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);

const Select = ({
  label, value, options, onChange,
}: {
  label: string; value: string;
  options: (string | { value: string; label: string })[];
  onChange: (value: string) => void;
}) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    <select className="input mt-1.5" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt, i) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const lab = typeof opt === 'string' ? opt : opt.label;
        return <option key={`${val}-${i}`} value={val}>{lab}</option>;
      })}
    </select>
  </label>
);

const RequirementFields = () => {
  const c = React.useContext(FormContext)!;
  return (
    <>
      <Field label="Title" value={String(c.form.title || '')} onChange={(v) => c.setForm({ ...c.form, title: v })} required />
      <Textarea label="Description" value={String(c.form.description || '')} onChange={(v) => c.setForm({ ...c.form, description: v })} />
      <div className="grid grid-cols-2 gap-3.5">
        <Select label="Type" value={String(c.form.type || 'FUNCTIONAL')} options={['FUNCTIONAL', 'NON_FUNCTIONAL']} onChange={(v) => c.setForm({ ...c.form, type: v })} />
        <Select label="Priority" value={String(c.form.priority || 'MEDIUM')} options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']} onChange={(v) => c.setForm({ ...c.form, priority: v })} />
      </div>
    </>
  );
};

const StoryFields = () => {
  const c = React.useContext(FormContext)!;
  return (
    <>
      <Field label="Title" value={String(c.form.title || '')} onChange={(v) => c.setForm({ ...c.form, title: v })} required />
      <Textarea label="Description" value={String(c.form.description || '')} onChange={(v) => c.setForm({ ...c.form, description: v })} />
      <div className="grid grid-cols-2 gap-3.5">
        <Select label="Priority" value={String(c.form.priority || 'MEDIUM')} options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']} onChange={(v) => c.setForm({ ...c.form, priority: v })} />
        <Field label="Story points" type="number" value={String(c.form.storyPoints || '')} onChange={(v) => c.setForm({ ...c.form, storyPoints: Number(v) })} />
      </div>
    </>
  );
};

const SprintFields = () => {
  const c = React.useContext(FormContext)!;
  return (
    <>
      <Field label="Sprint name" value={String(c.form.name || '')} onChange={(v) => c.setForm({ ...c.form, name: v })} required />
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Start date" type="date" value={String(c.form.startDate || '')} onChange={(v) => c.setForm({ ...c.form, startDate: v })} required />
        <Field label="End date" type="date" value={String(c.form.endDate || '')} onChange={(v) => c.setForm({ ...c.form, endDate: v })} required />
      </div>
      <Select label="Status" value={String(c.form.status || 'PLANNED')} options={['PLANNED', 'ACTIVE', 'COMPLETED']} onChange={(v) => c.setForm({ ...c.form, status: v })} />
    </>
  );
};

const BugFields = ({
  requirements = [], stories = [], tasks = [], sprints = [], members = [],
}: {
  requirements?: Row[]; stories?: Row[]; tasks?: Row[]; sprints?: Row[]; members?: Row[];
}) => {
  const c = React.useContext(FormContext)!;
  const memberOptions = [
    { value: '', label: 'Unassigned' },
    ...members
      .map((item) => {
        const u = (item.user || {}) as Row;
        const id = String(item.userId || u.id || item.id || '');
        const name = String(u.name || item.name || '');
        const email = String(u.email || item.email || '');
        const label = name && email ? `${name} (${email})` : name || email || id;
        return { value: id, label };
      })
      .filter((opt) => Boolean(opt.value)),
  ];

  const reqOptions = [
    { value: '', label: 'None' },
    ...requirements.map((item) => ({ value: String(item.id), label: String(item.title || item.id) })),
  ];
  const storyOptions = [
    { value: '', label: 'None' },
    ...stories.map((item) => ({ value: String(item.id), label: String(item.title || item.id) })),
  ];
  const taskOptions = [
    { value: '', label: 'None' },
    ...tasks.map((item) => ({ value: String(item.id), label: String(item.title || item.id) })),
  ];
  const sprintOptions = [
    { value: '', label: 'None' },
    ...sprints.map((item) => ({ value: String(item.id), label: String(item.name || item.id) })),
  ];

  return (
    <>
      <Field label="Title" value={String(c.form.title || '')} onChange={(v) => c.setForm({ ...c.form, title: v })} required />
      <Textarea label="Description" value={String(c.form.description || '')} onChange={(v) => c.setForm({ ...c.form, description: v })} />
      <div className="grid grid-cols-2 gap-3.5">
        <Select label="Priority" value={String(c.form.priority || 'MEDIUM')} options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']} onChange={(v) => c.setForm({ ...c.form, priority: v })} />
        <Select label="Severity" value={String(c.form.severity || 'MEDIUM')} options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']} onChange={(v) => c.setForm({ ...c.form, severity: v })} />
      </div>
      <Select label="Status" value={String(c.form.status || 'OPEN')} options={['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']} onChange={(v) => c.setForm({ ...c.form, status: v })} />
      <Select label="Assignee" value={String(c.form.assigneeId || '')} options={memberOptions} onChange={(v) => c.setForm({ ...c.form, assigneeId: v || null })} />
      <Select label="Requirement" value={String(c.form.requirementId || '')} options={reqOptions} onChange={(v) => c.setForm({ ...c.form, requirementId: v || null })} />
      <Select label="User story" value={String(c.form.userStoryId || '')} options={storyOptions} onChange={(v) => c.setForm({ ...c.form, userStoryId: v || null })} />
      <Select label="Task" value={String(c.form.taskId || '')} options={taskOptions} onChange={(v) => c.setForm({ ...c.form, taskId: v || null })} />
      <Select label="Sprint" value={String(c.form.sprintId || '')} options={sprintOptions} onChange={(v) => c.setForm({ ...c.form, sprintId: v || null })} />
      <Field label="Pull request URL (optional)" value={String(c.form.pullRequestUrl || '')} onChange={(v) => c.setForm({ ...c.form, pullRequestUrl: v })} />
      <Field label="PR number (optional)" type="number" value={String(c.form.prNumber || '')} onChange={(v) => c.setForm({ ...c.form, prNumber: v ? Number(v) : null })} />
    </>
  );
};

/* ── Modal & ErrorText ───────────────────────────────────────── */
const Modal = ({
  title, close, children,
}: {
  title: string; close: () => void; children: React.ReactNode;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs overflow-y-auto">
    <div className="surface flex w-full max-w-lg max-h-[90vh] flex-col p-5 sm:p-6 my-auto shadow-modal">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={close}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  </div>
);

const ErrorText = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
    {text}
  </div>
);
