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

export default function LiveStudentList({ data, emptyMessage = 'No students yet.' }) {
  const entries = Object.entries(data || {}).sort(([, left], [, right]) => {
    const leftTime = Number(left?.joinedAt || left?.lastSeenAt || 0);
    const rightTime = Number(right?.joinedAt || right?.lastSeenAt || 0);
    return rightTime - leftTime;
  });

  if (!entries.length) {
    return <p className="text-xs text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-2 xl:grid-cols-2">
      {entries.map(([studentId, student]) => (
        <div key={studentId} className="card fade-rise p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{student.name}</p>
              <p className="text-[11px] text-slate-500">ID: {studentId}</p>
            </div>
            <span className={student.status === 'waiting' ? 'badge-blue' : 'badge-orange'}>{student.status}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{student.status === 'waiting' ? 'Launch Ready' : 'Current Question'}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{student.status === 'waiting' ? (student.launchReady ? 'Yes' : 'No') : ((student.currentQuestion ?? 0) + 1)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Score</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{student.score ?? 0}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Answered</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{student.answeredCount ?? 0}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Skipped</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{student.skippedCount ?? 0}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Violations</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{(student.violations || []).length}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Joined</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{formatTime(student.joinedAt)}</p>
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
          <div className="mt-2 rounded-[18px] border border-[rgba(17,33,61,0.08)] bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
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
