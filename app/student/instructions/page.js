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

export default function InstructionsPage() {
  const router = useRouter();
  const [ack, setAck] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionMeta, setSessionMeta] = useState(null);

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

  const enableFullscreen = async () => {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  };

  const startExam = async () => {
    setMessage('');
    if (!ack || !isFullscreen) {
      setMessage('Enable fullscreen and confirm the monitoring acknowledgement before starting.');
      return;
    }

    setLoading(true);
    try {
      const sessionId = localStorage.getItem('studentSessionId');
      const studentId = localStorage.getItem('studentId');
      const response = await api.post('/api/students/start', { sessionId, studentId });
      localStorage.setItem('examQuestions', JSON.stringify(response.data.questions));
      localStorage.setItem('examSettings', JSON.stringify(response.data.settings));
      router.push('/student/exam');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to start exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] fade-rise">
          <div className="card-strong">
            <div className="badge-blue">Exam Readiness</div>
            <h1 className="hero-title mt-4 text-3xl md:text-5xl">Fullscreen is required before the exam opens.</h1>
            <p className="hero-subtitle mt-4">
              The exam page disables right-click, monitors tab switches and blur events, and expects the candidate to remain in fullscreen.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="stat-card">
                <p className="section-kicker">Session</p>
                <p className="mt-2 font-semibold text-slate-900">{sessionMeta?.name || 'Awaiting session context'}</p>
                <p className="mt-1 text-sm text-slate-500">ID: {sessionMeta?.sessionId || '-'}</p>
              </div>
              <div className="stat-card">
                <p className="section-kicker">Timing Mode</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {sessionMeta?.settings?.mode === 'total' ? formatSeconds(sessionMeta?.settings?.totalTime) : `Per question · ${formatSeconds(sessionMeta?.settings?.perQuestionTime)}`}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="badge-orange">Candidate Checklist</div>
            <ul className="mt-5 space-y-3 text-sm text-slate-600">
              <li>Enter and stay in fullscreen throughout the attempt.</li>
              <li>Right-click is disabled inside the exam workspace.</li>
              <li>Blur, tab switch, unload, and fullscreen exit are logged as violations.</li>
              <li>Use the session password only for the intended live exam.</li>
            </ul>
            <label className="mt-6 flex items-center gap-3 rounded-2xl border border-[rgba(29,114,255,0.14)] bg-[rgba(29,114,255,0.05)] px-4 py-3 text-sm text-slate-600">
              <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} />
              I allow fullscreen monitoring for this assessment attempt
            </label>
            <div className="mt-6 flex gap-3">
              <button className="btn-outline" onClick={enableFullscreen}>Enable Fullscreen</button>
              <button className="btn-primary flex-1" onClick={startExam} disabled={loading}>
                {loading ? 'Starting...' : 'Enter Exam'}
              </button>
            </div>
            {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
