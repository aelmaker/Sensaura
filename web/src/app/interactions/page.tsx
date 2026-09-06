'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/auth-client';
import { ProtectedShell } from '@/components/protected-shell';

type Interaction = {
  id: string;
  type: string;
  createdAt: string;
};

export default function InteractionsPage() {
  const [items, setItems] = useState<Interaction[]>([]);
  const [type, setType] = useState('button_click');

  const load = async () => {
    const response = await apiFetch('/interactions?limit=50');
    const data = response.ok ? ((await response.json()) as Interaction[]) : [];
    setItems(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();

    await apiFetch('/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload: { source: 'web' } }),
    });

    await load();
  };

  return (
    <ProtectedShell title="Interactions">
      <form onSubmit={create} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input value={type} onChange={(e) => setType(e.target.value)} placeholder="interaction type" required />
        <button type="submit">Create</button>
      </form>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.type} — {item.createdAt}</li>
        ))}
      </ul>
    </ProtectedShell>
  );
}
