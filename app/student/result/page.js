'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import MathText from '../../../components/MathText';

function formatReviewStatus(item) {
  if (item.status === 'skipped') {
    return item.timedOut ? 'Skipped by timeout' : 'Skipped';
  }
  if (item.status === 'answered') {
    return item.selectedAnswer || 'Answered';
  }
  return 'Not answered';
}

export default function StudentResultPage() {
  const [resultPayload, setResultPayload] = useState(null);
  const [message, setMessage] = useState('Loading your result...');
  const [tab, setTab] = useState('summary');

  useEffect(() => {
    const loadResult = async () => {
      const sessionId = localStorage.getItem('studentSessionId');
      const studentId = localStorage.getItem('studentId');
      if (!sessionId || !studentId) {
        setMessage('Result data is not available for this browser session.');
        return;
      }

      try {
        const response = await api.get(`/api/students/result/${sessionId}/${studentId}`);
        setResultPayload(response.data);
        setMessage('');
      } catch (err) {
        setMessage(err.response?.data?.error || 'Unable to load result details');
      }
    };

    loadResult();
  }, []);

  if (!resultPayload) {
    return (
      <main className="page-shell surface-grid">
        <div className="page-wrap">
          <section className="card-strong fade-rise">
            <div className="badge-blue">Assessment Result</div>
            <p className="mt-4 text-sm text-slate-600">{message}</p>
            <div className="mt-4">
              <Link className="btn-primary" href="/">Return Home</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { session, student, result } = resultPayload;

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <section className="space-y-4 fade-rise">
          <div className="card-strong">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="badge-orange">Assessment Submitted</div>
                <h1 className="hero-title mt-3 text-2xl md:text-4xl">{session.name}</h1>
                <p className="hero-subtitle mt-2">
                  Candidate: {student.name} | Status: {student.status} | Submit: {student.submitReason || 'manual'}
                </p>
              </div>
              <Link className="btn-primary" href="/">Return Home</Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
              <div className="stat-card">
                <p className="section-kicker">Score</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{result.score}</p>
                <p className="mt-1 text-xs text-slate-500">out of {result.maxScore}</p>
              </div>
              <div className="stat-card">
                <p className="section-kicker">Correct</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{result.correctCount}</p>
                <p className="mt-1 text-xs text-slate-500">of {result.totalQuestions}</p>
              </div>
              <div className="stat-card">
                <p className="section-kicker">Answered</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{result.answeredCount}</p>
                <p className="mt-1 text-xs text-slate-500">responses recorded</p>
              </div>
              <div className="stat-card">
                <p className="section-kicker">Skipped</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{result.skippedCount}</p>
                <p className="mt-1 text-xs text-slate-500">marked skip or timed out</p>
              </div>
              <div className="stat-card">
                <p className="section-kicker">Accuracy</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{result.accuracy}%</p>
                <p className="mt-1 text-xs text-slate-500">based on total questions</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="panel-tabs">
              {[
                ['summary', 'Summary'],
                ['review', `Question Review (${result.reviewedQuestions.length})`]
              ].map(([key, label]) => (
                <button key={key} className={`tab-chip ${tab === key ? 'tab-chip-active' : ''}`} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'summary' && (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="stat-card">
                  <p className="section-kicker">Correct Answers</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{result.correctCount} / {result.totalQuestions}</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Answered</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{result.answeredCount}</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Skipped</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{result.skippedCount}</p>
                </div>
              </div>
            )}

            {tab === 'review' && (
              <div className="mt-4 space-y-3">
                {result.reviewedQuestions.map((item) => (
                  <div key={item.id} className="table-shell p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 font-semibold text-slate-900">
                        <span>Q{item.index}. </span>
                        <MathText text={item.question} />
                      </div>
                      <span className={item.isCorrect ? 'badge-blue' : 'badge-orange'}>
                        {item.isCorrect ? '+100 points' : '0 points'}
                      </span>
                    </div>
                    {item.image && (
                      <img src={item.image} alt="Question" className="mt-3 max-h-64 rounded-[20px] border border-[rgba(17,33,61,0.08)] object-contain p-3" />
                    )}
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {Object.entries(item.options).map(([key, value]) => (
                        <div
                          key={key}
                          className={`rounded-[18px] border px-3 py-2 text-xs ${
                            item.correctAnswer === key
                              ? 'border-[rgba(29,114,255,0.22)] bg-[rgba(29,114,255,0.1)] text-blue-900'
                              : item.selectedAnswer === key
                                ? 'border-[rgba(255,138,42,0.24)] bg-[rgba(255,138,42,0.1)] text-orange-900'
                                : 'border-[rgba(17,33,61,0.08)] bg-white/80 text-slate-600'
                          }`}
                        >
                          <strong className="mr-2">{key}.</strong>
                          <MathText text={value} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <div className="stat-card">
                        <p className="section-kicker">Your Answer</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{formatReviewStatus(item)}</p>
                      </div>
                      <div className="stat-card">
                        <p className="section-kicker">Correct Answer</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{item.correctAnswer}</p>
                      </div>
                      <div className="stat-card">
                        <p className="section-kicker">Result</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{item.isCorrect ? 'Correct' : 'Incorrect'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
