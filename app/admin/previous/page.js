'use client';

import { useEffect, useState } from 'react';
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

export default function PreviousPage() {
  const [assessments, setAssessments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [violationsData, setViolationsData] = useState(null);
  const [message, setMessage] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const [downloadingPdfId, setDownloadingPdfId] = useState('');

  const formatViolationSummary = (summary = {}) => {
    const entries = Object.entries(summary);
    if (!entries.length) {
      return 'None';
    }
    return entries.map(([type, count]) => `${type} (${count})`).join(', ');
  };

  const loadAssessments = async () => {
    const response = await api.get('/api/assessments');
    setAssessments(response.data.assessments || []);
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const handleSelect = async (session) => {
    setSelected(session);
    const [detailResponse, violationsResponse, answersResponse] = await Promise.all([
      api.get(`/api/assessments/${session.sessionId}/detail`),
      api.get(`/api/admin/violations/${session.sessionId}`),
      api.get(`/api/admin/answers/${session.sessionId}`)
    ]);

    const labels = violationsResponse.data.students.map((student) => student.name);
    const counts = violationsResponse.data.students.map((student) => (student.violations || []).length);

    setSelectedQuestions(detailResponse.data.questions || []);
    setSelectedStudents(answersResponse.data.students || []);
    setViolationsData({
      labels,
      datasets: [
        { label: 'Violations', data: counts, backgroundColor: '#ff8a2a', borderRadius: 14 }
      ]
    });
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
    loadAssessments();
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

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <AdminNav />
        {message && <div className="glass-banner mb-6 text-sm text-slate-700">{message}</div>}
        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-6 fade-rise">
            <div className="card-strong">
              <div className="badge-blue">Assessment Archive</div>
              <h1 className="section-title mt-3">Previous sessions and full exports</h1>
              <p className="mt-2 text-sm text-slate-600">
                Review every assessment, inspect generated passwords, see archived participation counts, and export answers as CSV.
              </p>
            </div>
            <div className="space-y-4">
              {assessments.map((session) => (
                <div key={session.sessionId} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{session.name}</p>
                      <p className="mt-1 text-sm text-slate-500">Session ID: {session.sessionId}</p>
                    </div>
                    <span className={session.status === 'active' ? 'badge-orange' : 'badge-slate'}>{session.status}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="stat-card">
                      <p className="section-kicker">Password</p>
                      <p className="mt-2 text-base font-semibold tracking-[0.15em]">{session.password}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Questions</p>
                      <p className="mt-2 text-lg font-semibold">{session.questionCount || 0}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Students</p>
                      <p className="mt-2 text-lg font-semibold">{session.studentCount || 0}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Creator</p>
                      <p className="mt-2 text-base font-semibold">{session.createdBy || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
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

          <div className="space-y-6 fade-rise">
            <div className="card-strong">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Selected Session</p>
                  <h2 className="section-title mt-2">{selected ? selected.name : 'Choose a session to inspect'}</h2>
                </div>
                {selected && <span className="badge-blue">{selected.sessionId}</span>}
              </div>
              {selected ? (
                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="stat-card">
                    <p className="section-kicker">Password</p>
                    <p className="mt-2 text-lg font-semibold tracking-[0.18em]">{selected.password}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Questions</p>
                    <p className="mt-2 text-lg font-semibold">{selectedQuestions.length}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Students</p>
                    <p className="mt-2 text-lg font-semibold">{selectedStudents.length}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Top Score</p>
                    <p className="mt-2 text-lg font-semibold">
                      {selectedStudents.reduce((max, student) => Math.max(max, Number(student.score || 0)), 0)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Use the left column to load archived session details.</p>
              )}
            </div>

            <div className="card">
              <h3 className="section-title text-xl">Violations Overview</h3>
              <div className="mt-4">
                {violationsData ? (
                  <Bar data={violationsData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                ) : (
                  <p className="text-sm text-slate-500">No chart yet. Select a session to render student violations.</p>
                )}
              </div>
            </div>

            {selected && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="card">
                  <h3 className="section-title text-xl">Question Preview</h3>
                  <div className="mt-4 space-y-3">
                    {selectedQuestions.map((question, index) => (
                      <div key={question.id} className="rounded-[22px] border border-[rgba(17,33,61,0.08)] bg-white/70 p-4">
                        <div className="font-semibold text-slate-900">
                          <span>Q{index + 1}. </span>
                          <MathText text={question.question} />
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          Dedicated time: {question.customTime ? `${question.customTime}s` : 'Uses default'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 className="section-title text-xl">Participants Leaderboard</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-[rgba(17,33,61,0.08)] text-left text-slate-500">
                          <th className="px-3 py-3 font-medium">Rank</th>
                          <th className="px-3 py-3 font-medium">Name</th>
                          <th className="px-3 py-3 font-medium">Phone</th>
                          <th className="px-3 py-3 font-medium">Score</th>
                          <th className="px-3 py-3 font-medium">Correct</th>
                          <th className="px-3 py-3 font-medium">Accuracy</th>
                          <th className="px-3 py-3 font-medium">Violations</th>
                          <th className="px-3 py-3 font-medium">Violation Types</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudents.map((student) => (
                          <tr key={student.studentId} className="border-b border-[rgba(17,33,61,0.06)] align-top text-slate-700">
                            <td className="px-3 py-3 font-semibold text-slate-900">{student.rank || '-'}</td>
                            <td className="px-3 py-3">
                              <div className="font-semibold text-slate-900">{student.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{student.status}</div>
                              {student.attemptedFullscreenExit && (
                                <div className="mt-1 text-xs font-semibold text-orange-700">Attempted fullscreen exit</div>
                              )}
                            </td>
                            <td className="px-3 py-3">{student.phone}</td>
                            <td className="px-3 py-3 font-semibold text-slate-900">{student.score || 0}</td>
                            <td className="px-3 py-3">{student.correctCount || 0}/{student.totalQuestions || 0}</td>
                            <td className="px-3 py-3">{student.accuracy || 0}%</td>
                            <td className="px-3 py-3">{student.violationCount || 0}</td>
                            <td className="px-3 py-3">{formatViolationSummary(student.violationSummary)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
