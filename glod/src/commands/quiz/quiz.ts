/**
 * Quiz: /quiz <25 retos de una sola interacción: el bot genera el reto y corrige al instante>.
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function rint(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Normaliza para comparar respuestas: trim, minúsculas, sin tildes, espacios colapsados. */
function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

interface CapitalEntry {
  readonly country: string;
  readonly capital: string;
  readonly aliases: readonly string[];
}

const CAPITALS: readonly CapitalEntry[] = [
  { country: 'Francia', capital: 'París', aliases: [] },
  { country: 'España', capital: 'Madrid', aliases: [] },
  { country: 'Italia', capital: 'Roma', aliases: [] },
  { country: 'Alemania', capital: 'Berlín', aliases: [] },
  { country: 'Portugal', capital: 'Lisboa', aliases: [] },
  { country: 'Reino Unido', capital: 'Londres', aliases: ['gran bretana'] },
  { country: 'Japón', capital: 'Tokio', aliases: [] },
  { country: 'China', capital: 'Pekín', aliases: ['beijing'] },
  { country: 'Brasil', capital: 'Brasilia', aliases: [] },
  { country: 'Argentina', capital: 'Buenos Aires', aliases: [] },
  { country: 'México', capital: 'Ciudad de México', aliases: ['mexico', 'cdmx', 'df'] },
  { country: 'Canadá', capital: 'Ottawa', aliases: [] },
  { country: 'Australia', capital: 'Canberra', aliases: [] },
  { country: 'Egipto', capital: 'El Cairo', aliases: ['cairo'] },
  { country: 'Noruega', capital: 'Oslo', aliases: [] },
];

interface FlagEntry {
  readonly emoji: string;
  readonly country: string;
  readonly aliases: readonly string[];
}

const FLAGS: readonly FlagEntry[] = [
  { emoji: '🇪🇸', country: 'España', aliases: [] },
  { emoji: '🇲🇽', country: 'México', aliases: [] },
  { emoji: '🇦🇷', country: 'Argentina', aliases: [] },
  { emoji: '🇫🇷', country: 'Francia', aliases: [] },
  { emoji: '🇮🇹', country: 'Italia', aliases: [] },
  { emoji: '🇩🇪', country: 'Alemania', aliases: [] },
  { emoji: '🇯🇵', country: 'Japón', aliases: ['japon'] },
  { emoji: '🇧🇷', country: 'Brasil', aliases: [] },
  { emoji: '🇨🇦', country: 'Canadá', aliases: [] },
  { emoji: '🇺🇸', country: 'Estados Unidos', aliases: ['usa', 'eeuu', 'america'] },
  { emoji: '🇬🇧', country: 'Reino Unido', aliases: ['gran bretana', 'inglaterra'] },
  { emoji: '🇵🇹', country: 'Portugal', aliases: [] },
];

const ELEMENTS: readonly (readonly [string, string])[] = [
  ['Hidrógeno', 'H'],
  ['Helio', 'He'],
  ['Litio', 'Li'],
  ['Carbono', 'C'],
  ['Oxígeno', 'O'],
  ['Sodio', 'Na'],
  ['Magnesio', 'Mg'],
  ['Aluminio', 'Al'],
  ['Hierro', 'Fe'],
  ['Cobre', 'Cu'],
  ['Plata', 'Ag'],
  ['Oro', 'Au'],
];

interface PlanetEntry {
  readonly hint: string;
  readonly answer: string;
}

const PLANETS: readonly PlanetEntry[] = [
  { hint: 'Soy el planeta rojo. ¿Quién soy?', answer: 'Marte' },
  { hint: 'Soy el planeta más grande del sistema solar. ¿Quién soy?', answer: 'Júpiter' },
  { hint: 'Tengo los anillos más famosos del sistema solar. ¿Quién soy?', answer: 'Saturno' },
  { hint: 'Soy el planeta más cercano al Sol. ¿Quién soy?', answer: 'Mercurio' },
  { hint: 'Soy el planeta más caliente del sistema solar. ¿Quién soy?', answer: 'Venus' },
  { hint: 'Soy el tercer planeta desde el Sol y el único con vida conocida. ¿Quién soy?', answer: 'Tierra' },
  { hint: 'Estoy inclinado de lado y soy un gigante de hielo. ¿Quién soy?', answer: 'Urano' },
  { hint: 'Soy el planeta más lejano al Sol. ¿Quién soy?', answer: 'Neptuno' },
];

