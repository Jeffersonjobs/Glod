/**
 * Info: /info <18 subcomandos informativos del servidor>.
 * Solo lectura, sin permisos especiales, cooldown 3.
 */
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

export const info: Command = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Información del servidor')
    .addSubcommand((s) => s.setName('miembros').setDescription('Total de miembros, humanos y bots'))
    .addSubcommand((s) => s.setName('roles').setDescription('Top 20 roles por miembros'))
    .addSubcommand((s) => s.setName('emojis').setDescription('Emojis del servidor y conteo de animados'))
    .addSubcommand((s) => s.setName('stickers').setDescription('Stickers del servidor'))
    .addSubcommand((s) => s.setName('impulsos').setDescription('Nivel y conteo de impulsos'))
    .addSubcommand((s) => s.setName('icono-servidor').setDescription('Icono del servidor en alta resolución'))
    .addSubcommand((s) => s.setName('banner').setDescription('Banner del servidor'))
    .addSubcommand((s) => s.setName('splash').setDescription('Fondo de invitación del servidor'))
    .addSubcommand((s) => s.setName('invitaciones').setDescription('Top 5 invitaciones por usos (requiere gestionar servidor)'))
    .addSubcommand((s) => s.setName('canales').setDescription('Conteo de canales por tipo'))
    .addSubcommand((s) => s.setName('bots').setDescription('Lista de bots y conteo'))
    .addSubcommand((s) => s.setName('humanos').setDescription('Conteo de humanos'))
    .addSubcommand((s) => s.setName('veteranos').setDescription('Los 5 miembros más antiguos'))
    .addSubcommand((s) => s.setName('nuevos').setDescription('Los 5 miembros más recientes'))
    .addSubcommand((s) => s.setName('permisos').setDescription('Tus permisos clave en el servidor'))
    .addSubcommand((s) =>
      s
        .setName('snowflake')
        .setDescription('Convierte un ID de Discord a fecha')
        .addStringOption((o) => o.setName('id').setDescription('ID snowflake de Discord').setRequired(true).setMaxLength(25)),
    )
    .addSubcommand((s) => s.setName('avatar-servidor').setDescription('Avatar del servidor en alta resolución'))
    .addSubcommand((s) => s.setName('servidor').setDescription('Resumen general del servidor')),
  cooldown: 3,
  guildOnly: true,
  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ embeds: [Embeds.error('Sin servidor', 'Este comando solo funciona en un servidor.')], ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'servidor') {
      const embed = Embeds.primary(
        `Servidor — ${guild.name}`,
        `ID: \`${guild.id}\`\nPropietario: <@${guild.ownerId}>\nCreado: <t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)\nMiembros: **${guild.memberCount}**\nCanales: **${guild.channels.cache.size}**\nRoles: **${guild.roles.cache.size}**\nEmojis: **${guild.emojis.cache.size}**\nStickers: **${guild.stickers.cache.size}**\nImpulsos: nivel **${guild.premiumTier}** (${guild.premiumSubscriptionCount ?? 0})\nIdioma: \`${guild.preferredLocale}\``,
      );
      const icon = guild.iconURL({ size: 256 });
      if (icon) embed.setThumbnail(icon);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'miembros') {
      await interaction.deferReply();
      const members = await guild.members.fetch().catch(() => null);
      if (members) {
        const bots = members.filter((m) => m.user.bot).size;
        const humans = members.size - bots;
        await interaction.editReply({
          embeds: [Embeds.primary(`Miembros — ${guild.name}`, `Total: **${members.size}**\nHumanos: **${humans}**\nBots: **${bots}**`)],
        });
      } else {
        await interaction.editReply({
          embeds: [Embeds.primary(`Miembros — ${guild.name}`, `Total (aprox.): **${guild.memberCount}**\n*No se pudo detallar humanos y bots.*`)],
        });
      }
      return;
    }

    if (sub === 'roles') {
      await interaction.deferReply();
      await guild.members.fetch().catch(() => null);
      const top = guild.roles.cache
        .filter((r) => r.id !== guild.id)
        .sort((a, b) => b.members.size - a.members.size)
        .first(20);
      const desc = top.length
        ? top.map((r, i) => `\`${i + 1}.\` <@&${r.id}> — **${r.members.size}** miembros`).join('\n')
        : '*Sin roles (además de @everyone).*';
      await interaction.editReply({
        embeds: [Embeds.primary(`Roles — ${guild.name} (${guild.roles.cache.size})`, desc.slice(0, 4000))],
      });
      return;
    }

    if (sub === 'emojis') {
      const all = guild.emojis.cache;
      const animated = all.filter((e) => e.animated === true).size;
      const list = all
        .first(20)
        .map((e) => `${e} \`:${e.name ?? '?' }:\``)
        .join('\n');
      await interaction.reply({
        embeds: [Embeds.primary(`Emojis — ${guild.name}`, `Total: **${all.size}** (animados: **${animated}**, estáticos: **${all.size - animated}**)\n\n${list || '*Sin emojis.*'}`.slice(0, 4000))],
      });
      return;
    }

    if (sub === 'stickers') {
      const all = guild.stickers.cache;
      const list = all
        .first(20)
        .map((s) => `\`${s.name}\` (\`${s.id}\`)`)
        .join('\n');
      await interaction.reply({
        embeds: [Embeds.primary(`Stickers — ${guild.name} (${all.size})`, list || '*Sin stickers.*'.slice(0, 4000))],
      });
      return;
    }

    if (sub === 'impulsos') {
      const level = guild.premiumTier;
      const count = guild.premiumSubscriptionCount ?? 0;
      const thresholds = [0, 2, 7, 14];
      const next = thresholds.find((t) => t > count) ?? null;
      const filled = Math.min(10, Math.round((count / 14) * 10));
      const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
      await interaction.reply({
        embeds: [
          Embeds.primary(
            `Impulsos — ${guild.name}`,
            `Nivel: **${level}**\nImpulsos: **${count}**\n${bar}\n${next !== null ? `Faltan **${next - count}** para el siguiente nivel.` : '*Nivel máximo alcanzado.*'}`,
          ),
        ],
      });
      return;
    }

    if (sub === 'icono-servidor') {
      const url = guild.iconURL({ size: 1024 });
      if (!url) {
        await interaction.reply({ embeds: [Embeds.error('Sin icono', 'Este servidor no tiene icono.')], ephemeral: true });
        return;
      }
      const embed = Embeds.primary(`Icono — ${guild.name}`, `[Abrir en el navegador](${url})`).setImage(url);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'banner') {
      const url = await guild.fetch().then((g) => g.bannerURL({ size: 1024 })).catch(() => guild.bannerURL({ size: 1024 }));
      if (!url) {
        await interaction.reply({ embeds: [Embeds.error('Sin banner', 'Este servidor no tiene banner.')], ephemeral: true });
        return;
      }
      const embed = Embeds.primary(`Banner — ${guild.name}`, `[Abrir en el navegador](${url})`).setImage(url);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'splash') {
      const url = guild.splashURL({ size: 1024 });
      if (!url) {
        await interaction.reply({ embeds: [Embeds.error('Sin fondo', 'Este servidor no tiene fondo de invitación.')], ephemeral: true });
        return;
      }
      const embed = Embeds.primary(`Fondo — ${guild.name}`, `[Abrir en el navegador](${url})`).setImage(url);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'invitaciones') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          embeds: [Embeds.error('Sin permiso', 'Necesitas el permiso **Gestionar servidor** para ver las invitaciones.')],
          ephemeral: true,
        });
        return;
      }
      await interaction.deferReply();
      const invites = await guild.invites.fetch().catch(() => null);
      if (!invites) {
        await interaction.editReply({
          embeds: [Embeds.error('No disponible', 'No se pudieron obtener las invitaciones. Verifica que el bot tenga el permiso **Gestionar servidor**.')],
        });
        return;
      }
      if (invites.size === 0) {
        await interaction.editReply({ embeds: [Embeds.primary(`Invitaciones — ${guild.name}`, '*No hay invitaciones activas.*')] });
        return;
      }
      const top = [...invites.values()].sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0)).slice(0, 5);
      const desc = top
        .map((inv, i) => {
          const by = inv.inviter ? inv.inviter.tag : 'desconocido';
          const rawCh = inv.channel as unknown as { name?: string; id?: string } | null;
          const ch = rawCh ? `#${rawCh.name ?? rawCh.id ?? '?'}` : '?';
          return `\`${i + 1}.\` \`discord.gg/${inv.code}\` — usos: **${inv.uses ?? 0}**/${inv.maxUses || '∞'} · ${ch} · por ${by}`;
        })
        .join('\n');
      await interaction.editReply({ embeds: [Embeds.primary(`Invitaciones — ${guild.name} (${invites.size})`, desc.slice(0, 4000))] });
      return;
    }

    if (sub === 'canales') {
      const c = guild.channels.cache;
      const text = c.filter((ch) => ch.type === ChannelType.GuildText).size;
      const voice = c.filter((ch) => ch.type === ChannelType.GuildVoice).size;
      const category = c.filter((ch) => ch.type === ChannelType.GuildCategory).size;
      const forum = c.filter((ch) => ch.type === ChannelType.GuildForum).size;
      const news = c.filter((ch) => ch.type === ChannelType.GuildAnnouncement).size;
      const stage = c.filter((ch) => ch.type === ChannelType.GuildStageVoice).size;
      await interaction.reply({
        embeds: [
          Embeds.primary(
            `Canales — ${guild.name} (${c.size})`,
            `Texto: **${text}**\nVoz: **${voice}**\nCategorías: **${category}**\nForos: **${forum}**\nAnuncios: **${news}**\nEscenario: **${stage}**`,
          ),
        ],
      });
      return;
    }

    if (sub === 'bots') {
      await interaction.deferReply();
      const members = await guild.members.fetch().catch(() => null);
      if (!members) {
        await interaction.editReply({ embeds: [Embeds.error('No disponible', 'No se pudo obtener la lista de miembros.')] });
        return;
      }
      const bots = members.filter((m) => m.user.bot).sort((a, b) => a.user.tag.localeCompare(b.user.tag));
      const list = [...bots.values()].slice(0, 20).map((m) => `${m} \`${m.user.tag}\``).join('\n');
      await interaction.editReply({
        embeds: [Embeds.primary(`Bots — ${guild.name} (${bots.size})`, (list || '*Sin bots.*').slice(0, 4000))],
      });
      return;
    }

    if (sub === 'humanos') {
      await interaction.deferReply();
      const members = await guild.members.fetch().catch(() => null);
      if (!members) {
        await interaction.editReply({
          embeds: [Embeds.primary(`Humanos — ${guild.name}`, `Total (aprox.): **${guild.memberCount}**\n*Detalle no disponible.*`)],
        });
        return;
      }
      const humans = members.size - members.filter((m) => m.user.bot).size;
      const pct = members.size ? Math.round((humans / members.size) * 100) : 0;
      await interaction.editReply({
        embeds: [Embeds.primary(`Humanos — ${guild.name}`, `Humanos: **${humans}** de **${members.size}** (${pct}%)`)],
      });
      return;
    }

    if (sub === 'veteranos') {
      await interaction.deferReply();
      const members = await guild.members.fetch().catch(() => null);
      if (!members) {
        await interaction.editReply({ embeds: [Embeds.error('No disponible', 'No se pudo obtener la lista de miembros.')] });
        return;
      }
      const top = [...members.values()].sort((a, b) => (a.joinedTimestamp ?? 0) - (b.joinedTimestamp ?? 0)).slice(0, 5);
      const desc = top
        .map((m, i) => `\`${i + 1}.\` ${m} — <t:${Math.floor((m.joinedTimestamp ?? Date.now()) / 1000)}:D>`)
        .join('\n');
      await interaction.editReply({ embeds: [Embeds.primary(`Miembros más antiguos — ${guild.name}`, desc.slice(0, 4000))] });
      return;
    }

    if (sub === 'nuevos') {
      await interaction.deferReply();
      const members = await guild.members.fetch().catch(() => null);
      if (!members) {
        await interaction.editReply({ embeds: [Embeds.error('No disponible', 'No se pudo obtener la lista de miembros.')] });
        return;
      }
      const top = [...members.values()].sort((a, b) => (b.joinedTimestamp ?? 0) - (a.joinedTimestamp ?? 0)).slice(0, 5);
      const desc = top
        .map((m, i) => `\`${i + 1}.\` ${m} — <t:${Math.floor((m.joinedTimestamp ?? Date.now()) / 1000)}:R>`)
        .join('\n');
      await interaction.editReply({ embeds: [Embeds.primary(`Miembros más recientes — ${guild.name}`, desc.slice(0, 4000))] });
      return;
    }

    if (sub === 'permisos') {
      const perms = interaction.memberPermissions;
      if (!perms) {
        await interaction.reply({ embeds: [Embeds.error('No disponible', 'No se pudieron leer tus permisos.')], ephemeral: true });
        return;
      }
      const keys: Array<[string, bigint]> = [
        ['Administrador', PermissionFlagsBits.Administrator],
        ['Gestionar servidor', PermissionFlagsBits.ManageGuild],
        ['Gestionar roles', PermissionFlagsBits.ManageRoles],
        ['Gestionar canales', PermissionFlagsBits.ManageChannels],
        ['Gestionar mensajes', PermissionFlagsBits.ManageMessages],
        ['Expulsar miembros', PermissionFlagsBits.KickMembers],
        ['Banear miembros', PermissionFlagsBits.BanMembers],
        ['Moderar miembros', PermissionFlagsBits.ModerateMembers],
        ['Mencionar a todos', PermissionFlagsBits.MentionEveryone],
        ['Enviar mensajes', PermissionFlagsBits.SendMessages],
      ];
      const desc = keys.map(([name, bit]) => `${perms.has(bit) ? '✅' : '❌'} \`${name}\``).join('\n');
      await interaction.reply({ embeds: [Embeds.primary(`Tus permisos — ${guild.name}`, desc)], ephemeral: true });
      return;
    }

    if (sub === 'snowflake') {
      const id = interaction.options.getString('id', true).trim();
      if (!/^\d{17,20}$/.test(id)) {
        await interaction.reply({ embeds: [Embeds.error('ID inválida', 'Debe ser un snowflake numérico de 17 a 20 dígitos.')], ephemeral: true });
        return;
      }
      let ms: number;
      try {
        ms = Number((BigInt(id) >> 22n) + 1420070400000n);
      } catch {
        await interaction.reply({ embeds: [Embeds.error('ID inválida', 'No se pudo interpretar ese ID.')], ephemeral: true });
        return;
      }
      if (!Number.isFinite(ms)) {
        await interaction.reply({ embeds: [Embeds.error('ID inválida', 'No se pudo interpretar ese ID.')], ephemeral: true });
        return;
      }
      const unix = Math.floor(ms / 1000);
      await interaction.reply({
        embeds: [Embeds.primary('Snowflake', `ID: \`${id}\`\nCreado: <t:${unix}:F> (<t:${unix}:R>)\nMarca de tiempo: \`${ms}\``)],
      });
      return;
    }

    if (sub === 'avatar-servidor') {
      const url = guild.iconURL({ size: 512 });
      if (!url) {
        await interaction.reply({ embeds: [Embeds.error('Sin avatar', 'Este servidor no tiene icono.')], ephemeral: true });
        return;
      }
      const embed = Embeds.primary(`Avatar del servidor — ${guild.name}`, `[Abrir en el navegador](${url})`).setImage(url);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
  },
};
