/**
 * Dynamic component loader: buttons / selects / modals.
 * CJS-friendly (require for compiled `.js`, import for dev `.ts`).
 * Matches by exact customId or prefix (for ids like `ticket_close:123`).
 * @module handlers/componentHandler
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GlodClient } from '../client.js';
import type { Button, Modal, SelectMenu } from '../types/index.js';
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
  return (await import(`${pathToFileURL(file).href}?update=${Date.now()}`)) as Record<string, unknown>;
}

function isComponent(v: unknown): v is Button & SelectMenu & Modal {
  return !!v && typeof v === 'object' && 'id' in v && 'execute' in v;
}

async function loadDir<T>(dir: string, kind: string): Promise<T[]> {
  const out: T[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const file of fs.readdirSync(dir).filter((f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'))) {
    try {
      const mod = await importFresh(path.join(dir, file));
      for (const v of [mod.default, ...Object.values(mod)]) {
        if (isComponent(v)) out.push(v as T);
      }
    } catch (err) {
      logger.error(`[components:${kind}] Failed ${file}: ${String(err)}`);
    }
  }
  return out;
}

export async function loadComponents(client: GlodClient, rootDir: string): Promise<void> {
  const base = path.join(rootDir, 'components');
  for (const b of await loadDir<Button>(path.join(base, 'buttons'), 'button')) client.buttons.set(b.id, b);
  for (const s of await loadDir<SelectMenu>(path.join(base, 'selects'), 'select')) client.selects.set(s.id, s);
  for (const m of await loadDir<Modal>(path.join(base, 'modals'), 'modal')) client.modals.set(m.id, m);
  logger.info(
    `[components] Loaded ${client.buttons.size} buttons, ${client.selects.size} selects, ${client.modals.size} modals`,
  );
}

/** Resolve a component by exact id or registered prefix. */
export function resolveById<T extends { id: string; prefix?: boolean }>(
  map: Map<string, T>,
  customId: string,
): T | undefined {
  if (map.has(customId)) return map.get(customId);
  for (const comp of map.values()) {
    if (comp.prefix && customId.startsWith(comp.id)) return comp;
  }
  return undefined;
}
