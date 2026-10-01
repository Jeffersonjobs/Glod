/**
 * Sorteos: /sorteo (iniciar/finalizar/repetir) + botón de participar en componentes.
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Giveaway } from '../../database/models/entities.js';
import { Embeds } from '../../utils/embeds.js';
import { endGiveaway, pickWinners } from '../../systems/giveaways.js';
import ms from 'ms';

export const giveaway: Command = {
  data: new SlashCommandBuilder()
    .setName('sorteo')
    .setDescription('Gestiona los sorteos')
    .addSubcommand((s) =>
      s.setName('iniciar').setDescription('Inicia un sorteo')
        .addStringOption((o) => o.setName('premio').setDescription('Premio').setRequired(true))
        .addStringOption((o) => o.setName('duracion').setDescription('p. ej. 10m, 1h, 1d').setRequired(true))
        .addIntegerOption((o) => o.setName('ganadores').setDescription('Número de ganadores').setMinValue(1).setMaxValue(20))
        .addRoleOption((o) => o.setName('rol-requerido').setDescription('Rol necesario para participar'))
        .addChannelOption((o) => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText)),
    )
    .addSubcommand((s) => s.setName('finalizar').setDescription('Termina un sorteo').addStringOption((o) => o.setName('id').setDescription('ID del sorteo').setRequired(true)))
    .addSubcommand((s) => s.setName('repetir').setDescription('Repite el sorteo de ganadores').addStringOption((o) => o.setName('id').setDescription('ID del sorteo').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageEvents],
  async execute(interaction, _client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'iniciar') {
      const prize = interaction.options.getString('premio', true);
      const raw = interaction.options.getString('duracion', true);
      const winnerCount = interaction.options.getInteger('ganadores') ?? 1;
      const requiredRole = interaction.options.getRole('rol-requerido');
      const channel = (interaction.options.getChannel('canal') as TextChannel | null) ?? (interaction.channel as TextChannel);
      const duration = ms(raw);
      if (!duration || duration < 10_000 || duration > 30 * 24 * 3600_000) {
        await interaction.reply({ embeds: [Embeds.error('Duración no válida', 'Usa un rango de 10s a 30d.')], ephemeral: true });
        return;
      }
      const endsAt = new Date(Date.now() + duration);
      const doc = await Giveaway.create({ guildId: interaction.guildId!, channelId: channel.id, prize, winnerCount, endsAt, requiredRoleId: requiredRole?.id ?? null });
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`giveaway_enter:${doc.id}`).setLabel('Participar 🎉').setStyle(ButtonStyle.Success),
      );
      const msg = await channel.send({
        embeds: [Embeds.primary('🎉 Sorteo', `**Premio:** ${prize}\n**Ganadores:** ${winnerCount}\n**Termina:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n**ID:** \`${doc.id}\`${requiredRole ? `\n**Requiere:** <@&${requiredRole.id}>` : ''}`)],
        components: [row],
      });
      doc.messageId = msg.id;
      await doc.save();
      await interaction.reply({ embeds: [Embeds.success('Sorteo iniciado', `Premio **${prize}** en <#${channel.id}> (ID \`${doc.id}\`).`)], ephemeral: true });
      return;
    }
    const id = interaction.options.getString('id', true);
    const g = await Giveaway.findOne({ _id: id, guildId: interaction.guildId! }).catch(() => null);
    if (!g) {
      await interaction.reply({ embeds: [Embeds.error('No encontrado', 'ID de sorteo no válido.')], ephemeral: true });
      return;
    }
    if (sub === 'finalizar') {
      const winners = await endGiveaway(_client, g.id);
      await interaction.reply({ embeds: [Embeds.success('Sorteo finalizado', `Ganadores: ${winners.map((w) => `<@${w}>`).join(', ') || 'ninguno'}.`)] });
      return;
    }
    const winners = pickWinners(g.entrants, g.winnerCount);
    await interaction.reply({ embeds: [Embeds.primary('🎉 Nuevo sorteo', `Nuevos ganadores: ${winners.map((w) => `<@${w}>`).join(', ') || 'ninguno'}.`)] });
  },
};
