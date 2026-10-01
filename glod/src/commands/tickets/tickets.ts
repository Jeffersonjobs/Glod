/**
 * Tickets: /tickets-config (panel) + /ticket (cerrar/reclamar/transcripcion/anadir/quitar).
 */
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';
import { Ticket } from '../../database/models/entities.js';
import { Embeds } from '../../utils/embeds.js';
import { buildTranscript } from '../../systems/tickets.js';

export const ticketSetup: Command = {
  data: new SlashCommandBuilder()
    .setName('tickets-config')
    .setDescription('Publica un panel de tickets')
    .addChannelOption((o) => o.setName('canal').setDescription('Canal del panel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((o) => o.setName('titulo').setDescription('Título del panel'))
    .addStringOption((o) => o.setName('descripcion').setDescription('Descripción del panel'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const channel = interaction.options.getChannel('canal', true) as TextChannel;
    const target = interaction.guild!.channels.cache.get(channel.id) as TextChannel;
    const title = interaction.options.getString('titulo') ?? '🎫 ¿Necesitas ayuda?';
    const description = interaction.options.getString('descripcion') ?? 'Pulsa el botón de abajo para abrir un ticket.';
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('ticket_create').setLabel('Abrir ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
    );
    const embed = Embeds.primary(title, description).setFooter({ text: 'Glod Tickets' });
    await target.send({ embeds: [embed], components: [row] });
    await interaction.reply({ embeds: [Embeds.success('Panel publicado', `Panel de tickets publicado en <#${channel.id}>.`)], ephemeral: true });
  },
};

export const ticket: Command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gestiona el ticket actual')
    .addSubcommand((s) => s.setName('reclamar').setDescription('Reclamar este ticket'))
    .addSubcommand((s) => s.setName('cerrar').setDescription('Cerrar este ticket'))
    .addSubcommand((s) => s.setName('transcripcion').setDescription('Guardar una transcripción'))
    .addSubcommand((s) => s.setName('anadir').setDescription('Añadir un usuario').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand((s) => s.setName('quitar').setDescription('Quitar un usuario').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand((s) =>
      s
        .setName('panel-categorias')
        .setDescription('Configura los canales de categoría para el selector')
        .addChannelOption((o) => o.setName('categoria').setDescription('Canal de categoría').addChannelTypes(ChannelType.GuildCategory).setRequired(true)),
    ),
  cooldown: 3,
  async execute(interaction, _client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'panel-categorias') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ embeds: [Embeds.error('Sin permiso', 'Se requiere Gestionar el servidor.')], ephemeral: true });
        return;
      }
      const cat = interaction.options.getChannel('categoria', true);
      const settings = await getGuildSettings(interaction.guildId!);
      if (!settings.ticketCategoryIds.includes(cat.id)) settings.ticketCategoryIds.push(cat.id);
      await settings.save();
      await interaction.reply({ embeds: [Embeds.success('Categoría añadida', `Los tickets ahora pueden usar la categoría <#${cat.id}>.`)] });
      return;
    }
    const doc = await Ticket.findOne({ guildId: interaction.guildId!, channelId: interaction.channelId!, status: 'open' });
    if (!doc) {
      await interaction.reply({ embeds: [Embeds.error('No es un ticket', 'Úsalo dentro de un canal de ticket abierto.')], ephemeral: true });
      return;
    }
    const channel = interaction.channel as TextChannel;
    if (sub === 'reclamar') {
      doc.claimedBy = interaction.user.id;
      await doc.save();
      await interaction.reply({ embeds: [Embeds.info('Ticket reclamado', `<@${interaction.user.id}> ha reclamado este ticket.`)] });
      return;
    }
    if (sub === 'transcripcion') {
      const text = await buildTranscript(channel);
      const settings = await getGuildSettings(interaction.guildId!);
      const logCh = settings.ticketLogChannelId ? (interaction.guild!.channels.cache.get(settings.ticketLogChannelId) as TextChannel | undefined) : undefined;
      const file = { attachment: Buffer.from(text.slice(0, 190_000), 'utf-8'), name: `transcript-${channel.name}.txt` };
      if (logCh?.isTextBased()) await logCh.send({ embeds: [Embeds.info('Transcripción', `Ticket ${channel.name} de <@${doc.ownerId}>`)], files: [file] });
      await interaction.reply({ embeds: [Embeds.success('Transcripción guardada', 'Transcripción enviada al registro de tickets (si está configurado).')], files: [file] });
      return;
    }
    if (sub === 'anadir' || sub === 'quitar') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.reply({ embeds: [Embeds.error('Sin permiso', 'Se requiere Gestionar canales.')], ephemeral: true });
        return;
      }
      const user = interaction.options.getUser('usuario', true);
      if (sub === 'anadir') await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
      else await channel.permissionOverwrites.delete(user.id);
      await interaction.reply({ embeds: [Embeds.success(sub === 'anadir' ? 'Usuario añadido' : 'Usuario eliminado', `${user.tag}`)] });
      return;
    }
    // cerrar
    doc.status = 'closed';
    await doc.save();
    await interaction.reply({ embeds: [Embeds.warning('Cerrando ticket', 'El canal se eliminará en 5 segundos…')] });
    setTimeout(() => channel.delete(`Ticket cerrado por ${interaction.user.tag}`).catch(() => undefined), 5000);
  },
};

/** Unused import guard for select/modal builders (panel variants may use them via components). */
export const __helpers = { StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle };
