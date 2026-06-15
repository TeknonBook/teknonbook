'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New account form fields
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('loan');
  const [newRate, setNewRate] = useState('');

  async function loadAccounts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('id', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setAccounts(data);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function updateAccount(id, fields) {
    const { error } = await supabase.from('accounts').update(fields).eq('id', id);
    if (error) {
      setError(error.message);
    } else {
      loadAccounts();
    }
  }

  async function addAccount() {
    if (!newName.trim()) {
      setError('Please enter an account name.');
      return;
    }
    const { error } = await supabase.from('accounts').insert({
      name: newName.trim(),
      type: newType,
      interest_rate: newRate === '' ? 0 : Number(newRate),
    });
    if (error) {
      setError(error.message);
    } else {
      setNewName('');
      setNewType('loan');
      setNewRate('');
      setError(null);
      loadAccounts();
    }
  }

  const activeAccounts = accounts.filter((a) => !a.archived);
  const archivedAccounts = accounts.filter((a) => a.archived);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Accounts</h1>
      <p style={{ color: '#666', marginTop: 0, marginBottom: 24 }}>
        Rename accounts, set interest rates, add or archive accounts.
      </p>

      {error && (
        <div style={{ background: '#fdecea', color: '#b71c1c', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading accounts…</p>
      ) : (
        <>
          {activeAccounts.map((acc) => (
            <div key={acc.id} style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#888' }}>Name</label><br />
                <input
                  defaultValue={acc.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== acc.name) {
                      updateAccount(acc.id, { name: e.target.value.trim() });
                    }
                  }}
                  style={{ width: '100%', padding: 10, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: 12, color: '#888' }}>Type</label><br />
                  <select
                    value={acc.type}
                    onChange={(e) => updateAccount(acc.id, { type: e.target.value })}
                    style={{ padding: 10, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
                  >
                    <option value="loan">Loan</option>
                    <option value="operating">Operating</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#888' }}>Interest rate (% / year)</label><br />
                  <input
                    type="number"
                    defaultValue={acc.interest_rate}
                    onBlur={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      if (val !== Number(acc.interest_rate)) {
                        updateAccount(acc.id, { interest_rate: val });
                      }
                    }}
                    style={{ width: 140, padding: 10, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
                  />
                </div>
              </div>

              <button
                onClick={() => updateAccount(acc.id, { archived: true })}
                style={{ marginTop: 12, padding: '8px 14px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer' }}
              >
                Archive
              </button>
            </div>
          ))}

          <div style={{ border: '2px dashed #bbb', borderRadius: 10, padding: 16, marginTop: 8, marginBottom: 24 }}>
            <h3 style={{ marginTop: 0 }}>Add a new account</h3>
            <input
              placeholder="Account name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: '100%', padding: 10, fontSize: 16, borderRadius: 6, border: '1px solid #ccc', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Type</label><br />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  style={{ padding: 10, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
                >
                  <option value="loan">Loan</option>
                  <option value="operating">Operating</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Interest rate (% / year)</label><br />
                <input
                  type="number"
                  placeholder="0"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  style={{ width: 140, padding: 10, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
                />
              </div>
              <button
                onClick={addAccount}
                style={{ padding: '10px 18px', fontSize: 16, borderRadius: 6, border: 'none', background: '#0070f3', color: 'white', cursor: 'pointer' }}
              >
                Add account
              </button>
            </div>
          </div>

          {archivedAccounts.length > 0 && (
            <div>
              <h3 style={{ color: '#888' }}>Archived</h3>
              {archivedAccounts.map((acc) => (
                <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 8, color: '#888' }}>
                  <span>{acc.name} ({acc.type})</span>
                  <button
                    onClick={() => updateAccount(acc.id, { archived: false })}
                    style={{ padding: '6px 12px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer' }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}