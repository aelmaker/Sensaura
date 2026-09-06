import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';

@Controller('devices')
export class DevicesController {
  @Get()
  @Roles('admin', 'analyst', 'operator', 'viewer')
  list() {
    return [
      { id: 'device-1', status: 'online' },
      { id: 'device-2', status: 'offline' },
    ];
  }
}
