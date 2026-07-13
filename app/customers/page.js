'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { customerBalance, totalReceivables } from '../../lib/balances';

export default function CustomersPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', notes: '' });

  async function load() {
    setLoading(true);
    const cusRes = await supabase.from('customers').select('*').eq('archived', false).order('name', { ascending: true });
    const txRes = await supabase.from('transactions').select('*');
    if (cusRes.error || txRes.error) {
      setError((cusRes.error || txRes.error).message);
    } else {
      setCustomers(cusRes.data);
      setTransactions(txRes.data);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function canModify(c) {
    return isAdmin || c.created_by === user?.id;
  }
  function formatMoney(n) {
    const rounded = Math.round(Number(n) * 100) / 100;
    return rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const totalOwed = totalReceivables(customers, transactions);
  // Sort: those who owe the most first, then settled customers alphabetically
  const sortedCustomers = [...customers].sort((a, b) => {
    const owedA = customerBalance(a.id, transactions);
    const owedB = customerBalance(b.id, transactions);
    if (owedA > 0.001 && owedB <= 0.001) return -1;
    if (owedB > 0.001 && owedA <= 0.001) return 1;
    if (owedA > 0.001 && owedB > 0.001) return owedB - owedA;
    return a.name.localeCompare(b.name);
  });

  async function addCustomer() {
    if (!form.name.trim()) { setError('Please enter a customer name.'); return; }
    const { error } = await supabase.from('customers').insert({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
      created_by: user?.id ?? null,
    });
    if (error) setError(error.message);
    else {
      setForm({ name: '', phone: '', address: '', email: '', notes: '' });
      setShowAdd(false);
      setError(null);
      load();
    }
  }

  async function updateCustomer(id, fields) {
    const { error } = await supabase.from('customers').update(fields).eq('id', id);
    if (error) setError(error.message);
    else load();
  }

async function archiveCustomer(id, name) {
    const ok = window.confirm(`Archive "${name}"? They'll be hidden but their history is kept.`);
    if (!ok) return;
    updateCustomer(id, { archived: true });
  }

  async function deleteCustomer(id, name) {
    const ok = window.confirm(`Permanently delete "${name}"? This cannot be undone. Use Archive instead if they have any sales history.`);
    if (!ok) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) setError(error.message);
    else load();
  }
  const inputRow = (label, key, placeholder) => (
    <>
      <label className="tk-label">{label}</label>
      <input
        className="tk-input"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </>
  );

  return (
    <div className="tk-page">
      <h1 className="tk-h1">Customers</h1>
      <p className="tk-muted" style={{ marginTop: -12, marginBottom: 24 }}>
        People and businesses you sell to.
      </p>
      {totalOwed > 0 && (
        <div className="tk-card" style={{ borderColor: 'var(--accent)' }}>
          <h2 className="tk-panel-title">Total Outstanding (owed to you)</h2>
          <div className="tk-money" style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>
            {formatMoney(totalOwed)}
          </div>
        </div>
      )}

      {error && <div className="tk-alert-error">{error}</div>}

      {!showAdd && (
        <button onClick={() => setShowAdd(true)} className="tk-btn" style={{ marginBottom: 20 }}>
          + Add customer
        </button>
      )}

      {showAdd && (
        <div className="tk-card" style={{ border: '2px dashed var(--border)' }}>
          <h3 style={{ marginTop: 0, fontSize: 16 }}>New customer</h3>
          {inputRow('Name', 'name', 'Customer name')}
          {inputRow('Phone', 'phone', 'Phone number')}
          {inputRow('Address', 'address', 'Address')}
          {inputRow('Email', 'email', 'Email')}
          {inputRow('Notes', 'notes', 'Any notes')}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addCustomer} className="tk-btn">Save customer</button>
            <button onClick={() => { setShowAdd(false); setError(null); }} className="tk-btn tk-btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="tk-muted">Loading…</p>
      ) : customers.length === 0 ? (
        <div className="tk-card"><p className="tk-muted" style={{ margin: 0 }}>No customers yet. Add your first one above.</p></div>
      ) : (
        sortedCustomers.map((c) => (
          <div key={c.id} className="tk-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <a href={`/customers/${c.id}`} style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>{c.name} →</a>
              {(() => {
                const owed = customerBalance(c.id, transactions);
                if (owed > 0.001) return <div className="tk-money" style={{ color: 'var(--negative)', fontWeight: 700, whiteSpace: 'nowrap' }}>Owes {formatMoney(owed)}</div>;
                if (owed < -0.001) return <div className="tk-money" style={{ color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>Credit {formatMoney(-owed)}</div>;
                return <div className="tk-muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Settled</div>;
              })()}
            </div>
            <div className="tk-muted" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
              {c.phone && <div>📞 {c.phone}</div>}
              {c.email && <div>✉️ {c.email}</div>}
              {c.address && <div>📍 {c.address}</div>}
              {c.notes && <div style={{ marginTop: 4 }}>{c.notes}</div>}
            </div>
            {canModify(c) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => archiveCustomer(c.id, c.name)}
                  className="tk-btn tk-btn-ghost"
                  style={{ fontSize: 13, padding: '7px 14px' }}
                >
                  Archive
                </button>
                <button
                  onClick={() => deleteCustomer(c.id, c.name)}
                  className="tk-btn tk-btn-danger"
                  style={{ fontSize: 13, padding: '7px 14px' }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}