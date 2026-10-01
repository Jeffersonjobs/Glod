/**
 * Vida exprés: /hora /saludo /confesion /refran /trabalenguas /frase-anime /dino
 * Comandos individuales 100% locales, sin APIs externas ni base de datos.
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/* ------------------------------------------------------------------ */
/* /hora                                                               */
/* ------------------------------------------------------------------ */

const ZONAS: readonly { etiqueta: string; tz: string }[] = [
  { etiqueta: 'Madrid', tz: 'Europe/Madrid' },
  { etiqueta: 'Ciudad de México', tz: 'America/Mexico_City' },
  { etiqueta: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires' },
  { etiqueta: 'Bogotá', tz: 'America/Bogota' },
  { etiqueta: 'Lima', tz: 'America/Lima' },
  { etiqueta: 'Los Ángeles', tz: 'America/Los_Angeles' },
];

export const hora: Command = {
  data: new SlashCommandBuilder().setName('hora').setDescription('Muestra la hora actual en varias zonas horarias'),
  cooldown: 3,
  async execute(interaction) {
    const ahora = new Date();
    const lineas = ZONAS.map(({ etiqueta, tz }) => {
      const horaFmt = new Intl.DateTimeFormat('es-ES', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
      const fechaFmt = new Intl.DateTimeFormat('es-ES', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric' });
      return `• **${etiqueta}** — ${horaFmt.format(ahora)} (${fechaFmt.format(ahora)})`;
    });
    await interaction.reply({ embeds: [Embeds.primary('🕒 Hora actual en el mundo', lineas.join('\n'))] });
  },
};

/* ------------------------------------------------------------------ */
/* /saludo                                                             */
/* ------------------------------------------------------------------ */

type Franja = 'madrugada' | 'mañana' | 'tarde' | 'noche';

const SALUDOS: Record<Franja, readonly string[]> = {
  madrugada: [
    '¿Trasnochando? Que la calma de la madrugada te acompañe. 🌙',
    'A estas horas solo los búhos y los valientes andan despiertos. 🦉',
    'La madrugada es para soñar despierto. ¡Ánimo! ✨',
    'Shh… el mundo duerme, pero tú sigues en pie. ¡Grande! 🌌',
    'Un café y a seguir: la madrugada también cuenta. ☕',
    'Que las estrellas te cuiden hasta el amanecer. ⭐',
    'Madrugador o noctámbulo, ¡qué gusto verte por aquí! 🌠',
  ],
  mañana: [
    '¡Que tengas un día espectacular lleno de buenas noticias! ☀️',
    'Café en mano y a conquistar el día. ¡Tú puedes! 💪',
    'Hoy es un gran día para empezar algo nuevo. 🌱',
    'Sonríe, que la mañana te sienta de maravilla. 😄',
    'Que no falte la energía ni la buena compañía hoy. 🤗',
    'Desayuna fuerte y brilla más que el sol. 🥐',
    'Nueva mañana, nuevas oportunidades. ¡A por ellas! 🚀',
  ],
  tarde: [
    '¡Que tu tarde esté llena de buenas vibras! 🌤️',
    'Hora de la merienda: recarga pilas y sigue brillando. 🍪',
    'La tarde es joven y tú más. ¡Disfrútala! 😎',
    'Un descanso a tiempo hace la tarde perfecta. 🛋️',
    'Que el resto del día te trate tan bien como te mereces. 🌻',
    'Tarde de logros: vas por muy buen camino. 🏅',
    'Respira hondo y sigue: ya queda menos para descansar. 🍃',
  ],
  noche: [
    '¡Que tengas una noche tranquila y reparadora! 🌙',
    'Hora de desconectar y soñar bonito. 😴',
    'Las mejores ideas nacen bajo la luna. 🌕',
    'Que la noche te traiga paz y buenos sueños. 💤',
    'Cena rico y descansa: mañana será otro gran día. 🍲',
    'Bajo el manto de la noche, todo es posible. ✨',
    'Apaga las luces y enciende los sueños. 🛏️',
  ],
};

const TITULOS_SALUDO: Record<Franja, string> = {
  madrugada: '¡Buenas madrugadas!',
  mañana: '¡Buenos días!',
  tarde: '¡Buenas tardes!',
  noche: '¡Buenas noches!',
};

function franjaActual(horaLocal: number): Franja {
  if (horaLocal >= 6 && horaLocal < 12) return 'mañana';
  if (horaLocal >= 12 && horaLocal < 20) return 'tarde';
  if (horaLocal >= 20) return 'noche';
  return 'madrugada';
}

export const saludo: Command = {
  data: new SlashCommandBuilder()
    .setName('saludo')
    .setDescription('Saluda a alguien según la hora del día')
    .addUserOption((o) => o.setName('usuario').setDescription('Persona a la que saludar')),
  cooldown: 3,
  async execute(interaction) {
    const objetivo = interaction.options.getUser('usuario') ?? interaction.user;
    const franja = franjaActual(new Date().getHours());
    const frase = pick(SALUDOS[franja]);
    await interaction.reply({ embeds: [Embeds.primary(`${TITULOS_SALUDO[franja]} ${objetivo}`, frase)] });
  },
};

/* ------------------------------------------------------------------ */
/* /confesion                                                          */
/* ------------------------------------------------------------------ */

export const confesion: Command = {
  data: new SlashCommandBuilder()
    .setName('confesion')
    .setDescription('Publica una confesión de forma totalmente anónima')
    .addStringOption((o) => o.setName('texto').setDescription('Tu confesión anónima').setRequired(true).setMaxLength(500)),
  cooldown: 3,
  async execute(interaction) {
    const texto = interaction.options.getString('texto', true);
    const anonimo = Embeds.primary('🤫 Confesión anónima', `> ${texto}`);
    await interaction.reply({ embeds: [anonimo] });
    await interaction.followUp({ embeds: [Embeds.success('Publicada', 'Tu confesión se ha publicado de forma anónima.')], ephemeral: true });
  },
};

/* ------------------------------------------------------------------ */
/* /refran                                                             */
/* ------------------------------------------------------------------ */

const REFRANES: readonly { texto: string; significado: string }[] = [
  { texto: 'A caballo regalado no se le mira el diente.', significado: 'Acepta los regalos sin criticarlos.' },
  { texto: 'No dejes para mañana lo que puedes hacer hoy.', significado: 'No procrastines tus tareas.' },
  { texto: 'Dime con quién andas y te diré quién eres.', significado: 'Tus compañías dicen mucho de ti.' },
  { texto: 'En boca cerrada no entran moscas.', significado: 'A veces es mejor guardar silencio.' },
  { texto: 'El que madruga, Dios lo ayuda.', significado: 'Levantarse temprano trae recompensas.' },
  { texto: 'Perro ladrador, poco mordedor.', significado: 'Quien mucho amenaza, poco hace.' },
  { texto: 'No hay mal que cien años dure.', significado: 'Todo problema termina tarde o temprano.' },
  { texto: 'A lo hecho, pecho.', significado: 'Asume las consecuencias de tus actos.' },
  { texto: 'Cría cuervos y te sacarán los ojos.', significado: 'Cuidado con ayudar a quien puede traicionarte.' },
  { texto: 'Del dicho al hecho hay mucho trecho.', significado: 'Hablar es fácil, actuar cuesta.' },
  { texto: 'El hábito no hace al monje.', significado: 'Las apariencias engañan.' },
  { texto: 'Más vale pájaro en mano que ciento volando.', significado: 'Valora lo seguro frente a lo incierto.' },
  { texto: 'Quien siembra vientos recoge tempestades.', significado: 'Las malas acciones traen malas consecuencias.' },
  { texto: 'A palabras necias, oídos sordos.', significado: 'Ignora las provocaciones sin sentido.' },
  { texto: 'Ojos que no ven, corazón que no siente.', significado: 'Lo que se ignora no duele.' },
  { texto: 'Cuando el río suena, agua lleva.', significado: 'Los rumores suelen tener algo de verdad.' },
  { texto: 'No juzgues un libro por su portada.', significado: 'No te dejes llevar por las apariencias.' },
  { texto: 'Quien todo lo quiere, todo lo pierde.', significado: 'La avaricia puede dejarte sin nada.' },
  { texto: 'En casa del herrero, cuchillo de palo.', significado: 'A veces falta en casa lo que se ofrece fuera.' },
  { texto: 'El que mucho abarca, poco aprieta.', significado: 'No intentes hacer demasiadas cosas a la vez.' },
  { texto: 'A falta de pan, buenas son tortas.', significado: 'Confórmate con lo que hay cuando falta lo mejor.' },
  { texto: 'Barriga llena, corazón contento.', significado: 'Comer bien pone de buen humor.' },
  { texto: 'Cada oveja con su pareja.', significado: 'Cada persona encaja con alguien afín.' },
  { texto: 'Dios aprieta pero no ahoga.', significado: 'Siempre hay salida en los malos momentos.' },
  { texto: 'El saber no ocupa lugar.', significado: 'Aprender nunca está de más.' },
  { texto: 'Hablando del rey de Roma, por la puerta asoma.', significado: 'Se dice cuando alguien aparece al mencionarlo.' },
];

export const refran: Command = {
  data: new SlashCommandBuilder().setName('refran').setDescription('Muestra un refrán español aleatorio con su significado'),
  cooldown: 3,
  async execute(interaction) {
    const r = pick(REFRANES);
    await interaction.reply({ embeds: [Embeds.primary('📜 Refrán del día', `*“${r.texto}”*\n\n**Significado:** ${r.significado}`)] });
  },
};

/* ------------------------------------------------------------------ */
/* /trabalenguas                                                       */
/* ------------------------------------------------------------------ */

const TRABALENGUAS: readonly { texto: string; nivel: string }[] = [
  { texto: 'Tres tristes tigres tragaban trigo en un trigal.', nivel: 'Fácil' },
  { texto: 'El cielo está enladrillado, ¿quién lo desenladrillará?', nivel: 'Media' },
  { texto: 'Pablito clavó un clavito en la calva de un calvito.', nivel: 'Fácil' },
  { texto: 'El perro de San Roque no tiene rabo porque Ramón Ramírez se lo ha cortado.', nivel: 'Media' },
  { texto: 'Cuando cuentes cuentos, cuenta cuántos cuentos cuentas.', nivel: 'Media' },
  { texto: 'La sucesión sucesiva de sucesos sucede sucesivamente.', nivel: 'Difícil' },
  { texto: 'Me han dicho que has dicho un dicho que he dicho yo.', nivel: 'Media' },
  { texto: 'El hipopótamo Hipo está con hipo, ¿quién le quita el hipo al hipopótamo Hipo?', nivel: 'Media' },
  { texto: 'Si la serpiente serena se hubiera desenSerenado, otro gallo cantaría.', nivel: 'Difícil' },
  { texto: 'Erre con erre, guitarra; erre con erre, barril; rápido ruedan los carros cargados de azúcar al ferrocarril.', nivel: 'Difícil' },
  { texto: 'Pepe puso un peso en el piso del pozo.', nivel: 'Fácil' },
  { texto: 'Como poco coco como, poco coco compro.', nivel: 'Fácil' },
  { texto: 'El arzobispo de Constantinopla se quiere desarzobispoconstantinopolizar.', nivel: 'Difícil' },
  { texto: 'Una cacatúa cacareaba y un cacahuero cacahueaba.', nivel: 'Media' },
  { texto: 'Si tu gusto gustara del gusto que gusta mi gusto, mi gusto gustaría del gusto que gusta tu gusto.', nivel: 'Difícil' },
  { texto: 'Tengo una gallina pinta, piririnca, piriranca, rubia y titiblanca.', nivel: 'Media' },
  { texto: 'El que poco coco come, poco coco compra.', nivel: 'Fácil' },
  { texto: 'Parra tenía una perra y Guerra tenía una parra. La perra de Parra subió a la parra de Guerra.', nivel: 'Media' },
  { texto: 'El desparramador que lo desparrame, buen desparramador será.', nivel: 'Difícil' },
  { texto: 'Yo no quiero que me quieras porque no te quiero querer.', nivel: 'Fácil' },
];

export const trabalenguas: Command = {
  data: new SlashCommandBuilder().setName('trabalenguas').setDescription('Muestra un trabalenguas aleatorio con su dificultad'),
  cooldown: 3,
  async execute(interaction) {
    const t = pick(TRABALENGUAS);
    await interaction.reply({ embeds: [Embeds.primary('👅 Trabalenguas', `*“${t.texto}”*\n\n**Dificultad:** ${t.nivel}\n¡Intenta decirlo 3 veces rápido!`)] });
  },
};

/* ------------------------------------------------------------------ */
/* /frase-anime (exportado como fraseAnime: los guiones no son válidos */
/* en identificadores; el loader registra por data.name)               */
/* ------------------------------------------------------------------ */

const FRASES_ANIME: readonly { frase: string; personaje: string; serie: string }[] = [
  { frase: 'No importa lo difícil que sea, nunca dejaré de avanzar.', personaje: 'Naruto Uzumaki', serie: 'Naruto' },
  { frase: 'Seré el Rey de los Piratas.', personaje: 'Monkey D. Luffy', serie: 'One Piece' },
  { frase: 'Incluso en los momentos más oscuros, sigue caminando.', personaje: 'Goku', serie: 'Dragon Ball' },
  { frase: 'Si no arriesgas nada, no ganarás nada.', personaje: 'Eren Jaeger', serie: 'Shingeki no Kyojin' },
  { frase: 'El poder sin control no sirve de nada.', personaje: 'Lelouch Lamperouge', serie: 'Code Geass' },
  { frase: 'Proteger a los que amo es mi forma de ser fuerte.', personaje: 'Ichigo Kurosaki', serie: 'Bleach' },
  { frase: 'Un corazón herido puede volverse más fuerte.', personaje: 'Edward Elric', serie: 'Fullmetal Alchemist' },
  { frase: 'La amistad es el poder más grande de todos.', personaje: 'Natsu Dragneel', serie: 'Fairy Tail' },
  { frase: 'No llores por lo perdido, lucha por lo que queda.', personaje: 'Naruto Uzumaki', serie: 'Naruto' },
  { frase: 'Los sueños nunca mueren si crees en ellos.', personaje: 'Usopp', serie: 'One Piece' },
  { frase: 'La verdadera fuerza nace de proteger a otros.', personaje: 'All Might', serie: 'My Hero Academia' },
  { frase: 'Cada derrota es una lección para la victoria.', personaje: 'Vegeta', serie: 'Dragon Ball' },
  { frase: 'No necesito un motivo para ayudar a un amigo.', personaje: 'Zoro Roronoa', serie: 'One Piece' },
  { frase: 'El miedo es solo una prueba que debes superar.', personaje: 'Deku', serie: 'My Hero Academia' },
  { frase: 'Mientras tenga aliento, no me rendiré.', personaje: 'Tanjiro Kamado', serie: 'Kimetsu no Yaiba' },
  { frase: 'El pasado duele, pero te hace más fuerte.', personaje: 'Gaara', serie: 'Naruto' },
  { frase: 'Cree en ti mismo y todo será posible.', personaje: 'Kamina', serie: 'Gurren Lagann' },
  { frase: 'La justicia sin poder es inútil.', personaje: 'Levi Ackerman', serie: 'Shingeki no Kyojin' },
  { frase: 'Sonríe incluso cuando el mundo se derrumbe.', personaje: 'Gon Freecss', serie: 'Hunter x Hunter' },
  { frase: 'El esfuerzo supera al talento cuando el talento no se esfuerza.', personaje: 'Rock Lee', serie: 'Naruto' },
];

export const fraseAnime: Command = {
  data: new SlashCommandBuilder().setName('frase-anime').setDescription('Muestra una cita de anime aleatoria en español'),
  cooldown: 3,
  async execute(interaction) {
    const c = pick(FRASES_ANIME);
    await interaction.reply({ embeds: [Embeds.primary('🎌 Frase de anime', `*“${c.frase}”*\n\n**Personaje:** ${c.personaje}\n**Serie:** ${c.serie}`)] });
  },
};

/* ------------------------------------------------------------------ */
/* /dino                                                               */
/* ------------------------------------------------------------------ */

const DINOS: readonly { nombre: string; dato: string; emoji: string }[] = [
  { nombre: 'Tiranosaurio rex', dato: 'Sus dientes medían hasta 30 cm y su mordida era la más fuerte de cualquier animal terrestre.', emoji: '🦖' },
  { nombre: 'Triceratops', dato: 'Tenía tres cuernos y una gola ósea que podía medir 2 metros de ancho.', emoji: '🦕' },
  { nombre: 'Velociraptor', dato: 'Era del tamaño de un pavo y probablemente tenía plumas como las aves.', emoji: '🦖' },
  { nombre: 'Braquiosaurio', dato: 'Podía pesar 40 toneladas, como 8 elefantes juntos.', emoji: '🦕' },
  { nombre: 'Estegosaurio', dato: 'Tenía el cerebro del tamaño de una nuez pese a medir 9 metros.', emoji: '🦕' },
  { nombre: 'Diplodocus', dato: 'Usaba su cola larguísima como látigo para defenderse.', emoji: '🦕' },
  { nombre: 'Espinosaurio', dato: 'Era más grande que el T. rex y cazaba peces gigantes en los ríos.', emoji: '🦖' },
  { nombre: 'Anquilosaurio', dato: 'Su cola terminaba en una maza ósea capaz de romper huesos.', emoji: '🦕' },
  { nombre: 'Parasaurolophus', dato: 'Su cresta hueca funcionaba como una trompeta para comunicarse.', emoji: '🦕' },
  { nombre: 'Alosaurio', dato: 'Fue el gran depredador del Jurásico, millones de años antes del T. rex.', emoji: '🦖' },
  { nombre: 'Carnotauro', dato: 'Tenía dos cuernos sobre los ojos como un toro y brazos diminutos.', emoji: '🦖' },
  { nombre: 'Galimimo', dato: 'Podía correr a 60 km/h, casi como un avestruz moderno.', emoji: '🦕' },
  { nombre: 'Iguanodonte', dato: 'Tenía un espolón en forma de pulgar para defenderse y agarrar plantas.', emoji: '🦕' },
  { nombre: 'Paquicefalosaurio', dato: 'Su cráneo de 25 cm de grosor servía para embestir como un carnero.', emoji: '🦕' },
  { nombre: 'Argentinosaurio', dato: 'Con 35 metros de largo, es uno de los animales más grandes que existieron.', emoji: '🦕' },
  { nombre: 'Dilofosaurio', dato: 'Tenía dos crestas gemelas en la cabeza, aunque no escupía veneno como en el cine.', emoji: '🦖' },
  { nombre: 'Oviraptor', dato: 'Su nombre significa «ladrón de huevos», pero en realidad cuidaba su propio nido.', emoji: '🦖' },
  { nombre: 'Terizinosaurio', dato: 'Tenía garras de 1 metro, las más largas de cualquier animal conocido.', emoji: '🦖' },
  { nombre: 'Maiasaura', dato: 'Su nombre significa «lagarto buena madre» porque cuidaba a sus crías.', emoji: '🦕' },
  { nombre: 'Compsognathus', dato: 'Era del tamaño de un pollo: uno de los dinosaurios más pequeños.', emoji: '🦖' },
];

export const dino: Command = {
  data: new SlashCommandBuilder().setName('dino').setDescription('Muestra un dato curioso aleatorio sobre dinosaurios'),
  cooldown: 3,
  async execute(interaction) {
    const d = pick(DINOS);
    await interaction.reply({ embeds: [Embeds.primary(`${d.emoji} ${d.nombre}`, d.dato)] });
  },
};
