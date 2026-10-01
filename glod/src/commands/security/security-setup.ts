/**
 * Seguridad: /seguridad-config — anti-spam/links/raid/menciones + registros.
 */
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';
import { Embeds } from '../../utils/embeds.js';

export const securitySetup: Command = {
  data: new SlashCommandBuilder()
    .setName('seguridad-config')
    .setDescription('Configura la automoderación y la seguridad')
    .addSubcommand((s) => s.setName('estado').setDescription('Muestra la configuración actual de seguridad'))
    .addSubcommand((s) =>
      s
        .setName('alternar')
        .setDescription('Activa o desactiva un módulo')
        .addStringOption((o) =>
          o.setName('modulo').setDescription('Módulo').setRequired(true)
            .addChoices(
              { name: 'anti-spam', value: 'antiSpam' },
              { name: 'anti-links', value: 'antiLinks' },
              { name: 'anti-raid', value: 'antiRaid' },
              { name: 'anti-menciones', value: 'antiMention' },
            ),
        )
        .addBooleanOption((o) => o.setName('activado').setDescription('Activado/desactivado').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('registros')
        .setDescription('Configura el canal de registros de seguridad')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal de registros').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const settings = await getGuildSettings(interaction.guildId!);
    if (sub === 'estado') {
      const s = settings.security;
      await interaction.reply({
        embeds: [
          Embeds.info(
            '🛡️ Estado de seguridad',
            `Anti-spam: **${s.antiSpam ? 'ACTIVADO' : 'DESACTIVADO'}**\nAnti-links: **${s.antiLinks ? 'ACTIVADO' : 'DESACTIVADO'}**\nAnti-raid: **${s.antiRaid ? 'ACTIVADO' : 'DESACTIVADO'}**\nAnti-menciones: **${s.antiMention ? 'ACTIVADO' : 'DESACTIVADO'}**\nCanal de registros: ${s.logChannelId ? `<#${s.logChannelId}>` : '*ninguno*'}`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }
    if (sub === 'alternar') {
      const mod = interaction.options.getString('modulo', true) as 'antiSpam' | 'antiLinks' | 'antiRaid' | 'antiMention';
      const enabled = interaction.options.getBoolean('activado', true);
      (settings.security as unknown as Record<string, unknown>)[mod] = enabled;
      await settings.save();
      await interaction.reply({ embeds: [Embeds.success('Seguridad actualizada', `\`${mod}\` ahora está **${enabled ? 'ACTIVADO' : 'DESACTIVADO'}**.`)] });
      return;
    }
    const channel = interaction.options.getChannel('canal', true);
    settings.security.logChannelId = channel.id;
    await settings.save();
    await interaction.reply({ embeds: [Embeds.success('Canal de registros', `Registros de seguridad → <#${channel.id}>.`)] });
  },
};
