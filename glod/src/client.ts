/**
 * GlodClient — extended Discord.js client with collections for
 * commands, buttons, selects, modals and shared services.
 * @module client
 */
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import type { Button, Command, Modal, SelectMenu } from './types/index.js';
import type { LavalinkManager } from 'lavalink-client';

export class GlodClient extends Client {
  commands = new Collection<string, Command>();
  cooldownsHelper = new Collection<string, Collection<string, number>>();
  buttons = new Collection<string, Button>();
  selects = new Collection<string, SelectMenu>();
  modals = new Collection<string, Modal>();
  /** Lavalink manager (null when unconfigured). */
  lavalink: LavalinkManager | null = null;
  startTime = Date.now();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember],
      allowedMentions: { parse: ['users'], repliedUser: false },
    });
  }
}
