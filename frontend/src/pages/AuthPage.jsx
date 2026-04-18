import React, { useState, useEffect } from 'react';

export default function AuthPage({ onLogin, apiBase }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Check URL params for verification success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setSuccessMsg('Email successfully verified! You can now sign in.');
      setIsLogin(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('verified') === 'already') {
      setSuccessMsg('Account is already verified. You can sign in.');
      setIsLogin(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const update = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const body = isLogin
      ? { email: form.email, password: form.password }
      : { name: form.name, email: form.email, password: form.password };

    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      if (data.status === 'verification_sent') {
        // Switch to login tab and show success message
        setSuccessMsg(data.message);
        setIsLogin(true);
        setForm({ name: '', email: '', password: '' });
      } else {
        // Normal login success
        onLogin({ ...data.user, token: data.token });
      }
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(prev => !prev);
    setError('');
    setSuccessMsg('');
    setForm({ name: '', email: '', password: '' });
  };

  return (
    <div className="auth-bg">
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 className="logo-text" style={{ fontSize: '2.6rem', lineHeight: 1 }}>
            SmartLaw
          </h1>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
            marginTop: '0.5rem',
            letterSpacing: '0.05em'
          }}>
            Privacy-First Legal Intelligence
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: '2.25rem' }}>

          {/* Tab Toggle */}
          <div className="tab-bar" style={{ marginBottom: '1.75rem' }}>
            <button
              className={`tab-btn ${isLogin ? 'active' : ''}`}
              onClick={() => isLogin || toggleMode()}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`tab-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => !isLogin || toggleMode()}
              type="button"
            >
              Create Account
            </button>
          </div>

          {/* Success Message */}
          {successMsg && (
            <div className="fade-up" style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: '#34D399',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              textAlign: 'center',
              marginBottom: '1.25rem'
            }}>
              ✅ {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Name field (register only) */}
            {!isLogin && (
              <div className="fade-up">
                <label style={labelStyle}>Full Name</label>
                <input
                  id="auth-name"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Vijay Sharma"
                  value={form.name}
                  onChange={update('name')}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                id="auth-email"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update('email')}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                id="auth-password"
                className="form-input"
                type="password"
                placeholder={isLogin ? '••••••••' : 'Min. 8 characters'}
                value={form.password}
                onChange={update('password')}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={errorStyle} className="fade-up">
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="auth-submit"
              className="btn-gold"
              type="submit"
              disabled={loading}
              style={{ padding: '0.85rem', fontSize: '0.9375rem', marginTop: '0.25rem' }}
            >
              {loading
                ? (isLogin ? 'Signing in…' : 'Creating account…')
                : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Privacy notice */}
          <div style={{
            marginTop: '1.5rem',
            padding: '0.75rem',
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            textAlign: 'center'
          }}>
            🔒 <strong style={{ color: '#6EE7B7' }}>Privacy-first.</strong>{' '}
            Sensitive details in your documents are redacted before reaching any AI.
            We only store your name and email.
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          SmartLaw — Your legal documents, explained simply.
        </p>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────
const labelStyle = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.4rem',
  letterSpacing: '0.01em',
};

const errorStyle = {
  background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.25)',
  borderRadius: 'var(--radius-sm)',
  color: '#FCA5A5',
  fontSize: '0.8125rem',
  padding: '0.65rem 0.875rem',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};
