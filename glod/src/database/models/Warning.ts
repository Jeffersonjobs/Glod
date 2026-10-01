/**
 * Moderation warnings. SQLite-backed replacement of the former mongoose model.
 * Same exported name and compatible API: find/findOne/create/save,
 * deleteOne/deleteMany/countDocuments.
 * @module database/models/Warning
 */
import {
  SqlQuery,
  asDateOrNow,
  asString,
  buildOrderBy,
  buildWhere,
  genId,
  getDb,
  nowIso,
  type ColumnMap,
  type Filter,
  type SortSpec,
  type SqlParam,
  type SqlRow,
} from '../sqlite.js';

const COLS: ColumnMap = {
  _id: 'id',
  id: 'id',
  guildId: 'guildId',
  userId: 'userId',
  moderatorId: 'moderatorId',
  reason: 'reason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

export class Warning {
  _id: string;
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(init: {
    _id?: string;
    guildId: string;
    userId: string;
    moderatorId: string;
    reason?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this._id = init._id ?? genId();
    this.guildId = init.guildId;
    this.userId = init.userId;
    this.moderatorId = init.moderatorId;
    this.reason = init.reason ?? 'No reason provided';
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
  }

  /** Mongoose-style virtual id. */
  get id(): string {
    return this._id;
  }

  async save(): Promise<this> {
    const db = getDb();
    const now = nowIso();
    this.updatedAt = new Date(now);
    db.prepare(
      `INSERT INTO warnings (id, guildId, userId, moderatorId, reason, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        guildId = excluded.guildId, userId = excluded.userId, moderatorId = excluded.moderatorId,
        reason = excluded.reason, updatedAt = excluded.updatedAt`,
    ).run(
      this._id,
      this.guildId,
      this.userId,
      this.moderatorId,
      this.reason,
      this.createdAt.toISOString(),
      now,
    );
    return this;
  }

  static fromRow(row: SqlRow): Warning {
    return new Warning({
      _id: asString(row.id),
      guildId: asString(row.guildId),
      userId: asString(row.userId),
      moderatorId: asString(row.moderatorId),
      reason: asString(row.reason, 'No reason provided'),
      createdAt: asDateOrNow(row.createdAt),
      updatedAt: asDateOrNow(row.updatedAt),
    });
  }

  static find(filter: Filter = {}): SqlQuery<Warning> {
    return new SqlQuery<Warning>((sort?: SortSpec, limit?: number) => {
      const db = getDb();
      const { clause, params } = buildWhere(filter, COLS);
      const order = buildOrderBy(sort, COLS);
      const lim = limit !== undefined ? `LIMIT ${Math.max(0, Math.floor(limit))}` : '';
      const rows = db.prepare(`SELECT * FROM warnings ${clause} ${order} ${lim}`).all(...(params as SqlParam[])) as SqlRow[];
      return rows.map((r) => Warning.fromRow(r));
    });
  }

  static async findOne(filter: Filter): Promise<Warning | null> {
    const db = getDb();
    const { clause, params } = buildWhere(filter, COLS);
    const row = db.prepare(`SELECT * FROM warnings ${clause} LIMIT 1`).get(...(params as SqlParam[])) as SqlRow | undefined;
    return row ? Warning.fromRow(row) : null;
  }

  static async create(data: {
    guildId: string;
    userId: string;
    moderatorId: string;
    reason?: string;
  }): Promise<Warning> {
    const doc = new Warning({ ...data });
    await doc.save();
    return doc;
  }

  static async deleteOne(filter: Filter): Promise<{ deletedCount: number }> {
    const db = getDb();
    const { clause, params } = buildWhere(filter, COLS);
    if (!clause) return { deletedCount: 0 };
    const res = db.prepare(`DELETE FROM warnings ${clause}`).run(...(params as SqlParam[]));
    return { deletedCount: Number(res.changes) };
  }

  static async deleteMany(filter: Filter): Promise<{ deletedCount: number }> {
    return Warning.deleteOne(filter);
  }

  static async countDocuments(filter: Filter = {}): Promise<number> {
    const db = getDb();
    const { clause, params } = buildWhere(filter, COLS);
    const row = db.prepare(`SELECT COUNT(*) AS n FROM warnings ${clause}`).get(...(params as SqlParam[])) as SqlRow | undefined;
    const n = row?.n;
    return typeof n === 'number' ? n : typeof n === 'bigint' ? Number(n) : 0;
  }
}
