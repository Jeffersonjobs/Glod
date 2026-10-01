/**
 * Resilient interaction responses: retries transient Discord API failures
 * (HTTP 5xx, rate limits, network errors) with backoff, and falls back
 * from reply to followUp when the interaction was already acknowledged.
 * @module utils/reply
 */
import { DiscordAPIError } from 'discord.js';
import type { ChatInputCommandInteraction, InteractionReplyOptions } from 'discord.js';
import { logger } from './logger.js';

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 1500];

function statusOf(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return null;
}

/** true = merece reintento (error de red o 5xx/429 de Discord). */
function isTransient(err: unknown): boolean {
  const status = statusOf(err);
  if (status === null) {
    const msg = String(err);
    return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|fetch failed|socket hang up|network/i.test(msg);
  }
  return status >= 500 || status === 429;
}

/** true = la interacción ya fue respondida (hay que usar followUp). */
function isAlreadyAcked(err: unknown): boolean {
  if (err instanceof DiscordAPIError && err.code === 40060) return true;
  return /already (been )?acknowledged|already been replied/i.test(String(err));
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Responde una interacción aguantando baches de la API.
 * Devuelve true si algo se envió, false si hay que rendirse (y loguea).
 */
export async function safeRespond(
  interaction: ChatInputCommandInteraction,
  payload: InteractionReplyOptions & { ephemeral?: boolean },
  context: string,
): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
      return true;
    } catch (err) {
      if (isAlreadyAcked(err)) {
        try {
          await interaction.followUp(payload);
          return true;
        } catch (followErr) {
          logger.warn(`[reply:${context}] followUp failed: ${String(followErr).split('\n')[0]}`);
          return false;
        }
      }
      const last = attempt >= MAX_ATTEMPTS;
      if (!isTransient(err) || last) {
        logger.warn(`[reply:${context}] giving up (attempt ${attempt}): ${String(err).split('\n')[0]}`);
        return false;
      }
      await wait(BACKOFF_MS[attempt - 1] ?? 1500);
    }
  }
  return false;
}
