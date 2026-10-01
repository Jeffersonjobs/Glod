/**
 * Moderación extra: /moderacion — baneo-suave, baneo-id, quitar-aviso, borrar-avisos, baneo-temporal,
 * lista-aislados, limpiar-bots/enlaces/imagenes/usuario, ensordecer, desensordecer, desconectar, mover, recrear-canal.
 *
 * Un solo `Command` (cooldown 5). Los subcomandos slash de Discord no pueden llevar sus
 * propios `userPermissions`/`botPermissions`, así que cada subcomando aplica sus permisos
 * reales en tiempo de ejecución vía `needPerms` (ver SUB_PERMS) y jerarquía
 * vía `canModerate` cuando se apunta a un miembro del servidor.
 * @module commands/moderation/moderation-extra
 */
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction, Message } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';
import { canModerate } from '../../utils/permissions.js';
import { Warning } from '../../database/models/Warning.js';
import ms from 'ms';

/**
 * Permisos de Discord requeridos por subcomando: [userPerms, botPerms].
 * Se aplican manualmente porque `Command` solo soporta permisos top-level.
 */
const SUB_PERMS: Record<string, { user: bigint[]; bot: bigint[]; label: string }> = {
  'baneo-suave': { user: [PermissionFlagsBits.BanMembers], bot: [PermissionFlagsBits.BanMembers], label: 'Banear miembros' },
  'baneo-id': { user: [PermissionFlagsBits.BanMembers], bot: [PermissionFlagsBits.BanMembers], label: 'Banear miembros' },
  'quitar-aviso': { user: [PermissionFlagsBits.ModerateMembers], bot: [], label: 'Moderar miembros' },
  'borrar-avisos': { user: [PermissionFlagsBits.ModerateMembers], bot: [], label: 'Moderar miembros' },
  'baneo-temporal': { user: [PermissionFlagsBits.BanMembers], bot: [PermissionFlagsBits.BanMembers], label: 'Banear miembros' },
  'lista-aislados': { user: [PermissionFlagsBits.ModerateMembers], bot: [PermissionFlagsBits.ModerateMembers], label: 'Moderar miembros' },
  'limpiar-bots': { user: [PermissionFlagsBits.ManageMessages], bot: [PermissionFlagsBits.ManageMessages], label: 'Gestionar mensajes' },
  'limpiar-enlaces': { user: [PermissionFlagsBits.ManageMessages], bot: [PermissionFlagsBits.ManageMessages], label: 'Gestionar mensajes' },
  'limpiar-imagenes': { user: [PermissionFlagsBits.ManageMessages], bot: [PermissionFlagsBits.ManageMessages], label: 'Gestionar mensajes' },
  'limpiar-usuario': { user: [PermissionFlagsBits.ManageMessages], bot: [PermissionFlagsBits.ManageMessages], label: 'Gestionar mensajes' },
  ensordecer: { user: [PermissionFlagsBits.DeafenMembers], bot: [PermissionFlagsBits.DeafenMembers], label: 'Ensordecer miembros' },
  desensordecer: { user: [PermissionFlagsBits.DeafenMembers], bot: [PermissionFlagsBits.DeafenMembers], label: 'Ensordecer miembros' },
  desconectar: { user: [PermissionFlagsBits.MoveMembers], bot: [PermissionFlagsBits.MoveMembers], label: 'Mover miembros' },
  mover: { user: [PermissionFlagsBits.MoveMembers], bot: [PermissionFlagsBits.MoveMembers], label: 'Mover miembros' },
  'recrear-canal': { user: [PermissionFlagsBits.ManageChannels], bot: [PermissionFlagsBits.ManageChannels], label: 'Gestionar canales' },
};

