import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Get('status')
  @Roles('admin', 'operator', 'analyst')
  status() {
    return this.ingestionService.getStatus();
  }
}
