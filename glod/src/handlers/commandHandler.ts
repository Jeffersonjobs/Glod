/**
 * Dynamic command loader with hot-reload support.
 * Works in dev (ts-node, `.ts` via dynamic import) and prod
 * (compiled CommonJS `.js` via require with cache busting).
 * Supports files exporting one command (default) or many (named).
 * @module handlers/commandHandler
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GlodClient } from '../client.js';
import type { Command } from '../types/index.js';
import { logger } from '../utils/logger.js';

async function importFresh(file: string): Promise<Record<string, unknown>> {
  if (file.endsWith('.js')) {
    try {
      delete require.cache[require.resolve(file)];
    } catch {
      /* not cached yet */
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(file) as Record<string, unknown>;
  }
  const mod = (await import(`${pathToFileURL(file).href}?update=${Date.now()}`)) as Record<string, unknown>;
  return mod;
}

async function filesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesRecursive(full)));
    else if (entry.isFile() && !full.endsWith('.d.ts') && (full.endsWith('.ts') || full.endsWith('.js'))) {
      out.push(full);
    }
  }
  return out;
}

function isCommand(v: unknown): v is Command {
  return !!v && typeof v === 'object' && 'data' in v && 'execute' in v && typeof (v as Command).execute === 'function';
}

export async function loadCommands(client: GlodClient, rootDir: string): Promise<void> {
  const commandsPath = path.join(rootDir, 'commands');
  const files = await filesRecursive(commandsPath);
  let count = 0;
  for (const file of files) {
    try {
      const mod = await importFresh(file);
      const candidates = [mod.default, mod.command, ...Object.values(mod)].filter(isCommand);
      const seen = new Set<string>();
      for (const cmd of candidates) {
        const name = (cmd.data as { name?: string }).name;
        if (!name || seen.has(name)) continue;
        seen.add(name);
        client.commands.set(name, cmd);
        count++;
      }
      if (seen.size === 0) logger.warn(`[commands] Skipped ${path.basename(file)} (invalid shape)`);
    } catch (err) {
      logger.error(`[commands] Failed to load ${file}: ${String(err)}`);
    }
  }
  logger.info(`[commands] Loaded ${count} slash commands`);
}

/** Hot-reload all commands (used by /reload). */
export async function reloadCommands(client: GlodClient, rootDir: string): Promise<number> {
  client.commands.clear();
  await loadCommands(client, rootDir);
  return client.commands.size;
}
