/**
 * Juegos: /juegos <25 minijuegos de 1 sola interacción, 100% locales>.
 * Sin componentes ni estado en memoria: cada llamada es independiente.
 * Los retos con pregunta previa (math-rush, scramble, simon, trivia)
 * derivan el reto de (usuario + minuto actual): úsalos sin respuesta
 * para ver el reto y con respuesta para resolverlo. Sin fetch ni DB.
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function minuteBucket(offset = 0): number {
  return Math.floor(Date.now() / 60000) + offset;
}

function seededInt(seed: string, max: number): number {
  return hashStr(seed) % max;
}

/* ---------- slots ---------- */
const SLOT_SYMBOLS: readonly string[] = ['🍒', '🍋', '🔔', '⭐', '🍇', '💎', '7️⃣'];

/* ---------- cards ---------- */
const CARD_RANKS: readonly string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_SUITS: readonly { symbol: string; name: string; red: boolean }[] = [
  { symbol: '♠️', name: 'picas', red: false },
  { symbol: '♥️', name: 'corazones', red: true },
  { symbol: '♦️', name: 'diamantes', red: true },
  { symbol: '♣️', name: 'tréboles', red: false },
];
const HIGH_CARD_NAMES: readonly string[] = ['', 'As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jota', 'Reina', 'Rey'];

function drawCard(): { rank: string; suit: (typeof CARD_SUITS)[number] } {
  return { rank: pick(CARD_RANKS), suit: pick(CARD_SUITS) };
}

/* ---------- rps / rpsls ---------- */
const RPS_LABEL: Record<string, string> = { rock: '🪨 Piedra', paper: '📄 Papel', scissors: '✂️ Tijera' };
const RPS_MOVES: readonly string[] = ['rock', 'paper', 'scissors'];
const RPSLS_LABEL: Record<string, string> = {
  rock: '🪨 Piedra',
  paper: '📄 Papel',
  scissors: '✂️ Tijera',
  lizard: '🦎 Lagarto',
  spock: '🖖 Spock',
};
const RPSLS_MOVES: readonly string[] = ['rock', 'paper', 'scissors', 'lizard', 'spock'];
const RPSLS_BEATS: Record<string, readonly string[]> = {
  rock: ['scissors', 'lizard'],
  paper: ['rock', 'spock'],
  scissors: ['paper', 'lizard'],
  lizard: ['paper', 'spock'],
  spock: ['rock', 'scissors'],
};

function rpsWinner(user: string, bot: string): 'win' | 'lose' | 'tie' {
  if (user === bot) return 'tie';
  if ((user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper')) return 'win';
  return 'lose';
}

function rpslsWinner(user: string, bot: string): 'win' | 'lose' | 'tie' {
  if (user === bot) return 'tie';
  return (RPSLS_BEATS[user] ?? []).includes(bot) ? 'win' : 'lose';
}

/* ---------- dragon / dungeon ---------- */
const DRAGON_MOVES: readonly string[] = ['attack', 'defend', 'heal'];
const DRAGON_LABEL: Record<string, string> = { attack: '🔥 Ataque', defend: '🛡️ Defensa', heal: '💚 Curación' };

function dragonOutcome(user: string, dragon: string): { title: string; text: string; win: boolean | null } {
  if (user === 'attack' && dragon === 'attack') return { title: 'Choque de fuego', text: 'Atacaste y el dragón también. ¡Explosión mutua! Ambos retroceden chamuscados. 💥', win: null };
  if (user === 'attack' && dragon === 'defend') return { title: 'Bloqueo dracónico', text: 'Tu espada choca contra sus escamas. ¡El dragón bloquea todo! 🛡️', win: false };
  if (user === 'attack' && dragon === 'heal') return { title: 'Golpe oportuno', text: '¡Atacaste mientras se curaba! ¡Victoria del héroe! 🗡️🎉', win: true };
  if (user === 'defend' && dragon === 'attack') return { title: 'Defensa perfecta', text: 'Bloqueaste las llamas con tu escudo y el dragón se cansa. ¡Contraataca la próxima! 🛡️🔥', win: null };
  if (user === 'defend' && dragon === 'defend') return { title: 'Tregua tensa', text: 'Ambos se defienden... se miran... ¡empate diplomático! 🤝', win: null };
  if (user === 'defend' && dragon === 'heal') return { title: 'Pausa estratégica', text: 'Te defendiste mientras el dragón recuperaba fuerzas. Nada cambia... por ahora. 👀', win: null };
  if (user === 'heal' && dragon === 'attack') return { title: '¡Emboscada!', text: 'Te curabas y el dragón aprovechó. ¡Esa poción tendrá que esperar! 🔥😖', win: false };
  if (user === 'heal' && dragon === 'defend') return { title: 'Recuperación', text: 'El dragón se defiende y tú recuperas fuerzas. ¡Vuelves al combate como nuevo/a! 💚', win: null };
  return { title: 'Doble curación', text: 'Ambos se curan a la vez. El combate se alarga... ¡el público bosteza! 🥱', win: true };
}

const DUNGEON_OUTCOMES: Record<string, readonly string[]> = {
  left: [
    '🗝️ Encuentras un cofre pequeño con 50 monedas de oro. ¡Botín!',
    '🕷️ ¡Una araña gigante! Huyes por donde viniste. Sin botín... y con susto.',
    '📜 Hallas un mapa antiguo. ¿Tesoro o trampa? Lo guardas para otra aventura.',
    '🍄 Una cueva de setas brillantes. Hermosa... pero sin oro. ¡Foto mental!',
  ],
  right: [
    '💎 ¡Sala del tesoro! Te llevas una gema brillante. ¡Riqueza!',
    '🔥 ¡Trampa de fuego! Sales corriendo con las cejas chamuscadas.',
    '🦇 Miles de murciélagos te rodean. Gritas, corres, sobrevives. ¡Qué noche!',
    '🪙 Un montón de monedas falsas de chocolate. ¡Al menos están ricas! 🍫',
  ],
  forward: [
    '🐉 ¡El dragón dormido! Pasas de puntillas... y sales con una escama de recuerdo. ¡Leyenda!',
    '🚪 Una puerta misteriosa que lleva... ¡a la salida! Aventura corta pero segura.',
    '💀 ¡Esqueletos bailarines! Te unes al baile y te dejan pasar. 🕺',
    '🏆 ¡Cámara final! El tesoro era la amistad... y 100 monedas. ¡Doble premio!',
  ],
};

/* ---------- scramble / simon / math / trivia (retos por minuto) ---------- */
const SCRAMBLE_WORDS: readonly string[] = [
  'fiesta',
  'dragon',
  'castillo',
  'murcielago',
  'tesoro',
  'aventura',
  'pirata',
  'estrella',
  'volcan',
  'trompeta',
  'caramelo',
  'montaña',
];

function scrambleWord(word: string, seed: string): string {
  const letters = [...word];
  for (let attempt = 0; attempt < 10; attempt++) {
    const arr = [...letters];
    let s = hashStr(`${seed}|${attempt}`);
    const rand = (): number => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j] as string, arr[i] as string];
    }
    const out = arr.join('');
    if (out !== word) return out;
  }
  return [...letters].reverse().join('');
}

