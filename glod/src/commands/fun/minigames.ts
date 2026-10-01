/**
 * Minijuegos: /minijuego <14 juegos no-económicos, jugables en 1 interacción, sin estado>.
 * Los juegos con "pregunta" usan semillas deterministas por usuario para ser
 * verificables en una sola interacción slash (sin botones ni persistencia).
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

function pick<T>(arr: readonly T[]): T {
  return arr[rand(arr.length)] as T;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function cardName(v: number): string {
  if (v === 1) return 'A';
  if (v === 11) return 'J';
  if (v === 12) return 'Q';
  if (v === 13) return 'K';
  return String(v);
}

function cardValue21(v: number): number {
  if (v === 1) return 11;
  if (v >= 11) return 10;
  return v;
}

function handTotal(hand: number[]): number {
  let total = hand.reduce((a, b) => a + b, 0);
  let aces = hand.filter((c) => c === 1).length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

type WinState = 'win' | 'lose' | 'draw';

function resultEmbed(state: WinState, title: string, description: string) {
  if (state === 'win') return Embeds.success(title, description);
  if (state === 'lose') return Embeds.error(title, description);
  return Embeds.primary(title, description);
}

// ---------- Trivia (12 preguntas locales) ----------

interface TriviaQ {
  q: string;
  options: readonly [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
}

const TRIVIA: readonly TriviaQ[] = [
  { q: '¿Cuál es el planeta más grande del sistema solar?', options: ['Marte', 'Júpiter', 'Saturno', 'Venus'], correct: 1 },
  { q: '¿En qué año llegó el ser humano a la Luna?', options: ['1965', '1969', '1972', '1959'], correct: 1 },
  { q: '¿Cuál es el océano más grande del mundo?', options: ['Atlántico', 'Índico', 'Pacífico', 'Ártico'], correct: 2 },
  { q: '¿Cuántos lados tiene un hexágono?', options: ['5', '6', '7', '8'], correct: 1 },
  { q: '¿Qué gas respiramos principalmente para vivir?', options: ['Hidrógeno', 'Dióxido de carbono', 'Nitrógeno', 'Oxígeno'], correct: 3 },
  { q: '¿Cuál es la capital de Japón?', options: ['Kioto', 'Osaka', 'Tokio', 'Nagoya'], correct: 2 },
  { q: '¿Qué instrumento mide la temperatura?', options: ['Barómetro', 'Termómetro', 'Anemómetro', 'Higrómetro'], correct: 1 },
  { q: '¿Cuántos continentes hay en la Tierra?', options: ['5', '6', '7', '8'], correct: 2 },
  { q: '¿Qué color resulta de mezclar azul y amarillo?', options: ['Verde', 'Morado', 'Naranja', 'Marrón'], correct: 0 },
  { q: '¿Cuál es el animal terrestre más rápido?', options: ['León', 'Guepardo', 'Antílope', 'Caballo'], correct: 1 },
  { q: '¿Qué significa "www" en una web?', options: ['World Wide Web', 'Web World Wide', 'Wide World Web', 'World Web Wide'], correct: 0 },
  { q: '¿Cuántos minutos tiene una hora?', options: ['30', '60', '90', '100'], correct: 1 },
];

const LETTERS = ['A', 'B', 'C', 'D'] as const;

// ---------- Palabras (guess-word / scramble / hangman) ----------

interface WordEntry {
  word: string;
  hint: string;
}

const WORDS: readonly WordEntry[] = [
  { word: 'dragon', hint: 'Criatura que escupe fuego 🐉' },
  { word: 'pizza', hint: 'Comida redonda con queso 🍕' },
  { word: 'robot', hint: 'Máquina que parece humana 🤖' },
  { word: 'playa', hint: 'Arena, mar y sol 🏖️' },
  { word: 'guitarra', hint: 'Instrumento de cuerdas 🎸' },
  { word: 'montaña', hint: 'Muy alta, con nieve arriba 🏔️' },
  { word: 'cohete', hint: 'Viaja al espacio 🚀' },
  { word: 'pirata', hint: 'Busca tesoros en el mar 🏴‍☠️' },
  { word: 'helado', hint: 'Frío y dulce 🍦' },
  { word: 'castillo', hint: 'Viven reyes en él 🏰' },
  { word: 'tortuga', hint: 'Lenta pero llega 🐢' },
  { word: 'volcan', hint: 'Montaña que escupe lava 🌋' },
  { word: 'biblioteca', hint: 'Llena de libros 📚' },
  { word: 'arcoiris', hint: 'Sale tras la lluvia 🌈' },
  { word: 'fantasma', hint: 'Asusta de noche 👻' },
  { word: 'tesoro', hint: 'Lo entierran los piratas 💰' },
];

function dailySeed(userId: string): string {
  return `${userId}|${new Date().toISOString().slice(0, 10)}`;
}

function wordFor(seed: string): WordEntry {
  return WORDS[hashStr(seed) % WORDS.length] as WordEntry;
}

function censor(word: string, revealed: Set<string>): string {
  return word
    .split('')
    .map((c) => (revealed.has(c.toLowerCase()) ? c : '＿'))
    .join(' ');
}

function scrambleWord(word: string): string {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    const a = arr[i] as string;
    arr[i] = arr[j] as string;
    arr[j] = a;
  }
  if (arr.join('') === word && arr.length > 1) {
    const t = arr[0] as string;
    arr[0] = arr[1] as string;
    arr[1] = t;
  }
  return arr.join('');
}

// ---------- Tictactoe ----------

function tictactoeWinner(board: string[]): 'X' | 'O' | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    const va = board[a] as string;
    if ((va === 'X' || va === 'O') && va === board[b] && va === board[c]) return va;
  }
  return null;
}

function renderBoard(board: string[]): string {
  const cell = (c: string): string => (c === 'X' ? '❌' : c === 'O' ? '⭕' : '⬜');
  return `${cell(board[0] as string)}${cell(board[1] as string)}${cell(board[2] as string)}\n${cell(board[3] as string)}${cell(board[4] as string)}${cell(board[5] as string)}\n${cell(board[6] as string)}${cell(board[7] as string)}${cell(board[8] as string)}`;
}

const RPS = ['rock', 'paper', 'scissors'] as const;
const RPS_EMOJI: Record<string, string> = { rock: '🪨', paper: '📄', scissors: '✂️' };

const SLOT_EMOJIS: readonly string[] = ['🍒', '🍋', '⭐', '💎', '7️⃣', '🍀'];
const MEMORY_EMOJIS: readonly string[] = ['🔴', '🔵', '🟢', '🟡', '🟣', '⭐', '🍎', '🐱'];

export const minigame: Command = {
  data: new SlashCommandBuilder()
    .setName('minijuego')
    .setDescription('Minijuegos divertidos (sin dinero)')
    .addSubcommand((s) =>
      s
        .setName('piedra-papel-tijera')
        .setDescription('Piedra, papel o tijeras contra el bot')
        .addStringOption((o) =>
          o.setName('eleccion').setDescription('Tu jugada').setRequired(true)
            .addChoices({ name: '🪨 Piedra', value: 'rock' }, { name: '📄 Papel', value: 'paper' }, { name: '✂️ Tijeras', value: 'scissors' }),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('adivina-numero')
        .setDescription('Adivina el número del 1 al 10 (1 intento)')
        .addIntegerOption((o) => o.setName('numero').setDescription('Tu número (1-10)').setRequired(true).setMinValue(1).setMaxValue(10)),
    )
    .addSubcommand((s) =>
      s
        .setName('adivina-palabra')
        .setDescription('Adivina la palabra secreta del día')
        .addStringOption((o) => o.setName('palabra').setDescription('Tu intento').setRequired(true).setMaxLength(30)),
    )
    .addSubcommand((s) =>
      s
        .setName('trivia')
        .setDescription('Pregunta de trivia (elige A, B, C o D)')
        .addStringOption((o) =>
          o.setName('respuesta').setDescription('Tu respuesta').setRequired(true)
            .addChoices({ name: 'A', value: 'a' }, { name: 'B', value: 'b' }, { name: 'C', value: 'c' }, { name: 'D', value: 'd' }),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('quiz-matematicas')
        .setDescription('Resuelve la operación de tu nivel (igual hasta acertar)')
        .addIntegerOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setRequired(true))
        .addStringOption((o) =>
          o.setName('dificultad').setDescription('Dificultad').addChoices({ name: 'Fácil', value: 'easy' }, { name: 'Media', value: 'medium' }, { name: 'Difícil', value: 'hard' }),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('memoria')
        .setDescription('Repite la secuencia de tu día (omite repeticion para verla)')
        .addStringOption((o) => o.setName('repeticion').setDescription('Repite la secuencia separada por espacios').setMaxLength(100)),
    )
    .addSubcommand((s) =>
      s
        .setName('palabra-revuelta')
        .setDescription('Ordena la palabra desordenada del día')
        .addStringOption((o) => o.setName('respuesta').setDescription('Tu respuesta').setMaxLength(30)),
    )
    .addSubcommand((s) =>
      s
        .setName('mayor-menor')
        .setDescription('¿La siguiente carta será más alta o más baja?')
        .addStringOption((o) =>
          o.setName('eleccion').setDescription('Tu predicción').setRequired(true)
            .addChoices({ name: '🔼 Más alta', value: 'higher' }, { name: '🔽 Más baja', value: 'lower' }),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('par-impar')
        .setDescription('¿El dado saldrá par o impar?')
        .addStringOption((o) =>
          o.setName('eleccion').setDescription('Tu predicción').setRequired(true)
            .addChoices({ name: 'Par', value: 'even' }, { name: 'Impar', value: 'odd' }),
        ),
    )
    .addSubcommand((s) => s.setName('tragaperras').setDescription('Tragamonedas solo por diversión (sin dinero)'))
    .addSubcommand((s) => s.setName('blackjack').setDescription('Una mano de blackjack contra el bot (sin dinero)'))
    .addSubcommand((s) =>
      s
        .setName('tres-en-raya')
        .setDescription('Tres en raya: tú (❌) vs bot (⭕)')
        .addStringOption((o) => o.setName('tablero').setDescription('Tablero de 9 caracteres: X, O o - (ej: X--O-----)').setRequired(true).setMinLength(9).setMaxLength(9))
        .addIntegerOption((o) => o.setName('jugada').setDescription('Tu jugada (1-9, de izq. a der., arriba a abajo)').setRequired(true).setMinValue(1).setMaxValue(9)),
    )
    .addSubcommand((s) =>
      s
        .setName('ahorcado')
        .setDescription('Ahorcado: prueba una letra con la palabra del día')
        .addStringOption((o) => o.setName('letra').setDescription('Una letra').setRequired(true).setMinLength(1).setMaxLength(2)),
    )
    .addSubcommand((s) => s.setName('duelo-dados').setDescription('Duelo de dados contra el bot (d6)')),
  cooldown: 5,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'piedra-papel-tijera': {
        const user = interaction.options.getString('eleccion', true);
        const bot = pick(RPS);
        let state: WinState;
        if (user === bot) state = 'draw';
        else if ((user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper')) state = 'win';
        else state = 'lose';
        const label = state === 'win' ? '¡Ganaste! 🎉' : state === 'lose' ? 'Perdiste 😅' : 'Empate 🤝';
        await interaction.reply({
          embeds: [resultEmbed(state, `✊ Piedra, papel o tijeras — ${label}`, `Tú: **${RPS_EMOJI[user] ?? user}**\nBot: **${RPS_EMOJI[bot] ?? bot}**`)],
        });
        return;
      }
      case 'adivina-numero': {
        const n = interaction.options.getInteger('numero', true);
        const target = 1 + rand(10);
        const win = n === target;
        await interaction.reply({
          embeds: [resultEmbed(win ? 'win' : 'lose', win ? '🎯 ¡Adivinaste!' : '🎯 Casi...', `Tu número: **${n}**\nNúmero secreto: **${target}**`)],
        });
        return;
      }
      case 'adivina-palabra': {
        const entry = wordFor(dailySeed(interaction.user.id));
        const attempt = (interaction.options.getString('palabra', true) ?? '').toLowerCase().trim();
        const win = attempt === entry.word.toLowerCase();
        const desc = win
          ? `La palabra era **${entry.word}**. ¡Increíble! 🎉`
          : `Tu intento: \`${attempt}\`\nPista: ${entry.hint}\nPalabra: \`${censor(entry.word, new Set())}\` (${entry.word.length} letras)\n¡Inténtalo de nuevo!`;
        await interaction.reply({ embeds: [resultEmbed(win ? 'win' : 'lose', win ? '🔤 ¡Palabra correcta!' : '🔤 Palabra incorrecta', desc)] });
        return;
      }
      case 'trivia': {
        const q = pick(TRIVIA);
        const answer = interaction.options.getString('respuesta', true);
        const idx = ['a', 'b', 'c', 'd'].indexOf(answer);
        const win = idx === q.correct;
        const opts = q.options.map((o, i) => `${i === q.correct && !win ? '✅' : i === idx ? (win ? '✅' : '❌') : '•'} **${LETTERS[i]}.** ${o}`).join('\n');
        await interaction.reply({
          embeds: [resultEmbed(win ? 'win' : 'lose', win ? '🧠 ¡Correcto!' : '🧠 Incorrecto', `**${q.q}**\n${opts}`)],
        });
        return;
      }
      case 'quiz-matematicas': {
        const difficulty = interaction.options.getString('dificultad') ?? 'medium';
        const given = interaction.options.getInteger('respuesta', true);
        const h = hashStr(`${interaction.user.id}|math|${difficulty}`);
        let a: number;
        let b: number;
        let op: string;
        let expected: number;
        if (difficulty === 'easy') {
          a = (h % 10) + 1;
          b = ((h >> 3) % 10) + 1;
          op = '+';
          expected = a + b;
        } else if (difficulty === 'hard') {
          a = (h % 12) + 2;
          b = ((h >> 4) % 12) + 2;
          op = '×';
          expected = a * b;
        } else {
          a = (h % 50) + 10;
          b = ((h >> 3) % 40) + 5;
          if (h % 2 === 0) {
            op = '−';
            expected = a - b;
          } else {
            op = '+';
            expected = a + b;
          }
        }
        const win = given === expected;
        const difficultyLabel = difficulty === 'easy' ? 'fácil' : difficulty === 'hard' ? 'difícil' : 'media';
        await interaction.reply({
          embeds: [
            resultEmbed(win ? 'win' : 'lose', win ? '➗ ¡Correcto!' : '➗ Incorrecto', `Operación (${difficultyLabel}): **${a} ${op} ${b} = ?**\nTu respuesta: **${given}**${win ? '' : '\n💡 La operación es la misma hasta que aciertes. ¡Reintenta!'}`),
          ],
        });
        return;
      }
      case 'memoria': {
        const h = hashStr(`${dailySeed(interaction.user.id)}|memory`);
        const seq = [0, 1, 2, 3].map((i) => MEMORY_EMOJIS[(h >> (i * 3)) % MEMORY_EMOJIS.length] as string);
        const expected = seq.join(' ');
        const repeat = (interaction.options.getString('repeticion') ?? '').trim();
        if (!repeat) {
          await interaction.reply({
            embeds: [Embeds.primary('🧠 Memoria', `Memoriza esta secuencia:\n# ${expected}\n\nRepite el comando con la opción \`repeticion\` separando con espacios.`)],
          });
          return;
        }
        const norm = (s: string): string => s.replace(/,/g, ' ').split(/\s+/).filter(Boolean).join(' ');
        const win = norm(repeat) === norm(expected);
        await interaction.reply({
          embeds: [resultEmbed(win ? 'win' : 'lose', win ? '🧠 ¡Memoria perfecta!' : '🧠 Fallaste', `Secuencia: ${expected}\nTu repetición: ${norm(repeat) || '_(vacía)_'}`)],
        });
        return;
      }
      case 'palabra-revuelta': {
        const entry = wordFor(dailySeed(interaction.user.id));
        const scrambled = scrambleWord(entry.word);
        const answer = (interaction.options.getString('respuesta') ?? '').toLowerCase().trim();
        if (!answer) {
          await interaction.reply({
            embeds: [Embeds.primary('🔀 Palabra desordenada', `Ordena esto: **${scrambled}**\nPista: ${entry.hint}\nUsa \`/minijuego palabra-revuelta respuesta:...\` para responder.`)],
          });
          return;
        }
        const win = answer === entry.word.toLowerCase();
        await interaction.reply({
          embeds: [resultEmbed(win ? 'win' : 'lose', win ? '🔀 ¡Lo ordenaste!' : '🔀 Sigue intentando', win ? `**${scrambled}** → **${entry.word}** 🎉` : `Tu respuesta: \`${answer}\`\nDesordenada: **${scrambled}**\nPista: ${entry.hint}`)],
        });
        return;
      }
      case 'mayor-menor': {
        const choice = interaction.options.getString('eleccion', true);
        const current = 1 + rand(13);
        const next = 1 + rand(13);
        let state: WinState;
        if (next === current) state = 'draw';
        else if ((choice === 'higher' && next > current) || (choice === 'lower' && next < current)) state = 'win';
        else state = 'lose';
        const label = state === 'win' ? '¡Acertaste! 🎉' : state === 'lose' ? 'Fallaste 😅' : 'Empate (misma carta) 🤝';
        await interaction.reply({
          embeds: [resultEmbed(state, `🃏 Mayor/Menor — ${label}`, `Carta visible: **${cardName(current)}**\nTu predicción: **${choice === 'higher' ? '🔼 Más alta' : '🔽 Más baja'}**\nSiguiente carta: **${cardName(next)}**`)],
        });
        return;
      }
      case 'par-impar': {
        const choice = interaction.options.getString('eleccion', true);
        const roll = 1 + rand(6);
        const isEven = roll % 2 === 0;
        const win = (choice === 'even') === isEven;
        await interaction.reply({
          embeds: [resultEmbed(win ? 'win' : 'lose', win ? '🎲 ¡Acertaste!' : '🎲 Fallaste', `Dado: **${roll}** (${isEven ? 'par' : 'impar'})\nTu predicción: **${choice === 'even' ? 'par' : 'impar'}**`)],
        });
        return;
      }
      case 'tragaperras': {
        const s = [pick(SLOT_EMOJIS), pick(SLOT_EMOJIS), pick(SLOT_EMOJIS)];
        const line = s.join(' | ');
        let state: WinState;
        let label: string;
        if (s[0] === s[1] && s[1] === s[2]) {
          state = 'win';
          label = '¡JACKPOT! 🎰🎉';
        } else if (s[0] === s[1] || s[1] === s[2] || s[0] === s[2]) {
          state = 'draw';
          label = '¡Casi! Dos iguales 🍀';
        } else {
          state = 'lose';
          label = 'Sin suerte esta vez 😅';
        }
        await interaction.reply({ embeds: [resultEmbed(state, `🎰 Slots — ${label}`, `# ${line}`)] });
        return;
      }
      case 'blackjack': {
        const draw = (): number => 1 + rand(13);
        const player = [draw(), draw()];
        const dealer = [draw(), draw()];
        let pTotal = handTotal(player);
        let dTotal = handTotal(dealer);
        while (dTotal < 17) {
          dealer.push(draw());
          dTotal = handTotal(dealer);
        }
        const pBust = pTotal > 21;
        const dBust = dTotal > 21;
        let state: WinState;
        if (pBust || (!dBust && dTotal > pTotal)) state = 'lose';
        else if (dBust || pTotal > dTotal) state = 'win';
        else state = 'draw';
        const label = state === 'win' ? '¡Ganas! 🎉' : state === 'lose' ? 'Gana la banca 😅' : 'Empate 🤝';
        await interaction.reply({
          embeds: [
            resultEmbed(state, `🂡 Blackjack — ${label}`, `Tu mano: ${player.map(cardName).join(' + ')} = **${pTotal}**\nBanca: ${dealer.map(cardName).join(' + ')} = **${dTotal}**`),
          ],
        });
        return;
      }
      case 'tres-en-raya': {
        const raw = interaction.options.getString('tablero', true).toUpperCase();
        const move = interaction.options.getInteger('jugada', true);
        if (!/^[XO\-]{9}$/.test(raw)) {
          await interaction.reply({ embeds: [Embeds.error('Tablero inválido', 'Usa 9 caracteres: `X`, `O` o `-`. Ej: `X--O-----`.')], ephemeral: true });
          return;
        }
        const board = raw.split('');
        if (tictactoeWinner(board)) {
          await interaction.reply({ embeds: [Embeds.error('Partida terminada', 'Ese tablero ya tiene ganador. Empieza uno nuevo con `---------`.')], ephemeral: true });
          return;
        }
        if ((board[move - 1] as string) !== '-') {
          await interaction.reply({ embeds: [Embeds.error('Casilla ocupada', `La casilla **${move}** ya está ocupada.\n${renderBoard(board)}`)], ephemeral: true });
          return;
        }
        board[move - 1] = 'X';
        let winner = tictactoeWinner(board);
        let botMoved = false;
        if (!winner && board.includes('-')) {
          const free = board.map((c, i) => (c === '-' ? i : -1)).filter((i) => i >= 0);
          const pickIdx = free[rand(free.length)] as number;
          board[pickIdx] = 'O';
          botMoved = true;
          winner = tictactoeWinner(board);
        }
        const full = !board.includes('-');
        const state: WinState = winner === 'X' ? 'win' : winner === 'O' ? 'lose' : 'draw';
        const label = winner === 'X' ? '¡Ganaste! 🎉' : winner === 'O' ? 'Gana el bot 😅' : full ? 'Empate 🤝' : botMoved ? 'Tu turno (eres ❌)' : 'Tu turno (eres ❌)';
        await interaction.reply({
          embeds: [resultEmbed(state, `⭕ Tres en raya — ${label}`, `${renderBoard(board)}\n\`board:${board.join('')}\` para seguir jugando.`)],
        });
        return;
      }
      case 'ahorcado': {
        const rawLetter = (interaction.options.getString('letra', true) ?? '').toLowerCase().trim();
        const letter = rawLetter.charAt(0);
        if (!/^[a-zñ]$/.test(letter)) {
          await interaction.reply({ embeds: [Embeds.error('Letra inválida', 'Envía una sola letra (a-z, ñ).')], ephemeral: true });
          return;
        }
        const entry = wordFor(dailySeed(interaction.user.id));
        const word = entry.word.toLowerCase();
        const hit = word.includes(letter);
        const revealed = new Set<string>([letter]);
        const progress = censor(word, revealed);
        const desc = hit
          ? `¡Bien! La letra **${letter}** está en la palabra. 🎉\n\`${progress}\`\nPista: ${entry.hint}`
          : `La letra **${letter}** no está. 😅 (fallos en este intento: 1/6)\n\`${progress}\`\nPista: ${entry.hint}`;
        await interaction.reply({ embeds: [resultEmbed(hit ? 'win' : 'lose', '🎪 Ahorcado del día', desc)] });
        return;
      }
      case 'duelo-dados': {
        const p = 1 + rand(6);
        const b = 1 + rand(6);
        const state: WinState = p === b ? 'draw' : p > b ? 'win' : 'lose';
        const label = state === 'win' ? '¡Ganaste el duelo! 🎉' : state === 'lose' ? 'Gana el bot 😅' : 'Empate 🤝';
        await interaction.reply({
          embeds: [resultEmbed(state, `🎲 Duelo de dados — ${label}`, `Tú: **${p}** 🎲\nBot: **${b}** 🎲`)],
        });
        return;
      }
      default: {
        await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
        return;
      }
    }
  },
};
