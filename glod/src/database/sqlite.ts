/**
 * Local SQLite persistence via `node:sqlite` (built into Node, no new
 * dependencies, no external services). Single shared `DatabaseSync`
 * singleton + schema bootstrap + small query helpers used by the models.
 * @module database/sqlite
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS guild_settings (
  guildId TEXT PRIMARY KEY,
  locale TEXT NOT NULL DEFAULT 'en',
  welcome TEXT NOT NULL DEFAULT '{}',
  security TEXT NOT NULL DEFAULT '{}',
  leveling TEXT NOT NULL DEFAULT '{}',
  ticketCategoryIds TEXT NOT NULL DEFAULT '[]',
  ticketLogChannelId TEXT,
  suggestionChannelId TEXT,
  suggestionLogChannelId TEXT,
  muteRoleId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS warnings (
  id TEXT PRIMARY KEY,
  guildId TEXT NOT NULL,
  userId TEXT NOT NULL,
  moderatorId TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'No reason provided',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings (guildId, userId);
CREATE TABLE IF NOT EXISTS economy_users (
  guildId TEXT NOT NULL,
  userId TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  bank INTEGER NOT NULL DEFAULT 0,
  lastDailyAt TEXT,
  lastWorkAt TEXT,
  inventory TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (guildId, userId)
);
CREATE TABLE IF NOT EXISTS shop_items (
  guildId TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (guildId, name)
);
CREATE TABLE IF NOT EXISTS levels (
  guildId TEXT NOT NULL,
  userId TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  lastXpAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (guildId, userId)
);
CREATE INDEX IF NOT EXISTS idx_levels_guild_xp ON levels (guildId, xp DESC);
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  guildId TEXT,
  userId TEXT NOT NULL,
  channelId TEXT NOT NULL,
  text TEXT NOT NULL,
  remindAt TEXT NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders (remindAt, delivered);
CREATE TABLE IF NOT EXISTS giveaways (
  id TEXT PRIMARY KEY,
  guildId TEXT NOT NULL,
  channelId TEXT NOT NULL,
  messageId TEXT,
  prize TEXT NOT NULL,
  winnerCount INTEGER NOT NULL DEFAULT 1,
  endsAt TEXT NOT NULL,
  ended INTEGER NOT NULL DEFAULT 0,
  entrants TEXT NOT NULL DEFAULT '[]',
  requiredRoleId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_giveaways_guild ON giveaways (guildId, ended);
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  guildId TEXT NOT NULL,
  channelId TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  claimedBy TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets (guildId, status);
CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  guildId TEXT NOT NULL,
  channelId TEXT NOT NULL,
  messageId TEXT,
  authorId TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  upvotes TEXT NOT NULL DEFAULT '[]',
  downvotes TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reaction_roles (
  id TEXT PRIMARY KEY,
  guildId TEXT NOT NULL,
  channelId TEXT NOT NULL,
  messageId TEXT NOT NULL,
  mapping TEXT NOT NULL DEFAULT '{}',
  type TEXT NOT NULL DEFAULT 'button',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reaction_roles_message ON reaction_roles (messageId);
CREATE TABLE IF NOT EXISTS mascotas (
  guildId TEXT NOT NULL,
  userId TEXT NOT NULL,
  nombre TEXT NOT NULL,
  especie TEXT NOT NULL,
  hambre INTEGER NOT NULL DEFAULT 80,
  felicidad INTEGER NOT NULL DEFAULT 70,
  energia INTEGER NOT NULL DEFAULT 90,
  salud INTEGER NOT NULL DEFAULT 100,
  dormida INTEGER NOT NULL DEFAULT 0,
  lastCuraAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (guildId, userId)
);
CREATE INDEX IF NOT EXISTS idx_mascotas_guild ON mascotas (guildId);
`;

let db: DatabaseSync | null = null;
let openedPath = '';

/** Resolve the SQLite file path (absolute). Defaults to ./data/glod.db. */
export function resolveDbPath(input?: string): string {
  const raw = (input ?? process.env.SQLITE_PATH ?? './data/glod.db').trim() || './data/glod.db';
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

/**
 * Open (or reuse) the singleton database, creating ./data and all tables.
 * Synchronous under the hood; callers may await it via connectDatabase().
 */
export function initDatabase(dbPathInput?: string): DatabaseSync {
  const file = resolveDbPath(dbPathInput);
  if (db && openedPath === file) return db;
  if (db) {
    try {
      db.close();
    } catch {
      /* ignore close errors on re-open */
    }
    db = null;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const instance = new DatabaseSync(file);
  instance.exec('PRAGMA busy_timeout = 5000;');
  instance.exec(SCHEMA);
  db = instance;
  openedPath = file;
  return instance;
}

/** Get the singleton, lazily opening it with defaults if needed. */
export function getDb(): DatabaseSync {
  if (!db) return initDatabase();
  return db;
}

/** True once the local database file has been opened. */
export function isDbReady(): boolean {
  return db !== null;
}

/** Current timestamp as ISO string (TEXT storage). */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Random id for TEXT PRIMARY KEY columns (replaces ObjectId). */
export function genId(): string {
  return randomUUID();
}

/** Bound parameter type for prepared statements. */
export type SqlParam = string | number | bigint | null;

/** Raw row returned by node:sqlite (column -> value). */
export type SqlRow = Record<string, string | number | bigint | Uint8Array | null>;

/** Convert a filter/update value to a storable SQL parameter. */
export function toSqlParam(value: unknown): SqlParam {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') return value;
  return JSON.stringify(value);
}

/** Equality/operator filter shape accepted by the models. */
export type Filter = Record<string, unknown>;

/** Sort spec: 1 ascending, -1 descending (mongoose-compatible). */
export type SortSpec = Record<string, 1 | -1>;

/** Map of document field names to physical column names. */
export type ColumnMap = Record<string, string>;

const COMPARISON_OPS = new Set(['$lte', '$lt', '$gte', '$gt', '$ne', '$eq', '$in']);

/**
 * Translate a simple mongoose-style filter into a WHERE clause.
 * Supports plain equality (incl. `_id` -> `id` via ColumnMap) plus
 * $lte/$lt/$gte/$gt/$ne/$eq/$in operators (used for remindAt/endsAt).
 */
export function buildWhere(filter: Filter | undefined, cols: ColumnMap): { clause: string; params: SqlParam[] } {
  const parts: string[] = [];
  const params: SqlParam[] = [];
  for (const [field, raw] of Object.entries(filter ?? {})) {
    if (raw === undefined) continue;
    const col = cols[field] ?? field;
    if (raw !== null && typeof raw === 'object' && !(raw instanceof Date) && !Array.isArray(raw)) {
      const ops = raw as Record<string, unknown>;
      const keys = Object.keys(ops);
      if (keys.length > 0 && keys.every((k) => COMPARISON_OPS.has(k))) {
        for (const [op, oval] of Object.entries(ops)) {
          if (oval === undefined) continue;
          switch (op) {
            case '$lte':
              parts.push(`${col} <= ?`);
              params.push(toSqlParam(oval));
              break;
            case '$lt':
              parts.push(`${col} < ?`);
              params.push(toSqlParam(oval));
              break;
            case '$gte':
              parts.push(`${col} >= ?`);
              params.push(toSqlParam(oval));
              break;
            case '$gt':
              parts.push(`${col} > ?`);
              params.push(toSqlParam(oval));
              break;
            case '$ne':
              if (oval === null) parts.push(`${col} IS NOT NULL`);
              else {
                parts.push(`${col} != ?`);
                params.push(toSqlParam(oval));
              }
              break;
            case '$eq':
              if (oval === null) parts.push(`${col} IS NULL`);
              else {
                parts.push(`${col} = ?`);
                params.push(toSqlParam(oval));
              }
              break;
            case '$in': {
              const list = (Array.isArray(oval) ? oval : [oval]).map(toSqlParam);
              if (list.length === 0) parts.push('1 = 0');
              else {
                parts.push(`${col} IN (${list.map(() => '?').join(', ')})`);
                params.push(...list);
              }
              break;
            }
          }
        }
        continue;
      }
    }
    if (raw === null) parts.push(`${col} IS NULL`);
    else {
      parts.push(`${col} = ?`);
      params.push(toSqlParam(raw));
    }
  }
  return { clause: parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '', params };
}

/** Translate a mongoose-style sort spec into ORDER BY. */
export function buildOrderBy(sort: SortSpec | undefined, cols: ColumnMap): string {
  const entries = Object.entries(sort ?? {});
  if (entries.length === 0) return '';
  return `ORDER BY ${entries.map(([field, dir]) => `${cols[field] ?? field} ${dir === -1 ? 'DESC' : 'ASC'}`).join(', ')}`;
}

/**
 * Mongoose-compatible chainable query: `Model.find(filter).sort({...}).limit(n)`
 * is awaitable (executes against SQLite when awaited).
 */
export class SqlQuery<T> implements PromiseLike<T[]> {
  private sortSpec?: SortSpec;
  private limitN?: number;

  constructor(private readonly executor: (sort?: SortSpec, limit?: number) => T[]) {}

  sort(spec: SortSpec): this {
    this.sortSpec = spec;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return new Promise<T[]>((resolve, reject) => {
      try {
        resolve(this.executor(this.sortSpec, this.limitN));
      } catch (err) {
        reject(err);
      }
    }).then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T[] | TResult> {
    return this.then(undefined, onrejected);
  }
}

// ── Row readers (strict-safe, no any) ──

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return fallback;
}

export function asStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return null;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function asBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return value !== 0 && value !== BigInt(0);
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return false;
}

export function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function asDateOrNow(value: unknown): Date {
  return asDate(value) ?? new Date();
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch {
      return [];
    }
  }
  return [];
}

export function asStringRecord(value: unknown): Record<string, string> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = String(v);
    return out;
  }
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) out[k] = String(v);
        return out;
      }
    } catch {
      return {};
    }
  }
  return {};
}
