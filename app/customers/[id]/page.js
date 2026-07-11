'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { customerBalance } from '../../../lib/balances';

function formatMoney(n) {
  const rounded = Math.round(Number(n) * 100) / 100;
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const typeLabel = {
  income: 'Paid sale',
  credit_sale: 'Credit sale',
  customer_payment: 'Payment',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = Number(params.id);

  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const cusRes = await supabase.from('customers').select('*').eq('id', customerId).single();
      const txRes = await supabase.from('transactions').select('*').eq('customer_id', customerId).order('occurred_on', { ascending: false }).order('created_at', { ascending: false });
      const catRes = await supabase.from('categories').select('*');
      const accRes = await supabase.from('accounts').select('*');
      if (cusRes.error || txRes.error) {
        setError((cusRes.error || txRes.error).message);
      } else {
        setCustomer(cusRes.data);
        setTransactions(txRes.data);
        setCategories(catRes.data || []);
        setAccounts(accRes.data || []);
        setError(null);
      }
      setLoading(false);
    }
    load();
  }, [customerId]);

  const catName = (id) => categories.find((c) => c.id === id)?.name || '';
  const accName = (id) => accounts.find((a) => a.id === id)?.name || '';

  if (loading) return <div className="tk-page"><p className="tk-muted">Loading…</p></div>;
  if (error) return <div className="tk-page"><div className="tk-alert-error">{error}</div></div>;
  if (!customer) return <div className="tk-page"><p className="tk-muted">Customer not found.</p></div>;

  const owed = customerBalance(customerId, transactions);

  return (
    <div className="tk-page">
      <a href="/customers" className="tk-muted" style={{ textDecoration: 'none', fontSize: 14 }}>← Back to customers</a>
      <h1 className="tk-h1" style={{ marginTop: 12 }}>{customer.name}</h1>

      {/* Contact */}
      <div className="tk-card">
        <div className="tk-muted" style={{ fontSize: 14, lineHeight: 1.7 }}>
          {customer.phone && <div>📞 {customer.phone}</div>}
          {customer.email && <div>✉️ {customer.email}</div>}
          {customer.address && <div>📍 {customer.address}</div>}
          {customer.notes && <div style={{ marginTop: 6 }}>{customer.notes}</div>}
          {!customer.phone && !customer.email && !customer.address && !customer.notes && <div>No contact details.</div>}
        </div>
      </div>

      {/* Balance */}
      <div className="tk-card" style={{ borderColor: owed > 0.001 ? 'var(--negative)' : 'var(--border)' }}>
        <h2 className="tk-panel-title">Balance</h2>
        {owed > 0.001 ? (
          <div className="tk-money" style={{ fontSize: 28, fontWeight: 800, color: 'var(--negative)' }}>Owes {formatMoney(owed)}</div>
        ) : owed < -0.001 ? (
          <div className="tk-money" style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>In credit {formatMoney(-owed)}</div>
        ) : (
          <div className="tk-money" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>Settled</div>
        )}
      </div>

      {/* History */}
      <div className="tk-card">
        <h2 className="tk-panel-title">History</h2>
        {transactions.length === 0 ? (
          <p className="tk-muted" style={{ margin: 0 }}>No transactions with this customer yet.</p>
        ) : (
          transactions.map((t) => (
            <a
              key={t.id}
              href={`/list/edit/${t.id}`}
              className="tk-row"
              style={{ textDecoration: 'none', color: 'var(--text)' }}
            >
              <span>
                <span className="tk-muted" style={{ fontSize: 13 }}>{t.occurred_on}</span>{' '}
                <strong>{typeLabel[t.type] || t.type}</strong>
                {t.category_id ? <span className="tk-muted"> · {catName(t.category_id)}</span> : null}
                {t.type === 'customer_payment' && t.account_id ? <span className="tk-muted"> · into {accName(t.account_id)}</span> : null}
                {t.notes ? <span className="tk-muted"> · {t.notes}</span> : null}
              </span>
              <span className="tk-money" style={{
                fontWeight: 700,
                whiteSpace: 'nowrap',
                color: t.type === 'customer_payment' ? 'var(--accent)' : 'var(--text)',
              }}>
                {t.type === 'customer_payment' ? '−' : '+'}{formatMoney(t.amount)}
              </span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}