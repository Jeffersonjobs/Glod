/**
 * Tickets + panels, XP levels, economy, giveaways, suggestions, roles, reminders.
 * SQLite-backed replacements of the former mongoose models. Same exported
 * names and a compatible API: chainable find().sort().limit(), findOne,
 * findById, findOneAndUpdate/findByIdAndUpdate (upsert, $setOnInsert, $inc,
 * plain-object updates), create, save(), deleteOne/deleteMany,
 * countDocuments. node:sqlite is synchronous; async only in signatures.
 * @module database/models/index
 */
import {
  SqlQuery,
  asBool,
  asDate,
  asDateOrNow,
  asNumber,
  asString,
  asStringArray,
  asStringOrNull,
  asStringRecord,
  buildOrderBy,
  buildWhere,
  genId,
  getDb,
  nowIso,
  type ColumnMap,
  type Filter,
  type SortSpec,
  type SqlRow,
} from '../sqlite.js';

// ── Shared helpers ──

type UpdateInput = Record<string, unknown>;

interface UpdateOptions {
  upsert?: boolean;
  /** Kept for mongoose signature compatibility; the updated doc is returned. */
  new?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

/** Direct assignments: top-level non-$ keys plus $set. */
function plainSets(update: UpdateInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(update)) {
    if (!k.startsWith('$')) out[k] = v;
  }
  const s = update.$set;
  if (isRecord(s)) Object.assign(out, s);
  return out;
}

function incSets(update: UpdateInput): Record<string, unknown> {
  const i = update.$inc;
  return isRecord(i) ? i : {};
}

function insertSets(update: UpdateInput): Record<string, unknown> {
  const i = update.$setOnInsert;
  return isRecord(i) ? i : {};
}

/** Plain equality filter entries (operators skipped), mapping `_id` -> `id`. */
function equalityFields(filter: Filter, cols: ColumnMap): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [field, v] of Object.entries(filter)) {
    if (v === undefined) continue;
    if (isRecord(v)) continue;
    if (Array.isArray(v)) continue;
    out[field === '_id' ? 'id' : (cols[field] ?? field)] = v;
  }
  return out;
}

function runFind<T>(table: string, cols: ColumnMap, filter: Filter, fromRow: (row: SqlRow) => T): SqlQuery<T> {
  return new SqlQuery<T>((sort?: SortSpec, limit?: number) => {
    const db = getDb();
    const { clause, params } = buildWhere(filter, cols);
    const order = buildOrderBy(sort, cols);
    const lim = limit !== undefined ? `LIMIT ${Math.max(0, Math.floor(limit))}` : '';
    const rows = db.prepare(`SELECT * FROM ${table} ${clause} ${order} ${lim}`).all(...params) as SqlRow[];
    return rows.map((r) => fromRow(r));
  });
}

function runFindOne<T>(table: string, cols: ColumnMap, filter: Filter, fromRow: (row: SqlRow) => T): T | null {
  const db = getDb();
  const { clause, params } = buildWhere(filter, cols);
  const row = db.prepare(`SELECT * FROM ${table} ${clause} LIMIT 1`).get(...params) as SqlRow | undefined;
  return row ? fromRow(row) : null;
}

function runDelete(table: string, cols: ColumnMap, filter: Filter): number {
  const db = getDb();
  const { clause, params } = buildWhere(filter, cols);
  if (!clause) return 0;
  const res = db.prepare(`DELETE FROM ${table} ${clause}`).run(...params);
  return Number(res.changes);
}

