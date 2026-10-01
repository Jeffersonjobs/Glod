/**
 * Sugerencias: /sugerir + /sugerencias-config + botones de voto/aceptar-rechazar.
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';
import type { Command } from '../../types/index.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';
import { Suggestion } from '../../database/models/entities.js';
import { Embeds } from '../../utils/embeds.js';

export const suggestSetup: Command = {
  data: new SlashCommandBuilder()
    .setName('sugerencias-config')
    .setDescription('Configura los canales de sugerencias y registros')
    .addChannelOption((o) => o.setName('canal').setDescription('Canal de sugerencias').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addChannelOption((o) => o.setName('registros').setDescription('Canal de registros').addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const ch = interaction.options.getChannel('canal', true);
    const logs = interaction.options.getChannel('registros');
    const settings = await getGuildSettings(interaction.guildId!);
    settings.suggestionChannelId = ch.id;
    if (logs) settings.suggestionLogChannelId = logs.id;
    await settings.save();
    await interaction.reply({ embeds: [Embeds.success('Sugerencias configuradas', `Canal: <#${ch.id}>${logs ? `\nRegistros: <#${logs.id}>` : ''}`)] });
  },
};

export const suggest: Command = {
  data: new SlashCommandBuilder()
    .setName('sugerir')
    .setDescription('Envía una sugerencia')
    .addStringOption((o) => o.setName('texto').setDescription('Tu idea').setRequired(true).setMaxLength(1000)),
  cooldown: 10,
  async execute(interaction) {
    const text = interaction.options.getString('texto', true);
    const settings = await getGuildSettings(interaction.guildId!);
    const channelId = settings.suggestionChannelId ?? interaction.channelId;
    const channel = interaction.guild!.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel?.isTextBased()) {
      await interaction.reply({ embeds: [Embeds.error('No configurado', 'Pide a un administrador que ejecute `/sugerencias-config`.')], ephemeral: true });
      return;
    }
    const doc = await Suggestion.create({ guildId: interaction.guildId!, channelId: channel.id, authorId: interaction.user.id, text });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`suggest_up:${doc.id}`).setLabel('👍 0').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`suggest_down:${doc.id}`).setLabel('👎 0').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`suggest_accept:${doc.id}`).setLabel('Aceptar').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`suggest_deny:${doc.id}`).setLabel('Rechazar').setStyle(ButtonStyle.Secondary),
    );
    const msg = await channel.send({ embeds: [Embeds.primary('💡 Nueva sugerencia', `${text}\n\n*Por <@${interaction.user.id}> · pendiente*`)], components: [row] });
    doc.messageId = msg.id;
    await doc.save();
    await interaction.reply({ embeds: [Embeds.success('Sugerencia publicada', `Publicada en <#${channel.id}>.`)], ephemeral: true });
  },
};
