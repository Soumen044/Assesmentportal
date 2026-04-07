'use client';

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
    <div className="grid gap-4 md:grid-cols-2">
      {entries.map(([studentId, student]) => (
        <div key={studentId} className="card fade-rise">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{student.name}</p>
              <p className="text-sm text-slate-500">ID: {studentId}</p>
            </div>
            <span className="badge-orange">{student.status}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Question</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{(student.currentQuestion ?? 0) + 1}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Score</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{student.score ?? 0}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Violations</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{(student.violations || []).length}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Correct</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {student.correctCount ?? 0}/{student.totalQuestions ?? 0}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Answered</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{student.answeredCount ?? 0}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Accuracy</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{student.accuracy ?? 0}%</p>
            </div>
          </div>
          <div className="mt-3 rounded-[22px] border border-[rgba(17,33,61,0.08)] bg-slate-50 px-4 py-3 text-sm text-slate-600">
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