function runCount(table: string, cols: ColumnMap, filter: Filter): number {
  const db = getDb();
  const { clause, params } = buildWhere(filter, cols);
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table} ${clause}`).get(...params) as SqlRow | undefined;
  return asNumber(row?.n, 0);
}

function addNumber(current: number, by: unknown): number {
  const delta = typeof by === 'number' ? by : Number(by);
  return current + (Number.isFinite(delta) ? delta : 0);
}

// ── Tickets ──

const TICKET_COLS: ColumnMap = {
  _id: 'id', id: 'id', guildId: 'guildId', channelId: 'channelId',
  ownerId: 'ownerId', claimedBy: 'claimedBy', category: 'category',
  status: 'status', createdAt: 'createdAt', updatedAt: 'updatedAt',
};

export class Ticket {
  _id: string;
  guildId: string;
  channelId: string;
  ownerId: string;
  claimedBy: string | null;
  category: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(init: {
    _id?: string; id?: string; guildId: string; channelId: string; ownerId: string;
    claimedBy?: string | null; category?: string; status?: string;
    createdAt?: Date; updatedAt?: Date;
  }) {
    this._id = init._id ?? init.id ?? genId();
    this.guildId = init.guildId;
    this.channelId = init.channelId;
    this.ownerId = init.ownerId;
    this.claimedBy = init.claimedBy ?? null;
    this.category = init.category ?? 'general';
    this.status = init.status ?? 'open';
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  async save(): Promise<this> {
    const now = nowIso();
    this.updatedAt = new Date(now);
    getDb().prepare(
      `INSERT INTO tickets (id, guildId, channelId, ownerId, claimedBy, category, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        guildId = excluded.guildId, channelId = excluded.channelId, ownerId = excluded.ownerId,
        claimedBy = excluded.claimedBy, category = excluded.category, status = excluded.status,
        updatedAt = excluded.updatedAt`,
    ).run(this._id, this.guildId, this.channelId, this.ownerId, this.claimedBy, this.category, this.status, this.createdAt.toISOString(), now);
    return this;
  }

  private applyUpdate(update: UpdateInput): void {
    const sets = plainSets(update);
    if (sets.claimedBy !== undefined) this.claimedBy = asStringOrNull(sets.claimedBy);
    if (sets.status !== undefined) this.status = asString(sets.status, this.status);
    if (sets.category !== undefined) this.category = asString(sets.category, this.category);
    if (sets.channelId !== undefined) this.channelId = asString(sets.channelId, this.channelId);
    if (sets.ownerId !== undefined) this.ownerId = asString(sets.ownerId, this.ownerId);
  }

  static fromRow(row: SqlRow): Ticket {
    return new Ticket({
      _id: asString(row.id), guildId: asString(row.guildId), channelId: asString(row.channelId),
      ownerId: asString(row.ownerId), claimedBy: asStringOrNull(row.claimedBy),
      category: asString(row.category, 'general'), status: asString(row.status, 'open'),
      createdAt: asDateOrNow(row.createdAt), updatedAt: asDateOrNow(row.updatedAt),
    });
  }

  static find(filter: Filter = {}): SqlQuery<Ticket> {
    return runFind('tickets', TICKET_COLS, filter, Ticket.fromRow);
  }

  static async findOne(filter: Filter): Promise<Ticket | null> {
    return runFindOne('tickets', TICKET_COLS, filter, Ticket.fromRow);
  }

  static async findById(id: string): Promise<Ticket | null> {
    return runFindOne('tickets', TICKET_COLS, { _id: id }, Ticket.fromRow);
  }

  static async create(data: {
    guildId: string; channelId: string; ownerId: string;
    claimedBy?: string | null; category?: string; status?: string;
  }): Promise<Ticket> {
    const doc = new Ticket({ ...data });
    await doc.save();
    return doc;
  }

  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options: UpdateOptions & { upsert: true }): Promise<Ticket>;
  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options?: UpdateOptions): Promise<Ticket | null>;
  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options: UpdateOptions = {}): Promise<Ticket | null> {
    const existing = await Ticket.findOne(filter);
    if (existing) {
      existing.applyUpdate(update);
      await existing.save();
      return existing;
    }
    if (!options.upsert) return null;
    const eq = equalityFields(filter, TICKET_COLS);
    const doc = new Ticket({
      guildId: asString(eq.guildId ?? insertSets(update).guildId),
      channelId: asString(eq.channelId ?? insertSets(update).channelId),
      ownerId: asString(eq.ownerId ?? insertSets(update).ownerId),
    });
    doc.applyUpdate({ ...insertSets(update), ...plainSets(update) });
    await doc.save();
    return doc;
  }
}

// ── Leveling ──

const LEVEL_COLS: ColumnMap = {
  guildId: 'guildId', userId: 'userId', xp: 'xp', level: 'level',
  lastXpAt: 'lastXpAt', createdAt: 'createdAt', updatedAt: 'updatedAt',
};

export class Level {
  guildId: string;
  userId: string;
  xp: number;
  level: number;
  lastXpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Present for mongoose-shape compatibility; unused with composite PK. */
  _id: string;

  constructor(init: {
    guildId: string; userId: string; xp?: number; level?: number;
    lastXpAt?: Date | null; createdAt?: Date; updatedAt?: Date;
  }) {
    this.guildId = init.guildId;
    this.userId = init.userId;
    this.xp = init.xp ?? 0;
    this.level = init.level ?? 0;
    this.lastXpAt = init.lastXpAt ?? null;
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
    this._id = `${init.guildId}:${init.userId}`;
  }

  get id(): string {
    return this._id;
  }

  async save(): Promise<this> {
    const now = nowIso();
    this.updatedAt = new Date(now);
    getDb().prepare(
      `INSERT INTO levels (guildId, userId, xp, level, lastXpAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (guildId, userId) DO UPDATE SET
        xp = excluded.xp, level = excluded.level, lastXpAt = excluded.lastXpAt, updatedAt = excluded.updatedAt`,
    ).run(this.guildId, this.userId, Math.floor(this.xp), Math.floor(this.level), this.lastXpAt ? this.lastXpAt.toISOString() : null, this.createdAt.toISOString(), now);
    return this;
  }

  private applyUpdate(update: UpdateInput): void {
    const sets = plainSets(update);
    if (sets.xp !== undefined) this.xp = asNumber(sets.xp, this.xp);
    if (sets.level !== undefined) this.level = asNumber(sets.level, this.level);
    if (sets.lastXpAt !== undefined) this.lastXpAt = asDate(sets.lastXpAt);
    for (const [k, v] of Object.entries(incSets(update))) {
      if (k === 'xp') this.xp = addNumber(this.xp, v);
      if (k === 'level') this.level = addNumber(this.level, v);
    }
  }

  static fromRow(row: SqlRow): Level {
    return new Level({
      guildId: asString(row.guildId), userId: asString(row.userId),
      xp: asNumber(row.xp, 0), level: asNumber(row.level, 0),
      lastXpAt: asDate(row.lastXpAt),
      createdAt: asDateOrNow(row.createdAt), updatedAt: asDateOrNow(row.updatedAt),
    });
  }

  static find(filter: Filter = {}): SqlQuery<Level> {
    return runFind('levels', LEVEL_COLS, filter, Level.fromRow);
  }

  static async findOne(filter: Filter): Promise<Level | null> {
    return runFindOne('levels', LEVEL_COLS, filter, Level.fromRow);
  }

  static async create(data: {
    guildId: string; userId: string; xp?: number; level?: number; lastXpAt?: Date | null;
  }): Promise<Level> {
    const doc = new Level({ ...data });
    await doc.save();
    return doc;
  }

  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options: UpdateOptions & { upsert: true }): Promise<Level>;
  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options?: UpdateOptions): Promise<Level | null>;
  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options: UpdateOptions = {}): Promise<Level | null> {
    const existing = await Level.findOne(filter);
    if (existing) {
      existing.applyUpdate(update);
      await existing.save();
      return existing;
    }
    if (!options.upsert) return null;
    const eq = equalityFields(filter, LEVEL_COLS);
    const soi = insertSets(update);
    const doc = new Level({
      guildId: asString(eq.guildId ?? soi.guildId),
      userId: asString(eq.userId ?? soi.userId),
      xp: asNumber(soi.xp ?? plainSets(update).xp, 0),
      level: asNumber(soi.level ?? plainSets(update).level, 0),
    });
    doc.applyUpdate({ $inc: incSets(update) });
    await doc.save();
    return doc;
  }

  static async deleteOne(filter: Filter): Promise<{ deletedCount: number }> {
    return { deletedCount: runDelete('levels', LEVEL_COLS, filter) };
  }

  static async deleteMany(filter: Filter): Promise<{ deletedCount: number }> {
    return { deletedCount: runDelete('levels', LEVEL_COLS, filter) };
  }

  static async countDocuments(filter: Filter = {}): Promise<number> {
    return runCount('levels', LEVEL_COLS, filter);
  }

  /**
   * Minimal aggregate supporting the XP-stats pipeline:
   * [{ $match: { guildId } }, { $group: { _id: null, totalXp: { $sum: '$xp' }, users: { $sum: 1 } } }]
   */
  static async aggregate(pipeline: Array<Record<string, unknown>>): Promise<Array<{ totalXp: number; users: number }>> {
    let guildId: string | undefined;
    for (const stage of pipeline) {
      const match = stage.$match;
      if (isRecord(match) && typeof match.guildId === 'string') guildId = match.guildId;
    }
    const db = getDb();
    const row = (
      guildId !== undefined
        ? db.prepare('SELECT COUNT(*) AS users, COALESCE(SUM(xp), 0) AS totalXp FROM levels WHERE guildId = ?').get(guildId)
        : db.prepare('SELECT COUNT(*) AS users, COALESCE(SUM(xp), 0) AS totalXp FROM levels').get()
    ) as SqlRow | undefined;
    return [{ totalXp: asNumber(row?.totalXp, 0), users: asNumber(row?.users, 0) }];
  }
}

// ── Economy ──

const ECONOMY_COLS: ColumnMap = {
  guildId: 'guildId', userId: 'userId', balance: 'balance', bank: 'bank',
  lastDailyAt: 'lastDailyAt', lastWorkAt: 'lastWorkAt',
  inventory: 'inventory', createdAt: 'createdAt', updatedAt: 'updatedAt',
};

export class EconomyUser {
  guildId: string;
  userId: string;
  balance: number;
  bank: number;
  lastDailyAt: Date | null;
  lastWorkAt: Date | null;
  inventory: string[];
  createdAt: Date;
  updatedAt: Date;
  _id: string;

  constructor(init: {
    guildId: string; userId: string; balance?: number; bank?: number;
    lastDailyAt?: Date | null; lastWorkAt?: Date | null; inventory?: string[];
    createdAt?: Date; updatedAt?: Date;
  }) {
    this.guildId = init.guildId;
    this.userId = init.userId;
    this.balance = init.balance ?? 0;
    this.bank = init.bank ?? 0;
    this.lastDailyAt = init.lastDailyAt ?? null;
    this.lastWorkAt = init.lastWorkAt ?? null;
    this.inventory = init.inventory ?? [];
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
    this._id = `${init.guildId}:${init.userId}`;
  }

  get id(): string {
    return this._id;
  }

  async save(): Promise<this> {
    const now = nowIso();
    this.updatedAt = new Date(now);
    getDb().prepare(
      `INSERT INTO economy_users (guildId, userId, balance, bank, lastDailyAt, lastWorkAt, inventory, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (guildId, userId) DO UPDATE SET
        balance = excluded.balance, bank = excluded.bank, lastDailyAt = excluded.lastDailyAt,
        lastWorkAt = excluded.lastWorkAt, inventory = excluded.inventory, updatedAt = excluded.updatedAt`,
    ).run(
      this.guildId, this.userId, Math.floor(this.balance), Math.floor(this.bank),
      this.lastDailyAt ? this.lastDailyAt.toISOString() : null,
      this.lastWorkAt ? this.lastWorkAt.toISOString() : null,
      JSON.stringify(this.inventory), this.createdAt.toISOString(), now,
    );
    return this;
  }

  private applyUpdate(update: UpdateInput): void {
    const sets = plainSets(update);
    if (sets.balance !== undefined) this.balance = asNumber(sets.balance, this.balance);
    if (sets.bank !== undefined) this.bank = asNumber(sets.bank, this.bank);
    if (sets.lastDailyAt !== undefined) this.lastDailyAt = asDate(sets.lastDailyAt);
    if (sets.lastWorkAt !== undefined) this.lastWorkAt = asDate(sets.lastWorkAt);
    if (sets.inventory !== undefined) this.inventory = asStringArray(JSON.stringify(sets.inventory));
    for (const [k, v] of Object.entries(incSets(update))) {
      if (k === 'balance') this.balance = addNumber(this.balance, v);
      if (k === 'bank') this.bank = addNumber(this.bank, v);
    }
  }

  static fromRow(row: SqlRow): EconomyUser {
    return new EconomyUser({
      guildId: asString(row.guildId), userId: asString(row.userId),
      balance: asNumber(row.balance, 0), bank: asNumber(row.bank, 0),
      lastDailyAt: asDate(row.lastDailyAt), lastWorkAt: asDate(row.lastWorkAt),
      inventory: asStringArray(row.inventory),
      createdAt: asDateOrNow(row.createdAt), updatedAt: asDateOrNow(row.updatedAt),
    });
  }

  static find(filter: Filter = {}): SqlQuery<EconomyUser> {
    return runFind('economy_users', ECONOMY_COLS, filter, EconomyUser.fromRow);
  }

  static async findOne(filter: Filter): Promise<EconomyUser | null> {
    return runFindOne('economy_users', ECONOMY_COLS, filter, EconomyUser.fromRow);
  }

  static async create(data: {
    guildId: string; userId: string; balance?: number; bank?: number;
    lastDailyAt?: Date | null; lastWorkAt?: Date | null; inventory?: string[];
  }): Promise<EconomyUser> {
    const doc = new EconomyUser({ ...data });
    await doc.save();
    return doc;
  }

  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options: UpdateOptions & { upsert: true }): Promise<EconomyUser>;
  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options?: UpdateOptions): Promise<EconomyUser | null>;
  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options: UpdateOptions = {}): Promise<EconomyUser | null> {
    const existing = await EconomyUser.findOne(filter);
    if (existing) {
      existing.applyUpdate(update);
      await existing.save();
      return existing;
    }
    if (!options.upsert) return null;
    const eq = equalityFields(filter, ECONOMY_COLS);
    const soi = insertSets(update);
    const doc = new EconomyUser({
      guildId: asString(eq.guildId ?? soi.guildId),
      userId: asString(eq.userId ?? soi.userId),
      balance: asNumber(soi.balance ?? plainSets(update).balance, 0),
      bank: asNumber(soi.bank ?? plainSets(update).bank, 0),
    });
    doc.applyUpdate({ $inc: incSets(update) });
    doc.applyUpdate(plainSets(update));
    await doc.save();
    return doc;
  }

  static async countDocuments(filter: Filter = {}): Promise<number> {
    return runCount('economy_users', ECONOMY_COLS, filter);
  }
}

// ── Shop ──

const SHOP_COLS: ColumnMap = {
  guildId: 'guildId', name: 'name', price: 'price',
  description: 'description', createdAt: 'createdAt', updatedAt: 'updatedAt',
};

export class ShopItem {
  guildId: string;
  name: string;
  price: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  _id: string;

  constructor(init: {
    guildId: string; name: string; price?: number; description?: string;
    createdAt?: Date; updatedAt?: Date;
  }) {
    this.guildId = init.guildId;
    this.name = init.name;
    this.price = init.price ?? 0;
    this.description = init.description ?? '';
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
    this._id = `${init.guildId}:${init.name}`;
  }

  get id(): string {
    return this._id;
  }

  async save(): Promise<this> {
    const now = nowIso();
    this.updatedAt = new Date(now);
    getDb().prepare(
      `INSERT INTO shop_items (guildId, name, price, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (guildId, name) DO UPDATE SET
        price = excluded.price, description = excluded.description, updatedAt = excluded.updatedAt`,
    ).run(this.guildId, this.name, Math.floor(this.price), this.description, this.createdAt.toISOString(), now);
    return this;
  }

  private applyUpdate(update: UpdateInput): void {
    const sets = plainSets(update);
    if (sets.price !== undefined) this.price = asNumber(sets.price, this.price);
    if (sets.description !== undefined) this.description = asString(sets.description, this.description);
  }

  static fromRow(row: SqlRow): ShopItem {
    return new ShopItem({
      guildId: asString(row.guildId), name: asString(row.name),
      price: asNumber(row.price, 0), description: asString(row.description, ''),
      createdAt: asDateOrNow(row.createdAt), updatedAt: asDateOrNow(row.updatedAt),
    });
  }

  static find(filter: Filter = {}): SqlQuery<ShopItem> {
    return runFind('shop_items', SHOP_COLS, filter, ShopItem.fromRow);
  }

  static async findOne(filter: Filter): Promise<ShopItem | null> {
    return runFindOne('shop_items', SHOP_COLS, filter, ShopItem.fromRow);
  }

  static async create(data: { guildId: string; name: string; price: number; description?: string }): Promise<ShopItem> {
    const doc = new ShopItem({ ...data });
    await doc.save();
    return doc;
  }

  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options: UpdateOptions & { upsert: true }): Promise<ShopItem>;
  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options?: UpdateOptions): Promise<ShopItem | null>;
  static async findOneAndUpdate(filter: Filter, update: UpdateInput, options: UpdateOptions = {}): Promise<ShopItem | null> {
    const existing = await ShopItem.findOne(filter);
    if (existing) {
      existing.applyUpdate(update);
      await existing.save();
      return existing;
    }
    if (!options.upsert) return null;
    const eq = equalityFields(filter, SHOP_COLS);
    const soi = insertSets(update);
    const sets = plainSets(update);
    const doc = new ShopItem({
      guildId: asString(eq.guildId ?? soi.guildId),
      name: asString(eq.name ?? soi.name),
      price: asNumber(sets.price ?? soi.price, 0),
      description: asString(sets.description ?? soi.description, ''),
    });
    await doc.save();
    return doc;
  }
}

// ── Giveaways ──

const GIVEAWAY_COLS: ColumnMap = {
  _id: 'id', id: 'id', guildId: 'guildId', channelId: 'channelId',
  messageId: 'messageId', prize: 'prize', winnerCount: 'winnerCount',
  endsAt: 'endsAt', ended: 'ended', entrants: 'entrants',
  requiredRoleId: 'requiredRoleId', createdAt: 'createdAt', updatedAt: 'updatedAt',
};

export class Giveaway {
  _id: string;
  guildId: string;
  channelId: string;
  messageId: string | null;
  prize: string;
  winnerCount: number;
  endsAt: Date;
  ended: boolean;
  entrants: string[];
  requiredRoleId: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(init: {
    _id?: string; id?: string; guildId: string; channelId: string;
    messageId?: string | null; prize: string; winnerCount?: number;
    endsAt: Date; ended?: boolean; entrants?: string[];
    requiredRoleId?: string | null; createdAt?: Date; updatedAt?: Date;
  }) {
    this._id = init._id ?? init.id ?? genId();
    this.guildId = init.guildId;
    this.channelId = init.channelId;
    this.messageId = init.messageId ?? null;
    this.prize = init.prize;
    this.winnerCount = init.winnerCount ?? 1;
    this.endsAt = init.endsAt;
    this.ended = init.ended ?? false;
    this.entrants = init.entrants ?? [];
    this.requiredRoleId = init.requiredRoleId ?? null;
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  async save(): Promise<this> {
    const now = nowIso();
    this.updatedAt = new Date(now);
    getDb().prepare(
      `INSERT INTO giveaways (id, guildId, channelId, messageId, prize, winnerCount, endsAt, ended, entrants, requiredRoleId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        guildId = excluded.guildId, channelId = excluded.channelId, messageId = excluded.messageId,
        prize = excluded.prize, winnerCount = excluded.winnerCount, endsAt = excluded.endsAt,
        ended = excluded.ended, entrants = excluded.entrants, requiredRoleId = excluded.requiredRoleId,
        updatedAt = excluded.updatedAt`,
    ).run(
      this._id, this.guildId, this.channelId, this.messageId, this.prize,
      Math.floor(this.winnerCount), this.endsAt.toISOString(), this.ended ? 1 : 0,
      JSON.stringify(this.entrants), this.requiredRoleId, this.createdAt.toISOString(), now,
    );
    return this;
  }

  static fromRow(row: SqlRow): Giveaway {
    return new Giveaway({
      _id: asString(row.id), guildId: asString(row.guildId), channelId: asString(row.channelId),
      messageId: asStringOrNull(row.messageId), prize: asString(row.prize),
      winnerCount: asNumber(row.winnerCount, 1),
      endsAt: asDate(row.endsAt) ?? new Date(),
      ended: asBool(row.ended), entrants: asStringArray(row.entrants),
      requiredRoleId: asStringOrNull(row.requiredRoleId),
      createdAt: asDateOrNow(row.createdAt), updatedAt: asDateOrNow(row.updatedAt),
    });
  }

  static find(filter: Filter = {}): SqlQuery<Giveaway> {
    return runFind('giveaways', GIVEAWAY_COLS, filter, Giveaway.fromRow);
  }

  static async findOne(filter: Filter): Promise<Giveaway | null> {
    return runFindOne('giveaways', GIVEAWAY_COLS, filter, Giveaway.fromRow);
  }

  static async findById(id: string): Promise<Giveaway | null> {
    return runFindOne('giveaways', GIVEAWAY_COLS, { _id: id }, Giveaway.fromRow);
  }

  static async create(data: {
    guildId: string; channelId: string; messageId?: string | null; prize: string;
    winnerCount?: number; endsAt: Date; ended?: boolean; entrants?: string[];
    requiredRoleId?: string | null;
  }): Promise<Giveaway> {
    const doc = new Giveaway({ ...data });
    await doc.save();
    return doc;
  }
}

// ── Suggestions ──

const SUGGESTION_COLS: ColumnMap = {
  _id: 'id', id: 'id', guildId: 'guildId', channelId: 'channelId',
  messageId: 'messageId', authorId: 'authorId', text: 'text',
  status: 'status', upvotes: 'upvotes', downvotes: 'downvotes',
  createdAt: 'createdAt', updatedAt: 'updatedAt',
};

export class Suggestion {
  _id: string;
  guildId: string;
  channelId: string;
  messageId: string | null;
  authorId: string;
  text: string;
  status: string;
  upvotes: string[];
  downvotes: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(init: {
    _id?: string; id?: string; guildId: string; channelId: string;
    messageId?: string | null; authorId: string; text: string;
    status?: string; upvotes?: string[]; downvotes?: string[];
    createdAt?: Date; updatedAt?: Date;
  }) {
    this._id = init._id ?? init.id ?? genId();
    this.guildId = init.guildId;
    this.channelId = init.channelId;
    this.messageId = init.messageId ?? null;
    this.authorId = init.authorId;
    this.text = init.text;
    this.status = init.status ?? 'pending';
    this.upvotes = init.upvotes ?? [];
    this.downvotes = init.downvotes ?? [];
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  async save(): Promise<this> {
    const now = nowIso();
    this.updatedAt = new Date(now);
    getDb().prepare(
      `INSERT INTO suggestions (id, guildId, channelId, messageId, authorId, text, status, upvotes, downvotes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        guildId = excluded.guildId, channelId = excluded.channelId, messageId = excluded.messageId,
        authorId = excluded.authorId, text = excluded.text, status = excluded.status,
        upvotes = excluded.upvotes, downvotes = excluded.downvotes, updatedAt = excluded.updatedAt`,
    ).run(
      this._id, this.guildId, this.channelId, this.messageId, this.authorId, this.text,
      this.status, JSON.stringify(this.upvotes), JSON.stringify(this.downvotes),
      this.createdAt.toISOString(), now,
    );
    return this;
  }

  private applyUpdate(update: UpdateInput): void {
    const sets = plainSets(update);
    if (sets.status !== undefined) this.status = asString(sets.status, this.status);
    if (sets.messageId !== undefined) this.messageId = asStringOrNull(sets.messageId);
    if (sets.text !== undefined) this.text = asString(sets.text, this.text);
  }

  static fromRow(row: SqlRow): Suggestion {
    return new Suggestion({
      _id: asString(row.id), guildId: asString(row.guildId), channelId: asString(row.channelId),
      messageId: asStringOrNull(row.messageId), authorId: asString(row.authorId),
      text: asString(row.text), status: asString(row.status, 'pending'),
      upvotes: asStringArray(row.upvotes), downvotes: asStringArray(row.downvotes),
      createdAt: asDateOrNow(row.createdAt), updatedAt: asDateOrNow(row.updatedAt),
    });
  }

  static find(filter: Filter = {}): SqlQuery<Suggestion> {
    return runFind('suggestions', SUGGESTION_COLS, filter, Suggestion.fromRow);
  }

  static async findOne(filter: Filter): Promise<Suggestion | null> {
    return runFindOne('suggestions', SUGGESTION_COLS, filter, Suggestion.fromRow);
  }

  static async findById(id: string): Promise<Suggestion | null> {
    return runFindOne('suggestions', SUGGESTION_COLS, { _id: id }, Suggestion.fromRow);
  }

  static async findByIdAndUpdate(id: string, update: UpdateInput, _options: UpdateOptions = {}): Promise<Suggestion | null> {
    const existing = await Suggestion.findById(id);
    if (!existing) return null;
    existing.applyUpdate(update);
    await existing.save();
    return existing;
  }

  static async create(data: {
    guildId: string; channelId: string; messageId?: string | null;
    authorId: string; text: string; status?: string;
  }): Promise<Suggestion> {
    const doc = new Suggestion({ ...data });
    await doc.save();
    return doc;
  }
}

// ── Reaction roles ──

const RR_COLS: ColumnMap = {
  _id: 'id', id: 'id', guildId: 'guildId', channelId: 'channelId',
  messageId: 'messageId', mapping: 'mapping', type: 'type',
  createdAt: 'createdAt', updatedAt: 'updatedAt',
};

export class ReactionRole {
  _id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  mapping: Map<string, string>;
  type: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(init: {
    _id?: string; id?: string; guildId: string; channelId: string;
    messageId: string; mapping?: Record<string, string> | Map<string, string>;
    type?: string; createdAt?: Date; updatedAt?: Date;
  }) {
    this._id = init._id ?? init.id ?? genId();
    this.guildId = init.guildId;
    this.channelId = init.channelId;
    this.messageId = init.messageId;
    this.mapping = ReactionRole.toMap(init.mapping);
    this.type = init.type ?? 'button';
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  static toMap(value: Record<string, string> | Map<string, string> | undefined): Map<string, string> {
    if (value instanceof Map) return new Map<string, string>(value);
    return new Map<string, string>(Object.entries(asStringRecord(value ?? {})));
  }

  async save(): Promise<this> {
    const now = nowIso();
    this.updatedAt = new Date(now);
    getDb().prepare(
      `INSERT INTO reaction_roles (id, guildId, channelId, messageId, mapping, type, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        guildId = excluded.guildId, channelId = excluded.channelId, messageId = excluded.messageId,
        mapping = excluded.mapping, type = excluded.type, updatedAt = excluded.updatedAt`,
    ).run(
      this._id, this.guildId, this.channelId, this.messageId,
      JSON.stringify(Object.fromEntries(this.mapping)), this.type,
      this.createdAt.toISOString(), now,
    );
    return this;
  }

  static fromRow(row: SqlRow): ReactionRole {
    return new ReactionRole({
      _id: asString(row.id), guildId: asString(row.guildId), channelId: asString(row.channelId),
      messageId: asString(row.messageId),
      mapping: new Map<string, string>(Object.entries(asStringRecord(row.mapping))),
      type: asString(row.type, 'button'),
      createdAt: asDateOrNow(row.createdAt), updatedAt: asDateOrNow(row.updatedAt),
    });
  }

  static find(filter: Filter = {}): SqlQuery<ReactionRole> {
    return runFind('reaction_roles', RR_COLS, filter, ReactionRole.fromRow);
  }

  static async findOne(filter: Filter): Promise<ReactionRole | null> {
    return runFindOne('reaction_roles', RR_COLS, filter, ReactionRole.fromRow);
  }

  static async create(data: {
    guildId: string; channelId: string; messageId: string;
    mapping?: Record<string, string> | Map<string, string>; type?: string;
  }): Promise<ReactionRole> {
    const doc = new ReactionRole({ ...data });
    await doc.save();
    return doc;
  }
}

// ── Reminders ──

const REMINDER_COLS: ColumnMap = {
  _id: 'id', id: 'id', guildId: 'guildId', userId: 'userId',
  channelId: 'channelId', text: 'text', remindAt: 'remindAt',
  delivered: 'delivered', createdAt: 'createdAt', updatedAt: 'updatedAt',
};

export class Reminder {
  _id: string;
  guildId: string | null;
  userId: string;
  channelId: string;
  text: string;
  remindAt: Date;
  delivered: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(init: {
    _id?: string; id?: string; guildId?: string | null; userId: string;
    channelId: string; text: string; remindAt: Date; delivered?: boolean;
    createdAt?: Date; updatedAt?: Date;
  }) {
    this._id = init._id ?? init.id ?? genId();
    this.guildId = init.guildId ?? null;
    this.userId = init.userId;
    this.channelId = init.channelId;
    this.text = init.text;
    this.remindAt = init.remindAt;
    this.delivered = init.delivered ?? false;
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  async save(): Promise<this> {
    const now = nowIso();
    this.updatedAt = new Date(now);
    getDb().prepare(
      `INSERT INTO reminders (id, guildId, userId, channelId, text, remindAt, delivered, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        guildId = excluded.guildId, userId = excluded.userId, channelId = excluded.channelId,
        text = excluded.text, remindAt = excluded.remindAt, delivered = excluded.delivered,
        updatedAt = excluded.updatedAt`,
    ).run(
      this._id, this.guildId, this.userId, this.channelId, this.text,
      this.remindAt.toISOString(), this.delivered ? 1 : 0,
      this.createdAt.toISOString(), now,
    );
    return this;
  }

  static fromRow(row: SqlRow): Reminder {
    return new Reminder({
      _id: asString(row.id), guildId: asStringOrNull(row.guildId),
      userId: asString(row.userId), channelId: asString(row.channelId),
      text: asString(row.text), remindAt: asDate(row.remindAt) ?? new Date(),
      delivered: asBool(row.delivered),
      createdAt: asDateOrNow(row.createdAt), updatedAt: asDateOrNow(row.updatedAt),
    });
  }

  static find(filter: Filter = {}): SqlQuery<Reminder> {
    return runFind('reminders', REMINDER_COLS, filter, Reminder.fromRow);
  }

  static async findOne(filter: Filter): Promise<Reminder | null> {
    return runFindOne('reminders', REMINDER_COLS, filter, Reminder.fromRow);
  }

  static async findById(id: string): Promise<Reminder | null> {
    return runFindOne('reminders', REMINDER_COLS, { _id: id }, Reminder.fromRow);
  }

  static async create(data: {
    guildId?: string | null; userId: string; channelId: string;
    text: string; remindAt: Date; delivered?: boolean;
  }): Promise<Reminder> {
    const doc = new Reminder({ ...data });
    await doc.save();
    return doc;
  }

  static async deleteOne(filter: Filter): Promise<{ deletedCount: number }> {
    return { deletedCount: runDelete('reminders', REMINDER_COLS, filter) };
  }

  static async countDocuments(filter: Filter = {}): Promise<number> {
    return runCount('reminders', REMINDER_COLS, filter);
  }
}
