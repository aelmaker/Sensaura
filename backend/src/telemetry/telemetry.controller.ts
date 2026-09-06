import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Post,
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditService } from '../audit/audit.service';
import { parsePagination } from '../common/dto/pagination.dto';
import { Roles } from '../common/roles.decorator';
import { TelemetryService } from './telemetry.service';
import type { TelemetryEvent } from './telemetry.types';

@Controller('telemetry')
export class TelemetryController {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'analyst', 'operator', 'viewer')
  getRecent(
    @Query('deviceId') deviceId?: string,
    @Query('metric') metric?: string,
    @Query() query?: { limit?: string; offset?: string },
  ) {
    const { limit, offset } = parsePagination(query ?? {});
    return this.telemetryService.list({ deviceId, metric, limit, offset });
  }

  @Post()
  @Roles('admin', 'operator')
  async publish(
    @Body() body: Partial<TelemetryEvent>,
    @Req() request?: { user?: { id: string } },
  ) {
    const event = await this.telemetryService.publishFromApi(body);
    await this.auditService.log('telemetry.publish', 'telemetry', request?.user?.id, {
      eventId: event.eventId,
      deviceId: event.deviceId,
    });
    return event;
  }

  @Sse('stream')
  @Roles('admin', 'analyst', 'operator', 'viewer')
  stream(): Observable<MessageEvent> {
    return this.telemetryService.stream();
  }
}
