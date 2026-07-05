'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';

export function NavBar() {
  const { user, role } = useAuth();
  const pathname = usePathname();

  if (!user) return null;
  const isAdmin = role === 'admin';

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/transactions', label: 'Add' },
    { href: '/list', label: 'History' },
    ...(isAdmin ? [{ href: '/accounts', label: 'Accounts' }] : []),
    ...(isAdmin ? [{ href: '/categories', label: 'Categories' }] : []),
  ];

  return (
    <nav
      style={{
        display: 'flex',
        gap: 6,
        padding: '10px 12px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
      }}
    >
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              padding: '9px 16px',
              borderRadius: 9,
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              color: active ? '#06231b' : 'var(--text)',
              background: active ? 'var(--accent)' : 'transparent',
              border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}