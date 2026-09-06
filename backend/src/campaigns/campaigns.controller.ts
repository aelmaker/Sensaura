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
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'analyst', 'operator', 'viewer')
  list(@Query('status') status?: string, @Query() query?: { limit?: string; offset?: string }) {
    const { limit, offset } = parsePagination(query ?? {});
    return this.campaignsService.list(status, limit, offset);
  }

  @Post()
  @Roles('admin', 'operator')
  async create(
    @Body()
    body: { name?: string; status?: string; budget?: number; startsAt?: string; endsAt?: string },
    @Req() request?: { user?: { id: string } },
  ) {
    const created = await this.campaignsService.create(body);
    await this.auditService.log('campaign.create', 'campaigns', request?.user?.id, {
      campaignId: created.id,
    });
    return created;
  }

  @Patch(':id')
  @Roles('admin', 'operator')
  async update(
    @Param('id') id: string,
    @Body()
    body: { name?: string; status?: string; budget?: number; startsAt?: string; endsAt?: string },
    @Req() request?: { user?: { id: string } },
  ) {
    const updated = await this.campaignsService.update(id, body);
    await this.auditService.log('campaign.update', 'campaigns', request?.user?.id, {
      campaignId: id,
    });
    return updated;
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string, @Req() request?: { user?: { id: string } }) {
    const result = await this.campaignsService.remove(id);
    await this.auditService.log('campaign.delete', 'campaigns', request?.user?.id, {
      campaignId: id,
    });
    return result;
  }
}
