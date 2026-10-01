/**
 * Música (Lavalink): /reproducir /cola /saltar /detener /pausa /volumen /sonando /repetir
 * Todas las respuestas son embeds modernos; error elegante cuando Lavalink no está configurado.
 */
import { GuildMember, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';
import { musicEnabled } from '../../systems/music.js';

function needLavalink() {
  return Embeds.error('Música no disponible', 'Lavalink no está configurado. Define `LAVALINK_*` en `.env`.');
}

async function ensureVoice(interaction: Parameters<Command['execute']>[0]) {
  const member = interaction.member as GuildMember | null;
  const vc = member?.voice.channel;
  if (!vc) {
    await interaction.reply({ embeds: [Embeds.error('Sin voz', 'Únete primero a un canal de voz.')], ephemeral: true });
    return null;
  }
  return vc;
}

export const play: Command = {
  data: new SlashCommandBuilder().setName('reproducir').setDescription('Reproducir música').addStringOption((o) => o.setName('busqueda').setDescription('Canción o URL').setRequired(true)),
  cooldown: 3,
  async execute(interaction, client) {
    if (!musicEnabled() || !client.lavalink) {
      await interaction.reply({ embeds: [needLavalink()], ephemeral: true });
      return;
    }
    const vc = await ensureVoice(interaction);
    if (!vc || !interaction.guild) return;
    await interaction.deferReply();
    const query = interaction.options.getString('busqueda', true);
    const player = client.lavalink.createPlayer({
      guildId: interaction.guild.id,
      voiceChannelId: vc.id,
      textChannelId: interaction.channelId ?? undefined,
      selfDeaf: true,
    });
    await player.connect();
    const res = await player.search({ query }, interaction.user).catch(() => null);
    if (!res || !('tracks' in res) || res.tracks.length === 0) {
      await interaction.editReply({ embeds: [Embeds.error('Sin resultados', `Nada encontrado para \`${query.slice(0, 100)}\`.`) ] });
      return;
    }
    const track = res.tracks[0];
    await player.queue.add(track);
    if (!player.playing && !player.paused) await player.play();
    await interaction.editReply({ embeds: [Embeds.primary('🎵 Añadido a la cola', `**${track.info.title}** — \`${track.info.author}\``).setThumbnail(track.info.artworkUrl ?? null)] });
  },
};

async function getPlayer(interaction: Parameters<Command['execute']>[0], client: Parameters<Command['execute']>[1]) {
  if (!musicEnabled() || !client.lavalink) {
    await interaction.reply({ embeds: [needLavalink()], ephemeral: true });
    return null;
  }
  const player = client.lavalink.getPlayer(interaction.guildId!);
  if (!player) {
    await interaction.reply({ embeds: [Embeds.error('Nada sonando', 'Usa `/reproducir` primero.')], ephemeral: true });
    return null;
  }
  return player;
}

export const queue: Command = {
  data: new SlashCommandBuilder().setName('cola').setDescription('Ver la cola'),
  cooldown: 3,
  async execute(interaction, client) {
    const player = await getPlayer(interaction, client);
    if (!player) return;
    const current = player.queue.current ? `**Ahora:** ${player.queue.current.info.title}\n` : '';
    const list = player.queue.tracks.slice(0, 10).map((t: { info: { title: string } }, i: number) => `${i + 1}. ${t.info.title}`).join('\n') || '*Cola vacía*';
    await interaction.reply({ embeds: [Embeds.primary('🎶 Cola', `${current}${list}`)] });
  },
};

export const skip: Command = {
  data: new SlashCommandBuilder().setName('saltar').setDescription('Saltar canción'),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await getPlayer(interaction, client);
    if (!player) return;
    await player.skip();
    await interaction.reply({ embeds: [Embeds.success('Saltada', 'Reproduciendo la siguiente canción.')] });
  },
};

export const stop: Command = {
  data: new SlashCommandBuilder().setName('detener').setDescription('Detener y salir'),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await getPlayer(interaction, client);
    if (!player) return;
    await player.destroy('stopped by user');
    await interaction.reply({ embeds: [Embeds.info('Detenido', 'Salí del canal de voz.')] });
  },
};

export const pauseResume: Command = {
  data: new SlashCommandBuilder().setName('pausa').setDescription('Pausar / reanudar').addBooleanOption((o) => o.setName('pausado').setDescription('true=pausar false=reanudar').setRequired(true)),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await getPlayer(interaction, client);
    if (!player) return;
    const paused = interaction.options.getBoolean('pausado', true);
    if (paused) await player.pause();
    else await player.resume();
    await interaction.reply({ embeds: [Embeds.info(paused ? 'Pausado' : 'Reanudado', paused ? 'Reproducción en pausa.' : 'Reproducción reanudada.')] });
  },
};

export const volume: Command = {
  data: new SlashCommandBuilder().setName('volumen').setDescription('Ajustar volumen').addIntegerOption((o) => o.setName('nivel').setDescription('Nivel de 0 a 200').setRequired(true).setMinValue(0).setMaxValue(200)),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await getPlayer(interaction, client);
    if (!player) return;
    const level = interaction.options.getInteger('nivel', true);
    await player.setVolume(level);
    await interaction.reply({ embeds: [Embeds.success('Volumen', `Ajustado a **${level}%**.`)] });
  },
};

export const nowplaying: Command = {
  data: new SlashCommandBuilder().setName('sonando').setDescription('Canción actual'),
  cooldown: 3,
  async execute(interaction, client) {
    const player = await getPlayer(interaction, client);
    if (!player) return;
    const cur = player.queue.current;
    if (!cur) {
      await interaction.reply({ embeds: [Embeds.info('Nada sonando', 'La cola está vacía.')] });
      return;
    }
    await interaction.reply({ embeds: [Embeds.primary('🎵 Sonando ahora', `**${cur.info.title}** — \`${cur.info.author}\``).setThumbnail(cur.info.artworkUrl ?? null)] });
  },
};

export const loopShuffle: Command = {
  data: new SlashCommandBuilder()
    .setName('repetir')
    .setDescription('Ciclar modo de repetición (off → track → queue)'),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await getPlayer(interaction, client);
    if (!player) return;
    const next = player.repeatMode === 'off' ? 'track' : player.repeatMode === 'track' ? 'queue' : 'off';
    await player.setRepeatMode(next);
    await interaction.reply({ embeds: [Embeds.info('Repetir', `Modo: **${next}**.`)] });
  },
};