interface HistoryEntry {
  readonly event: string;
  readonly year: number;
}

const HISTORY: readonly HistoryEntry[] = [
  { event: 'La llegada del ser humano a la Luna', year: 1969 },
  { event: 'La caída del Muro de Berlín', year: 1989 },
  { event: 'La llegada de Colón a América', year: 1492 },
  { event: 'El inicio de la Revolución Francesa (toma de la Bastilla)', year: 1789 },
  { event: 'El inicio de la Primera Guerra Mundial', year: 1914 },
  { event: 'El fin de la Segunda Guerra Mundial', year: 1945 },
  { event: 'Los primeros Juegos Olímpicos modernos (Atenas)', year: 1896 },
  { event: 'La caída del Imperio romano de Occidente', year: 476 },
  { event: 'El Grito de Dolores (independencia de México)', year: 1810 },
  { event: 'La Constitución española vigente', year: 1978 },
];

interface SynonymEntry {
  readonly word: string;
  readonly accept: readonly [string, string];
}

const SYNONYMS: readonly SynonymEntry[] = [
  { word: 'feliz', accept: ['alegre', 'contento'] },
  { word: 'rápido', accept: ['veloz', 'raudo'] },
  { word: 'bonito', accept: ['hermoso', 'lindo'] },
  { word: 'grande', accept: ['enorme', 'vasto'] },
  { word: 'pequeño', accept: ['diminuto', 'chico'] },
  { word: 'inteligente', accept: ['listo', 'sabio'] },
  { word: 'fuerte', accept: ['robusto', 'fornido'] },
  { word: 'oscuro', accept: ['tenebroso', 'sombrío'] },
];

const ANTONYMS: readonly (readonly [string, string])[] = [
  ['feliz', 'triste'],
  ['grande', 'pequeño'],
  ['alto', 'bajo'],
  ['rápido', 'lento'],
  ['bueno', 'malo'],
  ['nuevo', 'viejo'],
  ['claro', 'oscuro'],
  ['fuerte', 'débil'],
];

interface SpellingEntry {
  readonly ok: string;
  readonly bad: string;
}

const SPELLING: readonly SpellingEntry[] = [
  { ok: 'biblioteca', bad: 'bibloteca' },
  { ok: 'murciélago', bad: 'murciegalo' },
  { ok: 'excepción', bad: 'excepsión' },
  { ok: 'zanahoria', bad: 'zanaoria' },
  { ok: 'helicóptero', bad: 'elicoptero' },
  { ok: 'psicología', bad: 'sicologia' },
  { ok: 'hamburguesa', bad: 'hamburgesa' },
  { ok: 'cocodrilo', bad: 'cocrodilo' },
];

interface OddOneEntry {
  readonly words: readonly [string, string, string, string];
  readonly odd: number;
  readonly reason: string;
}

const ODD_ONE: readonly OddOneEntry[] = [
  { words: ['manzana', 'pera', 'plátano', 'coche'], odd: 4, reason: 'el único que no es una fruta' },
  { words: ['perro', 'gato', 'loro', 'silla'], odd: 4, reason: 'el único que no es un animal' },
  { words: ['lunes', 'martes', 'zapato', 'jueves'], odd: 3, reason: 'el único que no es un día de la semana' },
  { words: ['rojo', 'azul', 'verde', 'correr'], odd: 4, reason: 'el único que no es un color' },
  { words: ['do', 're', 'mi', 'mesa'], odd: 4, reason: 'la única que no es una nota musical' },
  { words: ['triángulo', 'cuadrado', 'círculo', 'manzana'], odd: 4, reason: 'la única que no es una figura geométrica' },
  { words: ['primavera', 'verano', 'invierno', 'lunes'], odd: 4, reason: 'el único que no es una estación del año' },
  { words: ['cuchara', 'tenedor', 'cuchillo', 'martillo'], odd: 4, reason: 'el único que no es un cubierto' },
];

interface SequenceResult {
  readonly series: readonly number[];
  readonly next: number;
}

interface SequencePattern {
  readonly name: string;
  gen(): SequenceResult;
}

