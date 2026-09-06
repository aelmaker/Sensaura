import { Body, Controller, Get, MessageEvent, Post, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Roles } from '../common/roles.decorator';
import { TelemetryService } from './telemetry.service';
import type { TelemetryEvent } from './telemetry.types';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get()
  @Roles('admin', 'analyst', 'operator', 'viewer')
  getRecent() {
    return this.telemetryService.getRecent();
  }

  @Post()
  @Roles('admin', 'operator')
  publish(@Body() body: Partial<TelemetryEvent>) {
    return this.telemetryService.publishFromApi(body);
  }

  @Sse('stream')
  @Roles('admin', 'analyst', 'operator', 'viewer')
  stream(): Observable<MessageEvent> {
    return this.telemetryService.stream();
  }
}
