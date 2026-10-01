/**
 * Clear-guild script: `npm run clean:guild`.
 * Deletes ALL guild application commands for GUILD_ID. Global commands
 * are untouched. Use when you see double commands in your server
 * (guild copy + global copy): keep ONE scope, never both.
 * @module scripts/clear-guild-commands
 */
import { REST, Routes } from 'discord.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

async function main(): Promise<void> {
  if (!config.guildId) {
    logger.error('[clear-guild] GUILD_ID is empty in .env — nothing to clear.');
    process.exit(1);
  }
  const rest = new REST({ version: '10' }).setToken(config.token);
  const existing = (await rest
    .get(Routes.applicationGuildCommands(config.clientId, config.guildId))
    .catch(() => [])) as unknown[];
  const count = Array.isArray(existing) ? existing.length : 0;
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: [] });
  logger.info(`[clear-guild] Removed ${count} guild commands from ${config.guildId}`);
}

main().catch((e) => {
  logger.error(String(e));
  process.exit(1);
});
