'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthContext';

export function AuthGate({ children }) {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [loading, user, pathname, router]);

  // While checking session
  if (loading) {
    return <p style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>Loading…</p>;
  }

  // On the login page, don't show the gate bar — just render the login form
  if (pathname === '/login') {
    return children;
  }

  // Not logged in and being redirected
  if (!user) {
    return <p style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>Redirecting to sign in…</p>;
  }

  // Logged in: show a small status bar with sign-out, then the app
  return (
    <>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        fontSize: 13,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span className="tk-muted">
          {user.email} · <strong style={{ color: role === 'admin' ? 'var(--accent)' : 'var(--text-muted)' }}>{role || 'no role'}</strong>
        </span>
        <button onClick={signOut} className="tk-btn tk-btn-ghost" style={{ padding: '7px 14px', fontSize: 13 }}>
          Sign out
        </button>
      </div>
      {children}
    </>
  );
}