/**
 * Moderación: /advertir /advertencias /limpiar /bloquear /desbloquear /modo-lento /apodo /rol
 * Agrupados para mantener el árbol compacto; cada exportación registra un comando.
 */
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Warning } from '../../database/models/Warning.js';
import { Embeds } from '../../utils/embeds.js';
import { canModerate } from '../../utils/permissions.js';
import ms from 'ms';

export const warn: Command = {
  data: new SlashCommandBuilder()
    .setName('advertir')
    .setDescription('Advertir a un miembro (se guarda en la base de datos)')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 2,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  async execute(interaction) {
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo', true);
    await Warning.create({ guildId: interaction.guildId!, userId: user.id, moderatorId: interaction.user.id, reason });
    const total = await Warning.countDocuments({ guildId: interaction.guildId!, userId: user.id });
    await interaction.reply({
      embeds: [Embeds.warning('Miembro advertido', `**${user.tag}** fue advertido (${total} en total).\n**Motivo:** ${reason}`).setThumbnail(user.displayAvatarURL())],
    });
  },
};

export const warnings: Command = {
  data: new SlashCommandBuilder()
    .setName('advertencias')
    .setDescription('Ver las advertencias de un usuario')
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  async execute(interaction) {
    const user = interaction.options.getUser('usuario', true);
    const list = await Warning.find({ guildId: interaction.guildId!, userId: user.id }).sort({ createdAt: -1 }).limit(10);
    if (!list.length) {
      await interaction.reply({ embeds: [Embeds.info('Sin advertencias', `**${user.tag}** no tiene advertencias.`)] });
      return;
    }
    const desc = list.map((w, i) => `**${i + 1}.** ${w.reason} — <@${w.moderatorId}> (<t:${Math.floor(w.createdAt.getTime() / 1000)}:R>)`).join('\n');
    await interaction.reply({ embeds: [Embeds.info(`Advertencias de ${user.tag}`, desc).setThumbnail(user.displayAvatarURL())] });
  },
};

export const purge: Command = {
  data: new SlashCommandBuilder()
    .setName('limpiar')
    .setDescription('Borrar mensajes en masa')
    .addIntegerOption((o) => o.setName('cantidad').setDescription('Cantidad a borrar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) => o.setName('usuario').setDescription('Solo este usuario'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  async execute(interaction) {
    const amount = interaction.options.getInteger('cantidad', true);
    const user = interaction.options.getUser('usuario');
    const channel = interaction.channel;
    if (!channel?.isTextBased() || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ embeds: [Embeds.error('Canal inválido', 'Usa un canal de texto del servidor.')], ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const fetched = await channel.messages.fetch({ limit: 100 });
    let filtered = [...fetched.values()].filter((m) => Date.now() - m.createdTimestamp < 14 * 24 * 3600_000);
    if (user) filtered = filtered.filter((m) => m.author.id === user.id);
    const toDelete = filtered.slice(0, amount);
    await channel.bulkDelete(toDelete, true).catch(() => undefined);
    await interaction.editReply({ embeds: [Embeds.success('Limpieza completada', `Se eliminaron **${toDelete.length}** mensajes.`)] });
  },
};

export const lock: Command = {
  data: new SlashCommandBuilder().setName('bloquear').setDescription('Bloquear el canal actual').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  async execute(interaction) {
    const ch = interaction.channel;
    if (!ch?.isTextBased() || ch.type !== ChannelType.GuildText) {
      await interaction.reply({ embeds: [Embeds.error('Canal inválido', 'Usa un canal de texto del servidor.')], ephemeral: true });
      return;
    }
    await ch.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: false });
    await interaction.reply({ embeds: [Embeds.warning('Canal bloqueado', `<#${ch.id}> ahora está bloqueado.`)] });
  },
};

