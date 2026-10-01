/**
 * Giveaway / suggestion / reaction-role buttons.
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import type { Button } from '../../types/index.js';
import { Giveaway, ReactionRole, Suggestion } from '../../database/models/entities.js';
import { Embeds } from '../../utils/embeds.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';

export const giveawayEnter: Button = {
  id: 'giveaway_enter:',
  prefix: true,
  async execute(interaction) {
    const id = interaction.customId.split(':')[1];
    const g = await Giveaway.findById(id);
    if (!g || g.ended) {
      await interaction.reply({ embeds: [Embeds.error('Ended', 'This giveaway has ended.')], ephemeral: true });
      return;
    }
    if (g.requiredRoleId && !((interaction.member as { roles?: { cache: Map<string, unknown> } })?.roles?.cache.has(g.requiredRoleId))) {
      await interaction.reply({ embeds: [Embeds.error('Requirements', 'You lack the required role.')], ephemeral: true });
      return;
    }
    if (g.entrants.includes(interaction.user.id)) {
      await interaction.reply({ embeds: [Embeds.info('Already entered', 'You are already in this giveaway.')], ephemeral: true });
      return;
    }
    g.entrants.push(interaction.user.id);
    await g.save();
    await interaction.reply({ embeds: [Embeds.success('Entered!', 'Good luck! 🎉')], ephemeral: true });
  },
};

async function vote(interaction: Parameters<Button['execute']>[0], kind: 'up' | 'down'): Promise<void> {
  const id = interaction.customId.split(':')[1];
  const s = await Suggestion.findById(id);
  if (!s) {
    await interaction.reply({ embeds: [Embeds.error('Not found', 'Suggestion not found.')], ephemeral: true });
    return;
  }
  s.upvotes = s.upvotes.filter((u) => u !== interaction.user.id);
  s.downvotes = s.downvotes.filter((u) => u !== interaction.user.id);
  (kind === 'up' ? s.upvotes : s.downvotes).push(interaction.user.id);
  await s.save();
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`suggest_up:${s.id}`).setLabel(`👍 ${s.upvotes.length}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`suggest_down:${s.id}`).setLabel(`👎 ${s.downvotes.length}`).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`suggest_accept:${s.id}`).setLabel('Accept').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`suggest_deny:${s.id}`).setLabel('Deny').setStyle(ButtonStyle.Secondary),
  );
  await interaction.update({ components: [row] }).catch(async () => {
    await interaction.reply({ embeds: [Embeds.success('Voted', `Vote recorded (${kind}).`)], ephemeral: true });
  });
}

export const suggestUp: Button = {
  id: 'suggest_up:',
  prefix: true,
  async execute(interaction) {
    await vote(interaction, 'up');
  },
};

export const suggestDown: Button = {
  id: 'suggest_down:',
  prefix: true,
  async execute(interaction) {
    await vote(interaction, 'down');
  },
};

export const suggestAccept: Button = {
  id: 'suggest_accept:',
  prefix: true,
  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ embeds: [Embeds.error('No permission', 'Manage Server required.')], ephemeral: true });
      return;
    }
    const s = await Suggestion.findByIdAndUpdate(interaction.customId.split(':')[1], { status: 'accepted' }, { new: true });
    if (!s) return;
    await interaction.reply({ embeds: [Embeds.success('Suggestion accepted', s.text.slice(0, 500))] });
    const settings = await getGuildSettings(interaction.guildId!).catch(() => null);
    if (settings?.suggestionLogChannelId) {
      const ch = interaction.guild!.channels.cache.get(settings.suggestionLogChannelId);
      if (ch?.isTextBased()) await ch.send({ embeds: [Embeds.success('✅ Suggestion accepted', `${s.text}\n\nBy <@${s.authorId}>`)] });
    }
  },
};

export const suggestDeny: Button = {
  id: 'suggest_deny:',
  prefix: true,
  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ embeds: [Embeds.error('No permission', 'Manage Server required.')], ephemeral: true });
      return;
    }
    const s = await Suggestion.findByIdAndUpdate(interaction.customId.split(':')[1], { status: 'denied' }, { new: true });
    if (!s) return;
    await interaction.reply({ embeds: [Embeds.error('Suggestion denied', s.text.slice(0, 500))] });
  },
};

export const reactionRoleButton: Button = {
  id: 'rr:',
  prefix: true,
  async execute(interaction) {
    // customId: rr:<messageId>:<index>
    const [, messageId, index] = interaction.customId.split(':');
    const doc = await ReactionRole.findOne({ messageId }).catch(() => null);
    if (!doc) {
      await interaction.reply({ embeds: [Embeds.error('Expired', 'Reaction-role config not found.')], ephemeral: true });
      return;
    }
    const roleId = (doc.mapping as Map<string, string>).get?.(`rr:${messageId}:${index}`) ?? (doc.mapping as unknown as Record<string, string>)[`rr:${messageId}:${index}`];
    if (!roleId) {
      await interaction.reply({ embeds: [Embeds.error('Unknown role', 'Mapping missing.')], ephemeral: true });
      return;
    }
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      await interaction.reply({ embeds: [Embeds.info('Role removed', `Removed <@&${roleId}>.`)], ephemeral: true });
    } else {
      await member.roles.add(roleId).catch(async () => {
        await interaction.reply({ embeds: [Embeds.error('Failed', 'Check role hierarchy.')], ephemeral: true });
      });
      await interaction.reply({ embeds: [Embeds.success('Role added', `Added <@&${roleId}>.`)], ephemeral: true }).catch(() => undefined);
    }
    void index;
  },
};
