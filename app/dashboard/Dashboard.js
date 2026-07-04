'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { balancesForAccounts } from '../../lib/balances';

function formatMoney(n) {
  const rounded = Math.round(Number(n) * 100) / 100;
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

  if (loading) return <div className="tk-page"><p className="tk-muted">Loading dashboard…</p></div>;
  if (error) return <div className="tk-page"><div className="tk-alert-error">{error}</div></div>;

  const balances = balancesForAccounts(accounts, transactions);
  const operating = accounts.filter((a) => a.type === 'operating');
  const loans = accounts.filter((a) => a.type === 'loan');

  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalSpent = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

  const catName = (id) => categories.find((c) => c.id === id)?.name || 'Uncategorised';
  const byCategory = {};
  for (const e of expenses) {
    const name = catName(e.category_id);
    byCategory[name] = (byCategory[name] || 0) + Number(e.amount);
  }
  const categoryRows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const accName = (id) => accounts.find((a) => a.id === id)?.name || '—';
  const recent = [...transactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 12);

  const moneyStyle = { fontWeight: 700, fontSize: 16 };

  return (
    <div className="tk-page">
    <h1 className="tk-h1" style={{ fontFamily: 'var(--font-sora), system-ui, sans-serif', fontSize: 34, letterSpacing: '-0.03em' }}>Dashboard</h1>

      {isAdmin && (
        <div className="tk-card">
          <h2 className="tk-panel-title">Operating Accounts · Available</h2>
          {operating.map((a) => (
            <div key={a.id} className="tk-row">
              <span>{a.name}</span>
              <span className="tk-money" style={{ ...moneyStyle, color: 'var(--text)' }}>{formatMoney(balances.get(a.id) || 0)}</span>
            </div>
          ))}
          {operating.length === 0 && <p className="tk-muted">No operating accounts.</p>}
        </div>
      )}

      {isAdmin && (
        <div className="tk-card">
          <h2 className="tk-panel-title">Loan Accounts · Owed (incl. interest)</h2>
          {loans.map((a) => {
            const bal = balances.get(a.id) || 0;
            return (
              <div key={a.id} className="tk-row">
                <span>{a.name} <span className="tk-muted" style={{ fontSize: 13 }}>· {a.interest_rate}%/yr</span></span>
                <span className="tk-money" style={{ ...moneyStyle, color: bal < 0 ? 'var(--negative)' : 'var(--positive)' }}>{formatMoney(bal)}</span>
              </div>
            );
          })}
          {loans.length === 0 && <p className="tk-muted">No loan accounts.</p>}
        </div>
      )}

      <div className="tk-card">
        <h2 className="tk-panel-title">Total Spending</h2>
        <div className="tk-money" style={{ fontSize: 34, fontWeight: 800, color: 'var(--accent)' }}>{formatMoney(totalSpent)}</div>
        <div className="tk-muted" style={{ fontSize: 14, marginTop: 4 }}>{expenses.length} expense{expenses.length === 1 ? '' : 's'} recorded</div>
      </div>

      <div className="tk-card">
        <h2 className="tk-panel-title">Spending by Category</h2>
        {categoryRows.length === 0 ? (
          <p className="tk-muted">No expenses yet.</p>
        ) : (
          categoryRows.map(([name, amount]) => (
            <div key={name} className="tk-row">
              <span>{name}</span>
              <span className="tk-money" style={moneyStyle}>{formatMoney(amount)}</span>
            </div>
          ))
        )}
      </div>

      <div className="tk-card">
        <h2 className="tk-panel-title">Recent Transactions</h2>
        {recent.length === 0 ? (
          <p className="tk-muted">No transactions yet.</p>
        ) : (
          recent.map((t) => (
            <div key={t.id} className="tk-row" style={{ fontSize: 14 }}>
              <span>
                <span className="tk-muted">{t.occurred_on}</span>{' '}
                <strong style={{ textTransform: 'capitalize' }}>{t.type}</strong>{' '}
                {t.type === 'expense' ? accName(t.account_id) : `${accName(t.account_id)} → ${accName(t.to_account_id)}`}
                {t.notes ? <span className="tk-muted"> · {t.notes}</span> : null}
              </span>
              <span className="tk-money" style={moneyStyle}>{formatMoney(t.amount)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}