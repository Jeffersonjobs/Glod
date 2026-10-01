/**
 * Central interaction router: slash commands, buttons, selects, modals.
 * Enforces cooldowns, permissions, owner-only and embed error replies.
 * @module events/interactionCreate
 */
import { Interaction, PermissionsBitField } from 'discord.js';
import type { GlodClient } from '../client.js';
import { config } from '../config.js';
import { resolveById } from '../handlers/componentHandler.js';
import { Embeds } from '../utils/embeds.js';
import { safeRespond } from '../utils/reply.js';
import { t } from '../utils/i18n.js';
import { logger } from '../utils/logger.js';
import { getGuildSettings } from '../database/models/GuildSettings.js';

const cooldowns = new Map<string, number>();

export default {
  name: 'interactionCreate',
  async execute(interaction: Interaction, client: GlodClient) {
    try {
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) return;

        const settings = interaction.guildId
          ? await getGuildSettings(interaction.guildId).catch(() => null)
          : null;
        const locale = settings?.locale ?? config.defaultLocale;

        if (cmd.ownerOnly && !config.owners.includes(interaction.user.id)) {
          await interaction.reply({ embeds: [Embeds.error('Owner only', t('common.ownerOnly', locale))], ephemeral: true });
          return;
        }
        if (cmd.userPermissions && interaction.member) {
          const member = interaction.guild?.members.cache.get(interaction.user.id);
          const perms = new PermissionsBitField(cmd.userPermissions as never);
          if (member && !member.permissions.has(perms)) {
            await interaction.reply({ embeds: [Embeds.error('Missing permissions', t('common.noPermission', locale))], ephemeral: true });
            return;
          }
        }
        if (cmd.botPermissions && interaction.guild) {
          const me = interaction.guild.members.me;
          const perms = new PermissionsBitField(cmd.botPermissions as never);
          if (me && !me.permissions.has(perms)) {
            await interaction.reply({ embeds: [Embeds.error('Bot permissions', t('common.botNoPermission', locale))], ephemeral: true });
            return;
          }
        }
        const cd = cmd.cooldown ?? 3;
        const key = `${cmd.data.name}:${interaction.user.id}`;
        const now = Date.now();
        const expires = cooldowns.get(key) ?? 0;
        if (now < expires) {
          const remaining = Math.ceil((expires - now) / 1000);
          await interaction.reply({
            embeds: [Embeds.warning('Cooldown', t('common.cooldown', locale, { remaining, command: cmd.data.name }))],
            ephemeral: true,
          });
          return;
        }
        cooldowns.set(key, now + cd * 1000);

        await cmd.execute(interaction, client);
        return;
      }

      if (interaction.isButton()) {
        const btn = resolveById(client.buttons, interaction.customId);
        if (!btn) {
          await interaction.reply({ embeds: [Embeds.error('Unknown button', 'This button is no longer handled.')], ephemeral: true });
          return;
        }
        await btn.execute(interaction, client);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const sel = resolveById(client.selects, interaction.customId);
        if (!sel) return;
        await sel.execute(interaction, client);
        return;
      }

      if (interaction.isModalSubmit()) {
        const modal = resolveById(client.modals, interaction.customId);
        if (!modal) return;
        await modal.execute(interaction, client);
      }
    } catch (err) {
      const where = interaction.isChatInputCommand()
        ? interaction.commandName
        : 'customId' in interaction && typeof interaction.customId === 'string'
          ? interaction.customId
          : 'unknown';
      logger.error(`[interaction] ${where}: ${String(err)}`);
      const embed = Embeds.error('Error', t('common.error', config.defaultLocale));
      try {
        if (interaction.isRepliable() && interaction.isChatInputCommand()) {
          await safeRespond(interaction, { embeds: [embed], ephemeral: true }, where);
        } else if (interaction.isRepliable()) {
          await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => undefined);
        }
      } catch {
        /* reply already consumed */
      }
    }
  },
};
