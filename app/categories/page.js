'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState('');

  async function loadCategories() {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setCategories(data);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function updateCategory(id, fields) {
    const { error } = await supabase.from('categories').update(fields).eq('id', id);
    if (error) setError(error.message);
    else loadCategories();
  }

  async function addCategory() {
    if (!newName.trim()) {
      setError('Please enter a category name.');
      return;
    }
    const { error } = await supabase.from('categories').insert({ name: newName.trim() });
    if (error) {
      setError(error.message);
    } else {
      setNewName('');
      setError(null);
      loadCategories();
    }
  }

  async function deleteCategory(id, name) {
    const ok = window.confirm(`Delete the category "${name}"? This cannot be undone.`);
    if (!ok) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) setError(error.message);
    else loadCategories();
  }

  const activeCategories = categories.filter((c) => !c.archived);

  return (
    <div className="tk-page">
      <h1 className="tk-h1">Categories</h1>
      <p className="tk-muted" style={{ marginTop: -12, marginBottom: 24 }}>
        Rename, add, or delete expense categories.
      </p>

      {error && <div className="tk-alert-error">{error}</div>}

      {loading ? (
        <p className="tk-muted">Loading categories…</p>
      ) : (
        <>
          <div className="tk-card">
            {activeCategories.map((cat) => (
              <div key={cat.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <input
                  defaultValue={cat.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== cat.name) {
                      updateCategory(cat.id, { name: e.target.value.trim() });
                    }
                  }}
                  className="tk-input"
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <button
                  onClick={() => deleteCategory(cat.id, cat.name)}
                  className="tk-btn tk-btn-danger"
                  style={{ fontSize: 14, padding: '11px 16px' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div className="tk-card" style={{ border: '2px dashed var(--border)' }}>
            <h3 style={{ marginTop: 0, fontSize: 16 }}>Add a new category</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
                className="tk-input"
                style={{ flex: 1, marginBottom: 0 }}
              />
              <button onClick={addCategory} className="tk-btn">Add</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}