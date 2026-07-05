'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import { checkOverdraft } from '../../../../lib/balances';

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const txId = Number(params.id);
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState('expense');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const accRes = await supabase.from('accounts').select('*').eq('archived', false).order('id');
      const catRes = await supabase.from('categories').select('*').eq('archived', false).order('name');
      const txRes = await supabase.from('transactions').select('*');
      const oneRes = await supabase.from('transactions').select('*').eq('id', txId).single();

      if (accRes.error || catRes.error || txRes.error || oneRes.error) {
        setError((accRes.error || catRes.error || txRes.error || oneRes.error).message);
        setLoading(false);
        return;
      }

      setAccounts(accRes.data);
      setCategories(catRes.data);
      setAllTransactions(txRes.data);

      const t = oneRes.data;
      setOriginal(t);
      setType(t.type);
      setDate(t.occurred_on);
      setAccountId(String(t.account_id));
      setToAccountId(t.to_account_id ? String(t.to_account_id) : '');
      setCategoryId(t.category_id ? String(t.category_id) : '');
      setAmount(String(t.amount));
      setDescription(t.notes || '');
      setLoading(false);
    }
    load();
  }, [txId]);

  const loanAccounts = accounts.filter((a) => a.type === 'loan');
  const operatingAccounts = accounts.filter((a) => a.type === 'operating');

  const canModify = original && (isAdmin || original.created_by === user?.id);

  async function save() {
    setError(null);
    setSuccess(null);

    if (!date) return setError('Please choose a date.');
    if (!amount || Number(amount) <= 0) return setError('Please enter an amount greater than zero.');
    if (!accountId) return setError('Please choose the account.');
    if (type === 'expense' && !categoryId) return setError('Please choose a category.');
    if ((type === 'transfer' || type === 'repayment') && !toAccountId) return setError('Please choose the destination account.');
    if ((type === 'transfer' || type === 'repayment') && accountId === toAccountId) return setError('The two accounts must be different.');

    setSaving(true);
    const updated = {
      id: txId,
      occurred_on: date,
      type,
      amount: Number(amount),
      account_id: Number(accountId),
      to_account_id: (type === 'transfer' || type === 'repayment') ? Number(toAccountId) : null,
      category_id: type === 'expense' ? Number(categoryId) : null,
      notes: description.trim() || null,
    };

    // Overdraft check, excluding this transaction's old version
    const guard = checkOverdraft(updated, accounts, allTransactions, txId);
    if (!guard.ok) {
      setSaving(false);
      setError(guard.message);
      return;
    }

    const { error } = await supabase.from('transactions').update({
      occurred_on: updated.occurred_on,
      type: updated.type,
      amount: updated.amount,
      account_id: updated.account_id,
      to_account_id: updated.to_account_id,
      category_id: updated.category_id,
      notes: updated.notes,
    }).eq('id', txId);

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Saved. Returning to history…');
      setTimeout(() => router.push('/list'), 700);
    }
  }

  const typeButton = (value, label) => (
    <button
      onClick={() => { setType(value); setError(null); }}
      disabled={!isAdmin && value !== 'expense'}
      style={{
        flex: 1,
        padding: '12px 0',
        fontSize: 15,
        fontWeight: 600,
        borderRadius: 10,
        cursor: (!isAdmin && value !== 'expense') ? 'not-allowed' : 'pointer',
        opacity: (!isAdmin && value !== 'expense') ? 0.4 : 1,
        border: '1px solid ' + (type === value ? 'var(--accent)' : 'var(--border)'),
        background: type === value ? 'var(--accent)' : 'transparent',
        color: type === value ? '#06231b' : 'var(--text)',
      }}
    >
      {label}
    </button>
  );

  if (loading) return <div className="tk-page"><p className="tk-muted">Loading…</p></div>;

  if (!canModify) {
    return (
      <div className="tk-page" style={{ maxWidth: 560 }}>
        <h1 className="tk-h1">Edit Transaction</h1>
        <div className="tk-alert-error">You can only edit transactions you created.</div>
        <a href="/list" className="tk-btn tk-btn-ghost" style={{ textDecoration: 'none' }}>Back to history</a>
      </div>
    );
  }

  return (
    <div className="tk-page" style={{ maxWidth: 560 }}>
      <h1 className="tk-h1">Edit Transaction</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {typeButton('expense', 'Expense')}
        {typeButton('transfer', 'Transfer')}
        {typeButton('repayment', 'Repayment')}
      </div>

      {error && <div className="tk-alert-error">{error}</div>}
      {success && <div className="tk-alert-success">{success}</div>}

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
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
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
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="tk-input tk-money" />

      <label className="tk-label">Description</label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} className="tk-input" />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving} className="tk-btn tk-btn-full">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <a href="/list" className="tk-btn tk-btn-ghost" style={{ padding: 16, textDecoration: 'none', whiteSpace: 'nowrap' }}>Cancel</a>
      </div>
    </div>
  );
}