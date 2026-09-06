export interface TelemetryEvent {
  eventId?: string;
  deviceId: string;
  metric: string;
  value: number;
  timestamp: string;
  source: 'mqtt' | 'api';
  topic?: string;
  payload?: Record<string, unknown>;
}
