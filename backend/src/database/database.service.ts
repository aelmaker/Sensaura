import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool, type QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  private ready = false;

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      this.logger.log('Database init skipped in test mode');
      return;
    }

    this.pool = new Pool({
      host: process.env.PGHOST ?? 'localhost',
      port: Number(process.env.PGPORT ?? 5432),
      database: process.env.PGDATABASE ?? 'sensaura',
      user: process.env.PGUSER ?? 'postgres',
      password: process.env.PGPASSWORD ?? 'postgres',
      max: Number(process.env.PGPOOL_MAX ?? 20),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });

    await this.pool.query('SELECT 1');
    await this.initializeSchema();
    this.ready = true;
    this.logger.log('Database connected and schema initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
    this.pool = null;
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }

  async query<T = unknown>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database is not initialized');
    }

    return this.pool.query<T>(text, params);
  }

  private async initializeSchema(): Promise<void> {
    if (!this.pool) {
      return;
    }

    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf8');
    await this.pool.query(schemaSql);
  }
}
