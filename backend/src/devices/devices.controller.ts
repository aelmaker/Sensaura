import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { parsePagination } from '../common/dto/pagination.dto';
import { Roles } from '../common/roles.decorator';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'analyst', 'operator', 'viewer')
  list(@Query('status') status?: string, @Query() query?: { limit?: string; offset?: string }) {
    const { limit, offset } = parsePagination(query ?? {});
    return this.devicesService.list(status, limit, offset);
  }

  @Post()
  @Roles('admin', 'operator')
  async create(
    @Body() body: { name?: string; status?: string; location?: string },
    @Req() request?: { user?: { id: string } },
  ) {
    const created = await this.devicesService.create(body);
    await this.auditService.log('device.create', 'devices', request?.user?.id, { deviceId: created.id });
    return created;
  }

  @Patch(':id')
  @Roles('admin', 'operator')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; status?: string; location?: string },
    @Req() request?: { user?: { id: string } },
  ) {
    const updated = await this.devicesService.update(id, body);
    await this.auditService.log('device.update', 'devices', request?.user?.id, { deviceId: id });
    return updated;
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string, @Req() request?: { user?: { id: string } }) {
    const result = await this.devicesService.remove(id);
    await this.auditService.log('device.delete', 'devices', request?.user?.id, { deviceId: id });
    return result;
  }
}
