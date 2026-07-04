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
        padding: '8px 16px',
        background: '#f0f4ff',
        fontSize: 14,
        fontFamily: 'system-ui, sans-serif',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span style={{ color: '#333' }}>
          {user.email} — <strong style={{ color: role === 'admin' ? '#0070f3' : '#666' }}>{role || 'no role'}</strong>
        </span>
        <button
          onClick={signOut}
          style={{ padding: '6px 14px', fontSize: 13, borderRadius: 6, border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>
      {children}
    </>
  );
}