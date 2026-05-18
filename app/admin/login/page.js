'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { clearAdminSession, hasValidAdminToken } from '../../../lib/adminSession';

export default function AdminLoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', captchaVerified: false });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasValidAdminToken()) {
      router.replace('/admin/dashboard');
      return;
    }
    clearAdminSession({ forceRedirect: false });
  }, [router]);

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
        <section className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="card order-1 fade-rise lg:order-2">
            <h2 className="section-title text-xl">{stage === 'login' ? 'Admin Login' : 'OTP Verification'}</h2>
            <p className="mt-1 text-compact text-slate-500">
              {stage === 'login' ? 'Enter credentials and request OTP.' : 'Enter the OTP sent to your email.'}
            </p>

            {stage === 'login' && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="label">Username</label>
                  <input className="input" value={form.username} onChange={handleChange('username')} />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input className="input" type="password" value={form.password} onChange={handleChange('password')} />
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-[rgba(29,114,255,0.12)] bg-[rgba(29,114,255,0.05)] px-3 py-2 text-xs text-slate-600">
                  <input type="checkbox" checked={form.captchaVerified} onChange={handleChange('captchaVerified')} />
                  CAPTCHA placeholder confirmed
                </label>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button className="btn-primary w-full" onClick={handleLogin} disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Continue'}
                </button>
              </div>
            )}

            {stage === 'otp' && (
              <div className="mt-4 space-y-3">
                <div className="glass-banner">
                  <p className="text-xs text-slate-600">OTP sent for <span className="font-semibold text-slate-900">{form.username}</span>.</p>
                </div>
                <div>
                  <label className="label">One-Time Password</label>
                  <input className="input" value={otp} onChange={(event) => setOtp(event.target.value)} />
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button className="btn-accent w-full" onClick={handleVerifyOtp} disabled={loading}>
                  {loading ? 'Verifying...' : 'Unlock Dashboard'}
                </button>
              </div>
            )}
          </div>

          <div className="card-strong order-2 fade-rise lg:order-1">
            <div className="space-y-4">
              <div className="badge-orange">Admin Access</div>
              <h1 className="hero-title text-2xl md:text-4xl">Sign in fast.</h1>
              <p className="hero-subtitle">
                Password, CAPTCHA confirmation, and OTP keep access locked without making the screen tall.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="stat-card">
                  <p className="section-kicker">Secure Layer 1</p>
                  <p className="mt-2 text-sm font-semibold">Stored admin identity and password hash validation.</p>
                </div>
                <div className="stat-card">
                  <p className="section-kicker">Secure Layer 2</p>
                  <p className="mt-2 text-sm font-semibold">Email OTP before the dashboard opens.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
