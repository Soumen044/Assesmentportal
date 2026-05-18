import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <section className="card-strong relative overflow-hidden fade-rise">
          <div className="absolute -left-12 top-4 h-32 w-32 rounded-full bg-[rgba(255,138,42,0.14)] blur-3xl" />
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[rgba(29,114,255,0.14)] blur-3xl" />
          <div className="relative grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="badge-blue">Assessment Portal</div>
                <div className="badge-slate">Fast Entry</div>
              </div>
              <div className="space-y-2">
                <h1 className="hero-title max-w-3xl">Launch, monitor, and join exams without scrolling through filler.</h1>
                <p className="hero-subtitle max-w-2xl">
                  Admin and student actions stay at the top, with compact cards and tighter controls for faster use on desktop and phone.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="btn-primary" href="/admin/login">Enter Admin Panel</Link>
                <Link className="btn-accent" href="/student">Join as Student</Link>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-1">
              <div className="stat-card float-soft">
                <p className="section-kicker">Admin Workflow</p>
                <p className="mt-2 text-sm font-semibold">Create, launch, track, export.</p>
              </div>
              <div className="stat-card float-soft" style={{ animationDelay: '0.8s' }}>
                <p className="section-kicker">Student Workflow</p>
                <p className="mt-2 text-sm font-semibold">Verify, enter fullscreen, answer with minimal movement.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
