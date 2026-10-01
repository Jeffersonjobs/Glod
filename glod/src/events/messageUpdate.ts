/**
 * Re-scan edited messages for links/invites.
 * @module events/messageUpdate
 */
import { Message, PartialMessage } from 'discord.js';
import type { GlodClient } from '../client.js';
import { handleSecurityMessage } from '../systems/security.js';

export default {
  name: 'messageUpdate',
  async execute(oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage, client: GlodClient) {
    const full = newMsg.partial ? await newMsg.fetch().catch(() => null) : newMsg;
    if (!full || full.author?.bot || !full.guild) return;
    if (oldMsg.content === full.content) return;
    await handleSecurityMessage(full as Message, client);
  },
};
