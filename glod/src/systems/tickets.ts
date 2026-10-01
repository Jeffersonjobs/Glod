/**
 * Ticket helpers: channel creation, permission overwrites, transcripts.
 * @module systems/tickets
 */
import { ChannelType, Guild, PermissionFlagsBits, TextChannel, User } from 'discord.js';
import { Ticket } from '../database/models/entities.js';

export async function createTicketChannel(guild: Guild, owner: User, category: string, categoryChannelId?: string) {
  const channel = await guild.channels.create({
    name: `ticket-${owner.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)}`,
    type: ChannelType.GuildText,
    parent: categoryChannelId ?? undefined,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: owner.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ],
    reason: `Ticket for ${owner.tag} (${category})`,
  });
  const ticket = await Ticket.create({
    guildId: guild.id,
    channelId: channel.id,
    ownerId: owner.id,
    category,
    status: 'open',
  });
  return { channel, ticket };
}

/** Build a plain-text transcript from recent messages. */
export async function buildTranscript(channel: TextChannel): Promise<string> {
  const lines: string[] = [`# Transcript — #${channel.name} (${channel.id})`, ''];
  let lastId: string | undefined;
  for (let i = 0; i < 5; i++) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
    if (!batch || batch.size === 0) break;
    const sorted = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    for (const m of sorted) lines.push(`[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content || '(embed/attachment)'}`);
    lastId = sorted[0]?.id;
    if (batch.size < 100) break;
  }
  return lines.join('\n');
}
