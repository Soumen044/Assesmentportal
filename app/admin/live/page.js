'use client';

import { useEffect, useState } from 'react';
import AdminNav from '../../../components/AdminNav';
import LiveStudentList from '../../../components/LiveStudentList';
import api from '../../../lib/api';

export default function LivePage() {
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [live, setLive] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [message, setMessage] = useState('');
  const [stopping, setStopping] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await api.get('/api/assessments');
        setSessions((response.data.assessments || []).filter((assessment) => assessment.status === 'active'));
      } catch (err) {
        setSessions([]);
      }
    };

    loadSessions();
    const intervalId = window.setInterval(loadSessions, 12000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setLive({});
      setLeaderboard([]);
      return undefined;
    }

    let active = true;
    const loadLiveSession = async () => {
      try {
        const response = await api.get(`/api/admin/live/${sessionId}`);
        if (active) {
          setLive(response.data.live || {});
          setLeaderboard(response.data.leaderboard || []);
          setMessage('');
        }
      } catch (err) {
        if (active) {
          setMessage(err.response?.data?.error || 'Unable to load live session');
        }
      }
    };

    loadLiveSession();
    const intervalId = window.setInterval(loadLiveSession, 3000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [sessionId]);

  const selectedSession = sessions.find((item) => item.sessionId === sessionId);
  const activeStudentCount = Object.keys(live || {}).length;
  const totalLiveScore = Object.values(live || {}).reduce((sum, student) => sum + Number(student.score || 0), 0);
  const highestScore = Object.values(live || {}).reduce((max, student) => Math.max(max, Number(student.score || 0)), 0);

  const formatViolationSummary = (summary = {}) => {
    const entries = Object.entries(summary);
    if (!entries.length) {
      return 'None';
    }
    return entries.map(([type, count]) => `${type} (${count})`).join(', ');
  };

  const handleStopSession = async () => {
    if (!selectedSession) {
      return;
    }
    setStopping(true);
    setMessage('');
    try {
      await api.post(`/api/assessments/${selectedSession.sessionId}/stop`);
      setMessage('Session stopped. All active candidates were submitted and removed from the live exam flow.');
      setLive({});
      setLeaderboard([]);
      const response = await api.get('/api/assessments');
      setSessions((response.data.assessments || []).filter((assessment) => assessment.status === 'active'));
      setSessionId('');
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
        <section className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr] fade-rise">
          <div className="space-y-6">
            <div className="card-strong">
              <div className="badge-orange">Live Assessments</div>
              <h1 className="section-title mt-3">Active session monitor</h1>
              <p className="mt-2 text-sm text-slate-600">
                Select any active session to inspect the generated password, session ID, and live participant activity.
              </p>
            </div>

            <div className="card">
              <label className="label">Load by Session ID</label>
              <input className="input" value={sessionId} onChange={(event) => setSessionId(event.target.value)} placeholder="Enter or pick an active session ID" />
            </div>

            <div className="space-y-4">
              {sessions.map((session) => (
                <button
                  key={session.sessionId}
                  className={`card w-full text-left transition ${session.sessionId === sessionId ? 'ring-2 ring-[rgba(29,114,255,0.22)]' : 'hover:-translate-y-1'}`}
                  onClick={() => setSessionId(session.sessionId)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{session.name}</p>
                      <p className="mt-1 text-sm text-slate-500">Session ID: {session.sessionId}</p>
                    </div>
                    <span className="badge-blue">{session.studentCount || 0} participants</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="stat-card">
                      <p className="section-kicker">Password</p>
                      <p className="mt-2 text-lg font-semibold tracking-[0.18em]">{session.password}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Questions</p>
                      <p className="mt-2 text-lg font-semibold">{session.questionCount || 0}</p>
                    </div>
                  </div>
                </button>
              ))}
              {!sessions.length && <div className="card text-sm text-slate-500">No active sessions found.</div>}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-strong">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Selected Session</p>
                  <h2 className="section-title mt-2">{selectedSession ? selectedSession.name : 'Waiting for a session selection'}</h2>
                </div>
                <span className="badge-orange">{activeStudentCount} live</span>
              </div>
              {selectedSession && (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="stat-card">
                    <p className="section-kicker">Session ID</p>
                    <p className="mt-2 text-lg font-semibold">{selectedSession.sessionId}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Password</p>
                    <p className="mt-2 text-lg font-semibold tracking-[0.18em]">{selectedSession.password}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Question Count</p>
                    <p className="mt-2 text-lg font-semibold">{selectedSession.questionCount || 0}</p>
                  </div>
                </div>
              )}
              {selectedSession && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="btn-outline" onClick={handleExportPdf} disabled={exportingPdf}>
                    {exportingPdf ? 'Exporting PDF...' : 'Export PDF'}
                  </button>
                  <button className="btn-accent" onClick={handleStopSession} disabled={stopping}>
                    {stopping ? 'Stopping...' : 'Stop Session'}
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              {message && <p className="mb-4 text-sm text-red-600">{message}</p>}
              <div className="mb-4 grid gap-3 md:grid-cols-3">
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
              <LiveStudentList data={live} />
            </div>

            <div className="card-strong">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Scoreboard</p>
                  <h3 className="section-title mt-2 text-2xl">Highest to lowest marks</h3>
                </div>
                <span className="badge-blue">{leaderboard.length} ranked</span>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(17,33,61,0.08)] text-left text-slate-500">
                      <th className="px-3 py-3 font-medium">Rank</th>
                      <th className="px-3 py-3 font-medium">Name</th>
                      <th className="px-3 py-3 font-medium">Phone</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Score</th>
                      <th className="px-3 py-3 font-medium">Correct</th>
                      <th className="px-3 py-3 font-medium">Accuracy</th>
                      <th className="px-3 py-3 font-medium">Violations</th>
                      <th className="px-3 py-3 font-medium">Violation Types</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((student) => (
                      <tr key={student.studentId} className="border-b border-[rgba(17,33,61,0.06)] align-top text-slate-700">
                        <td className="px-3 py-3 font-semibold text-slate-900">{student.rank}</td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-900">{student.name}</div>
                          {student.attemptedFullscreenExit && (
                            <div className="mt-1 text-xs font-semibold text-orange-700">Attempted fullscreen exit</div>
                          )}
                        </td>
                        <td className="px-3 py-3">{student.phone || '-'}</td>
                        <td className="px-3 py-3">{student.status}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900">{student.score}</td>
                        <td className="px-3 py-3">{student.correctCount}/{student.totalQuestions}</td>
                        <td className="px-3 py-3">{student.accuracy}%</td>
                        <td className="px-3 py-3">{student.violationCount}</td>
                        <td className="px-3 py-3">{formatViolationSummary(student.violationSummary)}</td>
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
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
