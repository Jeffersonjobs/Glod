/**
 * Background schedulers: reminders + giveaway endings.
 * Runs every 30s; idempotent via `delivered` / `ended` flags.
 * Persistence is local SQLite, so no connection guard is needed.
 * @module systems/schedulers
 */
import { TextChannel } from 'discord.js';
import type { GlodClient } from '../client.js';
import { Giveaway, Reminder } from '../database/models/entities.js';
import { Embeds } from '../utils/embeds.js';
import { pickWinners } from './giveaways.js';
import { logger } from '../utils/logger.js';

export function startSchedulers(client: GlodClient): void {
  setInterval(async () => {
    try {
      // Reminders
      const due = await Reminder.find({ remindAt: { $lte: new Date() }, delivered: false }).limit(20);
      for (const r of due) {
        r.delivered = true;
        await r.save();
        const ch = client.channels.cache.get(r.channelId) as TextChannel | undefined;
        if (ch?.isTextBased()) {
          await ch.send({ content: `<@${r.userId}>`, embeds: [Embeds.info('⏰ Reminder', r.text)] }).catch(() => undefined);
        }
      }
      // Giveaways
      const ending = await Giveaway.find({ endsAt: { $lte: new Date() }, ended: false }).limit(10);
      for (const g of ending) {
        g.ended = true;
        await g.save();
        const winners = pickWinners(g.entrants, g.winnerCount);
        const ch = client.channels.cache.get(g.channelId) as TextChannel | undefined;
        if (ch?.isTextBased()) {
          await ch.send({
            embeds: [Embeds.primary('🎉 Giveaway ended', `**${g.prize}**\nWinners: ${winners.map((w) => `<@${w}>`).join(', ') || 'none'}`)],
          }).catch(() => undefined);
        }
      }
    } catch (err) {
      logger.error(`[schedulers] ${String(err)}`);
    }
  }, 30_000).unref();
}
