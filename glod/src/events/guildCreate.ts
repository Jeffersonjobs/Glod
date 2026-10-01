/**
 * Guild join/leave telemetry + settings bootstrap.
 * @module events/guildCreateDelete
 */
import { Guild } from 'discord.js';
import type { GlodClient } from '../client.js';
import { getGuildSettings } from '../database/models/GuildSettings.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'guildCreate',
  async execute(guild: Guild, _client: GlodClient) {
    await getGuildSettings(guild.id).catch(() => null);
    logger.info(`[guild] Joined ${guild.name} (${guild.id}) · ${guild.memberCount} members`);
  },
};
