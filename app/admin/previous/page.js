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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function PreviousPage() {
  const [assessments, setAssessments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [violationsData, setViolationsData] = useState(null);
  const [message, setMessage] = useState('');
  const [downloadingId, setDownloadingId] = useState('');

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
    await api.delete(`/api/assessments/${sessionId}`);
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
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-outline" onClick={() => handleSelect(session)}>View</button>
                    <button className="btn-primary" onClick={() => handleExport(session.sessionId)} disabled={downloadingId === session.sessionId}>
                      {downloadingId === session.sessionId ? 'Exporting...' : 'Export CSV'}
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
                        <p className="font-semibold text-slate-900">Q{index + 1}. {question.question}</p>
                        <p className="mt-2 text-sm text-slate-500">
                          Dedicated time: {question.customTime ? `${question.customTime}s` : 'Uses default'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 className="section-title text-xl">Participants</h3>
                  <div className="mt-4 space-y-3">
                    {selectedStudents.map((student) => (
                      <div key={student.studentId} className="rounded-[22px] border border-[rgba(17,33,61,0.08)] bg-white/70 p-4">
                        <p className="font-semibold text-slate-900">{student.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{student.phone}</p>
                        <p className="mt-2 text-sm text-slate-600">Status: {student.status}</p>
                        <p className="mt-1 text-sm text-slate-600">Score: {student.score || 0}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Correct: {student.correctCount || 0}/{student.totalQuestions || 0} | Accuracy: {student.accuracy || 0}%
                        </p>
                      </div>
                    ))}
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
