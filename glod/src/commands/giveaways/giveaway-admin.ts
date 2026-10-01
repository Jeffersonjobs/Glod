/**
 * Administración de sorteos: /sorteos-admin (lista/cancelar/pausa-nota/extender/participantes/ganadores).
 * Requiere Gestionar mensajes. Todo limitado al servidor actual.
 * @module commands/giveaways/giveaway-admin
 */
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Giveaway } from '../../database/models/entities.js';
import { Embeds } from '../../utils/embeds.js';
import { pickWinners } from '../../systems/giveaways.js';

/** Selección local de ganadores (solo si falla el motor principal). */
function localPickWinners(entrants: string[], count: number): string[] {
  const pool = [...new Set(entrants)];
  const out: string[] = [];
  while (pool.length > 0 && out.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    const [picked] = pool.splice(idx, 1);
    if (picked) out.push(picked);
  }
  return out;
}

function fmtEnds(d: unknown): string {
  const t = d instanceof Date ? d.getTime() : new Date(String(d)).getTime();
  if (Number.isNaN(t)) return 'desconocida';
  return `<t:${Math.floor(t / 1000)}:R>`;
}

export const giveawayadmin: Command = {
  data: new SlashCommandBuilder()
    .setName('sorteos-admin')
    .setDescription('Administra los sorteos de este servidor')
    .addSubcommand((s) => s.setName('lista').setDescription('Lista los sorteos activos (10 próximos por fecha)'))
    .addSubcommand((s) =>
      s
        .setName('cancelar')
        .setDescription('Cancela un sorteo')
        .addStringOption((o) => o.setName('id').setDescription('ID del sorteo').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('pausa-nota')
        .setDescription('Pausa un sorteo (extiende el final 10 min)')
        .addStringOption((o) => o.setName('id').setDescription('ID del sorteo').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('extender')
        .setDescription('Extiende la fecha límite de un sorteo')
        .addStringOption((o) => o.setName('id').setDescription('ID del sorteo').setRequired(true))
        .addIntegerOption((o) => o.setName('minutos').setDescription('Minutos a añadir').setRequired(true).setMinValue(1).setMaxValue(43200)),
    )
    .addSubcommand((s) =>
      s
        .setName('participantes')
        .setDescription('Muestra los participantes de un sorteo')
        .addStringOption((o) => o.setName('id').setDescription('ID del sorteo').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('ganadores')
        .setDescription('Recalcula los ganadores de un sorteo')
        .addStringOption((o) => o.setName('id').setDescription('ID del sorteo').setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageMessages],
  async execute(interaction, _client) {
    if (!interaction.guildId) {
      await interaction.reply({ embeds: [Embeds.error('Solo en servidor', 'Este comando solo se puede usar en un servidor.')], ephemeral: true });
      return;
    }
    const guildId = interaction.guildId;
    const sub = interaction.options.getSubcommand();

    if (sub === 'lista') {
      const docs = await Giveaway.find({ guildId, ended: false }).sort({ endsAt: 1 }).limit(10);
      if (docs.length === 0) {
        await interaction.reply({ embeds: [Embeds.info('Sin sorteos activos', 'No hay sorteos en curso en este servidor.')] });
        return;
      }
      const lines = docs.map(
        (g) => `🎁 **${g.prize}** — termina ${fmtEnds(g.endsAt)} — **${g.entrants?.length ?? 0}** participantes — ID: \`${g.id}\``,
      );
      await interaction.reply({ embeds: [Embeds.primary('🎉 Sorteos activos', lines.join('\n').slice(0, 3900))] });
      return;
    }

    const id = interaction.options.getString('id', true);
    const g = await Giveaway.findOne({ _id: id, guildId }).catch(() => null);
    if (!g) {
      await interaction.reply({ embeds: [Embeds.error('No encontrado', 'ID de sorteo no válido en este servidor.')], ephemeral: true });
      return;
    }

    if (sub === 'cancelar') {
      if (g.ended) {
        await interaction.reply({ embeds: [Embeds.warning('Ya terminó', 'Ese sorteo ya ha finalizado.')], ephemeral: true });
        return;
      }
      g.ended = true;
      await g.save();
      await interaction.reply({ embeds: [Embeds.success('Sorteo cancelado', `Cancelado **${g.prize}** (\`${g.id}\`).`)] });
      return;
    }

    if (sub === 'pausa-nota') {
      if (g.ended) {
        await interaction.reply({ embeds: [Embeds.warning('Ya terminó', 'Ese sorteo ya ha finalizado.')], ephemeral: true });
        return;
      }
      const base = g.endsAt instanceof Date ? g.endsAt.getTime() : new Date(String(g.endsAt)).getTime();
      g.endsAt = new Date(base + 10 * 60_000);
      await g.save();
      await interaction.reply({
        embeds: [
          Embeds.info(
            'Sorteo en pausa',
            `No hay pausa nativa, así que pausar equivale a **extender el final 10 minutos**.\n\n**${g.prize}** ahora termina ${fmtEnds(g.endsAt)} (\`${g.id}\`).`,
          ),
        ],
      });
      return;
    }

    if (sub === 'extender') {
      if (g.ended) {
        await interaction.reply({ embeds: [Embeds.warning('Ya terminó', 'Ese sorteo ya ha finalizado.')], ephemeral: true });
        return;
      }
      const minutes = interaction.options.getInteger('minutos', true);
      const base = g.endsAt instanceof Date ? g.endsAt.getTime() : new Date(String(g.endsAt)).getTime();
      g.endsAt = new Date(base + minutes * 60_000);
      await g.save();
      await interaction.reply({
        embeds: [Embeds.success('Sorteo extendido', `**${g.prize}** extendido **${minutes} min** — ahora termina ${fmtEnds(g.endsAt)}.`)],
      });
      return;
    }

    if (sub === 'participantes') {
      const entrants = (g.entrants ?? []) as string[];
      const preview = entrants.slice(0, 10).map((e) => `<@${e}>`);
      await interaction.reply({
        embeds: [
          Embeds.primary(
            '🎉 Participantes del sorteo',
            `**${g.prize}** — **${entrants.length}** participante(s)\n\n${preview.join(', ') || '*Sin participantes todavía.*'}${
              entrants.length > 10 ? `\n\n*…y ${entrants.length - 10} más.*` : ''
            }`,
          ),
        ],
      });
      return;
    }

    if (sub === 'ganadores') {
      const entrants = (g.entrants ?? []) as string[];
      const count = (g.winnerCount ?? 1) as number;
      let winners: string[];
      try {
        winners = pickWinners(entrants, count);
      } catch {
        winners = localPickWinners(entrants, count);
      }
      await interaction.reply({
        embeds: [
          Embeds.primary('🎉 Ganadores del sorteo', `**${g.prize}**\n\nGanadores: ${winners.map((w) => `<@${w}>`).join(', ') || '*ninguno*'} (\`${g.id}\`).`),
        ],
      });
      return;
    }
  },
};
