'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import Timer from '../../../components/Timer';
import MathText from '../../../components/MathText';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const SKIPPED_TOKEN = '__SKIPPED__';

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function buildQuestionTimers(questions, settings, existing = {}) {
  return questions.reduce((accumulator, question) => {
    const defaultSeconds = Number(question.customTime || settings.defaultQuestionTime || 60);
    accumulator[question.id] = Number(existing[question.id] ?? defaultSeconds);
    return accumulator;
  }, {});
}

function normalizeAnswerRecord(value) {
  if (value && typeof value === 'object') {
    return {
      selectedOption: value.selectedOption || '',
      skipped: Boolean(value.skipped),
      timedOut: Boolean(value.timedOut),
      touchedAt: Number(value.touchedAt || 0)
    };
  }

  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) {
    return { selectedOption: '', skipped: false, timedOut: false, touchedAt: 0 };
  }
  if (normalized === SKIPPED_TOKEN) {
    return { selectedOption: '', skipped: true, timedOut: false, touchedAt: 0 };
  }
  return { selectedOption: normalized, skipped: false, timedOut: false, touchedAt: 0 };
}

function reducer(state, action) {
  switch (action.type) {
    case 'INIT': {
      return {
        ...state,
        phase: 'started',
        ready: true,
        sessionId: action.payload.sessionId,
        studentId: action.payload.studentId,
        settings: action.payload.settings,
        questions: action.payload.questions,
        answers: action.payload.answers,
        currentIndex: action.payload.currentIndex,
        totalRemaining: action.payload.totalRemaining,
        questionRemaining: action.payload.questionRemaining,
        violationCount: action.payload.violationCount,
        violationThreshold: action.payload.violationThreshold
      };
    }
    case 'SELECT_OPTION': {
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: {
            selectedOption: action.option,
            skipped: false,
            timedOut: false,
            touchedAt: Date.now()
          }
        }
      };
    }
    case 'TOGGLE_SKIP': {
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: action.checked
            ? { selectedOption: '', skipped: true, timedOut: false, touchedAt: Date.now() }
            : { selectedOption: '', skipped: false, timedOut: false, touchedAt: Date.now() }
        }
      };
    }
    case 'SET_ANSWER_RECORD':
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: action.answerRecord
        }
      };
    case 'SET_WARNING':
      return { ...state, message: action.message };
    case 'CLEAR_WARNING':
      return { ...state, message: '' };
    case 'SET_VIOLATIONS':
      return { ...state, violationCount: action.count };
    case 'SET_MODAL':
      return { ...state, fullscreenModalOpen: action.open, fullscreenCountdown: action.open ? 8 : state.fullscreenCountdown };
    case 'SET_FULLSCREEN_COUNTDOWN':
      return { ...state, fullscreenCountdown: action.value };
    case 'TICK': {
      const nextQuestionRemaining = { ...state.questionRemaining };
      const currentQuestion = state.questions[state.currentIndex];
      if (state.settings.enableQuestionTimer && currentQuestion) {
        nextQuestionRemaining[currentQuestion.id] = Math.max(0, Number(nextQuestionRemaining[currentQuestion.id] || 0) - 1);
      }
      return {
        ...state,
        totalRemaining: state.settings.enableTotalTimer ? Math.max(0, Number(state.totalRemaining || 0) - 1) : state.totalRemaining,
        questionRemaining: nextQuestionRemaining
      };
    }
    case 'SET_INDEX':
      return { ...state, currentIndex: action.index };
    case 'ADVANCE': {
      return { ...state, currentIndex: Math.min(state.questions.length - 1, state.currentIndex + 1) };
    }
    case 'SET_STATUS':
      return { ...state, phase: action.status };
    default:
      return state;
  }
}

