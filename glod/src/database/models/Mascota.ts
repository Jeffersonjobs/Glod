/**
 * Mascota virtual persistente (una por usuario y servidor).
 * SQLite-backed con la misma filosofía que Warning: findOne/create
 * más objetos con .save() (upsert por clave compuesta guildId+userId).
 * @module database/models/Mascota
 */
import {
  SqlQuery,
  asBool,
  asDate,
  asDateOrNow,
  asNumber,
  asString,
  buildOrderBy,
  buildWhere,
  getDb,
  nowIso,
  type ColumnMap,
  type Filter,
  type SortSpec,
  type SqlRow,
} from '../sqlite.js';

const COLS: ColumnMap = {
  guildId: 'guildId',
  userId: 'userId',
  nombre: 'nombre',
  especie: 'especie',
  hambre: 'hambre',
  felicidad: 'felicidad',
  energia: 'energia',
  salud: 'salud',
  dormida: 'dormida',
  lastCuraAt: 'lastCuraAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

function clampStat(value: number, fallback: number): number {
  const n = Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export class Mascota {
  guildId: string;
  userId: string;
  nombre: string;
  especie: string;
  hambre: number;
  felicidad: number;
  energia: number;
  salud: number;
  dormida: boolean;
  lastCuraAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Presente por compatibilidad de forma; la PK real es (guildId, userId). */
  _id: string;

  constructor(init: {
    guildId: string;
    userId: string;
    nombre: string;
    especie: string;
    hambre?: number;
    felicidad?: number;
    energia?: number;
    salud?: number;
    dormida?: boolean;
    lastCuraAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.guildId = init.guildId;
    this.userId = init.userId;
    this.nombre = init.nombre;
    this.especie = init.especie;
    this.hambre = clampStat(init.hambre ?? 80, 80);
    this.felicidad = clampStat(init.felicidad ?? 70, 70);
    this.energia = clampStat(init.energia ?? 90, 90);
    this.salud = clampStat(init.salud ?? 100, 100);
    this.dormida = init.dormida ?? false;
    this.lastCuraAt = init.lastCuraAt ?? null;
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
      `INSERT INTO mascotas (guildId, userId, nombre, especie, hambre, felicidad, energia, salud, dormida, lastCuraAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (guildId, userId) DO UPDATE SET
        nombre = excluded.nombre, especie = excluded.especie, hambre = excluded.hambre,
        felicidad = excluded.felicidad, energia = excluded.energia, salud = excluded.salud,
        dormida = excluded.dormida, lastCuraAt = excluded.lastCuraAt, updatedAt = excluded.updatedAt`,
    ).run(
      this.guildId,
      this.userId,
      this.nombre,
      this.especie,
      Math.floor(this.hambre),
      Math.floor(this.felicidad),
      Math.floor(this.energia),
      Math.floor(this.salud),
      this.dormida ? 1 : 0,
      this.lastCuraAt ? this.lastCuraAt.toISOString() : null,
      this.createdAt.toISOString(),
      now,
    );
    return this;
  }

  static fromRow(row: SqlRow): Mascota {
    return new Mascota({
      guildId: asString(row.guildId),
      userId: asString(row.userId),
      nombre: asString(row.nombre),
      especie: asString(row.especie),
      hambre: asNumber(row.hambre, 80),
      felicidad: asNumber(row.felicidad, 70),
      energia: asNumber(row.energia, 90),
      salud: asNumber(row.salud, 100),
      dormida: asBool(row.dormida),
      lastCuraAt: asDate(row.lastCuraAt),
      createdAt: asDateOrNow(row.createdAt),
      updatedAt: asDateOrNow(row.updatedAt),
    });
  }

  static find(filter: Filter = {}): SqlQuery<Mascota> {
    return new SqlQuery<Mascota>((sort?: SortSpec, limit?: number) => {
      const db = getDb();
      const { clause, params } = buildWhere(filter, COLS);
      const order = buildOrderBy(sort, COLS);
      const lim = limit !== undefined ? `LIMIT ${Math.max(0, Math.floor(limit))}` : '';
      const rows = db.prepare(`SELECT * FROM mascotas ${clause} ${order} ${lim}`).all(...params) as SqlRow[];
      return rows.map((r) => Mascota.fromRow(r));
    });
  }

  static async findOne(filter: Filter): Promise<Mascota | null> {
    const db = getDb();
    const { clause, params } = buildWhere(filter, COLS);
    const row = db.prepare(`SELECT * FROM mascotas ${clause} LIMIT 1`).get(...params) as SqlRow | undefined;
    return row ? Mascota.fromRow(row) : null;
  }

  static async create(data: {
    guildId: string;
    userId: string;
    nombre: string;
    especie: string;
    hambre?: number;
    felicidad?: number;
    energia?: number;
    salud?: number;
    dormida?: boolean;
    lastCuraAt?: Date | null;
  }): Promise<Mascota> {
    const doc = new Mascota({ ...data });
    await doc.save();
    return doc;
  }

  static async deleteOne(filter: Filter): Promise<{ deletedCount: number }> {
    const db = getDb();
    const { clause, params } = buildWhere(filter, COLS);
    if (!clause) return { deletedCount: 0 };
    const res = db.prepare(`DELETE FROM mascotas ${clause}`).run(...params);
    return { deletedCount: Number(res.changes) };
  }

  static async countDocuments(filter: Filter = {}): Promise<number> {
    const db = getDb();
    const { clause, params } = buildWhere(filter, COLS);
    const row = db.prepare(`SELECT COUNT(*) AS n FROM mascotas ${clause}`).get(...params) as SqlRow | undefined;
    const n = row?.n;
    return typeof n === 'number' ? n : typeof n === 'bigint' ? Number(n) : 0;
  }
}
