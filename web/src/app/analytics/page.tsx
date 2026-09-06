'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/auth-client';
import { ProtectedShell } from '@/components/protected-shell';

type Summary = {
  activeDevices: number;
  eventsLastHour: number;
  campaignsRunning: number;
  interactionsLastHour: number;
  generatedAt: string;
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    apiFetch('/analytics/summary')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Summary | null) => setSummary(data))
      .catch(() => setSummary(null));
  }, []);

  return (
    <ProtectedShell title="Analytics">
      {summary ? (
        <ul>
          <li>Active devices: {summary.activeDevices}</li>
          <li>Events last hour: {summary.eventsLastHour}</li>
          <li>Campaigns running: {summary.campaignsRunning}</li>
          <li>Interactions last hour: {summary.interactionsLastHour}</li>
          <li>Generated: {summary.generatedAt}</li>
        </ul>
      ) : (
        <p>No analytics data yet.</p>
      )}
    </ProtectedShell>
  );
}
