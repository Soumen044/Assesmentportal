'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import Timer from '../../../components/Timer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function getQuestionTime(question, settings) {
  const customTime = Number(question?.customTime || 0);
  if (customTime > 0) {
    return customTime;
  }
  return Number(settings?.perQuestionTime || 60);
}

export default function ExamPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState({ mode: 'per-question', perQuestionTime: 60, totalTime: 0, shuffle: false });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [message, setMessage] = useState('');
  const [violationCount, setViolationCount] = useState(0);
  const submittingRef = useRef(false);
  const timerReadyRef = useRef(false);
  const safeExitRef = useRef(false);
  const touchTrackerRef = useRef({ lastTapAt: 0 });
  const warningTimerRef = useRef(null);

  const pushWarning = (warning) => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
    }
    setMessage(warning);
    warningTimerRef.current = window.setTimeout(() => {
      setMessage((current) => (current === warning ? '' : current));
    }, 3500);
  };

  useEffect(() => {
    const storedQuestions = JSON.parse(localStorage.getItem('examQuestions') || '[]');
    const storedSettings = JSON.parse(localStorage.getItem('examSettings') || '{}');
    setQuestions(storedQuestions);
    setSettings({
      mode: storedSettings.mode || 'per-question',
      perQuestionTime: storedSettings.perQuestionTime || 60,
      totalTime: storedSettings.totalTime || 0,
      shuffle: storedSettings.shuffle || false
    });
    return () => {
      if (warningTimerRef.current) {
        window.clearTimeout(warningTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!questions.length) {
      return;
    }
    if (settings.mode === 'total') {
      setTimeLeft(Number(settings.totalTime || 0));
      timerReadyRef.current = true;
    }
  }, [questions, settings.mode, settings.totalTime]);

  useEffect(() => {
    if (!questions.length || settings.mode !== 'per-question') {
      return;
    }
    setTimeLeft(getQuestionTime(questions[currentIndex], settings));
    timerReadyRef.current = true;
  }, [questions, currentIndex, settings]);

  useEffect(() => {
    if (!questions.length || timeLeft === null || timeLeft <= 0) {
      return undefined;
    }
    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous === null || previous <= 0) {
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, questions.length]);

  const navigateToResult = () => {
    safeExitRef.current = true;
    router.push('/student/result');
  };

  const handleAutoSubmit = async (reason) => {
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    const sessionId = localStorage.getItem('studentSessionId');
    const studentId = localStorage.getItem('studentId');
    try {
      await api.post('/api/students/auto-submit', { sessionId, studentId, reason });
    } catch (err) {
      // ignore submit errors on forced exit
    }
    localStorage.setItem('studentSubmitReason', reason);
    setMessage('Exam submitted.');
    navigateToResult();
  };

  useEffect(() => {
    if (timerReadyRef.current && timeLeft === 0 && questions.length) {
      handleAutoSubmit('timeout');
    }
  }, [timeLeft, questions.length]);

  const reportViolation = async (type, warning) => {
    const sessionId = localStorage.getItem('studentSessionId');
    const studentId = localStorage.getItem('studentId');
    if (!sessionId || !studentId) {
      return;
    }
    if (warning) {
      pushWarning(warning);
    }
    try {
      await api.post('/api/students/violation', { sessionId, studentId, type });
      setViolationCount((count) => {
        const nextCount = count + 1;
        if (nextCount >= 3) {
          handleAutoSubmit('violation-threshold');
        }
        return nextCount;
      });
    } catch (err) {
      // ignore logging errors
    }
  };

  useEffect(() => {
    const sessionId = localStorage.getItem('studentSessionId');
    if (!sessionId) {
      return undefined;
    }

    const pollStatus = async () => {
      try {
        const response = await api.get(`/api/students/session-status/${sessionId}`);
        if (response.data.session?.status === 'stopped' && !submittingRef.current) {
          pushWarning('This session was stopped by the admin. Your exam is being submitted.');
          handleAutoSubmit('session-stopped');
        }
      } catch (err) {
        // ignore polling errors
      }
    };

    pollStatus();
    const intervalId = window.setInterval(pollStatus, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        reportViolation('visibilitychange', 'Do not change tabs. This has been marked as a violation.');
      }
    };

    const handleBlur = () => reportViolation('blur', 'The browser lost focus. This has been marked as a violation.');

    const handleBeforeUnload = (event) => {
      if (safeExitRef.current || submittingRef.current) {
        return;
      }

      const sessionId = localStorage.getItem('studentSessionId');
      const studentId = localStorage.getItem('studentId');
      if (sessionId && studentId && navigator.sendBeacon) {
        navigator.sendBeacon(`${API_BASE_URL}/api/students/exit/${sessionId}/${studentId}?reason=browser-close`);
      }
      event.preventDefault();
      event.returnValue = '';
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
      reportViolation('right-click', 'Do not right click. It will be marked as a violation.');
    };

    const handleDoubleClick = () => {
      reportViolation('double-click', 'Do not double click. It will be marked as a violation.');
    };

    const handleTouchEnd = () => {
      const now = Date.now();
      if (now - touchTrackerRef.current.lastTapAt < 320) {
        reportViolation('double-tap', 'Do not double tap. It will be marked as a violation.');
      }
      touchTrackerRef.current.lastTapAt = now;
    };

    const handleFullscreenExit = () => {
      if (!document.fullscreenElement) {
        reportViolation('fullscreen-exit', 'Do not exit fullscreen. It has been marked as a violation.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('fullscreenchange', handleFullscreenExit);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dblclick', handleDoubleClick);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('fullscreenchange', handleFullscreenExit);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const saveAnswer = async (answerOverride) => {
    const sessionId = localStorage.getItem('studentSessionId');
    const studentId = localStorage.getItem('studentId');
    const question = questions[currentIndex];
    const answer = answerOverride ?? answers[question.id] ?? '';
    await api.post('/api/students/answer', {
      sessionId,
      studentId,
      questionId: question.id,
      answer,
      currentQuestion: currentIndex
    });
  };

  const handleSelect = async (option) => {
    const question = questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
    try {
      await saveAnswer(option);
    } catch (err) {
      pushWarning('Answer could not be synced immediately. It will retry on the next action.');
    }
  };

  const handleNext = async () => {
    await saveAnswer();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleManualSubmit = async () => {
    await saveAnswer();
    await handleAutoSubmit('manual');
  };

  if (!questions.length) {
    return (
      <main className="page-shell flex items-center justify-center">
        <div className="card text-slate-500">Loading exam...</div>
      </main>
    );
  }

  const question = questions[currentIndex];

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap max-w-5xl">
        <section className="space-y-6 fade-rise">
          <div className="card-strong">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="badge-blue">Focused Exam Mode</div>
                <h1 className="section-title mt-3 text-3xl">Question {currentIndex + 1} of {questions.length}</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Violations recorded: <span className="font-semibold text-slate-900">{violationCount}</span>
                </p>
              </div>
              <Timer label="Time Left" value={timeLeft === null ? '...' : `${timeLeft}s`} />
            </div>
          </div>

          <div className="card-strong">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="section-kicker">Current Prompt</p>
              <span className="badge-orange">
                {settings.mode === 'total' ? 'Total timer running' : `${getQuestionTime(question, settings)}s for this question`}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">{question.question}</h2>
            {question.image && (
              <img src={question.image} alt="Question" className="mt-5 max-h-72 rounded-[24px] border border-[rgba(17,33,61,0.08)] object-contain p-3" />
            )}
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {Object.entries(question.options).map(([key, value]) => (
                <button
                  key={key}
                  className={`rounded-[24px] border px-5 py-4 text-left transition ${
                    answers[question.id] === key
                      ? 'border-[rgba(29,114,255,0.28)] bg-[rgba(29,114,255,0.12)] text-blue-900'
                      : 'border-[rgba(17,33,61,0.08)] bg-white/80 text-slate-700 hover:border-[rgba(255,138,42,0.24)] hover:bg-[rgba(255,138,42,0.08)]'
                  }`}
                  onClick={() => handleSelect(key)}
                >
                  <strong className="mr-2">{key}.</strong>
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button className="btn-outline" onClick={handlePrev} disabled={currentIndex === 0}>Previous</button>
            {currentIndex < questions.length - 1 ? (
              <button className="btn-primary" onClick={handleNext}>Save and Next</button>
            ) : (
              <button className="btn-accent" onClick={handleManualSubmit}>Submit Exam</button>
            )}
          </div>

          {message && <div className="glass-banner text-sm text-slate-700">{message}</div>}
        </section>
      </div>
    </main>
  );
}
