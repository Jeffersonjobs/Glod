/**
 * Automod: /automod — config de mayúsculas/invitaciones/palabras, canales exentos,
 * umbrales anti-spam y canal de registros.
 *
 * Reparto de persistencia (por diseño):
 * - `GuildSettings.security` (MongoDB, persistente): whitelistChannels,
 *   maxMessages, intervalMs, logChannelId.
 * - `automodMemory` (Map en memoria por proceso, exportado abajo): config del
 *   filtro de mayúsculas, filtro de invitaciones y lista de palabras bloqueadas.
 *   Viven en memoria porque el sub-esquema `security` de Mongoose es `strict` —
 *   las rutas desconocidas asignadas vía `(settings as any)` se descartarían al
 *   guardar, así que guardarlas ahí fingiría durabilidad. El motor debe leer
 *   `getAutomodMemory(guildId)` junto a `getGuildSettings(guildId)`.
 * @module commands/security/automod
 */
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';
import { Embeds } from '../../utils/embeds.js';

export interface AutomodMemoryEntry {
  capsEnabled: boolean;
  capsMinLength: number;
  capsMaxPercent: number;
  invitesEnabled: boolean;
  badwords: string[];
}

/** Estado de automod por proceso (mayúsculas/invitaciones/palabras). NO persiste entre reinicios. */
export const automodMemory = new Map<string, AutomodMemoryEntry>();

export function getAutomodMemory(guildId: string): AutomodMemoryEntry {
  let entry = automodMemory.get(guildId);
  if (!entry) {
    entry = { capsEnabled: false, capsMinLength: 10, capsMaxPercent: 70, invitesEnabled: false, badwords: [] };
    automodMemory.set(guildId, entry);
  }
  return entry;
}

