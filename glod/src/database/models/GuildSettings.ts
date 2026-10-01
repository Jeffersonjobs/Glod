/**
 * Per-guild persistent settings (welcome, security, tickets, leveling, etc.).
 * SQLite-backed replacement of the former mongoose model. Same object shape
 * and same `getGuildSettings(guildId)` + `doc.save()` API as before.
 * @module database/models/GuildSettings
 */
import {
  asDateOrNow,
  asString,
  asStringArray,
  asStringOrNull,
  asStringRecord,
  buildWhere,
  getDb,
  nowIso,
  type ColumnMap,
  type Filter,
  type SqlParam,
  type SqlRow,
} from '../sqlite.js';

export interface WelcomeSettings {
  enabled: boolean;
  channelId: string | null;
  message: string;
  embed: boolean;
  leaveEnabled: boolean;
  leaveChannelId: string | null;
  leaveMessage: string;
  autoRoles: string[];
}

export interface SecuritySettings {
  antiSpam: boolean;
  antiLinks: boolean;
  antiRaid: boolean;
  antiMention: boolean;
  whitelistChannels: string[];
  whitelistRoles: string[];
  logChannelId: string | null;
  maxMentions: number;
  maxMessages: number;
  intervalMs: number;
}

export interface LevelingSettings {
  enabled: boolean;
  channelId: string | null;
  rewards: Map<string, string>;
}

const DEFAULT_WELCOME_MESSAGE = 'Welcome {user} to **{server}**! You are member #{count}.';
const DEFAULT_LEAVE_MESSAGE = '👋 {username} left **{server}**.';

function defaultWelcome(): WelcomeSettings {
  return {
    enabled: false,
    channelId: null,
    message: DEFAULT_WELCOME_MESSAGE,
    embed: true,
    leaveEnabled: false,
    leaveChannelId: null,
    leaveMessage: DEFAULT_LEAVE_MESSAGE,
    autoRoles: [],
  };
}

function defaultSecurity(): SecuritySettings {
  return {
    antiSpam: false,
    antiLinks: false,
    antiRaid: false,
    antiMention: false,
    whitelistChannels: [],
    whitelistRoles: [],
    logChannelId: null,
    maxMentions: 5,
    maxMessages: 5,
    intervalMs: 5000,
  };
}

function defaultLeveling(): LevelingSettings {
  return { enabled: true, channelId: null, rewards: new Map<string, string>() };
}

function toBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toNullableString(value: unknown, fallback: string | null): string | null {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRewards(value: unknown): Map<string, string> {
  if (value instanceof Map) {
    const out = new Map<string, string>();
    for (const [k, v] of value as Map<unknown, unknown>) out.set(String(k), String(v));
    return out;
  }
  const rec = asStringRecord(value);
  return new Map<string, string>(Object.entries(rec));
}

function parseWelcome(value: unknown): WelcomeSettings {
  const base = defaultWelcome();
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return base;
  const o = value as Record<string, unknown>;
  return {
    enabled: toBool(o.enabled, base.enabled),
    channelId: toNullableString(o.channelId, base.channelId),
    message: typeof o.message === 'string' && o.message ? o.message : base.message,
    embed: toBool(o.embed, base.embed),
    leaveEnabled: toBool(o.leaveEnabled, base.leaveEnabled),
    leaveChannelId: toNullableString(o.leaveChannelId, base.leaveChannelId),
    leaveMessage: typeof o.leaveMessage === 'string' && o.leaveMessage ? o.leaveMessage : base.leaveMessage,
    autoRoles: Array.isArray(o.autoRoles) ? o.autoRoles.map((v) => String(v)) : base.autoRoles,
  };
}

function parseSecurity(value: unknown): SecuritySettings {
  const base = defaultSecurity();
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return base;
  const o = value as Record<string, unknown>;
  return {
    antiSpam: toBool(o.antiSpam, base.antiSpam),
    antiLinks: toBool(o.antiLinks, base.antiLinks),
    antiRaid: toBool(o.antiRaid, base.antiRaid),
    antiMention: toBool(o.antiMention, base.antiMention),
    whitelistChannels: Array.isArray(o.whitelistChannels) ? o.whitelistChannels.map((v) => String(v)) : base.whitelistChannels,
    whitelistRoles: Array.isArray(o.whitelistRoles) ? o.whitelistRoles.map((v) => String(v)) : base.whitelistRoles,
    logChannelId: toNullableString(o.logChannelId, base.logChannelId),
    maxMentions: toNumber(o.maxMentions, base.maxMentions),
    maxMessages: toNumber(o.maxMessages, base.maxMessages),
    intervalMs: toNumber(o.intervalMs, base.intervalMs),
  };
}

function parseLeveling(value: unknown): LevelingSettings {
  const base = defaultLeveling();
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return base;
  const o = value as Record<string, unknown>;
  return {
    enabled: toBool(o.enabled, base.enabled),
    channelId: toNullableString(o.channelId, base.channelId),
    rewards: normalizeRewards(o.rewards),
  };
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string' || !value) return {};
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return {};
  }
}

const COLS: ColumnMap = { guildId: 'guildId' };

