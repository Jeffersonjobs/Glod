/**
 * Leave embeds.
 * @module events/guildMemberRemove
 */
import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import type { GlodClient } from '../client.js';
import { getGuildSettings } from '../database/models/GuildSettings.js';
import { Embeds } from '../utils/embeds.js';
import { applyVariables } from '../utils/validators.js';

export default {
  name: 'guildMemberRemove',
  async execute(member: GuildMember | PartialGuildMember, _client: GlodClient) {
    const settings = await getGuildSettings(member.guild.id).catch(() => null);
    if (!settings?.welcome.leaveEnabled || !settings.welcome.leaveChannelId) return;
    const channel = member.guild.channels.cache.get(settings.welcome.leaveChannelId) as TextChannel | undefined;
    if (!channel?.isTextBased()) return;
    const user = 'user' in member ? member.user : undefined;
    const description = applyVariables(settings.welcome.leaveMessage, {
      user: user ? `<@${user.id}>` : 'Someone',
      username: user?.username ?? 'Someone',
      server: member.guild.name,
      count: String(member.guild.memberCount),
    });
    await channel.send({ embeds: [Embeds.info('Member left', description)] }).catch(() => undefined);
  },
};
