/**
 * Tools: /herramientas <18 subcomandos utilitarios puros, sin APIs externas>.
 * Cooldown 3. Todo validado (max 1000 caracteres).
 */
import { SlashCommandBuilder } from 'discord.js';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

const MAX_LEN = 1000;

function tooLong(text: string): boolean {
  return text.length > MAX_LEN;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, '');
  if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) return null;
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
}

export const tools: Command = {
  data: new SlashCommandBuilder()
    .setName('herramientas')
    .setDescription('Utilidades puras sin APIs externas')
    .addSubcommand((s) =>
      s
        .setName('base64-codificar')
        .setDescription('Codifica texto a base64')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a codificar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s
        .setName('base64-decodificar')
        .setDescription('Decodifica base64 a texto')
        .addStringOption((o) => o.setName('texto').setDescription('Texto en base64').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s
        .setName('hash')
        .setDescription('Calcula el hash de un texto con node:crypto')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a resumir').setRequired(true).setMaxLength(MAX_LEN))
        .addStringOption((o) =>
          o
            .setName('algoritmo')
            .setDescription('Algoritmo de resumen')
            .setRequired(true)
            .addChoices(
              { name: 'md5', value: 'md5' },
              { name: 'sha1', value: 'sha1' },
              { name: 'sha256', value: 'sha256' },
              { name: 'sha512', value: 'sha512' },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('contrasena')
        .setDescription('Genera una contraseña segura')
        .addIntegerOption((o) => o.setName('longitud').setDescription('Longitud entre 8 y 64').setMinValue(8).setMaxValue(64))
        .addBooleanOption((o) => o.setName('simbolos').setDescription('Incluir símbolos')),
    )
    .addSubcommand((s) =>
      s
        .setName('color')
        .setDescription('Convierte hex a RGB y HSL con vista previa')
        .addStringOption((o) => o.setName('hex').setDescription('p. ej. #ff5733').setRequired(true).setMaxLength(7)),
    )
    .addSubcommand((s) =>
      s
        .setName('hexadecimal')
        .setDescription('Convierte un número decimal a hexadecimal')
        .addIntegerOption((o) => o.setName('numero').setDescription('Número decimal').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('binario')
        .setDescription('Convierte un número decimal a binario')
        .addIntegerOption((o) => o.setName('numero').setDescription('Número decimal').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('invertir')
        .setDescription('Invierte el orden de un texto')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a invertir').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s
        .setName('mayusculas')
        .setDescription('Convierte un texto a mayúsculas')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a convertir').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s
        .setName('minusculas')
        .setDescription('Convierte un texto a minúsculas')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a convertir').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s
        .setName('contar')
        .setDescription('Cuenta caracteres, palabras y líneas de un texto')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a contar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) => s.setName('uuid').setDescription('Genera un UUID v4 aleatorio'))
    .addSubcommand((s) =>
      s
        .setName('marca-tiempo')
        .setDescription('Convierte una fecha a unix y formatos de Discord')
        .addStringOption((o) => o.setName('fecha').setDescription('Fecha opcional (ISO o legible)').setMaxLength(100)),
    )
    .addSubcommand((s) =>
      s
        .setName('texto-qr')
        .setDescription('Prepara un texto para código QR (sin imagen externa)')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a preparar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s
        .setName('calcular')
        .setDescription('Evalúa una expresión matemática')
        .addStringOption((o) => o.setName('expresion').setDescription('p. ej. (2+3)*4').setRequired(true).setMaxLength(100)),
    )
    .addSubcommand((s) =>
      s
        .setName('elegir')
        .setDescription('Elige al azar entre opciones separadas por comas')
        .addStringOption((o) => o.setName('opciones').setDescription('p. ej. a, b, c').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s
        .setName('mezclar-palabras')
        .setDescription('Mezcla las palabras de un texto al azar')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a mezclar').setRequired(true).setMaxLength(MAX_LEN)),
    )
    .addSubcommand((s) =>
      s
        .setName('palindromo')
        .setDescription('Comprueba si un texto es un palíndromo')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a comprobar').setRequired(true).setMaxLength(MAX_LEN)),
    ),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'base64-codificar') {
      const text = interaction.options.getString('texto', true);
      if (tooLong(text)) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      const out = Buffer.from(text, 'utf8').toString('base64');
      await interaction.reply({ embeds: [Embeds.success('Base64 codificado', `Entrada: \`${text.slice(0, 200)}\`\nSalida:\n\`\`\`\n${out.slice(0, 1500)}\n\`\`\``)] });
      return;
    }

    if (sub === 'base64-decodificar') {
      const text = interaction.options.getString('texto', true).trim();
      if (tooLong(text)) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      if (!/^[A-Za-z0-9+/=\s]+$/.test(text)) {
        await interaction.reply({ embeds: [Embeds.error('Base64 inválido', 'Solo se permiten `A-Z a-z 0-9 + / =`.')], ephemeral: true });
        return;
      }
      try {
        const out = Buffer.from(text.replace(/\s+/g, ''), 'base64').toString('utf8');
        await interaction.reply({ embeds: [Embeds.success('Base64 decodificado', `Salida:\n\`\`\`\n${out.slice(0, 1500) || '(vacío)'}\n\`\`\``)] });
      } catch {
        await interaction.reply({ embeds: [Embeds.error('Base64 inválido', 'No se pudo decodificar ese texto.')], ephemeral: true });
      }
      return;
    }

    if (sub === 'hash') {
      const text = interaction.options.getString('texto', true);
      const algorithm = interaction.options.getString('algoritmo', true);
      if (tooLong(text)) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      if (!['md5', 'sha1', 'sha256', 'sha512'].includes(algorithm)) {
        await interaction.reply({ embeds: [Embeds.error('Algoritmo inválido', 'Usa md5, sha1, sha256 o sha512.')], ephemeral: true });
        return;
      }
      const digest = createHash(algorithm).update(text, 'utf8').digest('hex');
      await interaction.reply({ embeds: [Embeds.success(`Hash ${algorithm}`, `\`${digest}\``)] });
      return;
    }

    if (sub === 'contrasena') {
      const length = interaction.options.getInteger('longitud') ?? 16;
      const symbols = interaction.options.getBoolean('simbolos') ?? true;
      if (!Number.isInteger(length) || length < 8 || length > 64) {
        await interaction.reply({ embeds: [Embeds.error('Longitud inválida', 'Usa un valor entre 8 y 64.')], ephemeral: true });
        return;
      }
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      const digits = '23456789';
      const syms = '!@#$%^&*()-_=+[]{};:,.?/';
      const alphabet = letters + digits + (symbols ? syms : '');
      let pwd = '';
      for (let i = 0; i < length; i++) pwd += alphabet[randomInt(alphabet.length)];
      await interaction.reply({ embeds: [Embeds.success(`Contraseña (${length} caracteres)`, `\`${pwd}\``)], ephemeral: true });
      return;
    }

    if (sub === 'color') {
      const hex = interaction.options.getString('hex', true);
      const rgb = hexToRgb(hex);
      if (!rgb) {
        await interaction.reply({ embeds: [Embeds.error('Color inválido', 'Usa el formato `#RGB` o `#RRGGBB`, p. ej. `#ff5733`.')], ephemeral: true });
        return;
      }
      const [r, g, b] = rgb;
      const [h, s, l] = rgbToHsl(r, g, b);
      const canonical = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      const embed = Embeds.success('Color', `HEX: \`${canonical}\`\nRGB: \`rgb(${r}, ${g}, ${b})\`\nHSL: \`hsl(${h}, ${s}%, ${l}%)\``).setColor([r, g, b] as [number, number, number]);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'hexadecimal') {
      const n = interaction.options.getInteger('numero', true);
      if (!Number.isSafeInteger(n)) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un entero seguro.')], ephemeral: true });
        return;
      }
      const out = (n < 0 ? '-' : '') + Math.abs(n).toString(16).toUpperCase();
      await interaction.reply({ embeds: [Embeds.success('Decimal a HEX', `\`${n}\` = \`0x${out}\``)] });
      return;
    }

    if (sub === 'binario') {
      const n = interaction.options.getInteger('numero', true);
      if (!Number.isSafeInteger(n)) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un entero seguro.')], ephemeral: true });
        return;
      }
      const out = (n < 0 ? '-' : '') + Math.abs(n).toString(2);
      await interaction.reply({ embeds: [Embeds.success('Decimal a BIN', `\`${n}\` = \`0b${out}\``)] });
      return;
    }

    if (sub === 'invertir') {
      const text = interaction.options.getString('texto', true);
      if (tooLong(text)) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      const out = [...text].reverse().join('');
      await interaction.reply({ embeds: [Embeds.success('Texto invertido', `\`\`\`\n${out.slice(0, 1500)}\n\`\`\``)] });
      return;
    }

    if (sub === 'mayusculas') {
      const text = interaction.options.getString('texto', true);
      if (tooLong(text)) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.success('Mayúsculas', `\`\`\`\n${text.toUpperCase().slice(0, 1500)}\n\`\`\``)] });
      return;
    }

    if (sub === 'minusculas') {
      const text = interaction.options.getString('texto', true);
      if (tooLong(text)) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.success('Minúsculas', `\`\`\`\n${text.toLowerCase().slice(0, 1500)}\n\`\`\``)] });
      return;
    }

    if (sub === 'contar') {
      const text = interaction.options.getString('texto', true);
      if (tooLong(text)) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      const chars = [...text].length;
      const trimmed = text.trim();
      const words = trimmed ? trimmed.split(/\s+/).length : 0;
      const lines = text.split('\n').length;
      await interaction.reply({ embeds: [Embeds.success('Conteo', `Caracteres: **${chars}**\nPalabras: **${words}**\nLíneas: **${lines}**`)] });
      return;
    }

    if (sub === 'uuid') {
      await interaction.reply({ embeds: [Embeds.success('UUID v4', `\`${randomUUID()}\``)] });
      return;
    }

    if (sub === 'marca-tiempo') {
      const raw = interaction.options.getString('fecha');
      let ms: number;
      if (raw === null || raw.trim() === '') {
        ms = Date.now();
      } else {
        const parsed = Date.parse(raw.trim());
        if (Number.isNaN(parsed)) {
          await interaction.reply({ embeds: [Embeds.error('Fecha inválida', 'Usa formato ISO, p. ej. `2026-01-15 12:00` o `2026-01-15T12:00:00Z`.')], ephemeral: true });
          return;
        }
        ms = parsed;
      }
      const unix = Math.floor(ms / 1000);
      await interaction.reply({
        embeds: [Embeds.success('Marca de tiempo', `Unix: \`${unix}\`\nCompleta: <t:${unix}:F>\nRelativa: <t:${unix}:R>\nFecha: <t:${unix}:D>`)],
      });
      return;
    }

    if (sub === 'texto-qr') {
      const text = interaction.options.getString('texto', true);
      if (tooLong(text)) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      if (!text.trim()) {
        await interaction.reply({ embeds: [Embeds.error('Texto vacío', 'Escribe algo para codificar.')], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          Embeds.success(
            'Texto listo para QR',
            `Copia este texto en cualquier generador QR (p. ej. tu app de cámara o qr-code-generator.com):\n\`\`\`\n${text.slice(0, 1500)}\n\`\`\`\n*Este bot no genera imágenes externas; el texto de arriba es el contenido exacto del QR.*`,
          ),
        ],
      });
      return;
    }

    if (sub === 'calcular') {
      const expr = interaction.options.getString('expresion', true);
      if (!/^[\d\s+\-*/().%^]+$/.test(expr)) {
        await interaction.reply({ embeds: [Embeds.error('Expresión inválida', 'Solo se permiten números y `+ - * / ( ) . % ^`.')], ephemeral: true });
        return;
      }
      try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${expr.replace(/\^/g, '**')})`)() as number;
        if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('NaN');
        await interaction.reply({ embeds: [Embeds.success('Cálculo', `\`${expr}\` = **${result}**`)] });
      } catch {
        await interaction.reply({ embeds: [Embeds.error('Error', 'No se pudo evaluar esa expresión.')], ephemeral: true });
      }
      return;
    }

    if (sub === 'elegir') {
      const raw = interaction.options.getString('opciones', true);
      if (tooLong(raw)) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      const opts = raw.split(',').map((o) => o.trim()).filter((o) => o.length > 0);
      if (opts.length < 2) {
        await interaction.reply({ embeds: [Embeds.error('Faltan opciones', 'Dame al menos 2 opciones separadas por comas.')], ephemeral: true });
        return;
      }
      const pick = opts[randomInt(opts.length)];
      await interaction.reply({ embeds: [Embeds.success('Elegido al azar', `Opciones: ${opts.map((o) => `\`${o.slice(0, 100)}\``).join(', ').slice(0, 1500)}\nElegida: **${(pick as string).slice(0, 500)}**`)] });
      return;
    }

    if (sub === 'mezclar-palabras') {
      const text = interaction.options.getString('texto', true);
      if (tooLong(text)) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
      if (words.length < 2) {
        await interaction.reply({ embeds: [Embeds.error('Muy corto', 'Escribe al menos 2 palabras.')], ephemeral: true });
        return;
      }
      for (let i = words.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [words[i], words[j]] = [words[j] as string, words[i] as string];
      }
      await interaction.reply({ embeds: [Embeds.success('Palabras mezcladas', `\`\`\`\n${words.join(' ').slice(0, 1500)}\n\`\`\``)] });
      return;
    }

    if (sub === 'palindromo') {
      const text = interaction.options.getString('texto', true);
      if (tooLong(text)) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', `Máximo ${MAX_LEN} caracteres.`)], ephemeral: true });
        return;
      }
      const norm = text.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!norm) {
        await interaction.reply({ embeds: [Embeds.error('Sin contenido', 'Escribe letras o números para comprobar.')], ephemeral: true });
        return;
      }
      const isPal = norm === [...norm].reverse().join('');
      if (isPal) {
        await interaction.reply({ embeds: [Embeds.success('Palíndromo', `\`${text.slice(0, 500)}\` **sí** es un palíndromo.`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('No es palíndromo', `\`${text.slice(0, 500)}\` **no** es un palíndromo.`)] });
      }
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
  },
};
