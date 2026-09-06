import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';

@Controller('interactions')
export class InteractionsController {
  @Get()
  @Roles('admin', 'analyst', 'operator')
  list() {
    return [
      { id: 'interaction-1', type: 'button_click', deviceId: 'device-1' },
    ];
  }
}
