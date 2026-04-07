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

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  return (
    <nav className="card-strong mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between fade-rise">
      <div className="space-y-2">
        <div className="badge-blue">Admin Control Deck</div>
        <div>
          <p className="section-title text-xl">Assessment Command Center</p>
          <p className="text-sm text-slate-600">Manage sessions, timing, monitoring, and exports from one place.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
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
