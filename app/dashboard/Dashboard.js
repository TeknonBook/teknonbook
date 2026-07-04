'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { balancesForAccounts } from '../../lib/balances';

function formatMoney(n) {
  const rounded = Math.round(Number(n) * 100) / 100;
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const panelStyle = {
  border: '1px solid #e2e2e2',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
  background: 'white',
};
const panelTitle = { fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 14, color: '#333' };
const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 15 };

export default function Dashboard() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const accRes = await supabase.from('accounts').select('*').eq('archived', false).order('id');
      const catRes = await supabase.from('categories').select('*');
      const txRes = await supabase.from('transactions').select('*');
      if (accRes.error || catRes.error || txRes.error) {
        setError((accRes.error || catRes.error || txRes.error).message);
      } else {
        setAccounts(accRes.data);
        setCategories(catRes.data);
        setTransactions(txRes.data);
        setError(null);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>Loading dashboard…</p>;
  if (error) return <p style={{ padding: 24, color: '#b71c1c', fontFamily: 'system-ui, sans-serif' }}>{error}</p>;

  const balances = balancesForAccounts(accounts, transactions);
  const operating = accounts.filter((a) => a.type === 'operating');
  const loans = accounts.filter((a) => a.type === 'loan');

  // Spending summary (expenses only)
  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalSpent = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

  // Spending by category
  const catName = (id) => categories.find((c) => c.id === id)?.name || 'Uncategorised';
  const byCategory = {};
  for (const e of expenses) {
    const name = catName(e.category_id);
    byCategory[name] = (byCategory[name] || 0) + Number(e.amount);
  }
  const categoryRows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  // Recent transactions
  const accName = (id) => accounts.find((a) => a.id === id)?.name || '—';
  const recent = [...transactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 12);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Dashboard</h1>

      {/* PANEL 1 — Operating balances (admin only) */}
      {isAdmin && (
        <div style={panelStyle}>
          <h2 style={panelTitle}>Operating Accounts — Available Balance</h2>
          {operating.map((a) => (
            <div key={a.id} style={rowStyle}>
              <span>{a.name}</span>
              <strong>{formatMoney(balances.get(a.id) || 0)}</strong>
            </div>
          ))}
          {operating.length === 0 && <p style={{ color: '#888' }}>No operating accounts.</p>}
        </div>
      )}

      {/* PANEL 2 — Loan balances (admin only) */}
      {isAdmin && (
        <div style={panelStyle}>
          <h2 style={panelTitle}>Loan Accounts — Balance Owed (incl. interest)</h2>
          {loans.map((a) => {
            const bal = balances.get(a.id) || 0;
            return (
              <div key={a.id} style={rowStyle}>
                <span>{a.name} <span style={{ color: '#999', fontSize: 13 }}>({a.interest_rate}%/yr)</span></span>
                <strong style={{ color: bal < 0 ? '#b71c1c' : '#1b5e20' }}>{formatMoney(bal)}</strong>
              </div>
            );
          })}
          {loans.length === 0 && <p style={{ color: '#888' }}>No loan accounts.</p>}
        </div>
      )}

      {/* PANEL 3 — Total spending (everyone) */}
      <div style={panelStyle}>
        <h2 style={panelTitle}>Total Spending</h2>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#0070f3' }}>{formatMoney(totalSpent)}</div>
        <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{expenses.length} expense{expenses.length === 1 ? '' : 's'} recorded</div>
      </div>

      {/* PANEL 4 — Spending by category (everyone) */}
      <div style={panelStyle}>
        <h2 style={panelTitle}>Spending by Category</h2>
        {categoryRows.length === 0 ? (
          <p style={{ color: '#888' }}>No expenses yet.</p>
        ) : (
          categoryRows.map(([name, amount]) => (
            <div key={name} style={rowStyle}>
              <span>{name}</span>
              <strong>{formatMoney(amount)}</strong>
            </div>
          ))
        )}
      </div>

      {/* PANEL 5 — Recent transactions (everyone) */}
      <div style={panelStyle}>
        <h2 style={panelTitle}>Recent Transactions</h2>
        {recent.length === 0 ? (
          <p style={{ color: '#888' }}>No transactions yet.</p>
        ) : (
          recent.map((t) => (
            <div key={t.id} style={{ ...rowStyle, fontSize: 14 }}>
              <span>
                <span style={{ color: '#999' }}>{t.occurred_on}</span>{' '}
                <strong style={{ textTransform: 'capitalize' }}>{t.type}</strong>{' '}
                {t.type === 'expense' ? accName(t.account_id) : `${accName(t.account_id)} → ${accName(t.to_account_id)}`}
                {t.notes ? <span style={{ color: '#666' }}> · {t.notes}</span> : null}
              </span>
              <strong>{formatMoney(t.amount)}</strong>
            </div>
          ))
        )}
      </div>
    </div>
  );
}