const SIMON_EMOJIS: readonly string[] = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'];

function simonSequence(userId: string, bucket: number): string {
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    parts.push(SIMON_EMOJIS[seededInt(`simon|${userId}|${bucket}|${i}`, SIMON_EMOJIS.length)] as string);
  }
  return parts.join(' ');
}

function mathChallenge(userId: string, bucket: number): { a: number; b: number; expected: number } {
  const a = 2 + seededInt(`math|${userId}|${bucket}|a`, 11);
  const b = 2 + seededInt(`math|${userId}|${bucket}|b`, 11);
  return { a, b, expected: a + b };
}

interface TriviaQ {
  q: string;
  options: readonly [string, string, string, string];
  correct: 'A' | 'B' | 'C' | 'D';
}

const TRIVIA_BANK: readonly TriviaQ[] = [
  { q: '¿Cuál es el planeta más grande del sistema solar?', options: ['Marte', 'Júpiter', 'Saturno', 'Venus'], correct: 'B' },
  { q: '¿Cuántos lados tiene un hexágono?', options: ['5', '6', '7', '8'], correct: 'B' },
  { q: '¿Qué animal es el más grande del mundo?', options: ['Elefante africano', 'Tiburón ballena', 'Ballena azul', 'Jirafa'], correct: 'C' },
  { q: '¿En qué año llegó el ser humano a la Luna?', options: ['1965', '1969', '1972', '1959'], correct: 'B' },
  { q: '¿Cuál es la capital de Japón?', options: ['Kioto', 'Osaka', 'Tokio', 'Pekín'], correct: 'C' },
  { q: '¿Qué gas respiramos principalmente para vivir?', options: ['Oxígeno', 'Hidrógeno', 'Dióxido de carbono', 'Helio'], correct: 'A' },
  { q: '¿Cuántos continentes hay en la Tierra?', options: ['5', '6', '7', '8'], correct: 'C' },
  { q: '¿Qué instrumento mide la temperatura?', options: ['Barómetro', 'Termómetro', 'Anemómetro', 'Reloj'], correct: 'B' },
  { q: '¿Cuál es el océano más grande?', options: ['Atlántico', 'Índico', 'Ártico', 'Pacífico'], correct: 'D' },
  { q: '¿Qué color resulta de mezclar azul y amarillo?', options: ['Verde', 'Naranja', 'Morado', 'Marrón'], correct: 'A' },
  { q: '¿Cuántas patas tiene una araña?', options: ['6', '8', '10', '4'], correct: 'B' },
  { q: '¿Qué planeta es conocido como el planeta rojo?', options: ['Venus', 'Mercurio', 'Marte', 'Júpiter'], correct: 'C' },
];

function triviaQuestion(userId: string, bucket: number): TriviaQ {
  return TRIVIA_BANK[seededInt(`trivia|${userId}|${bucket}`, TRIVIA_BANK.length)] as TriviaQ;
}

function formatTrivia(t: TriviaQ): string {
  return `${t.q}\n\n**A.** ${t.options[0]}\n**B.** ${t.options[1]}\n**C.** ${t.options[2]}\n**D.** ${t.options[3]}`;
}

/* ---------- treasure map / chests / doors ---------- */
const MAP_RESULTS: readonly string[] = [
  '💰 ¡Tesoro encontrado! Un cofre lleno de monedas de oro.',
  '🕸️ Solo telarañas y polvo... esta vez no hubo suerte.',
  '🐍 ¡Una serpiente guardiana! Huyes con el corazón a mil.',
  '🗝️ Encuentras una llave misteriosa. ¿Qué abrirá...?',
  '💎 ¡Gema brillante entre las rocas! Te la llevas.',
  '🕳️ ¡Trampa! Caes en un hoyo... poco profundo. Sales riendo.',
];

const CHEST_LOOT: readonly { name: string; rarity: string }[] = [
  { name: '🪙 10 monedas de oro', rarity: 'Común' },
  { name: '🗡️ Espada de madera (+1 estilo)', rarity: 'Común' },
  { name: '💎 Gema brillante', rarity: 'Raro' },
  { name: '🧪 Poción misteriosa (sabe a fresa)', rarity: 'Raro' },
  { name: '👑 Corona del rey arcade', rarity: 'Épico' },
  { name: '🐉 Huevo de dragón (está calentito)', rarity: 'Legendario' },
];

