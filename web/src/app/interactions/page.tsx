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

  useEffect(() => {
    let cancelled = false;

    apiFetch('/interactions?limit=50')
      .then(async (response) => {
        const data = response.ok ? ((await response.json()) as Interaction[]) : [];
        if (!cancelled) {
          setItems(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();

    await apiFetch('/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload: { source: 'web' } }),
    });

    const response = await apiFetch('/interactions?limit=50');
    if (response.ok) {
      const data = (await response.json()) as Interaction[];
      setItems(data);
    }
  };

  return (
    <ProtectedShell title="Interactions">
      <form
        onSubmit={create}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
      >
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="interaction type"
          required
        />
        <button type="submit">Create</button>
      </form>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.type} — {item.createdAt}
          </li>
        ))}
      </ul>
    </ProtectedShell>
  );
}
