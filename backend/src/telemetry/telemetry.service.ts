import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, map } from 'rxjs';
import { TelemetryEvent } from './telemetry.types';

@Injectable()
export class TelemetryService {
  private readonly eventsSubject = new Subject<TelemetryEvent>();
  private readonly recentEvents: TelemetryEvent[] = [];

  stream(): Observable<MessageEvent> {
    return this.eventsSubject.pipe(
      map((event) => ({
        type: 'telemetry',
        data: event,
      })),
    );
  }

  getRecent(): TelemetryEvent[] {
    return this.recentEvents;
  }

  publishFromApi(input: Partial<TelemetryEvent>): TelemetryEvent {
    const event: TelemetryEvent = {
      deviceId: input.deviceId ?? 'unknown-device',
      metric: input.metric ?? 'unknown-metric',
      value: Number(input.value ?? 0),
      timestamp: input.timestamp ?? new Date().toISOString(),
      source: 'api',
      topic: input.topic,
    };

    this.push(event);
    return event;
  }

  ingestFromMqtt(topic: string, payload: string): TelemetryEvent | null {
    try {
      const parsed = JSON.parse(payload) as Partial<TelemetryEvent>;
      const event: TelemetryEvent = {
        deviceId:
          parsed.deviceId ?? topic.split('/').at(-1) ?? 'unknown-device',
        metric: parsed.metric ?? 'telemetry',
        value: Number(parsed.value ?? 0),
        timestamp: parsed.timestamp ?? new Date().toISOString(),
        source: 'mqtt',
        topic,
      };

      this.push(event);
      return event;
    } catch {
      return null;
    }
  }

  private push(event: TelemetryEvent): void {
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > 100) {
      this.recentEvents.pop();
    }
    this.eventsSubject.next(event);
  }
}
