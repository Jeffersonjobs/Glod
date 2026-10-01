/**
 * Express (texto): /binario /morse /cesar — codifican o decodifican texto, 100% locales.
 * @module commands/express/texto-express
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

const MAX_DESC = 3500;

function fit(s: string): string {
  return s.length > MAX_DESC ? `${s.slice(0, MAX_DESC)}… (recortado)` : s;
}

function code(text: string): string {
  return `\`\`\`\n${fit(text)}\n\`\`\``;
}

function decodeBinary(input: string): string | null {
  const stripped = input.replace(/\s+/g, '');
  if (stripped.length === 0 || !/^[01]+$/.test(stripped) || stripped.length % 8 !== 0) return null;
  const bytes: number[] = [];
  for (let i = 0; i < stripped.length; i += 8) {
    const chunk = stripped.slice(i, i + 8);
    const value = parseInt(chunk, 2);
    if (Number.isNaN(value)) return null;
    bytes.push(value);
  }
  try {
    return Buffer.from(bytes).toString('utf8');
  } catch {
    return null;
  }
}

function encodeBinary(input: string): string {
  return [...Buffer.from(input, 'utf8')].map((b) => b.toString(2).padStart(8, '0')).join(' ');
}

export const binario: Command = {
  data: new SlashCommandBuilder()
    .setName('binario')
    .setDescription('Codifica texto a binario o decodifica binario a texto')
    .addStringOption((o) => o.setName('texto').setDescription('Texto o binario (0/1 y espacios)').setRequired(true).setMaxLength(500)),
  cooldown: 3,
  async execute(interaction) {
    const texto = interaction.options.getString('texto', true);
    const looksBinary = /^[01\s]+$/.test(texto) && /[01]/.test(texto);
    if (looksBinary) {
      const decoded = decodeBinary(texto);
      if (decoded === null || decoded.length === 0) {
        await interaction.reply({
          embeds: [Embeds.error('Binario inválido', 'Ese binario no es válido. Debe ser grupos de 8 bits (`0`/`1`), separados o no por espacios.')],
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({ embeds: [Embeds.success('Binario decodificado', `Entrada:\n${code(texto)}\nResultado:\n${code(decoded)}`)] });
      return;
    }
    const encoded = encodeBinary(texto);
    await interaction.reply({ embeds: [Embeds.success('Texto codificado a binario', `Entrada:\n${code(texto)}\nResultado:\n${code(encoded)}`)] });
  },
};

const MORSE_ENCODE: Record<string, string> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  '!': '-.-.--',
  '¿': '..-.-',
  '¡': '.--.-',
  'Ñ': '--.--',
};

const MORSE_DECODE: Record<string, string> = Object.fromEntries(Object.entries(MORSE_ENCODE).map(([k, v]) => [v, k]));

function encodeMorse(input: string): string {
  const words = input.trim().toUpperCase().split(/\s+/);
  const encodedWords = words.map((word) => {
    const letters: string[] = [];
    for (const ch of word) {
      const m = MORSE_ENCODE[ch];
      if (m !== undefined) letters.push(m);
    }
    return letters.join(' ');
  });
  return encodedWords.filter((w) => w.length > 0).join(' / ');
}

function decodeMorse(input: string): string {
  const words = input.trim().split(/\s*\/\s*/);
  const decodedWords = words.map((word) => {
    const codes = word.trim().split(/\s+/).filter((c) => c.length > 0);
    return codes
      .map((c) => {
        const ch = MORSE_DECODE[c];
        return ch !== undefined ? ch : '·';
      })
      .join('');
  });
  return decodedWords.join(' ');
}

export const morse: Command = {
  data: new SlashCommandBuilder()
    .setName('morse')
    .setDescription('Codifica texto a morse o decodifica morse a texto')
    .addStringOption((o) => o.setName('texto').setDescription('Texto o morse (. - / y espacios)').setRequired(true).setMaxLength(300)),
  cooldown: 3,
  async execute(interaction) {
    const texto = interaction.options.getString('texto', true);
    const looksMorse = /^[.\-/\s]+$/.test(texto) && /[.\-]/.test(texto);
    if (looksMorse) {
      const decoded = decodeMorse(texto);
      if (decoded.trim().length === 0) {
        await interaction.reply({ embeds: [Embeds.error('Morse inválido', 'No pude decodificar ese morse. Usa `.`, `-`, `/` y espacios.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.success('Morse decodificado', `Entrada:\n${code(texto)}\nResultado:\n${code(decoded)}`)] });
      return;
    }
    const encoded = encodeMorse(texto);
    if (encoded.length === 0) {
      await interaction.reply({ embeds: [Embeds.error('Sin resultado', 'No hay caracteres codificables (A-Z, 0-9 y puntuación básica).')], ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [Embeds.success('Texto codificado a morse', `Entrada:\n${code(texto)}\nResultado:\n${code(encoded)}`)] });
  },
};

function cesarShift(input: string, shift: number): string {
  const s = ((shift % 26) + 26) % 26;
  return [...input]
    .map((ch) => {
      const c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90) return String.fromCharCode(((c - 65 + s) % 26) + 65);
      if (c >= 97 && c <= 122) return String.fromCharCode(((c - 97 + s) % 26) + 97);
      return ch;
    })
    .join('');
}

export const cesar: Command = {
  data: new SlashCommandBuilder()
    .setName('cesar')
    .setDescription('Aplica el cifrado César a un texto (solo A-Z)')
    .addStringOption((o) => o.setName('texto').setDescription('Texto a desplazar').setRequired(true).setMaxLength(500))
    .addIntegerOption((o) => o.setName('desplazamiento').setDescription('Desplazamiento entre -25 y 25, sin contar 0').setRequired(true).setMinValue(-25).setMaxValue(25)),
  cooldown: 3,
  async execute(interaction) {
    const texto = interaction.options.getString('texto', true);
    const desplazamiento = interaction.options.getInteger('desplazamiento', true);
    if (desplazamiento === 0) {
      await interaction.reply({ embeds: [Embeds.error('Desplazamiento inválido', 'El desplazamiento no puede ser `0`. Elige entre `-25` y `25`.')], ephemeral: true });
      return;
    }
    const resultado = cesarShift(texto, desplazamiento);
    const signo = desplazamiento > 0 ? `+${desplazamiento}` : `${desplazamiento}`;
    await interaction.reply({ embeds: [Embeds.success(`César (${signo})`, `Entrada:\n${code(texto)}\nResultado:\n${code(resultado)}\n*Solo se desplazan A-Z/a-z; la ñ y los acentos quedan intactos.*`)] });
  },
};
