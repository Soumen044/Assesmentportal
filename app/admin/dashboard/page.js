'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminNav from '../../../components/AdminNav';
import api from '../../../lib/api';

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export default function AdminDashboardPage() {
  const [assessments, setAssessments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('sessions');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/api/assessments');
        setAssessments(response.data.assessments || []);
        setNotifications(response.data.notifications || []);
      } catch (error) {
        setAssessments([]);
        setNotifications([]);
        setMessage('Unable to load dashboard data.');
      }
    };
    load();
  }, []);

  const activeCount = assessments.filter((assessment) => assessment.status === 'live').length;
  const waitingCount = assessments.filter((assessment) => assessment.status === 'waiting_room').length;
  const totalStudents = assessments.reduce((sum, assessment) => sum + Number(assessment.studentCount || 0), 0);
  const recentSessions = useMemo(() => assessments.slice(0, 6), [assessments]);

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <AdminNav />
        {message && <div className="glass-banner mb-4 text-sm text-slate-700">{message}</div>}

        <section className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr] fade-rise">
          <div className="compact-stack min-w-0">
            <div className="card-strong">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="badge-blue">Compact Admin View</div>
                  <h1 className="hero-title text-2xl md:text-3xl">Fast session control with less scrolling.</h1>
                  <p className="hero-subtitle max-w-2xl">
                    Priority actions and summaries stay at the top so the admin workflow fits in less space.
                  </p>
                </div>
                <Link href="/admin/create" className="btn-primary">New Session</Link>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
                <div className="stat-card">
                  <p className="section-kicker">All Sessions</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{assessments.length}</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Live Now</p>
                  <p className="mt-1 text-xl font-semibold text-blue-700">{activeCount}</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Waiting Rooms</p>
                  <p className="mt-1 text-xl font-semibold text-orange-600">{waitingCount}</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Participants</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{totalStudents}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Workspace Tabs</p>
                  <h2 className="section-title mt-1">Current admin feed</h2>
                </div>
                <div className="panel-tabs">
                  {[
                    ['sessions', 'Sessions'],
                    ['notifications', `Notifications (${notifications.length})`],
                    ['actions', 'Quick Actions']
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      className={`tab-chip ${tab === key ? 'tab-chip-active' : ''}`}
                      onClick={() => setTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {tab === 'sessions' && (
                <div className="mt-4 compact-stack">
                  {recentSessions.map((assessment) => (
                    <div key={assessment.sessionId} className="table-shell p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{assessment.name}</p>
                          <p className="text-compact text-slate-500">Session ID: {assessment.sessionId}</p>
                        </div>
                        <span className={assessment.status === 'live' ? 'badge-orange' : assessment.status === 'waiting_room' ? 'badge-blue' : 'badge-slate'}>
                          {assessment.status}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-4">
                        <div className="stat-card">
                          <p className="section-kicker">Date</p>
                          <p className="mt-2 text-xs font-semibold text-slate-900">{formatDateTime(assessment.createdAt)}</p>
                        </div>
                        <div className="stat-card">
                          <p className="section-kicker">Questions</p>
                          <p className="mt-2 text-lg font-semibold">{assessment.questionCount || 0}</p>
                        </div>
                        <div className="stat-card">
                          <p className="section-kicker">Students</p>
                          <p className="mt-2 text-lg font-semibold">{assessment.studentCount || 0}</p>
                        </div>
                        <div className="stat-card">
                          <p className="section-kicker">Creator</p>
                          <p className="mt-2 text-xs font-semibold text-slate-900">{assessment.createdBy || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!recentSessions.length && <div className="table-shell p-3 text-sm text-slate-500">No sessions yet.</div>}
                </div>
              )}

              {tab === 'notifications' && (
                <div className="mt-4 compact-stack">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="table-shell p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{notification.title}</p>
                          <p className="mt-1 text-compact text-slate-600">{notification.description}</p>
                        </div>
                        <span className={notification.type === 'session-deleted' ? 'badge-orange' : 'badge-blue'}>
                          {notification.type?.replace(/-/g, ' ') || 'info'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                        <span>{notification.sessionId || 'No Session ID'}</span>
                        <span>{formatDateTime(notification.createdAt)}</span>
                        <span>{notification.actor || 'system'}</span>
                      </div>
                    </div>
                  ))}
                  {!notifications.length && <div className="table-shell p-3 text-sm text-slate-500">No notifications yet.</div>}
                </div>
              )}

              {tab === 'actions' && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Link href="/admin/create" className="card transition hover:-translate-y-1">
                    <div className="badge-orange">Create</div>
                    <h3 className="mt-2 text-sm font-semibold">Build Session</h3>
                    <p className="mt-1 text-compact text-slate-600">Use tabs for session setup, questions, timing, and launch.</p>
                  </Link>
                  <Link href="/admin/live" className="card transition hover:-translate-y-1">
                    <div className="badge-blue">Monitor</div>
                    <h3 className="mt-2 text-sm font-semibold">Live Panel</h3>
                    <p className="mt-1 text-compact text-slate-600">View rosters, scoreboards, and session status without long page stacks.</p>
                  </Link>
                  <Link href="/admin/previous" className="card transition hover:-translate-y-1">
                    <div className="badge-slate">Archive</div>
                    <h3 className="mt-2 text-sm font-semibold">Previous Sessions</h3>
                    <p className="mt-1 text-compact text-slate-600">Open exports, charts, question reviews, and cleanup actions from tabs.</p>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="compact-stack min-w-0">
            <div className="card-strong">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Session Dates</p>
                  <h2 className="section-title mt-1">Recent creation timeline</h2>
                </div>
                <span className="badge-blue">{recentSessions.length} shown</span>
              </div>
              <div className="mt-4 compact-stack">
                {recentSessions.map((assessment, index) => (
                  <div key={assessment.sessionId} className="flex items-start gap-2 rounded-[16px] border border-[rgba(17,33,61,0.08)] bg-white/80 p-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(29,114,255,0.1)] text-[11px] font-semibold text-blue-700">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{assessment.name}</p>
                      <p className="text-compact text-slate-500">{assessment.sessionId}</p>
                      <p className="mt-1 text-xs text-slate-600">{formatDateTime(assessment.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {!recentSessions.length && <div className="table-shell p-3 text-sm text-slate-500">No timeline data available.</div>}
              </div>
            </div>

            <div className="card">
              <p className="section-kicker">Compact Notes</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="stat-card">
                  <p className="section-kicker">Container Safety</p>
                  <p className="mt-2 text-compact text-slate-600">Cards now clip overflow, wrap long IDs, and keep data inside borders.</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Fast CRUD</p>
                  <p className="mt-2 text-compact text-slate-600">Admin pages are prepared to use returned payloads directly instead of refetching after every change.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
