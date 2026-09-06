'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/auth-client';
import { ProtectedShell } from '@/components/protected-shell';

type TelemetryEvent = {
  eventId?: string;
  deviceId: string;
  metric: string;
  value: number;
  timestamp: string;
  source: 'mqtt' | 'api';
};

export default function DashboardPage() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);

  useEffect(() => {
    apiFetch('/telemetry?limit=20')
      .then((response) => (response.ok ? response.json() : []))
      .then((data: TelemetryEvent[]) => setEvents(data))
      .catch(() => setEvents([]));
  }, []);

  return (
    <ProtectedShell title="Sensaura Dashboard">
      <p>Latest telemetry events</p>
      <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Time</th>
            <th align="left">Device</th>
            <th align="left">Metric</th>
            <th align="left">Value</th>
            <th align="left">Source</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={5}>No telemetry events yet.</td>
            </tr>
          ) : (
            events.map((event) => (
              <tr key={event.eventId ?? `${event.deviceId}-${event.timestamp}`}>
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
    </ProtectedShell>
  );
}