/** Revisa los permisos reales; responde con un embed de error y devuelve false si faltan. */
async function needPerms(interaction: ChatInputCommandInteraction, sub: string): Promise<boolean> {
  const perms = SUB_PERMS[sub];
  if (!perms) return true;
  if (perms.user.length > 0 && !interaction.memberPermissions?.has(perms.user as never)) {
    await interaction.reply({ embeds: [Embeds.error('Permisos insuficientes', `Necesitas **${perms.label}** para usar \`${sub}\`.` )], ephemeral: true });
    return false;
  }
  const me = interaction.guild?.members.me;
  if (perms.bot.length > 0 && me && !me.permissions.has(perms.bot as never)) {
    await interaction.reply({ embeds: [Embeds.error('Permisos del bot', `Necesito **${perms.label}** para usar \`${sub}\`.` )], ephemeral: true });
    return false;
  }
  return true;
}

async function safeError(interaction: ChatInputCommandInteraction, title: string, description: string): Promise<void> {
  const embed = Embeds.error(title, description);
  try {
    if (interaction.deferred) await interaction.editReply({ embeds: [embed] });
    else if (interaction.replied) await interaction.followUp({ embeds: [embed], ephemeral: true });
    else await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch {
    /* respuesta ya consumida */
  }
}

/** Ejecutor compartido de borrado para los subcomandos limpiar-* (respeta el límite de 14 días). */
async function runPurge(
  interaction: ChatInputCommandInteraction,
  amount: number,
  label: string,
  filter: (m: Message) => boolean,
): Promise<void> {
  const channel = interaction.channel;
  if (!channel?.isTextBased() || channel.type !== ChannelType.GuildText) {
    await safeError(interaction, 'Canal inválido', 'Usa un canal de texto del servidor.');
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    const fetched = await channel.messages.fetch({ limit: 100 });
    const fresh = [...fetched.values()].filter((m) => Date.now() - m.createdTimestamp < 14 * 24 * 3600_000);
    const toDelete = fresh.filter(filter).slice(0, amount);
    if (toDelete.length === 0) {
      await interaction.editReply({ embeds: [Embeds.info('Nada que borrar', `No se encontraron mensajes ${label} en los últimos 100.`)] });
      return;
    }
    await channel.bulkDelete(toDelete, true);
    await interaction.editReply({ embeds: [Embeds.success('Limpieza completada', `Se eliminaron **${toDelete.length}** mensajes ${label}.`)] });
  } catch {
    await safeError(interaction, 'Limpieza fallida', 'No pude borrar esos mensajes. Revisa mis permisos.');
  }
}

const LINK_RE = /https?:\/\/|discord\.gg(?:\/|$)|discord(?:app)?\.com\/invite/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|$)/i;

