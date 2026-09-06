import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async summary() {
    const [devices, eventsLastHour, campaigns, interactionsLastHour] =
      await Promise.all([
        this.databaseService.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM devices WHERE status = 'online'`,
        ),
        this.databaseService.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM telemetry_events WHERE recorded_at >= NOW() - INTERVAL '1 hour'`,
        ),
        this.databaseService.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM campaigns WHERE status = 'active'`,
        ),
        this.databaseService.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM interactions WHERE created_at >= NOW() - INTERVAL '1 hour'`,
        ),
      ]);

    return {
      activeDevices: Number(devices.rows[0]?.count ?? 0),
      eventsLastHour: Number(eventsLastHour.rows[0]?.count ?? 0),
      campaignsRunning: Number(campaigns.rows[0]?.count ?? 0),
      interactionsLastHour: Number(interactionsLastHour.rows[0]?.count ?? 0),
      generatedAt: new Date().toISOString(),
    };
  }
}
