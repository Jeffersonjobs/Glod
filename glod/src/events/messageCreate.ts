/**
 * messageCreate: XP gain + automod (anti-spam / links / mention-spam).
 * Delegates heavy logic to `systems/` to keep the event thin.
 * @module events/messageCreate
 */
import { Message } from 'discord.js';
import type { GlodClient } from '../client.js';
import { handleSecurityMessage } from '../systems/security.js';
import { handleXpMessage } from '../systems/leveling.js';

export default {
  name: 'messageCreate',
  async execute(message: Message, client: GlodClient) {
    if (message.author.bot || !message.guild) return;
    const blocked = await handleSecurityMessage(message, client);
    if (blocked) return;
    await handleXpMessage(message, client);
  },
};
