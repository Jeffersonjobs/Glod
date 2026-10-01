/**
 * Dynamic event loader: `src/events/*.ts` exporting `{ name, once, execute }`.
 * CJS-friendly (require for compiled `.js`, import for dev `.ts`).
 * @module handlers/eventHandler
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GlodClient } from '../client.js';
import { logger } from '../utils/logger.js';

interface EventModule {
  name: string;
  once?: boolean;
  execute: (...args: never[]) => unknown;
}

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
  return (await import(pathToFileURL(file).href)) as Record<string, unknown>;
}

function isEvent(v: unknown): v is EventModule {
  return !!v && typeof v === 'object' && typeof (v as EventModule).name === 'string' && typeof (v as EventModule).execute === 'function';
}

export async function loadEvents(client: GlodClient, rootDir: string): Promise<void> {
  const eventsPath = path.join(rootDir, 'events');
  if (!fs.existsSync(eventsPath)) return;
  const files = fs.readdirSync(eventsPath).filter((f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'));
  let count = 0;
  for (const file of files) {
    try {
      const mod = await importFresh(path.join(eventsPath, file));
      const evt: EventModule | undefined = (mod.default as EventModule) ?? Object.values(mod).find(isEvent);
      if (!evt || !isEvent(evt)) continue;
      const handler = (...args: unknown[]): unknown => evt.execute(...(args as never[]), client as never);
      if (evt.once) client.once(evt.name, handler);
      else client.on(evt.name, handler);
      count++;
    } catch (err) {
      logger.error(`[events] Failed to load ${file}: ${String(err)}`);
    }
  }
  logger.info(`[events] Loaded ${count} events`);
}
