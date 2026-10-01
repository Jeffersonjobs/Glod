/**
 * Security engine: anti-spam, anti-links, anti-mention-spam, anti-raid.
 * Returns true when a message was actioned (caller should stop processing).
 * @module systems/security
 */
import { EmbedBuilder, Message, PermissionFlagsBits, TextChannel } from 'discord.js';
import type { GlodClient } from '../client.js';
import { Colors } from '../config.js';
import { getGuildSettings } from '../database/models/GuildSettings.js';
import { containsInvite, containsLink } from '../utils/validators.js';

const buckets = new Map<string, number[]>();
const joins = new Map<string, number[]>();

export function registerJoin(guildId: string): void {
  const now = Date.now();
  const arr = (joins.get(guildId) ?? []).filter((t) => now - t < 15_000);
  arr.push(now);
  joins.set(guildId, arr);
}

/** Anti-raid: >8 joins in 15s triggers lockdown notice. */
export async function checkRaid(member: { guild: { id: string } }, _client: GlodClient, settings: { security: { antiRaid: boolean; logChannelId?: string | null } }): Promise<{ antiRaidTriggered: boolean }> {
  if (!settings.security.antiRaid) return { antiRaidTriggered: false };
  const arr = joins.get(member.guild.id) ?? [];
  if (arr.length >= 8) {
    joins.set(member.guild.id, []);
    return { antiRaidTriggered: true };
  }
  return { antiRaidTriggered: false };
}

async function log(guild: Message['guild'], channelId: string | null | undefined, embed: EmbedBuilder): Promise<void> {
  if (!guild || !channelId) return;
  const ch = guild.channels.cache.get(channelId) as TextChannel | undefined;
  if (ch?.isTextBased()) await ch.send({ embeds: [embed] }).catch(() => undefined);
}

export async function handleSecurityMessage(message: Message, _client: GlodClient): Promise<boolean> {
  if (!message.guild || message.author.bot) return false;
  const settings = await getGuildSettings(message.guild.id).catch(() => null);
  if (!settings) return false;
  const sec = settings.security;
  if (!sec.antiSpam && !sec.antiLinks && !sec.antiMention) return false;

  const member = message.member;
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
  if (sec.whitelistChannels.includes(message.channelId)) return false;
  if (member.roles.cache.some((r) => sec.whitelistRoles.includes(r.id))) return false;

  // Anti-links / invites
  if (sec.antiLinks && (containsLink(message.content) || containsInvite(message.content))) {
    await message.delete().catch(() => undefined);
    await log(message.guild, sec.logChannelId, new EmbedBuilder().setColor(Colors.warning).setTitle('🔗 Link blocked').setDescription(`<@${message.author.id}> posted a link in <#${message.channelId}>.`).setTimestamp());
    const warn = await (message.channel as TextChannel).send({ content: `<@${message.author.id}>`, embeds: [new EmbedBuilder().setColor(Colors.warning).setTitle('⚠️ Links not allowed').setDescription('Your message was removed.').setTimestamp()] }).catch(() => null);
    if (warn) setTimeout(() => warn.delete().catch(() => undefined), 5000);
    return true;
  }

  // Anti-mention-spam
  if (sec.antiMention && message.mentions.users.size + message.mentions.roles.size > (sec.maxMentions ?? 5)) {
    await message.delete().catch(() => undefined);
    await member.timeout(60_000, 'Mention spam').catch(() => undefined);
    await log(message.guild, sec.logChannelId, new EmbedBuilder().setColor(Colors.error).setTitle('📣 Mention spam').setDescription(`<@${message.author.id}> mass-mentioned.`).setTimestamp());
    return true;
  }

  // Anti-spam (sliding window)
  if (sec.antiSpam) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const windowMs = sec.intervalMs ?? 5000;
    const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
    arr.push(now);
    buckets.set(key, arr);
    if (arr.length > (sec.maxMessages ?? 5)) {
      buckets.set(key, []);
      await (message.channel as TextChannel).bulkDelete(arr.length).catch(() => message.delete().catch(() => undefined));
      await member.timeout(120_000, 'Spam detected').catch(() => undefined);
      await log(message.guild, sec.logChannelId, new EmbedBuilder().setColor(Colors.error).setTitle('🧹 Spam detected').setDescription(`<@${message.author.id}> was timed out for spamming.`).setTimestamp());
      return true;
    }
  }
  return false;
}
