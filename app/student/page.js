'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

export default function StudentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', sessionId: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  const handleChange = (field) => (event) => {
    const rawValue = event.target.value;
    let nextValue = rawValue;

    if (field === 'name') {
      nextValue = rawValue.replace(/[^A-Za-z\s]/g, '');
    }
    if (field === 'phone') {
      nextValue = rawValue.replace(/\D/g, '').slice(0, 10);
    }
    if (field === 'sessionId') {
      nextValue = rawValue.trimStart();
    }

    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const normalizedName = form.name.trim();
  const normalizedPhone = form.phone.trim();
  const normalizedSessionId = form.sessionId.trim();
  const normalizedPassword = form.password;
  const isValidName = /^[A-Za-z\s]+$/.test(normalizedName) && normalizedName.length >= 2;
  const isValidPhone = /^\d{10}$/.test(normalizedPhone);

  const handleSessionLookup = async () => {
    if (!isValidName) {
      setMessage('Name must contain only letters and spaces.');
      return;
    }
    if (!isValidPhone) {
      setMessage('Phone number must be exactly 10 digits.');
      return;
    }
    if (!normalizedSessionId) {
      setMessage('Enter a valid session ID.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await api.get(`/api/students/session/${encodeURIComponent(normalizedSessionId)}`);
      setSessionMeta(response.data.session);
      setForm((prev) => ({ ...prev, sessionId: normalizedSessionId }));
      setStep(2);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Session lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndJoin = async () => {
    setLoading(true);
    setMessage('');
    try {
      await api.post('/api/students/verify-password', {
        sessionId: normalizedSessionId,
        password: normalizedPassword
      });
      const joinResponse = await api.post('/api/students/join', {
        name: normalizedName,
        phone: normalizedPhone,
        sessionId: normalizedSessionId
      });
      localStorage.setItem('studentId', joinResponse.data.studentId);
      localStorage.setItem('studentSessionId', sessionMeta?.sessionId || normalizedSessionId);
      localStorage.setItem('studentName', normalizedName);
      localStorage.setItem('studentSessionMeta', JSON.stringify(sessionMeta || { sessionId: normalizedSessionId }));
      router.push('/student/instructions');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to verify session password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] fade-rise">
          <div className="card-strong">
            <div className="badge-orange">Student Entry</div>
            <h1 className="hero-title mt-4 text-3xl md:text-5xl">Enter only when the session is live.</h1>
            <p className="hero-subtitle mt-4">
              We first validate the session ID, then unlock the password step, and finally move you into the fullscreen exam instructions.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="stat-card">
                <p className="section-kicker">Step 1</p>
                <p className="mt-2 font-semibold">Provide your name, phone number, and the session ID.</p>
              </div>
              <div className="stat-card">
                <p className="section-kicker">Step 2</p>
                <p className="mt-2 font-semibold">If the session is live, verify its password and continue into fullscreen mode.</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="badge-blue">Candidate Flow</div>
            <h2 className="section-title mt-3 text-2xl">{step === 1 ? 'Verify live session' : 'Enter session password'}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {step === 1
                ? 'The session ID is checked before any student record is created.'
                : 'Password confirmation happens before you enter the fullscreen instruction page.'}
            </p>

            {step === 1 && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={form.name} onChange={handleChange('name')} placeholder="Letters only" />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input className="input" value={form.phone} onChange={handleChange('phone')} inputMode="numeric" maxLength={10} placeholder="10 digit mobile number" />
                </div>
                <div>
                  <label className="label">Session ID</label>
                  <input className="input" value={form.sessionId} onChange={handleChange('sessionId')} />
                </div>
                {message && <p className="text-sm text-red-600">{message}</p>}
                <button className="btn-primary w-full" onClick={handleSessionLookup} disabled={loading || !normalizedName || !normalizedPhone || !normalizedSessionId || !isValidName || !isValidPhone}>
                  {loading ? 'Checking session...' : 'Continue'}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="mt-6 space-y-4">
                <div className="glass-banner">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Live Session Found</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{sessionMeta?.name}</p>
                  <p className="mt-1 text-sm text-slate-500">Session ID: {sessionMeta?.sessionId}</p>
                </div>
                <div>
                  <label className="label">Session Password</label>
                  <div className="flex gap-3">
                    <input className="input flex-1" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange('password')} />
                    <button className="btn-outline" type="button" onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                {message && <p className="text-sm text-red-600">{message}</p>}
                <div className="flex gap-3">
                  <button className="btn-outline" onClick={() => setStep(1)}>Back</button>
                  <button className="btn-accent flex-1" onClick={handleVerifyAndJoin} disabled={loading || !normalizedPassword}>
                    {loading ? 'Verifying...' : 'Enter Instructions'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
