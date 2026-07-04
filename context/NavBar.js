'use client';

import Link from 'next/link';
import { useAuth } from './AuthContext';

const navLinkStyle = {
  padding: '8px 14px',
  borderRadius: 6,
  textDecoration: 'none',
  color: '#0070f3',
  fontSize: 16,
  fontWeight: 500,
  border: '1px solid #d0d0d0',
  background: 'white',
};

export function NavBar() {
  const { user, role } = useAuth();

  // No menu on the login screen / when signed out
  if (!user) return null;

  const isAdmin = role === 'admin';

  return (
    <nav
      style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        borderBottom: '1px solid #e5e5e5',
        background: '#fafafa',
        flexWrap: 'wrap',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <Link href="/" style={navLinkStyle}>Home</Link>
      <Link href="/transactions" style={navLinkStyle}>Add Transaction</Link>
      {isAdmin && <Link href="/accounts" style={navLinkStyle}>Accounts</Link>}
      {isAdmin && <Link href="/categories" style={navLinkStyle}>Categories</Link>}
    </nav>
  );
}