'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import AdminNav from '../../../../components/AdminNav';
import AdminPageGuard from '../../../../components/AdminPageGuard';
import MathText from '../../../../components/MathText';
import api from '../../../../lib/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

function formatViolationSummary(summary = {}) {
  const entries = Object.entries(summary);
  if (!entries.length) {
    return 'None';
  }
  return entries.map(([type, count]) => `${type} (${count})`).join(', ');
}

export default function PreviousAssessmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = Array.isArray(params?.sessionId) ? params.sessionId[0] : params?.sessionId;

  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('summary');
  const [downloadingId, setDownloadingId] = useState('');
  const [downloadingPdfId, setDownloadingPdfId] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const loadOverview = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/admin/session/${sessionId}/overview`);
        setAssessment(response.data.assessment || null);
        setQuestions(response.data.questions || []);
        setStudents(response.data.students || []);
      } catch (err) {
        setMessage(err.response?.data?.error || 'Unable to load assessment overview.');
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, [sessionId]);

  const topScore = useMemo(
    () => students.reduce((max, student) => Math.max(max, Number(student.score || 0)), 0),
    [students]
  );
  const totalViolations = useMemo(
    () => students.reduce((sum, student) => sum + Number(student.violationCount || 0), 0),
    [students]
  );
  const topStudents = useMemo(() => students.slice(0, 8), [students]);
  const violationChart = useMemo(() => ({
    labels: topStudents.map((student) => student.name || student.studentId),
    datasets: [
      {
        label: 'Violations',
        data: topStudents.map((student) => student.violationCount || 0),
        backgroundColor: '#ff8a2a',
        borderRadius: 8
      }
    ]
  }), [topStudents]);

  const handleExport = async () => {
    if (!sessionId) {
      return;
    }
    setDownloadingId(sessionId);
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
      setMessage(err.response?.data?.error || 'Export failed.');
    } finally {
      setDownloadingId('');
    }
  };

  const handleExportPdf = async () => {
    if (!sessionId) {
      return;
    }
    setDownloadingPdfId(sessionId);
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
      setMessage(err.response?.data?.error || 'PDF export failed.');
    } finally {
      setDownloadingPdfId('');
    }
  };

  const handleDelete = async () => {
    if (!sessionId || !assessment) {
      return;
    }

    const password = window.prompt('Enter the creator admin password to delete this session.');
    if (!password) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/api/assessments/${sessionId}`, {
        data: { password }
      });
      router.push('/admin/previous');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to delete session.');
      setDeleting(false);
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
                  <div className="badge-blue">Assessment Detail</div>
                  <h1 className="section-title mt-2">{assessment?.name || 'Loading assessment...'}</h1>
                  {assessment && <p className="mt-1 text-compact text-slate-600">{assessment.sessionId}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-outline" onClick={() => router.push('/admin/previous')}>Back</button>
                  <button className="btn-primary" onClick={handleExport} disabled={downloadingId === sessionId || loading}>
                    {downloadingId === sessionId ? 'Exporting...' : 'Export CSV'}
                  </button>
                  <button className="btn-outline" onClick={handleExportPdf} disabled={downloadingPdfId === sessionId || loading}>
                    {downloadingPdfId === sessionId ? 'Exporting...' : 'Export PDF'}
                  </button>
                  <button className="btn-accent" onClick={handleDelete} disabled={deleting || loading}>
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="panel-tabs">
                {[
                  ['summary', 'Summary'],
                  ['questions', `Questions (${questions.length})`],
                  ['results', `Results (${students.length})`]
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

              {loading && <div className="mt-3 table-shell p-3 text-xs text-slate-500">Loading assessment view...</div>}

              {!loading && assessment && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
                    <button className="stat-card text-left" onClick={() => setTab('summary')}>
                      <p className="section-kicker">Date</p>
                      <p className="mt-1 text-compact font-semibold text-slate-900">{formatDateTime(assessment.createdAt)}</p>
                    </button>
                    <button className="stat-card text-left" onClick={() => setTab('questions')}>
                      <p className="section-kicker">Questions</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">{questions.length}</p>
                    </button>
                    <button className="stat-card text-left" onClick={() => setTab('results')}>
                      <p className="section-kicker">Results</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">{students.length}</p>
                    </button>
                    <button className="stat-card text-left" onClick={() => setTab('results')}>
                      <p className="section-kicker">Top Score</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">{topScore}</p>
                    </button>
                    <button className="stat-card text-left" onClick={() => setTab('summary')}>
                      <p className="section-kicker">Violations</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">{totalViolations}</p>
                    </button>
                  </div>

                  {tab === 'summary' && (
                  <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
                    <div className="table-shell p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">Violation chart</p>
                        <span className="badge-slate">{topStudents.length} students</span>
                      </div>
                      <div className="mt-3">
                        {topStudents.length ? (
                          <Bar data={violationChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                        ) : (
                          <p className="text-xs text-slate-500">No result data yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="table-shell p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">Top results</p>
                        <button className="btn-outline" onClick={() => setTab('results')}>Open Results</button>
                      </div>
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {topStudents.map((student) => (
                          <div key={student.studentId} className="min-w-[180px] rounded-[16px] border border-[rgba(17,33,61,0.08)] bg-white p-3">
                            <p className="truncate font-semibold text-slate-900">{student.name}</p>
                            <p className="mt-1 text-compact text-slate-500">{student.phone || '-'}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div className="stat-card">
                                <p className="section-kicker">Score</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{student.score || 0}</p>
                              </div>
                              <div className="stat-card">
                                <p className="section-kicker">Accuracy</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{student.accuracy || 0}%</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {!topStudents.length && <p className="text-xs text-slate-500">No results.</p>}
                      </div>
                    </div>
                  </div>
                )}

                  {tab === 'questions' && (
                  <div className="mt-3">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {questions.map((question, index) => (
                        <div key={question.id} className="min-w-[320px] max-w-[320px] table-shell p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-slate-900">Q{index + 1}</p>
                            <span className="badge-slate">{question.customTime ? `${question.customTime}s` : 'Default time'}</span>
                          </div>
                          <div className="mt-2 text-sm text-slate-800">
                            <MathText text={question.question} />
                          </div>
                          <div className="mt-3 grid gap-2">
                            {Object.entries(question.options || {}).map(([key, value]) => (
                              <div
                                key={key}
                                className={`rounded-xl px-2.5 py-2 text-xs ${
                                  question.answer === key
                                    ? 'bg-[rgba(29,114,255,0.1)] text-blue-900'
                                    : 'bg-slate-50 text-slate-600'
                                }`}
                              >
                                <span className="font-semibold">{key}.</span>{' '}
                                <MathText text={value} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {!questions.length && <p className="text-xs text-slate-500">No questions.</p>}
                    </div>
                  </div>
                )}

                  {tab === 'results' && (
                  <div className="mt-3">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {students.map((student) => (
                        <div key={student.studentId} className="min-w-[280px] max-w-[280px] table-shell p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{student.name}</p>
                              <p className="mt-1 text-compact text-slate-500">{student.phone || '-'}</p>
                            </div>
                            <span className="badge-blue">#{student.rank || '-'}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="stat-card">
                              <p className="section-kicker">Score</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{student.score || 0}</p>
                            </div>
                            <div className="stat-card">
                              <p className="section-kicker">Correct</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{student.correctCount || 0}/{student.totalQuestions || 0}</p>
                            </div>
                            <div className="stat-card">
                              <p className="section-kicker">Accuracy</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{student.accuracy || 0}%</p>
                            </div>
                            <div className="stat-card">
                              <p className="section-kicker">Violations</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{student.violationCount || 0}</p>
                            </div>
                          </div>
                          <div className="mt-3 rounded-xl bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                            <p className="section-kicker">Violation Types</p>
                            <p className="mt-1">{formatViolationSummary(student.violationSummary)}</p>
                            {student.attemptedFullscreenExit && (
                              <p className="mt-1 font-semibold text-orange-700">Attempted fullscreen exit</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {!students.length && <p className="text-xs text-slate-500">No results.</p>}
                    </div>
                  </div>
                )}
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </AdminPageGuard>
  );
}
