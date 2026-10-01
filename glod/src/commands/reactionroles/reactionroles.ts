/**
 * Roles por reacción: /roles-config (botones o menú, persistente en base de datos).
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextChannel } from 'discord.js';
import type { Command } from '../../types/index.js';
import { ReactionRole } from '../../database/models/entities.js';
import { Embeds } from '../../utils/embeds.js';

export const reactionRolesSetup: Command = {
  data: new SlashCommandBuilder()
    .setName('roles-config')
    .setDescription('Publica un mensaje de roles por reacción')
    .addChannelOption((o) => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((o) => o.setName('tipo').setDescription('Tipo de menú').setRequired(true).addChoices({ name: 'Botones', value: 'button' }, { name: 'Menú de selección', value: 'select' }))
    .addRoleOption((o) => o.setName('rol1').setDescription('Rol 1').setRequired(true))
    .addRoleOption((o) => o.setName('rol2').setDescription('Rol 2'))
    .addRoleOption((o) => o.setName('rol3').setDescription('Rol 3'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  async execute(interaction) {
    const channel = interaction.options.getChannel('canal', true) as TextChannel;
    const target = interaction.guild!.channels.cache.get(channel.id) as TextChannel;
    const type = interaction.options.getString('tipo', true) as 'button' | 'select';
    const roles = [interaction.options.getRole('rol1'), interaction.options.getRole('rol2'), interaction.options.getRole('rol3')].filter(Boolean) as { id: string; name: string }[];
    const emojis = ['1️⃣', '2️⃣', '3️⃣'];
    const mapping: Record<string, string> = {};
    roles.forEach((r, i) => {
      mapping[type === 'button' ? `rr:${i}` : emojis[i]] = r.id;
    });
    let components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
    if (type === 'button') {
      const row = new ActionRowBuilder<ButtonBuilder>();
      roles.forEach((r, i) => row.addComponents(new ButtonBuilder().setCustomId(`rr:${i}:pending`).setLabel(r.name.slice(0, 40)).setStyle(ButtonStyle.Secondary)));
      components = [row as never];
    } else {
      const menu = new StringSelectMenuBuilder().setCustomId('rr_select:pending').setPlaceholder('Elige tus roles').setMinValues(0).setMaxValues(roles.length);
      roles.forEach((r, i) => menu.addOptions(new StringSelectMenuOptionBuilder().setLabel(r.name.slice(0, 40)).setValue(emojis[i]).setEmoji(emojis[i])));
      components = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu) as never];
    }
    const msg = await target.send({ embeds: [Embeds.primary('🎭 Elige tus roles', 'Usa los controles de abajo. Los roles se guardan aunque el bot se reinicie.')], components: components as never });
    // Rewrite customIds with the real message id for persistence lookup
    const realMapping: Record<string, string> = {};
    roles.forEach((r, i) => {
      realMapping[type === 'button' ? `rr:${msg.id}:${i}` : emojis[i]] = r.id;
    });
    await ReactionRole.create({ guildId: interaction.guildId!, channelId: target.id, messageId: msg.id, mapping: realMapping, type });
    await interaction.reply({ embeds: [Embeds.success('Roles publicados', `Publicado en <#${target.id}>.`)], ephemeral: true });
  },
};