async function safeError(interaction: ChatInputCommandInteraction, title: string, description: string): Promise<void> {
  const embed = Embeds.error(title, description);
  try {
    if (interaction.deferred) await interaction.editReply({ embeds: [embed] });
    else if (interaction.replied) await interaction.followUp({ embeds: [embed], ephemeral: true });
    else await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch {
    /* reply already consumed */
  }
}

export const automod: Command = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configura los filtros de automoderación')
    .addSubcommand((s) => s.setName('estado').setDescription('Muestra la configuración actual'))
    .addSubcommand((s) =>
      s.setName('mayusculas-alternar').setDescription('Activa el filtro de mayúsculas (en memoria)')
        .addBooleanOption((o) => o.setName('activado').setDescription('Activado/desactivado').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('mayusculas-config').setDescription('Configura el filtro de mayúsculas (en memoria)')
        .addIntegerOption((o) => o.setName('longitud-min').setDescription('Longitud mínima del mensaje').setRequired(true).setMinValue(4).setMaxValue(500))
        .addIntegerOption((o) => o.setName('porcentaje-max').setDescription('Porcentaje máximo de mayúsculas 1-100').setRequired(true).setMinValue(1).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s.setName('invitaciones-alternar').setDescription('Activa el filtro de invitaciones (en memoria)')
        .addBooleanOption((o) => o.setName('activado').setDescription('Activado/desactivado').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('palabras-anadir').setDescription('Añade una palabra bloqueada (en memoria)')
        .addStringOption((o) => o.setName('palabra').setDescription('Palabra a bloquear').setRequired(true).setMinLength(2).setMaxLength(64)),
    )
    .addSubcommand((s) =>
      s.setName('palabras-quitar').setDescription('Quita una palabra bloqueada (en memoria)')
        .addStringOption((o) => o.setName('palabra').setDescription('Palabra a desbloquear').setRequired(true).setMinLength(2).setMaxLength(64)),
    )
    .addSubcommand((s) => s.setName('palabras-lista').setDescription('Lista las palabras bloqueadas (en memoria)'))
    .addSubcommand((s) =>
      s.setName('exentos-anadir').setDescription('Exime un canal de los filtros (persistente)')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal a eximir').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('exentos-quitar').setDescription('Quita la exención de un canal (persistente)')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal sin exención').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    )
    .addSubcommand((s) => s.setName('exentos-lista').setDescription('Lista los canales exentos (persistente)'))
    .addSubcommand((s) =>
      s.setName('umbral').setDescription('Configura el umbral anti-spam (persistente)')
        .addIntegerOption((o) => o.setName('mensajes-max').setDescription('Máximo de mensajes por intervalo').setRequired(true).setMinValue(2).setMaxValue(100))
        .addIntegerOption((o) => o.setName('intervalo').setDescription('Intervalo en segundos').setRequired(true).setMinValue(2).setMaxValue(120)),
    )
    .addSubcommand((s) =>
      s.setName('registros').setDescription('Configura el canal de registros (persistente)')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal de registros').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageGuild],
  guildOnly: true,
  async execute(interaction) {
    if (!interaction.guildId || !interaction.guild) {
      await safeError(interaction, 'Solo en servidor', 'Usa este comando dentro de un servidor.');
      return;
    }
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    try {
      switch (sub) {
        case 'estado': {
          const settings = await getGuildSettings(guildId);
          if (!settings) {
            await safeError(interaction, 'Error de base de datos', 'No se pudo cargar la configuración del servidor.');
            break;
          }
          const mem = getAutomodMemory(guildId);
          const sec = settings.security;
          const desc =
            `**Persistente (MongoDB):**\n` +
            `Anti-spam: **${sec.antiSpam ? 'ACTIVADO' : 'DESACTIVADO'}** (${sec.maxMessages} msgs / ${Math.round((sec.intervalMs ?? 5000) / 1000)}s)\n` +
            `Anti-links: **${sec.antiLinks ? 'ACTIVADO' : 'DESACTIVADO'}**\n` +
            `Anti-raid: **${sec.antiRaid ? 'ACTIVADO' : 'DESACTIVADO'}**\n` +
            `Anti-menciones: **${sec.antiMention ? 'ACTIVADO' : 'DESACTIVADO'}** (máx ${sec.maxMentions})\n` +
            `Exentos: ${sec.whitelistChannels.length ? sec.whitelistChannels.map((c: string) => `<#${c}>`).join(', ') : '*ninguno*'}\n` +
            `Canal de registros: ${sec.logChannelId ? `<#${sec.logChannelId}>` : '*ninguno*'}\n\n` +
            `**En memoria (solo este proceso):**\n` +
            `Filtro de mayúsculas: **${mem.capsEnabled ? 'ACTIVADO' : 'DESACTIVADO'}** (mín ${mem.capsMinLength} caracteres, máx ${mem.capsMaxPercent}% mayúsculas)\n` +
            `Filtro de invitaciones: **${mem.invitesEnabled ? 'ACTIVADO' : 'DESACTIVADO'}**\n` +
            `Palabras bloqueadas: **${mem.badwords.length}** ${mem.badwords.length ? `(\`${mem.badwords.slice(0, 20).join('`, `')}\`${mem.badwords.length > 20 ? '…' : ''})` : ''}`;
          await interaction.reply({ embeds: [Embeds.info('🛡️ Estado de automod', desc)], ephemeral: true });
          break;
        }

        case 'mayusculas-alternar': {
          const enabled = interaction.options.getBoolean('activado', true);
          const mem = getAutomodMemory(guildId);
          mem.capsEnabled = enabled;
          await interaction.reply({ embeds: [Embeds.success('Filtro de mayúsculas', `El filtro de mayúsculas ahora está **${enabled ? 'ACTIVADO' : 'DESACTIVADO'}** (en memoria, solo este proceso).`)] });
          break;
        }

        case 'mayusculas-config': {
          const minLength = interaction.options.getInteger('longitud-min', true);
          const maxPercent = interaction.options.getInteger('porcentaje-max', true);
          const mem = getAutomodMemory(guildId);
          mem.capsMinLength = minLength;
          mem.capsMaxPercent = maxPercent;
          await interaction.reply({ embeds: [Embeds.success('Filtro de mayúsculas', `Los mensajes de ≥ **${minLength}** caracteres con más del **${maxPercent}%** en mayúsculas serán sancionados (en memoria).`)] });
          break;
        }

        case 'invitaciones-alternar': {
          const enabled = interaction.options.getBoolean('activado', true);
          const mem = getAutomodMemory(guildId);
          mem.invitesEnabled = enabled;
          await interaction.reply({ embeds: [Embeds.success('Filtro de invitaciones', `El filtro de invitaciones ahora está **${enabled ? 'ACTIVADO' : 'DESACTIVADO'}** (en memoria, solo este proceso).`)] });
          break;
        }

        case 'palabras-anadir': {
          const word = interaction.options.getString('palabra', true).trim().toLowerCase();
          const mem = getAutomodMemory(guildId);
          if (mem.badwords.includes(word)) {
            await interaction.reply({ embeds: [Embeds.warning('Ya bloqueada', `\`${word}\` ya está en la lista de bloqueo.`)], ephemeral: true });
            break;
          }
          mem.badwords.push(word);
          await interaction.reply({ embeds: [Embeds.success('Palabra bloqueada', `Añadida \`${word}\` a la lista (${mem.badwords.length} en total, en memoria).`)] });
          break;
        }

        case 'palabras-quitar': {
          const word = interaction.options.getString('palabra', true).trim().toLowerCase();
          const mem = getAutomodMemory(guildId);
          if (!mem.badwords.includes(word)) {
            await interaction.reply({ embeds: [Embeds.error('No encontrada', `\`${word}\` no está en la lista de bloqueo.`)], ephemeral: true });
            break;
          }
          mem.badwords = mem.badwords.filter((w) => w !== word);
          automodMemory.set(guildId, mem);
          await interaction.reply({ embeds: [Embeds.success('Palabra desbloqueada', `Eliminada \`${word}\` (${mem.badwords.length} restantes, en memoria).`)] });
          break;
        }

        case 'palabras-lista': {
          const mem = getAutomodMemory(guildId);
          const desc = mem.badwords.length ? mem.badwords.map((w, i) => `**${i + 1}.** \`${w}\``).join('\n') : '*Sin palabras bloqueadas (la lista en memoria está vacía).*';
          await interaction.reply({ embeds: [Embeds.info(`Palabras bloqueadas (${mem.badwords.length})`, desc)], ephemeral: true });
          break;
        }

        case 'exentos-anadir': {
          const channel = interaction.options.getChannel('canal', true);
          const settings = await getGuildSettings(guildId);
          if (!settings) {
            await safeError(interaction, 'Error de base de datos', 'No se pudo cargar la configuración del servidor.');
            break;
          }
          if (settings.security.whitelistChannels.includes(channel.id)) {
            await interaction.reply({ embeds: [Embeds.warning('Ya exento', `<#${channel.id}> ya está en la lista de exentos.`)], ephemeral: true });
            break;
          }
          settings.security.whitelistChannels.push(channel.id);
          await settings.save();
          await interaction.reply({ embeds: [Embeds.success('Canal exento', `<#${channel.id}> ahora está exento del automod (persistente).`)] });
          break;
        }

        case 'exentos-quitar': {
          const channel = interaction.options.getChannel('canal', true);
          const settings = await getGuildSettings(guildId);
          if (!settings) {
            await safeError(interaction, 'Error de base de datos', 'No se pudo cargar la configuración del servidor.');
            break;
          }
          if (!settings.security.whitelistChannels.includes(channel.id)) {
            await interaction.reply({ embeds: [Embeds.error('No exento', `<#${channel.id}> no está en la lista de exentos.`)], ephemeral: true });
            break;
          }
          settings.security.whitelistChannels = settings.security.whitelistChannels.filter((id: string) => id !== channel.id);
          await settings.save();
          await interaction.reply({ embeds: [Embeds.success('Exención eliminada', `<#${channel.id}> ya no está exento (persistente).`)] });
          break;
        }

        case 'exentos-lista': {
          const settings = await getGuildSettings(guildId);
          if (!settings) {
            await safeError(interaction, 'Error de base de datos', 'No se pudo cargar la configuración del servidor.');
            break;
          }
          const list: string[] = settings.security.whitelistChannels as string[];
          const desc = list.length ? list.map((id) => `• <#${id}> (\`${id}\`)`).join('\n') : '*Sin canales exentos.*';
          await interaction.reply({ embeds: [Embeds.info(`Canales exentos (${list.length})`, desc)], ephemeral: true });
          break;
        }

        case 'umbral': {
          const maxMessages = interaction.options.getInteger('mensajes-max', true);
          const intervalSec = interaction.options.getInteger('intervalo', true);
          const settings = await getGuildSettings(guildId);
          if (!settings) {
            await safeError(interaction, 'Error de base de datos', 'No se pudo cargar la configuración del servidor.');
            break;
          }
          settings.security.maxMessages = maxMessages;
          settings.security.intervalMs = intervalSec * 1000;
          await settings.save();
          await interaction.reply({ embeds: [Embeds.success('Umbral actualizado', `Máximo **${maxMessages}** mensajes cada **${intervalSec}s** (persistente).`)] });
          break;
        }

        case 'registros': {
          const channel = interaction.options.getChannel('canal', true);
          const settings = await getGuildSettings(guildId);
          if (!settings) {
            await safeError(interaction, 'Error de base de datos', 'No se pudo cargar la configuración del servidor.');
            break;
          }
          settings.security.logChannelId = channel.id;
          await settings.save();
          await interaction.reply({ embeds: [Embeds.success('Canal de registros', `Registros de automod → <#${channel.id}> (persistente).`)] });
          break;
        }

        default: {
          await safeError(interaction, 'Subcomando desconocido', 'Usa uno de los subcomandos de `/automod`.');
          break;
        }
      }
    } catch {
      await safeError(interaction, 'Falló el automod', 'No se pudo completar la acción. Inténtalo de nuevo.');
    }
  },
};
