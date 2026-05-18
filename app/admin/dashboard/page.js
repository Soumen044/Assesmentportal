'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminNav from '../../../components/AdminNav';
import AdminPageGuard from '../../../components/AdminPageGuard';
import api from '../../../lib/api';

function formatDate(value) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

export default function AdminDashboardPage() {
  const [assessments, setAssessments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('sessions');
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [removingNotificationId, setRemovingNotificationId] = useState('');

  useEffect(() => {
    const loadAssessments = async () => {
      try {
        const response = await api.get('/api/assessments');
        setAssessments(response.data.assessments || []);
      } catch (error) {
        setAssessments([]);
        setMessage('Unable to load dashboard data.');
      }
    };

    loadAssessments();
  }, []);

  useEffect(() => {
    if (tab !== 'notifications' || notificationsLoaded || loadingNotifications) {
      return;
    }

    const loadNotifications = async () => {
      setLoadingNotifications(true);
      try {
        const response = await api.get('/api/admin/notifications');
        setNotifications(response.data.notifications || []);
        setNotificationsLoaded(true);
      } catch (error) {
        setMessage('Unable to load notifications.');
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotifications();
  }, [loadingNotifications, notificationsLoaded, tab]);

  const activeCount = assessments.filter((assessment) => assessment.status === 'live').length;
  const waitingCount = assessments.filter((assessment) => assessment.status === 'waiting_room').length;
  const recentSessions = useMemo(() => assessments.slice(0, 9), [assessments]);

  const handleDeleteNotification = async (notificationId) => {
    const previousNotifications = notifications;
    setRemovingNotificationId(notificationId);
    setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    try {
      await api.delete(`/api/admin/notifications/${notificationId}`);
    } catch (error) {
      setNotifications(previousNotifications);
      setMessage(error.response?.data?.error || 'Unable to delete notification.');
    } finally {
      setRemovingNotificationId('');
    }
  };

  return (
    <AdminPageGuard>
      <main className="page-shell surface-grid">
        <div className="page-wrap">
          <AdminNav />
          {message && <div className="glass-banner mb-3 text-xs text-slate-700">{message}</div>}

          <section className="compact-stack fade-rise">
            <div className="card-strong">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="badge-blue">Admin Dashboard</div>
                  <h1 className="section-title mt-2">Compact session grid</h1>
                </div>
                <Link href="/admin/create" className="btn-primary">New Session</Link>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="stat-card">
                  <p className="section-kicker">Sessions</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{assessments.length}</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Live</p>
                  <p className="mt-1 text-xl font-semibold text-blue-700">{activeCount}</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Waiting</p>
                  <p className="mt-1 text-xl font-semibold text-orange-600">{waitingCount}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="panel-tabs">
                  {[
                    ['sessions', 'Sessions'],
                    ['notifications', `Notifications (${notifications.length})`],
                    ['actions', 'Actions']
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
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {recentSessions.map((assessment) => (
                    <div key={assessment.sessionId} className="table-shell p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{assessment.name}</p>
                          <p className="text-compact text-slate-500">{assessment.sessionId}</p>
                        </div>
                        <span className={assessment.status === 'live' ? 'badge-orange' : assessment.status === 'waiting_room' ? 'badge-blue' : 'badge-slate'}>
                          {assessment.status}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="stat-card">
                          <p className="section-kicker">Date</p>
                          <p className="mt-1 text-compact font-semibold text-slate-900">{formatDate(assessment.createdAt)}</p>
                        </div>
                        <div className="stat-card">
                          <p className="section-kicker">Questions</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{assessment.questionCount || 0}</p>
                        </div>
                        <div className="stat-card">
                          <p className="section-kicker">Creator</p>
                          <p className="mt-1 text-compact font-semibold text-slate-900">{assessment.createdBy || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!recentSessions.length && <div className="table-shell p-3 text-xs text-slate-500">No sessions yet.</div>}
                </div>
              )}

              {tab === 'notifications' && (
                <div className="mt-3 compact-stack">
                  {loadingNotifications && <div className="table-shell p-3 text-xs text-slate-500">Loading notifications...</div>}
                  {!loadingNotifications && notifications.map((notification) => (
                    <div key={notification.id} className="table-shell p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{notification.title}</p>
                          <p className="mt-1 text-compact text-slate-600">{notification.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                            <span>{notification.sessionId || 'No Session'}</span>
                            <span>{formatDate(notification.createdAt)}</span>
                          </div>
                        </div>
                        <button
                          className="btn-outline"
                          onClick={() => handleDeleteNotification(notification.id)}
                          disabled={removingNotificationId === notification.id}
                        >
                          {removingNotificationId === notification.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {!loadingNotifications && !notifications.length && (
                    <div className="table-shell p-3 text-xs text-slate-500">No notifications.</div>
                  )}
                </div>
              )}

              {tab === 'actions' && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Link href="/admin/create" className="table-shell p-3 transition hover:-translate-y-0.5">
                    <p className="font-semibold text-slate-900">Create</p>
                    <p className="mt-1 text-compact text-slate-600">Build or edit a session.</p>
                  </Link>
                  <Link href="/admin/live" className="table-shell p-3 transition hover:-translate-y-0.5">
                    <p className="font-semibold text-slate-900">Live</p>
                    <p className="mt-1 text-compact text-slate-600">Monitor active exams.</p>
                  </Link>
                  <Link href="/admin/previous" className="table-shell p-3 transition hover:-translate-y-0.5">
                    <p className="font-semibold text-slate-900">Archive</p>
                    <p className="mt-1 text-compact text-slate-600">Open previous assessments.</p>
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </AdminPageGuard>
  );
}
