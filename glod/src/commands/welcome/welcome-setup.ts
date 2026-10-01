/**
 * Bienvenida: /bienvenida-config — mensajes de bienvenida/despedida, roles automáticos, variables.
 * Variables: {user} {username} {server} {count}
 */
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';
import { Embeds } from '../../utils/embeds.js';

export const welcomeSetup: Command = {
  data: new SlashCommandBuilder()
    .setName('bienvenida-config')
    .setDescription('Configura la bienvenida, la despedida y los roles automáticos')
    .addSubcommand((s) =>
      s
        .setName('bienvenida')
        .setDescription('Configura el canal y el mensaje de bienvenida')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption((o) => o.setName('mensaje').setDescription('Acepta {user} {username} {server} {count}').setMaxLength(1000)),
    )
    .addSubcommand((s) =>
      s
        .setName('despedida')
        .setDescription('Configura el canal y el mensaje de despedida')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption((o) => o.setName('mensaje').setDescription('Acepta {user} {username} {server} {count}').setMaxLength(1000)),
    )
    .addSubcommand((s) =>
      s.setName('rol-auto').setDescription('Añade un rol automático').addRoleOption((o) => o.setName('rol').setDescription('Rol').setRequired(true)),
    )
    .addSubcommand((s) => s.setName('estado').setDescription('Muestra la configuración de bienvenida'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const settings = await getGuildSettings(interaction.guildId!);
    if (sub === 'bienvenida') {
      const ch = interaction.options.getChannel('canal', true);
      const msg = interaction.options.getString('mensaje');
      settings.welcome.enabled = true;
      settings.welcome.channelId = ch.id;
      if (msg) settings.welcome.message = msg;
      await settings.save();
      await interaction.reply({ embeds: [Embeds.success('Bienvenida configurada', `Canal: <#${ch.id}>\nMensaje: ${settings.welcome.message}\n\nVariables: \`{user}\` \`{username}\` \`{server}\` \`{count}\``)] });
      return;
    }
    if (sub === 'despedida') {
      const ch = interaction.options.getChannel('canal', true);
      const msg = interaction.options.getString('mensaje');
      settings.welcome.leaveEnabled = true;
      settings.welcome.leaveChannelId = ch.id;
      if (msg) settings.welcome.leaveMessage = msg;
      await settings.save();
      await interaction.reply({ embeds: [Embeds.success('Despedida configurada', `Canal: <#${ch.id}>\nMensaje: ${settings.welcome.leaveMessage}`)] });
      return;
    }
    if (sub === 'rol-auto') {
      const role = interaction.options.getRole('rol', true);
      if (!settings.welcome.autoRoles.includes(role.id)) settings.welcome.autoRoles.push(role.id);
      await settings.save();
      await interaction.reply({ embeds: [Embeds.success('Rol automático añadido', `Los nuevos miembros recibirán <@&${role.id}>.`)] });
      return;
    }
    const w = settings.welcome;
    await interaction.reply({
      embeds: [Embeds.info('👋 Estado de bienvenida', `Bienvenida: **${w.enabled ? `<#${w.channelId}>` : 'DESACTIVADA'}**\nDespedida: **${w.leaveEnabled ? `<#${w.leaveChannelId}>` : 'DESACTIVADA'}**\nRoles automáticos: ${w.autoRoles.map((r) => `<@&${r}>`).join(', ') || '*ninguno*'}`)],
      ephemeral: true,
    });
  },
};
