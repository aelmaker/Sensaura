import { Module } from '@nestjs/common';
import { IngestionModule } from '../ingestion/ingestion.module';
import { MetricsModule } from '../metrics/metrics.module';
import { HealthController } from './health.controller';

@Module({
  imports: [IngestionModule, MetricsModule],
  controllers: [HealthController],
})
export class HealthModule {}
