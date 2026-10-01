/**
 * Ready event: presence + startup diagnostics.
 * @module events/ready
 */
import { ActivityType } from 'discord.js';
import type { GlodClient } from '../client.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'clientReady',
  once: true,
  async execute(_arg: unknown, client: GlodClient) {
    client.user?.setActivity('/ayuda · Glod', { type: ActivityType.Playing });
    logger.info(`[ready] Logged in as ${client.user?.tag} · ${client.commands.size} commands`);
  },
};
