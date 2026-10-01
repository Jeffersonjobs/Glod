/**
 * Level admin: /niveles-admin — grant/remove/set/transfer XP, resets and stats.
 * Formula: level = floor(sqrt(xp / 100)); xp for a level = level^2 * 100.
 * @module commands/leveling/level-admin
 */
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Level } from '../../database/models/entities.js';
import { Embeds } from '../../utils/embeds.js';

const calcLevel = (xp: number): number => Math.floor(Math.sqrt(Math.max(0, xp) / 100));
const xpForLevel = (level: number): number => level * level * 100;

export const leveladmin: Command = {
  data: new SlashCommandBuilder()
    .setName('niveles-admin')
    .setDescription('Gestión de XP (admin)')
    .addSubcommand((s) =>
      s
        .setName('anadir-xp')
        .setDescription('Añadir XP a un usuario')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addIntegerOption((o) => o.setName('cantidad').setDescription('Cantidad 1-10000').setRequired(true).setMinValue(1).setMaxValue(10000)),
    )
    .addSubcommand((s) =>
      s
        .setName('quitar-xp')
        .setDescription('Quitar XP a un usuario')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addIntegerOption((o) => o.setName('cantidad').setDescription('Cantidad 1-10000').setRequired(true).setMinValue(1).setMaxValue(10000)),
    )
    .addSubcommand((s) =>
      s
        .setName('poner-nivel')
        .setDescription('Fijar el nivel de un usuario (XP = nivel² × 100)')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addIntegerOption((o) => o.setName('nivel').setDescription('Nivel 0-100').setRequired(true).setMinValue(0).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s.setName('reiniciar-usuario').setDescription('Reiniciar XP/nivel de un usuario').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('reiniciar-todo')
        .setDescription('Reiniciar TODO el XP de este servidor (irreversible)')
        .addStringOption((o) => o.setName('confirmar').setDescription('Escribe el ID del servidor para confirmar').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('bono-xp')
        .setDescription('Dar XP extra con un motivo')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addIntegerOption((o) => o.setName('cantidad').setDescription('Cantidad 1-10000').setRequired(true).setMinValue(1).setMaxValue(10000))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true).setMaxLength(300)),
    )
    .addSubcommand((s) => s.setName('estadisticas-xp').setDescription('Ver usuarios totales y XP total'))
    .addSubcommand((s) =>
      s
        .setName('transferir-xp')
        .setDescription('Mover XP de un usuario a otro')
        .addUserOption((o) => o.setName('origen').setDescription('Donante').setRequired(true))
        .addUserOption((o) => o.setName('destino').setDescription('Destinatario').setRequired(true))
        .addIntegerOption((o) => o.setName('cantidad').setDescription('Cantidad 1-10000').setRequired(true).setMinValue(1).setMaxValue(10000)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ embeds: [Embeds.error('Sin servidor', 'Este comando solo funciona dentro de un servidor.')], ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'anadir-xp' || sub === 'bono-xp') {
      const user = interaction.options.getUser('usuario', true);
      const amount = interaction.options.getInteger('cantidad', true);
      const reason = sub === 'bono-xp' ? interaction.options.getString('motivo', true) : null;
      const doc = await Level.findOneAndUpdate(
        { guildId, userId: user.id },
        { $setOnInsert: { guildId, userId: user.id, xp: 0, level: 0 } },
        { upsert: true, new: true },
      );
      doc.xp += amount;
      doc.level = calcLevel(doc.xp);
      await doc.save();
      const title = sub === 'bono-xp' ? '🎁 XP extra' : '➕ XP añadido';
      await interaction.reply({
        embeds: [Embeds.success(title, `<@${user.id}> ganó **${amount}** XP${reason ? ` — *${reason}*` : ''}.\nAhora: Nivel **${doc.level}** (${doc.xp} XP).`)],
      });
      return;
    }

    if (sub === 'quitar-xp') {
      const user = interaction.options.getUser('usuario', true);
      const amount = interaction.options.getInteger('cantidad', true);
      const doc = await Level.findOne({ guildId, userId: user.id });
      if (!doc) {
        await interaction.reply({ embeds: [Embeds.warning('Sin XP', `<@${user.id}> no tiene registro de XP todavía.`)], ephemeral: true });
        return;
      }
      doc.xp = Math.max(0, doc.xp - amount);
      doc.level = calcLevel(doc.xp);
      await doc.save();
      await interaction.reply({ embeds: [Embeds.success('➖ XP quitado', `Se quitaron **${amount}** XP a <@${user.id}>.\nAhora: Nivel **${doc.level}** (${doc.xp} XP).`)] });
      return;
    }

    if (sub === 'poner-nivel') {
      const user = interaction.options.getUser('usuario', true);
      const level = interaction.options.getInteger('nivel', true);
      const doc = await Level.findOneAndUpdate(
        { guildId, userId: user.id },
        { $setOnInsert: { guildId, userId: user.id, xp: 0, level: 0 } },
        { upsert: true, new: true },
      );
      doc.xp = xpForLevel(level);
      doc.level = calcLevel(doc.xp);
      await doc.save();
      await interaction.reply({ embeds: [Embeds.success('🎚️ Nivel fijado', `<@${user.id}> ahora es Nivel **${doc.level}** (${doc.xp} XP).`)] });
      return;
    }

    if (sub === 'reiniciar-usuario') {
      const user = interaction.options.getUser('usuario', true);
      await Level.deleteOne({ guildId, userId: user.id });
      await interaction.reply({ embeds: [Embeds.success('🔄 Usuario reiniciado', `XP y nivel de <@${user.id}> reiniciados a 0.`)] });
      return;
    }

    if (sub === 'reiniciar-todo') {
      const confirm = interaction.options.getString('confirmar', true);
      if (confirm !== guildId) {
        await interaction.reply({ embeds: [Embeds.warning('Sin confirmar', `Para reiniciar TODO el XP, el valor de \`confirmar\` debe ser el ID de este servidor (\`${guildId}\`).`)], ephemeral: true });
        return;
      }
      const res = await Level.deleteMany({ guildId });
      await interaction.reply({ embeds: [Embeds.success('🗑️ XP reiniciado', `Se eliminaron **${res.deletedCount}** registros de XP en este servidor.`)] });
      return;
    }

    if (sub === 'estadisticas-xp') {
      const stats = (await Level.aggregate([
        { $match: { guildId } },
        { $group: { _id: null, totalXp: { $sum: '$xp' }, users: { $sum: 1 } } },
      ])) as Array<{ totalXp?: number; users?: number }>;
      const totalXp = stats[0]?.totalXp ?? 0;
      const users = stats[0]?.users ?? 0;
      const avg = users > 0 ? Math.floor(totalXp / users) : 0;
      await interaction.reply({ embeds: [Embeds.info('📊 Estadísticas de XP', `Usuarios registrados: **${users}**\nXP total: **${totalXp}**\nXP medio: **${avg}**`)] });
      return;
    }

    if (sub === 'transferir-xp') {
      const from = interaction.options.getUser('origen', true);
      const to = interaction.options.getUser('destino', true);
      const amount = interaction.options.getInteger('cantidad', true);
      if (from.id === to.id) {
        await interaction.reply({ embeds: [Embeds.warning('Mismo usuario', 'Donante y destinatario deben ser usuarios distintos.')], ephemeral: true });
        return;
      }
      const donor = await Level.findOne({ guildId, userId: from.id });
      if (!donor || donor.xp < amount) {
        await interaction.reply({ embeds: [Embeds.warning('XP insuficiente', `<@${from.id}> solo tiene **${donor?.xp ?? 0}** XP.`)], ephemeral: true });
        return;
      }
      const recipient = await Level.findOneAndUpdate(
        { guildId, userId: to.id },
        { $setOnInsert: { guildId, userId: to.id, xp: 0, level: 0 } },
        { upsert: true, new: true },
      );
      donor.xp -= amount;
      donor.level = calcLevel(donor.xp);
      await donor.save();
      recipient.xp += amount;
      recipient.level = calcLevel(recipient.xp);
      await recipient.save();
      await interaction.reply({
        embeds: [Embeds.success('🔀 XP transferido', `Se movieron **${amount}** XP de <@${from.id}> a <@${to.id}>.\n<@${from.id}>: Nv **${donor.level}** (${donor.xp} XP)\n<@${to.id}>: Nv **${recipient.level}** (${recipient.xp} XP)`)],
      });
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Subcomando desconocido', 'Ese subcomando no existe.')], ephemeral: true });
  },
};
