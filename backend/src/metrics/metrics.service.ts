import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { IngestionService } from '../ingestion/ingestion.service';

@Injectable()
export class MetricsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly ingestionService: IngestionService,
  ) {}

  async getPrometheusMetrics(): Promise<string> {
    const telemetryCountResult = await this.databaseService.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM telemetry_events',
    );

    const sessionsCountResult = await this.databaseService.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM sessions WHERE revoked_at IS NULL AND access_expires_at > NOW()',
    );

    const telemetryCount = Number(telemetryCountResult.rows[0]?.count ?? 0);
    const activeSessions = Number(sessionsCountResult.rows[0]?.count ?? 0);
    const ingestion = this.ingestionService.getStatus();

    return [
      '# HELP sensaura_telemetry_events_total Total telemetry events persisted',
      '# TYPE sensaura_telemetry_events_total counter',
      `sensaura_telemetry_events_total ${telemetryCount}`,
      '# HELP sensaura_active_sessions Current active sessions',
      '# TYPE sensaura_active_sessions gauge',
      `sensaura_active_sessions ${activeSessions}`,
      '# HELP sensaura_ingestion_queue_length Current ingestion queue length',
      '# TYPE sensaura_ingestion_queue_length gauge',
      `sensaura_ingestion_queue_length ${ingestion.queueLength}`,
      '# HELP sensaura_ingestion_failed_total Total ingestion failures after retries',
      '# TYPE sensaura_ingestion_failed_total counter',
      `sensaura_ingestion_failed_total ${ingestion.failedCount}`,
    ].join('\n');
  }
}
