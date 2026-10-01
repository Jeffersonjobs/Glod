/**
 * Moderación: /banear
 */
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';
import { canModerate } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('banear')
    .setDescription('Banear a un miembro')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro a banear').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setMaxLength(512))
    .addIntegerOption((o) => o.setName('borrar-dias').setDescription('Días de mensajes a borrar (0-7)').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  async execute(interaction) {
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
    const deleteDays = interaction.options.getInteger('borrar-dias') ?? 0;
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (member) {
      const block = canModerate(interaction.member as never, member as never, interaction.guild!.ownerId);
      if (block) {
        await interaction.reply({ embeds: [Embeds.error('No se puede banear', block)], ephemeral: true });
        return;
      }
    }
    await interaction.guild!.members.ban(user.id, { reason: `${reason} | por ${interaction.user.tag}`, deleteMessageDays: deleteDays }).catch(async () => {
      await interaction.reply({ embeds: [Embeds.error('Baneo fallido', 'Revisa la posición de mi rol y mis permisos.')], ephemeral: true });
    });
    const embed = Embeds.success('Miembro baneado', `**${user.tag}** fue baneado.\n**Motivo:** ${reason}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields({ name: 'Moderador', value: `${interaction.user.tag}`, inline: true });
    await interaction.reply({ embeds: [embed] }).catch(() => undefined);
  },
} satisfies Command;
