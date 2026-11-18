import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  FolderGit2,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { endpoints, get, initials } from '../lib/api';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const faculty = user?.role === 'FACULTY';
  const links = faculty
    ? [{ to: '/faculty/dashboard', label: 'Faculty overview', icon: ShieldCheck }]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/projects', label: 'Projects', icon: FolderGit2 },
      ];

  const activeProject = location.pathname.match(/\/projects\/([^/]+)/)?.[1];
  if (activeProject && !links.some((l) => location.pathname.startsWith(l.to))) {
    links.push({
      to: `/projects/${activeProject}`,
      label: 'Current workspace',
      icon: FolderGit2,
    });
  }

  const refreshUnread = () => {
    get<unknown>(endpoints.unread)
      .then((result) =>
        setUnread(
          typeof result === 'number'
            ? result
            : Number((result as { count?: number })?.count || 0)
        )
      )
      .catch(() => setUnread(0));
  };

  useEffect(() => {
    refreshUnread();
    window.addEventListener('capstonehub:notifications-changed', refreshUnread);
    return () => window.removeEventListener('capstonehub:notifications-changed', refreshUnread);
  }, [location.pathname]);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  const handleSignOut = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Mobile overlay */}
      {mobile && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobile(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-150 ${
          mobile ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${collapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Brand header */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-mono text-xs font-semibold">
              CH
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="block text-sm font-semibold tracking-tight text-slate-900 leading-tight">
                  CapstoneHub
                </span>
                <span className="block text-[11px] text-slate-500 font-normal leading-tight">
                  Academic SE Platform
                </span>
              </div>
            )}
          </button>
          <button
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            onClick={() => setMobile(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 p-3">
          {!collapsed && (
            <p className="px-3 pt-2 pb-1.5 text-[11px] font-medium text-slate-400">
              Workspace
            </p>
          )}
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobile(false)}
              className={({ isActive }) =>
                `flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
              title={collapsed ? link.label : undefined}
            >
              <link.icon size={16} className="shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sign out footer */}
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={handleSignOut}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut size={16} className="shrink-0 text-slate-400" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className={`flex-1 transition-all duration-150 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Sticky top header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 sm:px-8 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobile(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <button
              className="hidden rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:block"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <span className="hidden text-xs text-slate-400 sm:inline font-mono">
              / {faculty ? 'faculty-portal' : 'workspace'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 font-mono text-[10px] font-semibold text-white tabular-nums">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {/* User profile dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg p-1.5 pl-2 transition-colors hover:bg-slate-100 focus:outline-none"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-700 font-mono">
                  {initials(user?.name)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-medium leading-none text-slate-800">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">
                    {user?.role === 'FACULTY' ? 'Faculty Advisor' : user?.role === 'TEAM_LEAD' ? 'Team Lead' : 'Team Member'}
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={`hidden text-slate-400 transition-transform duration-150 sm:block ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-modal z-50 animate-toast-in">
                  <div className="border-b border-slate-100 px-2.5 py-2">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                      {user?.email || ''}
                    </p>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page body */}
        <main className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
