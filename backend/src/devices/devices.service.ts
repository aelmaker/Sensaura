import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';

type DeviceRow = {
  id: string;
  name: string;
  status: string;
  location: string | null;
  created_at: Date;
  updated_at: Date;
};

interface DeviceInput {
  name?: string;
  status?: string;
  location?: string;
}

@Injectable()
export class DevicesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(status?: string, limit = 20, offset = 0) {
    const result = await this.databaseService.query<DeviceRow>(
      `SELECT id, name, status, location, created_at, updated_at
       FROM devices
       WHERE ($1::text IS NULL OR status = $1)
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [status ?? null, limit, offset],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async create(input: DeviceInput) {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const status = input.status?.trim() || 'offline';

    const result = await this.databaseService.query<DeviceRow>(
      `INSERT INTO devices (id, name, status, location)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, status, location, created_at, updated_at`,
      [randomUUID(), name, status, input.location?.trim() || null],
    );

    return this.mapRow(result.rows[0]);
  }

  async update(id: string, input: DeviceInput) {
    const result = await this.databaseService.query<DeviceRow>(
      `UPDATE devices
       SET name = COALESCE($2, name),
           status = COALESCE($3, status),
           location = COALESCE($4, location),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, status, location, created_at, updated_at`,
      [
        id,
        input.name?.trim() || null,
        input.status?.trim() || null,
        input.location?.trim() || null,
      ],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('device not found');
    }

    return this.mapRow(result.rows[0]);
  }

  async remove(id: string) {
    const result = await this.databaseService.query(
      'DELETE FROM devices WHERE id = $1',
      [id],
    );

    if (!result.rowCount) {
      throw new NotFoundException('device not found');
    }

    return { status: 'deleted' };
  }

  private mapRow(row: DeviceRow) {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      location: row.location,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
