/**
 * Diversión: /diversion <20 subcomandos divertidos 100% locales, sin APIs externas>.
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Percent 0-100 derived deterministically from a seed (stable per user). */
function seededPercent(seed: string): number {
  return hashStr(seed) % 101;
}

function bar(pct: number, len = 10): string {
  const filled = Math.round((pct / 100) * len);
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

const EIGHTBALL: readonly string[] = [
  'Sí, definitivamente.',
  'Sin duda alguna.',
  'Puedes contar con ello.',
  'Lo más probable.',
  'Sí.',
  'Las señales apuntan a que sí.',
  'Respuesta confusa, pregunta de nuevo.',
  'Pregunta de nuevo más tarde.',
  'Mejor no decirte ahora.',
  'No puedo predecirlo ahora.',
  'Concéntrate y pregunta de nuevo.',
  'No cuentes con ello.',
  'Mi respuesta es no.',
  'Mis fuentes dicen que no.',
  'Las perspectivas no son buenas.',
  'Muy dudoso.',
  'Obvio que sí. 😎',
  'Ni lo sueñes.',
  'Los astros dicen que sí. ✨',
  'Mejor pregúntale a tu almohada. 😴',
];

const MEMES: readonly string[] = [
  'Yo: me acuesto temprano. También yo a las 3am: ¿y si los pingüinos tienen rodillas?',
  'Mi plan de ahorro: no gastar. Mi plan real: tacos. 🌮',
  'Lunes: existo. Martes: resisto. Viernes: ¡revivo! 🎉',
  'Mi código funciona y no sé por qué. No lo toquen. 😅',
  'Dije "solo un capítulo más" hace 4 temporadas.',
  'Mi cartera y yo tenemos una relación a distancia.',
  'El gym me extraña, yo al gym no. 🏋️',
  'Adulto independiente: lloro pero pago mis cuentas. 💸',
  'Mi PC: 16GB RAM. Yo abriendo 47 pestañas: a ver qué pasa.',
  'Cuando por fin entiendes el chiste 3 horas después. 🧠',
  '"Estoy en camino" = sigo en pijama.',
  'Mi planta murió de sed mientras yo tomaba mi tercer café. ☕',
  'Procrastinar hoy lo dejo para mañana.',
  'Soy multitarea: me estreso por varias cosas a la vez.',
  'El WiFi se cae justo en la mejor parte. Siempre. 📶',
];

const JOKES: readonly string[] = [
  '¿Qué hace una abeja en el gimnasio? ¡Zum-ba! 🐝',
  '¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter. 🐦',
  '¿Qué le dice un semáforo a otro? No me mires, me estoy cambiando. 🚦',
  '¿Cómo se llama el campeón de buceo japonés? Tokofondo. 🏊',
  '¿Qué hace un moco en una fiesta? ¡Se pega a la pared! 🥳',
  '¿Por qué los científicos no confían en los átomos? ¡Porque lo componen todo! ⚛️',
  'Le dije a mi ordenador que necesitaba un respiro... ¡y se puso en modo suspensión! 💻',
  '¿Por qué ganó un premio el espantapájaros? ¡Porque era sobresaliente en su campo! 🌾',
  '¿Qué le dice el 0 al 8? ¡Bonito cinturón! ⓼',
  '¿Por qué el libro de matemáticas lloraba? Tenía demasiados problemas. 📐',
  '¿Cómo se llaman unos espaguetis falsos? ¡Im-pasta! 🍝',
  '¿Cómo se despiden los químicos? Ácido un placer. 🧪',
  '¿Qué es un pez en el cine? ¡Un mero espectador! 🐟',
  'Las líneas paralelas tienen tanto en común... Lástima que nunca se encontrarán. 📏',
  '¿Por qué la computadora fue al doctor? Tenía un virus. 🤒',
];

const QUOTES: readonly { text: string; author: string }[] = [
  { text: 'Sé el cambio que quieres ver en el mundo.', author: 'Mahatma Gandhi' },
  { text: 'La imaginación es más importante que el conocimiento.', author: 'Albert Einstein' },
  { text: 'Lo que no me mata, me hace más fuerte.', author: 'Friedrich Nietzsche' },
  { text: 'La vida es lo que pasa mientras estás ocupado haciendo otros planes.', author: 'John Lennon' },
  { text: 'El éxito es ir de fracaso en fracaso sin perder el entusiasmo.', author: 'Winston Churchill' },
  { text: 'Haz hoy lo que otros no quieren y mañana vivirás lo que otros no pueden.', author: 'Anónimo' },
  { text: 'No cuentes los días, haz que los días cuenten.', author: 'Muhammad Ali' },
  { text: 'La mejor forma de predecir el futuro es crearlo.', author: 'Peter Drucker' },
  { text: 'Cree que puedes y ya estás a medio camino.', author: 'Theodore Roosevelt' },
  { text: 'Todo lo que siempre quisiste está al otro lado del miedo.', author: 'George Addair' },
  { text: 'La felicidad no es algo hecho. Viene de tus propias acciones.', author: 'Dalai Lama' },
  { text: 'El único modo de hacer un gran trabajo es amar lo que haces.', author: 'Steve Jobs' },
];

const FACTS: readonly string[] = [
  '🍯 La miel nunca caduca: se han encontrado tarros comestibles en tumbas egipcias.',
  '🐙 Los pulpos tienen tres corazones y sangre azul.',
  '🍌 Las bananas son bayas, pero las fresas no lo son (botánicamente).',
  '🦩 Los flamencos son rosas por los pigmentos de lo que comen.',
  '🌙 La Luna se aleja de la Tierra unos 3.8 cm cada año.',
  '🐝 Las abejas pueden reconocer rostros humanos.',
  '🧠 Tu cerebro genera electricidad suficiente para encender una bombilla pequeña.',
  '🦒 Las jirafas duermen menos de 2 horas al día.',
  '🌊 El 80% del océano sigue sin explorarse.',
  '🍍 Las piñas tardan unos 2 años en crecer.',
  '🐘 Los elefantes son de los pocos animales que se reconocen en un espejo.',
  '⚡ Un rayo es 5 veces más caliente que la superficie del Sol.',
  '🦷 El esmalte dental es la sustancia más dura del cuerpo humano.',
  '🐌 Algunos caracoles pueden dormir hasta 3 años.',
  '📚 La biblioteca más grande del mundo (EE.UU.) tiene más de 170 millones de piezas.',
];

const ROASTS: readonly string[] = [
  'Eres como el WiFi del vecino: apareces, pero nadie te quiere usar. 📶',
  'Tienes el carisma de una contraseña temporal. 🔑',
  'Eres la razón por la que existe el botón "omitir intro". ⏭️',
  'Tu nivel de energía es "lunes a las 7am". 🥱',
  'Eres como un tutorial sin botón de saltar. 📖',
  'Google te buscaría y preguntaría "¿quisiste decir alguien interesante?". 🔍',
  'Eres el "aceptar cookies" de la vida: todos te ignoran. 🍪',
  'Tienes menos chispa que un encendedor mojado. 💧',
  'Eres como el anuncio antes del video: inevitable pero nadie te espera. 📺',
  'Tu aura es "modo avión". ✈️',
  'Eres el captcha que nadie logra pasar a la primera. 🤖',
  'Tienes el misterio de un calcetín perdido. 🧦',
  'Eres como el clima: todos hablan de ti pero nadie hace nada. 🌦️',
  'Tu batería social está al 1%... permanentemente. 🔋',
  'Eres el DLC que nadie compró. 🎮',
];

const COMPLIMENTS: readonly string[] = [
  '¡Tienes una energía que ilumina cualquier canal! ✨',
  'Tu creatividad no tiene límites. 🎨',
  'Eres de esas personas que hacen mejor el día de todos. ☀️',
  '¡Tu sentido del humor es legendario! 😄',
  'Tienes un corazón enorme. 💛',
  'Siempre aportas algo genial a la conversación. 💬',
  '¡Eres más brillante que un creeper cargado! ⚡',
  'Tu amabilidad es contagiosa. 🤗',
  'Tienes el don de hacer reír cuando más se necesita. 🎭',
  '¡Eres una estrella de este servidor! ⭐',
  'Tu positividad es inspiradora. 🌈',
  'Haces que todo sea más divertido. 🎉',
  '¡Tienes un talento increíble! 🏆',
  'Eres genial tal como eres. 💪',
  'El servidor es mejor contigo aquí. 💜',
];

const ADVICES: readonly string[] = [
  '💧 Toma un vaso de agua. Tu yo del futuro te lo agradecerá.',
  '😴 Duerme 8 horas: los problemas se ven distintos descansado.',
  '🚶 Sal a caminar 10 minutos sin el móvil.',
  '📝 Escribe 3 cosas buenas de tu día antes de dormir.',
  '🧘 Respira profundo 4 segundos, aguanta 4, suelta 4.',
  '📵 Desactiva las notificaciones una hora al día.',
  '📚 Lee 10 páginas de algo que te guste.',
  '🤝 Llama a alguien que aprecias, sin motivo.',
  '🎯 Haz primero la tarea más difícil del día.',
  '💰 Ahorra aunque sea poco: el hábito importa más que la cantidad.',
  '🧹 Ordena tu escritorio: mente despejada, espacio despejado.',
  '🍎 Come algo de verdad, no solo snacks.',
  '⏰ Acuéstate 30 minutos antes esta noche.',
  '💬 Pide ayuda cuando la necesites: no es debilidad.',
  '🌱 Aprende algo nuevo cada semana, aunque sea pequeño.',
];

const FORTUNES: readonly string[] = [
  '🥠 Una gran oportunidad tocará tu puerta esta semana.',
  '🥠 Alguien piensa en ti con una sonrisa ahora mismo.',
  '🥠 El esfuerzo de hoy será la risa de mañana.',
  '🥠 Un mensaje inesperado te alegrará el día.',
  '🥠 Confía en tu intuición: rara vez se equivoca.',
  '🥠 La suerte favorece a quien comparte memes.',
  '🥠 Pronto recibirás buenas noticias.',
  '🥠 Un pequeño cambio traerá una gran alegría.',
  '🥠 Tu paciencia será recompensada muy pronto.',
  '🥠 Ríe hoy: el universo ríe contigo.',
  '🥠 Un amigo te necesita: escríbele.',
  '🥠 Lo que buscas también te está buscando.',
  '🥠 Esta semana es perfecta para empezar algo nuevo.',
  '🥠 Tu creatividad abrirá puertas inesperadas.',
  '🥠 La fortuna sonríe a los que madrugan... o a los que desayunan bien.',
];

const EMOJI_SET: readonly string[] = [
  '😀', '😎', '🤖', '👾', '🎃', '🔥', '🌈', '⚡', '🍕', '🌮',
  '🐱', '🐶', '🦊', '🐼', '🦄', '🐸', '🍩', '⚽', '🎮', '🚀',
];

const HEX_DIGITS = '0123456789ABCDEF';

function auraLevel(points: number): string {
  if (points >= 9000) return '🌟 Legendario';
  if (points >= 7000) return '💎 Épico';
  if (points >= 5000) return '🔥 Imparable';
  if (points >= 3000) return '⚡ Radiante';
  if (points >= 1000) return '✨ Brillante';
  return '🌱 En crecimiento';
}

export const fun: Command = {
  data: new SlashCommandBuilder()
    .setName('diversion')
    .setDescription('Comandos divertidos 100% locales')
    .addSubcommand((s) =>
      s.setName('bola-8').setDescription('Pregunta a la bola mágica').addStringOption((o) => o.setName('pregunta').setDescription('Tu pregunta').setRequired(true).setMaxLength(300)),
    )
    .addSubcommand((s) => s.setName('moneda').setDescription('Lanza una moneda'))
    .addSubcommand((s) =>
      s.setName('dado').setDescription('Lanza un dado').addIntegerOption((o) => o.setName('caras').setDescription('Caras del dado (2-100)').setMinValue(2).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s
        .setName('aleatorio')
        .setDescription('Número aleatorio en un rango')
        .addIntegerOption((o) => o.setName('minimo').setDescription('Mínimo'))
        .addIntegerOption((o) => o.setName('maximo').setDescription('Máximo')),
    )
    .addSubcommand((s) => s.setName('meme').setDescription('Meme de texto aleatorio'))
    .addSubcommand((s) => s.setName('chiste').setDescription('Chiste aleatorio'))
    .addSubcommand((s) => s.setName('cita').setDescription('Cita inspiradora aleatoria'))
    .addSubcommand((s) => s.setName('dato').setDescription('Dato curioso aleatorio'))
    .addSubcommand((s) =>
      s.setName('vacile').setDescription('Vacile suave y sano (sin insultos)').addUserOption((o) => o.setName('objetivo').setDescription('A quién vacilar')),
    )
    .addSubcommand((s) =>
      s.setName('cumplido').setDescription('Haz un cumplido').addUserOption((o) => o.setName('objetivo').setDescription('A quién halagar')),
    )
    .addSubcommand((s) =>
      s
        .setName('pareja')
        .setDescription('Compatibilidad amorosa entre dos usuarios')
        .addUserOption((o) => o.setName('usuario1').setDescription('Primera persona').setRequired(true))
        .addUserOption((o) => o.setName('usuario2').setDescription('Segunda persona')),
    )
    .addSubcommand((s) =>
      s.setName('amor').setDescription('Nivel de amor propio (divertido)').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('cuanto-molas').setDescription('¿Cuánto molas?').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('nivel-despiste').setDescription('Nivel de despiste (sano y divertido)').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('calificar').setDescription('Califica algo del 0 al 10').addStringOption((o) => o.setName('cosa').setDescription('Qué quieres calificar').setRequired(true).setMaxLength(200)),
    )
    .addSubcommand((s) => s.setName('consejo').setDescription('Consejo aleatorio'))
    .addSubcommand((s) => s.setName('galleta-fortuna').setDescription('Galleta de la fortuna'))
    .addSubcommand((s) => s.setName('color-aleatorio').setDescription('Color aleatorio'))
    .addSubcommand((s) => s.setName('combo-emojis').setDescription('Combo de 3 emojis aleatorios'))
    .addSubcommand((s) =>
      s.setName('aura').setDescription('Mide el aura de alguien').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    ),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'bola-8': {
        const question = interaction.options.getString('pregunta', true);
        await interaction.reply({ embeds: [Embeds.primary('🎱 Bola mágica', `**Pregunta:** ${question}\n**Respuesta:** ${pick(EIGHTBALL)}`)] });
        return;
      }
      case 'moneda': {
        const result = Math.random() < 0.5 ? '🪙 ¡Cara!' : '🪙 ¡Cruz!';
        await interaction.reply({ embeds: [Embeds.primary('Moneda', result)] });
        return;
      }
      case 'dado': {
        const sides = interaction.options.getInteger('caras') ?? 6;
        const roll = 1 + Math.floor(Math.random() * sides);
        await interaction.reply({ embeds: [Embeds.primary(`🎲 Dado de ${sides} caras`, `Salió: **${roll}**`)] });
        return;
      }
      case 'aleatorio': {
        let min = interaction.options.getInteger('minimo') ?? 1;
        let max = interaction.options.getInteger('maximo') ?? 100;
        if (min > max) [min, max] = [max, min];
        const n = min + Math.floor(Math.random() * (max - min + 1));
        await interaction.reply({ embeds: [Embeds.primary('🔢 Número aleatorio', `Entre **${min}** y **${max}**: **${n}**`)] });
        return;
      }
      case 'meme': {
        await interaction.reply({ embeds: [Embeds.primary('😂 Meme del día', pick(MEMES))] });
        return;
      }
      case 'chiste': {
        await interaction.reply({ embeds: [Embeds.primary('🤣 Chiste', pick(JOKES))] });
        return;
      }
      case 'cita': {
        const q = pick(QUOTES);
        await interaction.reply({ embeds: [Embeds.primary('💭 Cita del día', `_"${q.text}"_\n— **${q.author}**`)] });
        return;
      }
      case 'dato': {
        await interaction.reply({ embeds: [Embeds.primary('🧠 ¿Sabías que...?', pick(FACTS))] });
        return;
      }
      case 'vacile': {
        const target = interaction.options.getUser('objetivo') ?? interaction.user;
        if (target.bot) {
          await interaction.reply({ embeds: [Embeds.error('Sin vacile', 'No puedo vacilar a un bot... somos familia. 🤖💜')], ephemeral: true });
          return;
        }
        await interaction.reply({ embeds: [Embeds.primary(`🔥 Vacile para ${target.username}`, `${target} ${pick(ROASTS)}`)] });
        return;
      }
      case 'cumplido': {
        const target = interaction.options.getUser('objetivo') ?? interaction.user;
        await interaction.reply({ embeds: [Embeds.success(`💖 Cumplido para ${target.username}`, `${target} ${pick(COMPLIMENTS)}`)] });
        return;
      }
      case 'pareja': {
        const u1 = interaction.options.getUser('usuario1', true);
        const u2 = interaction.options.getUser('usuario2') ?? interaction.user;
        const pct = seededPercent([u1.id, u2.id].sort().join('|'));
        await interaction.reply({ embeds: [Embeds.primary(`💘 ${u1.username} + ${u2.username}`, `${u1} ❤️ ${u2}\nCompatibilidad: **${pct}%**\n${bar(pct)}`)] });
        return;
      }
      case 'amor': {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const pct = seededPercent(`love|${user.id}`);
        const msg = pct >= 80 ? '¡Amor propio nivel leyenda! 💖' : pct >= 50 ? 'Buen nivel, sigue así. 💗' : 'Hoy toca apapacharse un poco más. 🤗';
        await interaction.reply({ embeds: [Embeds.primary(`💝 Amor propio de ${user.username}`, `${user}\nNivel: **${pct}%**\n${bar(pct)}\n${msg}`)] });
        return;
      }
      case 'cuanto-molas': {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const pct = seededPercent(`cool|${user.id}`);
        await interaction.reply({ embeds: [Embeds.primary(`😎 Nivel de cool de ${user.username}`, `${user}\nCool: **${pct}%**\n${bar(pct)}`)] });
        return;
      }
      case 'nivel-despiste': {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const pct = seededPercent(`dumb|${user.id}`);
        await interaction.reply({ embeds: [Embeds.primary(`🤪 Nivel de despiste de ${user.username}`, `${user}\nDespiste: **${pct}%**\n${bar(pct)}\n_(Todo con cariño, ser despistado es encantador)_ 💛`)] });
        return;
      }
      case 'calificar': {
        const thing = interaction.options.getString('cosa', true);
        const score = hashStr(thing.toLowerCase()) % 11;
        await interaction.reply({ embeds: [Embeds.primary('⭐ Calificación', `**${thing}** merece un... **${score}/10**\n${bar(score * 10)}`)] });
        return;
      }
      case 'consejo': {
        await interaction.reply({ embeds: [Embeds.primary('🧙 Consejo del día', pick(ADVICES))] });
        return;
      }
      case 'galleta-fortuna': {
        await interaction.reply({ embeds: [Embeds.success('Galleta de la fortuna', pick(FORTUNES))] });
        return;
      }
      case 'color-aleatorio': {
        let hex = '';
        for (let i = 0; i < 6; i++) hex += HEX_DIGITS[Math.floor(Math.random() * 16)];
        const num = parseInt(hex, 16);
        const embed = Embeds.primary('🎨 Color aleatorio', `Hex: \`#${hex}\`\nRGB: \`${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}\``).setColor(num);
        await interaction.reply({ embeds: [embed] });
        return;
      }
      case 'combo-emojis': {
        const combo = `${pick(EMOJI_SET)} ${pick(EMOJI_SET)} ${pick(EMOJI_SET)}`;
        await interaction.reply({ embeds: [Embeds.primary('🎰 Combo de emojis', `# Tu combo:\n${combo}`)] });
        return;
      }
      case 'aura': {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const points = seededPercent(`aura|${user.id}`) * 100;
        await interaction.reply({ embeds: [Embeds.primary(`🌀 Aura de ${user.username}`, `${user}\nPuntos de aura: **${points}**\nNivel: **${auraLevel(points)}**\n${bar(Math.floor(points / 100))}`)] });
        return;
      }
      default: {
        await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
        return;
      }
    }
  },
};
