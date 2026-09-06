'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type TelemetryEvent = {
  deviceId: string;
  metric: string;
  value: number;
  timestamp: string;
  source: 'mqtt' | 'api';
  topic?: string;
};

type MeResponse = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'operator' | 'viewer';
};

export default function DashboardPage() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api',
    [],
  );

  useEffect(() => {
    const token = localStorage.getItem('sensaura_token');
    if (!token) {
      router.replace('/auth');
      return;
    }

    let stream: EventSource | null = null;

    const init = async () => {
      try {
        const meResponse = await fetch(`${apiBase}/auth/me`, {
          headers: {
            "x-auth-token": token,
          },
        });

        if (!meResponse.ok) {
          throw new Error('Сесія недійсна, увійдіть знову');
        }

        const me = (await meResponse.json()) as MeResponse;
        setUser(me);

        const telemetryResponse = await fetch(`${apiBase}/telemetry`, {
          headers: {
            "x-auth-token": token,
            "x-role": me.role,
          },
        });

        if (telemetryResponse.ok) {
          const data = (await telemetryResponse.json()) as TelemetryEvent[];
          setEvents(data);
        }

        stream = new EventSource(`${apiBase}/telemetry/stream?role=${me.role}`);
        stream.onmessage = (message) => {
          try {
            const payload = JSON.parse(message.data) as TelemetryEvent;
            setEvents((current) => [payload, ...current].slice(0, 20));
          } catch {
            // ignore malformed payloads
          }
        };
      } catch (initError) {
        setError(
          initError instanceof Error
            ? initError.message
            : 'Не вдалося завантажити панель',
        );
        localStorage.removeItem('sensaura_token');
        router.replace('/auth');
      }
    };

    void init();

    return () => {
      stream?.close();
    };
  }, [apiBase, router]);

  const logout = () => {
    localStorage.removeItem('sensaura_token');
    router.replace('/auth');
  };

  return (
    <main style={{ margin: '2rem auto', maxWidth: 900, fontFamily: 'Arial, sans-serif' }}>
      <h1>Sensaura Dashboard</h1>
      <p>MVP stream of telemetry events via SSE.</p>
      {user ? (
        <p>
          Користувач: {user.name} ({user.role})
        </p>
      ) : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      <button type="button" onClick={logout} style={{ marginBottom: '1rem' }}>
        Вийти
      </button>
      <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Timestamp</th>
            <th align="left">Device</th>
            <th align="left">Metric</th>
            <th align="left">Value</th>
            <th align="left">Source</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={5}>No telemetry yet.</td>
            </tr>
          ) : (
            events.map((event, idx) => (
              <tr key={`${event.timestamp}-${event.deviceId}-${idx}`}>
                <td>{event.timestamp}</td>
                <td>{event.deviceId}</td>
                <td>{event.metric}</td>
                <td>{event.value}</td>
                <td>{event.source}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