export class GuildSettings {
  guildId: string;
  locale: string;
  welcome: WelcomeSettings;
  security: SecuritySettings;
  leveling: LevelingSettings;
  ticketCategoryIds: string[];
  ticketLogChannelId: string | null;
  suggestionChannelId: string | null;
  suggestionLogChannelId: string | null;
  muteRoleId: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(init: {
    guildId: string;
    locale?: string;
    welcome?: WelcomeSettings;
    security?: SecuritySettings;
    leveling?: LevelingSettings;
    ticketCategoryIds?: string[];
    ticketLogChannelId?: string | null;
    suggestionChannelId?: string | null;
    suggestionLogChannelId?: string | null;
    muteRoleId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.guildId = init.guildId;
    this.locale = init.locale ?? 'en';
    this.welcome = init.welcome ?? defaultWelcome();
    this.security = init.security ?? defaultSecurity();
    this.leveling = init.leveling ?? defaultLeveling();
    this.ticketCategoryIds = init.ticketCategoryIds ?? [];
    this.ticketLogChannelId = init.ticketLogChannelId ?? null;
    this.suggestionChannelId = init.suggestionChannelId ?? null;
    this.suggestionLogChannelId = init.suggestionLogChannelId ?? null;
    this.muteRoleId = init.muteRoleId ?? null;
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
  }

  /** Normalize in-memory sub-objects (also tolerates plain objects from Object.assign). */
  private normalize(): void {
    this.welcome = parseWelcome(this.welcome);
    this.security = parseSecurity(this.security);
    // leveling.rewards may arrive as a plain object (e.g. dashboard PUT body).
    const lvl: unknown = this.leveling;
    if (lvl !== null && typeof lvl === 'object' && !Array.isArray(lvl)) {
      const o = lvl as { enabled?: unknown; channelId?: unknown; rewards?: unknown };
      this.leveling = {
        enabled: toBool(o.enabled, true),
        channelId: toNullableString(o.channelId, null),
        rewards: normalizeRewards(o.rewards),
      };
    } else {
      this.leveling = defaultLeveling();
    }
    if (!Array.isArray(this.ticketCategoryIds)) this.ticketCategoryIds = [];
  }

  async save(): Promise<this> {
    this.normalize();
    const db = getDb();
    const now = nowIso();
    this.updatedAt = new Date(now);
    db.prepare(
      `INSERT INTO guild_settings
        (guildId, locale, welcome, security, leveling, ticketCategoryIds, ticketLogChannelId,
         suggestionChannelId, suggestionLogChannelId, muteRoleId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (guildId) DO UPDATE SET
        locale = excluded.locale, welcome = excluded.welcome, security = excluded.security,
        leveling = excluded.leveling, ticketCategoryIds = excluded.ticketCategoryIds,
        ticketLogChannelId = excluded.ticketLogChannelId, suggestionChannelId = excluded.suggestionChannelId,
        suggestionLogChannelId = excluded.suggestionLogChannelId, muteRoleId = excluded.muteRoleId,
        updatedAt = excluded.updatedAt`,
    ).run(
      this.guildId,
      this.locale,
      JSON.stringify(this.welcome),
      JSON.stringify(this.security),
      JSON.stringify({ enabled: this.leveling.enabled, channelId: this.leveling.channelId, rewards: Object.fromEntries(this.leveling.rewards) }),
      JSON.stringify(this.ticketCategoryIds),
      this.ticketLogChannelId,
      this.suggestionChannelId,
      this.suggestionLogChannelId,
      this.muteRoleId,
      this.createdAt.toISOString(),
      now,
    );
    return this;
  }

  static fromRow(row: SqlRow): GuildSettings {
    return new GuildSettings({
      guildId: asString(row.guildId),
      locale: asString(row.locale, 'en'),
      welcome: parseWelcome(parseJson(row.welcome)),
      security: parseSecurity(parseJson(row.security)),
      leveling: parseLeveling(parseJson(row.leveling)),
      ticketCategoryIds: asStringArray(row.ticketCategoryIds),
      ticketLogChannelId: asStringOrNull(row.ticketLogChannelId),
      suggestionChannelId: asStringOrNull(row.suggestionChannelId),
      suggestionLogChannelId: asStringOrNull(row.suggestionLogChannelId),
      muteRoleId: asStringOrNull(row.muteRoleId),
      createdAt: asDateOrNow(row.createdAt),
      updatedAt: asDateOrNow(row.updatedAt),
    });
  }

  static async findOne(filter: Filter): Promise<GuildSettings | null> {
    const db = getDb();
    const { clause, params } = buildWhere(filter, COLS);
    const row = db.prepare(`SELECT * FROM guild_settings ${clause} LIMIT 1`).get(...(params as SqlParam[])) as SqlRow | undefined;
    return row ? GuildSettings.fromRow(row) : null;
  }

  static async create(data: { guildId: string } & Partial<Omit<GuildSettings, 'guildId' | 'save'>>): Promise<GuildSettings> {
    const doc = new GuildSettings({ guildId: data.guildId });
    if (data.locale !== undefined) doc.locale = data.locale;
    if (data.welcome !== undefined) doc.welcome = parseWelcome(data.welcome);
    if (data.security !== undefined) doc.security = parseSecurity(data.security);
    if (data.leveling !== undefined) {
      const lvl = data.leveling as unknown;
      doc.leveling = parseLeveling(
        lvl instanceof Map ? { rewards: lvl } : (lvl as Record<string, unknown>),
      );
    }
    if (data.ticketCategoryIds !== undefined) doc.ticketCategoryIds = [...data.ticketCategoryIds];
    if (data.ticketLogChannelId !== undefined) doc.ticketLogChannelId = data.ticketLogChannelId;
    if (data.suggestionChannelId !== undefined) doc.suggestionChannelId = data.suggestionChannelId;
    if (data.suggestionLogChannelId !== undefined) doc.suggestionLogChannelId = data.suggestionLogChannelId;
    if (data.muteRoleId !== undefined) doc.muteRoleId = data.muteRoleId;
    await doc.save();
    return doc;
  }
}

/** Fetch settings, creating defaults on first use. */
export async function getGuildSettings(guildId: string): Promise<GuildSettings> {
  const existing = await GuildSettings.findOne({ guildId });
  if (existing) return existing;
  return GuildSettings.create({ guildId });
}
