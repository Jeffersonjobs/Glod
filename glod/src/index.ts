/**
 * Glod entrypoint: env → DB → loaders → Lavalink → login.
 * Includes anti-crash guards (unhandledRejection / uncaughtException).
 * @module index
 */
import { GlodClient } from './client.js';
import { config } from './config.js';
import { connectDatabase } from './database/connection.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadComponents } from './handlers/componentHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { initMusic } from './systems/music.js';
import { startApi } from './api/server.js';
import { startSchedulers } from './systems/schedulers.js';
import { logger } from './utils/logger.js';

// `__dirname` is provided by CommonJS (tsconfig module: commonjs).

// ── Anti-crash protections ──
process.on('unhandledRejection', (reason) => logger.error(`[anti-crash] Unhandled rejection: ${String(reason)}`));
process.on('uncaughtException', (err) => logger.error(`[anti-crash] Uncaught exception: ${err.stack ?? err}`));
process.on('warning', (w) => logger.warn(`[anti-crash] Warning: ${w.name} ${w.message}`));

async function main(): Promise<void> {
  const client = new GlodClient();

  // SQLite local cae ≠ bot muerto: sin base de datos arranca en modo degradado
  // (comandos sin DB siguen funcionando) en vez de apagarse del todo.
  try {
    await connectDatabase(config.sqlitePath);
  } catch (err) {
    logger.error(`[glod] Starting WITHOUT database (degraded mode): ${String(err).split('\n')[0]}`);
  }
  await loadCommands(client, __dirname);
  await loadComponents(client, __dirname);
  await loadEvents(client, __dirname);
  await initMusic(client);
  startSchedulers(client);
  if (config.api.enabled) startApi(client);

  await client.login(config.token);
  logger.info('[glod] Login dispatched');
}

main().catch((err) => {
  logger.error(`[glod] Fatal boot error: ${err?.stack ?? err}`);
  process.exit(1);
});
