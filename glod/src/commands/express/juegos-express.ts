/**
 * Juegos exprés: /poker-dados /rolear-dados /domino /apertura
 *   /nombre-epico /mision /hechizo /zodiaco-chino
 * Comandos individuales 100% locales, sin APIs externas ni base de datos.
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function dado(): number {
  return Math.floor(Math.random() * 6) + 1;
}

const CARAS_DADO = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;

function caraDado(valor: number): string {
  return CARAS_DADO[valor - 1] ?? '🎲';
}

/* ------------------------------------------------------------------ */
/* /poker-dados (exportado como pokerDados: los guiones no son válidos */
/* en identificadores; el loader registra por data.name)               */
/* ------------------------------------------------------------------ */

function evaluarPokerDados(valores: number[]): string {
  const conteo = new Map<number, number>();
  for (const v of valores) conteo.set(v, (conteo.get(v) ?? 0) + 1);
  const grupos = [...conteo.values()].sort((a, b) => b - a);
  const ordenados = [...valores].sort((a, b) => a - b);
  const primera = ordenados[0] ?? 0;
  const ultima = ordenados[ordenados.length - 1] ?? 0;
  const esEscalera = grupos.length === 5 && ultima - primera === 4;
  const mayor = grupos[0] ?? 0;
  const segundo = grupos[1] ?? 0;
  if (mayor === 5) return '🏆 ¡Póker imperial! (cinco iguales)';
  if (mayor === 4) return '🎉 ¡Póker! (cuatro iguales)';
  if (mayor === 3 && segundo === 2) return '✨ ¡Full! (trío + pareja)';
  if (esEscalera) return '🪜 ¡Escalera!';
  if (mayor === 3) return '👍 Trío';
  if (mayor === 2 && segundo === 2) return '🤝 Doble pareja';
  if (mayor === 2) return '👌 Pareja';
  return '🍂 Nada (carta alta)';
}

export const pokerDados: Command = {
  data: new SlashCommandBuilder().setName('poker-dados').setDescription('Tira 5 dados y evalúa tu jugada de póker'),
  cooldown: 3,
  async execute(interaction) {
    const valores = [dado(), dado(), dado(), dado(), dado()];
    const jugada = evaluarPokerDados(valores);
    const dadosStr = valores.map(caraDado).join(' ');
    await interaction.reply({ embeds: [Embeds.primary('🎲 Póker de dados', `${dadosStr}\n\n**Jugada:** ${jugada}`)] });
  },
};

/* ------------------------------------------------------------------ */
/* /rolear-dados (exportado como rolearDados por el mismo motivo)      */
/* ------------------------------------------------------------------ */

const DADO_REGEX = /^\s*(\d{1,2})d(\d{1,3})(?:\s*\+\s*(\d{1,4}))?\s*$/i;

export const rolearDados: Command = {
  data: new SlashCommandBuilder()
    .setName('rolear-dados')
    .setDescription('Tira dados con formato NdM+K (p. ej. 2d6+3)')
    .addStringOption((o) => o.setName('dados').setDescription('Tirada: NdM opcional +K (p. ej. 2d6+3)').setRequired(true).setMaxLength(20)),
  cooldown: 3,
  async execute(interaction) {
    const crudo = interaction.options.getString('dados', true);
    const match = DADO_REGEX.exec(crudo);
    if (!match) {
      await interaction.reply({ embeds: [Embeds.error('Formato inválido', 'Usa el formato `NdM` con `+K` opcional, p. ej. `2d6+3`.')], ephemeral: true });
      return;
    }
    const n = Number(match[1]);
    const m = Number(match[2]);
    const k = Number(match[3] ?? '0');
    if (!Number.isInteger(n) || !Number.isInteger(m) || !Number.isInteger(k) || n < 1 || n > 20 || m < 2 || m > 100 || k < 0 || k > 1000) {
      await interaction.reply({ embeds: [Embeds.error('Valores inválidos', 'Usa 1-20 dados, caras de 2-100 y bono de 0-1000. P. ej. `2d6+3`.')], ephemeral: true });
      return;
    }
    const tiradas: number[] = [];
    for (let i = 0; i < n; i++) tiradas.push(Math.floor(Math.random() * m) + 1);
    const suma = tiradas.reduce((a, b) => a + b, 0);
    const total = suma + k;
    const detalle = tiradas.join(' + ');
    const bono = k > 0 ? ` + ${k}` : '';
    await interaction.reply({ embeds: [Embeds.primary('🎲 Tirada de dados', `**${n}d${m}${bono}**\n🎲 ${detalle}${bono}\n\n**Total:** **${total}**`)] });
  },
};

