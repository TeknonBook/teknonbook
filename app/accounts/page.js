'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    if (error) setError(error.message);
    else loadAccounts();
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
    <div className="tk-page">
      <h1 className="tk-h1">Accounts</h1>
      <p className="tk-muted" style={{ marginTop: -12, marginBottom: 24 }}>
        Rename accounts, set interest rates, add or archive accounts.
      </p>

      {error && <div className="tk-alert-error">{error}</div>}

      {loading ? (
        <p className="tk-muted">Loading accounts…</p>
      ) : (
        <>
          {activeAccounts.map((acc) => (
            <div key={acc.id} className="tk-card">
              <label className="tk-label">Name</label>
              <input
                defaultValue={acc.name}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== acc.name) {
                    updateAccount(acc.id, { name: e.target.value.trim() });
                  }
                }}
                className="tk-input"
              />

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <label className="tk-label">Type</label>
                  <select
                    value={acc.type}
                    onChange={(e) => updateAccount(acc.id, { type: e.target.value })}
                    className="tk-select"
                  >
                    <option value="loan">Loan</option>
                    <option value="operating">Operating</option>
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: 130 }}>
                  <label className="tk-label">Interest rate (% / year)</label>
                  <input
                    type="number"
                    defaultValue={acc.interest_rate}
                    onBlur={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      if (val !== Number(acc.interest_rate)) {
                        updateAccount(acc.id, { interest_rate: val });
                      }
                    }}
                    className="tk-input tk-money"
                  />
                </div>
              </div>

              <button
                onClick={() => updateAccount(acc.id, { archived: true })}
                className="tk-btn tk-btn-ghost"
                style={{ fontSize: 14, padding: '9px 16px' }}
              >
                Archive
              </button>
            </div>
          ))}

          <div className="tk-card" style={{ border: '2px dashed var(--border)' }}>
            <h3 style={{ marginTop: 0, fontSize: 16 }}>Add a new account</h3>
            <label className="tk-label">Name</label>
            <input
              placeholder="Account name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="tk-input"
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label className="tk-label">Type</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)} className="tk-select">
                  <option value="loan">Loan</option>
                  <option value="operating">Operating</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label className="tk-label">Interest rate (% / year)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="tk-input tk-money"
                />
              </div>
            </div>
            <button onClick={addAccount} className="tk-btn">Add account</button>
          </div>

          {archivedAccounts.length > 0 && (
            <div>
              <h3 className="tk-muted" style={{ fontSize: 15 }}>Archived</h3>
              {archivedAccounts.map((acc) => (
                <div key={acc.id} className="tk-row">
                  <span className="tk-muted">{acc.name} ({acc.type})</span>
                  <button
                    onClick={() => updateAccount(acc.id, { archived: false })}
                    className="tk-btn tk-btn-ghost"
                    style={{ fontSize: 13, padding: '7px 14px' }}
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