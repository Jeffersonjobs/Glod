/**
 * Toolbox: /utilidades <25 conversores y calculadoras puras, 100% locales>.
 * Cooldown 3. Todo validado (rangos, fechas con Date.parse).
 */
import { SlashCommandBuilder } from 'discord.js';
import { randomInt } from 'node:crypto';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

function fmt(n: number): string {
  if (!Number.isFinite(n)) return 'N/A';
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toFixed(4)).toString();
}

function money(n: number): string {
  return fmt(Math.round(n * 100) / 100);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  if (x === 0 && y === 0) return 1;
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}

function decimals(n: number): number {
  const s = n.toString();
  const i = s.indexOf('.');
  if (i === -1) return 0;
  return Math.min(4, s.length - i - 1);
}

function simplifyRatio(a: number, b: number): string {
  const scale = Math.pow(10, Math.max(decimals(a), decimals(b)));
  const ai = Math.round(a * scale);
  const bi = Math.round(b * scale);
  const g = gcd(ai, bi);
  return `${ai / g}:${bi / g}`;
}

const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function zodiacSign(month: number, day: number): string {
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Acuario';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Piscis';
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Tauro';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Géminis';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cáncer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Escorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagitario';
  return 'Capricornio';
}

function parseDate(raw: string): Date | null {
  const ms = Date.parse(raw.trim());
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

function calcAge(birth: Date, now: Date): { years: number; months: number; days: number } {
  let years = now.getUTCFullYear() - birth.getUTCFullYear();
  let months = now.getUTCMonth() - birth.getUTCMonth();
  let days = now.getUTCDate() - birth.getUTCDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    days += prevMonth.getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

const LOREM_BASE = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ' +
  'enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in ' +
  'reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui ' +
  'officia deserunt mollit anim id est laborum perspiciatis unde omnis iste natus error voluptatem accusantium doloremque laudantium ' +
  'totam rem aperiam eaque ipsa quae ab illo inventore veritatis quasi architecto beatae vitae dicta explicabo nemo enim ipsam voluptatem'
).split(' ');

function loremWords(n: number): string {
  const words: string[] = [];
  for (let i = 0; i < n; i++) words.push(LOREM_BASE[i % LOREM_BASE.length] as string);
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

export const toolbox: Command = {
  data: new SlashCommandBuilder()
    .setName('utilidades')
    .setDescription('Conversores y calculadoras locales')
    .addSubcommand((s) =>
      s
        .setName('imc')
        .setDescription('Calcula tu índice de masa corporal')
        .addNumberOption((o) => o.setName('peso').setDescription('Peso en kg').setRequired(true).setMinValue(1).setMaxValue(1000))
        .addNumberOption((o) => o.setName('altura').setDescription('Altura en cm').setRequired(true).setMinValue(20).setMaxValue(300)),
    )
    .addSubcommand((s) =>
      s
        .setName('propina')
        .setDescription('Calcula la propina y el total de la cuenta')
        .addNumberOption((o) => o.setName('total').setDescription('Total de la cuenta').setRequired(true).setMinValue(0))
        .addNumberOption((o) => o.setName('porcentaje').setDescription('Porcentaje de propina (defecto 10)').setMinValue(0).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s
        .setName('descuento')
        .setDescription('Aplica un descuento a un precio')
        .addNumberOption((o) => o.setName('precio').setDescription('Precio original').setRequired(true).setMinValue(0))
        .addNumberOption((o) => o.setName('porcentaje').setDescription('Descuento en %').setRequired(true).setMinValue(0).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s
        .setName('impuesto')
        .setDescription('Añade impuestos a un precio')
        .addNumberOption((o) => o.setName('precio').setDescription('Precio base').setRequired(true).setMinValue(0))
        .addNumberOption((o) => o.setName('tasa').setDescription('Impuesto en %').setRequired(true).setMinValue(0).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s
        .setName('prestamo')
        .setDescription('Calcula la cuota mensual de un préstamo')
        .addNumberOption((o) => o.setName('capital').setDescription('Capital del préstamo').setRequired(true).setMinValue(1))
        .addNumberOption((o) => o.setName('tasa').setDescription('Interés anual en %').setRequired(true).setMinValue(0).setMaxValue(100))
        .addNumberOption((o) => o.setName('anos').setDescription('Años del préstamo').setRequired(true).setMinValue(1).setMaxValue(50)),
    )
    .addSubcommand((s) =>
      s
        .setName('porcentaje')
        .setDescription('Calcula qué porcentaje es una parte del total')
        .addNumberOption((o) => o.setName('parte').setDescription('Parte').setRequired(true))
        .addNumberOption((o) => o.setName('total').setDescription('Total').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('razon')
        .setDescription('Simplifica una razón a:b')
        .addNumberOption((o) => o.setName('a').setDescription('Primer valor').setRequired(true))
        .addNumberOption((o) => o.setName('b').setDescription('Segundo valor').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('km-mi')
        .setDescription('Convierte kilómetros a millas')
        .addNumberOption((o) => o.setName('km').setDescription('Kilómetros').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('mi-km')
        .setDescription('Convierte millas a kilómetros')
        .addNumberOption((o) => o.setName('mi').setDescription('Millas').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('kg-lb')
        .setDescription('Convierte kilos a libras')
        .addNumberOption((o) => o.setName('kg').setDescription('Kilos').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('lb-kg')
        .setDescription('Convierte libras a kilos')
        .addNumberOption((o) => o.setName('lb').setDescription('Libras').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('c-f')
        .setDescription('Convierte Celsius a Fahrenheit')
        .addNumberOption((o) => o.setName('celsius').setDescription('Grados Celsius').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('f-c')
        .setDescription('Convierte Fahrenheit a Celsius')
        .addNumberOption((o) => o.setName('fahrenheit').setDescription('Grados Fahrenheit').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('l-gal')
        .setDescription('Convierte litros a galones')
        .addNumberOption((o) => o.setName('litros').setDescription('Litros').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('ml-oz')
        .setDescription('Convierte mililitros a onzas fluidas')
        .addNumberOption((o) => o.setName('ml').setDescription('Mililitros').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('m-ft')
        .setDescription('Convierte metros a pies')
        .addNumberOption((o) => o.setName('metros').setDescription('Metros').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('ft-m')
        .setDescription('Convierte pies a metros')
        .addNumberOption((o) => o.setName('pies').setDescription('Pies').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('edad')
        .setDescription('Calcula la edad desde la fecha de nacimiento')
        .addStringOption((o) => o.setName('nacimiento').setDescription('Nacimiento con formato AAAA-MM-DD').setRequired(true).setMaxLength(30)),
    )
    .addSubcommand((s) =>
      s
        .setName('zodiaco')
        .setDescription('Muestra el signo zodiacal por nacimiento')
        .addStringOption((o) => o.setName('nacimiento').setDescription('Nacimiento con formato AAAA-MM-DD').setRequired(true).setMaxLength(30)),
    )
    .addSubcommand((s) =>
      s
        .setName('dia-semana')
        .setDescription('Muestra el día de la semana de una fecha')
        .addStringOption((o) => o.setName('fecha').setDescription('Fecha con formato AAAA-MM-DD').setRequired(true).setMaxLength(30)),
    )
    .addSubcommand((s) =>
      s
        .setName('dias-hasta')
        .setDescription('Calcula los días hasta una fecha futura')
        .addStringOption((o) => o.setName('fecha').setDescription('Fecha con formato AAAA-MM-DD').setRequired(true).setMaxLength(30)),
    )
    .addSubcommand((s) =>
      s
        .setName('dias-entre')
        .setDescription('Calcula los días entre dos fechas')
        .addStringOption((o) => o.setName('desde').setDescription('Fecha inicial AAAA-MM-DD').setRequired(true).setMaxLength(30))
        .addStringOption((o) => o.setName('hasta').setDescription('Fecha final AAAA-MM-DD').setRequired(true).setMaxLength(30)),
    )
    .addSubcommand((s) =>
      s
        .setName('tiempo-lectura')
        .setDescription('Estima los minutos de lectura a 200 ppm')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a estimar').setRequired(true).setMaxLength(2000)),
    )
    .addSubcommand((s) =>
      s
        .setName('lorem')
        .setDescription('Genera texto lorem local')
        .addIntegerOption((o) => o.setName('palabras').setDescription('Palabras entre 5 y 200').setRequired(true).setMinValue(5).setMaxValue(200)),
    )
    .addSubcommand((s) =>
      s
        .setName('contrasena')
        .setDescription('Genera una contraseña segura')
        .addIntegerOption((o) => o.setName('longitud').setDescription('Longitud entre 8 y 64').setMinValue(8).setMaxValue(64))
        .addBooleanOption((o) => o.setName('simbolos').setDescription('Incluir símbolos')),
    ),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'imc') {
      const peso = interaction.options.getNumber('peso', true);
      const altura = interaction.options.getNumber('altura', true);
      if (!Number.isFinite(peso) || peso < 1 || peso > 1000) {
        await interaction.reply({ embeds: [Embeds.error('Peso inválido', 'Usa un peso entre 1 y 1000 kg.')], ephemeral: true });
        return;
      }
      if (!Number.isFinite(altura) || altura < 20 || altura > 300) {
        await interaction.reply({ embeds: [Embeds.error('Altura inválida', 'Usa una altura entre 20 y 300 cm.')], ephemeral: true });
        return;
      }
      const m = altura / 100;
      const bmi = peso / (m * m);
      const cat = bmi < 18.5 ? 'Bajo peso' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Sobrepeso' : 'Obesidad';
      await interaction.reply({ embeds: [Embeds.success('IMC', `Peso: **${fmt(peso)} kg**\nAltura: **${fmt(altura)} cm**\nIMC: **${fmt(bmi)}** (${cat})`)] });
      return;
    }

    if (sub === 'propina') {
      const total = interaction.options.getNumber('total', true);
      const percent = interaction.options.getNumber('porcentaje') ?? 10;
      if (!Number.isFinite(total) || total < 0 || total > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Total inválido', 'Usa un total entre 0 y 1e12.')], ephemeral: true });
        return;
      }
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        await interaction.reply({ embeds: [Embeds.error('Porcentaje inválido', 'Usa un valor entre 0 y 100.')], ephemeral: true });
        return;
      }
      const tip = (total * percent) / 100;
      await interaction.reply({ embeds: [Embeds.success('Propina', `Cuenta: **${money(total)}**\nPropina (${fmt(percent)}%): **${money(tip)}**\nTotal: **${money(total + tip)}**`)] });
      return;
    }

    if (sub === 'descuento') {
      const price = interaction.options.getNumber('precio', true);
      const percent = interaction.options.getNumber('porcentaje', true);
      if (!Number.isFinite(price) || price < 0 || price > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Precio inválido', 'Usa un precio entre 0 y 1e12.')], ephemeral: true });
        return;
      }
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        await interaction.reply({ embeds: [Embeds.error('Porcentaje inválido', 'Usa un valor entre 0 y 100.')], ephemeral: true });
        return;
      }
      const final = price * (1 - percent / 100);
      await interaction.reply({ embeds: [Embeds.success('Descuento', `Original: **${money(price)}**\nDescuento: **${fmt(percent)}%**\nFinal: **${money(final)}** (ahorras **${money(price - final)}**) `)] });
      return;
    }

    if (sub === 'impuesto') {
      const price = interaction.options.getNumber('precio', true);
      const rate = interaction.options.getNumber('tasa', true);
      if (!Number.isFinite(price) || price < 0 || price > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Precio inválido', 'Usa un precio entre 0 y 1e12.')], ephemeral: true });
        return;
      }
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        await interaction.reply({ embeds: [Embeds.error('Tasa inválida', 'Usa un valor entre 0 y 100.')], ephemeral: true });
        return;
      }
      const total = price * (1 + rate / 100);
      await interaction.reply({ embeds: [Embeds.success('Impuesto', `Base: **${money(price)}**\nImpuesto: **${fmt(rate)}%**\nTotal: **${money(total)}**`)] });
      return;
    }

    if (sub === 'prestamo') {
      const principal = interaction.options.getNumber('capital', true);
      const rate = interaction.options.getNumber('tasa', true);
      const years = interaction.options.getNumber('anos', true);
      if (!Number.isFinite(principal) || principal <= 0 || principal > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Capital inválido', 'Usa un capital entre 1 y 1e12.')], ephemeral: true });
        return;
      }
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        await interaction.reply({ embeds: [Embeds.error('Tasa inválida', 'Usa un valor entre 0 y 100.')], ephemeral: true });
        return;
      }
      if (!Number.isFinite(years) || years < 1 || years > 50) {
        await interaction.reply({ embeds: [Embeds.error('Plazo inválido', 'Usa un valor entre 1 y 50 años.')], ephemeral: true });
        return;
      }
      const n = Math.round(years * 12);
      const r = rate / 100 / 12;
      const fee = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
      const totalPaid = fee * n;
      await interaction.reply({
        embeds: [Embeds.success('Préstamo', `Capital: **${money(principal)}**\nTasa anual: **${fmt(rate)}%**\nPlazo: **${fmt(years)} años (${n} cuotas)**\nCuota mensual: **${money(fee)}**\nTotal pagado: **${money(totalPaid)}**`)],
      });
      return;
    }

    if (sub === 'porcentaje') {
      const part = interaction.options.getNumber('parte', true);
      const total = interaction.options.getNumber('total', true);
      if (!Number.isFinite(part) || !Number.isFinite(total)) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa números finitos.')], ephemeral: true });
        return;
      }
      if (total === 0) {
        await interaction.reply({ embeds: [Embeds.error('Total cero', 'El total no puede ser 0.')], ephemeral: true });
        return;
      }
      const pct = (part / total) * 100;
      await interaction.reply({ embeds: [Embeds.success('Porcentaje', `\`${fmt(part)}\` es el **${fmt(pct)}%** de \`${fmt(total)}\``)] });
      return;
    }

    if (sub === 'razon') {
      const a = interaction.options.getNumber('a', true);
      const b = interaction.options.getNumber('b', true);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa números finitos.')], ephemeral: true });
        return;
      }
      if (a === 0 && b === 0) {
        await interaction.reply({ embeds: [Embeds.error('Razón inválida', 'Al menos un valor debe ser distinto de 0.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.success('Razón', `\`${fmt(a)}:${fmt(b)}\` simplificada: **${simplifyRatio(a, b)}**`)] });
      return;
    }

    if (sub === 'km-mi') {
      const km = interaction.options.getNumber('km', true);
      if (!Number.isFinite(km) || Math.abs(km) > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un valor finito menor a 1e12.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`Kilómetros a millas`, `\`${fmt(km)} km\` = **${fmt(km * 0.621371)} mi**`)] });
      return;
    }

    if (sub === 'mi-km') {
      const mi = interaction.options.getNumber('mi', true);
      if (!Number.isFinite(mi) || Math.abs(mi) > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un valor finito menor a 1e12.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`Millas a kilómetros`, `\`${fmt(mi)} mi\` = **${fmt(mi * 1.60934)} km**`)] });
      return;
    }

    if (sub === 'kg-lb') {
      const kg = interaction.options.getNumber('kg', true);
      if (!Number.isFinite(kg) || Math.abs(kg) > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un valor finito menor a 1e12.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`Kilos a libras`, `\`${fmt(kg)} kg\` = **${fmt(kg * 2.20462)} lb**`)] });
      return;
    }

    if (sub === 'lb-kg') {
      const lb = interaction.options.getNumber('lb', true);
      if (!Number.isFinite(lb) || Math.abs(lb) > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un valor finito menor a 1e12.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`Libras a kilos`, `\`${fmt(lb)} lb\` = **${fmt(lb * 0.453592)} kg**`)] });
      return;
    }

    if (sub === 'c-f') {
      const c = interaction.options.getNumber('celsius', true);
      if (!Number.isFinite(c) || Math.abs(c) > 1e6) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un valor razonable.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`Celsius a Fahrenheit`, `\`${fmt(c)} °C\` = **${fmt((c * 9) / 5 + 32)} °F**`)] });
      return;
    }

    if (sub === 'f-c') {
      const f = interaction.options.getNumber('fahrenheit', true);
      if (!Number.isFinite(f) || Math.abs(f) > 1e6) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un valor razonable.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`Fahrenheit a Celsius`, `\`${fmt(f)} °F\` = **${fmt(((f - 32) * 5) / 9)} °C**`)] });
      return;
    }

    if (sub === 'l-gal') {
      const l = interaction.options.getNumber('litros', true);
      if (!Number.isFinite(l) || Math.abs(l) > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un valor finito menor a 1e12.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`Litros a galones`, `\`${fmt(l)} L\` = **${fmt(l * 0.264172)} gal**`)] });
      return;
    }

    if (sub === 'ml-oz') {
      const ml = interaction.options.getNumber('ml', true);
      if (!Number.isFinite(ml) || Math.abs(ml) > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un valor finito menor a 1e12.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`Mililitros a onzas`, `\`${fmt(ml)} ml\` = **${fmt(ml / 29.5735)} oz**`)] });
      return;
    }

    if (sub === 'm-ft') {
      const m = interaction.options.getNumber('metros', true);
      if (!Number.isFinite(m) || Math.abs(m) > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un valor finito menor a 1e12.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`Metros a pies`, `\`${fmt(m)} m\` = **${fmt(m * 3.28084)} ft**`)] });
      return;
    }

    if (sub === 'ft-m') {
      const ft = interaction.options.getNumber('pies', true);
      if (!Number.isFinite(ft) || Math.abs(ft) > 1e12) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Usa un valor finito menor a 1e12.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`Pies a metros`, `\`${fmt(ft)} ft\` = **${fmt(ft * 0.3048)} m**`)] });
      return;
    }

    if (sub === 'edad') {
      const raw = interaction.options.getString('nacimiento', true);
      const birth = parseDate(raw);
      if (!birth) {
        await interaction.reply({ embeds: [Embeds.error('Fecha inválida', 'Usa el formato `AAAA-MM-DD`, p. ej. `1990-05-21`.')], ephemeral: true });
        return;
      }
      const now = new Date();
      if (birth.getTime() > now.getTime()) {
        await interaction.reply({ embeds: [Embeds.error('Fecha futura', 'El nacimiento no puede estar en el futuro.')], ephemeral: true });
        return;
      }
      const { years, months, days } = calcAge(birth, now);
      await interaction.reply({ embeds: [Embeds.success('Edad', `Nacimiento: \`${raw.trim()}\`\nEdad: **${years} años, ${months} meses, ${days} días**`)] });
      return;
    }

    if (sub === 'zodiaco') {
      const raw = interaction.options.getString('nacimiento', true);
      const birth = parseDate(raw);
      if (!birth) {
        await interaction.reply({ embeds: [Embeds.error('Fecha inválida', 'Usa el formato `AAAA-MM-DD`, p. ej. `1990-05-21`.')], ephemeral: true });
        return;
      }
      const month = birth.getUTCMonth() + 1;
      const day = birth.getUTCDate();
      await interaction.reply({ embeds: [Embeds.success('Zodiaco', `Nacimiento: \`${raw.trim()}\`\nSigno: **${zodiacSign(month, day)}**`)] });
      return;
    }

    if (sub === 'dia-semana') {
      const raw = interaction.options.getString('fecha', true);
      const d = parseDate(raw);
      if (!d) {
        await interaction.reply({ embeds: [Embeds.error('Fecha inválida', 'Usa el formato `AAAA-MM-DD`, p. ej. `2026-09-27`.')], ephemeral: true });
        return;
      }
      const name = DIAS_ES[d.getUTCDay()] as string;
      await interaction.reply({ embeds: [Embeds.success('Día de la semana', `\`${raw.trim()}\` fue/cae en **${name}**.`)] });
      return;
    }

    if (sub === 'dias-hasta') {
      const raw = interaction.options.getString('fecha', true);
      const target = parseDate(raw);
      if (!target) {
        await interaction.reply({ embeds: [Embeds.error('Fecha inválida', 'Usa el formato `AAAA-MM-DD`, p. ej. `2026-12-25`.')], ephemeral: true });
        return;
      }
      const now = new Date();
      const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const targetUtc = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
      const diff = Math.round((targetUtc - todayUtc) / 86400000);
      if (diff < 0) {
        await interaction.reply({ embeds: [Embeds.success('Días', `\`${raw.trim()}\` fue hace **${Math.abs(diff)} días**.`)] });
      } else if (diff === 0) {
        await interaction.reply({ embeds: [Embeds.success('Días', `\`${raw.trim()}\` es **hoy**.`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.success('Días', `Faltan **${diff} días** para \`${raw.trim()}\`.`)] });
      }
      return;
    }

    if (sub === 'dias-entre') {
      const fromRaw = interaction.options.getString('desde', true);
      const toRaw = interaction.options.getString('hasta', true);
      const from = parseDate(fromRaw);
      const to = parseDate(toRaw);
      if (!from || !to) {
        await interaction.reply({ embeds: [Embeds.error('Fecha inválida', 'Usa el formato `AAAA-MM-DD` en ambas fechas.')], ephemeral: true });
        return;
      }
      const diff = Math.round(Math.abs(to.getTime() - from.getTime()) / 86400000);
      await interaction.reply({ embeds: [Embeds.success('Días entre fechas', `Entre \`${fromRaw.trim()}\` y \`${toRaw.trim()}\` hay **${diff} días**.`)] });
      return;
    }

    if (sub === 'tiempo-lectura') {
      const text = interaction.options.getString('texto', true);
      if (!text.trim()) {
        await interaction.reply({ embeds: [Embeds.error('Texto vacío', 'Escribe algo para estimar.')], ephemeral: true });
        return;
      }
      if (text.length > 2000) {
        await interaction.reply({ embeds: [Embeds.error('Muy largo', 'Máximo 2000 caracteres.')], ephemeral: true });
        return;
      }
      const words = text.trim().split(/\s+/).length;
      const minutes = words / 200;
      const shown = minutes < 1 ? '< 1' : fmt(Math.ceil(minutes * 10) / 10);
      await interaction.reply({ embeds: [Embeds.success('Tiempo de lectura', `Palabras: **${words}**\nRitmo: **200 ppm**\nTiempo: **${shown} min**`)] });
      return;
    }

    if (sub === 'lorem') {
      const words = interaction.options.getInteger('palabras', true);
      if (!Number.isInteger(words) || words < 5 || words > 200) {
        await interaction.reply({ embeds: [Embeds.error('Cantidad inválida', 'Usa un valor entre 5 y 200 palabras.')], ephemeral: true });
        return;
      }
      const out = loremWords(words);
      await interaction.reply({ embeds: [Embeds.success(`Lorem (${words} palabras)`, out.slice(0, 1500))] });
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

    await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
  },
};
