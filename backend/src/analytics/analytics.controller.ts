import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @Roles('admin', 'analyst')
  summary() {
    return this.analyticsService.summary();
  }
}