export const modextra: Command = {
  data: new SlashCommandBuilder()
    .setName('moderacion')
    .setDescription('Herramientas extra de moderación')
    .addSubcommand((s) =>
      s.setName('baneo-suave').setDescription('Banea y desbanea para borrar mensajes')
        .addUserOption((o) => o.setName('usuario').setDescription('Miembro a banear suavemente').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setMaxLength(512))
        .addIntegerOption((o) => o.setName('borrar-dias').setDescription('Días de mensajes a borrar (0-7)').setMinValue(0).setMaxValue(7)),
    )
    .addSubcommand((s) =>
      s.setName('baneo-id').setDescription('Banea a un usuario por ID sin que esté en el servidor')
        .addStringOption((o) => o.setName('usuario-id').setDescription('ID del usuario a banear').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setMaxLength(512)),
    )
    .addSubcommand((s) =>
      s.setName('quitar-aviso').setDescription('Quita una advertencia por índice (más reciente primero)')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addIntegerOption((o) => o.setName('indice').setDescription('Número de advertencia (1 = más reciente)').setRequired(true).setMinValue(1)),
    )
    .addSubcommand((s) =>
      s.setName('borrar-avisos').setDescription('Borra todas las advertencias de un usuario')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('baneo-temporal').setDescription('Banea temporalmente (desbaneo manual con /desbanear)')
        .addUserOption((o) => o.setName('usuario').setDescription('Miembro a banear temporalmente').setRequired(true))
        .addStringOption((o) => o.setName('duracion').setDescription('p. ej. 10m, 1h, 1d').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setMaxLength(512)),
    )
    .addSubcommand((s) => s.setName('lista-aislados').setDescription('Lista usuarios con aislamiento activo'))
    .addSubcommand((s) =>
      s.setName('limpiar-bots').setDescription('Borra mensajes de bots')
        .addIntegerOption((o) => o.setName('cantidad').setDescription('Cantidad a borrar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s.setName('limpiar-enlaces').setDescription('Borra mensajes con enlaces/invitaciones')
        .addIntegerOption((o) => o.setName('cantidad').setDescription('Cantidad a borrar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s.setName('limpiar-imagenes').setDescription('Borra mensajes con imágenes/adjuntos')
        .addIntegerOption((o) => o.setName('cantidad').setDescription('Cantidad a borrar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s.setName('limpiar-usuario').setDescription('Borra mensajes de un usuario')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addIntegerOption((o) => o.setName('cantidad').setDescription('Cantidad a borrar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s.setName('ensordecer').setDescription('Ensordece a un miembro en voz')
        .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setMaxLength(512)),
    )
    .addSubcommand((s) =>
      s.setName('desensordecer').setDescription('Quita el ensordecimiento a un miembro en voz')
        .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('desconectar').setDescription('Desconecta a un miembro de voz')
        .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setMaxLength(512)),
    )
    .addSubcommand((s) =>
      s.setName('mover').setDescription('Mueve a un miembro a otro canal de voz')
        .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
        .addChannelOption((o) => o.setName('canal').setDescription('Canal de voz de destino').addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice).setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setMaxLength(512)),
    )
    .addSubcommand((s) =>
      s.setName('recrear-canal').setDescription('Clona el canal actual y elimina el anterior')
        .addStringOption((o) => o.setName('confirmar').setDescription('Escribe el nombre del canal para confirmar').setRequired(true).setMaxLength(100)),
    ),
  cooldown: 5,
  guildOnly: true,
  async execute(interaction) {
    if (!interaction.guild) {
      await safeError(interaction, 'Solo en servidor', 'Usa este comando dentro de un servidor.');
      return;
    }
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'baneo-suave': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const user = interaction.options.getUser('usuario', true);
          const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
          const deleteDays = interaction.options.getInteger('borrar-dias') ?? 0;
          const member = await interaction.guild.members.fetch(user.id).catch(() => null);
          if (member) {
            const block = canModerate(interaction.member as never, member as never, interaction.guild.ownerId);
            if (block) {
              await interaction.reply({ embeds: [Embeds.error('No se puede aplicar baneo suave', block)], ephemeral: true });
              break;
            }
          }
          await interaction.guild.members.ban(user.id, {
            reason: `${reason} | baneo suave por ${interaction.user.tag}`,
            deleteMessageSeconds: deleteDays * 86400,
          });
          await interaction.guild.members.unban(user.id, `Limpieza de baneo suave | por ${interaction.user.tag}`).catch(() => undefined);
          await interaction.reply({ embeds: [Embeds.success('Baneo suave aplicado', `**${user.tag}** recibió un baneo suave (baneo + desbaneo).\n**Días borrados:** ${deleteDays}\n**Motivo:** ${reason}`).setThumbnail(user.displayAvatarURL())] });
        } catch {
          await safeError(interaction, 'Baneo suave fallido', 'Revisa la posición de mi rol y mis permisos.');
        }
        break;
      }

      case 'baneo-id': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const userId = interaction.options.getString('usuario-id', true).trim();
          const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
          if (!/^\d{15,25}$/.test(userId)) {
            await interaction.reply({ embeds: [Embeds.error('ID inválida', 'Proporciona un ID de usuario de Discord válido (15-25 dígitos).')], ephemeral: true });
            break;
          }
          await interaction.guild.members.ban(userId, { reason: `${reason} | baneo por ID por ${interaction.user.tag}` });
          await interaction.reply({ embeds: [Embeds.success('Baneo por ID aplicado', `El usuario \`${userId}\` fue baneado.\n**Motivo:** ${reason}`)] });
        } catch {
          await safeError(interaction, 'Baneo por ID fallido', 'El usuario ya podría estar baneado, o el ID / mis permisos no son válidos.');
        }
        break;
      }

      case 'quitar-aviso': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const user = interaction.options.getUser('usuario', true);
          const index = interaction.options.getInteger('indice', true);
          const list = await Warning.find({ guildId: interaction.guildId!, userId: user.id }).sort({ createdAt: -1 });
          if (list.length === 0) {
            await interaction.reply({ embeds: [Embeds.info('Sin advertencias', `**${user.tag}** no tiene advertencias.`)], ephemeral: true });
            break;
          }
          if (index < 1 || index > list.length) {
            await interaction.reply({ embeds: [Embeds.error('Índice inválido', `Usa 1–${list.length} (1 = más reciente).`)], ephemeral: true });
            break;
          }
          const target = list[index - 1];
          await Warning.deleteOne({ _id: target._id });
          const remaining = list.length - 1;
          await interaction.reply({ embeds: [Embeds.success('Advertencia eliminada', `Se eliminó la advertencia **#${index}** de **${user.tag}**.\n> ${target.reason}\nRestantes: **${remaining}**.`)] });
        } catch {
          await safeError(interaction, 'No se pudo quitar', 'No se pudo eliminar esa advertencia.');
        }
        break;
      }

      case 'borrar-avisos': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const user = interaction.options.getUser('usuario', true);
          const res = await Warning.deleteMany({ guildId: interaction.guildId!, userId: user.id });
          await interaction.reply({ embeds: [Embeds.success('Advertencias borradas', `Se eliminaron **${res.deletedCount ?? 0}** advertencias de **${user.tag}**.`)] });
        } catch {
          await safeError(interaction, 'Borrado fallido', 'No se pudieron borrar las advertencias.');
        }
        break;
      }

      case 'baneo-temporal': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const user = interaction.options.getUser('usuario', true);
          const raw = interaction.options.getString('duracion', true);
          const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
          const durationMs = ms(raw);
          if (!durationMs || durationMs < 60_000 || durationMs > 28 * 24 * 3600_000) {
            await interaction.reply({ embeds: [Embeds.error('Duración inválida', 'Usa 1m–28d, p. ej. `10m`, `1h`, `1d`.')], ephemeral: true });
            break;
          }
          const member = await interaction.guild.members.fetch(user.id).catch(() => null);
          if (member) {
            const block = canModerate(interaction.member as never, member as never, interaction.guild.ownerId);
            if (block) {
              await interaction.reply({ embeds: [Embeds.error('No se puede aplicar baneo temporal', block)], ephemeral: true });
              break;
            }
          }
          await interaction.guild.members.ban(user.id, { reason: `TEMPBAN ${raw} | ${reason} | por ${interaction.user.tag}` });
          await interaction.reply({
            embeds: [Embeds.success('Baneo temporal aplicado', `**${user.tag}** fue baneado durante **${raw}**.\n**Motivo:** ${reason}\nDesbanea manualmente con \`/desbanear\` — no se usa un temporizador persistente.`).setThumbnail(user.displayAvatarURL())],
          });
        } catch {
          await safeError(interaction, 'Baneo temporal fallido', 'Revisa la posición de mi rol y mis permisos.');
        }
        break;
      }

      case 'lista-aislados': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const members = await interaction.guild.members.fetch();
          const muted = [...members.values()].filter(
            (m) => m.communicationDisabledUntil && m.communicationDisabledUntil.getTime() > Date.now(),
          );
          if (muted.length === 0) {
            await interaction.reply({ embeds: [Embeds.info('Sin aislamientos', 'Nadie tiene un aislamiento activo ahora mismo.')], ephemeral: true });
            break;
          }
          const desc = muted.slice(0, 20).map((m) => `• **${m.user.tag}** — hasta <t:${Math.floor((m.communicationDisabledUntil?.getTime() ?? 0) / 1000)}:R>`).join('\n');
          await interaction.reply({ embeds: [Embeds.info(`Usuarios aislados (${muted.length})`, desc)], ephemeral: true });
        } catch {
          await safeError(interaction, 'Obtención fallida', 'No se pudieron obtener los miembros aislados. Revisa el intent de miembros del servidor.');
        }
        break;
      }

      case 'limpiar-bots': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const amount = interaction.options.getInteger('cantidad', true);
          await runPurge(interaction, amount, 'de bots', (m) => m.author.bot);
        } catch {
          await safeError(interaction, 'Limpieza fallida', 'No se pudieron borrar los mensajes de bots.');
        }
        break;
      }

      case 'limpiar-enlaces': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const amount = interaction.options.getInteger('cantidad', true);
          await runPurge(interaction, amount, 'con enlaces', (m) => LINK_RE.test(m.content));
        } catch {
          await safeError(interaction, 'Limpieza fallida', 'No se pudieron borrar los mensajes con enlaces.');
        }
        break;
      }

      case 'limpiar-imagenes': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const amount = interaction.options.getInteger('cantidad', true);
          await runPurge(interaction, amount, 'con imágenes', (m) => m.attachments.size > 0 || IMAGE_EXT_RE.test(m.content) || m.embeds.some((e) => e.image));
        } catch {
          await safeError(interaction, 'Limpieza fallida', 'No se pudieron borrar los mensajes con imágenes.');
        }
        break;
      }

      case 'limpiar-usuario': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const user = interaction.options.getUser('usuario', true);
          const amount = interaction.options.getInteger('cantidad', true);
          await runPurge(interaction, amount, `de **${user.tag}**`, (m) => m.author.id === user.id);
        } catch {
          await safeError(interaction, 'Limpieza fallida', 'No se pudieron borrar esos mensajes.');
        }
        break;
      }

      case 'ensordecer': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const user = interaction.options.getUser('usuario', true);
          const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
          const member = await interaction.guild.members.fetch(user.id).catch(() => null);
          if (!member) {
            await interaction.reply({ embeds: [Embeds.error('No encontrado', 'El miembro no está en este servidor.')], ephemeral: true });
            break;
          }
          if (!member.voice.channel) {
            await interaction.reply({ embeds: [Embeds.error('Sin voz', `**${user.tag}** no está en un canal de voz.`)], ephemeral: true });
            break;
          }
          const block = canModerate(interaction.member as never, member as never, interaction.guild.ownerId);
          if (block) {
            await interaction.reply({ embeds: [Embeds.error('No se puede ensordecer', block)], ephemeral: true });
            break;
          }
          await member.voice.setDeaf(true, `${reason} | por ${interaction.user.tag}`);
          await interaction.reply({ embeds: [Embeds.success('Ensordecido', `**${user.tag}** fue ensordecido en el servidor.\n**Motivo:** ${reason}`)] });
        } catch {
          await safeError(interaction, 'Ensordecimiento fallido', 'Revisa la posición de mi rol y mis permisos de voz.');
        }
        break;
      }

      case 'desensordecer': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const user = interaction.options.getUser('usuario', true);
          const member = await interaction.guild.members.fetch(user.id).catch(() => null);
          if (!member) {
            await interaction.reply({ embeds: [Embeds.error('No encontrado', 'El miembro no está en este servidor.')], ephemeral: true });
            break;
          }
          await member.voice.setDeaf(false, `Ensordecimiento retirado por ${interaction.user.tag}`);
          await interaction.reply({ embeds: [Embeds.success('Ensordecimiento retirado', `A **${user.tag}** se le retiró el ensordecimiento.`)] });
        } catch {
          await safeError(interaction, 'Falló al retirar ensordecimiento', 'Revisa la posición de mi rol y mis permisos de voz.');
        }
        break;
      }

      case 'desconectar': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const user = interaction.options.getUser('usuario', true);
          const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
          const member = await interaction.guild.members.fetch(user.id).catch(() => null);
          if (!member) {
            await interaction.reply({ embeds: [Embeds.error('No encontrado', 'El miembro no está en este servidor.')], ephemeral: true });
            break;
          }
          if (!member.voice.channel) {
            await interaction.reply({ embeds: [Embeds.error('Sin voz', `**${user.tag}** no está en un canal de voz.`)], ephemeral: true });
            break;
          }
          const block = canModerate(interaction.member as never, member as never, interaction.guild.ownerId);
          if (block) {
            await interaction.reply({ embeds: [Embeds.error('No se puede desconectar', block)], ephemeral: true });
            break;
          }
          await member.voice.disconnect(`${reason} | por ${interaction.user.tag}`);
          await interaction.reply({ embeds: [Embeds.success('Desconectado', `**${user.tag}** fue desconectado de voz.\n**Motivo:** ${reason}`)] });
        } catch {
          await safeError(interaction, 'Desconexión fallida', 'Revisa la posición de mi rol y mis permisos de voz.');
        }
        break;
      }

      case 'mover': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const user = interaction.options.getUser('usuario', true);
          const target = interaction.options.getChannel('canal', true);
          const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
          if (target.type !== ChannelType.GuildVoice && target.type !== ChannelType.GuildStageVoice) {
            await interaction.reply({ embeds: [Embeds.error('Canal inválido', 'El destino debe ser un canal de voz.')], ephemeral: true });
            break;
          }
          const member = await interaction.guild.members.fetch(user.id).catch(() => null);
          if (!member) {
            await interaction.reply({ embeds: [Embeds.error('No encontrado', 'El miembro no está en este servidor.')], ephemeral: true });
            break;
          }
          if (!member.voice.channel) {
            await interaction.reply({ embeds: [Embeds.error('Sin voz', `**${user.tag}** no está en un canal de voz.`)], ephemeral: true });
            break;
          }
          const block = canModerate(interaction.member as never, member as never, interaction.guild.ownerId);
          if (block) {
            await interaction.reply({ embeds: [Embeds.error('No se puede mover', block)], ephemeral: true });
            break;
          }
          await member.voice.setChannel(target.id, `${reason} | por ${interaction.user.tag}`);
          await interaction.reply({ embeds: [Embeds.success('Movido', `**${user.tag}** fue movido a <#${target.id}>.\n**Motivo:** ${reason}`)] });
        } catch {
          await safeError(interaction, 'Traslado fallido', 'Revisa la posición de mi rol y mis permisos de voz.');
        }
        break;
      }

      case 'recrear-canal': {
        try {
          if (!(await needPerms(interaction, sub))) break;
          const confirm = interaction.options.getString('confirmar', true).trim();
          const channel = interaction.channel;
          if (!channel?.isTextBased() || channel.type !== ChannelType.GuildText) {
            await interaction.reply({ embeds: [Embeds.error('Canal inválido', 'Usa un canal de texto del servidor.')], ephemeral: true });
            break;
          }
          if (confirm !== channel.name) {
            await interaction.reply({ embeds: [Embeds.error('Confirmación incorrecta', `Escribe el nombre exacto del canal \`#${channel.name}\` para confirmar.`)], ephemeral: true });
            break;
          }
          await interaction.deferReply();
          const clone = await channel.clone({ reason: `Canal recreado por ${interaction.user.tag}` });
          await clone.setPosition(channel.position).catch(() => undefined);
          const oldId = channel.id;
          await channel.delete(`Canal eliminado por ${interaction.user.tag}`).catch(() => undefined);
          const embed = Embeds.success('Canal recreado', `El canal fue clonado y \`#${oldId}\` eliminado por **${interaction.user.tag}**.`);
          await interaction.editReply({ embeds: [embed] }).catch(() => undefined);
          await clone.send({ embeds: [embed] }).catch(() => undefined);
        } catch {
          await safeError(interaction, 'Recreación fallida', 'Revisa mi permiso de Gestionar canales y la posición del rol.');
        }
        break;
      }

      default: {
        await safeError(interaction, 'Subcomando desconocido', 'Usa uno de los subcomandos de `/moderacion`.');
        break;
      }
    }
  },
};
