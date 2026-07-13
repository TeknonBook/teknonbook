'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { balancesForAccounts, totalReceivables } from '../../lib/balances';

function formatMoney(n) {
  const rounded = Math.round(Number(n) * 100) / 100;
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export default function Dashboard() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(todayStr());

  useEffect(() => {
    async function load() {
      setLoading(true);
      const accRes = await supabase.from('accounts').select('*').eq('archived', false).order('id');
      const catRes = await supabase.from('categories').select('*');
      const cusRes = await supabase.from('customers').select('*').eq('archived', false);
      const txRes = await supabase.from('transactions').select('*');
      if (accRes.error || catRes.error || txRes.error) {
        setError((accRes.error || catRes.error || txRes.error).message);
      } else {
        setAccounts(accRes.data);
        setCategories(catRes.data);
        setCustomers(cusRes.data || []);
        setTransactions(txRes.data);
        setError(null);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="tk-page"><p className="tk-muted">Loading dashboard…</p></div>;
  if (error) return <div className="tk-page"><div className="tk-alert-error">{error}</div></div>;

  // ---------- CURRENT POSITION (always now) ----------
  const balances = balancesForAccounts(accounts, transactions);
  const operating = accounts.filter((a) => a.type === 'operating');
  const loans = accounts.filter((a) => a.type === 'loan');
  const activeOperating = operating.filter((a) => Math.abs(balances.get(a.id) || 0) > 0.001);
  const activeLoans = loans.filter((a) => Math.abs(balances.get(a.id) || 0) > 0.001);

  const cashAvailable = operating.reduce((s, a) => s + (balances.get(a.id) || 0), 0);
  const totalOwedLoans = loans.reduce((s, a) => s + (balances.get(a.id) || 0), 0); // negative
  const owedToYou = totalReceivables(customers, transactions);

  // ---------- PERFORMANCE (date filtered) ----------
  const inRange = transactions.filter((t) => t.occurred_on >= fromDate && t.occurred_on <= toDate);

  const periodExpenses = inRange.filter((t) => t.type === 'expense');
  // Cash basis: income = paid sales + customer payments received
  const periodIncome = inRange.filter((t) => t.type === 'income' || t.type === 'customer_payment');

  const totalExpense = periodExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome = periodIncome.reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = totalIncome - totalExpense;

  const catName = (id) => categories.find((c) => c.id === id)?.name || 'Uncategorised';
  const accName = (id) => accounts.find((a) => a.id === id)?.name || '—';

  const expenseByCat = {};
  for (const e of periodExpenses) {
    const key = e.category_id || 'none';
    const n = catName(e.category_id);
    if (!expenseByCat[key]) expenseByCat[key] = { id: e.category_id, name: n, amount: 0 };
    expenseByCat[key].amount += Number(e.amount);
  }
  const expenseCatRows = Object.values(expenseByCat).sort((a, b) => b.amount - a.amount);

  const incomeByCat = {};
  for (const i of periodIncome) {
    const key = i.category_id || 'payment';
    const n = i.category_id ? catName(i.category_id) : 'Customer payment';
    if (!incomeByCat[key]) incomeByCat[key] = { id: i.category_id, name: n, amount: 0 };
    incomeByCat[key].amount += Number(i.amount);
  }
  const incomeCatRows = Object.values(incomeByCat).sort((a, b) => b.amount - a.amount);

  const recent = [...transactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  const typeLabel = {
    expense: 'Expense', income: 'Income', credit_sale: 'Credit sale',
    customer_payment: 'Payment', transfer: 'Transfer', repayment: 'Repayment',
  };

  const statBox = (label, value, color, href) => {
    const inner = (
      <>
        <div className="tk-panel-title" style={{ marginBottom: 6 }}>{label}{href ? ' →' : ''}</div>
        <div className="tk-money" style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      </>
    );
    if (href) {
      return (
        <a href={href} style={{ flex: 1, minWidth: 150, textDecoration: 'none', color: 'var(--text)' }}>
          {inner}
        </a>
      );
    }
    return <div style={{ flex: 1, minWidth: 150 }}>{inner}</div>;
  };

  return (
    <div className="tk-page">
      <h1 className="tk-h1" style={{ fontFamily: 'var(--font-sora), system-ui, sans-serif', fontSize: 34, letterSpacing: '-0.03em' }}>Dashboard</h1>

      {/* ===== CURRENT POSITION ===== */}
      {isAdmin && (
        <div className="tk-card">
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {statBox('Cash available', formatMoney(cashAvailable), 'var(--accent)')}
            {statBox('Loans owed', formatMoney(totalOwedLoans), totalOwedLoans < -0.001 ? 'var(--negative)' : 'var(--accent)')}
            {statBox('Owed to you', formatMoney(owedToYou), owedToYou > 0.001 ? 'var(--negative)' : 'var(--text-muted)', '/customers')}
          </div>
        </div>
      )}

      {/* Account detail */}
      {isAdmin && (
        <div className="tk-card">
          <h2 className="tk-panel-title">Accounts</h2>
          {activeOperating.map((a) => (
            <div key={a.id} className="tk-row">
              <span>{a.name}</span>
              <span className="tk-money" style={{ fontWeight: 700 }}>{formatMoney(balances.get(a.id) || 0)}</span>
            </div>
          ))}
          {activeLoans.map((a) => {
            const bal = balances.get(a.id) || 0;
            return (
              <div key={a.id} className="tk-row">
                <span>{a.name} <span className="tk-muted" style={{ fontSize: 13 }}>· {a.interest_rate}%/yr</span></span>
                <span className="tk-money" style={{ fontWeight: 700, color: bal < -0.001 ? 'var(--negative)' : 'var(--accent)' }}>{formatMoney(bal)}</span>
              </div>
            );
          })}
          {activeOperating.length === 0 && activeLoans.length === 0 && (
            <p className="tk-muted" style={{ margin: 0 }}>All accounts are at zero.</p>
          )}
        </div>
      )}

      {/* ===== PERFORMANCE (date filtered) ===== */}
      <div className="tk-card">
        <h2 className="tk-panel-title">Performance</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label className="tk-label">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="tk-input" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label className="tk-label">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="tk-input" style={{ marginBottom: 0 }} />
          </div>
        </div>

        <div className="tk-row">
          <span>Income received</span>
          <span className="tk-money" style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatMoney(totalIncome)}</span>
        </div>
        <div className="tk-row">
          <span>Expenses</span>
          <span className="tk-money" style={{ fontWeight: 700, color: 'var(--negative)' }}>{formatMoney(totalExpense)}</span>
        </div>
        <div className="tk-row" style={{ borderBottom: 'none', paddingTop: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>{netProfit >= 0 ? 'Profit' : 'Loss'}</span>
          <span className="tk-money" style={{ fontWeight: 800, fontSize: 24, color: netProfit >= 0 ? 'var(--accent)' : 'var(--negative)' }}>
            {formatMoney(netProfit)}
          </span>
        </div>
        <p className="tk-muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
          Cash basis: income counts when money is received. Credit sales appear as income only once paid.
        </p>
      </div>

      {/* Income by category */}
      <div className="tk-card">
        <h2 className="tk-panel-title">Income by Category</h2>
        {incomeCatRows.length === 0 ? (
          <p className="tk-muted" style={{ margin: 0 }}>No income in this period.</p>
        ) : incomeCatRows.map((row) => (
          row.id ? (
            <a key={row.id} href={`/category/${row.id}?from=${fromDate}&to=${toDate}`} className="tk-row" style={{ textDecoration: 'none', color: 'var(--text)' }}>
              <span>{row.name} <span className="tk-muted">→</span></span>
              <span className="tk-money" style={{ fontWeight: 700 }}>{formatMoney(row.amount)}</span>
            </a>
          ) : (
            <div key="payment" className="tk-row">
              <span>{row.name}</span>
              <span className="tk-money" style={{ fontWeight: 700 }}>{formatMoney(row.amount)}</span>
            </div>
          )
        ))}
      </div>

      {/* Spending by category */}
      <div className="tk-card">
        <h2 className="tk-panel-title">Spending by Category</h2>
        {expenseCatRows.length === 0 ? (
          <p className="tk-muted" style={{ margin: 0 }}>No expenses in this period.</p>
        ) : expenseCatRows.map((row) => (
          row.id ? (
            <a key={row.id} href={`/category/${row.id}?from=${fromDate}&to=${toDate}`} className="tk-row" style={{ textDecoration: 'none', color: 'var(--text)' }}>
              <span>{row.name} <span className="tk-muted">→</span></span>
              <span className="tk-money" style={{ fontWeight: 700 }}>{formatMoney(row.amount)}</span>
            </a>
          ) : (
            <div key="none" className="tk-row">
              <span>{row.name}</span>
              <span className="tk-money" style={{ fontWeight: 700 }}>{formatMoney(row.amount)}</span>
            </div>
          )
        ))}
      </div>

      {/* Recent */}
      <div className="tk-card">
        <h2 className="tk-panel-title">Recent Transactions</h2>
        {recent.length === 0 ? (
          <p className="tk-muted" style={{ margin: 0 }}>No transactions yet.</p>
        ) : recent.map((t) => (
          <a key={t.id} href={`/list/edit/${t.id}`} className="tk-row" style={{ fontSize: 14, textDecoration: 'none', color: 'var(--text)' }}>
            <span>
              <span className="tk-muted">{t.occurred_on}</span>{' '}
              <strong>{typeLabel[t.type] || t.type}</strong>{' '}
              {t.account_id ? accName(t.account_id) : ''}
              {t.notes ? <span className="tk-muted"> · {t.notes}</span> : null}
            </span>
            <span className="tk-money" style={{ fontWeight: 700 }}>{formatMoney(t.amount)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}