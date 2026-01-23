import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(dbBinding: D1Database) {
  return drizzle(dbBinding, { schema });
}
