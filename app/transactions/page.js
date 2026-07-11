'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { checkOverdraft } from '../../lib/balances';

function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export default function TransactionsPage() {
  const { user, role } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState('expense');
  const [date, setDate] = useState(todayStr());
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  async function loadData() {
    setLoading(true);
    const accRes = await supabase.from('accounts').select('*').eq('archived', false).order('id');
    const catRes = await supabase.from('categories').select('*').eq('archived', false).order('name');
    const txRes = await supabase.from('transactions').select('*');
    const cusRes = await supabase.from('customers').select('*').eq('archived', false).order('name');
    if (accRes.error) setError(accRes.error.message);
    else if (catRes.error) setError(catRes.error.message);
    else if (txRes.error) setError(txRes.error.message);
    else {
      setAccounts(accRes.data);
      setCategories(catRes.data);
      setAllTransactions(txRes.data);
      setCustomers(cusRes.data || []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const loanAccounts = accounts.filter((a) => a.type === 'loan');
  const operatingAccounts = accounts.filter((a) => a.type === 'operating');
  const expenseCategories = categories.filter((c) => (c.kind || 'expense') === 'expense');
  const incomeCategories = categories.filter((c) => c.kind === 'income');

  function resetForm() {
    setAmount('');
    setDescription('');
    setCategoryId('');
    setAccountId('');
    setToAccountId('');
    setCustomerId('');
    setDate(todayStr());
  }

  async function saveTransaction() {
    setError(null);
    setSuccess(null);

    if (!date) return setError('Please choose a date.');
    if (!amount || Number(amount) <= 0) return setError('Please enter an amount greater than zero.');
    if (type !== 'credit_sale' && !accountId) return setError('Please choose the account.');
    if (type === 'expense' && !categoryId) return setError('Please choose a category.');
    if (type === 'income' && !categoryId) return setError('Please choose an income category.');
    if (type === 'income' && !accountId) return setError('Please choose which account receives the money.');
    if (type === 'credit_sale' && !customerId) return setError('Please choose the customer.');
    if (type === 'credit_sale' && !categoryId) return setError('Please choose an income category.');
    if (type === 'customer_payment' && !customerId) return setError('Please choose the customer.');
    if (type === 'customer_payment' && !accountId) return setError('Please choose which account receives the payment.');
    if ((type === 'transfer' || type === 'repayment') && !toAccountId) return setError('Please choose the destination account.');
    if ((type === 'transfer' || type === 'repayment') && accountId === toAccountId) return setError('The two accounts must be different.');

    setSaving(true);
    const row = {
      occurred_on: date,
      type,
      amount: Number(amount),
      account_id: accountId ? Number(accountId) : null,
      to_account_id: (type === 'transfer' || type === 'repayment') ? Number(toAccountId) : null,
      category_id: (type === 'expense' || type === 'income' || type === 'credit_sale') ? (categoryId ? Number(categoryId) : null) : null,
      notes: description.trim() || null,
     customer_id: ['income', 'credit_sale', 'customer_payment'].includes(type) ? (customerId ? Number(customerId) : null) : null,
      created_by: user?.id ?? null,
    };

    const guard = checkOverdraft(row, accounts, allTransactions);
    if (!guard.ok) {
      setSaving(false);
      setError(guard.message);
      return;
    }

    const { error } = await supabase.from('transactions').insert(row);
    setSaving(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Transaction saved.');
      resetForm();
      const txRes = await supabase.from('transactions').select('*');
      if (!txRes.error) setAllTransactions(txRes.data);
    }
  }

  const typeButton = (value, label) => (
    <button
      onClick={() => { setType(value); setError(null); setSuccess(null); }}
      style={{
        flex: 1,
        padding: '12px 0',
        fontSize: 15,
        fontWeight: 600,
        borderRadius: 10,
        cursor: 'pointer',
        border: '1px solid ' + (type === value ? 'var(--accent)' : 'var(--border)'),
        background: type === value ? 'var(--accent)' : 'transparent',
        color: type === value ? '#06231b' : 'var(--text)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="tk-page" style={{ maxWidth: 560 }}>
      <h1 className="tk-h1">Add Transaction</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {typeButton('expense', 'Expense')}
        {typeButton('income', 'Income')}
        {typeButton('credit_sale', 'Credit Sale')}
        {typeButton('customer_payment', 'Payment')}
        {role === 'admin' && typeButton('transfer', 'Transfer')}
        {role === 'admin' && typeButton('repayment', 'Repayment')}
      </div>

      {error && <div className="tk-alert-error">{error}</div>}
      {success && <div className="tk-alert-success">{success}</div>}

      {loading ? (
        <p className="tk-muted">Loading…</p>
      ) : (
        <>
          <label className="tk-label">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="tk-input" />

          {type === 'expense' && (
            <>
              <label className="tk-label">Account (drawn from)</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="tk-select">
                <option value="">— choose account —</option>
                {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name} ({a.type})</option>))}
              </select>

              <label className="tk-label">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="tk-select">
                <option value="">— choose category —</option>
                {expenseCategories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </>
          )}

          {type === 'income' && (
            <>
              <label className="tk-label">Received into (operating account)</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="tk-select">
                <option value="">— choose account —</option>
                {operatingAccounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>

              <label className="tk-label">Income category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="tk-select">
                <option value="">— choose category —</option>
                {incomeCategories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>

              <label className="tk-label">Customer (optional)</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="tk-select">
                <option value="">— no customer / walk-in —</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </>
          )}
          {type === 'credit_sale' && (
            <>
              <label className="tk-label">Customer</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="tk-select">
                <option value="">— choose customer —</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>

              <label className="tk-label">Income category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="tk-select">
                <option value="">— choose category —</option>
                {incomeCategories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <p className="tk-muted" style={{ fontSize: 13, marginTop: -8 }}>
                Records that this customer owes you. No cash received yet.
              </p>
            </>
          )}

          {type === 'customer_payment' && (
            <>
              <label className="tk-label">Customer</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="tk-select">
                <option value="">— choose customer —</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>

              <label className="tk-label">Received into (operating account)</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="tk-select">
                <option value="">— choose account —</option>
                {operatingAccounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
              <p className="tk-muted" style={{ fontSize: 13, marginTop: -8 }}>
                Records money received from a customer, reducing what they owe.
              </p>
            </>
          )}

          {type === 'transfer' && (
            <>
              <label className="tk-label">From account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="tk-select">
                <option value="">— choose account —</option>
                {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name} ({a.type})</option>))}
              </select>

              <label className="tk-label">To account</label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="tk-select">
                <option value="">— choose account —</option>
                {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name} ({a.type})</option>))}
              </select>
            </>
          )}

          {type === 'repayment' && (
            <>
              <label className="tk-label">From (operating account)</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="tk-select">
                <option value="">— choose account —</option>
                {operatingAccounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>

              <label className="tk-label">To (loan account)</label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="tk-select">
                <option value="">— choose account —</option>
                {loanAccounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
            </>
          )}

          <label className="tk-label">Amount</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="tk-input tk-money" />

          <label className="tk-label">Description {type === 'expense' ? '(optional)' : ''}</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" className="tk-input" />

          <button onClick={saveTransaction} disabled={saving} className="tk-btn tk-btn-full">
            {saving ? 'Saving…' : 'Save transaction'}
          </button>
        </>
      )}
    </div>
  );
}