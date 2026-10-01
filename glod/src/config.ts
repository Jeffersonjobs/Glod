/**
 * Central configuration: env validation, embed palette, icons.
 * All user-facing embeds must use these colors via `utils/embeds`.
 * @module config
 */
import 'dotenv/config';

function required(name: string, fallback = ''): string {
  const v = process.env[name] ?? fallback;
  if (!v && process.env.NODE_ENV === 'production' && ['DISCORD_TOKEN', 'CLIENT_ID'].includes(name)) {
    throw new Error(`[config] Missing required env var ${name}. Copy .env.example to .env.`);
  }
  return v;
}

export const config = {
  token: required('DISCORD_TOKEN'),
  clientId: required('CLIENT_ID'),
  guildId: process.env.GUILD_ID ?? '',
  mongoUri: process.env.MONGODB_URI ?? '',
  sqlitePath: process.env.SQLITE_PATH ?? './data/glod.db',
  defaultLocale: process.env.DEFAULT_LOCALE ?? 'en',
  env: process.env.NODE_ENV ?? 'production',
  owners: (process.env.OWNER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  api: {
    enabled: (process.env.API_ENABLED ?? 'true') === 'true',
    // En Render el puerto lo inyecta la plataforma en $PORT; en local usa API_PORT o 3001.
    port: Number(process.env.API_PORT ?? process.env.PORT ?? 3001),
    token: process.env.API_TOKEN ?? 'change-me',
  },
  lavalink: {
    host: process.env.LAVALINK_HOST ?? '',
    port: Number(process.env.LAVALINK_PORT ?? 2333),
    password: process.env.LAVALINK_PASSWORD ?? '',
    secure: (process.env.LAVALINK_SECURE ?? 'false') === 'true',
    name: process.env.LAVALINK_NAME ?? 'glod-main',
  },
  redisUrl: process.env.REDIS_URL ?? '',
} as const;

/** Consistent embed palette — use only these. */
export const Colors = {
  success: 0x2ecc71,
  error: 0xe74c3c,
  warning: 0xf1c40f,
  info: 0x3498db,
  primary: 0x5865f2,
  dark: 0x2b2d31,
} as const;

export const Icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  moderation: '🛡️',
  ticket: '🎫',
  economy: '💰',
  music: '🎵',
  giveaway: '🎉',
} as const;
