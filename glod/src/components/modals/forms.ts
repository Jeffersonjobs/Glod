/**
 * Modals: ticket reason + suggestion submit (for future panel-modal flow).
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Modal } from '../../types/index.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';
import { createTicketChannel } from '../../systems/tickets.js';
import { Suggestion } from '../../database/models/entities.js';
import { Embeds } from '../../utils/embeds.js';

export const ticketReason: Modal = {
  id: 'ticket_reason',
  async execute(interaction) {
    const reason = interaction.fields.getTextInputValue('reason').slice(0, 500);
    const settings = await getGuildSettings(interaction.guildId!).catch(() => null);
    const { channel } = await createTicketChannel(interaction.guild!, interaction.user, 'general', settings?.ticketCategoryIds[0]);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`ticket_close:${channel.id}`).setLabel('Close').setStyle(ButtonStyle.Danger),
    );
    await channel.send({ content: `<@${interaction.user.id}>`, embeds: [Embeds.primary('🎫 Ticket opened', reason)], components: [row] });
    await interaction.reply({ embeds: [Embeds.success('Ticket created', `<#${channel.id}>`)], ephemeral: true });
  },
};

export const suggestSubmit: Modal = {
  id: 'suggest_submit',
  async execute(interaction) {
    const text = interaction.fields.getTextInputValue('text').slice(0, 1000);
    await Suggestion.create({ guildId: interaction.guildId!, channelId: interaction.channelId!, authorId: interaction.user.id, text });
    await interaction.reply({ embeds: [Embeds.success('Suggestion received', text.slice(0, 500))], ephemeral: true });
  },
};
