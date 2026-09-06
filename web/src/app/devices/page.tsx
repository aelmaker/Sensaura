'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/auth-client';
import { ProtectedShell } from '@/components/protected-shell';

type Device = {
  id: string;
  name: string;
  status: string;
  location?: string;
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('offline');
  const [error, setError] = useState('');

  const load = async () => {
    const response = await apiFetch('/devices?limit=50');
    if (!response.ok) {
      setError('Failed to load devices');
      return;
    }

    const data = (await response.json()) as Device[];
    setDevices(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const response = await apiFetch('/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status }),
    });

    if (!response.ok) {
      setError('Failed to create device (check role)');
      return;
    }

    setName('');
    await load();
  };

  return (
    <ProtectedShell title="Devices">
      <form onSubmit={create} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Device name" required />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="online">online</option>
          <option value="offline">offline</option>
        </select>
        <button type="submit">Create</button>
      </form>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      <ul>
        {devices.map((device) => (
          <li key={device.id}>{device.name} — {device.status}</li>
        ))}
      </ul>
    </ProtectedShell>
  );
}
