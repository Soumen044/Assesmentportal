'use client';

export default function Stepper({ steps, current }) {
  return (
    <div className="compact-scroll mb-3 flex items-center gap-2 fade-rise">
      {steps.map((step, index) => (
        <div key={step} className="flex shrink-0 items-center gap-2 rounded-full bg-white/70 px-2.5 py-1.5 shadow-sm">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
              index === current
                ? 'bg-[linear-gradient(135deg,#ff8a2a,#1d72ff)] text-white'
                : index < current
                  ? 'bg-[rgba(255,138,42,0.14)] text-orange-700'
                  : 'bg-slate-200 text-slate-500'
            }`}
          >
            {index + 1}
          </div>
          <span className={`text-[11px] ${index === current ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{step}</span>
        </div>
      ))}
    </div>
  );
}
