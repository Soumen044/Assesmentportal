'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import AdminNav from '../../../components/AdminNav';
import api from '../../../lib/api';
import MathText from '../../../components/MathText';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

export default function PreviousPage() {
  const [assessments, setAssessments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [violationsData, setViolationsData] = useState(null);
  const [message, setMessage] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const [downloadingPdfId, setDownloadingPdfId] = useState('');
  const [tab, setTab] = useState('summary');

  useEffect(() => {
    const loadAssessments = async () => {
      try {
        const response = await api.get('/api/assessments');
        setAssessments(response.data.assessments || []);
      } catch (err) {
        setAssessments([]);
      }
    };

    loadAssessments();
  }, []);

  const handleSelect = async (session) => {
    setSelected(session);
    setMessage('');
    try {
      const response = await api.get(`/api/admin/session/${session.sessionId}/overview`);
      const labels = (response.data.violations || []).map((student) => student.name);
      const counts = (response.data.violations || []).map((student) => (student.violations || []).length);
      setSelectedQuestions(response.data.questions || []);
      setSelectedStudents(response.data.students || []);
      setViolationsData({
        labels,
        datasets: [
          { label: 'Violations', data: counts, backgroundColor: '#ff8a2a', borderRadius: 10 }
        ]
      });
      setSelected(response.data.assessment || session);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to load session overview');
    }
  };

  const handleDelete = async (sessionId) => {
    setMessage('');
    const password = window.prompt('Enter the creator admin password to delete this session.');
    if (!password) {
      setMessage('Session deletion cancelled.');
      return;
    }
    await api.delete(`/api/assessments/${sessionId}`, {
      data: { password }
    });
    if (selected?.sessionId === sessionId) {
      setSelected(null);
      setSelectedQuestions([]);
      setSelectedStudents([]);
      setViolationsData(null);
    }
    setMessage('Session deleted');
    const response = await api.get('/api/assessments');
    setAssessments(response.data.assessments || []);
  };

  const handleExport = async (sessionId) => {
    setDownloadingId(sessionId);
    setMessage('');
    try {
      const response = await api.get(`/api/admin/export/${sessionId}`, {
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${sessionId}-results.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Export failed');
    } finally {
      setDownloadingId('');
    }
  };

  const handleExportPdf = async (sessionId) => {
    setDownloadingPdfId(sessionId);
    setMessage('');
    try {
      const response = await api.get(`/api/admin/export-pdf/${sessionId}`, {
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${sessionId}-results.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setMessage(err.response?.data?.error || 'PDF export failed');
    } finally {
      setDownloadingPdfId('');
    }
  };

  const topScore = useMemo(() => selectedStudents.reduce((max, student) => Math.max(max, Number(student.score || 0)), 0), [selectedStudents]);

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <AdminNav />
        {message && <div className="glass-banner mb-4 text-sm text-slate-700">{message}</div>}
        <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="compact-stack fade-rise min-w-0">
            <div className="card-strong">
              <div className="badge-blue">Assessment Archive</div>
              <h1 className="section-title mt-2">Previous sessions and exports</h1>
              <p className="mt-2 text-sm text-slate-600">Archived sessions stay in compact cards with dates, exports, and delete controls always visible.</p>
            </div>
            <div className="compact-stack">
              {assessments.map((session) => (
                <div key={session.sessionId} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{session.name}</p>
                      <p className="mt-1 text-xs text-slate-500">Session ID: {session.sessionId}</p>
                    </div>
                    <span className={session.status === 'live' ? 'badge-orange' : 'badge-slate'}>{session.status}</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    <div className="stat-card">
                      <p className="section-kicker">Date</p>
                      <p className="mt-2 text-xs font-semibold">{formatDateTime(session.createdAt)}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Questions</p>
                      <p className="mt-2 text-sm font-semibold">{session.questionCount || 0}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Students</p>
                      <p className="mt-2 text-sm font-semibold">{session.studentCount || 0}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Creator</p>
                      <p className="mt-2 text-xs font-semibold">{session.createdBy || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-outline" onClick={() => handleSelect(session)}>View</button>
                    <button className="btn-primary" onClick={() => handleExport(session.sessionId)} disabled={downloadingId === session.sessionId}>
                      {downloadingId === session.sessionId ? 'Exporting...' : 'Export CSV'}
                    </button>
                    <button className="btn-outline" onClick={() => handleExportPdf(session.sessionId)} disabled={downloadingPdfId === session.sessionId}>
                      {downloadingPdfId === session.sessionId ? 'Exporting PDF...' : 'Export PDF'}
                    </button>
                    <button className="btn-accent" onClick={() => handleDelete(session.sessionId)}>Delete Session</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="compact-stack fade-rise min-w-0">
            <div className="card-strong">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Selected Session</p>
                  <h2 className="section-title mt-1">{selected ? selected.name : 'Choose a session to inspect'}</h2>
                </div>
                {selected && <span className="badge-blue">{selected.sessionId}</span>}
              </div>
              {selected ? (
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <div className="stat-card">
                    <p className="section-kicker">Date</p>
                    <p className="mt-2 text-xs font-semibold">{formatDateTime(selected.createdAt)}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Password</p>
                    <p className="mt-2 break-all text-xs font-semibold tracking-[0.12em]">{selected.password}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Questions</p>
                    <p className="mt-2 text-sm font-semibold">{selectedQuestions.length}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Students</p>
                    <p className="mt-2 text-sm font-semibold">{selectedStudents.length}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Top Score</p>
                    <p className="mt-2 text-sm font-semibold">{topScore}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Use the left column to load archived session details.</p>
              )}
            </div>

            <div className="card">
              <div className="panel-tabs">
                {[
                  ['summary', 'Summary'],
                  ['questions', `Questions (${selectedQuestions.length})`],
                  ['results', `Results (${selectedStudents.length})`]
                ].map(([key, label]) => (
                  <button key={key} className={`tab-chip ${tab === key ? 'tab-chip-active' : ''}`} onClick={() => setTab(key)}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'summary' && (
                <div className="mt-4">
                  <h3 className="section-title text-lg">Violations Overview</h3>
                  <div className="mt-4">
                    {violationsData ? (
                      <Bar data={violationsData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                    ) : (
                      <p className="text-sm text-slate-500">No chart yet. Select a session to render student violations.</p>
                    )}
                  </div>
                </div>
              )}

              {tab === 'questions' && (
                <div className="mt-4 compact-stack">
                  {selectedQuestions.map((question, index) => (
                    <div key={question.id} className="table-shell p-3">
                      <div className="font-semibold text-slate-900">
                        <span>Q{index + 1}. </span>
                        <MathText text={question.question} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Dedicated time: {question.customTime ? `${question.customTime}s` : 'Uses default'}</p>
                    </div>
                  ))}
                  {!selectedQuestions.length && <div className="table-shell p-3 text-sm text-slate-500">No question preview loaded.</div>}
                </div>
              )}

              {tab === 'results' && (
                <div className="mt-4 table-shell compact-scroll">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-[rgba(17,33,61,0.08)] text-left text-slate-500">
                        <th className="px-3 py-2 font-medium">Rank</th>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Phone</th>
                        <th className="px-3 py-2 font-medium">Score</th>
                        <th className="px-3 py-2 font-medium">Correct</th>
                        <th className="px-3 py-2 font-medium">Accuracy</th>
                        <th className="px-3 py-2 font-medium">Violations</th>
                        <th className="px-3 py-2 font-medium">Violation Types</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudents.map((student) => (
                        <tr key={student.studentId} className="border-b border-[rgba(17,33,61,0.06)] align-top text-slate-700">
                          <td className="px-3 py-2 font-semibold text-slate-900">{student.rank || '-'}</td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900">{student.name}</div>
                            <div className="mt-1 text-[11px] text-slate-500">{student.status}</div>
                            {student.attemptedFullscreenExit && <div className="mt-1 text-[11px] font-semibold text-orange-700">Attempted fullscreen exit</div>}
                          </td>
                          <td className="px-3 py-2">{student.phone}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{student.score || 0}</td>
                          <td className="px-3 py-2">{student.correctCount || 0}/{student.totalQuestions || 0}</td>
                          <td className="px-3 py-2">{student.accuracy || 0}%</td>
                          <td className="px-3 py-2">{student.violationCount || 0}</td>
                          <td className="px-3 py-2">{formatViolationSummary(student.violationSummary)}</td>
                        </tr>
                      ))}
                      {!selectedStudents.length && (
                        <tr>
                          <td className="px-3 py-4 text-slate-500" colSpan={8}>No participant results loaded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
