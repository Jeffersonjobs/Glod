/**
 * Economy helpers: balances, daily/work cooldown math.
 * @module systems/economy
 */
import { EconomyUser } from '../database/models/entities.js';

export async function getWallet(guildId: string, userId: string) {
  return EconomyUser.findOneAndUpdate(
    { guildId, userId },
    { $setOnInsert: { guildId, userId } },
    { upsert: true, new: true },
  );
}

export async function addBalance(guildId: string, userId: string, amount: number) {
  return EconomyUser.findOneAndUpdate(
    { guildId, userId },
    { $inc: { balance: amount }, $setOnInsert: { guildId, userId } },
    { upsert: true, new: true },
  );
}

export const fmt = (n: number): string => `${n.toLocaleString('en-US')} 🪙`;
