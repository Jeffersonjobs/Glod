/**
 * Clear-global script: `npm run clean:global`.
 * Deletes ALL global (non-guild) application commands. Guild commands
 * are untouched. Run this once to remove the old English commands,
 * then `npm run deploy` with GUILD_ID set to register the Spanish ones.
 * @module scripts/clear-global-commands
 */
import { REST, Routes } from 'discord.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

async function main(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.token);
  const existing = (await rest.get(Routes.applicationCommands(config.clientId)).catch(() => [])) as unknown[];
  const count = Array.isArray(existing) ? existing.length : 0;
  await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
  logger.info(`[clear-global] Removed ${count} global commands`);
}

main().catch((e) => {
  logger.error(String(e));
  process.exit(1);
});
