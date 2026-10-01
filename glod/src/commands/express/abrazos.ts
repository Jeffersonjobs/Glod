/**
 * Express (abrazos): /abrazar /besar /acariciar /cachetada /mimar — GIFs de nekos.life con fallback local.
 * @module commands/express/abrazos
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

async function fetchGif(endpoint: string): Promise<string | null> {
  try {
    const res = await fetch(`https://nekos.life/api/v2/img/${endpoint}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    if (typeof raw === 'object' && raw !== null && 'url' in raw) {
      const maybeUrl = (raw as { url?: unknown }).url;
      if (typeof maybeUrl === 'string' && maybeUrl.length > 0) return maybeUrl;
    }
    return null;
  } catch {
    return null;
  }
}

export const abrazar: Command = {
  data: new SlashCommandBuilder()
    .setName('abrazar')
    .setDescription('Abraza a alguien con cariño')
    .addUserOption((o) => o.setName('usuario').setDescription('Persona a la que abrazar')),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('usuario') ?? interaction.user;
    const actor = `<@${interaction.user.id}>`;
    const other = `<@${target.id}>`;
    const self = target.id === interaction.user.id;
    const title = self ? `🤗 ${actor} se da un abrazo a sí mismo` : `🤗 ${actor} abraza a ${other}`;
    const desc = self
      ? '¡Un autoabrazo también reconforta! Que tengas un día cálido y amable.'
      : '¡Un abrazo cálido y amistoso! Que tengas un gran día.';
    const url = await fetchGif('hug');
    const embed = url !== null ? Embeds.primary(title, desc).setImage(url) : Embeds.primary(title, desc);
    await interaction.editReply({ embeds: [embed] });
  },
};

export const besar: Command = {
  data: new SlashCommandBuilder()
    .setName('besar')
    .setDescription('Manda un beso amistoso en la mejilla')
    .addUserOption((o) => o.setName('usuario').setDescription('Persona a la que besar')),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('usuario') ?? interaction.user;
    const actor = `<@${interaction.user.id}>`;
    const other = `<@${target.id}>`;
    const self = target.id === interaction.user.id;
    const title = self ? `💋 ${actor} se manda un beso al aire` : `💋 ${actor} besa a ${other}`;
    const desc = self
      ? '¡Amor propio! Un beso al aire, solo amistoso y con cariño.'
      : '¡Un beso amistoso en la mejilla! Solo platónico y con respeto.';
    const url = await fetchGif('kiss');
    const embed = url !== null ? Embeds.primary(title, desc).setImage(url) : Embeds.primary(title, desc);
    await interaction.editReply({ embeds: [embed] });
  },
};

export const acariciar: Command = {
  data: new SlashCommandBuilder()
    .setName('acariciar')
    .setDescription('Acaricia la cabeza de alguien con amistad')
    .addUserOption((o) => o.setName('usuario').setDescription('Persona a la que acariciar')),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('usuario') ?? interaction.user;
    const actor = `<@${interaction.user.id}>`;
    const other = `<@${target.id}>`;
    const self = target.id === interaction.user.id;
    const title = self ? `🐾 ${actor} se da una palmadita en la espalda` : `🐾 ${actor} acaricia a ${other}`;
    const desc = self
      ? '¡Buen trabajo! Te das una palmadita por tu esfuerzo.'
      : '¡Una palmadita amistosa en la cabeza! Sigue así, lo haces genial.';
    const url = await fetchGif('pat');
    const embed = url !== null ? Embeds.primary(title, desc).setImage(url) : Embeds.primary(title, desc);
    await interaction.editReply({ embeds: [embed] });
  },
};

export const cachetada: Command = {
  data: new SlashCommandBuilder()
    .setName('cachetada')
    .setDescription('Cachetada de mentira estilo dibujos animados')
    .addUserOption((o) => o.setName('usuario').setDescription('Persona a la que dar la cachetada de mentira')),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('usuario') ?? interaction.user;
    const actor = `<@${interaction.user.id}>`;
    const other = `<@${target.id}>`;
    const self = target.id === interaction.user.id;
    const title = self ? `🐟 ${actor} se tropieza con una almohada` : `🐟 ${actor} le da una cachetada de mentira a ${other}`;
    const desc = self
      ? '¡Plof! Te lanzaste una almohada a ti mismo. Sin daño, solo risas de dibujos animados.'
      : '¡POW! Cachetada de dibujos animados con guante gigante de espuma. Sin daño, solo risas.';
    const url = await fetchGif('slap');
    const embed = url !== null ? Embeds.primary(title, desc).setImage(url) : Embeds.primary(title, desc);
    await interaction.editReply({ embeds: [embed] });
  },
};

export const mimar: Command = {
  data: new SlashCommandBuilder()
    .setName('mimar')
    .setDescription('Mima a alguien con un momento tierno')
    .addUserOption((o) => o.setName('usuario').setDescription('Persona a la que mimar')),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('usuario') ?? interaction.user;
    const actor = `<@${interaction.user.id}>`;
    const other = `<@${target.id}>`;
    const self = target.id === interaction.user.id;
    const title = self ? `💛 ${actor} se acurruca con una manta` : `💛 ${actor} mima a ${other}`;
    const desc = self
      ? '¡Hora de mimarte! Manta, chocolate caliente y descanso merecido.'
      : '¡Momento tierno de mimos! Acompañado de una manta y buenas vibras.';
    const url = await fetchGif('cuddle');
    const embed = url !== null ? Embeds.primary(title, desc).setImage(url) : Embeds.primary(title, desc);
    await interaction.editReply({ embeds: [embed] });
  },
};
