import { Controller, Get, Header } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { MetricsService } from '../metrics/metrics.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly ingestionService: IngestionService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'sensaura-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  readiness() {
    const ingestion = this.ingestionService.getStatus();

    return {
      status: this.databaseService.isReady() ? 'ready' : 'not_ready',
      databaseReady: this.databaseService.isReady(),
      mqttConnected: ingestion.mqttConnected,
      ingestionQueueLength: ingestion.queueLength,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('liveness')
  liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  metrics() {
    return this.metricsService.getPrometheusMetrics();
  }
}
