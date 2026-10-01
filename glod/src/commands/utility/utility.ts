/**
 * Utility: /avatar /usuario /servidor /ver-rol /canal /bot /ping /calculadora /recordatorio
 */
import { ChannelType, EmbedBuilder, PermissionFlagsBits, Role, SlashCommandBuilder, version as djsVersion } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Colors } from '../../config.js';
import { Embeds } from '../../utils/embeds.js';
import { Reminder } from '../../database/models/entities.js';
import ms from 'ms';

export const avatar: Command = {
  data: new SlashCommandBuilder().setName('avatar').setDescription('Muestra el avatar de un usuario').addUserOption((o) => o.setName('usuario').setDescription('Usuario del que ver el avatar')),
  cooldown: 3,
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') ?? interaction.user;
    const embed = Embeds.primary(`Avatar — ${user.tag}`, '').setImage(user.displayAvatarURL({ size: 512 }));
    await interaction.reply({ embeds: [embed] });
  },
};

export const userinfo: Command = {
  data: new SlashCommandBuilder().setName('usuario').setDescription('Muestra información de un usuario').addUserOption((o) => o.setName('usuario').setDescription('Usuario del que ver la información')),
  cooldown: 3,
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') ?? interaction.user;
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    const embed = Embeds.primary(`Usuario — ${user.tag}`, `ID: \`${user.id}\`\nBot: **${user.bot ? 'Sí' : 'No'}**\nCreado: <t:${Math.floor(user.createdTimestamp / 1000)}:R>\n${member ? `Se unió: <t:${Math.floor((member.joinedTimestamp ?? 0) / 1000)}:R>\nRoles: ${member.roles.cache.size - 1}` : ''}`).setThumbnail(user.displayAvatarURL());
    await interaction.reply({ embeds: [embed] });
  },
};

export const serverinfo: Command = {
  data: new SlashCommandBuilder().setName('servidor').setDescription('Muestra información del servidor'),
  cooldown: 5,
  async execute(interaction) {
    const g = interaction.guild!;
    const embed = Embeds.primary(`Servidor — ${g.name}`, `ID: \`${g.id}\`\nPropietario: <@${g.ownerId}>\nMiembros: **${g.memberCount}**\nCanales: **${g.channels.cache.size}**\nRoles: **${g.roles.cache.size}**\nCreado: <t:${Math.floor(g.createdTimestamp / 1000)}:D>`)
      .setThumbnail(g.iconURL() ?? null);
    await interaction.reply({ embeds: [embed] });
  },
};

export const roleinfo: Command = {
  data: new SlashCommandBuilder().setName('ver-rol').setDescription('Muestra información de un rol').addRoleOption((o) => o.setName('rol').setDescription('Rol del que ver la información').setRequired(true)),
  cooldown: 3,
  async execute(interaction) {
    const role = interaction.options.getRole('rol', true) as Role;
    await interaction.reply({ embeds: [Embeds.primary(`Rol — ${role.name}`, `ID: \`${role.id}\`\nColor: \`${role.hexColor}\`\nMiembros: **${role.members.size}**\nMencionable: **${role.mentionable ? 'Sí' : 'No'}**`)] });
  },
};

