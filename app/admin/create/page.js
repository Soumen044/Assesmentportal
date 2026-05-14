'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminNav from '../../../components/AdminNav';
import Stepper from '../../../components/Stepper';
import QuestionBuilder from '../../../components/QuestionBuilder';
import BulkQuestionTable from '../../../components/BulkQuestionTable';
import MathText from '../../../components/MathText';
import api from '../../../lib/api';

const steps = ['Create Session', 'Question Canvas', 'Timing', 'Waiting Room', 'Launch Live'];

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
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function computePreviewDuration(questions, settings) {
  if (!questions.length) {
    return 0;
  }
  return questions.reduce((sum, question) => sum + Number(question.customTime || settings.defaultQuestionTime || 0), 0);
}

function computeRuntimeSummary(questions, settings) {
  const questionSum = computePreviewDuration(questions, settings);
  const totalConfigured = Number(settings.totalTime || 0);
  return {
    questionSum,
    totalConfigured,
    minRuntime: settings.enableTotalTimer && settings.enableQuestionTimer ? Math.min(questionSum, totalConfigured || questionSum) : (settings.enableTotalTimer ? totalConfigured : questionSum),
    maxRuntime: settings.enableTotalTimer && settings.enableQuestionTimer ? Math.max(questionSum, totalConfigured) : (settings.enableTotalTimer ? totalConfigured : questionSum)
  };
}

