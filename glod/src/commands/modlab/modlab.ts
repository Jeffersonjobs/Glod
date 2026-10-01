/**
 * Panel-mod: /panel-mod <25 utilidades de moderación/información solo lectura>.
 * Solo lectura salvo vista-limpieza (simulacro: cuenta sin borrar).
 * guildOnly, cooldown 3.
 */
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction, Role } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

async function errReply(interaction: ChatInputCommandInteraction, title: string, description: string): Promise<void> {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [Embeds.error(title, description)] });
    } else {
      await interaction.reply({ embeds: [Embeds.error(title, description)], ephemeral: true });
    }
  } catch {
    /* interaccion ya respondida o expirada */
  }
}

const USER_OPT = 'Usuario a consultar (por defecto tú).';

export const modlab: Command = {
  data: new SlashCommandBuilder()
    .setName('panel-mod')
    .setDescription('Herramientas de moderación e información (solo lectura)')
    .addSubcommand((s) => s.setName('usuario-insignias').setDescription('Insignias públicas de un usuario').addUserOption((o) => o.setName('usuario').setDescription(USER_OPT)))
    .addSubcommand((s) => s.setName('usuario-banner').setDescription('Banner de perfil de un usuario').addUserOption((o) => o.setName('usuario').setDescription(USER_OPT)))
    .addSubcommand((s) => s.setName('antiguedad-miembro').setDescription('Antigüedad de cuenta y de entrada al servidor').addUserOption((o) => o.setName('usuario').setDescription(USER_OPT)))
    .addSubcommand((s) => s.setName('posicion-entrada').setDescription('Posición de entrada al servidor').addUserOption((o) => o.setName('usuario').setDescription(USER_OPT)))
    .addSubcommand((s) => s.setName('roles-populares').setDescription('Top 10 roles por miembros'))
    .addSubcommand((s) => s.setName('rol-miembros').setDescription('Conteo + 10 primeros miembros de un rol').addRoleOption((o) => o.setName('rol').setDescription('Rol a consultar').setRequired(true)))
    .addSubcommand((s) => s.setName('rol-colores').setDescription('15 roles con su color hex'))
    .addSubcommand((s) => s.setName('estadisticas-emojis').setDescription('Estadísticas de emojis'))
    .addSubcommand((s) => s.setName('estadisticas-stickers').setDescription('Estadísticas de stickers'))
    .addSubcommand((s) => s.setName('progreso-boosts').setDescription('Progreso de boosts del servidor'))
    .addSubcommand((s) => s.setName('conteo-canales').setDescription('Conteo de canales por tipo'))
    .addSubcommand((s) => s.setName('conteo-voz').setDescription('Quién está en canales de voz'))
    .addSubcommand((s) => s.setName('conteo-hilos').setDescription('Conteo de hilos del servidor'))
    .addSubcommand((s) => s.setName('revisar-lento').setDescription('Modo lento de un canal').addChannelOption((o) => o.setName('canal').setDescription('Canal a revisar (por defecto el actual)')))
    .addSubcommand((s) => s.setName('revisar-nsfw').setDescription('Si un canal es NSFW').addChannelOption((o) => o.setName('canal').setDescription('Canal a revisar (por defecto el actual)')))
    .addSubcommand((s) => s.setName('permisos-bot').setDescription('Permisos del bot en este canal'))
    .addSubcommand((s) => s.setName('permisos-usuario').setDescription('8 permisos clave de un usuario').addUserOption((o) => o.setName('usuario').setDescription(USER_OPT)))
    .addSubcommand((s) => s.setName('jerarquia').setDescription('Compara jerarquía de roles bot vs objetivo vs tú').addUserOption((o) => o.setName('usuario').setDescription('Usuario objetivo').setRequired(true)))
    .addSubcommand((s) => s.setName('url-personalizada').setDescription('URL personalizada del servidor'))
    .addSubcommand((s) => s.setName('canal-reglas').setDescription('Canal de reglas del servidor'))
    .addSubcommand((s) => s.setName('ayuda-auditoria').setDescription('Dónde ver el registro de auditoría'))
    .addSubcommand((s) =>
      s
        .setName('vista-limpieza')
        .setDescription('SIMULACRO: cuenta borrables <14d sin borrar (requiere Gestionar mensajes)')
        .addIntegerOption((o) => o.setName('cantidad').setDescription('Últimos N mensajes a analizar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),
    )
    .addSubcommand((s) => s.setName('revisar-apodo').setDescription('Apodo actual de un usuario').addUserOption((o) => o.setName('usuario').setDescription(USER_OPT)))
    .addSubcommand((s) => s.setName('impulsores').setDescription('Miembros que están impulsando (boost)'))
    .addSubcommand((s) => s.setName('conteo-invitaciones').setDescription('Total de invitaciones activas (requiere Gestionar servidor)')),
  cooldown: 3,
  guildOnly: true,
  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ embeds: [Embeds.error('Sin servidor', 'Este comando solo funciona en un servidor.')], ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'usuario-insignias') {
      try {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const full = await user.fetch();
        const present = new Set<string>(full.flags?.toArray() ?? []);
        const known = [
          'Staff',
          'Partner',
          'HypeSquad',
          'BugHunterLevel1',
          'HypeSquadOnlineHouse1',
          'HypeSquadOnlineHouse2',
          'HypeSquadOnlineHouse3',
          'PremiumEarlySupporter',
          'BugHunterLevel2',
          'VerifiedDeveloper',
          'CertifiedModerator',
          'ActiveDeveloper',
        ];
        const desc = known.map((f) => `${present.has(f) ? '✅' : '❌'} \`${f}\``).join('\n');
        const embed = Embeds.primary(`Insignias — ${full.tag}`, desc).setThumbnail(full.displayAvatarURL());
        await interaction.reply({ embeds: [embed] });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudieron leer las insignias de ese usuario.');
      }
      return;
    }

    if (sub === 'usuario-banner') {
      try {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const full = await user.fetch();
        const url = full.bannerURL({ size: 1024 });
        if (!url) {
          await interaction.reply({ embeds: [Embeds.error('Sin banner', `${full} no tiene banner de perfil.`)], ephemeral: true });
          return;
        }
        const embed = Embeds.primary(`Banner — ${full.tag}`, `[Abrir en el navegador](${url})`).setImage(url);
        await interaction.reply({ embeds: [embed] });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo obtener el banner de ese usuario.');
      }
      return;
    }

    if (sub === 'antiguedad-miembro') {
      try {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) {
          await interaction.reply({ embeds: [Embeds.error('No encontrado', `${user} no es miembro de este servidor.`)], ephemeral: true });
          return;
        }
        const created = Math.floor(user.createdTimestamp / 1000);
        const joined = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
        const embed = Embeds.primary(
          `Antigüedad — ${user.tag}`,
          `Cuenta creada: <t:${created}:D> (<t:${created}:R>)\nSe unió: ${joined ? `<t:${joined}:D> (<t:${joined}:R>)` : '*desconocido*'}`,
        ).setThumbnail(user.displayAvatarURL());
        await interaction.reply({ embeds: [embed] });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo obtener la antigüedad de ese usuario.');
      }
      return;
    }

    if (sub === 'posicion-entrada') {
      try {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        await interaction.deferReply();
        const members = await guild.members.fetch().catch(() => null);
        if (!members) {
          await interaction.editReply({ embeds: [Embeds.error('No disponible', 'No se pudo obtener la lista de miembros.')] });
          return;
        }
        const ordered = [...members.values()].sort((a, b) => (a.joinedTimestamp ?? Number.MAX_SAFE_INTEGER) - (b.joinedTimestamp ?? Number.MAX_SAFE_INTEGER));
        const idx = ordered.findIndex((m) => m.id === user.id);
        if (idx === -1) {
          await interaction.editReply({ embeds: [Embeds.error('No encontrado', `${user} no es miembro de este servidor.`)] });
          return;
        }
        await interaction.editReply({
          embeds: [Embeds.primary(`Posición de entrada — ${user.tag}`, `${user} fue el miembro **#${idx + 1}** de **${ordered.length}**.`)],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo calcular la posición de entrada.');
      }
      return;
    }

    if (sub === 'roles-populares') {
      try {
        await interaction.deferReply();
        await guild.members.fetch().catch(() => null);
        const top = guild.roles.cache
          .filter((r) => r.id !== guild.id)
          .sort((a, b) => b.members.size - a.members.size)
          .first(10);
        const desc = top.length
          ? top.map((r, i) => `\`${i + 1}.\` <@&${r.id}> — **${r.members.size}** miembros`).join('\n')
          : '*Sin roles (además de @everyone).*';
        await interaction.editReply({ embeds: [Embeds.primary(`Roles populares — ${guild.name} (${guild.roles.cache.size})`, desc.slice(0, 4000))] });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo obtener el top de roles.');
      }
      return;
    }

    if (sub === 'rol-miembros') {
      try {
        const role = interaction.options.getRole('rol', true) as Role;
        const full = guild.roles.cache.get(role.id) ?? role;
        await interaction.deferReply();
        await guild.members.fetch().catch(() => null);
        const count = full.members.size;
        const list = [...full.members.values()].slice(0, 10).map((m) => `• ${m} \`${m.user.tag}\``).join('\n');
        await interaction.editReply({
          embeds: [Embeds.primary(`Rol — ${full.name} (${count})`, `${list || '*Sin miembros en caché.*'}\n\nID: \`${full.id}\``.slice(0, 4000))],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudieron obtener los miembros de ese rol.');
      }
      return;
    }

    if (sub === 'rol-colores') {
      try {
        const top = guild.roles.cache
          .filter((r) => r.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .first(15);
        const desc = top.length
          ? top.map((r, i) => `\`${i + 1}.\` <@&${r.id}> — \`${r.hexColor}\``).join('\n')
          : '*Sin roles (además de @everyone).*';
        await interaction.reply({ embeds: [Embeds.primary(`Colores de roles — ${guild.name}`, desc.slice(0, 4000))] });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudieron listar los colores de roles.');
      }
      return;
    }

    if (sub === 'estadisticas-emojis') {
      try {
        const all = guild.emojis.cache;
        const animated = all.filter((e) => e.animated === true).size;
        const list = all
          .first(10)
          .map((e) => `${e} \`:${e.name ?? '?' }:\``)
          .join('\n');
        await interaction.reply({
          embeds: [
            Embeds.primary(
              `Emojis — ${guild.name}`,
              `Total: **${all.size}** (animados: **${animated}**, estáticos: **${all.size - animated}**)\n\n${list || '*Sin emojis.*'}`.slice(0, 4000),
            ),
          ],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudieron obtener las estadísticas de emojis.');
      }
      return;
    }

    if (sub === 'estadisticas-stickers') {
      try {
        const all = guild.stickers.cache;
        const list = all
          .first(15)
          .map((s, i) => `\`${i + 1}.\` \`${s.name}\` (\`${s.id}\`)`)
          .join('\n');
        await interaction.reply({ embeds: [Embeds.primary(`Stickers — ${guild.name} (${all.size})`, (list || '*Sin stickers.*').slice(0, 4000))] });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudieron obtener las estadísticas de stickers.');
      }
      return;
    }

    if (sub === 'progreso-boosts') {
      try {
        const level = guild.premiumTier;
        const count = guild.premiumSubscriptionCount ?? 0;
        const thresholds = [0, 2, 7, 14];
        const next = thresholds.find((t) => t > count) ?? null;
        const filled = Math.min(10, Math.round((count / 14) * 10));
        const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
        await interaction.reply({
          embeds: [
            Embeds.primary(
              `Boosts — ${guild.name}`,
              `Nivel: **${level}**\nBoosts: **${count}**\n${bar}\n${next !== null ? `Faltan **${next - count}** para el siguiente nivel.` : '*Nivel máximo alcanzado.*'}`,
            ),
          ],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo obtener el progreso de boosts.');
      }
      return;
    }

    if (sub === 'conteo-canales') {
      try {
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
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo contar los canales.');
      }
      return;
    }

    if (sub === 'conteo-voz') {
      try {
        await interaction.deferReply();
        const members = await guild.members.fetch().catch(() => null);
        if (!members) {
          await interaction.editReply({ embeds: [Embeds.error('No disponible', 'No se pudo obtener la lista de miembros.')] });
          return;
        }
        const inVoice = [...members.values()].filter((m) => m.voice.channel);
        const list = inVoice
          .slice(0, 15)
          .map((m) => `• ${m} — \`#${m.voice.channel?.name ?? '?'}\``)
          .join('\n');
        await interaction.editReply({
          embeds: [
            Embeds.primary(`En voz — ${guild.name} (${inVoice.length})`, (list || '*Nadie en voz ahora mismo.*').slice(0, 4000)),
          ],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo obtener quién está en voz.');
      }
      return;
    }

    if (sub === 'conteo-hilos') {
      try {
        await interaction.deferReply();
        const active = await guild.channels.fetchActiveThreads().catch(() => null);
        const activeCount = active ? active.threads.size : 0;
        await interaction.editReply({
          embeds: [
            Embeds.primary(
              `Hilos — ${guild.name}`,
              `Hilos activos ahora: **${activeCount}**\n*Los hilos archivados no se cuentan sin revisar cada canal.*`,
            ),
          ],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudieron contar los hilos.');
      }
      return;
    }

    if (sub === 'revisar-lento') {
      try {
        const ch = interaction.options.getChannel('canal') ?? interaction.channel;
        if (!ch || !('rateLimitPerUser' in ch) || typeof ch.rateLimitPerUser !== 'number') {
          await interaction.reply({ embeds: [Embeds.error('No aplica', 'Ese canal no tiene modo lento (solo canales de texto).')], ephemeral: true });
          return;
        }
        const s = ch.rateLimitPerUser;
        const label = s === 0 ? 'desactivado' : s >= 60 ? `**${s}s** (${Math.floor(s / 60)}m)` : `**${s}s**`;
        await interaction.reply({ embeds: [Embeds.primary('Modo lento', `<#${ch.id}>: ${label}.`)] });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo revisar el modo lento.');
      }
      return;
    }

    if (sub === 'revisar-nsfw') {
      try {
        const ch = interaction.options.getChannel('canal') ?? interaction.channel;
        if (!ch || !('nsfw' in ch) || typeof ch.nsfw !== 'boolean') {
          await interaction.reply({ embeds: [Embeds.error('No aplica', 'Ese canal no tiene marca NSFW (hilos y MD excluidos).')], ephemeral: true });
          return;
        }
        await interaction.reply({
          embeds: [Embeds.primary('NSFW', `<#${ch.id}>: ${ch.nsfw ? '**SÍ** es NSFW 🔞' : '**NO** es NSFW.'}`)],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo revisar la marca NSFW.');
      }
      return;
    }

    if (sub === 'permisos-bot') {
      try {
        const me = guild.members.me;
        if (!me) {
          await interaction.reply({ embeds: [Embeds.error('No disponible', 'No se encontró al bot en este servidor.')], ephemeral: true });
          return;
        }
        const perms = me.permissionsIn(interaction.channelId);
        const keys: Array<[string, bigint]> = [
          ['ViewChannel', PermissionFlagsBits.ViewChannel],
          ['SendMessages', PermissionFlagsBits.SendMessages],
          ['EmbedLinks', PermissionFlagsBits.EmbedLinks],
          ['AttachFiles', PermissionFlagsBits.AttachFiles],
          ['ReadMessageHistory', PermissionFlagsBits.ReadMessageHistory],
          ['ManageMessages', PermissionFlagsBits.ManageMessages],
          ['ManageChannels', PermissionFlagsBits.ManageChannels],
          ['ModerateMembers', PermissionFlagsBits.ModerateMembers],
        ];
        const desc = keys.map(([name, bit]) => `${perms.has(bit) ? '✅' : '❌'} \`${name}\``).join('\n');
        await interaction.reply({ embeds: [Embeds.primary(`Permisos del bot — <#${interaction.channelId}>`, desc)] });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudieron leer los permisos del bot.');
      }
      return;
    }

    if (sub === 'permisos-usuario') {
      try {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) {
          await interaction.reply({ embeds: [Embeds.error('No encontrado', `${user} no es miembro de este servidor.`)], ephemeral: true });
          return;
        }
        const keys: Array<[string, bigint]> = [
          ['Administrator', PermissionFlagsBits.Administrator],
          ['ManageGuild', PermissionFlagsBits.ManageGuild],
          ['ManageRoles', PermissionFlagsBits.ManageRoles],
          ['ManageChannels', PermissionFlagsBits.ManageChannels],
          ['ManageMessages', PermissionFlagsBits.ManageMessages],
          ['KickMembers', PermissionFlagsBits.KickMembers],
          ['BanMembers', PermissionFlagsBits.BanMembers],
          ['ModerateMembers', PermissionFlagsBits.ModerateMembers],
        ];
        const desc = keys.map(([name, bit]) => `${member.permissions.has(bit) ? '✅' : '❌'} \`${name}\``).join('\n');
        await interaction.reply({ embeds: [Embeds.primary(`Permisos — ${user.tag}`, desc)] });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudieron leer los permisos de ese usuario.');
      }
      return;
    }

    if (sub === 'jerarquia') {
      try {
        const user = interaction.options.getUser('usuario', true);
        const target = await guild.members.fetch(user.id).catch(() => null);
        if (!target) {
          await interaction.reply({ embeds: [Embeds.error('No encontrado', `${user} no es miembro de este servidor.`)], ephemeral: true });
          return;
        }
        const executor = await guild.members.fetch(interaction.user.id).catch(() => null);
        const me = guild.members.me;
        if (!executor || !me) {
          await interaction.reply({ embeds: [Embeds.error('No disponible', 'No se pudo comparar la jerarquía.')], ephemeral: true });
          return;
        }
        const tPos = target.roles.highest.position;
        const ePos = executor.roles.highest.position;
        const bPos = me.roles.highest.position;
        const isOwner = target.id === guild.ownerId;
        const execCan = !isOwner && (executor.id === guild.ownerId || ePos > tPos);
        const botCan = !isOwner && bPos > tPos;
        await interaction.reply({
          embeds: [
            Embeds.primary(
              `Jerarquía — ${target.user.tag}`,
              `Objetivo: <@&${target.roles.highest.id}> (pos **${tPos}**)\nTu rol más alto: <@&${executor.roles.highest.id}> (pos **${ePos}**)\nRol más alto del bot: <@&${me.roles.highest.id}> (pos **${bPos}**)\n\n${isOwner ? '👑 El objetivo es el **dueño**: nadie puede actuar sobre él.' : `Tú puedes actuar: **${execCan ? 'SÍ ✅' : 'NO ❌'}**\nEl bot puede actuar: **${botCan ? 'SÍ ✅' : 'NO ❌'}**`}`,
            ),
          ],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo comparar la jerarquía.');
      }
      return;
    }

    if (sub === 'url-personalizada') {
      try {
        const data = await guild.fetchVanityData().catch(() => null);
        if (!data || !data.code) {
          await interaction.reply({ embeds: [Embeds.error('Sin vanity', 'Este servidor no tiene URL personalizada o el bot no tiene permiso para verla.')], ephemeral: true });
          return;
        }
        await interaction.reply({
          embeds: [Embeds.primary('URL personalizada', `Código: \`discord.gg/${data.code}\`\nUsos: **${data.uses ?? 0}**`)],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo obtener la URL personalizada.');
      }
      return;
    }

    if (sub === 'canal-reglas') {
      try {
        if (!guild.rulesChannelId) {
          await interaction.reply({ embeds: [Embeds.error('Sin canal', 'Este servidor no tiene canal de reglas configurado.')], ephemeral: true });
          return;
        }
        await interaction.reply({ embeds: [Embeds.primary('Canal de reglas', `Reglas: <#${guild.rulesChannelId}>`)] });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo obtener el canal de reglas.');
      }
      return;
    }

    if (sub === 'ayuda-auditoria') {
      try {
        await interaction.reply({
          embeds: [
            Embeds.info(
              'Registro de auditoría',
              'Para ver quién hizo qué en el servidor:\n\n**1.** Clic derecho en el servidor → **Ajustes del servidor** → **Registro de auditoría**.\n**2.** Necesitas el permiso **ViewAuditLog** (Ver registro de auditoría).\n**3.** Ahí verás expulsiones, baneos, aislamientos, mensajes eliminados, cambios de roles y canales, con autor y fecha.\n\n*Los bots solo pueden leerlo con ese permiso; este comando no accede a él.*',
            ),
          ],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo mostrar la ayuda de auditoría.');
      }
      return;
    }

    if (sub === 'vista-limpieza') {
      try {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
          await interaction.reply({
            embeds: [Embeds.error('Sin permiso', 'Necesitas el permiso **ManageMessages** para usar este simulacro.')],
            ephemeral: true,
          });
          return;
        }
        const amount = interaction.options.getInteger('cantidad', true);
        await interaction.deferReply({ ephemeral: true });
        const ch = interaction.channel;
        if (!ch || !ch.isTextBased() || !('messages' in ch)) {
          await interaction.editReply({ embeds: [Embeds.error('No aplica', 'Este comando solo funciona en canales de texto.') ] });
          return;
        }
        const fetched = await ch.messages.fetch({ limit: Math.min(amount, 100) }).catch(() => null);
        if (!fetched) {
          await interaction.editReply({ embeds: [Embeds.error('No disponible', 'No se pudieron leer los mensajes (¿falta ReadMessageHistory?).')] });
          return;
        }
        const limit = 14 * 24 * 3600 * 1000;
        const now = Date.now();
        let deletable = 0;
        fetched.forEach((m) => {
          if (now - m.createdTimestamp < limit) deletable++;
        });
        const old = fetched.size - deletable;
        await interaction.editReply({
          embeds: [
            Embeds.primary(
              'Simulacro de limpieza (no se borró nada)',
              `Analizados: **${fetched.size}**\nBorrables (<14 días): **${deletable}**\nDemasiado viejos para borrado masivo: **${old}**`,
            ),
          ],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo ejecutar el simulacro.');
      }
      return;
    }

    if (sub === 'revisar-apodo') {
      try {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) {
          await interaction.reply({ embeds: [Embeds.error('No encontrado', `${user} no es miembro de este servidor.`)], ephemeral: true });
          return;
        }
        await interaction.reply({
          embeds: [Embeds.primary(`Apodo — ${user.tag}`, member.nickname ? `Apodo actual: **${member.nickname}**` : '*Sin apodo (usa su nombre global).*')],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo obtener el apodo.');
      }
      return;
    }

    if (sub === 'impulsores') {
      try {
        await interaction.deferReply();
        const members = await guild.members.fetch().catch(() => null);
        if (!members) {
          await interaction.editReply({ embeds: [Embeds.error('No disponible', 'No se pudo obtener la lista de miembros.')] });
          return;
        }
        const boosters = [...members.values()]
          .filter((m) => m.premiumSinceTimestamp !== null)
          .sort((a, b) => (a.premiumSinceTimestamp ?? 0) - (b.premiumSinceTimestamp ?? 0));
        const list = boosters
          .slice(0, 10)
          .map((m) => `• ${m} — desde <t:${Math.floor((m.premiumSinceTimestamp ?? Date.now()) / 1000)}:D>`)
          .join('\n');
        await interaction.editReply({
          embeds: [Embeds.primary(`Impulsores — ${guild.name} (${boosters.length})`, (list || '*Nadie impulsando ahora mismo.*').slice(0, 4000))],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo obtener la lista de impulsores.');
      }
      return;
    }

    if (sub === 'conteo-invitaciones') {
      try {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({
            embeds: [Embeds.error('Sin permiso', 'Necesitas el permiso **ManageGuild** para ver las invitaciones.')],
            ephemeral: true,
          });
          return;
        }
        await interaction.deferReply();
        const invites = await guild.invites.fetch().catch(() => null);
        if (!invites) {
          await interaction.editReply({
            embeds: [Embeds.error('No disponible', 'No se pudieron obtener las invitaciones. Verifica que el bot tenga **ManageGuild**.')],
          });
          return;
        }
        const top = [...invites.values()].sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0)).slice(0, 3);
        const desc = top.length
          ? top.map((inv, i) => `\`${i + 1}.\` \`discord.gg/${inv.code}\` — usos: **${inv.uses ?? 0}**`).join('\n')
          : '*Sin invitaciones activas.*';
        await interaction.editReply({
          embeds: [Embeds.primary(`Invitaciones — ${guild.name} (${invites.size})`, desc.slice(0, 4000))],
        });
      } catch {
        await errReply(interaction, 'No disponible', 'No se pudo contar las invitaciones.');
      }
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
  },
};
