import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async log(action: string, resource: string, userId?: string, metadata: Record<string, unknown> = {}): Promise<void> {
    try {
      await this.databaseService.query(
        `INSERT INTO audit_logs (user_id, action, resource, metadata)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [userId ?? null, action, resource, JSON.stringify(metadata)],
      );
    } catch (error) {
      this.logger.warn(`Audit log failure: ${(error as Error).message}`);
    }
  }
}
