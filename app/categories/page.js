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
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Categories</h1>
      <p style={{ color: '#666', marginTop: 0, marginBottom: 24 }}>
        Rename, add, or delete expense categories.
      </p>

      {error && (
        <div style={{ background: '#fdecea', color: '#b71c1c', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading categories…</p>
      ) : (
        <>
          {activeCategories.map((cat) => (
            <div key={cat.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                defaultValue={cat.name}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== cat.name) {
                    updateCategory(cat.id, { name: e.target.value.trim() });
                  }
                }}
                style={{ flex: 1, padding: 10, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
              />
              <button
                onClick={() => deleteCategory(cat.id, cat.name)}
                style={{ padding: '10px 14px', fontSize: 14, borderRadius: 6, border: '1px solid #e0b4b4', background: '#fdecea', color: '#b71c1c', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          ))}

          <div style={{ border: '2px dashed #bbb', borderRadius: 10, padding: 16, marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Add a new category</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
                style={{ flex: 1, padding: 10, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
              />
              <button
                onClick={addCategory}
                style={{ padding: '10px 18px', fontSize: 16, borderRadius: 6, border: 'none', background: '#0070f3', color: 'white', cursor: 'pointer' }}
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}