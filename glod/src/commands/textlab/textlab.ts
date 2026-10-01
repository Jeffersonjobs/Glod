/**
 * Textlab: /texto <25 transformaciones de texto puras, 100% locales>.
 * Cooldown 3. Todo validado (max 500 caracteres).
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

const MAX_LEN = 500;

function block(out: string): string {
  return '```\n' + out.slice(0, 1500) + '\n```';
}

function mockCase(text: string): string {
  let out = '';
  for (const ch of text) {
    if (/[a-zA-Z]/.test(ch)) out += Math.random() < 0.5 ? ch.toLowerCase() : ch.toUpperCase();
    else out += ch;
  }
  return out;
}

function alternateCase(text: string): string {
  let out = '';
  let i = 0;
  for (const ch of text) {
    if (/[a-zA-Z]/.test(ch)) {
      out += i % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase();
      i++;
    } else {
      out += ch;
    }
  }
  return out;
}

function uwuify(text: string): string {
  let out = text
    .replace(/(?:r|l)/g, 'w')
    .replace(/(?:R|L)/g, 'W')
    .replace(/n([aeiou])/g, 'ny$1')
    .replace(/N([aeiouAEIOU])/g, 'Ny$1')
    .replace(/ove/g, 'uve');
  if (!/\suwu\s*$/i.test(out)) out += ' uwu';
  return out;
}

const LEET_MAP: Record<string, string> = {
  a: '4', A: '4',
  e: '3', E: '3',
  i: '1', I: '1',
  o: '0', O: '0',
  s: '5', S: '5',
  t: '7', T: '7',
  b: '8', B: '8',
  g: '9', G: '9',
  l: '1', L: '1',
  z: '2', Z: '2',
};

function leetify(text: string): string {
  return [...text].map((c) => LEET_MAP[c] ?? c).join('');
}

function pigWord(word: string): string {
  const m = word.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
  if (!m) return word;
  const [, pre, core, post] = m as [string, string, string, string];
  const lower = core.toLowerCase();
  let pig: string;
  if (/^[aeiou]/.test(lower)) {
    pig = core + 'way';
  } else {
    const cl = core.match(/^[^aeiouAEIOU]+/)?.[0] ?? '';
    pig = core.slice(cl.length) + cl + 'ay';
  }
  return (pre ?? '') + pig + (post ?? '');
}

function piglatinify(text: string): string {
  return text.split(/(\s+)/).map((p) => (/^\s+$/.test(p) ? p : pigWord(p))).join('');
}

function vaporwaveify(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code === 0x20) out += '　';
    else if (code >= 0x21 && code <= 0x7e) out += String.fromCharCode(code + 0xfee0);
    else out += ch;
  }
  return out;
}

const TINY_MAP: Record<string, string> = {
  a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ',
  k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ',
  v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
  A: 'ᴬ', B: 'ᴮ', D: 'ᴰ', E: 'ᴱ', G: 'ᴳ', H: 'ᴴ', I: 'ᴵ', J: 'ᴶ', K: 'ᴷ',
  L: 'ᴸ', M: 'ᴹ', N: 'ᴺ', O: 'ᴼ', P: 'ᴾ', R: 'ᴿ', T: 'ᵀ', U: 'ᵁ', V: 'ⱽ', W: 'ᵂ',
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};

function tinyify(text: string): string {
  return [...text].map((c) => TINY_MAP[c] ?? TINY_MAP[c.toLowerCase()] ?? c).join('');
}

function boldify(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 65 && code <= 90) out += String.fromCodePoint(0x1d400 + (code - 65));
    else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x1d41a + (code - 97));
    else if (code >= 48 && code <= 57) out += String.fromCodePoint(0x1d7ce + (code - 48));
    else out += ch;
  }
  return out;
}

function italicify(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 65 && code <= 90) out += String.fromCodePoint(0x1d434 + (code - 65));
    else if (code === 104) out += String.fromCodePoint(0x1d455);
    else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x1d44e + (code - 97));
    else out += ch;
  }
  return out;
}

function monoblockify(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 65 && code <= 90) out += String.fromCodePoint(0x1d670 + (code - 65));
    else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x1d68a + (code - 97));
    else if (code >= 48 && code <= 57) out += String.fromCodePoint(0x1d7f6 + (code - 48));
    else out += ch;
  }
  return out;
}

function bubbleify(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 65 && code <= 90) out += String.fromCodePoint(0x24b6 + (code - 65));
    else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x24d0 + (code - 97));
    else if (code >= 49 && code <= 57) out += String.fromCodePoint(0x2460 + (code - 49));
    else if (code === 48) out += String.fromCodePoint(0x24ea);
    else out += ch;
  }
  return out;
}

const DIGIT_WORDS: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
};

function emojify(text: string): string {
  const parts: string[] = [];
  for (const ch of text) {
    if (/[a-zA-Z]/.test(ch)) parts.push(`:regional_indicator_${ch.toLowerCase()}:`);
    else if (/[0-9]/.test(ch)) parts.push(`:${DIGIT_WORDS[ch]}:`);
    else if (ch === ' ') parts.push('  ');
    else parts.push(ch);
  }
  return parts.join(' ');
}

function titlecaseify(text: string): string {
  return text
    .toLowerCase()
    .split(/(\s+)/)
    .map((p) => (/^\s+$/.test(p) || p === '' ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join('');
}

function kebabify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function snakeify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function camelify(text: string): string {
  const words = text.split(/[\s_\-]+/).filter((w) => w.length > 0);
  if (words.length === 0) return '';
  const [first, ...rest] = words as [string, ...string[]];
  return first.toLowerCase() + rest.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

function hashtagify(text: string): string {
  const tags = text
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9À-ÿ]/g, ''))
    .filter((w) => w.length > 0)
    .map((w) => '#' + w.charAt(0).toUpperCase() + w.slice(1));
  return tags.join(' ');
}

function acronymize(text: string): string {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  let out = '';
  for (const w of words) {
    const m = w.match(/[A-Za-z0-9À-ÿ]/);
    if (m) out += m[0].toUpperCase();
  }
  return out;
}

export const textlab: Command = {
  data: new SlashCommandBuilder()
    .setName('texto')
    .setDescription('Laboratorio de transformaciones de texto')
    .addSubcommand((s) =>
      s.setName('burla').setDescription('Convierte a tExTo BuRlÓn de burla').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('uwu').setDescription('Convierte texto a estilo uwu').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('leet').setDescription('Convierte texto a leetspeak').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('jeringonza').setDescription('Convierte texto a jeringonza pig latin').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('invertir-palabras').setDescription('Invierte el orden de las palabras').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('alternar').setDescription('Alterna aLtErNaNdO mayúsculas').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('vaporwave').setDescription('Convierte a texto ｆｕｌｌｗｉｄｔｈ vaporwave').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('diminuto').setDescription('Convierte a texto diminuto en superíndice').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('negrita-elegante').setDescription('Convierte a texto en negrita matemática').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('cursiva-elegante').setDescription('Convierte a texto en cursiva matemática').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('monoespaciado').setDescription('Convierte a texto monoespaciado matemático').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('burbuja').setDescription('Convierte a texto con letras burbuja').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('aplausos').setDescription('Inserta aplausos entre palabras').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('emojificar').setDescription('Convierte letras a emojis regionales').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('gritar').setDescription('Grita en mayúsculas con !!!').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('susurrar').setDescription('Susurra el texto bajito').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('sarcasmo').setDescription('Añade una nota de sarcasmo').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('titulo').setDescription('Convierte a texto en tipo título').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('kebab').setDescription('Convierte texto a formato kebab').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('snake').setDescription('Convierte texto a formato snake').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('camel').setDescription('Convierte texto a formato camel').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('hashtag').setDescription('Convierte palabras a #Hashtags').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s.setName('siglas').setDescription('Extrae las iniciales del texto').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s
        .setName('alargar')
        .setDescription('Alarga la última letra del texto')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN))
        .addIntegerOption((o) => o.setName('repeticiones').setDescription('Repeticiones entre 1 y 10').setMinValue(1).setMaxValue(10)),
    )
    .addSubcommand((s) =>
      s.setName('espaciado').setDescription('S e p a r a las letras del texto').addStringOption((o) => o.setName('texto').setDescription('Texto a transformar').setRequired(true).setMaxLength(MAX_LEN)),
    ),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'alargar') {
      const text = interaction.options.getString('texto', true);
      const count = interaction.options.getInteger('repeticiones') ?? 3;
      if (!text.trim()) {
        await interaction.reply({ embeds: [Embeds.error('Texto vacío', 'Escribe algo para transformar.')], ephemeral: true });
        return;
      }
      if (text.length > MAX_LEN) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      if (!Number.isInteger(count) || count < 1 || count > 10) {
        await interaction.reply({ embeds: [Embeds.error('Repeticiones inválidas', 'Usa un valor entre 1 y 10.')], ephemeral: true });
        return;
      }
      const last = text.charAt(text.length - 1);
      const out = text + last.repeat(count);
      await interaction.reply({ embeds: [Embeds.success('Alargado', block(out))] });
      return;
    }

    const text = interaction.options.getString('texto', true);
    if (!text.trim()) {
      await interaction.reply({ embeds: [Embeds.error('Texto vacío', 'Escribe algo para transformar.')], ephemeral: true });
      return;
    }
    if (text.length > MAX_LEN) {
      await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
      return;
    }

    let title = sub;
    let out = '';

    if (sub === 'burla') {
      title = 'Burla';
      out = mockCase(text);
    } else if (sub === 'uwu') {
      title = 'Uwu';
      out = uwuify(text);
    } else if (sub === 'leet') {
      title = 'Leet';
      out = leetify(text);
    } else if (sub === 'jeringonza') {
      title = 'Jeringonza';
      out = piglatinify(text);
    } else if (sub === 'invertir-palabras') {
      title = 'Palabras invertidas';
      out = text.trim().split(/\s+/).reverse().join(' ');
    } else if (sub === 'alternar') {
      title = 'aLtErNaDo';
      out = alternateCase(text);
    } else if (sub === 'vaporwave') {
      title = 'Vaporwave';
      out = vaporwaveify(text);
    } else if (sub === 'diminuto') {
      title = 'Diminuto';
      out = tinyify(text);
    } else if (sub === 'negrita-elegante') {
      title = 'Negrita elegante';
      out = boldify(text);
    } else if (sub === 'cursiva-elegante') {
      title = 'Cursiva elegante';
      out = italicify(text);
    } else if (sub === 'monoespaciado') {
      title = 'Monoespaciado';
      out = monoblockify(text);
    } else if (sub === 'burbuja') {
      title = 'Burbuja';
      out = bubbleify(text);
    } else if (sub === 'aplausos') {
      title = 'Aplausos';
      out = text.trim().split(/\s+/).join(' 👏 ');
    } else if (sub === 'emojificar') {
      title = 'Emojificado';
      out = emojify(text);
    } else if (sub === 'gritar') {
      title = 'Grito';
      out = text.toUpperCase() + '!!!';
    } else if (sub === 'susurrar') {
      title = 'Susurro';
      out = `*${text.toLowerCase()}...*`;
    } else if (sub === 'sarcasmo') {
      title = 'Sarcasmo';
      out = `${text} (nótese el sarcasmo)`;
    } else if (sub === 'titulo') {
      title = 'Título';
      out = titlecaseify(text);
    } else if (sub === 'kebab') {
      title = 'Kebab';
      out = kebabify(text);
      if (!out) {
        await interaction.reply({ embeds: [Embeds.error('Sin contenido', 'Escribe letras o números para convertir.')], ephemeral: true });
        return;
      }
    } else if (sub === 'snake') {
      title = 'Snake';
      out = snakeify(text);
      if (!out) {
        await interaction.reply({ embeds: [Embeds.error('Sin contenido', 'Escribe letras o números para convertir.')], ephemeral: true });
        return;
      }
    } else if (sub === 'camel') {
      title = 'Camel';
      out = camelify(text);
      if (!out) {
        await interaction.reply({ embeds: [Embeds.error('Sin contenido', 'Escribe letras o números para convertir.')], ephemeral: true });
        return;
      }
    } else if (sub === 'hashtag') {
      title = 'Hashtag';
      out = hashtagify(text);
      if (!out) {
        await interaction.reply({ embeds: [Embeds.error('Sin contenido', 'Escribe letras o números para convertir.')], ephemeral: true });
        return;
      }
    } else if (sub === 'siglas') {
      title = 'Siglas';
      out = acronymize(text);
      if (!out) {
        await interaction.reply({ embeds: [Embeds.error('Sin contenido', 'Escribe letras o números para convertir.')], ephemeral: true });
        return;
      }
    } else if (sub === 'espaciado') {
      title = 'Espaciado';
      out = [...text].join(' ');
    } else {
      await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
      return;
    }

    await interaction.reply({ embeds: [Embeds.success(title, block(out))] });
    return;
  },
};
