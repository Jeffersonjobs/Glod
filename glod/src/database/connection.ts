/**
 * Local SQLite connection (node:sqlite, no network, no external services).
 * Opens ./data/glod.db (or SQLITE_PATH) and bootstraps the schema.
 * The `uri` argument is accepted for call compatibility but ignored:
 * anything looking like a MongoDB URI falls back to the SQLite path.
 * @module database/connection
 */
import { config } from '../config.js';
import { initDatabase } from './sqlite.js';
import { logger } from '../utils/logger.js';

function isMongoUri(value: string): boolean {
  return /^mongodb(\+srv)?:\/\//i.test(value.trim());
}

export async function connectDatabase(uri?: string): Promise<void> {
  const requested = (uri ?? '').trim();
  const dbPath = !requested || isMongoUri(requested) ? config.sqlitePath : requested;
  initDatabase(dbPath);
  logger.info(`[db] Connected to SQLite (${dbPath})`);
}
