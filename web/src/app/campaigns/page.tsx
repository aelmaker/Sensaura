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

  const load = async () => {
    const response = await apiFetch('/campaigns?limit=50');
    const data = response.ok ? ((await response.json()) as Campaign[]) : [];
    setCampaigns(data);
  };

  useEffect(() => {
    void load();
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
    await load();
  };

  return (
    <ProtectedShell title="Campaigns">
      <form onSubmit={create} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" required />
        <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} min={0} />
        <button type="submit">Create</button>
      </form>
      <ul>
        {campaigns.map((campaign) => (
          <li key={campaign.id}>{campaign.name} — {campaign.status} — ${campaign.budget}</li>
        ))}
      </ul>
    </ProtectedShell>
  );
}
