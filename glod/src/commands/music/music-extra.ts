/**
 * DJ extras: /dj (buscar/mezclar/repetir-cola/ver-volumen/limpiar-filtros/graves/
 * nightcore/letras/vaciar-cola/quitar-cancion/mover-cancion/autoplay).
 * Cada subcomando deriva a un embed de error cuando Lavalink no está configurado
 * o no suena nada. Defensivo ante cambios de la API de lavalink-client v2
 * vía `(client as any).lavalink`, optional chaining y try/catch.
 * @module commands/music/music-extra
 */
import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import type { GlodClient } from '../../client.js';
import { Embeds } from '../../utils/embeds.js';
import { musicEnabled } from '../../systems/music.js';

function needLavalink(): ReturnType<typeof Embeds.error> {
  return Embeds.error('Música no disponible', 'Lavalink no está configurado. Define `LAVALINK_*` en `.env`.');
}

function notPlaying(): ReturnType<typeof Embeds.error> {
  return Embeds.error('Nada sonando', 'La música no está configurada o no suena nada. Usa `/reproducir` primero.');
}

/** Búsqueda de reproductor con el mejor esfuerzo; responde con un embed de error si falla. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPlayer(interaction: ChatInputCommandInteraction, client: GlodClient): Promise<any | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lavalink = (client as unknown as { lavalink: any }).lavalink as any;
  if (!musicEnabled() || !lavalink) {
    await interaction.reply({ embeds: [needLavalink()], ephemeral: true });
    return null;
  }
  let player: unknown = null;
  try {
    player = lavalink.getPlayer?.(interaction.guildId ?? '') ?? null;
  } catch {
    player = null;
  }
  if (!player) {
    await interaction.reply({ embeds: [notPlaying()], ephemeral: true });
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return player as any;
}

export const dj: Command = {
  data: new SlashCommandBuilder()
    .setName('dj')
    .setDescription('Controles DJ extra (buscar/mezclar/filtros/cola/notas)')
    .addSubcommand((s) =>
      s
        .setName('buscar')
        .setDescription('Ir a una posición de la canción actual')
        .addIntegerOption((o) => o.setName('segundos').setDescription('Posición en segundos').setRequired(true).setMinValue(0).setMaxValue(86400)),
    )
    .addSubcommand((s) => s.setName('mezclar').setDescription('Mezclar la cola'))
    .addSubcommand((s) =>
      s
        .setName('repetir-cola')
        .setDescription('Ajustar repetición de cola (distinto del ciclo /repetir)')
        .addStringOption((o) =>
          o
            .setName('modo')
            .setDescription('Modo de repetición')
            .setRequired(true)
            .addChoices({ name: 'Apagado', value: 'off' }, { name: 'Canción', value: 'song' }, { name: 'Cola', value: 'queue' }),
        ),
    )
    .addSubcommand((s) => s.setName('ver-volumen').setDescription('Ver el volumen actual'))
    .addSubcommand((s) => s.setName('limpiar-filtros').setDescription('Limpiar todos los filtros de audio'))
    .addSubcommand((s) =>
      s
        .setName('graves')
        .setDescription('Alternar filtro de graves')
        .addBooleanOption((o) => o.setName('activado').setDescription('true=activado false=desactivado').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('nightcore')
        .setDescription('Alternar nightcore (informativo)')
        .addBooleanOption((o) => o.setName('activado').setDescription('true=activado false=desactivado').setRequired(true)),
    )
    .addSubcommand((s) => s.setName('letras').setDescription('Información de letra de la canción actual'))
    .addSubcommand((s) => s.setName('vaciar-cola').setDescription('Eliminar próximas canciones'))
    .addSubcommand((s) =>
      s
        .setName('quitar-cancion')
        .setDescription('Quitar una canción de la cola')
        .addIntegerOption((o) => o.setName('indice').setDescription('Posición en la cola (empieza en 1)').setRequired(true).setMinValue(1)),
    )
    .addSubcommand((s) =>
      s
        .setName('mover-cancion')
        .setDescription('Mover una canción dentro de la cola')
        .addIntegerOption((o) => o.setName('desde').setDescription('Posición actual (empieza en 1)').setRequired(true).setMinValue(1))
        .addIntegerOption((o) => o.setName('hasta').setDescription('Posición destino (empieza en 1)').setRequired(true).setMinValue(1)),
    )
    .addSubcommand((s) => s.setName('autoplay').setDescription('Ver estado del autoplay')),
  cooldown: 3,
  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'buscar') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      const seconds = interaction.options.getInteger('segundos', true);
      try {
        const targetMs = seconds * 1000;
        if (typeof player.seekTo === 'function') await player.seekTo(targetMs);
        else if (typeof player.seek === 'function') await player.seek(targetMs);
        else throw new Error('seek unsupported by player API');
        await interaction.reply({ embeds: [Embeds.success('Buscar', `Saltado a **${seconds}s**.`)] });
      } catch {
        await interaction.reply({ embeds: [Embeds.error('Error al buscar', 'No se pudo buscar en la canción actual.')] });
      }
      return;
    }

    if (sub === 'mezclar') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      try {
        const q = player.queue as { shuffle?: () => unknown; tracks?: unknown[] } | undefined;
        if (q && typeof q.shuffle === 'function') {
          await q.shuffle();
        } else if (q && Array.isArray(q.tracks)) {
          for (let i = q.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [q.tracks[i], q.tracks[j]] = [q.tracks[j], q.tracks[i]];
          }
        } else {
          throw new Error('shuffle unsupported by player API');
        }
        await interaction.reply({ embeds: [Embeds.success('Mezclado', 'Orden de la cola aleatorio.')] });
      } catch {
        await interaction.reply({ embeds: [Embeds.error('Error al mezclar', 'No se pudo mezclar la cola.')] });
      }
      return;
    }

    if (sub === 'repetir-cola') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      const mode = interaction.options.getString('modo', true);
      const mapped = mode === 'song' ? 'track' : mode;
      try {
        if (typeof player.setRepeatMode === 'function') await player.setRepeatMode(mapped);
        else player.repeatMode = mapped;
        const modeLabel = mode === 'off' ? 'apagado' : mode === 'song' ? 'canción' : 'cola';
        await interaction.reply({ embeds: [Embeds.info('Repetir cola', `Modo: **${modeLabel}**.`)] });
      } catch {
        await interaction.reply({ embeds: [Embeds.error('Error de repetición', 'No se pudo cambiar el modo de repetición.')] });
      }
      return;
    }

    if (sub === 'ver-volumen') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      const vol = (player as { volume?: unknown }).volume;
      await interaction.reply({ embeds: [Embeds.info('Volumen', `Volumen actual: **${vol ?? 'desconocido'}**.`)] });
      return;
    }

    if (sub === 'limpiar-filtros') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      try {
        const fm = (player as { filterManager?: unknown; filters?: unknown }).filterManager as
          | { clearFilters?: () => unknown; resetFilters?: () => unknown }
          | undefined;
        if (fm && typeof fm.clearFilters === 'function') await fm.clearFilters();
        else if (fm && typeof fm.resetFilters === 'function') await fm.resetFilters();
        else if (typeof (player as { clearFilters?: () => unknown }).clearFilters === 'function') {
          await (player as { clearFilters: () => unknown }).clearFilters();
        }
        await interaction.reply({ embeds: [Embeds.success('Filtros limpiados', 'Todos los filtros de audio fueron restablecidos.')] });
      } catch {
        await interaction.reply({ embeds: [Embeds.error('Error de filtros', 'No se pudieron limpiar los filtros de audio.')] });
      }
      return;
    }

    if (sub === 'graves') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      const enabled = interaction.options.getBoolean('activado', true);
      try {
        const fm = (player as { filterManager?: unknown }).filterManager as
          | { setBassBoost?: (on: boolean) => unknown; setEqualizer?: (bands: unknown[]) => unknown }
          | undefined;
        if (fm && typeof fm.setBassBoost === 'function') await fm.setBassBoost(enabled);
        else if (typeof (player as { setBassBoost?: (on: boolean) => unknown }).setBassBoost === 'function') {
          await (player as { setBassBoost: (on: boolean) => unknown }).setBassBoost(enabled);
        } else if (fm && typeof fm.setEqualizer === 'function' && !enabled) {
          await fm.setEqualizer([]);
        }
        await interaction.reply({ embeds: [Embeds.success('Graves', `Graves **${enabled ? 'activados' : 'desactivados'}**.`)] });
      } catch {
        await interaction.reply({ embeds: [Embeds.error('Error de graves', 'No se pudieron alternar los graves.')] });
      }
      return;
    }

    if (sub === 'nightcore') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      const enabled = interaction.options.getBoolean('activado', true);
      try {
        const fm = (player as { filterManager?: unknown }).filterManager as
          | { setNightcore?: (on: boolean) => unknown; setTimescale?: (opts: unknown) => unknown }
          | undefined;
        if (fm && typeof fm.setNightcore === 'function') await fm.setNightcore(enabled);
        else if (fm && typeof fm.setTimescale === 'function') {
          await fm.setTimescale(enabled ? { speed: 1.25, pitch: 1.25, rate: 1 } : { speed: 1, pitch: 1, rate: 1 });
        }
        await interaction.reply({
          embeds: [
            Embeds.info(
              'Nightcore',
              enabled
                ? 'Nightcore **activado** (~1.25x velocidad + tono). Informativo: el efecto exacto depende de la API de filtros de Lavalink.'
                : 'Nightcore **desactivado** (reproducción normal).',
            ),
          ],
        });
      } catch {
        await interaction.reply({ embeds: [Embeds.error('Error de nightcore', 'No se pudo alternar nightcore.')] });
      }
      return;
    }

    if (sub === 'letras') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      const cur = (player as { queue?: { current?: { info?: { title?: string; author?: string } } } }).queue?.current;
      const title = cur?.info?.title ?? 'Canción desconocida';
      const author = cur?.info?.author ? ` — \`${cur.info.author}\`` : '';
      await interaction.reply({
        embeds: [
          Embeds.info(
            'Letras',
            `No hay API externa de letras configurada, así que las letras sincronizadas no están disponibles.\n\n**Ahora:** ${title}${author}\n\nConsejo: usa \`/reproducir <nombre de canción>\` para añadir otra canción.`,
          ),
        ],
      });
      return;
    }

    if (sub === 'vaciar-cola') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      try {
        const tracks = (player as { queue?: { tracks?: unknown[] } }).queue?.tracks;
        if (!Array.isArray(tracks)) throw new Error('queue API unsupported');
        const removed = tracks.length;
        tracks.splice(0, removed);
        await interaction.reply({ embeds: [Embeds.success('Cola vaciada', `Eliminadas **${removed}** próximas canciones.`)] });
      } catch {
        await interaction.reply({ embeds: [Embeds.error('Error al vaciar', 'No se pudo vaciar la cola.')] });
      }
      return;
    }

    if (sub === 'quitar-cancion') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      const index = interaction.options.getInteger('indice', true);
      try {
        const tracks = (player as { queue?: { tracks?: { info?: { title?: string } }[] } }).queue?.tracks;
        if (!Array.isArray(tracks) || index < 1 || index > tracks.length) throw new Error('bad index');
        const [removed] = tracks.splice(index - 1, 1);
        await interaction.reply({
          embeds: [Embeds.success('Canción eliminada', `Eliminada **${removed?.info?.title ?? `#${index}`}** de la cola.`)],
        });
      } catch {
        await interaction.reply({ embeds: [Embeds.error('Error al eliminar', 'Índice inválido o cola no disponible.')] });
      }
      return;
    }

    if (sub === 'mover-cancion') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      const from = interaction.options.getInteger('desde', true);
      const to = interaction.options.getInteger('hasta', true);
      try {
        const tracks = (player as { queue?: { tracks?: { info?: { title?: string } }[] } }).queue?.tracks;
        if (!Array.isArray(tracks) || from < 1 || from > tracks.length || to < 1 || to > tracks.length) {
          throw new Error('bad positions');
        }
        const [moved] = tracks.splice(from - 1, 1);
        tracks.splice(to - 1, 0, moved);
        await interaction.reply({
          embeds: [Embeds.success('Canción movida', `Movida **${moved?.info?.title ?? 'canción'}** de #${from} a #${to}.`)],
        });
      } catch {
        await interaction.reply({ embeds: [Embeds.error('Error al mover', 'Posiciones inválidas o cola no disponible.')] });
      }
      return;
    }

    if (sub === 'autoplay') {
      const player = await getPlayer(interaction, client);
      if (!player) return;
      const raw = player as { autoplay?: unknown; autoPlay?: unknown };
      const state = raw.autoplay ?? raw.autoPlay ?? null;
      const desc = state === null || state === undefined ? 'El estado del autoplay no está expuesto por la API actual del reproductor.' : `Autoplay: **${String(state)}**.`;
      await interaction.reply({ embeds: [Embeds.info('Autoplay', `${desc}\nUsa \`/reproducir\` para mantener la cola llena.`)] });
      return;
    }
  },
};
