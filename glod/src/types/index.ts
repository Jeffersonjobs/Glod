/**
 * Shared Glod type definitions.
 * @module types
 */
import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ClientEvents,
  ModalSubmitInteraction,
  PermissionResolvable,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import type { GlodClient } from '../client.js';

export type SlashData =
  | SlashCommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | SlashCommandOptionsOnlyBuilder;

export interface Command {
  /** Slash command definition. */
  data: SlashData;
  /** Cooldown in seconds (per user per command). */
  cooldown?: number;
  /** Required user permissions. */
  userPermissions?: PermissionResolvable[];
  /** Required bot permissions. */
  botPermissions?: PermissionResolvable[];
  /** Owner-only flag. */
  ownerOnly?: boolean;
  /** Guild-only flag (always true for this bot, kept for clarity). */
  guildOnly?: boolean;
  execute(interaction: ChatInputCommandInteraction, client: GlodClient): Promise<unknown>;
}

export interface BotEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(...args: [...args: ClientEvents[K], client: GlodClient]): Promise<unknown> | unknown;
}

export interface Button {
  /** customId prefix match (exact or startsWith when `prefix:true`). */
  id: string;
  prefix?: boolean;
  execute(interaction: ButtonInteraction, client: GlodClient): Promise<unknown>;
}

export interface SelectMenu {
  id: string;
  prefix?: boolean;
  execute(interaction: StringSelectMenuInteraction, client: GlodClient): Promise<unknown>;
}

export interface Modal {
  id: string;
  prefix?: boolean;
  execute(interaction: ModalSubmitInteraction, client: GlodClient): Promise<unknown>;
}
