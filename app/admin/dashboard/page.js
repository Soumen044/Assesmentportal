'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminNav from '../../../components/AdminNav';
import api from '../../../lib/api';

export default function AdminDashboardPage() {
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/api/assessments');
        setAssessments(response.data.assessments || []);
      } catch (error) {
        setAssessments([]);
      }
    };
    load();
  }, []);

  const activeCount = assessments.filter((assessment) => assessment.status === 'active').length;
  const totalStudents = assessments.reduce((sum, assessment) => sum + Number(assessment.studentCount || 0), 0);

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <AdminNav />
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] fade-rise">
          <div className="card-strong">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="badge-blue">Dashboard Overview</div>
                <h1 className="hero-title text-3xl md:text-4xl">Run assessments with a cleaner control rhythm.</h1>
                <p className="hero-subtitle max-w-2xl">
                  Create sessions first, build questions with a drag-and-drop canvas, preview timing decisions, and keep session credentials visible for live operations.
                </p>
              </div>
              <Link href="/admin/create" className="btn-primary">Create New Session</Link>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="stat-card">
                <p className="section-kicker">All Sessions</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{assessments.length}</p>
              </div>
              <div className="stat-card">
                <p className="section-kicker">Live Now</p>
                <p className="mt-3 text-3xl font-semibold text-blue-700">{activeCount}</p>
              </div>
              <div className="stat-card">
                <p className="section-kicker">Participants</p>
                <p className="mt-3 text-3xl font-semibold text-orange-600">{totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Link href="/admin/create" className="card transition hover:-translate-y-1">
              <div className="badge-orange">Create</div>
              <h2 className="mt-4 text-xl font-semibold">Session Builder</h2>
              <p className="mt-2 text-sm text-slate-600">Create session first, then upload or craft questions, reorder them, and lock in timing.</p>
            </Link>
            <Link href="/admin/live" className="card transition hover:-translate-y-1">
              <div className="badge-blue">Monitor</div>
              <h2 className="mt-4 text-xl font-semibold">Live Assessments</h2>
              <p className="mt-2 text-sm text-slate-600">Watch active students, session IDs, passwords, and violations as they unfold.</p>
            </Link>
            <Link href="/admin/previous" className="card transition hover:-translate-y-1">
              <div className="badge-slate">Archive</div>
              <h2 className="mt-4 text-xl font-semibold">Previous Assessments</h2>
              <p className="mt-2 text-sm text-slate-600">Review historic sessions, export results, inspect violations, and clean up data.</p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
