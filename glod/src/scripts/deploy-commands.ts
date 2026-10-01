/**
 * Slash-command deploy script: `npm run deploy`.
 * Registers guild commands when GUILD_ID is set (fast), else global.
 * @module scripts/deploy-commands
 */
import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

async function loadModule(file: string): Promise<Record<string, { data?: { toJSON(): unknown } }>> {
  if (file.endsWith('.js')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(file) as Record<string, { data?: { toJSON(): unknown } }>;
  }
  return (await import(pathToFileURL(file).href)) as Record<string, { data?: { toJSON(): unknown } }>;
}

async function collect(): Promise<unknown[]> {
  // Works both via ts-node (src/scripts/*.ts) and compiled (dist/scripts/*.js)
  const root = path.join(__dirname, '..', 'commands');
  const wantExt = __filename.endsWith('.js') ? '.js' : '.ts';
  const body: unknown[] = [];
  async function walk(dir: string): Promise<void> {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name.endsWith(wantExt) && !e.name.endsWith('.d.ts')) {
        const mod = await loadModule(full);
        for (const v of [mod.default, ...Object.values(mod)]) {
          if (v && typeof v === 'object' && v.data && typeof v.data.toJSON === 'function') {
            try {
              body.push(v.data.toJSON());
            } catch { /* ignore duplicates handled by Discord */ }
          }
        }
      }
    }
  }
  await walk(root);
  return body;
}

async function main(): Promise<void> {
  const raw = await collect();
  const seen = new Set<string>();
  const body = raw.filter((c) => {
    const name = (c as { name?: string })?.name ?? JSON.stringify(c);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
  const rest = new REST({ version: '10' }).setToken(config.token);
  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
    logger.info(`[deploy] Registered ${body.length} guild commands`);
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body });
    logger.info(`[deploy] Registered ${body.length} global commands`);
  }
}

main().catch((e) => {
  logger.error(String(e));
  process.exit(1);
});
