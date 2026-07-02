'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
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
    if (accRes.error) setError(accRes.error.message);
    else if (catRes.error) setError(catRes.error.message);
    else {
      setAccounts(accRes.data);
      setCategories(catRes.data);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const loanAccounts = accounts.filter((a) => a.type === 'loan');
  const operatingAccounts = accounts.filter((a) => a.type === 'operating');

  function resetForm() {
    setAmount('');
    setDescription('');
    setCategoryId('');
    setAccountId('');
    setToAccountId('');
    setDate(todayStr());
  }

  async function saveTransaction() {
    setError(null);
    setSuccess(null);

    if (!date) return setError('Please choose a date.');
    if (!amount || Number(amount) <= 0) return setError('Please enter an amount greater than zero.');
    if (!accountId) return setError('Please choose the account.');
    if (type === 'expense' && !categoryId) return setError('Please choose a category.');
    if ((type === 'transfer' || type === 'repayment') && !toAccountId) return setError('Please choose the destination account.');
    if ((type === 'transfer' || type === 'repayment') && accountId === toAccountId) return setError('The two accounts must be different.');

    setSaving(true);
    const row = {
      occurred_on: date,
      type,
      amount: Number(amount),
      account_id: Number(accountId),
      to_account_id: (type === 'transfer' || type === 'repayment') ? Number(toAccountId) : null,
      category_id: type === 'expense' ? Number(categoryId) : null,
      notes: description.trim() || null,
    };
    const { error } = await supabase.from('transactions').insert(row);
    setSaving(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Transaction saved.');
      resetForm();
    }
  }

  const labelStyle = { fontSize: 13, color: '#555', display: 'block', marginBottom: 4 };
  const fieldStyle = { width: '100%', padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #ccc', marginBottom: 16, boxSizing: 'border-box' };

  const typeButton = (value, label) => (
    <button
      onClick={() => { setType(value); setError(null); setSuccess(null); }}
      style={{
        flex: 1,
        padding: '12px 0',
        fontSize: 15,
        fontWeight: 600,
        border: '1px solid ' + (type === value ? '#0070f3' : '#ccc'),
        background: type === value ? '#0070f3' : 'white',
        color: type === value ? 'white' : '#333',
        borderRadius: 8,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Add Transaction</h1>
      <p style={{ color: '#666', marginTop: 0, marginBottom: 20 }}>
        Record an expense, transfer, or loan repayment.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {typeButton('expense', 'Expense')}
        {typeButton('transfer', 'Transfer')}
        {typeButton('repayment', 'Repayment')}
      </div>

      {error && (
        <div style={{ background: '#fdecea', color: '#b71c1c', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>
      )}
      {success && (
        <div style={{ background: '#e7f6e7', color: '#1b5e20', padding: 12, borderRadius: 8, marginBottom: 16 }}>{success}</div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <label style={labelStyle}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />

          {/* EXPENSE fields */}
          {type === 'expense' && (
            <>
              <label style={labelStyle}>Account (drawn from)</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={fieldStyle}>
                <option value="">— choose account —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                ))}
              </select>

              <label style={labelStyle}>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={fieldStyle}>
                <option value="">— choose category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </>
          )}

          {/* TRANSFER fields */}
          {type === 'transfer' && (
            <>
              <label style={labelStyle}>From account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={fieldStyle}>
                <option value="">— choose account —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                ))}
              </select>

              <label style={labelStyle}>To account</label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} style={fieldStyle}>
                <option value="">— choose account —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                ))}
              </select>
            </>
          )}

          {/* REPAYMENT fields */}
          {type === 'repayment' && (
            <>
              <label style={labelStyle}>From (operating account)</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={fieldStyle}>
                <option value="">— choose account —</option>
                {operatingAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              <label style={labelStyle}>To (loan account)</label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} style={fieldStyle}>
                <option value="">— choose account —</option>
                {loanAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </>
          )}

          <label style={labelStyle}>Amount</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={fieldStyle} />

          <label style={labelStyle}>Description {type === 'expense' ? '(optional)' : ''}</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" style={fieldStyle} />

          <button
            onClick={saveTransaction}
            disabled={saving}
            style={{
              width: '100%',
              padding: 16,
              fontSize: 17,
              fontWeight: 600,
              border: 'none',
              borderRadius: 8,
              background: saving ? '#9bc4f5' : '#0070f3',
              color: 'white',
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save transaction'}
          </button>
        </>
      )}
    </div>
  );
}