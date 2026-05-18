'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../../../components/AdminNav';
import AdminPageGuard from '../../../components/AdminPageGuard';
import api from '../../../lib/api';

export default function PreviousPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadAssessments = async () => {
      try {
        const response = await api.get('/api/assessments');
        setAssessments(response.data.assessments || []);
      } catch (err) {
        setAssessments([]);
        setMessage('Unable to load previous assessments.');
      }
    };

    loadAssessments();
  }, []);

  const archivedAssessments = useMemo(
    () => assessments.filter((assessment) => !['draft', 'live', 'waiting_room'].includes(String(assessment.status || ''))),
    [assessments]
  );

  return (
    <AdminPageGuard>
      <main className="page-shell surface-grid">
        <div className="page-wrap">
          <AdminNav />
          {message && <div className="glass-banner mb-3 text-xs text-slate-700">{message}</div>}

          <section className="compact-stack fade-rise">
            <div className="card-strong">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="badge-blue">Previous Assessments</div>
                  <h1 className="section-title mt-2">Archive table</h1>
                </div>
                <div className="badge-slate">{archivedAssessments.length} rows</div>
              </div>
            </div>

            <div className="card">
              <div className="table-shell compact-scroll">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(17,33,61,0.08)] text-left text-slate-500">
                      <th className="px-3 py-2 font-medium">Assessment Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedAssessments.map((assessment) => (
                      <tr
                        key={assessment.sessionId}
                        className="cursor-pointer border-b border-[rgba(17,33,61,0.06)] transition hover:bg-[rgba(29,114,255,0.05)]"
                        onClick={() => router.push(`/admin/previous/${assessment.sessionId}`)}
                      >
                        <td className="px-3 py-2.5 font-semibold text-slate-900">{assessment.name}</td>
                      </tr>
                    ))}
                    {!archivedAssessments.length && (
                      <tr>
                        <td className="px-3 py-4 text-xs text-slate-500">No archived assessments.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AdminPageGuard>
  );
}