const initialState = {
  phase: 'boot',
  ready: false,
  sessionId: '',
  studentId: '',
  settings: {
    enableTotalTimer: false,
    totalTime: 0,
    enableQuestionTimer: true,
    defaultQuestionTime: 60,
    shuffleQuestions: false,
    shuffleOptions: false,
    violationThreshold: 3
  },
  questions: [],
  answers: {},
  currentIndex: 0,
  totalRemaining: 0,
  questionRemaining: {},
  violationCount: 0,
  violationThreshold: 3,
  fullscreenModalOpen: false,
  fullscreenCountdown: 8,
  message: ''
};

export default function ExamPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const warningTimerRef = useRef(null);
  const fullscreenModalTimerRef = useRef(null);
  const safeExitRef = useRef(false);
  const submittingRef = useRef(false);
  const fullscreenViolationLoggedRef = useRef(false);
  const touchTrackerRef = useRef({ lastTapAt: 0 });
  const queueRef = useRef([]);
  const flushingRef = useRef(false);

  const questions = state.questions;
  const currentQuestion = questions[state.currentIndex];
  const currentAnswer = normalizeAnswerRecord(currentQuestion ? state.answers[currentQuestion.id] : null);
  const currentQuestionTime = currentQuestion ? Number(state.questionRemaining[currentQuestion.id] || 0) : 0;

  const persistRuntime = useCallback((nextState) => {
    if (!nextState.ready) {
      return;
    }
    localStorage.setItem('examRuntime', JSON.stringify({
      settings: nextState.settings,
      manifest: { questions: nextState.questions, settingsSnapshot: nextState.settings },
      answers: nextState.answers,
      currentQuestion: nextState.currentIndex,
      totalRemaining: nextState.totalRemaining,
      questionRemaining: nextState.questionRemaining,
      violationThreshold: nextState.violationThreshold,
      violationCount: nextState.violationCount,
      sessionId: nextState.sessionId,
      studentId: nextState.studentId,
      updatedAt: Date.now()
    }));
  }, []);

  const pushWarning = useCallback((warning) => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
    }
    dispatch({ type: 'SET_WARNING', message: warning });
    warningTimerRef.current = window.setTimeout(() => {
      dispatch({ type: 'CLEAR_WARNING' });
    }, 3500);
  }, []);

  const navigateToResult = useCallback(() => {
    safeExitRef.current = true;
    router.replace('/student/result');
  }, [router]);

  const flushQueue = useCallback(async () => {
    if (flushingRef.current) {
      return;
    }
    flushingRef.current = true;
    while (queueRef.current.length) {
      const task = queueRef.current[0];
      try {
        // eslint-disable-next-line no-await-in-loop
        await task();
        queueRef.current.shift();
      } catch (err) {
        break;
      }
    }
    flushingRef.current = false;
  }, []);

  const enqueue = useCallback((task) => {
    queueRef.current.push(task);
    flushQueue();
  }, [flushQueue]);

  const submitRuntimeAnswer = useCallback(async (questionId, answerRecord, currentQuestionIndex) => {
    await api.post('/api/students/answer', {
      sessionId: state.sessionId,
      studentId: state.studentId,
      questionId,
      selectedOption: answerRecord.selectedOption || '',
      skipped: Boolean(answerRecord.skipped),
      timedOut: Boolean(answerRecord.timedOut),
      currentQuestion: currentQuestionIndex
    });
  }, [state.sessionId, state.studentId]);

  const reportViolation = useCallback(async (type, warning) => {
    if (!state.sessionId || !state.studentId) {
      return;
    }
    if (warning) {
      pushWarning(warning);
    }
    enqueue(async () => {
      const response = await api.post('/api/students/violation', {
        sessionId: state.sessionId,
        studentId: state.studentId,
        type
      });
      const nextCount = Number(response.data?.violationCount || state.violationCount + 1);
      dispatch({ type: 'SET_VIOLATIONS', count: nextCount });
      if (nextCount >= state.violationThreshold && !submittingRef.current) {
        await api.post('/api/students/auto-submit', {
          sessionId: state.sessionId,
          studentId: state.studentId,
          reason: 'violation-threshold'
        });
        localStorage.setItem('studentSubmitReason', 'violation-threshold');
        navigateToResult();
      }
    });
  }, [enqueue, navigateToResult, pushWarning, state.sessionId, state.studentId, state.violationCount, state.violationThreshold]);

  const handleAutoSubmit = useCallback(async (reason) => {
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    dispatch({ type: 'SET_STATUS', status: 'submitting' });
    try {
      await flushQueue();
      await api.post('/api/students/auto-submit', { sessionId: state.sessionId, studentId: state.studentId, reason });
    } catch (err) {
      // ignore forced submit failures
    }
    localStorage.setItem('studentSubmitReason', reason);
    navigateToResult();
  }, [flushQueue, navigateToResult, state.sessionId, state.studentId]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('examRuntime') || '{}');
    if (!saved?.sessionId || !saved?.studentId) {
      router.replace('/student/instructions');
      return;
    }

    const manifestQuestions = saved.manifest?.questions || saved.questions || [];
    const normalizedAnswers = Object.entries(saved.answers || {}).reduce((accumulator, [questionId, value]) => {
      accumulator[questionId] = normalizeAnswerRecord(value);
      return accumulator;
    }, {});
    const settings = saved.settings || saved.manifest?.settingsSnapshot || initialState.settings;
    const questionRemaining = buildQuestionTimers(manifestQuestions, settings, saved.questionRemaining || {});

    dispatch({
      type: 'INIT',
      payload: {
        sessionId: saved.sessionId,
        studentId: saved.studentId,
        settings,
        questions: manifestQuestions,
        answers: normalizedAnswers,
        currentIndex: Math.min(Number(saved.currentQuestion || 0), Math.max(0, manifestQuestions.length - 1)),
        totalRemaining: Number(saved.totalRemaining ?? settings.totalTime ?? 0),
        questionRemaining,
        violationCount: Number(saved.violationCount || 0),
        violationThreshold: Number(saved.violationThreshold || settings.violationThreshold || 3)
      }
    });
  }, [router]);

  useEffect(() => {
    if (!state.ready) {
      return;
    }
    persistRuntime(state);
  }, [persistRuntime, state]);

  useEffect(() => {
    if (!state.ready || state.phase !== 'started') {
      return undefined;
    }
    const timer = window.setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.phase, state.ready]);

  useEffect(() => {
    if (!state.ready || !currentQuestion || state.phase !== 'started') {
      return;
    }
    if (state.settings.enableTotalTimer && Number(state.totalRemaining || 0) <= 0) {
      handleAutoSubmit('timeout-total');
      return;
    }
    if (!state.settings.enableQuestionTimer) {
      return;
    }
    if (Number(state.questionRemaining[currentQuestion.id] || 0) > 0) {
      return;
    }

    const timedOutAnswer = currentAnswer.selectedOption
      ? { ...currentAnswer, timedOut: true, touchedAt: Date.now() }
      : { selectedOption: '', skipped: true, timedOut: true, touchedAt: Date.now() };

    const nextAnswers = {
      ...state.answers,
      [currentQuestion.id]: timedOutAnswer
    };

    dispatch({ type: 'SET_ANSWER_RECORD', questionId: currentQuestion.id, answerRecord: timedOutAnswer });
    enqueue(() => submitRuntimeAnswer(currentQuestion.id, timedOutAnswer, Math.min(state.currentIndex + 1, questions.length - 1)));

    if (state.currentIndex < questions.length - 1) {
      pushWarning(currentAnswer.selectedOption ? 'Question time finished. Your selected answer was kept and the exam moved forward.' : 'Current question timed out and was marked as skipped.');
      dispatch({ type: 'ADVANCE' });
      persistRuntime({ ...state, answers: nextAnswers, currentIndex: state.currentIndex + 1 });
      return;
    }

    persistRuntime({ ...state, answers: nextAnswers });
    handleAutoSubmit(currentAnswer.selectedOption ? 'timeout-final-answered' : 'timeout-final-skipped');
  }, [currentAnswer, currentQuestion, enqueue, handleAutoSubmit, persistRuntime, pushWarning, questions.length, state, submitRuntimeAnswer]);

  useEffect(() => {
    if (!state.ready || !state.sessionId || !state.studentId) {
      return undefined;
    }

    const pollRuntime = async () => {
      try {
        const response = await api.get(`/api/students/runtime/${state.sessionId}/${state.studentId}`);
        const runtime = response.data;
        if (runtime.student?.status === 'submitted' || runtime.student?.forcedStop || runtime.session?.status === 'stopped') {
          pushWarning('This session is no longer active. Redirecting to your result.');
          navigateToResult();
        }
      } catch (err) {
        // best effort
      }
    };

    const sendHeartbeat = async () => {
      try {
        await api.post('/api/students/heartbeat', {
          sessionId: state.sessionId,
          studentId: state.studentId,
          context: 'exam'
        });
      } catch (err) {
        // best effort
      }
    };

    pollRuntime();
    sendHeartbeat();
    const runtimeInterval = window.setInterval(pollRuntime, 5000);
    const heartbeatInterval = window.setInterval(sendHeartbeat, 15000);
    return () => {
      window.clearInterval(runtimeInterval);
      window.clearInterval(heartbeatInterval);
    };
  }, [navigateToResult, pushWarning, state.ready, state.sessionId, state.studentId]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        reportViolation('tab-switch', 'Do not change tabs. This has been marked as a violation.');
      }
    };

    const handleBlur = () => reportViolation('browser-blur', 'The browser lost focus. This has been marked as a violation.');

    const handleBeforeUnload = (event) => {
      if (safeExitRef.current || submittingRef.current) {
        return;
      }
      if (state.sessionId && state.studentId && navigator.sendBeacon) {
        navigator.sendBeacon(`${API_BASE_URL}/api/students/exit/${state.sessionId}/${state.studentId}?reason=browser-close`);
      }
      event.preventDefault();
      event.returnValue = '';
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
      reportViolation('right-click-attempt', 'Do not right click. It will be marked as a violation.');
    };

    const handleDoubleClick = () => {
      reportViolation('double-click-attempt', 'Do not double click. It will be marked as a violation.');
    };

    const handleTouchEnd = () => {
      const now = Date.now();
      if (now - touchTrackerRef.current.lastTapAt < 320) {
        reportViolation('double-tap-attempt', 'Do not double tap. It will be marked as a violation.');
      }
      touchTrackerRef.current.lastTapAt = now;
    };

    const handleFullscreenExit = () => {
      if (!document.fullscreenElement && !safeExitRef.current && !submittingRef.current) {
        if (!fullscreenViolationLoggedRef.current) {
          fullscreenViolationLoggedRef.current = true;
          reportViolation('fullscreen-exit-attempt', 'Fullscreen exit attempted. Return immediately or the exam will be auto-submitted.');
        }
        dispatch({ type: 'SET_MODAL', open: true });
      } else if (document.fullscreenElement) {
        fullscreenViolationLoggedRef.current = false;
        dispatch({ type: 'SET_MODAL', open: false });
      }
    };

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      reportViolation('back-navigation-attempt', 'Back navigation is blocked during the exam.');
    };

    window.history.pushState(null, '', window.location.href);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('fullscreenchange', handleFullscreenExit);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dblclick', handleDoubleClick);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('fullscreenchange', handleFullscreenExit);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [reportViolation, state.sessionId, state.studentId]);

  useEffect(() => {
    if (!state.fullscreenModalOpen) {
      if (fullscreenModalTimerRef.current) {
        window.clearInterval(fullscreenModalTimerRef.current);
      }
      dispatch({ type: 'SET_FULLSCREEN_COUNTDOWN', value: 8 });
      return undefined;
    }

    fullscreenModalTimerRef.current = window.setInterval(() => {
      dispatch({ type: 'SET_FULLSCREEN_COUNTDOWN', value: Math.max(0, state.fullscreenCountdown - 1) });
    }, 1000);

    return () => {
      if (fullscreenModalTimerRef.current) {
        window.clearInterval(fullscreenModalTimerRef.current);
      }
    };
  }, [state.fullscreenCountdown, state.fullscreenModalOpen]);

  useEffect(() => {
    if (state.fullscreenModalOpen && state.fullscreenCountdown <= 0) {
      handleAutoSubmit('fullscreen-exit');
    }
  }, [handleAutoSubmit, state.fullscreenCountdown, state.fullscreenModalOpen]);

  const requestFullscreenRecovery = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      pushWarning('Fullscreen could not be restored automatically. Try again immediately.');
    }
  };

  const canAdvance = Boolean(currentAnswer.selectedOption || currentAnswer.skipped);

  const syncCurrentAnswer = async (nextIndex = state.currentIndex) => {
    if (!currentQuestion) {
      return;
    }
    const answerRecord = normalizeAnswerRecord(state.answers[currentQuestion.id]);
    enqueue(() => submitRuntimeAnswer(currentQuestion.id, answerRecord, nextIndex));
  };

  const handleSelect = (option) => {
    if (!currentQuestion) {
      return;
    }
    dispatch({ type: 'SELECT_OPTION', questionId: currentQuestion.id, option });
    enqueue(() => submitRuntimeAnswer(currentQuestion.id, {
      selectedOption: option,
      skipped: false,
      timedOut: false
    }, state.currentIndex));
  };

  const toggleSkip = (checked) => {
    if (!currentQuestion) {
      return;
    }
    dispatch({ type: 'TOGGLE_SKIP', questionId: currentQuestion.id, checked });
    enqueue(() => submitRuntimeAnswer(currentQuestion.id, {
      selectedOption: '',
      skipped: checked,
      timedOut: false
    }, state.currentIndex));
  };

  const handleNext = async () => {
    if (!canAdvance) {
      pushWarning('Answer the question or mark it as skipped before moving forward.');
      return;
    }
    await syncCurrentAnswer(Math.min(state.currentIndex + 1, questions.length - 1));
    dispatch({ type: 'ADVANCE' });
  };

  const handlePrev = () => {
    if (state.currentIndex > 0) {
      dispatch({ type: 'SET_INDEX', index: state.currentIndex - 1 });
    }
  };

  const handleManualSubmit = async () => {
    if (!canAdvance) {
      pushWarning('Answer the question or mark it as skipped before submitting.');
      return;
    }
    await syncCurrentAnswer(state.currentIndex);
    await flushQueue();
    await handleAutoSubmit(currentAnswer.skipped ? 'manual-skipped' : 'manual');
  };

  const buttonTimerText = useMemo(() => {
    const questionClock = state.settings.enableQuestionTimer ? formatClock(currentQuestionTime) : null;
    const totalClock = state.settings.enableTotalTimer ? formatClock(state.totalRemaining) : null;
    if (questionClock && totalClock) {
      return `${questionClock} question / ${totalClock} left`;
    }
    if (questionClock) {
      return questionClock;
    }
    if (totalClock) {
      return `${totalClock} left`;
    }
    return 'No timer';
  }, [currentQuestionTime, state.settings.enableQuestionTimer, state.settings.enableTotalTimer, state.totalRemaining]);

  if (!state.ready || !currentQuestion) {
    return (
      <main className="page-shell flex items-center justify-center">
        <div className="card text-slate-500">Preparing exam...</div>
      </main>
    );
  }

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap max-w-4xl">
        <section className="space-y-3 fade-rise">
          {state.fullscreenModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,33,61,0.7)] px-4">
              <div className="card-strong max-w-xl">
                <div className="badge-orange">Fullscreen Warning</div>
                <h2 className="section-title mt-3 text-xl">You exited fullscreen.</h2>
                <p className="mt-2 text-xs text-slate-600">
                  This has been marked as a violation. If you do not return to fullscreen within {state.fullscreenCountdown} seconds,
                  your exam will be auto-submitted.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-primary" onClick={requestFullscreenRecovery}>Return to Fullscreen</button>
                  <button className="btn-accent" onClick={() => handleAutoSubmit('fullscreen-exit-confirmed')}>
                    Submit Now
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card-strong priority-actions">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="badge-blue">Focused Exam Mode</div>
                <h1 className="section-title mt-1 text-base sm:text-lg">Question {state.currentIndex + 1} of {questions.length}</h1>
                <p className="mt-1 text-[11px] text-slate-600">
                  Violations recorded: <span className="font-semibold text-slate-900">{state.violationCount}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.settings.enableQuestionTimer && <Timer label="Question" value={formatClock(currentQuestionTime)} />}
                {state.settings.enableTotalTimer && <Timer label="Assessment" value={formatClock(state.totalRemaining)} />}
              </div>
            </div>
          </div>

          <div className="card-strong">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="section-kicker">Current Prompt</p>
              <span className="badge-orange">
                {state.settings.enableQuestionTimer ? `${formatClock(currentQuestionTime)} for this question` : 'Per-question timer disabled'}
              </span>
            </div>
            <div className="mt-2 text-base font-semibold leading-5 text-slate-900 sm:text-lg">
              <MathText text={currentQuestion.question} />
            </div>
            {currentQuestion.image && (
              <img src={currentQuestion.image} alt="Question" className="mt-3 max-h-52 rounded-[16px] border border-[rgba(17,33,61,0.08)] object-contain p-2" />
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(currentQuestion.options).map(([key, value]) => (
                <button
                  key={key}
                  className={`min-h-[78px] rounded-[14px] border px-3 py-2 text-left text-xs leading-4 transition ${
                    currentAnswer.selectedOption === key
                      ? 'border-[rgba(29,114,255,0.28)] bg-[rgba(29,114,255,0.12)] text-blue-900'
                      : 'border-[rgba(17,33,61,0.08)] bg-white/80 text-slate-700 hover:border-[rgba(255,138,42,0.24)] hover:bg-[rgba(255,138,42,0.08)]'
                  }`}
                  onClick={() => handleSelect(key)}
                >
                  <strong className="mr-2">{key}.</strong>
                  <MathText text={value} />
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 rounded-xl border border-[rgba(255,138,42,0.14)] bg-[rgba(255,138,42,0.08)] px-3 py-2 text-xs text-slate-700">
              <input type="checkbox" checked={currentAnswer.skipped} onChange={(event) => toggleSkip(event.target.checked)} />
              Skip this question
            </label>
          </div>

          <div className="space-y-2">
            <div className="rounded-xl border border-[rgba(29,114,255,0.12)] bg-[rgba(29,114,255,0.06)] px-3 py-2 text-xs font-medium text-slate-700">
              Active timer: {buttonTimerText}
            </div>
            <div className="card priority-actions flex flex-wrap items-center justify-between gap-2 bg-white/95">
              <button className="btn-outline" onClick={handlePrev} disabled={state.currentIndex === 0}>Previous</button>
              {state.currentIndex < questions.length - 1 ? (
                <button className="btn-primary" onClick={handleNext} disabled={!canAdvance}>
                  {(currentAnswer.skipped ? 'Skip and Next' : 'Save and Next')} | {buttonTimerText}
                </button>
              ) : (
                <button className={canAdvance ? 'btn-primary' : 'btn-outline'} onClick={handleManualSubmit} disabled={!canAdvance}>
                  {(currentAnswer.skipped ? 'Submit with Skip' : 'Submit Exam')} | {buttonTimerText}
                </button>
              )}
            </div>
          </div>

          {state.message && <div className="glass-banner text-xs text-slate-700">{state.message}</div>}
        </section>
      </div>
    </main>
  );
}
