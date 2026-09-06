import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  budget: string;
  starts_at: Date | null;
  ends_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

interface CampaignInput {
  name?: string;
  status?: string;
  budget?: number;
  startsAt?: string;
  endsAt?: string;
}

@Injectable()
export class CampaignsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(status?: string, limit = 20, offset = 0) {
    const result = await this.databaseService.query<CampaignRow>(
      `SELECT id, name, status, budget, starts_at, ends_at, created_at, updated_at
       FROM campaigns
       WHERE ($1::text IS NULL OR status = $1)
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [status ?? null, limit, offset],
    );

    return result.rows.map(this.mapRow);
  }

  async create(input: CampaignInput) {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const budget = Number(input.budget ?? 0);
    if (!Number.isFinite(budget) || budget < 0) {
      throw new BadRequestException('budget must be a non-negative number');
    }

    const result = await this.databaseService.query<CampaignRow>(
      `INSERT INTO campaigns (id, name, status, budget, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, status, budget, starts_at, ends_at, created_at, updated_at`,
      [
        randomUUID(),
        name,
        input.status?.trim() || 'draft',
        budget,
        input.startsAt ? new Date(input.startsAt) : null,
        input.endsAt ? new Date(input.endsAt) : null,
      ],
    );

    return this.mapRow(result.rows[0]);
  }

  async update(id: string, input: CampaignInput) {
    const budget = input.budget === undefined ? null : Number(input.budget);
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      throw new BadRequestException('budget must be a non-negative number');
    }

    const result = await this.databaseService.query<CampaignRow>(
      `UPDATE campaigns
       SET name = COALESCE($2, name),
           status = COALESCE($3, status),
           budget = COALESCE($4, budget),
           starts_at = COALESCE($5, starts_at),
           ends_at = COALESCE($6, ends_at),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, status, budget, starts_at, ends_at, created_at, updated_at`,
      [
        id,
        input.name?.trim() || null,
        input.status?.trim() || null,
        budget,
        input.startsAt ? new Date(input.startsAt) : null,
        input.endsAt ? new Date(input.endsAt) : null,
      ],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('campaign not found');
    }

    return this.mapRow(result.rows[0]);
  }

  async remove(id: string) {
    const result = await this.databaseService.query('DELETE FROM campaigns WHERE id = $1', [id]);
    if (!result.rowCount) {
      throw new NotFoundException('campaign not found');
    }

    return { status: 'deleted' };
  }

  private mapRow(row: CampaignRow) {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      budget: Number(row.budget),
      startsAt: row.starts_at?.toISOString() ?? null,
      endsAt: row.ends_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
