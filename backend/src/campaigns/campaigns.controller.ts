import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';

@Controller('campaigns')
export class CampaignsController {
  @Get()
  @Roles('admin', 'operator')
  list() {
    return [{ id: 'campaign-1', name: 'Welcome Flow', status: 'active' }];
  }
}
