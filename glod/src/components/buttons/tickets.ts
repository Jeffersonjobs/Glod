/**
 * Ticket buttons: create / claim / close / transcript.
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, TextChannel } from 'discord.js';
import type { Button } from '../../types/index.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';
import { Ticket } from '../../database/models/entities.js';
import { createTicketChannel, buildTranscript } from '../../systems/tickets.js';
import { Embeds } from '../../utils/embeds.js';

export const ticketCreate: Button = {
  id: 'ticket_create',
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const existing = await Ticket.findOne({ guildId: interaction.guildId!, ownerId: interaction.user.id, status: 'open' });
    if (existing) {
      await interaction.editReply({ embeds: [Embeds.warning('Already open', `You already have <#${existing.channelId}>.`)] });
      return;
    }
    const settings = await getGuildSettings(interaction.guildId!);
    const { channel } = await createTicketChannel(interaction.guild!, interaction.user, 'general', settings.ticketCategoryIds[0]);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`ticket_claim:${channel.id}`).setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('🙋'),
      new ButtonBuilder().setCustomId(`ticket_transcript:${channel.id}`).setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
      new ButtonBuilder().setCustomId(`ticket_close:${channel.id}`).setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    );
    await channel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [Embeds.primary('🎫 Ticket opened', 'Support will be with you shortly. Describe your issue.')],
      components: [row],
    });
    await interaction.editReply({ embeds: [Embeds.success('Ticket created', `Your ticket: <#${channel.id}>.`)] });
  },
};

export const ticketClaim: Button = {
  id: 'ticket_claim:',
  prefix: true,
  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ embeds: [Embeds.error('No permission', 'Manage Channels required.')], ephemeral: true });
      return;
    }
    await Ticket.findOneAndUpdate({ channelId: interaction.channelId! }, { claimedBy: interaction.user.id });
    await interaction.reply({ embeds: [Embeds.info('Claimed', `<@${interaction.user.id}> claimed this ticket.`)] });
  },
};

export const ticketTranscript: Button = {
  id: 'ticket_transcript:',
  prefix: true,
  async execute(interaction) {
    const text = await buildTranscript(interaction.channel as TextChannel);
    await interaction.reply({
      embeds: [Embeds.success('Transcript', 'Transcript attached.')],
      files: [{ attachment: Buffer.from(text.slice(0, 190_000), 'utf-8'), name: 'transcript.txt' }],
      ephemeral: true,
    });
  },
};

export const ticketClose: Button = {
  id: 'ticket_close:',
  prefix: true,
  async execute(interaction) {
    await interaction.reply({ embeds: [Embeds.warning('Closing', 'Deleting in 5 seconds…')] });
    await Ticket.findOneAndUpdate({ channelId: interaction.channelId! }, { status: 'closed' });
    setTimeout(() => (interaction.channel as TextChannel)?.delete(`Closed by ${interaction.user.tag}`).catch(() => undefined), 5000);
  },
};