export default function CreateAssessmentPage() {
  const [step, setStep] = useState(0);
  const [session, setSession] = useState({ name: '', sessionId: '', password: '', status: 'draft' });
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState({
    enableTotalTimer: false,
    totalTime: 0,
    enableQuestionTimer: true,
    defaultQuestionTime: 60,
    shuffleQuestions: false,
    shuffleOptions: false,
    violationThreshold: 3
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [draggedQuestionId, setDraggedQuestionId] = useState('');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [canvasTab, setCanvasTab] = useState('manual');

  const sessionReady = Boolean(session.sessionId && session.password);
  const sampleTemplateUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/assessments/sample-template`;
  const totalPreviewTime = useMemo(() => computePreviewDuration(questions, settings), [questions, settings]);
  const runtimeSummary = useMemo(() => computeRuntimeSummary(questions, settings), [questions, settings]);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    const refreshAssessment = async () => {
      try {
        const response = await api.get(`/api/assessments/${session.sessionId}/detail`);
        const assessment = response.data.assessment || {};
        setSession((prev) => ({ ...prev, ...assessment }));
        if (assessment.settings) {
          setSettings((prev) => ({ ...prev, ...assessment.settings }));
        }
        setQuestions(response.data.questions || []);
        if (assessment.status === 'waiting_room') {
          setStep((prev) => Math.max(prev, 4));
        }
        if (assessment.status === 'live') {
          setStep(4);
        }
      } catch (err) {
        setMessage(err.response?.data?.error || 'Unable to refresh assessment details');
      }
    };

    refreshAssessment();
  }, [session.sessionId, sessionReady]);

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
        sessionId: response.data.sessionId,
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
      const response = await api.get(`/api/assessments/${session.sessionId}/questions`);
      setQuestions(response.data.questions || []);
      setCanvasTab('preview');
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
      const response = await api.delete(`/api/assessments/${session.sessionId}/questions/${questionId}`);
      setQuestions(response.data.questions || []);
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
      const response = await api.post(`/api/assessments/${session.sessionId}/questions/${questionId}/duplicate`);
      setQuestions(response.data.questions || []);
      setCanvasTab('preview');
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
      const response = await api.put(`/api/assessments/${session.sessionId}/questions/reorder`, {
        questionIds: orderedQuestions.map((question) => question.id)
      });
      setQuestions(response.data.questions || orderedQuestions);
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
      const response = await api.put(`/api/assessments/${session.sessionId}/settings`, settings);
      setSettings(response.data.settings || settings);
      setMessage('Timing configuration saved. Review the full preview before opening the waiting room.');
      setStep(3);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWaitingRoom = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.post(`/api/assessments/${session.sessionId}/open-room`);
      setSession((prev) => ({ ...prev, ...(response.data.assessment || {}), status: 'waiting_room' }));
      setStep(4);
      setMessage(`Waiting room opened. Students can now join with session password ${session.password}.`);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to open the waiting room');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchLive = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.post(`/api/assessments/${session.sessionId}/launch`);
      setSession((prev) => ({ ...prev, ...(response.data.assessment || {}), status: 'live' }));
      setMessage('Session launched. Waiting candidates can now enter the live exam.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to launch the live exam');
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

        {message && <div className="glass-banner mb-4 fade-rise text-sm text-slate-700">{message}</div>}

        <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="compact-stack min-w-0">
            <div className="card-strong fade-rise">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="badge-blue">Session Frame</div>
                <span className={session.status === 'live' ? 'badge-orange' : session.status === 'waiting_room' ? 'badge-blue' : 'badge-slate'}>
                  {session.status || 'draft'}
                </span>
              </div>
              <div className="mt-4 compact-stack">
                <div>
                  <label className="label">Assessment Name</label>
                  <input className="input" value={session.name} onChange={(event) => setSession((prev) => ({ ...prev, name: event.target.value }))} disabled={sessionReady} />
                </div>
                <div>
                  <label className="label">Session ID</label>
                  <input className="input" value={session.sessionId} onChange={(event) => setSession((prev) => ({ ...prev, sessionId: event.target.value }))} disabled={sessionReady} />
                </div>
                {!sessionReady ? (
                  <button className="btn-primary w-full" onClick={handleCreateSession} disabled={loading || !session.name || !session.sessionId}>
                    {loading ? 'Creating session...' : 'Create Session First'}
                  </button>
                ) : (
                  <div className="rounded-[20px] border border-[rgba(255,138,42,0.16)] bg-[rgba(255,138,42,0.08)] p-3">
                    <p className="section-kicker">Generated Password</p>
                    <p className="mt-2 break-all text-2xl font-semibold tracking-[0.16em] text-slate-900">{session.password}</p>
                    <button className="btn-accent mt-3" onClick={handleCopyPassword}>Copy Password</button>
                  </div>
                )}
              </div>
            </div>

            <div className="card fade-rise">
              <p className="section-kicker">Session Snapshot</p>
              <div className="mt-3 grid gap-2">
                <div className="stat-card">
                  <p className="section-kicker">Question Count</p>
                  <p className="mt-2 text-xl font-semibold">{questions.length}</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Timing Guide</p>
                  <p className="mt-2 text-sm font-semibold">{formatSeconds(totalPreviewTime)}</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Shuffle</p>
                  <p className="mt-2 text-sm font-semibold">{settings.shuffleQuestions ? 'Questions shuffled' : 'Ordered sequence'}</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Session Date</p>
                  <p className="mt-2 text-xs font-semibold">{formatDateTime(session.createdAt)}</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Created By</p>
                  <p className="mt-2 text-sm font-semibold">{session.createdBy || 'Current admin'}</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="compact-stack min-w-0">
            {step === 0 && (
              <div className="card-strong fade-rise">
                <div className="space-y-3">
                  <div className="badge-orange">Step 1</div>
                  <h1 className="hero-title text-2xl">Start with the session shell.</h1>
                  <p className="hero-subtitle">
                    Create the session first. Only after the password is generated will question upload, question design, and timing controls unlock.
                  </p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="compact-stack fade-rise">
                <div className="card-strong">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="badge-blue">Step 2</div>
                      <h2 className="section-title mt-2">Question Canvas</h2>
                      <p className="mt-2 text-sm text-slate-600">
                        Switch between upload, manual builder, preview, and bulk edit without showing every section at once.
                      </p>
                    </div>
                    <a className="btn-outline" href={sampleTemplateUrl} target="_blank" rel="noreferrer">Download Sample .xlsx</a>
                  </div>

                  <div className="mt-4 panel-tabs">
                    {[
                      ['manual', editingQuestion ? 'Edit Builder' : 'Manual Builder'],
                      ['preview', `Question Preview (${questions.length})`],
                      ['bulk', 'Bulk Edit']
                    ].map(([key, label]) => (
                      <button key={key} className={`tab-chip ${canvasTab === key ? 'tab-chip-active' : ''}`} onClick={() => setCanvasTab(key)}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {canvasTab === 'manual' && (
                    <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                      <div className="compact-stack">
                        <div className="table-shell p-3">
                          <label className="label">Upload Question Sheet</label>
                          <input className="input" type="file" accept=".xlsx,.xls" onChange={handleUpload} disabled={!sessionReady || loading} />
                        </div>
                        <div className="table-shell p-3">
                          <p className="section-kicker">Manual Builder</p>
                          <div className="mt-3">
                            <QuestionBuilder
                              sessionId={session.sessionId}
                              onAdded={(nextQuestions) => {
                                if (nextQuestions.length) {
                                  setQuestions(nextQuestions);
                                  setCanvasTab('preview');
                                }
                              }}
                              mode={editingQuestion ? 'edit' : 'create'}
                              initialValues={editingQuestion}
                              onCancel={() => setEditingQuestion(null)}
                              submitLabel={editingQuestion ? 'Save Canvas Changes' : 'Add Question'}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="table-shell p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="section-kicker">Builder Notes</p>
                          <span className="badge-blue">{questions.length} ready</span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="stat-card">
                            <p className="section-kicker">Fast CRUD</p>
                            <p className="mt-2 text-compact text-slate-600">Question add, update, duplicate, and delete now reuse the returned payload instead of refetching the whole screen.</p>
                          </div>
                          <div className="stat-card">
                            <p className="section-kicker">Compact Containers</p>
                            <p className="mt-2 text-compact text-slate-600">Long prompts and options wrap inside cards, keeping text inside each border.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {canvasTab === 'preview' && (
                    <div className="mt-4 compact-stack">
                      {!questions.length && <div className="table-shell p-3 text-sm text-slate-500">No questions yet. Create or upload at least one question to continue.</div>}
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
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">Q{index + 1}.</p>
                              <div className="mt-1 content-safe text-sm text-slate-800">
                                <MathText text={question.question} />
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                Time: {question.customTime ? `${question.customTime}s dedicated` : `${settings.defaultQuestionTime || 60}s default`}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button className="btn-ghost" onClick={() => {
                                setEditingQuestion(question);
                                setCanvasTab('manual');
                              }}>Edit</button>
                              <button className="btn-ghost" onClick={() => handleDuplicateQuestion(question.id)} disabled={loading}>Duplicate</button>
                              <button className="btn-ghost" onClick={() => handleDeleteQuestion(question.id)} disabled={loading}>Delete</button>
                              <button className="btn-ghost" onClick={() => moveQuestion(index, -1)} disabled={index === 0}>Up</button>
                              <button className="btn-ghost" onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1}>Down</button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {Object.entries(question.options || {}).map(([key, value]) => (
                              <div key={key} className={`rounded-2xl px-3 py-2 text-xs ${question.answer === key ? 'bg-[rgba(29,114,255,0.08)] text-blue-900' : 'bg-slate-50 text-slate-600'}`}>
                                <span className="font-semibold">{key}.</span>{' '}
                                <MathText text={value} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {canvasTab === 'bulk' && (
                    <div className="mt-4">
                      {questions.length > 0 ? (
                        <BulkQuestionTable
                          sessionId={session.sessionId}
                          questions={questions}
                          onSaved={(nextQuestions) => setQuestions(nextQuestions)}
                          onDelete={handleDeleteQuestion}
                          onDuplicate={handleDuplicateQuestion}
                          onEdit={(question) => {
                            setEditingQuestion(question);
                            setCanvasTab('manual');
                          }}
                        />
                      ) : (
                        <div className="table-shell p-3 text-sm text-slate-500">Bulk edit unlocks after at least one question exists.</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <button className="btn-primary" onClick={() => setStep(2)} disabled={!questions.length}>Next: Timing Settings</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="card-strong fade-rise">
                <div className="badge-orange">Step 3</div>
                <h2 className="section-title mt-2">Timing and behavior settings</h2>
                <p className="mt-2 text-sm text-slate-600">Keep timer controls compact while still exposing the full timing map.</p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="stat-card">
                    <p className="section-kicker">Question Count</p>
                    <p className="mt-2 text-xl font-semibold">{questions.length}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Total Timer</p>
                    <p className="mt-2 text-sm font-semibold">{settings.enableTotalTimer ? formatSeconds(settings.totalTime) : 'Disabled'}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Question Timer</p>
                    <p className="mt-2 text-sm font-semibold">{settings.enableQuestionTimer ? formatSeconds(settings.defaultQuestionTime) : 'Disabled'}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="stat-card">
                    <p className="section-kicker">Question Sum</p>
                    <p className="mt-2 text-sm font-semibold">{formatSeconds(runtimeSummary.questionSum)}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Minimum Runtime</p>
                    <p className="mt-2 text-sm font-semibold">{formatSeconds(runtimeSummary.minRuntime)}</p>
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Maximum Runtime</p>
                    <p className="mt-2 text-sm font-semibold">{formatSeconds(runtimeSummary.maxRuntime)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="table-shell p-3">
                    <label className="label">Whole Assessment Timer</label>
                    <label className="mt-2 flex items-center gap-3 rounded-2xl border border-[rgba(29,114,255,0.14)] bg-[rgba(29,114,255,0.06)] px-4 py-3 text-sm text-slate-600">
                      <input type="checkbox" checked={settings.enableTotalTimer} onChange={(event) => setSettings((prev) => ({ ...prev, enableTotalTimer: event.target.checked }))} />
                      Enforce an overall countdown
                    </label>
                    <input className="input mt-3" type="number" min="30" value={settings.totalTime} onChange={(event) => setSettings((prev) => ({ ...prev, totalTime: event.target.value }))} disabled={!settings.enableTotalTimer} />
                  </div>
                  <div className="table-shell p-3">
                    <label className="label">Per-Question Timer</label>
                    <label className="mt-2 flex items-center gap-3 rounded-2xl border border-[rgba(255,138,42,0.14)] bg-[rgba(255,138,42,0.08)] px-4 py-3 text-sm text-slate-600">
                      <input type="checkbox" checked={settings.enableQuestionTimer} onChange={(event) => setSettings((prev) => ({ ...prev, enableQuestionTimer: event.target.checked }))} />
                      Auto-skip each question on timeout
                    </label>
                    <input className="input mt-3" type="number" min="10" value={settings.defaultQuestionTime} onChange={(event) => setSettings((prev) => ({ ...prev, defaultQuestionTime: event.target.value }))} disabled={!settings.enableQuestionTimer} />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-[rgba(255,138,42,0.14)] bg-[rgba(255,138,42,0.08)] px-4 py-3 text-sm text-slate-600">
                    <input type="checkbox" checked={settings.shuffleQuestions} onChange={(event) => setSettings((prev) => ({ ...prev, shuffleQuestions: event.target.checked }))} />
                    Shuffle question order once at start
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-[rgba(29,114,255,0.14)] bg-[rgba(29,114,255,0.06)] px-4 py-3 text-sm text-slate-600">
                    <input type="checkbox" checked={settings.shuffleOptions} onChange={(event) => setSettings((prev) => ({ ...prev, shuffleOptions: event.target.checked }))} />
                    Shuffle answer options once at start
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="label">Violation Threshold</label>
                    <input className="input" type="number" min="1" max="10" value={settings.violationThreshold} onChange={(event) => setSettings((prev) => ({ ...prev, violationThreshold: event.target.value }))} />
                  </div>
                  <div className="stat-card">
                    <p className="section-kicker">Strict Runtime</p>
                    <p className="mt-2 text-compact text-slate-600">Students must answer or explicitly skip each question before moving forward.</p>
                  </div>
                </div>

                <div className="mt-4 table-shell compact-scroll">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-[rgba(17,33,61,0.08)] text-left text-slate-500">
                        <th className="px-3 py-2 font-medium">Q</th>
                        <th className="px-3 py-2 font-medium">Prompt</th>
                        <th className="px-3 py-2 font-medium">Timer</th>
                        <th className="px-3 py-2 font-medium">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((question, index) => (
                        <tr key={question.id} className="border-b border-[rgba(17,33,61,0.06)] align-top">
                          <td className="px-3 py-2 font-semibold text-slate-900">{index + 1}</td>
                          <td className="px-3 py-2 text-slate-700"><MathText text={question.question} /></td>
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {settings.enableQuestionTimer ? formatSeconds(question.customTime || settings.defaultQuestionTime) : 'No per-question timer'}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {question.customTime ? 'Dedicated question timer' : settings.enableQuestionTimer ? 'Default question timer' : settings.enableTotalTimer ? 'Assessment timer only' : 'No timer'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex gap-3">
                  <button className="btn-outline" onClick={() => setStep(1)}>Back to Canvas</button>
                  <button className="btn-primary" onClick={handleSettingsSave} disabled={loading}>Save and Preview</button>
                </div>
              </div>
            )}

            {step >= 3 && (
              <div className="compact-stack fade-rise">
                <div className="card-strong">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="badge-blue">{step === 3 ? 'Step 4' : 'Step 5'}</div>
                      <h2 className="section-title mt-2">{step === 3 ? 'Preview and open the waiting room' : 'Launch the live exam'}</h2>
                      <p className="mt-2 text-sm text-slate-600">Keep launch controls visible while preview details stay collapsible.</p>
                    </div>
                    <button className="btn-outline" onClick={() => setPreviewOpen((open) => !open)}>
                      {previewOpen ? 'Hide Preview' : 'Preview Assessment'}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <div className="stat-card">
                      <p className="section-kicker">Session ID</p>
                      <p className="mt-2 text-sm font-semibold">{session.sessionId}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Password</p>
                      <p className="mt-2 break-all text-sm font-semibold tracking-[0.14em]">{session.password}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Questions</p>
                      <p className="mt-2 text-sm font-semibold">{questions.length}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Runtime Window</p>
                      <p className="mt-2 text-xs font-semibold">{formatSeconds(runtimeSummary.minRuntime)} - {formatSeconds(runtimeSummary.maxRuntime)}</p>
                    </div>
                    <div className="stat-card">
                      <p className="section-kicker">Created</p>
                      <p className="mt-2 text-xs font-semibold">{formatDateTime(session.createdAt)}</p>
                    </div>
                  </div>

                  {previewOpen && (
                    <div className="mt-4 compact-stack">
                      {questions.map((question, index) => (
                        <div key={question.id} className="card">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">Q{index + 1}.</p>
                              <div className="mt-1 content-safe text-sm text-slate-800">
                                <MathText text={question.question} />
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                Time guideline: {question.customTime ? `${question.customTime}s dedicated` : settings.enableQuestionTimer ? `${settings.defaultQuestionTime}s default` : settings.enableTotalTimer ? 'Uses total exam timer only' : 'No timer configured'}
                              </p>
                            </div>
                            <span className="badge-slate">Answer {question.answer}</span>
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {Object.entries(question.options || {}).map(([key, value]) => (
                              <div key={key} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                <span className="font-semibold text-slate-900">{key}.</span>{' '}
                                <MathText text={value} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex gap-3">
                    <button className="btn-outline" onClick={() => setStep(2)}>Back to Settings</button>
                    <button className="btn-accent" onClick={handleOpenWaitingRoom} disabled={loading || !questions.length || session.status === 'waiting_room' || session.status === 'live'}>
                      {loading ? 'Opening...' : 'Open Waiting Room'}
                    </button>
                    {(session.status === 'waiting_room' || step === 4) && (
                      <button className="btn-primary" onClick={handleLaunchLive} disabled={loading || session.status === 'live'}>
                        {loading ? 'Launching...' : 'Launch Live Exam'}
                      </button>
                    )}
                  </div>
                  {(session.status === 'waiting_room' || session.status === 'live') && (
                    <div className="mt-3 rounded-[20px] border border-[rgba(29,114,255,0.14)] bg-[rgba(29,114,255,0.06)] px-4 py-3 text-sm text-slate-700">
                      Session status: <span className="font-semibold text-slate-900">{session.status}</span>. Students may wait in the lobby after the room is opened, and only begin once you launch the live exam.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
