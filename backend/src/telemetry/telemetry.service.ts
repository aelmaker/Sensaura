import { Injectable, MessageEvent } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Observable, Subject, map } from 'rxjs';
import { DatabaseService } from '../database/database.service';
import type { TelemetryEvent } from './telemetry.types';

type TelemetryRow = {
  event_id: string;
  device_id: string;
  metric: string;
  value: number;
  recorded_at: Date;
  source: 'mqtt' | 'api';
  topic: string | null;
  payload: Record<string, unknown>;
};

@Injectable()
export class TelemetryService {
  private readonly eventsSubject = new Subject<TelemetryEvent>();

  constructor(private readonly databaseService: DatabaseService) {}

  stream(): Observable<MessageEvent> {
    return this.eventsSubject.pipe(
      map((event) => ({
        type: 'telemetry',
        data: event,
      })),
    );
  }

  async list(filters: { deviceId?: string; metric?: string; limit: number; offset: number }) {
    const result = await this.databaseService.query<TelemetryRow>(
      `SELECT event_id, device_id, metric, value, recorded_at, source, topic, payload
       FROM telemetry_events
       WHERE ($1::text IS NULL OR device_id = $1)
         AND ($2::text IS NULL OR metric = $2)
       ORDER BY recorded_at DESC
       LIMIT $3 OFFSET $4`,
      [filters.deviceId ?? null, filters.metric ?? null, filters.limit, filters.offset],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async publishFromApi(input: Partial<TelemetryEvent>): Promise<TelemetryEvent> {
    const event: TelemetryEvent = {
      eventId: input.eventId ?? randomUUID(),
      deviceId: input.deviceId ?? 'unknown-device',
      metric: input.metric ?? 'unknown-metric',
      value: Number(input.value ?? 0),
      timestamp: input.timestamp ?? new Date().toISOString(),
      source: 'api',
      topic: input.topic,
      payload: input.payload ?? {},
    };

    await this.persistEvent(event);
    this.eventsSubject.next(event);
    return event;
  }

  async ingestFromMqtt(topic: string, payload: string): Promise<TelemetryEvent | null> {
    try {
      const parsed = JSON.parse(payload) as Partial<TelemetryEvent>;
      const event: TelemetryEvent = {
        eventId:
          parsed.eventId ??
          createHash('sha256').update(`${topic}:${payload}`).digest('hex'),
        deviceId:
          parsed.deviceId ?? topic.split('/').at(-1) ?? 'unknown-device',
        metric: parsed.metric ?? 'telemetry',
        value: Number(parsed.value ?? 0),
        timestamp: parsed.timestamp ?? new Date().toISOString(),
        source: 'mqtt',
        topic,
        payload: parsed.payload ?? parsed,
      };

      await this.persistEvent(event);
      this.eventsSubject.next(event);
      return event;
    } catch {
      return null;
    }
  }

  private async persistEvent(event: TelemetryEvent): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO telemetry_events (event_id, device_id, metric, value, source, topic, payload, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       ON CONFLICT (event_id) DO NOTHING`,
      [
        event.eventId,
        event.deviceId,
        event.metric,
        Number(event.value),
        event.source,
        event.topic ?? null,
        JSON.stringify(event.payload ?? {}),
        new Date(event.timestamp),
      ],
    );
  }

  private mapRow(row: TelemetryRow): TelemetryEvent {
    return {
      eventId: row.event_id,
      deviceId: row.device_id,
      metric: row.metric,
      value: Number(row.value),
      timestamp: row.recorded_at.toISOString(),
      source: row.source,
      topic: row.topic ?? undefined,
      payload: row.payload,
    };
  }
}
