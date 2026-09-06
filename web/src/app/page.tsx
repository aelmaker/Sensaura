'use client';

import { useEffect, useMemo, useState } from 'react';

type TelemetryEvent = {
  deviceId: string;
  metric: string;
  value: number;
  timestamp: string;
  source: 'mqtt' | 'api';
  topic?: string;
};

const role = 'admin';

export default function Home() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api',
    [],
  );

  useEffect(() => {
    fetch(`${apiBase}/telemetry`, {
      headers: { 'x-role': role },
    })
      .then((res) => res.json())
      .then((data: TelemetryEvent[]) => setEvents(data))
      .catch(() => setEvents([]));

    const stream = new EventSource(`${apiBase}/telemetry/stream?role=${role}`);

    stream.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data) as TelemetryEvent;
        setEvents((current) => [payload, ...current].slice(0, 20));
      } catch {
        // ignore malformed payloads
      }
    };

    return () => stream.close();
  }, [apiBase]);

  return (
    <main style={{ margin: '2rem auto', maxWidth: 900, fontFamily: 'Arial, sans-serif' }}>
      <h1>Sensaura Dashboard</h1>
      <p>MVP stream of telemetry events via SSE.</p>
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