const SEQUENCES: readonly SequencePattern[] = [
  {
    name: 'suma',
    gen: () => {
      const s = rint(1, 20);
      const st = rint(2, 9);
      return { series: [s, s + st, s + 2 * st, s + 3 * st], next: s + 4 * st };
    },
  },
  {
    name: 'resta',
    gen: () => {
      const s = rint(30, 60);
      const st = rint(2, 9);
      return { series: [s, s - st, s - 2 * st, s - 3 * st], next: s - 4 * st };
    },
  },
  {
    name: 'doble',
    gen: () => {
      const s = rint(1, 5);
      return { series: [s, 2 * s, 4 * s, 8 * s], next: 16 * s };
    },
  },
  {
    name: 'triple',
    gen: () => {
      const s = rint(1, 3);
      return { series: [s, 3 * s, 9 * s, 27 * s], next: 81 * s };
    },
  },
  {
    name: 'saltos de 10',
    gen: () => {
      const s = rint(1, 9);
      return { series: [s, s + 10, s + 20, s + 30], next: s + 40 };
    },
  },
  {
    name: 'cuadrados',
    gen: () => {
      const n = rint(2, 6);
      return {
        series: [n * n, (n + 1) * (n + 1), (n + 2) * (n + 2), (n + 3) * (n + 3)],
        next: (n + 4) * (n + 4),
      };
    },
  },
  {
    name: 'fibonacci',
    gen: () => {
      const a = rint(1, 9);
      const b = rint(1, 9);
      return { series: [a, b, a + b, a + 2 * b], next: 2 * a + 3 * b };
    },
  },
  {
    name: 'alterna +3/+5',
    gen: () => {
      const s = rint(1, 15);
      return { series: [s, s + 3, s + 8, s + 11], next: s + 16 };
    },
  },
];

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};

const MORSE_WORDS: readonly string[] = ['SOS', 'SOL', 'PAN', 'MAR', 'LUZ', 'OSO', 'RIO', 'ALA'];

const MORSE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toMorse(word: string): string {
  return word
    .split('')
    .map((ch) => MORSE[ch] ?? '?')
    .join(' ');
}

const ANAGRAMS: readonly string[] = [
  'planeta', 'guitarra', 'montaña', 'biblioteca', 'dragón', 'castillo',
  'estrella', 'volcán', 'tortuga', 'espejo', 'murciélago', 'ordenador',
];

function scramble(word: string): string {
  let out = word;
  for (let t = 0; t < 20 && out === word; t++) {
    const arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = arr[i] as string;
      arr[i] = arr[j] as string;
      arr[j] = a;
    }
    out = arr.join('');
  }
  return out;
}

interface RiddleEntry {
  readonly question: string;
  readonly accept: readonly [string, string];
}

const RIDDLES: readonly RiddleEntry[] = [
  { question: 'Tengo agujas pero no sé coser y marco las horas sin tener reloj. ¿Qué soy?', accept: ['reloj', 'despertador'] },
  { question: 'Verde fue mi nacimiento, roja mi madurez y negra mi vejez. ¿Qué soy?', accept: ['mora', 'zarzamora'] },
  { question: '¿Qué cosa es que cuanto más le quitas, más grande es?', accept: ['agujero', 'hoyo'] },
  { question: 'Vuelo sin alas y lloro sin ojos. ¿Qué soy?', accept: ['nube', 'nubes'] },
  { question: 'Tengo teclas pero no abro puertas. ¿Qué soy?', accept: ['piano', 'teclado'] },
  { question: '¿Qué sube pero nunca baja?', accept: ['edad', 'anos'] },
  { question: 'Tengo cara y cruz pero no tengo cuerpo. ¿Qué soy?', accept: ['moneda', 'monedas'] },
  { question: '¿Qué se rompe en cuanto dices su nombre?', accept: ['silencio', 'el silencio'] },
  { question: 'Duermo de día colgado boca abajo y de noche vuelo sin plumas. ¿Qué soy?', accept: ['murcielago', 'vampiro'] },
  { question: 'Oro parece, plata no es. ¿Qué es?', accept: ['platano', 'banana'] },
];

interface ScienceEntry {
  readonly statement: string;
  readonly truth: boolean;
}

