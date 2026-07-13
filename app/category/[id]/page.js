'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

function formatMoney(n) {
  const rounded = Math.round(Number(n) * 100) / 100;
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const typeLabel = {
  expense: 'Expense', income: 'Income', credit_sale: 'Credit sale',
  customer_payment: 'Payment', transfer: 'Transfer', repayment: 'Repayment',
};

export default function CategoryDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const categoryId = Number(params.id);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const [category, setCategory] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const catRes = await supabase.from('categories').select('*').eq('id', categoryId).single();
      let txQuery = supabase.from('transactions').select('*').eq('category_id', categoryId);
      if (from) txQuery = txQuery.gte('occurred_on', from);
      if (to) txQuery = txQuery.lte('occurred_on', to);
      const txRes = await txQuery.order('occurred_on', { ascending: false });
      const accRes = await supabase.from('accounts').select('*');
      const cusRes = await supabase.from('customers').select('*');

      if (catRes.error || txRes.error) {
        setError((catRes.error || txRes.error).message);
      } else {
        setCategory(catRes.data);
        setTransactions(txRes.data);
        setAccounts(accRes.data || []);
        setCustomers(cusRes.data || []);
        setError(null);
      }
      setLoading(false);
    }
    load();
  }, [categoryId, from, to]);

  const accName = (id) => accounts.find((a) => a.id === id)?.name || '—';
  const cusName = (id) => customers.find((c) => c.id === id)?.name || '';

  if (loading) return <div className="tk-page"><p className="tk-muted">Loading…</p></div>;
  if (error) return <div className="tk-page"><div className="tk-alert-error">{error}</div></div>;
  if (!category) return <div className="tk-page"><p className="tk-muted">Category not found.</p></div>;

  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const isIncome = category.kind === 'income';

  return (
    <div className="tk-page">
      <a href="/" className="tk-muted" style={{ textDecoration: 'none', fontSize: 14 }}>← Back to dashboard</a>
      <h1 className="tk-h1" style={{ marginTop: 12 }}>{category.name}</h1>

      <div className="tk-card">
        <h2 className="tk-panel-title">Total {isIncome ? 'income' : 'spent'}</h2>
        <div className="tk-money" style={{ fontSize: 30, fontWeight: 800, color: isIncome ? 'var(--accent)' : 'var(--negative)' }}>
          {formatMoney(total)}
        </div>
        {(from || to) && (
          <div className="tk-muted" style={{ fontSize: 13, marginTop: 6 }}>
            {from || '—'} to {to || '—'} · {transactions.length} transaction{transactions.length === 1 ? '' : 's'}
          </div>
        )}
      </div>

      <div className="tk-card">
        <h2 className="tk-panel-title">History</h2>
        {transactions.length === 0 ? (
          <p className="tk-muted" style={{ margin: 0 }}>No transactions in this category for the selected period.</p>
        ) : (
          transactions.map((t) => (
            <a
              key={t.id}
              href={`/list/edit/${t.id}`}
              className="tk-row"
              style={{ fontSize: 14, textDecoration: 'none', color: 'var(--text)' }}
            >
              <span>
                <span className="tk-muted">{t.occurred_on}</span>{' '}
                <strong>{typeLabel[t.type] || t.type}</strong>
                {t.account_id ? <span className="tk-muted"> · {accName(t.account_id)}</span> : null}
                {t.customer_id ? <span className="tk-muted"> · {cusName(t.customer_id)}</span> : null}
                {t.notes ? <span className="tk-muted"> · {t.notes}</span> : null}
              </span>
              <span className="tk-money" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatMoney(t.amount)}</span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}