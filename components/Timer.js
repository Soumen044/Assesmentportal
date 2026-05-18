'use client';

export default function Timer({ label, value }) {
  return (
    <div className="rounded-full border border-[rgba(29,114,255,0.12)] bg-white/90 px-2.5 py-1.5 text-[11px] shadow-sm">
      <span className="text-slate-500">{label}: </span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
