import { Module } from '@nestjs/common';
import { IngestionModule } from '../ingestion/ingestion.module';
import { MetricsService } from './metrics.service';

@Module({
  imports: [IngestionModule],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
