import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <section className="card-strong relative overflow-hidden fade-rise">
          <div className="absolute -left-16 top-8 h-44 w-44 rounded-full bg-[rgba(255,138,42,0.14)] blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[rgba(29,114,255,0.14)] blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="badge-blue">Assessment Portal</div>
              <div className="space-y-4">
                <h1 className="hero-title max-w-3xl">Launch secure assessments with a brighter, smoother control flow.</h1>
                <p className="hero-subtitle max-w-2xl">
                  A responsive command center for admins and a focused exam experience for students, built around live sessions,
                  strict fullscreen entry, and clean assessment creation.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="btn-primary" href="/admin/login">Enter Admin Panel</Link>
                <Link className="btn-accent" href="/student">Join as Student</Link>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              <div className="stat-card float-soft">
                <p className="section-kicker">Admin Workflow</p>
                <p className="mt-3 text-lg font-semibold">Create session, upload questions, preview timing, confirm, and monitor live.</p>
              </div>
              <div className="stat-card float-soft" style={{ animationDelay: '0.8s' }}>
                <p className="section-kicker">Student Workflow</p>
                <p className="mt-3 text-lg font-semibold">Validate session, verify password, enter fullscreen, and attempt in a distraction-limited view.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
