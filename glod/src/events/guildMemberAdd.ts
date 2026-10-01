/**
 * Welcome / auto-role / anti-raid on member join.
 * @module events/guildMemberAdd
 */
import { GuildMember, TextChannel } from 'discord.js';
import type { GlodClient } from '../client.js';
import { getGuildSettings } from '../database/models/GuildSettings.js';
import { registerJoin } from '../systems/security.js';
import { Embeds } from '../utils/embeds.js';
import { applyVariables } from '../utils/validators.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'guildMemberAdd',
  async execute(member: GuildMember, client: GlodClient) {
    try {
      const settings = await getGuildSettings(member.guild.id);
      registerJoin(member.guild.id);

      // Anti-raid handled inside security system via join burst counting
      const { antiRaidTriggered } = await import('../systems/security.js').then((m) =>
        m.checkRaid(member, client, settings),
      );
      if (antiRaidTriggered) return;

      for (const roleId of settings.welcome.autoRoles ?? []) {
        await member.roles.add(roleId).catch(() => undefined);
      }
      if (!settings.welcome.enabled || !settings.welcome.channelId) return;
      const channel = member.guild.channels.cache.get(settings.welcome.channelId) as TextChannel | undefined;
      if (!channel?.isTextBased()) return;
      const vars = {
        user: `<@${member.id}>`,
        username: member.user.username,
        server: member.guild.name,
        count: String(member.guild.memberCount),
      };
      const description = applyVariables(settings.welcome.message, vars);
      const embed = Embeds.primary(`Welcome to ${member.guild.name}`, description)
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: `Member #${member.guild.memberCount}` });
      await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
    } catch (err) {
      logger.error(`[welcome] join failed: ${String(err)}`);
    }
  },
};
