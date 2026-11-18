import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { asList, endpoints, formatDate, get, patch, post } from '../lib/api';

type Notification = {
  id: string;
  title?: string;
  message?: string;
  body?: string;
  read?: boolean;
  isRead?: boolean;
  createdAt?: string;
  link?: string;
  projectId?: string;
  entityType?: string;
  entityId?: string;
  [key: string]: unknown;
};

export const NotificationsPage: React.FC = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    get<unknown>(endpoints.notifications)
      .then((data) => setItems(asList<Notification>(data)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const changed = () => window.dispatchEvent(new Event('capstonehub:notifications-changed'));

  const mark = async (item: Notification) => {
    setError('');
    try {
      await patch(`/notifications/${item.id}/read`);
      setItems((current) =>
        current.map((n) => (n.id === item.id ? { ...n, read: true, isRead: true } : n))
      );
      changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to mark notification as read');
    }
  };

  const respond = async (item: Notification, action: 'ACCEPT' | 'REJECT') => {
    setError('');
    try {
      await post(`/notifications/${item.id}/respond`, { action });
      const isFac = item.entityType === 'FACULTY_INVITATION';
      setItems((current) =>
        current.map((n) =>
          n.id === item.id
            ? {
                ...n,
                entityId: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
                title: `${isFac ? 'Faculty Advisor Request' : 'Project Invitation'} (${
                  action === 'ACCEPT' ? 'Accepted' : 'Declined'
                })`,
                message: `${(n.message || '').replace(
                  / - Request (accepted|not accepted)/g,
                  ''
                )} - ${action === 'ACCEPT' ? 'Request accepted' : 'Request not accepted'}`,
                read: true,
                isRead: true,
              }
            : n
        )
      );
      changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to respond to invitation');
    }
  };

  const allRead = async () => {
    setError('');
    try {
      await post('/notifications/mark-all-read');
      setItems((current) => current.map((n) => ({ ...n, read: true, isRead: true })));
      changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to mark notifications as read');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Reviews, team invitations, and workspace activity requiring attention.
          </p>
        </div>
        <button className="btn-secondary" onClick={allRead}>
          <CheckCheck size={15} /> Mark all as read
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="surface overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading notifications…</div>
        ) : items.length ? (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const read = Boolean(item.read || item.isRead);
              const isInvitation =
                item.entityType === 'TEAM_INVITATION' || item.entityType === 'FACULTY_INVITATION';
              const isPending = isInvitation && item.entityId === 'PENDING';
              const isAccepted =
                isInvitation &&
                (item.entityId === 'ACCEPTED' || item.message?.includes('Request accepted'));
              const isRejected =
                isInvitation &&
                (item.entityId === 'REJECTED' || item.message?.includes('Request not accepted'));

              return (
                <div
                  key={item.id}
                  className={`flex gap-3.5 p-4 sm:p-5 transition-colors ${
                    read ? 'bg-white' : 'bg-slate-50/80 border-l-2 border-indigo-600'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      read ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <Bell size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-sm font-semibold text-slate-900">
                        {item.title || 'Project update'}
                      </h2>
                      <span className="text-xs font-mono text-slate-400">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {item.message ||
                        item.body ||
                        'A new activity was recorded in your workspace.'}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      {isPending ? (
                        <>
                          <button
                            className="btn-primary px-3 py-1 text-xs"
                            onClick={() => respond(item, 'ACCEPT')}
                          >
                            Accept
                          </button>
                          <button
                            className="btn-secondary px-3 py-1 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() => respond(item, 'REJECT')}
                          >
                            Decline
                          </button>
                        </>
                      ) : isAccepted ? (
                        <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">
                          Request accepted
                        </span>
                      ) : isRejected ? (
                        <span className="badge bg-rose-50 text-rose-700 border-rose-200">
                          Request declined
                        </span>
                      ) : (
                        <>
                          {!read && (
                            <button
                              className="btn-ghost"
                              onClick={() => mark(item)}
                            >
                              <Check size={13} /> Mark read
                            </button>
                          )}
                          {item.link && (
                            <button
                              className="btn-ghost"
                              onClick={() => navigate(String(item.link))}
                            >
                              <ExternalLink size={13} /> Open item
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Bell className="mx-auto text-slate-300" size={28} />
            <p className="mt-3 text-xs text-slate-500">You are all caught up on project activity.</p>
          </div>
        )}
      </section>
    </div>
  );
};