const DOOR_MISS: readonly string[] = [
  '🕸️ Una habitación vacía llena de telarañas. ¡Nada!',
  '👻 ¡Un fantasma bromista te asusta y se ríe! Te vas temblando.',
  '🧦 Solo hay un calcetín perdido. El otro sigue desaparecido.',
  '🦇 Murciélagos por todas partes. ¡Corre!',
];
const DOOR_TREASURES: readonly string[] = [
  '💰 ¡TESORO! Montañas de oro solo para ti. ¡Rico/a!',
  '🏆 ¡Premio mayor! Trofeo dorado + lluvia de confeti. 🎊',
  '💎 ¡Cofre de gemas! Brillas más que el propio tesoro.',
];

/* ---------- roulette / wheel ---------- */
const ROULETTE_REDS: readonly number[] = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const WHEEL: readonly string[] = ['🍒 Cereza', '⭐ Estrella', '💎 Diamante', '🔔 Campana', '🍇 Uva', '👑 Corona', '🎃 Calabaza', '🚀 Cohete'];

export const arcade: Command = {
  data: new SlashCommandBuilder()
    .setName('juegos')
    .setDescription('Minijuegos instantáneos 100% locales')
    .addSubcommand((s) => s.setName('tragaperras').setDescription('Tragaperras de 3 rodillos'))
    .addSubcommand((s) =>
      s
        .setName('carta-alta')
        .setDescription('Tu carta contra la del bot: gana la más alta')
        .addIntegerOption((o) => o.setName('carta').setDescription('Tu carta: 1 (As) a 13 (Rey)').setRequired(true).setMinValue(1).setMaxValue(13)),
    )
    .addSubcommand((s) =>
      s
        .setName('carrera-dados')
        .setDescription('Elige un número del 1 al 6 y el dado decide')
        .addIntegerOption((o) => o.setName('numero').setDescription('Tu número (1-6)').setRequired(true).setMinValue(1).setMaxValue(6)),
    )
    .addSubcommand((s) =>
      s
        .setName('cara-cruz')
        .setDescription('Cara o cruz contra el bot')
        .addStringOption((o) =>
          o.setName('eleccion').setDescription('Tu elección').setRequired(true).addChoices({ name: 'Cara 🪙', value: 'cara' }, { name: 'Cruz 🪙', value: 'cruz' }),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('adivina-10')
        .setDescription('Adivina el número secreto del 1 al 10')
        .addIntegerOption((o) => o.setName('numero').setDescription('Tu número (1-10)').setRequired(true).setMinValue(1).setMaxValue(10)),
    )
    .addSubcommand((s) =>
      s
        .setName('adivina-100')
        .setDescription('Adivina el número secreto del 1 al 100 (con pistas)')
        .addIntegerOption((o) => o.setName('numero').setDescription('Tu número (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s
        .setName('piedra-papel-tijera')
        .setDescription('Piedra, papel o tijera contra el bot')
        .addStringOption((o) =>
          o
            .setName('jugada')
            .setDescription('Tu jugada')
            .setRequired(true)
            .addChoices({ name: 'Piedra 🪨', value: 'rock' }, { name: 'Papel 📄', value: 'paper' }, { name: 'Tijera ✂️', value: 'scissors' }),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('pptls')
        .setDescription('Piedra, papel, tijera, lagarto o Spock')
        .addStringOption((o) =>
          o
            .setName('jugada')
            .setDescription('Tu jugada')
            .setRequired(true)
            .addChoices(
              { name: 'Piedra 🪨', value: 'rock' },
              { name: 'Papel 📄', value: 'paper' },
              { name: 'Tijera ✂️', value: 'scissors' },
              { name: 'Lagarto 🦎', value: 'lizard' },
              { name: 'Spock 🖖', value: 'spock' },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('pares-nones')
        .setDescription('Pares o nones contra el bot')
        .addStringOption((o) =>
          o.setName('eleccion').setDescription('Tu elección').setRequired(true).addChoices({ name: 'Pares', value: 'even' }, { name: 'Nones', value: 'odd' }),
        )
        .addIntegerOption((o) => o.setName('numero').setDescription('Dedos que muestras (0-10, aleatorio si lo omites)').setMinValue(0).setMaxValue(10)),
    )
    .addSubcommand((s) =>
      s
        .setName('rojo-negro')
        .setDescription('Apuesta al color de la carta')
        .addStringOption((o) =>
          o.setName('eleccion').setDescription('Tu color').setRequired(true).addChoices({ name: 'Rojo ♥️♦️', value: 'red' }, { name: 'Negro ♠️♣️', value: 'black' }),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('siete-suerte')
        .setDescription('Apuesta a la suma de 2 dados')
        .addIntegerOption((o) => o.setName('total').setDescription('Suma apostada (2-12)').setRequired(true).setMinValue(2).setMaxValue(12)),
    )
    .addSubcommand((s) => s.setName('robar-carta').setDescription('Roba una carta de la baraja'))
    .addSubcommand((s) => s.setName('critico').setDescription('Tira un d20: ¿crítico o pifia?'))
    .addSubcommand((s) =>
      s
        .setName('cofre')
        .setDescription('Elige un cofre y descubre tu botín')
        .addIntegerOption((o) => o.setName('cofre').setDescription('Cofre (1-3)').setRequired(true).setMinValue(1).setMaxValue(3)),
    )
    .addSubcommand((s) =>
      s
        .setName('puertas')
        .setDescription('Elige una puerta: tesoro o trampa')
        .addIntegerOption((o) => o.setName('puerta').setDescription('Puerta (1-3)').setRequired(true).setMinValue(1).setMaxValue(3)),
    )
    .addSubcommand((s) =>
      s
        .setName('dragon')
        .setDescription('Enfréntate al dragón en un turno')
        .addStringOption((o) =>
          o
            .setName('accion')
            .setDescription('Tu acción')
            .setRequired(true)
            .addChoices({ name: 'Atacar 🗡️', value: 'attack' }, { name: 'Defender 🛡️', value: 'defend' }, { name: 'Curar 💚', value: 'heal' }),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('mazmorra')
        .setDescription('Explora la mazmorra: elige un camino')
        .addStringOption((o) =>
          o
            .setName('direccion')
            .setDescription('Dirección')
            .setRequired(true)
            .addChoices({ name: 'Izquierda ⬅️', value: 'left' }, { name: 'Derecha ➡️', value: 'right' }, { name: 'Adelante ⬆️', value: 'forward' }),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('calculo-rapido')
        .setDescription('Suma contrarreloj (úsalo sin respuesta para ver el reto)')
        .addIntegerOption((o) => o.setName('respuesta').setDescription('Tu respuesta a la suma')),
    )
    .addSubcommand((s) =>
      s
        .setName('palabra-revuelta')
        .setDescription('Adivina la palabra revuelta (úsalo sin intento para verla)')
        .addStringOption((o) => o.setName('intento').setDescription('Tu respuesta').setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s
        .setName('simon')
        .setDescription('Repite la secuencia de 4 emojis (úsalo sin repeticion para verla)')
        .addStringOption((o) => o.setName('repeticion').setDescription('Repite la secuencia tal cual').setMaxLength(100)),
    )
    .addSubcommand((s) =>
      s
        .setName('trivia')
        .setDescription('Pregunta de cultura general (úsalo sin respuesta para verla)')
        .addStringOption((o) =>
          o
            .setName('respuesta')
            .setDescription('Tu respuesta')
            .addChoices({ name: 'A', value: 'A' }, { name: 'B', value: 'B' }, { name: 'C', value: 'C' }, { name: 'D', value: 'D' }),
        ),
    )
    .addSubcommand((s) => s.setName('velocidad').setDescription('Test de reacción simulado'))
    .addSubcommand((s) =>
      s
        .setName('mapa-tesoro')
        .setDescription('Elige un rumbo en el mapa del tesoro')
        .addStringOption((o) =>
          o
            .setName('rumbo')
            .setDescription('Rumbo')
            .setRequired(true)
            .addChoices(
              { name: 'Norte 🧭', value: 'norte' },
              { name: 'Sur 🧭', value: 'sur' },
              { name: 'Este 🧭', value: 'este' },
              { name: 'Oeste 🧭', value: 'oeste' },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('ruleta')
        .setDescription('Ruleta: apuesta a un número del 0 al 36')
        .addIntegerOption((o) => o.setName('numero').setDescription('Tu número (0-36)').setRequired(true).setMinValue(0).setMaxValue(36)),
    )
    .addSubcommand((s) =>
      s
        .setName('rueda-suerte')
        .setDescription('Rueda de la fortuna de 8 casillas')
        .addIntegerOption((o) => o.setName('casilla').setDescription('Tu casilla (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)),
    ),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'tragaperras') {
      const a = pick(SLOT_SYMBOLS);
      const b = pick(SLOT_SYMBOLS);
      const c = pick(SLOT_SYMBOLS);
      const line = `${a} ${b} ${c}`;
      if (a === b && b === c) {
        const mega = a === '💎' || a === '7️⃣';
        await interaction.reply({ embeds: [Embeds.success('🎰 ¡JACKPOT!', `${line}\n\n${mega ? '💎 ¡JACKPOT MÁXIMO! ¡Leyenda del arcade! 🏆' : '¡Tres iguales! ¡Increíble! 🎉'}`)] });
      } else if (a === b || b === c || a === c) {
        await interaction.reply({ embeds: [Embeds.primary('🎰 ¡Pareja!', `${line}\n\n¡Dos iguales! Premio menor. 🪙`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('🎰 Sin suerte', `${line}\n\nNada esta vez... ¡otra moneda, otra oportunidad! 🪙`)] });
      }
      return;
    }

    if (sub === 'carta-alta') {
      const mine = interaction.options.getInteger('carta', true);
      if (!Number.isInteger(mine) || mine < 1 || mine > 13) {
        await interaction.reply({ embeds: [Embeds.error('Carta inválida', 'Elige una carta del 1 (As) al 13 (Rey).')], ephemeral: true });
        return;
      }
      const bot = 1 + randInt(13);
      const myName = HIGH_CARD_NAMES[mine] as string;
      const botName = HIGH_CARD_NAMES[bot] as string;
      const text = `🃏 Tú: **${myName}** (${mine})\n🤖 Bot: **${botName}** (${bot})\n\n`;
      if (mine === bot) {
        await interaction.reply({ embeds: [Embeds.primary('Carta alta: empate', `${text}¡Mismo valor! ¡Guerra... o revancha! ⚔️`)] });
      } else if (mine > bot) {
        await interaction.reply({ embeds: [Embeds.success('¡Carta más alta: ganas!', `${text}¡Tu carta manda! 🎉`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('Carta más alta: pierdes', `${text}El bot se lleva la mano. 🃏`)] });
      }
      return;
    }

    if (sub === 'carrera-dados') {
      const myPick = interaction.options.getInteger('numero', true);
      if (!Number.isInteger(myPick) || myPick < 1 || myPick > 6) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Elige un número del 1 al 6.')], ephemeral: true });
        return;
      }
      const roll = 1 + randInt(6);
      if (myPick === roll) {
        await interaction.reply({ embeds: [Embeds.success('🎲 ¡Pleno!', `Elegiste **${myPick}** y el dado sacó **${roll}**. ¡Precisión total! 🏆`)] });
      } else if (Math.abs(myPick - roll) === 1) {
        await interaction.reply({ embeds: [Embeds.primary('🎲 ¡Casi!', `Elegiste **${myPick}** y el dado sacó **${roll}**. ¡Por un pelito! 😅`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('🎲 Sin suerte', `Elegiste **${myPick}** y el dado sacó **${roll}**. ¡A la próxima! 🍀`)] });
      }
      return;
    }

    if (sub === 'cara-cruz') {
      const call = interaction.options.getString('eleccion', true);
      if (call !== 'cara' && call !== 'cruz') {
        await interaction.reply({ embeds: [Embeds.error('Elección inválida', 'Elige cara o cruz.')], ephemeral: true });
        return;
      }
      const isCara = Math.random() < 0.5;
      const result = isCara ? 'cara' : 'cruz';
      const streak = 1 + randInt(5);
      if (call === result) {
        await interaction.reply({ embeds: [Embeds.success('🪙 ¡Acertaste!', `Pediste **${call}** y salió **${result}**. 🔥 ¡Racha de la moneda: ${streak}!`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('🪙 Fallaste', `Pediste **${call}** y salió **${result}**. La racha era de ${streak}... para el bot. 😅`)] });
      }
      return;
    }

    if (sub === 'adivina-10') {
      const guess = interaction.options.getInteger('numero', true);
      if (!Number.isInteger(guess) || guess < 1 || guess > 10) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Elige un número del 1 al 10.')], ephemeral: true });
        return;
      }
      const secret = 1 + randInt(10);
      if (guess === secret) {
        await interaction.reply({ embeds: [Embeds.success('¡Adivinaste!', `Dijiste **${guess}** y el secreto era **${secret}**. ¡Mente prodigiosa! 🔮🎉`)] });
      } else {
        const hint = guess < secret ? 'mayor 📈' : 'menor 📉';
        await interaction.reply({ embeds: [Embeds.error('¡Fallaste!', `Dijiste **${guess}**, el secreto era **${secret}** (era ${hint}). ¡Otra vez!`)] });
      }
      return;
    }

    if (sub === 'adivina-100') {
      const guess = interaction.options.getInteger('numero', true);
      if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Elige un número del 1 al 100.')], ephemeral: true });
        return;
      }
      const secret = 1 + randInt(100);
      const diff = Math.abs(guess - secret);
      if (diff === 0) {
        await interaction.reply({ embeds: [Embeds.success('¡INCREÍBLE!', `**${guess}** era el secreto entre 100 números. ¡Lotería mental! 🏆🔮`)] });
      } else {
        const temp = diff <= 3 ? '🔥 ¡ARDIENDO! Estuviste a nada.' : diff <= 10 ? '🥵 ¡Caliente! Muy cerca.' : diff <= 25 ? '😐 Tibio... regular.' : '🥶 Frío, frío. Lejos.';
        await interaction.reply({ embeds: [Embeds.error('Casi... o no', `Dijiste **${guess}**, el secreto era **${secret}**.\n${temp}`)] });
      }
      return;
    }

    if (sub === 'piedra-papel-tijera') {
      const move = interaction.options.getString('jugada', true);
      if (!RPS_MOVES.includes(move)) {
        await interaction.reply({ embeds: [Embeds.error('Jugada inválida', 'Usa piedra, papel o tijera.')], ephemeral: true });
        return;
      }
      const bot = pick(RPS_MOVES);
      const result = rpsWinner(move, bot);
      const me = RPS_LABEL[move] ?? move;
      const botLabel = RPS_LABEL[bot] ?? bot;
      if (result === 'tie') {
        await interaction.reply({ embeds: [Embeds.primary('🪨📄✂️ ¡Empate!', `Tú: ${me}\nBot: ${botLabel}\n\n¡Desempate ya!`)] });
      } else if (result === 'win') {
        await interaction.reply({ embeds: [Embeds.success('¡Ganaste!', `Tú: ${me}\nBot: ${botLabel}\n\n¡Punto para ti! 🎉`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('Perdiste', `Tú: ${me}\nBot: ${botLabel}\n\nEl bot hace su baile de victoria. 💃`)] });
      }
      return;
    }

    if (sub === 'pptls') {
      const move = interaction.options.getString('jugada', true);
      if (!RPSLS_MOVES.includes(move)) {
        await interaction.reply({ embeds: [Embeds.error('Jugada inválida', 'Usa piedra, papel, tijera, lagarto o Spock.')], ephemeral: true });
        return;
      }
      const bot = pick(RPSLS_MOVES);
      const result = rpslsWinner(move, bot);
      const me = RPSLS_LABEL[move] ?? move;
      const botLabel = RPSLS_LABEL[bot] ?? bot;
      if (result === 'tie') {
        await interaction.reply({ embeds: [Embeds.primary('¡Empate!', `Tú: ${me}\nBot: ${botLabel}\n\n¡Las estrellas se alinearon! ✨`)] });
      } else if (result === 'win') {
        await interaction.reply({ embeds: [Embeds.success('¡Ganaste!', `Tú: ${me}\nBot: ${botLabel}\n\n¡Sheldon estaría orgulloso! 🖖`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('Perdiste', `Tú: ${me}\nBot: ${botLabel}\n\nEl bot dice: "lógica impecable". 🤖`)] });
      }
      return;
    }

    if (sub === 'pares-nones') {
      const call = interaction.options.getString('eleccion', true);
      if (call !== 'odd' && call !== 'even') {
        await interaction.reply({ embeds: [Embeds.error('Elección inválida', 'Elige pares o nones.')], ephemeral: true });
        return;
      }
      const optNumber = interaction.options.getInteger('numero');
      if (optNumber !== null && (!Number.isInteger(optNumber) || optNumber < 0 || optNumber > 10)) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Muestra entre 0 y 10 dedos.')], ephemeral: true });
        return;
      }
      const mine = optNumber ?? randInt(11);
      const bot = randInt(11);
      const sum = mine + bot;
      const parity: 'odd' | 'even' = sum % 2 === 0 ? 'even' : 'odd';
      const text = `🫵 Tú muestras **${mine}** (${call === 'even' ? 'pares' : 'nones'})\n🤖 El bot muestra **${bot}**\n➕ Suma: **${sum}** (${parity === 'even' ? 'par' : 'impar'})\n\n`;
      if (parity === call) {
        await interaction.reply({ embeds: [Embeds.success('¡Ganaste los pares/nones!', `${text}¡Tu bando suma y gana! 🎉`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('Perdiste los pares/nones', `${text}La suma no te favoreció. 😅`)] });
      }
      return;
    }

    if (sub === 'rojo-negro') {
      const call = interaction.options.getString('eleccion', true);
      if (call !== 'red' && call !== 'black') {
        await interaction.reply({ embeds: [Embeds.error('Color inválido', 'Elige rojo o negro.')], ephemeral: true });
        return;
      }
      const card = drawCard();
      const isRed = card.suit.red;
      const won = (call === 'red') === isRed;
      const text = `🃏 Carta: **${card.rank}${card.suit.symbol}** (${card.suit.name})\nApostaste al **${call === 'red' ? 'rojo ♥️♦️' : 'negro ♠️♣️'}**.\n\n`;
      if (won) {
        await interaction.reply({ embeds: [Embeds.success('¡Color acertado!', `${text}¡El casino paga! 💰`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('Color fallado', `${text}La banca gana esta vez. 🎰`)] });
      }
      return;
    }

    if (sub === 'siete-suerte') {
      const total = interaction.options.getInteger('total', true);
      if (!Number.isInteger(total) || total < 2 || total > 12) {
        await interaction.reply({ embeds: [Embeds.error('Suma inválida', 'Apuesta a una suma del 2 al 12.')], ephemeral: true });
        return;
      }
      const d1 = 1 + randInt(6);
      const d2 = 1 + randInt(6);
      const sum = d1 + d2;
      if (sum === total) {
        await interaction.reply({ embeds: [Embeds.success('🎲 ¡PLENO!', `Dados: **${d1}** + **${d2}** = **${sum}**\nApostaste al **${total}**. ¡Premio mayor! 🏆`)] });
      } else if (Math.abs(sum - total) === 1) {
        await interaction.reply({ embeds: [Embeds.primary('🎲 ¡Por uno!', `Dados: **${d1}** + **${d2}** = **${sum}**\nApostaste al **${total}**. ¡Tan cerca! 😅`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('🎲 Sin suerte', `Dados: **${d1}** + **${d2}** = **${sum}**\nApostaste al **${total}**. ¡Otra tirada! 🍀`)] });
      }
      return;
    }

    if (sub === 'robar-carta') {
      const card = drawCard();
      const flavor =
        card.rank === 'A'
          ? '¡UN AS! ¡La mejor carta! 🌟'
          : card.rank === 'K' || card.rank === 'Q' || card.rank === 'J'
            ? '¡Figura real! ¡Todo estilo! 👑'
            : Number(card.rank) >= 8
              ? '¡Carta alta! Nada mal. 💪'
              : 'Carta modesta... pero con corazón. ❤️';
      await interaction.reply({ embeds: [Embeds.primary('🃏 Tu carta', `Robaste: **${card.rank}${card.suit.symbol}** de ${card.suit.name}\n${flavor}`)] });
      return;
    }

    if (sub === 'critico') {
      const roll = 1 + randInt(20);
      if (roll === 20) {
        await interaction.reply({ embeds: [Embeds.success('⚔️ ¡CRÍTICO NATURAL!', `D20: **${roll}**\n¡Daño doble! ¡El dragón tiembla! 🐉💥`)] });
      } else if (roll === 1) {
        await interaction.reply({ embeds: [Embeds.error('💀 ¡PIFIA!', `D20: **${roll}**\nTe tropiezas con tu propia espada. El dragón se ríe. 🐉😂`)] });
      } else if (roll >= 15) {
        await interaction.reply({ embeds: [Embeds.success('¡Gran tirada!', `D20: **${roll}**\n¡Golpe sólido! El enemigo retrocede. ⚔️`)] });
      } else if (roll >= 10) {
        await interaction.reply({ embeds: [Embeds.primary('Tirada decente', `D20: **${roll}**\nRasguño menor. Podría ser peor. 🙂`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('Tirada floja', `D20: **${roll}**\nFallaste... pero con estilo. 😅`)] });
      }
      return;
    }

    if (sub === 'cofre') {
      const num = interaction.options.getInteger('cofre', true);
      if (!Number.isInteger(num) || num < 1 || num > 3) {
        await interaction.reply({ embeds: [Embeds.error('Cofre inválido', 'Elige un cofre del 1 al 3.')], ephemeral: true });
        return;
      }
      const loot = pick(CHEST_LOOT);
      await interaction.reply({ embeds: [Embeds.success(`🎁 Cofre ${num} abierto`, `Dentro había...\n**${loot.name}**\nRareza: *${loot.rarity}*`)] });
      return;
    }

    if (sub === 'puertas') {
      const door = interaction.options.getInteger('puerta', true);
      if (!Number.isInteger(door) || door < 1 || door > 3) {
        await interaction.reply({ embeds: [Embeds.error('Puerta inválida', 'Elige una puerta del 1 al 3.')], ephemeral: true });
        return;
      }
      const winner = 1 + randInt(3);
      if (door === winner) {
        await interaction.reply({ embeds: [Embeds.success(`🚪 Puerta ${door}`, `Abres lentamente... ${pick(DOOR_TREASURES)}`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error(`🚪 Puerta ${door}`, `Abres lentamente... ${pick(DOOR_MISS)}\n_El tesoro estaba en la puerta ${winner}._`)] });
      }
      return;
    }

    if (sub === 'dragon') {
      const move = interaction.options.getString('accion', true);
      if (!DRAGON_MOVES.includes(move)) {
        await interaction.reply({ embeds: [Embeds.error('Acción inválida', 'Elige atacar, defender o curar.')], ephemeral: true });
        return;
      }
      const dragon = pick(DRAGON_MOVES);
      const out = dragonOutcome(move, dragon);
      const text = `🫵 Tú: ${DRAGON_LABEL[move] ?? move}\n🐉 Dragón: ${DRAGON_LABEL[dragon] ?? dragon}\n\n${out.text}`;
      if (out.win === true) {
        await interaction.reply({ embeds: [Embeds.success(`🐉 ${out.title}`, text)] });
      } else if (out.win === false) {
        await interaction.reply({ embeds: [Embeds.error(`🐉 ${out.title}`, text)] });
      } else {
        await interaction.reply({ embeds: [Embeds.primary(`🐉 ${out.title}`, text)] });
      }
      return;
    }

    if (sub === 'mazmorra') {
      const move = interaction.options.getString('direccion', true);
      const outcomes = DUNGEON_OUTCOMES[move];
      if (!outcomes) {
        await interaction.reply({ embeds: [Embeds.error('Dirección inválida', 'Elige izquierda, derecha o adelante.')], ephemeral: true });
        return;
      }
      const dirLabel = move === 'left' ? '⬅️ Izquierda' : move === 'right' ? '➡️ Derecha' : '⬆️ Adelante';
      await interaction.reply({ embeds: [Embeds.primary(`🗺️ Mazmorra: ${dirLabel}`, `Avanzas con tu antorcha... ${pick(outcomes)}`)] });
      return;
    }

    if (sub === 'calculo-rapido') {
      const userId = interaction.user.id;
      const answer = interaction.options.getInteger('respuesta');
      if (answer === null) {
        const ch = mathChallenge(userId, minuteBucket());
        await interaction.reply({
          embeds: [
            Embeds.primary('➕ Cálculo rápido', `Resuelve antes de que cambie el reto:\n\n## ${ch.a} + ${ch.b} = ?\n\nResponde con \`/juegos calculo-rapido\` poniendo tu \`respuesta\`. ¡Corre! ⏱️`),
          ],
        });
        return;
      }
      if (!Number.isInteger(answer)) {
        await interaction.reply({ embeds: [Embeds.error('Respuesta inválida', 'Tu `respuesta` debe ser un número entero.')], ephemeral: true });
        return;
      }
      for (const bucket of [minuteBucket(), minuteBucket(-1)]) {
        const ch = mathChallenge(userId, bucket);
        if (answer === ch.expected) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto! ⚡', `${ch.a} + ${ch.b} = **${ch.expected}**. ¡Mente relámpago! 🧠🎉`)] });
          return;
        }
      }
      const current = mathChallenge(userId, minuteBucket());
      await interaction.reply({
        embeds: [Embeds.error('¡Fallaste o caducó!', `Esa no es la respuesta del reto actual.\n\nReto vigente: **${current.a} + ${current.b} = ?**\nResponde con \`/juegos calculo-rapido\` y tu \`respuesta\`.`)],
      });
      return;
    }

    if (sub === 'palabra-revuelta') {
      const userId = interaction.user.id;
      const guess = interaction.options.getString('intento');
      if (guess === null || guess.trim() === '') {
        const word = SCRAMBLE_WORDS[seededInt(`scr|${userId}|${minuteBucket()}`, SCRAMBLE_WORDS.length)] as string;
        const scrambled = scrambleWord(word, `scr|${userId}|${minuteBucket()}`);
        await interaction.reply({
          embeds: [Embeds.primary('🔤 Palabra revuelta', `Ordena estas letras:\n\n## ${scrambled.toUpperCase()}\n\nResponde con \`/juegos palabra-revuelta\` y tu \`intento\`. ¡Tienes 2 minutos!`)] ,
        });
        return;
      }
      const norm = guess.trim().toLowerCase();
      if (norm.length === 0 || norm.length > 50) {
        await interaction.reply({ embeds: [Embeds.error('Respuesta inválida', 'Escribe una palabra válida como `intento`.')], ephemeral: true });
        return;
      }
      for (const bucket of [minuteBucket(), minuteBucket(-1), minuteBucket(-2)]) {
        const word = SCRAMBLE_WORDS[seededInt(`scr|${userId}|${bucket}`, SCRAMBLE_WORDS.length)] as string;
        if (norm === word) {
          await interaction.reply({ embeds: [Embeds.success('¡Palabra correcta!', `**${word.toUpperCase()}** era la palabra. ¡Diccionario humano! 📖🎉`)] });
          return;
        }
      }
      const word = SCRAMBLE_WORDS[seededInt(`scr|${userId}|${minuteBucket()}`, SCRAMBLE_WORDS.length)] as string;
      await interaction.reply({
        embeds: [Embeds.error('¡No es esa!', `"${norm}" no es la palabra del reto vigente. Pide la palabra con \`/juegos palabra-revuelta\` sin \`intento\`.\n\n_Pista: tiene ${word.length} letras._`)],
      });
      return;
    }

    if (sub === 'simon') {
      const userId = interaction.user.id;
      const repeat = interaction.options.getString('repeticion');
      const normInput = (s: string): string => s.trim().replace(/\s+/g, ' ');
      if (repeat === null || normInput(repeat) === '') {
        const seq = simonSequence(userId, minuteBucket());
        await interaction.reply({
          embeds: [Embeds.primary('🎨 Simón dice', `Memoriza esta secuencia:\n\n## ${seq}\n\nRepítela con \`/juegos simon\` poniendo el \`repeticion\` exactamente igual. ¡Tienes 2 minutos!`)] ,
        });
        return;
      }
      const given = normInput(repeat);
      if (given.length === 0 || given.length > 100) {
        await interaction.reply({ embeds: [Embeds.error('Respuesta inválida', 'Repite la secuencia de emojis en `repeticion`.')], ephemeral: true });
        return;
      }
      for (const bucket of [minuteBucket(), minuteBucket(-1), minuteBucket(-2)]) {
        if (given === simonSequence(userId, bucket)) {
          await interaction.reply({ embeds: [Embeds.success('¡Memoria perfecta!', `Secuencia **${given}** correcta. ¡Mente fotográfica! 🧠🎉`)] });
          return;
        }
      }
      await interaction.reply({
        embeds: [Embeds.error('¡Secuencia incorrecta!', `Esa no coincide con el reto vigente. Mírala de nuevo con \`/juegos simon\` sin \`repeticion\`. 👀`)],
      });
      return;
    }

    if (sub === 'trivia') {
      const userId = interaction.user.id;
      const answer = interaction.options.getString('respuesta');
      if (answer === null) {
        const t = triviaQuestion(userId, minuteBucket());
        await interaction.reply({
          embeds: [Embeds.primary('🧠 Trivia', `${formatTrivia(t)}\n\nResponde con \`/juegos trivia\` y tu \`respuesta\` (A, B, C o D). ¡Tienes 2 minutos!`)],
        });
        return;
      }
      if (answer !== 'A' && answer !== 'B' && answer !== 'C' && answer !== 'D') {
        await interaction.reply({ embeds: [Embeds.error('Respuesta inválida', 'Tu `respuesta` debe ser A, B, C o D.')], ephemeral: true });
        return;
      }
      for (const bucket of [minuteBucket(), minuteBucket(-1), minuteBucket(-2)]) {
        const t = triviaQuestion(userId, bucket);
        if (answer === t.correct) {
          await interaction.reply({ embeds: [Embeds.success('¡Correcto! 🎓', `**${answer}** es la respuesta: ${t.q}\n¡Cerebrito del arcade! 🎉`)] });
          return;
        }
      }
      const t = triviaQuestion(userId, minuteBucket());
      await interaction.reply({
        embeds: [Embeds.error('¡Fallaste o caducó!', `La respuesta **${answer}** no es correcta para el reto vigente.\n\nPregunta vigente:\n${formatTrivia(t)}`)],
      });
      return;
    }

    if (sub === 'velocidad') {
      const ms = 120 + randInt(381);
      const rank = ms < 180 ? '⚡ ¡Reflejos LEGENDARIOS!' : ms < 250 ? '🔥 ¡Rapidísimo/a!' : ms < 350 ? '👍 Nada mal.' : '🐌 ...¿estabas dormido/a?';
      await interaction.reply({ embeds: [Embeds.primary('⏱️ Test de velocidad', `Tu tiempo de reacción (simulado): **${ms} ms**\n${rank}\n\n_(Medición de mentirijilla, pero la gloria es real)_ 😄`)] });
      return;
    }

    if (sub === 'mapa-tesoro') {
      const direction = interaction.options.getString('rumbo', true);
      if (direction !== 'norte' && direction !== 'sur' && direction !== 'este' && direction !== 'oeste') {
        await interaction.reply({ embeds: [Embeds.error('Rumbo inválido', 'Elige norte, sur, este u oeste.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`🗺️ Rumbo al ${direction}`, `Navegas hacia el **${direction}**... ${pick(MAP_RESULTS)}`)] });
      return;
    }

    if (sub === 'ruleta') {
      const num = interaction.options.getInteger('numero', true);
      if (!Number.isInteger(num) || num < 0 || num > 36) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Apuesta a un número del 0 al 36.')], ephemeral: true });
        return;
      }
      const spin = randInt(37);
      const colorOf = (n: number): string => (n === 0 ? '🟢 verde' : ROULETTE_REDS.includes(n) ? '🔴 rojo' : '⚫ negro');
      if (spin === num) {
        await interaction.reply({ embeds: [Embeds.success('🎡 ¡PLENO EN LA RULETA!', `Apostaste al **${num}** y salió el **${spin}** (${colorOf(spin)}). ¡Paga 35 a 1! 💰🏆`)] });
      } else {
        const sameColor = num !== 0 && spin !== 0 && ROULETTE_REDS.includes(num) === ROULETTE_REDS.includes(spin);
        const sameParity = num !== 0 && spin !== 0 && num % 2 === spin % 2;
        const consolation = sameColor && sameParity ? '¡Mismo color y misma paridad! Casi casi. 😅' : sameColor ? 'Al menos acertaste el color. 🔴⚫' : sameParity ? 'Al menos acertaste par/impar. 🔢' : 'Ni color ni paridad... la banca sonríe. 🎰';
        await interaction.reply({ embeds: [Embeds.error('🎡 La bola no te quiso', `Apostaste al **${num}** y salió el **${spin}** (${colorOf(spin)}).\n${consolation}`)] });
      }
      return;
    }

    if (sub === 'rueda-suerte') {
      const segment = interaction.options.getInteger('casilla', true);
      if (!Number.isInteger(segment) || segment < 1 || segment > 8) {
        await interaction.reply({ embeds: [Embeds.error('Casilla inválida', 'Elige una casilla del 1 al 8.')], ephemeral: true });
        return;
      }
      const spin = 1 + randInt(8);
      const myName = WHEEL[segment - 1] as string;
      const spinName = WHEEL[spin - 1] as string;
      if (spin === segment) {
        await interaction.reply({ embeds: [Embeds.success('🎡 ¡RUEDA GANADORA!', `Tu casilla: **${segment}** (${myName})\nLa rueda paró en: **${spin}** (${spinName})\n\n¡Premio mayor! 🏆`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('🎡 La rueda gira... y falla', `Tu casilla: **${segment}** (${myName})\nLa rueda paró en: **${spin}** (${spinName})\n\n¡Gira de nuevo! 🍀`)] });
      }
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
  },
};
