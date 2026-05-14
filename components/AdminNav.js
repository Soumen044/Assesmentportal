'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/create', label: 'Create Assessment' },
  { href: '/admin/live', label: 'Live Assessments' },
  { href: '/admin/previous', label: 'Previous Assessments' }
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  return (
    <nav className="card-strong mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between fade-rise">
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="badge-blue">Admin Control Deck</div>
          <div className="badge-slate">{todayLabel}</div>
        </div>
        <div>
          <p className="section-title text-lg">Assessment Command Center</p>
          <p className="text-xs text-slate-600">Compact controls for sessions, monitoring, exports, and notifications.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              pathname === link.href
                ? 'bg-[rgba(29,114,255,0.12)] text-blue-700'
                : 'bg-white/70 text-slate-600 hover:bg-[rgba(255,138,42,0.1)] hover:text-slate-900'
            }`}
          >
            {link.label}
          </Link>
        ))}
        <button className="btn-accent" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