/* ------------------------------------------------------------------ */
/* /domino                                                             */
/* ------------------------------------------------------------------ */

const FICHA_DOMINO = ['⬜', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;

export const domino: Command = {
  data: new SlashCommandBuilder().setName('domino').setDescription('Roba una ficha de dominó aleatoria (0-0 a 6-6)'),
  cooldown: 3,
  async execute(interaction) {
    const a = Math.floor(Math.random() * 7);
    const b = Math.floor(Math.random() * 7);
    const total = a + b;
    const esDoble = a === b ? '\n🎯 ¡Es un **doble**!' : '';
    await interaction.reply({
      embeds: [Embeds.primary('🁫 Ficha de dominó', `**${FICHA_DOMINO[a]} | ${FICHA_DOMINO[b]}**  \`(${a} - ${b})\`\n\n**Valor total:** **${total} puntos**${esDoble}`)],
    });
  },
};

/* ------------------------------------------------------------------ */
/* /apertura                                                           */
/* ------------------------------------------------------------------ */

const APERTURAS: readonly { nombre: string; jugadas: string }[] = [
  { nombre: 'Apertura Ruy López', jugadas: '1. e4 e5 2. Cf3 Cc6 3. Ab5' },
  { nombre: 'Apertura Italiana', jugadas: '1. e4 e5 2. Cf3 Cc6 3. Ac4' },
  { nombre: 'Defensa Siciliana', jugadas: '1. e4 c5' },
  { nombre: 'Defensa Francesa', jugadas: '1. e4 e6 2. d4 d5' },
  { nombre: 'Defensa Caro-Kann', jugadas: '1. e4 c6 2. d4 d5' },
  { nombre: 'Gambito de Dama', jugadas: '1. d4 d5 2. c4' },
  { nombre: 'Defensa Eslava', jugadas: '1. d4 d5 2. c4 c6' },
  { nombre: 'Defensa India de Rey', jugadas: '1. d4 Cf6 2. c4 g6 3. Cc3 Ag7' },
  { nombre: 'Defensa Nimzoindia', jugadas: '1. d4 Cf6 2. c4 e6 3. Cc3 Ab4' },
  { nombre: 'Defensa India de Dama', jugadas: '1. d4 Cf6 2. c4 e6 3. Cf3 b6' },
  { nombre: 'Defensa Escandinava', jugadas: '1. e4 d5' },
  { nombre: 'Defensa Pirc', jugadas: '1. e4 d6 2. d4 Cf6 3. Cc3 g6' },
  { nombre: 'Gambito de Rey', jugadas: '1. e4 e5 2. f4' },
  { nombre: 'Defensa Petrov', jugadas: '1. e4 e5 2. Cf3 Cf6' },
  { nombre: 'Sistema Londres', jugadas: '1. d4 d5 2. Af4' },
  { nombre: 'Apertura Inglesa', jugadas: '1. c4' },
];

export const apertura: Command = {
  data: new SlashCommandBuilder().setName('apertura').setDescription('Muestra una apertura de ajedrez aleatoria'),
  cooldown: 3,
  async execute(interaction) {
    const ap = pick(APERTURAS);
    await interaction.reply({ embeds: [Embeds.primary('♟️ Apertura de ajedrez', `**${ap.nombre}**\n\`${ap.jugadas}\``)] });
  },
};

/* ------------------------------------------------------------------ */
/* /nombre-epico (exportado como nombreEpico por el mismo motivo)      */
/* ------------------------------------------------------------------ */

const NOMBRES_EPICOS: Record<string, { inicios: readonly string[]; finales: readonly string[]; titulo: string }> = {
  elfo: {
    inicios: ['Ael', 'Elar', 'Fael', 'Gal', 'Luth', 'Silv', 'Aer', 'Cele', 'El', 'Fin'],
    finales: ['iel', 'andil', 'orien', 'ien', 'athil', 'wen', 'mir', 'alas', 'ion', 'arel'],
    titulo: 'del Bosque Eterno',
  },
  enano: {
    inicios: ['Brom', 'Dur', 'Thor', 'Gim', 'Kaz', 'Bal', 'Grum', 'Snor', 'Dain', 'Fund'],
    finales: ['in', 'li', 'grim', 'din', 'bek', 'gar', 'son', 'dal', 'rin', 'mor'],
    titulo: 'Forjador de Montañas',
  },
  orco: {
    inicios: ['Grom', 'Morg', 'Shrak', 'Ug', 'Zog', 'Burz', 'Ghaz', 'Mok', 'Durg', 'Karg'],
    finales: ['gash', 'thak', 'muk', 'groth', 'nak', 'gore', 'bash', 'rok', 'zug', 'mar'],
    titulo: 'el Destructor',
  },
  mago: {
    inicios: ['Al', 'Mer', 'El', 'Mord', 'Zan', 'Xan', 'Vel', 'Ist', 'Sar', 'Rad'],
    finales: ['arius', 'eon', 'ifer', 'andar', 'emor', 'agar', 'isto', 'urel', 'amond', 'oculo'],
    titulo: 'el Sabio',
  },
};

export const nombreEpico: Command = {
  data: new SlashCommandBuilder()
    .setName('nombre-epico')
    .setDescription('Genera un nombre épico de fantasía')
    .addStringOption((o) =>
      o
        .setName('tipo')
        .setDescription('Tipo de personaje')
        .setRequired(true)
        .addChoices(
          { name: 'Elfo', value: 'elfo' },
          { name: 'Enano', value: 'enano' },
          { name: 'Orco', value: 'orco' },
          { name: 'Mago', value: 'mago' },
        ),
    ),
  cooldown: 3,
  async execute(interaction) {
    const tipo = interaction.options.getString('tipo', true);
    const banco = NOMBRES_EPICOS[tipo] ?? NOMBRES_EPICOS['elfo'];
    const nombre = `${pick(banco?.inicios ?? ['Al'])}${pick(banco?.finales ?? ['dor'])}`;
    await interaction.reply({ embeds: [Embeds.primary('⚔️ Nombre épico', `**${nombre}** ${banco?.titulo ?? ''}\n*Tipo:* ${tipo}`)] });
  },
};

/* ------------------------------------------------------------------ */
/* /mision                                                             */
/* ------------------------------------------------------------------ */

const MISION_VERBOS = ['Rescata', 'Recupera', 'Protege', 'Investiga', 'Derrota', 'Escolta', 'Encuentra', 'Destruye'] as const;
const MISION_OBJETIVOS = [
  'el amuleto perdido',
  'al herrero del pueblo',
  'la caravana de mercaderes',
  'el tomo ancestral',
  'al dragón dormido',
  'el portal mágico',
  'la cosecha sagrada',
  'al espía del reino vecino',
] as const;
const MISION_LUGARES = [
  'en el Bosque Sombrío',
  'en las Minas de Khazad',
  'en la Torre del Hechicero',
  'en las Ruinas Olvidadas',
  'en el Desierto Ardiente',
  'en la Cueva del Eco',
  'en el Castillo Abandonado',
  'en el Pantano de los Susurros',
] as const;
const MISION_RECOMPENSAS = [
  '100 monedas de oro',
  'una espada legendaria',
  'una armadura encantada',
  'un mapa del tesoro',
  'una poción de vida eterna',
  'el favor del rey',
  'un dragón como mascota',
  '500 monedas de plata',
] as const;

export const mision: Command = {
  data: new SlashCommandBuilder().setName('mision').setDescription('Recibe una misión RPG aleatoria'),
  cooldown: 3,
  async execute(interaction) {
    const texto = `**${pick(MISION_VERBOS)}** ${pick(MISION_OBJETIVOS)} ${pick(MISION_LUGARES)}.`;
    const recompensa = pick(MISION_RECOMPENSAS);
    await interaction.reply({ embeds: [Embeds.primary('🗺️ Nueva misión', `${texto}\n\n**Recompensa:** ${recompensa}`)] });
  },
};

/* ------------------------------------------------------------------ */
/* /hechizo                                                            */
/* ------------------------------------------------------------------ */

const HECHIZO_NOMBRES = [
  'Bola de Fuego',
  'Nova de Escarcha',
  'Rayo Arcano',
  'Muro de Piedra',
  'Tormenta Eléctrica',
  'Curación Lunar',
  'Velo de Sombras',
  'Llamas Fénix',
  'Prisión de Hielo',
  'Terremoto Menor',
  'Flecha de Luz',
  'Niebla Venenosa',
] as const;
const HECHIZO_EFECTOS = [
  'Inflige daño ardiente en área a todos los enemigos cercanos.',
  'Congela al objetivo y reduce su velocidad durante 3 turnos.',
  'Lanza un rayo de energía pura que atraviesa armaduras.',
  'Crea una barrera de roca que bloquea el próximo ataque.',
  'Invoca relámpagos que golpean a enemigos al azar.',
  'Restaura la salud de un aliado con luz de luna.',
  'Vuelve invisible al lanzador durante 2 turnos.',
  'Quema al enemigo y lo deja ardiendo varios turnos.',
  'Atrapa al objetivo en un bloque de hielo inmovilizador.',
  'Sacude el suelo y aturde a todos los enemigos.',
  'Dispara luz sagrada con daño extra contra no muertos.',
  'Envuelve la zona en niebla tóxica que daña cada turno.',
] as const;
const HECHIZO_COSTOS = ['5 de maná', '10 de maná', '15 de maná', '20 de maná', '25 de maná', '30 de maná', '40 de maná', '50 de maná'] as const;

export const hechizo: Command = {
  data: new SlashCommandBuilder().setName('hechizo').setDescription('Muestra un hechizo mágico aleatorio'),
  cooldown: 3,
  async execute(interaction) {
    const nombre = pick(HECHIZO_NOMBRES);
    const efecto = pick(HECHIZO_EFECTOS);
    const costo = pick(HECHIZO_COSTOS);
    await interaction.reply({ embeds: [Embeds.primary('🔮 Hechizo', `**${nombre}**\n${efecto}\n\n**Costo:** ${costo}`)] });
  },
};

/* ------------------------------------------------------------------ */
/* /zodiaco-chino (exportado como zodiacoChino por el mismo motivo)    */
/* ------------------------------------------------------------------ */

const ANIMALES_CHINOS: readonly { nombre: string; rasgo: string }[] = [
  { nombre: 'Rata', rasgo: 'Ingeniosa, rápida y con gran olfato para las oportunidades.' },
  { nombre: 'Buey', rasgo: 'Trabajador, honesto y perseverante hasta lograr su meta.' },
  { nombre: 'Tigre', rasgo: 'Valiente, apasionado y líder natural.' },
  { nombre: 'Conejo', rasgo: 'Amable, tranquilo y de trato elegante.' },
  { nombre: 'Dragón', rasgo: 'Carismático, ambicioso y lleno de energía.' },
  { nombre: 'Serpiente', rasgo: 'Sabia, intuitiva y de mente profunda.' },
  { nombre: 'Caballo', rasgo: 'Libre, enérgico y amante de la aventura.' },
  { nombre: 'Cabra', rasgo: 'Creativa, sensible y de gran corazón.' },
  { nombre: 'Mono', rasgo: 'Ingenioso, divertido y gran solucionador de problemas.' },
  { nombre: 'Gallo', rasgo: 'Observador, puntual y de gran confianza.' },
  { nombre: 'Perro', rasgo: 'Leal, honesto y protector de los suyos.' },
  { nombre: 'Cerdo', rasgo: 'Generoso, sincero y amante de la buena vida.' },
];

export const zodiacoChino: Command = {
  data: new SlashCommandBuilder()
    .setName('zodiaco-chino')
    .setDescription('Descubre tu animal del horóscopo chino según tu año')
    .addIntegerOption((o) => o.setName('anio').setDescription('Año de nacimiento (1900-2100)').setRequired(true).setMinValue(1900).setMaxValue(2100)),
  cooldown: 3,
  async execute(interaction) {
    const anio = interaction.options.getInteger('anio', true);
    const indice = (((anio - 4) % 12) + 12) % 12;
    const animal = ANIMALES_CHINOS[indice] ?? ANIMALES_CHINOS[0];
    await interaction.reply({
      embeds: [Embeds.primary('🐉 Zodiaco chino', `Año **${anio}** → **${animal?.nombre ?? 'Desconocido'}**\n\n*${animal?.rasgo ?? ''}*`)],
    });
  },
};
