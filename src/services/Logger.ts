import { D1Database } from '@cloudflare/workers-types';
import { getDb } from '../db';
import { systemLogs } from '../db/schema';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export class Logger {
  private db;

  constructor(d1: D1Database) {
    this.db = getDb(d1);
  }

  private async log(level: LogLevel, message: string, source: string, metadata?: Record<string, any>) {
    // 1. Log to Console (Worker Observability)
    const timestamp = new Date().toISOString();
    const metaStr = metadata ? JSON.stringify(metadata) : '';
    console.log(`[${timestamp}] [${level}] [${source}] ${message} ${metaStr}`);

    // 2. Log to D1 (Async - do not await if speed is critical, but here we await for safety/verification)
    // In high throughput, we might want to use ctx.waitUntil, but Logger usually doesn't have access to ctx unless passed.
    // For now, we await to ensure persistence.
    try {
      await this.db.insert(systemLogs).values({
        level,
        message,
        source,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });
    } catch (e) {
      console.error(`[Logger] Failed to write to D1:`, e);
    }
  }

  async info(message: string, source: string, metadata?: Record<string, any>) {
    await this.log('INFO', message, source, metadata);
  }

  async warn(message: string, source: string, metadata?: Record<string, any>) {
    await this.log('WARN', message, source, metadata);
  }

  async error(message: string, source: string, metadata?: Record<string, any>) {
    await this.log('ERROR', message, source, metadata);
  }
}
