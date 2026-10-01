/**
 * Leveling: /rango /top /niveles-config
 */
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';
import { Level } from '../../database/models/entities.js';
import { Embeds } from '../../utils/embeds.js';
import { xpForLevel } from '../../systems/leveling.js';
import { renderRankCard } from '../../utils/rankCard.js';

export const rank: Command = {
  data: new SlashCommandBuilder()
    .setName('rango')
    .setDescription('Ver tarjeta de rango de nivel')
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
  cooldown: 5,
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') ?? interaction.user;
    const doc = await Level.findOne({ guildId: interaction.guildId!, userId: user.id });
    const level = doc?.level ?? 0;
    const xp = doc?.xp ?? 0;
    const next = xpForLevel(level + 1);
    const card = await renderRankCard({ username: user.username, level, xp, nextXp: next });
    const embed = Embeds.primary(`Rango — ${user.username}`, `Nivel **${level}** · **${xp}/${next}** XP`).setThumbnail(user.displayAvatarURL());
    if (card) await interaction.reply({ embeds: [embed], files: [card] });
    else await interaction.reply({ embeds: [embed] });
  },
};

export const leaderboard: Command = {
  data: new SlashCommandBuilder().setName('top').setDescription('Top 10 por XP'),
  cooldown: 10,
  async execute(interaction) {
    const top = await Level.find({ guildId: interaction.guildId! }).sort({ xp: -1 }).limit(10);
    if (!top.length) {
      await interaction.reply({ embeds: [Embeds.info('Top', 'Sin XP todavía — ¡escribe para ganar XP!')] });
      return;
    }
    const desc = top.map((d, i) => `**${i + 1}.** <@${d.userId}> — Nv **${d.level}** (${d.xp} XP)`).join('\n');
    await interaction.reply({ embeds: [Embeds.primary('🏆 Top', desc)] });
  },
};

export const levelSetup: Command = {
  data: new SlashCommandBuilder()
    .setName('niveles-config')
    .setDescription('Configurar recompensas de nivel')
    .addSubcommand((s) =>
      s.setName('recompensa').setDescription('Dar un rol al llegar a un nivel').addIntegerOption((o) => o.setName('nivel').setDescription('Nivel').setRequired(true).setMinValue(1)).addRoleOption((o) => o.setName('rol').setDescription('Rol').setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const level = interaction.options.getInteger('nivel', true);
    const role = interaction.options.getRole('rol', true);
    const settings = await getGuildSettings(interaction.guildId!);
    (settings.leveling.rewards as Map<string, string>).set(String(level), role.id);
    await settings.save();
    await interaction.reply({ embeds: [Embeds.success('Recompensa configurada', `Nivel **${level}** → <@&${role.id}>.`)] });
  },
};
