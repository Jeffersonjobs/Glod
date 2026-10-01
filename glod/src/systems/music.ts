/**
 * Lavalink music layer. Gracefully disabled when env is missing.
 * Uses `lavalink-client` LavalinkManager.
 * @module systems/music
 */
import { LavalinkManager } from 'lavalink-client';
import type { GlodClient } from '../client.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export function musicEnabled(): boolean {
  return Boolean(config.lavalink.host && config.lavalink.password);
}

export async function initMusic(client: GlodClient): Promise<void> {
  if (!musicEnabled()) {
    logger.warn('[music] Lavalink not configured — music commands will reply with error embeds');
    return;
  }
  const manager = new LavalinkManager({
    nodes: [
      {
        authorization: config.lavalink.password,
        host: config.lavalink.host,
        port: config.lavalink.port,
        id: config.lavalink.name,
        secure: config.lavalink.secure,
      },
    ],
    sendToShard: (guildId: string, payload: unknown) =>
      client.guilds.cache.get(guildId)?.shard?.send(payload as never),
    client: { id: config.clientId, username: 'Glod' },
    playerOptions: { defaultSearchPlatform: 'ytsearch' },
  });
  client.lavalink = manager as unknown as GlodClient['lavalink'];
  // Sin estos listeners, un nodo caído emite 'error' al vacío y termina
  // en el anti-crash como uncaughtException. Con ellos queda en un warn.
  manager.nodeManager.on('error', (node, error) => {
    logger.warn(`[music] node ${node.options.id} error (retrying): ${String(error).split('\n')[0]}`);
  });
  manager.nodeManager.on('disconnect', (node, reason) => {
    logger.warn(`[music] node ${node.options.id} disconnected: ${reason?.reason ?? reason?.code ?? 'unknown'}`);
  });
  client.on('raw', (packet: unknown) => manager.sendRawData(packet as never));
  // No bloquea el login: si no hay nodo Lavalink, el arranque sigue y la
  // música simplemente responde "no disponible" en vez de tardar ~10s.
  manager.init({ id: config.clientId, username: 'Glod' }).catch((err: unknown) => {
    logger.error(`[music] init failed: ${String(err)}`);
  });
  logger.info('[music] Lavalink manager initialized');
}
