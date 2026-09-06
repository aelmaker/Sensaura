'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/auth-client';
import { ProtectedShell } from '@/components/protected-shell';

type Campaign = {
  id: string;
  name: string;
  status: string;
  budget: number;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('0');

  useEffect(() => {
    let cancelled = false;

    apiFetch('/campaigns?limit=50')
      .then(async (response) => {
        const data = response.ok ? ((await response.json()) as Campaign[]) : [];
        if (!cancelled) {
          setCampaigns(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCampaigns([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();

    await apiFetch('/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status: 'draft', budget: Number(budget) }),
    });

    setName('');
    setBudget('0');

    const response = await apiFetch('/campaigns?limit=50');
    if (response.ok) {
      const data = (await response.json()) as Campaign[];
      setCampaigns(data);
    }
  };

  return (
    <ProtectedShell title="Campaigns">
      <form
        onSubmit={create}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Campaign name"
          required
        />
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          min={0}
        />
        <button type="submit">Create</button>
      </form>
      <ul>
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            {campaign.name} — {campaign.status} — ${campaign.budget}
          </li>
        ))}
      </ul>
    </ProtectedShell>
  );
}
