/**
 * Giveaway engine: enter, pick winners, end, reroll.
 * @module systems/giveaways
 */
import { EmbedBuilder, TextChannel } from 'discord.js';
import type { GlodClient } from '../client.js';
import { Colors } from '../config.js';
import { Giveaway } from '../database/models/entities.js';

export function pickWinners(entrants: string[], count: number): string[] {
  const pool = [...new Set(entrants)];
  const out: string[] = [];
  while (pool.length && out.length < count) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

export async function endGiveaway(client: GlodClient, giveawayId: string): Promise<string[]> {
  const g = await Giveaway.findById(giveawayId);
  if (!g || g.ended) return [];
  g.ended = true;
  await g.save();
  const winners = pickWinners(g.entrants, g.winnerCount);
  const channel = client.channels.cache.get(g.channelId) as TextChannel | undefined;
  const embed = new EmbedBuilder()
    .setColor(Colors.warning)
    .setTitle(`🎉 Giveaway ended: ${g.prize}`)
    .setDescription(winners.length ? `Winners: ${winners.map((w) => `<@${w}>`).join(', ')}` : 'No entrants.')
    .setTimestamp();
  if (channel?.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => undefined);
  return winners;
}
