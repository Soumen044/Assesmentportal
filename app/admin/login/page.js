'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', captchaVerified: false });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (event) => {
    const value = field === 'captchaVerified' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/login', form);
      setStage('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp', { username: form.username, otp });
      localStorage.setItem('adminToken', res.data.token);
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell surface-grid">
      <div className="page-wrap">
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="card-strong fade-rise">
            <div className="space-y-5">
              <div className="badge-orange">Admin Access</div>
              <h1 className="hero-title text-3xl md:text-5xl">Sign in to the command deck.</h1>
              <p className="hero-subtitle">
                Your admin flow uses password validation, CAPTCHA confirmation, and OTP before the dashboard unlocks.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="stat-card">
                  <p className="section-kicker">Secure Layer 1</p>
                  <p className="mt-2 font-semibold">Firestore-backed admin identity with bcrypt password hashes.</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Secure Layer 2</p>
                  <p className="mt-2 font-semibold">Email OTP confirmation before JWT session issuance.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card fade-rise">
            <h2 className="section-title text-2xl">{stage === 'login' ? 'Admin Login' : 'OTP Verification'}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {stage === 'login' ? 'Enter your credentials to request a one-time passcode.' : 'Enter the OTP sent to your email.'}
            </p>

            {stage === 'login' && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="label">Username</label>
                  <input className="input" value={form.username} onChange={handleChange('username')} />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input className="input" type="password" value={form.password} onChange={handleChange('password')} />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-[rgba(29,114,255,0.12)] bg-[rgba(29,114,255,0.05)] px-4 py-3 text-sm text-slate-600">
                  <input type="checkbox" checked={form.captchaVerified} onChange={handleChange('captchaVerified')} />
                  CAPTCHA placeholder confirmed
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button className="btn-primary w-full" onClick={handleLogin} disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Continue'}
                </button>
              </div>
            )}

            {stage === 'otp' && (
              <div className="mt-6 space-y-4">
                <div className="glass-banner">
                  <p className="text-sm text-slate-600">OTP sent for <span className="font-semibold text-slate-900">{form.username}</span>.</p>
                </div>
                <div>
                  <label className="label">One-Time Password</label>
                  <input className="input" value={otp} onChange={(event) => setOtp(event.target.value)} />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button className="btn-accent w-full" onClick={handleVerifyOtp} disabled={loading}>
                  {loading ? 'Verifying...' : 'Unlock Dashboard'}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
