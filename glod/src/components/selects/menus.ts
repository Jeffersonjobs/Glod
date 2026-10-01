/**
 * Select menus: ticket category picker + reaction-role select.
 */
import type { SelectMenu } from '../../types/index.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';
import { ReactionRole } from '../../database/models/entities.js';
import { createTicketChannel } from '../../systems/tickets.js';
import { Embeds } from '../../utils/embeds.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const ticketCategory: SelectMenu = {
  id: 'ticket_category',
  async execute(interaction) {
    const category = interaction.values[0];
    const settings = await getGuildSettings(interaction.guildId!).catch(() => null);
    const parent = settings?.ticketCategoryIds[0];
    const { channel } = await createTicketChannel(interaction.guild!, interaction.user, category, parent);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`ticket_close:${channel.id}`).setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    );
    await channel.send({ content: `<@${interaction.user.id}>`, embeds: [Embeds.primary('🎫 Ticket opened', `Category: **${category}**`)], components: [row] });
    await interaction.reply({ embeds: [Embeds.success('Ticket created', `<#${channel.id}>`)], ephemeral: true });
  },
};

export const rrSelect: SelectMenu = {
  id: 'rr_select:',
  prefix: true,
  async execute(interaction) {
    const messageId = interaction.message.id;
    const doc = await ReactionRole.findOne({ messageId }).catch(() => null);
    if (!doc) {
      await interaction.reply({ embeds: [Embeds.error('Expired', 'Config not found.')], ephemeral: true });
      return;
    }
    const stored: unknown = doc.mapping;
    const mapEntries: Array<[string, string]> =
      stored instanceof Map
        ? ([...stored.entries()] as Array<[string, string]>)
        : Object.entries(stored as unknown as Record<string, string>);
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    const added: string[] = [];
    const removed: string[] = [];
    for (const [emoji, roleId] of mapEntries) {
      if (interaction.values.includes(emoji)) {
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId).catch(() => undefined);
          added.push(`<@&${roleId}>`);
        }
      } else if (member.roles.cache.has(roleId) && mapEntries.some(([key]) => key === emoji)) {
        // Only remove roles that belong to this menu when deselected via minValues=0
        await member.roles.remove(roleId).catch(() => undefined);
        removed.push(`<@&${roleId}>`);
      }
    }
    await interaction.reply({
      embeds: [Embeds.success('Roles updated', `${added.length ? `Added: ${added.join(', ')}\n` : ''}${removed.length ? `Removed: ${removed.join(', ')}` : '*No changes*'}`)],
      ephemeral: true,
    });
  },
};
