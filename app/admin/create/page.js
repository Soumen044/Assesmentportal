'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminNav from '../../../components/AdminNav';
import Stepper from '../../../components/Stepper';
import QuestionBuilder from '../../../components/QuestionBuilder';
import BulkQuestionTable from '../../../components/BulkQuestionTable';
import MathText from '../../../components/MathText';
import api from '../../../lib/api';

const steps = ['Create Session', 'Question Canvas', 'Timing', 'Confirm'];

function formatSeconds(totalSeconds) {
  const seconds = Number(totalSeconds || 0);
  if (!seconds) {
    return 'Not set';
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (!minutes) {
    return `${remainder}s`;
  }
  if (!remainder) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainder}s`;
}

function computePreviewDuration(questions, settings) {
  if (!questions.length) {
    return 0;
  }
  if (settings.mode === 'total') {
    return Number(settings.totalTime || 0);
  }
  return questions.reduce((sum, question) => sum + Number(question.customTime || settings.perQuestionTime || 0), 0);
}

export default function CreateAssessmentPage() {
  const [step, setStep] = useState(0);
  const [session, setSession] = useState({ name: '', sessionId: '', password: '', status: 'draft' });
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState({
    mode: 'per-question',
    perQuestionTime: 60,
    totalTime: 0,
    shuffle: false
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [draggedQuestionId, setDraggedQuestionId] = useState('');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const sessionReady = Boolean(session.sessionId && session.password);
  const sampleTemplateUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/assessments/sample-template`;

  const totalPreviewTime = useMemo(() => computePreviewDuration(questions, settings), [questions, settings]);

  const refreshQuestions = async () => {
    if (!session.sessionId) {
      return;
    }
    const response = await api.get(`/api/assessments/${session.sessionId}/questions`);
    setQuestions(response.data.questions || []);
  };

  const refreshAssessment = async () => {
    if (!session.sessionId) {
      return;
    }
    try {
      const response = await api.get(`/api/assessments/${session.sessionId}/detail`);
      setSession((prev) => ({ ...prev, ...response.data.assessment }));
      setQuestions(response.data.questions || []);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to refresh assessment details');
    }
  };

  useEffect(() => {
    if (!sessionReady) {
      return;
    }
    refreshAssessment();
  }, [sessionReady]);

  const handleCreateSession = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.post('/api/assessments', {
        name: session.name,
        sessionId: session.sessionId
      });
      setSession((prev) => ({
        ...prev,
        password: response.data.password,
        status: 'draft'
      }));
      setMessage('Session created. Build the question canvas next.');
      setStep(1);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !sessionReady) {
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/api/assessments/${session.sessionId}/questions/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshQuestions();
      setMessage('Excel questions uploaded.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    setLoading(true);
    setMessage('');
    try {
      await api.delete(`/api/assessments/${session.sessionId}/questions/${questionId}`);
      await refreshQuestions();
      if (editingQuestion?.id === questionId) {
        setEditingQuestion(null);
      }
      setMessage('Question deleted from the canvas.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to delete question');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateQuestion = async (questionId) => {
    setLoading(true);
    setMessage('');
    try {
      await api.post(`/api/assessments/${session.sessionId}/questions/${questionId}/duplicate`);
      await refreshQuestions();
      setMessage('Question duplicated.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to duplicate question');
    } finally {
      setLoading(false);
    }
  };

  const persistQuestionOrder = async (orderedQuestions) => {
    const previousQuestions = questions;
    setQuestions(orderedQuestions);
    try {
      await api.put(`/api/assessments/${session.sessionId}/questions/reorder`, {
        questionIds: orderedQuestions.map((question) => question.id)
      });
    } catch (err) {
      setQuestions(previousQuestions);
      throw err;
    }
  };

  const moveQuestion = async (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) {
      return;
    }
    const reordered = [...questions];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    await persistQuestionOrder(reordered);
  };

  const handleDropQuestion = async (targetQuestionId) => {
    if (!draggedQuestionId || draggedQuestionId === targetQuestionId) {
      return;
    }
    const reordered = [...questions];
    const fromIndex = reordered.findIndex((question) => question.id === draggedQuestionId);
    const targetIndex = reordered.findIndex((question) => question.id === targetQuestionId);
    if (fromIndex === -1 || targetIndex === -1) {
      return;
    }
    const [draggedQuestion] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, draggedQuestion);
    setDraggedQuestionId('');
    try {
      await persistQuestionOrder(reordered);
      setMessage('Question order updated.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to reorder questions');
    }
  };

  const handleSettingsSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      await api.put(`/api/assessments/${session.sessionId}/settings`, settings);
      setMessage('Timing configuration saved. Review the full preview before activating.');
      setStep(3);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setMessage('');
    try {
      await api.post(`/api/assessments/${session.sessionId}/confirm`);
      setSession((prev) => ({ ...prev, status: 'active' }));
      setMessage(`Session activated. Share password ${session.password} with candidates.`);
      await refreshAssessment();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!session.password) {
      return;
    }
    await navigator.clipboard.writeText(session.password);
    setMessage('Session password copied.');
  };

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <AdminNav />
        <Stepper steps={steps} current={step} />

        {message && <div className="glass-banner mb-6 fade-rise text-sm text-slate-700">{message}</div>}

        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-6">
            <div className="card-strong fade-rise">
              <div className="flex items-center justify-between">
                <div className="badge-blue">Session Frame</div>
                <span className={session.status === 'active' ? 'badge-orange' : 'badge-slate'}>
                  {session.status || 'draft'}
                </span>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="label">Assessment Name</label>
                  <input
                    className="input"
                    value={session.name}
                    onChange={(event) => setSession((prev) => ({ ...prev, name: event.target.value }))}
                    disabled={sessionReady}
                  />
                </div>
                <div>
                  <label className="label">Session ID</label>
                  <input
                    className="input"
                    value={session.sessionId}
                    onChange={(event) => setSession((prev) => ({ ...prev, sessionId: event.target.value }))}
                    disabled={sessionReady}
                  />
                </div>
                {!sessionReady ? (
                  <button className="btn-primary w-full" onClick={handleCreateSession} disabled={loading || !session.name || !session.sessionId}>
                    {loading ? 'Creating session...' : 'Create Session First'}
                  </button>
                ) : (
                  <div className="rounded-[24px] border border-[rgba(255,138,42,0.16)] bg-[rgba(255,138,42,0.08)] p-4">
                    <p className="section-kicker">Generated Password</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[0.2em] text-slate-900">{session.password}</p>
                    <button className="btn-accent mt-4" onClick={handleCopyPassword}>Copy Password</button>
                  </div>
                )}
              </div>
            </div>

            <div className="card fade-rise">
              <p className="section-kicker">Session Snapshot</p>
              <div className="mt-4 grid gap-3">
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Question Count</p>
                  <p className="mt-2 text-2xl font-semibold">{questions.length}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Timing Guide</p>
                  <p className="mt-2 text-lg font-semibold">{formatSeconds(totalPreviewTime)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Shuffle</p>
                  <p className="mt-2 text-lg font-semibold">{settings.shuffle ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Created By</p>
                  <p className="mt-2 text-lg font-semibold">{session.createdBy || 'Current admin'}</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            {step === 0 && (
              <div className="card-strong fade-rise">
                <div className="space-y-3">
                  <div className="badge-orange">Step 1</div>
                  <h1 className="hero-title text-3xl">Start with the session shell.</h1>
                  <p className="hero-subtitle">
                    Create the session first. Only after the password is generated will question upload, question design, and timing controls unlock.
                  </p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6 fade-rise">
                <div className="card-strong">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="badge-blue">Step 2</div>
                      <h2 className="section-title mt-3">Question Canvas</h2>
                      <p className="mt-2 text-sm text-slate-600">
                        Upload Excel, download a clean sample template, or build manually. Drag and drop cards to reorder the exam flow.
                      </p>
                    </div>
                    <a
                      className="btn-outline"
                      href={sampleTemplateUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download Sample .xlsx
                    </a>
                  </div>
                  <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-6">
                      <div>
                        <label className="label">Upload Question Sheet</label>
                        <input className="input" type="file" accept=".xlsx,.xls" onChange={handleUpload} disabled={!sessionReady || loading} />
                      </div>
                      <div>
                        <p className="section-kicker">Manual Builder</p>
                        <div className="mt-3 rounded-[28px] border border-[rgba(29,114,255,0.1)] bg-white/80 p-4">
                          <QuestionBuilder
                            sessionId={session.sessionId}
                            onAdded={refreshQuestions}
                            mode={editingQuestion ? 'edit' : 'create'}
                            initialValues={editingQuestion}
                            onCancel={() => setEditingQuestion(null)}
                            submitLabel={editingQuestion ? 'Save Canvas Changes' : 'Add Question'}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="section-kicker">Drag-and-Drop Order</p>
                        <span className="text-xs text-slate-500">
                          Edit, duplicate, delete, and reorder questions before publishing.
                        </span>
                      </div>
                      <div className="mt-3 space-y-3">
                        {!questions.length && (
                          <div className="card text-sm text-slate-500">No questions yet. Create or upload at least one question to continue.</div>
                        )}
                        {questions.map((question, index) => (
                          <div
                            key={question.id}
                            className="card cursor-move"
                            draggable
                            onDragStart={() => setDraggedQuestionId(question.id)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => handleDropQuestion(question.id)}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">Q{index + 1}.</p>
                                <div className="mt-1 text-slate-800">
                                  <MathText text={question.question} />
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                  Time: {question.customTime ? `${question.customTime}s dedicated` : `${settings.perQuestionTime || 60}s default`}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button className="btn-ghost" onClick={() => setEditingQuestion(question)}>Edit</button>
                                <button className="btn-ghost" onClick={() => handleDuplicateQuestion(question.id)} disabled={loading}>Duplicate</button>
                                <button className="btn-ghost" onClick={() => handleDeleteQuestion(question.id)} disabled={loading}>Delete</button>
                                <button className="btn-ghost" onClick={() => moveQuestion(index, -1)} disabled={index === 0}>Up</button>
                                <button className="btn-ghost" onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1}>Down</button>
                              </div>
                            </div>
                            <div className="mt-4 grid gap-2 md:grid-cols-2">
                              {Object.entries(question.options || {}).map(([key, value]) => (
                                <div key={key} className={`rounded-2xl px-4 py-3 text-sm ${question.answer === key ? 'bg-[rgba(29,114,255,0.08)] text-blue-900' : 'bg-slate-50 text-slate-600'}`}>
                                  <span className="font-semibold">{key}.</span>{' '}
                                  <MathText text={value} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="btn-primary" onClick={() => setStep(2)} disabled={!questions.length}>Next: Timing Settings</button>
                </div>
                {questions.length > 0 && (
                  <BulkQuestionTable
                    sessionId={session.sessionId}
                    questions={questions}
                    onSaved={refreshQuestions}
                    onDelete={handleDeleteQuestion}
                    onDuplicate={handleDuplicateQuestion}
                    onEdit={setEditingQuestion}
                  />
                )}
              </div>
            )}

            {step === 2 && (
              <div className="card-strong fade-rise">
                <div className="badge-orange">Step 3</div>
                <h2 className="section-title mt-3">Timing and behavior settings</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Define the whole-assessment clock or the default per-question timer. Dedicated question timers always override the default and are shown below.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="stat-card">
                    <p className="section-kicker">Question Count</p>
                    <p className="mt-2 text-2xl font-semibold">{questions.length}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Current Timing Mode</p>
                    <p className="mt-2 text-lg font-semibold">{settings.mode === 'total' ? 'Whole Assessment' : 'Per Question'}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Projected Total Time</p>
                    <p className="mt-2 text-lg font-semibold">{formatSeconds(totalPreviewTime)}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">Timer Mode</label>
                    <select className="input" value={settings.mode} onChange={(event) => setSettings((prev) => ({ ...prev, mode: event.target.value }))}>
                      <option value="per-question">Per question</option>
                      <option value="total">Total exam time</option>
                    </select>
                  </div>
                  {settings.mode === 'per-question' ? (
                    <div>
                      <label className="label">Default Seconds Per Question</label>
                      <input className="input" type="number" min="10" value={settings.perQuestionTime} onChange={(event) => setSettings((prev) => ({ ...prev, perQuestionTime: event.target.value }))} />
                    </div>
                  ) : (
                    <div>
                      <label className="label">Total Exam Time in Seconds</label>
                      <input className="input" type="number" min="30" value={settings.totalTime} onChange={(event) => setSettings((prev) => ({ ...prev, totalTime: event.target.value }))} />
                    </div>
                  )}
                </div>

                <label className="mt-5 flex items-center gap-3 rounded-2xl border border-[rgba(255,138,42,0.14)] bg-[rgba(255,138,42,0.08)] px-4 py-3 text-sm text-slate-600">
                  <input type="checkbox" checked={settings.shuffle} onChange={(event) => setSettings((prev) => ({ ...prev, shuffle: event.target.checked }))} />
                  Shuffle questions when the exam starts
                </label>

                <div className="mt-6 rounded-[28px] border border-[rgba(17,33,61,0.08)] bg-white/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="section-kicker">Question Timing Map</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">Focused timing control</h3>
                    </div>
                    <span className="badge-blue">
                      {settings.mode === 'total' ? 'Assessment timer active' : 'Per-question timer active'}
                    </span>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-[rgba(17,33,61,0.08)] text-left text-slate-500">
                          <th className="px-3 py-3 font-medium">Q</th>
                          <th className="px-3 py-3 font-medium">Prompt</th>
                          <th className="px-3 py-3 font-medium">Timer Applied</th>
                          <th className="px-3 py-3 font-medium">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.map((question, index) => (
                          <tr key={question.id} className="border-b border-[rgba(17,33,61,0.06)] align-top">
                            <td className="px-3 py-3 font-semibold text-slate-900">{index + 1}</td>
                            <td className="px-3 py-3 text-slate-700">
                              <MathText text={question.question} />
                            </td>
                            <td className="px-3 py-3 font-medium text-slate-900">
                              {settings.mode === 'total'
                                ? formatSeconds(settings.totalTime)
                                : formatSeconds(question.customTime || settings.perQuestionTime)}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {settings.mode === 'total'
                                ? 'Whole assessment timer'
                                : question.customTime
                                  ? 'Dedicated question timer'
                                  : 'Default question timer'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button className="btn-outline" onClick={() => setStep(1)}>Back to Canvas</button>
                  <button className="btn-primary" onClick={handleSettingsSave} disabled={loading}>Save and Preview</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 fade-rise">
                <div className="card-strong">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="badge-blue">Step 4</div>
                      <h2 className="section-title mt-3">Preview and confirm the assessment</h2>
                      <p className="mt-2 text-sm text-slate-600">
                        Review the question flow, dedicated timings, exam duration, and generated password before activation.
                      </p>
                    </div>
                    <button className="btn-outline" onClick={() => setPreviewOpen((open) => !open)}>
                      {previewOpen ? 'Hide Preview' : 'Preview Assessment'}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div className="stat-card">
                      <p className="section-kicker">Session ID</p>
                      <p className="mt-2 text-lg font-semibold">{session.sessionId}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Password</p>
                      <p className="mt-2 text-lg font-semibold tracking-[0.2em]">{session.password}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Questions</p>
                      <p className="mt-2 text-lg font-semibold">{questions.length}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Timeline</p>
                      <p className="mt-2 text-lg font-semibold">{formatSeconds(totalPreviewTime)}</p>
                    </div>
                  </div>

                  {previewOpen && (
                    <div className="mt-6 space-y-3">
                      {questions.map((question, index) => (
                        <div key={question.id} className="card">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">Q{index + 1}.</p>
                              <div className="mt-1 text-slate-800">
                                <MathText text={question.question} />
                              </div>
                              <p className="mt-1 text-sm text-slate-500">
                                Time guideline: {settings.mode === 'total'
                                  ? 'Uses total exam timer'
                                  : question.customTime
                                    ? `${question.customTime}s dedicated`
                                    : `${settings.perQuestionTime}s default`}
                              </p>
                            </div>
                            <span className="badge-slate">Answer {question.answer}</span>
                          </div>
                          <div className="mt-4 grid gap-2 md:grid-cols-2">
                            {Object.entries(question.options || {}).map(([key, value]) => (
                              <div key={key} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <span className="font-semibold text-slate-900">{key}.</span>{' '}
                                <MathText text={value} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button className="btn-outline" onClick={() => setStep(2)}>Back to Settings</button>
                    <button className="btn-accent" onClick={handleConfirm} disabled={loading || !questions.length}>
                      {loading ? 'Activating...' : 'Confirm Session'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
