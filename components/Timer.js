'use client';

export default function Timer({ label, value }) {
  return (
    <div className="rounded-full border border-[rgba(29,114,255,0.12)] bg-white/90 px-3 py-2 text-xs shadow-sm">
      <span className="text-slate-500">{label}: </span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
