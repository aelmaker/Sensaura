export interface TelemetryEvent {
  deviceId: string;
  metric: string;
  value: number;
  timestamp: string;
  source: 'mqtt' | 'api';
  topic?: string;
}