const SCIENCE: readonly ScienceEntry[] = [
  { statement: 'El agua hierve a 100 °C a nivel del mar.', truth: true },
  { statement: 'Los humanos solo usan el 10 % del cerebro.', truth: false },
  { statement: 'La fotosíntesis libera oxígeno.', truth: true },
  { statement: 'El Sol gira alrededor de la Tierra.', truth: false },
  { statement: 'Los pulpos tienen tres corazones.', truth: true },
  { statement: 'El sonido viaja más rápido que la luz.', truth: false },
  { statement: 'El ADN tiene forma de doble hélice.', truth: true },
  { statement: 'Venus es el planeta más cercano al Sol.', truth: false },
  { statement: 'La miel natural nunca caduca.', truth: true },
  { statement: 'Un rayo es más caliente que la superficie del Sol.', truth: true },
];

interface AnimalEntry {
  readonly emojis: string;
  readonly answer: string;
  readonly aliases: readonly string[];
}

const ANIMALS: readonly AnimalEntry[] = [
  { emojis: '🦁 👑 🌍', answer: 'león', aliases: [] },
  { emojis: '🐼 🎋 🇨🇳', answer: 'panda', aliases: ['oso panda'] },
  { emojis: '🦘 🇦🇺 🥊', answer: 'canguro', aliases: [] },
  { emojis: '🐧 🧊 🐟', answer: 'pingüino', aliases: ['pinguino'] },
  { emojis: '🦒 🌿 📏', answer: 'jirafa', aliases: [] },
  { emojis: '🐘 👂 💧', answer: 'elefante', aliases: [] },
  { emojis: '🐸 💚 🪷', answer: 'rana', aliases: [] },
  { emojis: '🦉 🌙 👁️', answer: 'búho', aliases: ['buho'] },
  { emojis: '🐬 🌊 🤽', answer: 'delfín', aliases: ['delfin'] },
  { emojis: '🦊 🔥 🍂', answer: 'zorro', aliases: [] },
];

interface MusicEntry {
  readonly question: string;
  readonly accept: readonly string[];
}

const MUSIC: readonly MusicEntry[] = [
  { question: '¿Cuántas líneas tiene un pentagrama?', accept: ['5', 'cinco'] },
  { question: '¿Qué nota sigue a DO en la escala mayor ascendente?', accept: ['re'] },
  { question: '¿Cuántos tiempos dura una redonda en un compás de 4/4?', accept: ['4', 'cuatro'] },
  { question: '¿Qué clave se usa normalmente para el violín?', accept: ['sol', 'clave de sol'] },
  { question: '¿Qué figura dura la mitad que una blanca?', accept: ['negra'] },
  { question: '¿Cuántas cuerdas tiene una guitarra clásica?', accept: ['6', 'seis'] },
  { question: 'En música, ¿qué significa el matiz "piano"?', accept: ['suave', 'flojo'] },
  { question: '¿Cuántos sostenidos tiene la escala de SOL mayor?', accept: ['1', 'uno'] },
];

interface SportEntry {
  readonly question: string;
  readonly accept: readonly string[];
}

const SPORTS: readonly SportEntry[] = [
  { question: 'Se juega con los pies, 11 contra 11 y el gol decide. ¿Qué deporte es?', accept: ['futbol', 'soccer'] },
  { question: 'Canasta alta, 5 contra 5. ¿Qué deporte es?', accept: ['baloncesto', 'basketball', 'basket'] },
  { question: 'Raqueta, red y sets en Wimbledon. ¿Qué deporte es?', accept: ['tenis'] },
  { question: 'Ippon, tatami y judogi. ¿Qué arte marcial es?', accept: ['judo'] },
  { question: 'Casco, touchdowns y campo de 100 yardas. ¿Qué deporte es?', accept: ['futbol americano', 'nfl'] },
  { question: 'Piscina, gorro y marcas por tiempo. ¿Qué deporte es?', accept: ['natacion', 'nado'] },
  { question: 'Guantes, ring y asaltos de 3 minutos. ¿Qué deporte es?', accept: ['boxeo', 'box'] },
  { question: 'Bate, 9 entradas y jonrones. ¿Qué deporte es?', accept: ['beisbol', 'baseball'] },
];

interface CurrencyEntry {
  readonly country: string;
  readonly currency: string;
  readonly aliases: readonly string[];
}

