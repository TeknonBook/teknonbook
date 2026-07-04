'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }
  }

  const fieldStyle = {
    width: '100%',
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    border: '1px solid #ccc',
    marginBottom: 16,
    boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Sign in to TeknonBook</h1>
      <p style={{ color: '#666', marginTop: 0, marginBottom: 24 }}>
        Enter your email and password.
      </p>

      {error && (
        <div style={{ background: '#fdecea', color: '#b71c1c', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={fieldStyle}
        autoComplete="email"
      />

      <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
        style={fieldStyle}
        autoComplete="current-password"
      />

      <button
        onClick={handleLogin}
        disabled={busy}
        style={{
          width: '100%',
          padding: 14,
          fontSize: 16,
          fontWeight: 600,
          border: 'none',
          borderRadius: 8,
          background: busy ? '#9bc4f5' : '#0070f3',
          color: 'white',
          cursor: busy ? 'default' : 'pointer',
        }}
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </div>
  );
}