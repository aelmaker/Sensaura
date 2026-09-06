import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { parsePagination } from '../common/dto/pagination.dto';
import { Roles } from '../common/roles.decorator';
import { InteractionsService } from './interactions.service';

@Controller('interactions')
export class InteractionsController {
  constructor(
    private readonly interactionsService: InteractionsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'analyst', 'operator', 'viewer')
  list(
    @Query('type') type?: string,
    @Query('deviceId') deviceId?: string,
    @Query('campaignId') campaignId?: string,
    @Query() query?: { limit?: string; offset?: string },
  ) {
    const { limit, offset } = parsePagination(query ?? {});
    return this.interactionsService.list(
      { type, deviceId, campaignId },
      limit,
      offset,
    );
  }

  @Post()
  @Roles('admin', 'operator')
  async create(
    @Body()
    body: {
      deviceId?: string;
      campaignId?: string;
      type?: string;
      payload?: Record<string, unknown>;
    },
    @Req() request?: { user?: { id: string } },
  ) {
    const created = await this.interactionsService.create(body);
    await this.auditService.log(
      'interaction.create',
      'interactions',
      request?.user?.id,
      {
        interactionId: created.id,
      },
    );
    return created;
  }

  @Delete(':id')
  @Roles('admin')
  async remove(
    @Param('id') id: string,
    @Req() request?: { user?: { id: string } },
  ) {
    const result = await this.interactionsService.remove(id);
    await this.auditService.log(
      'interaction.delete',
      'interactions',
      request?.user?.id,
      {
        interactionId: id,
      },
    );
    return result;
  }
}
