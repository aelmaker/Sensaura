import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';

@Controller('analytics')
export class AnalyticsController {
  @Get('summary')
  @Roles('admin', 'analyst')
  summary() {
    return {
      activeDevices: 1,
      eventsLastHour: 0,
      campaignsRunning: 1,
    };
  }
}