const CURRENCIES: readonly CurrencyEntry[] = [
  { country: 'Japón', currency: 'yen', aliases: [] },
  { country: 'Estados Unidos', currency: 'dólar', aliases: ['dolar americano'] },
  { country: 'Reino Unido', currency: 'libra', aliases: ['libra esterlina'] },
  { country: 'México', currency: 'peso', aliases: ['peso mexicano'] },
  { country: 'Brasil', currency: 'real', aliases: [] },
  { country: 'Suiza', currency: 'franco', aliases: ['franco suizo'] },
  { country: 'China', currency: 'yuan', aliases: ['renminbi'] },
  { country: 'India', currency: 'rupia', aliases: [] },
  { country: 'Noruega', currency: 'corona', aliases: ['corona noruega'] },
  { country: 'Sudáfrica', currency: 'rand', aliases: [] },
];

const TRANSLATIONS: readonly (readonly [string, string])[] = [
  ['cat', 'gato'],
  ['dog', 'perro'],
  ['house', 'casa'],
  ['water', 'agua'],
  ['love', 'amor'],
  ['sun', 'sol'],
  ['moon', 'luna'],
  ['friend', 'amigo'],
  ['music', 'música'],
  ['book', 'libro'],
];

export const quiz: Command = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('25 retos de una sola interacción con corrección al instante')
    .addSubcommand((s) =>
      s.setName('suma').setDescription('Suma dos números').addIntegerOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('resta').setDescription('Resta dos números').addIntegerOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('multiplicacion').setDescription('Multiplica dos números').addIntegerOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('division').setDescription('División exacta').addIntegerOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('capitales').setDescription('Adivina la capital del país').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(100)),
    )
    .addSubcommand((s) =>
      s.setName('banderas').setDescription('Adivina el país por su bandera').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(100)),
    )
    .addSubcommand((s) =>
      s.setName('elementos').setDescription('Adivina el símbolo químico').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(10)),
    )
    .addSubcommand((s) =>
      s.setName('planetas').setDescription('Adivina el planeta por la pista').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s.setName('historia').setDescription('Adivina el año del evento histórico').addIntegerOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('sinonimo').setDescription('Escribe un sinónimo').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s.setName('antonimo').setDescription('Escribe el antónimo').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s.setName('ortografia').setDescription('¿La palabra mostrada está bien escrita?').addBooleanOption((o) => o.setName('correcta').setDescription('¿Crees que está bien escrita?').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('intruso').setDescription('Encuentra el intruso (1-4)').addIntegerOption((o) => o.setName('respuesta').setDescription('Número del intruso (1-4)').setRequired(true).setMinValue(1).setMaxValue(4)),
    )
    .addSubcommand((s) =>
      s.setName('secuencia').setDescription('Completa la serie numérica').addIntegerOption((o) => o.setName('respuesta').setDescription('Siguiente número').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('binario').setDescription('Convierte el binario a decimal').addIntegerOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('hexadecimal').setDescription('Convierte el hexadecimal a decimal').addIntegerOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('morse').setDescription('Decodifica el mensaje en morse').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(20)),
    )
    .addSubcommand((s) =>
      s.setName('anagrama').setDescription('Ordena las letras revueltas').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(30)),
    )
    .addSubcommand((s) =>
      s.setName('adivinanza').setDescription('Resuelve la adivinanza').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s.setName('ciencia').setDescription('¿La afirmación científica es verdadera?').addBooleanOption((o) => o.setName('respuesta').setDescription('¿Verdadero?').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('animal').setDescription('Adivina el animal por los emojis').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s.setName('musica').setDescription('Pregunta básica de música').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s.setName('deporte').setDescription('Adivina el deporte por la descripción').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s.setName('moneda').setDescription('Adivina la moneda del país').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s.setName('traducir').setDescription('Traduce la palabra al español').addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true).setMaxLength(50)),
    ),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'suma': {
        const a = rint(1, 50);
        const b = rint(1, 50);
        const user = interaction.options.getInteger('respuesta', true);
        const correct = a + b;
        const challenge = `¿Cuánto es **${a} + ${b}**?`;
        if (user === correct) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${correct}`)] });
        }
        return;
      }
      case 'resta': {
        let a = rint(1, 50);
        let b = rint(1, 50);
        if (b > a) [a, b] = [b, a];
        const user = interaction.options.getInteger('respuesta', true);
        const correct = a - b;
        const challenge = `¿Cuánto es **${a} − ${b}**?`;
        if (user === correct) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${correct}`)] });
        }
        return;
      }
      case 'multiplicacion': {
        const a = rint(2, 12);
        const b = rint(2, 12);
        const user = interaction.options.getInteger('respuesta', true);
        const correct = a * b;
        const challenge = `¿Cuánto es **${a} × ${b}**?`;
        if (user === correct) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${correct}`)] });
        }
        return;
      }
      case 'division': {
        const divisor = rint(2, 12);
        const quotient = rint(2, 12);
        const dividend = divisor * quotient;
        const user = interaction.options.getInteger('respuesta', true);
        const challenge = `¿Cuánto es **${dividend} ÷ ${divisor}**? (división exacta)`;
        if (user === quotient) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${quotient}`)] });
        }
        return;
      }
      case 'capitales': {
        const entry = pick(CAPITALS);
        const user = norm(interaction.options.getString('respuesta', true));
        const ok = user === norm(entry.capital) || entry.aliases.some((a) => norm(a) === user);
        const challenge = `¿Cuál es la capital de **${entry.country}**?`;
        if (ok) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${entry.capital}`)] });
        }
        return;
      }
      case 'banderas': {
        const entry = pick(FLAGS);
        const user = norm(interaction.options.getString('respuesta', true));
        const ok = user === norm(entry.country) || entry.aliases.some((a) => norm(a) === user);
        const challenge = `¿De qué país es esta bandera? ${entry.emoji}`;
        if (ok) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${entry.country}`)] });
        }
        return;
      }
      case 'elementos': {
        const entry = pick(ELEMENTS);
        const name = entry[0] as string;
        const symbol = entry[1] as string;
        const user = norm(interaction.options.getString('respuesta', true));
        const challenge = `¿Cuál es el símbolo químico del **${name}**?`;
        if (user === norm(symbol)) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${symbol}`)] });
        }
        return;
      }
      case 'planetas': {
        const entry = pick(PLANETS);
        const user = norm(interaction.options.getString('respuesta', true));
        const challenge = `🪐 ${entry.hint}`;
        if (user === norm(entry.answer)) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${entry.answer}`)] });
        }
        return;
      }
      case 'historia': {
        const entry = pick(HISTORY);
        const user = interaction.options.getInteger('respuesta', true);
        const challenge = `¿En qué año ocurrió esto?\n**${entry.event}**`;
        if (user === entry.year) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${entry.year}`)] });
        }
        return;
      }
      case 'sinonimo': {
        const entry = pick(SYNONYMS);
        const user = norm(interaction.options.getString('respuesta', true));
        const ok = entry.accept.some((a) => norm(a) === user);
        const challenge = `Escribe un sinónimo de **${entry.word}**.`;
        if (ok) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuestas válidas:** ${entry.accept.join(' / ')}`)] });
        }
        return;
      }
      case 'antonimo': {
        const entry = pick(ANTONYMS);
        const word = entry[0] as string;
        const opposite = entry[1] as string;
        const user = norm(interaction.options.getString('respuesta', true));
        const challenge = `Escribe el antónimo de **${word}**.`;
        if (user === norm(opposite)) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${opposite}`)] });
        }
        return;
      }
      case 'ortografia': {
        const entry = pick(SPELLING);
        const shownIsOk = Math.random() < 0.5;
        const shown = shownIsOk ? entry.ok : entry.bad;
        const userSaysOk = interaction.options.getBoolean('correcta', true);
        const challenge = `¿Está bien escrita esta palabra?\n**${shown}**`;
        const said = userSaysOk ? 'bien escrita' : 'mal escrita';
        if (userSaysOk === shownIsOk) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\nDijiste: **${said}**\n🎉 ¡Bien hecho!`)] });
        } else {
          const truth = shownIsOk ? 'está bien escrita' : 'está MAL escrita';
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\nDijiste: **${said}**\nEn realidad **${shown}** ${truth}.`)] });
        }
        return;
      }
      case 'intruso': {
        const entry = pick(ODD_ONE);
        const user = interaction.options.getInteger('respuesta', true);
        const list = entry.words.map((w, i) => `${i + 1}) ${w}`).join('   ');
        const challenge = `¿Cuál es el intruso?\n${list}`;
        if (user === entry.odd) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${entry.odd} (${entry.reason})`)] });
        }
        return;
      }
      case 'secuencia': {
        const pattern = pick(SEQUENCES);
        const result = pattern.gen();
        const user = interaction.options.getInteger('respuesta', true);
        const challenge = `Completa la serie:\n**${result.series.join(', ')}, …?**`;
        if (user === result.next) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${result.next}`)] });
        }
        return;
      }
      case 'binario': {
        const n = rint(1, 63);
        const bin = n.toString(2);
        const user = interaction.options.getInteger('respuesta', true);
        const challenge = `Convierte a decimal: \`${bin}\``;
        if (user === n) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${n}`)] });
        }
        return;
      }
      case 'hexadecimal': {
        const n = rint(16, 255);
        const hex = n.toString(16).toUpperCase();
        const user = interaction.options.getInteger('respuesta', true);
        const challenge = `Convierte a decimal: \`0x${hex}\``;
        if (user === n) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${n}`)] });
        }
        return;
      }
      case 'morse': {
        const word = Math.random() < 0.35 ? pick(MORSE_WORDS) : (MORSE_LETTERS[Math.floor(Math.random() * MORSE_LETTERS.length)] as string);
        const code = toMorse(word);
        const user = norm(interaction.options.getString('respuesta', true));
        const challenge = `Decodifica este morse: \`${code}\``;
        if (user === norm(word)) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${word}`)] });
        }
        return;
      }
      case 'anagrama': {
        const word = pick(ANAGRAMS);
        const mixed = scramble(word);
        const user = norm(interaction.options.getString('respuesta', true));
        const challenge = `Ordena estas letras: **${mixed}**`;
        if (user === norm(word)) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${word}`)] });
        }
        return;
      }
      case 'adivinanza': {
        const entry = pick(RIDDLES);
        const user = norm(interaction.options.getString('respuesta', true));
        const ok = entry.accept.some((a) => norm(a) === user || norm(a) === `el ${user}` || norm(a) === `la ${user}`);
        const challenge = `🧩 ${entry.question}`;
        if (ok) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuestas válidas:** ${entry.accept.join(' / ')}`)] });
        }
        return;
      }
      case 'ciencia': {
        const entry = pick(SCIENCE);
        const user = interaction.options.getBoolean('respuesta', true);
        const challenge = `¿Verdadero o falso?\n**${entry.statement}**`;
        const said = user ? 'verdadero' : 'falso';
        if (user === entry.truth) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\nDijiste: **${said}**\n🎉 ¡Bien hecho!`)] });
        } else {
          const truth = entry.truth ? 'verdadero' : 'falso';
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\nDijiste: **${said}**\nLa respuesta correcta es: **${truth}**.`)] });
        }
        return;
      }
      case 'animal': {
        const entry = pick(ANIMALS);
        const user = norm(interaction.options.getString('respuesta', true));
        const ok = user === norm(entry.answer) || entry.aliases.some((a) => norm(a) === user);
        const challenge = `${entry.emojis}\n¿Qué animal es?`;
        if (ok) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${entry.answer}`)] });
        }
        return;
      }
      case 'musica': {
        const entry = pick(MUSIC);
        const user = norm(interaction.options.getString('respuesta', true));
        const ok = entry.accept.some((a) => norm(a) === user);
        const challenge = `🎵 ${entry.question}`;
        if (ok) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${entry.accept[0]}`)] });
        }
        return;
      }
      case 'deporte': {
        const entry = pick(SPORTS);
        const user = norm(interaction.options.getString('respuesta', true));
        const ok = entry.accept.some((a) => norm(a) === user);
        const challenge = `🏅 ${entry.question}`;
        if (ok) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${entry.accept[0]}`)] });
        }
        return;
      }
      case 'moneda': {
        const entry = pick(CURRENCIES);
        const user = norm(interaction.options.getString('respuesta', true));
        const ok = user === norm(entry.currency) || entry.aliases.some((a) => norm(a) === user);
        const challenge = `¿Cuál es la moneda de **${entry.country}**?`;
        if (ok) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${entry.currency}`)] });
        }
        return;
      }
      case 'traducir': {
        const entry = pick(TRANSLATIONS);
        const en = entry[0] as string;
        const es = entry[1] as string;
        const user = norm(interaction.options.getString('respuesta', true));
        const challenge = `Traduce al español: **${en}**`;
        if (user === norm(es)) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto!', `${challenge}\n**Tu respuesta:** ${user}\n🎉 ¡Bien hecho!`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Incorrecto', `${challenge}\n**Tu respuesta:** ${user}\n**Respuesta correcta:** ${es}`)] });
        }
        return;
      }
      default: {
        await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
        return;
      }
    }
  },
};
