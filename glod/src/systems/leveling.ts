/**
 * Leveling engine: XP gain, level-ups, rewards.
 * Formula: 5*xp per message (jittered), level threshold = 100 * level^1.5.
 * @module systems/leveling
 */
import { Message, TextChannel } from 'discord.js';
import type { GlodClient } from '../client.js';
import { getGuildSettings } from '../database/models/GuildSettings.js';
import { Level } from '../database/models/entities.js';
import { Embeds } from '../utils/embeds.js';
import { t } from '../utils/i18n.js';
import { config } from '../config.js';

export const xpForLevel = (level: number): number => Math.floor(100 * Math.pow(level, 1.5));

export async function handleXpMessage(message: Message, _client: GlodClient): Promise<void> {
  if (!message.guild) return;
  const settings = await getGuildSettings(message.guild.id).catch(() => null);
  if (!settings || settings.leveling.enabled === false) return;
  const now = new Date();
  let doc = await Level.findOne({ guildId: message.guild.id, userId: message.author.id });
  if (!doc) doc = new Level({ guildId: message.guild.id, userId: message.author.id });
  if (doc.lastXpAt && now.getTime() - doc.lastXpAt.getTime() < 60_000) return; // 60s XP cooldown
  doc.xp += 15 + Math.floor(Math.random() * 10);
  doc.lastXpAt = now;
  let leveled = false;
  while (doc.xp >= xpForLevel(doc.level + 1)) {
    doc.level += 1;
    leveled = true;
  }
  await doc.save();
  if (!leveled) return;

  const channel = settings.leveling.channelId
    ? message.guild.channels.cache.get(settings.leveling.channelId)
    : message.channel;
  const locale = settings.locale ?? config.defaultLocale;
  if (channel?.isTextBased()) {
    await (channel as TextChannel).send({
      embeds: [Embeds.success('Level up!', t('leveling.levelup', locale, { user: `<@${message.author.id}>`, level: doc.level }))],
    }).catch(() => undefined);
  }
  const rewardRole = (settings.leveling.rewards as Map<string, string>)?.get?.(String(doc.level));
  if (rewardRole && message.member) {
    await message.member.roles.add(rewardRole).catch(() => undefined);
  }
}
