'use client';

export default function Stepper({ steps, current }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 fade-rise">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 shadow-sm">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
              index === current
                ? 'bg-[linear-gradient(135deg,#ff8a2a,#1d72ff)] text-white'
                : index < current
                  ? 'bg-[rgba(255,138,42,0.14)] text-orange-700'
                  : 'bg-slate-200 text-slate-500'
            }`}
          >
            {index + 1}
          </div>
          <span className={`${index === current ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>{step}</span>
        </div>
      ))}
    </div>
  );
}
