import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';

type InteractionRow = {
  id: string;
  device_id: string | null;
  campaign_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  created_at: Date;
};

interface InteractionInput {
  deviceId?: string;
  campaignId?: string;
  type?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class InteractionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    filters: { type?: string; deviceId?: string; campaignId?: string },
    limit = 20,
    offset = 0,
  ) {
    const result = await this.databaseService.query<InteractionRow>(
      `SELECT id, device_id, campaign_id, type, payload, created_at
       FROM interactions
       WHERE ($1::text IS NULL OR type = $1)
         AND ($2::uuid IS NULL OR device_id = $2)
         AND ($3::uuid IS NULL OR campaign_id = $3)
       ORDER BY created_at DESC
       LIMIT $4 OFFSET $5`,
      [
        filters.type ?? null,
        filters.deviceId ?? null,
        filters.campaignId ?? null,
        limit,
        offset,
      ],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async create(input: InteractionInput) {
    const type = input.type?.trim();
    if (!type) {
      throw new BadRequestException('type is required');
    }

    const result = await this.databaseService.query<InteractionRow>(
      `INSERT INTO interactions (id, device_id, campaign_id, type, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, device_id, campaign_id, type, payload, created_at`,
      [
        randomUUID(),
        input.deviceId ?? null,
        input.campaignId ?? null,
        type,
        JSON.stringify(input.payload ?? {}),
      ],
    );

    return this.mapRow(result.rows[0]);
  }

  async remove(id: string) {
    const result = await this.databaseService.query(
      'DELETE FROM interactions WHERE id = $1',
      [id],
    );
    if (!result.rowCount) {
      throw new NotFoundException('interaction not found');
    }

    return { status: 'deleted' };
  }

  private mapRow(row: InteractionRow) {
    return {
      id: row.id,
      deviceId: row.device_id,
      campaignId: row.campaign_id,
      type: row.type,
      payload: row.payload,
      createdAt: row.created_at.toISOString(),
    };
  }
}