export const unlock: Command = {
  data: new SlashCommandBuilder().setName('desbloquear').setDescription('Desbloquear el canal actual').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  async execute(interaction) {
    const ch = interaction.channel;
    if (!ch?.isTextBased() || ch.type !== ChannelType.GuildText) {
      await interaction.reply({ embeds: [Embeds.error('Canal inválido', 'Usa un canal de texto del servidor.')], ephemeral: true });
      return;
    }
    await ch.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: null });
    await interaction.reply({ embeds: [Embeds.success('Canal desbloqueado', `<#${ch.id}> ahora está abierto.`)] });
  },
};

export const slowmode: Command = {
  data: new SlashCommandBuilder()
    .setName('modo-lento')
    .setDescription('Configurar el modo lento del canal')
    .addStringOption((o) => o.setName('duracion').setDescription('p. ej. 0, 5s, 1m, 1h').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  async execute(interaction) {
    const raw = interaction.options.getString('duracion', true);
    const secs = raw === '0' || raw.toLowerCase() === 'off' ? 0 : Math.floor(ms(raw) / 1000);
    if (Number.isNaN(secs) || secs < 0 || secs > 21600) {
      await interaction.reply({ embeds: [Embeds.error('Duración inválida', 'Usa `0` para desactivar, máximo `6h`.')], ephemeral: true });
      return;
    }
    const ch = interaction.channel;
    if (!ch?.isTextBased() || ch.type !== ChannelType.GuildText) {
      await interaction.reply({ embeds: [Embeds.error('Canal inválido', 'Usa un canal de texto del servidor.')], ephemeral: true });
      return;
    }
    await ch.setRateLimitPerUser(secs);
    await interaction.reply({ embeds: [Embeds.info('Modo lento actualizado', secs === 0 ? 'Modo lento **desactivado**.' : `Modo lento configurado a **${raw}**.`)] });
  },
};

export const nickname: Command = {
  data: new SlashCommandBuilder()
    .setName('apodo')
    .setDescription('Cambiar el apodo de un miembro')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addStringOption((o) => o.setName('nombre').setDescription('Nuevo apodo (vacío para restablecer)').setMaxLength(32))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageNicknames],
  botPermissions: [PermissionFlagsBits.ManageNicknames],
  async execute(interaction) {
    const user = interaction.options.getUser('usuario', true);
    const name = interaction.options.getString('nombre') ?? null;
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [Embeds.error('No encontrado', 'El miembro no está en el servidor.')], ephemeral: true });
      return;
    }
    const block = canModerate(interaction.member as never, member as never, interaction.guild!.ownerId);
    if (block) {
      await interaction.reply({ embeds: [Embeds.error('No se puede cambiar el apodo', block)], ephemeral: true });
      return;
    }
    await member.setNickname(name).catch(async () => {
      await interaction.reply({ embeds: [Embeds.error('Falló', 'Revisa la jerarquía de roles.')], ephemeral: true });
    });
    await interaction.reply({ embeds: [Embeds.success('Apodo actualizado', name ? `**${user.tag}** ahora es **${name}**.` : `Apodo restablecido para **${user.tag}**.`)] });
  },
};

export const role: Command = {
  data: new SlashCommandBuilder()
    .setName('rol')
    .setDescription('Añadir o quitar un rol')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addRoleOption((o) => o.setName('rol').setDescription('Rol').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  async execute(interaction) {
    const user = interaction.options.getUser('usuario', true);
    const role = interaction.options.getRole('rol', true);
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [Embeds.error('No encontrado', 'El miembro no está en el servidor.')], ephemeral: true });
      return;
    }
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role.id);
      await interaction.reply({ embeds: [Embeds.info('Rol quitado', `Se quitó <@&${role.id}> a **${user.tag}**.`)] });
    } else {
      await member.roles.add(role.id).catch(async () => {
        await interaction.reply({ embeds: [Embeds.error('Falló', 'Revisa la jerarquía de roles — mi rol debe estar por encima del rol objetivo.')], ephemeral: true });
      });
      await interaction.reply({ embeds: [Embeds.success('Rol añadido', `Se añadió <@&${role.id}> a **${user.tag}**.`)] }).catch(() => undefined);
    }
  },
};
