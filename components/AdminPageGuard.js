'use client';

import { useAdminSessionGuard } from '../lib/adminSession';

export default function AdminPageGuard({ children }) {
  const ready = useAdminSessionGuard();

  if (!ready) {
    return (
      <main className="page-shell surface-grid">
        <div className="page-wrap">
          <div className="card text-sm text-slate-500">Checking admin session...</div>
        </div>
      </main>
    );
  }

  return children;
}