export const channelinfo: Command = {
  data: new SlashCommandBuilder().setName('canal').setDescription('Muestra información de un canal').addChannelOption((o) => o.setName('canal').setDescription('Canal del que ver la información')),
  cooldown: 3,
  async execute(interaction) {
    const ch = (interaction.options.getChannel('canal') ?? interaction.channel) as { id: string; name?: string; type?: unknown } | null;
    if (!ch) {
      await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Canal no encontrado.')], ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [Embeds.primary('Información del canal', `ID: \`${ch.id}\`\nNombre: **${'name' in ch ? (ch as { name: string }).name : 'MD'}**`)] });
  },
};

export const botinfo: Command = {
  data: new SlashCommandBuilder().setName('bot').setDescription('Muestra información del bot'),
  cooldown: 5,
  async execute(interaction, client) {
    const uptime = Math.floor((Date.now() - client.startTime) / 1000);
    const embed = new EmbedBuilder().setColor(Colors.primary).setTitle('Glod — Información del bot')
      .setDescription(`Servidores: **${client.guilds.cache.size}**\nUsuarios: **${client.users.cache.size}**\nTiempo activo: **${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m**\nDiscord.js: \`${djsVersion}\`\nComandos: **${client.commands.size}**`)
      .setThumbnail(client.user?.displayAvatarURL() ?? null).setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export const ping: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Comprueba la latencia del bot'),
  cooldown: 3,
  async execute(interaction, client) {
    const sent = await interaction.reply({ embeds: [Embeds.info('Midiendo…', 'Midiendo la latencia.')] });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({ embeds: [Embeds.success('¡Pong!', `Ida y vuelta: **${latency}ms**\nWebSocket: **${client.ws.ping}ms**`)] });
  },
};

export const calculator: Command = {
  data: new SlashCommandBuilder().setName('calculadora').setDescription('Evalúa una expresión matemática').addStringOption((o) => o.setName('expresion').setDescription('p. ej. (2+3)*4').setRequired(true).setMaxLength(100)),
  cooldown: 3,
  async execute(interaction) {
    const expr = interaction.options.getString('expresion', true);
    if (!/^[\d\s+\-*/().%^]+$/.test(expr)) {
      await interaction.reply({ embeds: [Embeds.error('Expresión inválida', 'Solo se permiten números y `+ - * / ( ) . % ^`.')], ephemeral: true });
      return;
    }
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr.replace(/\^/g, '**')})`)() as number;
      if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('NaN');
      await interaction.reply({ embeds: [Embeds.primary('🧮 Calculadora', `\`${expr}\` = **${result}**`)] });
    } catch {
      await interaction.reply({ embeds: [Embeds.error('Error', 'No se pudo evaluar esa expresión.')], ephemeral: true });
    }
  },
};

export const reminder: Command = {
  data: new SlashCommandBuilder()
    .setName('recordatorio')
    .setDescription('Gestiona tus recordatorios')
    .addSubcommand((s) => s.setName('crear').setDescription('Crea un recordatorio').addStringOption((o) => o.setName('en').setDescription('Tiempo hasta avisar: p. ej. 10m, 2h, 1d').setRequired(true)).addStringOption((o) => o.setName('texto').setDescription('Texto del recordatorio').setRequired(true).setMaxLength(500)))
    .addSubcommand((s) => s.setName('listar').setDescription('Muestra tus recordatorios pendientes')),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'listar') {
      const list = await Reminder.find({ userId: interaction.user.id, delivered: false }).sort({ remindAt: 1 }).limit(10);
      const desc = list.length ? list.map((r) => `• <t:${Math.floor(r.remindAt.getTime() / 1000)}:R> — ${r.text}`).join('\n') : '*Sin recordatorios pendientes*';
      await interaction.reply({ embeds: [Embeds.info('⏰ Tus recordatorios', desc)], ephemeral: true });
      return;
    }
    const raw = interaction.options.getString('en', true);
    const text = interaction.options.getString('texto', true);
    const delay = ms(raw);
    if (!delay || delay < 10_000 || delay > 30 * 24 * 3600_000) {
      await interaction.reply({ embeds: [Embeds.error('Tiempo inválido', 'Usa entre 10s y 30d, p. ej. `10m`.')], ephemeral: true });
      return;
    }
    const doc = await Reminder.create({ userId: interaction.user.id, channelId: interaction.channelId, text, remindAt: new Date(Date.now() + delay), guildId: interaction.guildId });
    await interaction.reply({ embeds: [Embeds.success('Recordatorio creado', `Te avisaré <t:${Math.floor(doc.remindAt.getTime() / 1000)}:R>.\n> ${text}`)] });
  },
};

export const __channelType = ChannelType.GuildText;
export const __perm = PermissionFlagsBits.SendMessages;
