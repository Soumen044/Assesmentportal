'use client';

function formatTime(timestamp) {
  if (!timestamp) {
    return '-';
  }
  return new Date(timestamp).toLocaleTimeString();
}

function formatViolationSummary(summary = {}) {
  const entries = Object.entries(summary);
  if (!entries.length) {
    return 'None';
  }
  return entries.map(([type, count]) => `${type} (${count})`).join(', ');
}

export default function LiveStudentList({ data }) {
  const entries = Object.entries(data || {});
  if (!entries.length) {
    return <p className="text-slate-500">No live students yet.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.map(([studentId, student]) => (
        <div key={studentId} className="card fade-rise">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{student.name}</p>
              <p className="text-xs text-slate-500">ID: {studentId}</p>
            </div>
            <span className="badge-orange">{student.status}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{student.status === 'waiting' ? 'Launch Ready' : 'Current Question'}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{student.status === 'waiting' ? (student.launchReady ? 'Yes' : 'No') : ((student.currentQuestion ?? 0) + 1)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Score</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{student.score ?? 0}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Violations</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{(student.violations || []).length}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Correct</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {student.correctCount ?? 0}/{student.totalQuestions ?? 0}
              </p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last Seen</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{formatTime(student.lastSeenAt)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Resumes</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{student.resumeCount ?? 0}</p>
            </div>
          </div>
          <div className="mt-2 rounded-[18px] border border-[rgba(17,33,61,0.08)] bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Violation Types</p>
            <p className="mt-2">{formatViolationSummary(student.violationSummary)}</p>
            {student.attemptedFullscreenExit && (
              <p className="mt-2 font-semibold text-orange-700">Attempted fullscreen exit detected</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
