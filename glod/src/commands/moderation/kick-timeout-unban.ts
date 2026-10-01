/**
 * Moderación: /expulsar /aislar /desbanear
 */
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';
import { canModerate } from '../../utils/permissions.js';
import ms from 'ms';

export const kick = {
  data: new SlashCommandBuilder()
    .setName('expulsar')
    .setDescription('Expulsar a un miembro')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro a expulsar').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  async execute(interaction) {
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [Embeds.error('No encontrado', 'El miembro no está en este servidor.')], ephemeral: true });
      return;
    }
    const block = canModerate(interaction.member as never, member as never, interaction.guild!.ownerId);
    if (block) {
      await interaction.reply({ embeds: [Embeds.error('No se puede expulsar', block)], ephemeral: true });
      return;
    }
    await member.kick(`${reason} | por ${interaction.user.tag}`);
    await interaction.reply({ embeds: [Embeds.success('Miembro expulsado', `**${user.tag}** fue expulsado.\n**Motivo:** ${reason}`).setThumbnail(user.displayAvatarURL())] });
  },
} satisfies Command;

export const timeout = {
  data: new SlashCommandBuilder()
    .setName('aislar')
    .setDescription('Aislar a un miembro (timeout)')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addStringOption((o) => o.setName('duracion').setDescription('p. ej. 10m, 1h, 1d').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  async execute(interaction) {
    const user = interaction.options.getUser('usuario', true);
    const raw = interaction.options.getString('duracion', true);
    const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
    const duration = ms(raw);
    if (!duration || duration < 10_000 || duration > 28 * 24 * 3600_000) {
      await interaction.reply({ embeds: [Embeds.error('Duración inválida', 'Usa 10s–28d, p. ej. `10m`, `2h`.')], ephemeral: true });
      return;
    }
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [Embeds.error('No encontrado', 'El miembro no está en este servidor.')], ephemeral: true });
      return;
    }
    const block = canModerate(interaction.member as never, member as never, interaction.guild!.ownerId);
    if (block) {
      await interaction.reply({ embeds: [Embeds.error('No se puede aislar', block)], ephemeral: true });
      return;
    }
    await member.timeout(duration, `${reason} | por ${interaction.user.tag}`);
    await interaction.reply({ embeds: [Embeds.success('Miembro aislado', `**${user.tag}** fue aislado durante **${raw}**.\n**Motivo:** ${reason}`)] });
  },
} satisfies Command;

export const unban = {
  data: new SlashCommandBuilder()
    .setName('desbanear')
    .setDescription('Desbanear a un usuario por ID')
    .addStringOption((o) => o.setName('usuario-id').setDescription('ID del usuario baneado').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  async execute(interaction) {
    const id = interaction.options.getString('usuario-id', true);
    const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
    try {
      await interaction.guild!.bans.remove(id, `${reason} | por ${interaction.user.tag}`);
      await interaction.reply({ embeds: [Embeds.success('Usuario desbaneado', `\`${id}\` fue desbaneado.\n**Motivo:** ${reason}`)] });
    } catch {
      await interaction.reply({ embeds: [Embeds.error('Desbaneo fallido', 'El usuario no está baneado o el ID no es válido.')], ephemeral: true });
    }
  },
} satisfies Command;
