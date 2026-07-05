'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

function formatMoney(n) {
  const rounded = Math.round(Number(n) * 100) / 100;
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ListPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    const txRes = await supabase.from('transactions').select('*').order('occurred_on', { ascending: false }).order('created_at', { ascending: false });
    const accRes = await supabase.from('accounts').select('*');
    const catRes = await supabase.from('categories').select('*');
    if (txRes.error || accRes.error || catRes.error) {
      setError((txRes.error || accRes.error || catRes.error).message);
    } else {
      setTransactions(txRes.data);
      setAccounts(accRes.data);
      setCategories(catRes.data);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const accName = (id) => accounts.find((a) => a.id === id)?.name || '—';
  const catName = (id) => categories.find((c) => c.id === id)?.name || '—';

  function canModify(t) {
    return isAdmin || t.created_by === user?.id;
  }

  async function deleteTransaction(t) {
    const ok = window.confirm(`Delete this ${t.type} of ${formatMoney(t.amount)}? This cannot be undone.`);
    if (!ok) return;
    const { error } = await supabase.from('transactions').delete().eq('id', t.id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <div className="tk-page">
      <h1 className="tk-h1">Transactions</h1>
      <p className="tk-muted" style={{ marginTop: -12, marginBottom: 24 }}>
        Review, edit, or delete recorded transactions.
      </p>

      {error && <div className="tk-alert-error">{error}</div>}

      {loading ? (
        <p className="tk-muted">Loading…</p>
      ) : transactions.length === 0 ? (
        <div className="tk-card"><p className="tk-muted" style={{ margin: 0 }}>No transactions yet. Add one from the Add screen.</p></div>
      ) : (
        transactions.map((t) => (
          <div key={t.id} className="tk-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13 }} className="tk-muted">{t.occurred_on} · <span style={{ textTransform: 'capitalize' }}>{t.type}</span></div>
                <div style={{ marginTop: 4 }}>
                  {t.type === 'expense'
                    ? <>{accName(t.account_id)} · {catName(t.category_id)}</>
                    : <>{accName(t.account_id)} → {accName(t.to_account_id)}</>}
                </div>
                {t.notes && <div className="tk-muted" style={{ marginTop: 4, fontSize: 14 }}>{t.notes}</div>}
              </div>
              <div className="tk-money" style={{ fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatMoney(t.amount)}</div>
            </div>

            {canModify(t) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <a href={`/list/edit/${t.id}`} className="tk-btn tk-btn-ghost" style={{ fontSize: 14, padding: '8px 16px', textDecoration: 'none' }}>Edit</a>
                <button onClick={() => deleteTransaction(t)} className="tk-btn tk-btn-danger" style={{ fontSize: 14, padding: '8px 16px' }}>Delete</button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}