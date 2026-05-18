'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

function formatSeconds(totalSeconds) {
  const seconds = Number(totalSeconds || 0);
  if (!seconds) return 'Not configured';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (!minutes) return `${remainder}s`;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function formatTime(timestamp) {
  if (!timestamp) {
    return '-';
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

export default function InstructionsPage() {
  const router = useRouter();
  const [ack, setAck] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [tab, setTab] = useState('session');

  useEffect(() => {
    const meta = localStorage.getItem('studentSessionMeta');
    if (meta) {
      setSessionMeta(JSON.parse(meta));
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const preventContextMenu = (event) => event.preventDefault();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);

  useEffect(() => {
    const sessionId = localStorage.getItem('studentSessionId');
    const studentId = localStorage.getItem('studentId');
    if (!sessionId || !studentId) {
      setMessage('Student session context is missing for this browser.');
      return undefined;
    }

    let active = true;

    const loadRuntime = async () => {
      try {
        const response = await api.get(`/api/students/runtime/${sessionId}/${studentId}`);
        if (!active) {
          return;
        }
        setRuntime(response.data);
        setSessionMeta(response.data.session || null);
        localStorage.setItem('studentSessionMeta', JSON.stringify(response.data.session || {}));
        if (response.data.student?.status === 'submitted') {
          router.replace('/student/result');
        }
      } catch (err) {
        if (active) {
          setMessage(err.response?.data?.error || 'Unable to load waiting room status');
        }
      }
    };

    const sendHeartbeat = async () => {
      try {
        await api.post('/api/students/heartbeat', {
          sessionId,
          studentId,
          context: 'waiting-room'
        });
      } catch (err) {
        // best effort only
      }
    };

    loadRuntime();
    sendHeartbeat();
    const runtimeInterval = window.setInterval(loadRuntime, 2500);
    const heartbeatInterval = window.setInterval(sendHeartbeat, 15000);

    return () => {
      active = false;
      window.clearInterval(runtimeInterval);
      window.clearInterval(heartbeatInterval);
    };
  }, [router]);

  const enableFullscreen = async () => {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  };

  const startExam = async () => {
    setMessage('');
    if (!runtime?.session || runtime.session.status !== 'live') {
      setMessage('The admin has not launched the live exam yet.');
      return;
    }
    if (!ack || !isFullscreen) {
      setMessage('Enable fullscreen and confirm the monitoring acknowledgement before starting.');
      return;
    }

    setLoading(true);
    try {
      const sessionId = localStorage.getItem('studentSessionId');
      const studentId = localStorage.getItem('studentId');
      const response = await api.post('/api/students/start', { sessionId, studentId });
      const runtimePayload = {
        session: response.data.session,
        settings: response.data.settings,
        manifest: response.data.manifest,
        answers: response.data.answers || {},
        currentQuestion: Number(response.data.currentQuestion || 0),
        violationThreshold: Number(response.data.violationThreshold || response.data.settings?.violationThreshold || 3),
        studentId,
        sessionId,
        updatedAt: Date.now()
      };
      localStorage.setItem('examRuntime', JSON.stringify(runtimePayload));
      router.push('/student/exam');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to start exam');
    } finally {
      setLoading(false);
    }
  };

  const sessionSettings = sessionMeta?.settings || {};
  const isLive = runtime?.session?.status === 'live';

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <section className="grid gap-3 lg:grid-cols-[0.98fr_1.02fr] fade-rise">
          <div className="card order-1 lg:order-2">
            <div className="badge-orange">Candidate Checklist</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="stat-card">
                <p className="section-kicker">Resume Count</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{runtime?.student?.resumeCount ?? 0}</p>
              </div>
              <div className="stat-card">
                <p className="section-kicker">Violations</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{runtime?.violationCount ?? 0}</p>
              </div>
            </div>

            {!isLive && (
              <div className="mt-3 rounded-[16px] border border-[rgba(29,114,255,0.14)] bg-[rgba(29,114,255,0.06)] px-3 py-2 text-xs text-slate-700">
                Waiting for admin launch. Auto-refresh is active.
              </div>
            )}

            {isLive && (
              <>
                <label className="mt-3 flex items-center gap-2 rounded-xl border border-[rgba(29,114,255,0.14)] bg-[rgba(29,114,255,0.05)] px-3 py-2 text-xs text-slate-600">
                  <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} />
                  I allow fullscreen monitoring for this attempt
                </label>
                <div className="mt-3 flex gap-2">
                  <button className="btn-outline" onClick={enableFullscreen}>Enable Fullscreen</button>
                  <button className="btn-primary flex-1" onClick={startExam} disabled={loading}>
                    {loading ? 'Starting...' : 'Enter Exam'}
                  </button>
                </div>
              </>
            )}

            {message && <p className="mt-3 text-xs text-red-600">{message}</p>}
          </div>

          <div className="compact-stack min-w-0 order-2 lg:order-1">
            <div className="card-strong">
              <div className="badge-blue">{isLive ? 'Live Launch Ready' : 'Waiting Room'}</div>
              <h1 className="hero-title mt-3 text-2xl md:text-4xl">
                {isLive ? 'The exam is live. Enter fullscreen to begin.' : 'You are in the waiting room.'}
              </h1>
              <p className="hero-subtitle mt-3">
                {isLive
                  ? 'The admin has launched the session. Enter fullscreen, confirm monitoring, and begin the attempt.'
                  : 'Stay on this screen. Status refresh is automatic and compact so you do not wait on manual reloads.'}
              </p>
            </div>

            <div className="card">
              <div className="panel-tabs">
                {[
                  ['session', 'Session'],
                  ['rules', 'Rules']
                ].map(([key, label]) => (
                  <button key={key} className={`tab-chip ${tab === key ? 'tab-chip-active' : ''}`} onClick={() => setTab(key)}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'session' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="stat-card">
                    <p className="section-kicker">Session</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{sessionMeta?.name || 'Awaiting session context'}</p>
                    <p className="mt-1 text-xs text-slate-500">ID: {sessionMeta?.sessionId || '-'}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Launch Status</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{runtime?.session?.status || sessionMeta?.status || 'waiting_room'}</p>
                    <p className="mt-1 text-xs text-slate-500">Opened: {formatTime(runtime?.session?.roomOpenedAt || sessionMeta?.roomOpenedAt)}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Total Timer</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{sessionSettings.enableTotalTimer ? formatSeconds(sessionSettings.totalTime) : 'Disabled'}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Question Timer</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{sessionSettings.enableQuestionTimer ? formatSeconds(sessionSettings.defaultQuestionTime) : 'Disabled'}</p>
                  </div>
                </div>
              )}

              {tab === 'rules' && (
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <li>Stay on this page until the admin launches the exam.</li>
                  <li>Right-click is disabled inside the exam workspace.</li>
                  <li>Blur, tab switch, unload, fullscreen exit, and back-navigation attempts are logged as violations.</li>
                  <li>You must answer or explicitly skip every question before moving on.</li>
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
