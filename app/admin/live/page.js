'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminNav from '../../../components/AdminNav';
import LiveStudentList from '../../../components/LiveStudentList';
import api from '../../../lib/api';

function formatViolationSummary(summary = {}) {
  const entries = Object.entries(summary);
  if (!entries.length) {
    return 'None';
  }
  return entries.map(([type, count]) => `${type} (${count})`).join(', ');
}

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

export default function LivePage() {
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [waitingRoster, setWaitingRoster] = useState([]);
  const [liveRoster, setLiveRoster] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [message, setMessage] = useState('');
  const [stopping, setStopping] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [tab, setTab] = useState('rosters');

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await api.get('/api/assessments');
        const activeSessions = (response.data.assessments || []).filter((assessment) => ['waiting_room', 'live'].includes(assessment.status));
        setSessions(activeSessions);
        if (!sessionId && activeSessions[0]?.sessionId) {
          setSessionId(activeSessions[0].sessionId);
        }
      } catch (err) {
        setSessions([]);
      }
    };

    loadSessions();
    const intervalId = window.setInterval(loadSessions, 6000);
    return () => window.clearInterval(intervalId);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setWaitingRoster([]);
      setLiveRoster([]);
      setLeaderboard([]);
      setSessionMeta(null);
      return undefined;
    }

    let active = true;
    const loadLiveSession = async () => {
      try {
        const response = await api.get(`/api/admin/live/${sessionId}`);
        if (!active) {
          return;
        }
        setWaitingRoster(response.data.waitingRoster || []);
        setLiveRoster(response.data.liveRoster || []);
        setLeaderboard(response.data.leaderboard || []);
        setSessionMeta(response.data.session || null);
        setMessage('');
      } catch (err) {
        if (active) {
          setMessage(err.response?.data?.error || 'Unable to load live session');
        }
      }
    };

    loadLiveSession();
    const intervalId = window.setInterval(loadLiveSession, 2500);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [sessionId]);

  const selectedSession = sessions.find((item) => item.sessionId === sessionId);
  const activeStudentCount = liveRoster.length;
  const waitingStudentCount = waitingRoster.length;
  const joinedStudentCount = waitingStudentCount + activeStudentCount;
  const totalLiveScore = liveRoster.reduce((sum, student) => sum + Number(student.score || 0), 0);
  const highestScore = liveRoster.reduce((max, student) => Math.max(max, Number(student.score || 0)), 0);
  const sessionDate = useMemo(() => formatDateTime(sessionMeta?.createdAt || selectedSession?.createdAt), [selectedSession?.createdAt, sessionMeta?.createdAt]);

  const handleStopSession = async () => {
    if (!selectedSession) {
      return;
    }
    setStopping(true);
    setMessage('');
    try {
      await api.post(`/api/assessments/${selectedSession.sessionId}/stop`);
      setMessage('Session stopped. All active candidates were submitted and removed from the live exam flow.');
      setWaitingRoster([]);
      setLiveRoster([]);
      setLeaderboard([]);
      setSessionId('');
      const response = await api.get('/api/assessments');
      setSessions((response.data.assessments || []).filter((assessment) => ['waiting_room', 'live'].includes(assessment.status)));
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to stop session');
    } finally {
      setStopping(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedSession) {
      return;
    }
    setExportingPdf(true);
    setMessage('');
    try {
      const response = await api.get(`/api/admin/export-pdf/${selectedSession.sessionId}`, {
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${selectedSession.sessionId}-results.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <AdminNav />
        {message && <div className="glass-banner mb-4 text-sm text-slate-700">{message}</div>}
        <section className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr] fade-rise">
          <div className="compact-stack min-w-0">
            <div className="card-strong">
              <div className="badge-orange">Live Assessments</div>
              <h1 className="section-title mt-2">Active session monitor</h1>
              <p className="mt-2 text-compact text-slate-600">Pick a session and keep the waiting and live rosters visible without leaving this screen.</p>
            </div>

            <div className="card">
              <label className="label">Load by Session ID</label>
              <input className="input" value={sessionId} onChange={(event) => setSessionId(event.target.value)} placeholder="Enter or pick an active session ID" />
            </div>

            <div className="grid gap-2">
              {sessions.map((session) => (
                <button
                  key={session.sessionId}
                  className={`card w-full text-left transition ${session.sessionId === sessionId ? 'ring-2 ring-[rgba(29,114,255,0.22)]' : 'hover:-translate-y-1'}`}
                  onClick={() => setSessionId(session.sessionId)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{session.name}</p>
                      <p className="mt-1 text-xs text-slate-500">Session ID: {session.sessionId}</p>
                    </div>
                    <span className="badge-blue">{session.studentCount || 0} joined</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    <div className="stat-card">
                      <p className="section-kicker">Questions</p>
                      <p className="mt-2 text-sm font-semibold">{session.questionCount || 0}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Date</p>
                      <p className="mt-2 text-xs font-semibold">{formatDateTime(session.createdAt)}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Status</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em]">{session.status}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Password</p>
                      <p className="mt-2 break-all text-xs font-semibold tracking-[0.1em]">{session.password}</p>
                    </div>
                  </div>
                </button>
              ))}
              {!sessions.length && <div className="table-shell p-3 text-sm text-slate-500">No active sessions found.</div>}
            </div>
          </div>

          <div className="compact-stack min-w-0">
            <div className="card-strong">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Selected Session</p>
                  <h2 className="section-title mt-1">{selectedSession ? selectedSession.name : 'Waiting for a session selection'}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge-blue">{waitingStudentCount} waiting</span>
                  <span className="badge-orange">{activeStudentCount} live</span>
                </div>
              </div>
              {selectedSession && (
                <>
                  <div className="mt-4 grid gap-3 md:grid-cols-6">
                    <div className="stat-card">
                      <p className="section-kicker">Session ID</p>
                      <p className="mt-2 text-sm font-semibold">{selectedSession.sessionId}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Password</p>
                      <p className="mt-2 break-all text-xs font-semibold tracking-[0.1em]">{selectedSession.password}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Status</p>
                      <p className="mt-2 text-sm font-semibold">{sessionMeta?.status || selectedSession.status}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Questions</p>
                      <p className="mt-2 text-sm font-semibold">{selectedSession.questionCount || 0}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Session Date</p>
                      <p className="mt-2 text-xs font-semibold">{sessionDate}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Joined</p>
                      <p className="mt-2 text-sm font-semibold">{joinedStudentCount}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-outline" onClick={handleExportPdf} disabled={exportingPdf}>
                      {exportingPdf ? 'Exporting PDF...' : 'Export PDF'}
                    </button>
                    <button className="btn-accent" onClick={handleStopSession} disabled={stopping}>
                      {stopping ? 'Stopping...' : 'Stop Session'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <div className="panel-tabs">
                {[
                  ['overview', 'Overview'],
                  ['rosters', 'Rosters'],
                  ['leaderboard', `Leaderboard (${leaderboard.length})`]
                ].map(([key, label]) => (
                  <button key={key} className={`tab-chip ${tab === key ? 'tab-chip-active' : ''}`} onClick={() => setTab(key)}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'overview' && (
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="stat-card">
                    <p className="section-kicker">Waiting Room</p>
                    <p className="mt-2 text-lg font-semibold">{waitingStudentCount}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Live Candidates</p>
                    <p className="mt-2 text-lg font-semibold">{activeStudentCount}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Total Live Score</p>
                    <p className="mt-2 text-lg font-semibold">{totalLiveScore}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Top Score</p>
                    <p className="mt-2 text-lg font-semibold">{highestScore}</p>
                  </div>
                </div>
              )}

              {tab === 'rosters' && (
                <div className="mt-4 compact-stack">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="section-kicker">Waiting Room Roster</p>
                      <span className="badge-blue">{waitingRoster.length} waiting</span>
                    </div>
                    <LiveStudentList
                      data={Object.fromEntries(waitingRoster.map((student) => [student.studentId, student]))}
                      emptyMessage="No waiting candidates yet."
                    />
                  </div>
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="section-kicker">Live Exam Roster</p>
                      <span className="badge-orange">{liveRoster.length} active</span>
                    </div>
                    <LiveStudentList
                      data={Object.fromEntries(liveRoster.map((student) => [student.studentId, student]))}
                      emptyMessage="No live candidates yet."
                    />
                  </div>
                </div>
              )}

              {tab === 'leaderboard' && (
                <div className="mt-4 table-shell compact-scroll">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-[rgba(17,33,61,0.08)] text-left text-slate-500">
                        <th className="px-3 py-2 font-medium">Rank</th>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Phone</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Score</th>
                        <th className="px-3 py-2 font-medium">Correct</th>
                        <th className="px-3 py-2 font-medium">Accuracy</th>
                        <th className="px-3 py-2 font-medium">Violations</th>
                        <th className="px-3 py-2 font-medium">Violation Types</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((student) => (
                        <tr key={student.studentId} className="border-b border-[rgba(17,33,61,0.06)] align-top text-slate-700">
                          <td className="px-3 py-2 font-semibold text-slate-900">{student.rank}</td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900">{student.name}</div>
                            {student.attemptedFullscreenExit && <div className="mt-1 text-[11px] font-semibold text-orange-700">Attempted fullscreen exit</div>}
                          </td>
                          <td className="px-3 py-2">{student.phone || '-'}</td>
                          <td className="px-3 py-2">{student.status}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{student.score}</td>
                          <td className="px-3 py-2">{student.correctCount}/{student.totalQuestions}</td>
                          <td className="px-3 py-2">{student.accuracy}%</td>
                          <td className="px-3 py-2">{student.violationCount}</td>
                          <td className="px-3 py-2">{formatViolationSummary(student.violationSummary)}</td>
                        </tr>
                      ))}
                      {!leaderboard.length && (
                        <tr>
                          <td className="px-3 py-4 text-slate-500" colSpan={9}>No ranked students yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
