/**
 * Fiesta: /fiesta <25 subcomandos de fiesta 100% locales, sin APIs ni DB>.
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

function minuteBucket(offset = 0): number {
  return Math.floor(Date.now() / 60000) + offset;
}

function seededInt(seed: string, max: number): number {
  return hashStr(seed) % max;
}

const TRUTHS: readonly string[] = [
  '¿Cuál fue la última mentira piadosa que contaste? ¡Detalles!',
  '¿Qué es lo más vergonzoso que te ha pasado en una videollamada?',
  '¿A quién stalkearías si fuera 100% anónimo y nadie se enterara nunca?',
  '¿Cuál es tu gusto musical culposo que jamás admitirías en público?',
  '¿Qué fue lo último que buscaste en internet a las 3 de la mañana?',
  '¿Alguna vez fingiste que se cortaba la llamada para colgar? Cuenta todo.',
  '¿Cuál es la peor excusa que has usado para no ir a un plan?',
  '¿Qué plato dices que te encanta pero en secreto no soportas?',
  '¿Cuál fue tu momento más torpe de esta semana?',
  '¿Cómo te enteraste de que los Reyes Magos / Santa eran los padres?',
  '¿Qué serie es tu placer culposo y has visto más de dos veces?',
  '¿Cuál es el mensaje más vergonzoso que enviaste a la persona equivocada?',
];

const DARES: readonly string[] = [
  'Escribe tu próximo mensaje ¡TODO EN MAYÚSCULAS Y CON MUCHOS SIGNOS!!!',
  'Adopta el apodo mental de "Capitán/a Fiestero/a" durante 10 minutos.',
  'Describe tu día usando solo 3 emojis, aquí mismo, sin palabras.',
  'Hazle un cumplido sincero a la última persona que escribió en el chat.',
  'Escribe 2 líneas de tu canción favorita pero cambiando toda la letra por "la la la".',
  'Cuenta un chiste malo. Si nadie reacciona con 😂, cuentas otro.',
  'Habla en rima durante tus próximos 3 mensajes. ¡Suerte, poeta!',
  'Publica tu emoji más usado y explica por qué te representa.',
  'Imita con texto (onomatopeyas) el sonido de una fiesta. ¡A hacer ruido!',
  'Reta a alguien del chat a un piedra-papel-tijera con `/fiesta piedra-papel-tijera`',
  'Escribe tu nombre al revés y firma así tus mensajes durante 5 minutos.',
  'Predice quién escribirá el próximo mensaje. Si fallas, bailas (con emojis).',
];

const WOULDYOU: readonly string[] = [
  '¿Tener siempre la batería al 5% o tener WiFi lento para siempre?',
  '¿Saber lo que piensan los gatos o poder hablar con las plantas?',
  '¿Fiesta en la playa o fiesta en una cabaña con nieve?',
  '¿Comer solo tacos o solo pizza durante un año entero?',
  '¿Ser famoso/a en internet o rico/a pero totalmente anónimo/a?',
  '¿Viajar al pasado o al futuro (un solo viaje, sin retorno)?',
  '¿No volver a usar emojis o no volver a usar memes?',
  '¿Bailar cada vez que suene música o cantar cada vez que hables?',
  '¿Dormir 4 horas con energía infinita o dormir 12 horas todos los días?',
  '¿Tener un dragón de mascota o tener tu propia nave espacial?',
  '¿Perder el móvil un mes o no comer tu comida favorita un año?',
  '¿Protagonizar una comedia o una aventura épica?',
];

const NEVERHAVE: readonly string[] = [
  'Yo nunca he enviado un mensaje importante al grupo equivocado. 👀',
  'Yo nunca he fingido estar enfermo/a para no ir a clase o trabajar. 🤒',
  'Yo nunca me he reído en el momento más inapropiado posible. 😅',
  'Yo nunca he cantado en la ducha como si fuera un concierto. 🎤',
  'Yo nunca he espiado una pantalla ajena por encima del hombro. 📱',
  'Yo nunca me he dormido en el transporte y me he pasado de parada. 🚌',
  'Yo nunca he dicho "sí, ya lo vi" sin haber visto nada. 🙈',
  'Yo nunca he llorado con una película de dibujos animados. 🎬',
  'Yo nunca he aplicado la regla de los 5 segundos con comida del suelo. 🍕',
  'Yo nunca he escrito "jajaja" sin estar riéndome de verdad. 😂',
  'Yo nunca me he peleado por el último trozo de comida. 🍰',
  'Yo nunca he dicho "solo 5 minutos más" y me he quedado 2 horas. ⏰',
];

const PARANOIA: readonly string[] = [
  '¿Quién es más probable que se ría en un momento serio? 🤭',
  '¿Quién es más probable que sobreviva en una isla desierta? 🏝️',
  '¿Quién es más probable que llegue tarde a su propia fiesta? ⏰',
  '¿Quién es más probable que se haga viral por accidente? 📱',
  '¿Quién es más probable que se duerma en el cine? 😴',
  '¿Quién es más probable que organice la mejor fiesta sorpresa? 🎉',
  '¿Quién es más probable que haga amigos hablando con desconocidos? 🗣️',
  '¿Quién es más probable que pierda el móvil dentro de su propia casa? 🔍',
  '¿Quién es más probable que gane un concurso de baile improvisado? 💃',
  '¿Quién es más probable que adopte 10 mascotas "temporalmente"? 🐾',
  '¿Quién es más probable que cuente el mejor chiste malo? 🤣',
  '¿Quién es más probable que lidere la conga de esta fiesta? 🎺',
];

const STORIES: readonly string[] = [
  'Había una vez un DJ que puso la canción equivocada... y resultó ser el mayor éxito de la noche. 🎧',
  'Cuentan que en este servidor hay un emoji legendario que solo aparece cuando todos bailan a la vez. 👻',
  'Un pingüino entró a una fiesta, pidió una soda y terminó siendo el rey de la pista. Nadie sabe cómo. 🐧',
  'La leyenda dice que si brindas 3 veces seguidas, tu semana tendrá un 200% más de buena suerte. 🥂',
  'Érase una vez un confeti que se negaba a caer... flotó tanto que se convirtió en estrella. ✨',
  'Un taco y una pizza discutían quién era mejor hasta que llegó la fiesta y se hicieron amigos. 🌮🍕',
  'Dicen que el que baila la conga hasta el final recibe un año entero de buena música. 🎺',
  'Había un karaoke embrujado: quien cantaba desafinado... ¡sonaba aún mejor! 🎤',
  'Una vez, un brindis tan épico hizo que hasta el bot aplaudiera. Fue esta noche. 👏',
  'El secreto de la fiesta perfecta: 2 partes de risa, 1 de baile y una pizca de locura. 🎉',
  'Cuentan que un dragón tímido solo sale cuando alguien grita "¡FIESTA!" muy fuerte. 🐉',
  'Y así, entre risas y confeti, esta fiesta pasó a la historia del servidor. Fin... o ¿continuará? 📖',
];

const TOASTS: readonly string[] = [
  '🥂 ¡Brindemos por los amigos que están y por los que faltan, que la próxima no se la pierdan!',
  '🥂 ¡Por las noches que no recordaremos con la gente que nunca olvidaremos!',
  '🥂 ¡Que nunca falten motivos para celebrar ni gente con quien hacerlo!',
  '🥂 ¡Por los lunes que sobrevivimos y los viernes que festejamos!',
  '🥂 ¡Brindo por ti, que lees esto con una sonrisa!',
  '🥂 ¡Que la risa sea contagiosa y la alegría no tenga toque de queda!',
  '🥂 ¡Por los planes improvisados, que siempre son los mejores!',
  '🥂 ¡Que sobren los memes y nunca falte la buena compañía!',
  '🥂 ¡Brindemos por este servidor, que es la mejor fiesta de internet!',
  '🥂 ¡Por soñar en grande y celebrar en gigante!',
  '🥂 ¡Que cada día tenga algo que valga un brindis!',
  '🥂 ¡Salud, amor, fiesta y muchos éxitos para todos!',
];

const CHEERS_LINES: readonly string[] = [
  '🍻 ¡Salud! ¡Que la fiesta no pare!',
  '🍻 ¡Chin chin! ¡A pasarlo en grande!',
  '🥤 ¡Salud con lo que tengas a mano, lo importante es brindar!',
  '🍻 ¡Arriba, abajo, al centro y pa dentro... virtualmente!',
  '🥂 ¡Salud! ¡Por esta noche legendaria!',
  '🍻 ¡Que viva la fiesta y vivan ustedes!',
  '🧋 ¡Brindo con mi bebida favorita por mi gente favorita!',
  '🍻 ¡Salud! ¡Nadie se queda sin brindar esta noche!',
  '🥂 ¡Por más noches como esta!',
  '🍻 ¡Choca esos vasos (o emojis) conmigo! 🍻',
  '🥤 ¡Salud! ¡Hidratarse también es celebrar!',
  '🍻 ¡La última y nos vamos... a seguir la fiesta en otro canal!',
];

const HYPES: readonly string[] = [
  '🔥 ¡SUBAN EL VOLUMEN QUE ESTO SE PONE BUENO! 🔥',
  '⚡ ¡ENERGÍA AL MÁXIMO! ¡HOY NADIE SE QUEDA SENTADO! ⚡',
  '🚀 ¡DESPEGAMOS! ¡ESTA FIESTA VA DIRECTO A LAS ESTRELLAS! 🚀',
  '🎉 ¡QUE SE ESCUCHE HASTA EL ÚLTIMO RINCÓN DEL SERVIDOR! 🎉',
  '💥 ¡MODO FIESTA ACTIVADO! ¡REPITO: MODO FIESTA ACTIVADO! 💥',
  '🌟 ¡BRILLEN, QUE ESTA ES SU NOCHE! 🌟',
  '🥁 ¡REDOBLE DE TAMBORES... LA DIVERSIÓN NO TIENE FIN! 🥁',
  '🎧 ¡EL DJ ACABA DE PONER SU MEJOR TEMA! ¡A BAILAR! 🎧',
  '🏆 ¡ESTE SERVIDOR TIENE LA MEJOR GENTE, CONFIRMADO! 🏆',
  '🎊 ¡QUE LLUEVA CONFETI Y SOBRE LA ALEGRÍA! 🎊',
  '🦄 ¡NIVEL DE ÉPICO: INIGUALABLE! ¡SIGAN ASÍ! 🦄',
  '📣 ¡AVISO: SE HA DETECTADO DIVERSIÓN EXTREMA EN ESTE CANAL! 📣',
];

const DANCES: readonly string[] = [
  '💃 ¡Hace el paso del robot con una precisión milimétrica! 🤖',
  '🕺 ¡Gira, salta y termina con una pose legendaria!',
  '💃 ¡Baila la macarena como si fuera 1996 otra vez!',
  '🕺 ¡Intenta el moonwalk... y casi lo logra! ¡Un aplauso al esfuerzo!',
  '💃 ¡Se marca una conga individual que contagia a todo el chat! 🎺',
  '🕺 ¡Baile del gusano virtual: se retuerce entre emojis! 🐛',
  '💃 ¡Perrea... perdón, *baila* hasta el suelo con estilo!',
  '🕺 ¡Hace el baile del pollo con total dignidad! 🐔',
  '💃 ¡Twerking de hombros nivel experto! ¡Miren esos hombros!',
  '🕺 ¡Baila salsa con una pareja imaginaria y le sale genial!',
  '💃 ¡El paso prohibido... que ahora está permitido porque es fiesta!',
  '🕺 ¡Cierra con un salto mortal (virtual, sin lesiones) y reverencia! 🎩',
];

const KARAOKE_SONGS: readonly string[] = [
  '🎤 ¡Te toca cantar! Tema: una balada dramática sobre tu comida favorita.',
  '🎤 ¡Al escenario! Canta el cumpleaños feliz con voz de ópera. 🎭',
  '🎤 ¡Tu turno! Improvisa un reguetón sobre este servidor.',
  '🎤 ¡Luces, cámara! Canta tu canción favorita... pero como si fueras un robot. 🤖',
  '🎤 ¡Dúo sorpresa! Invita a alguien del chat a cantar contigo (menciónalo/a).',
  '🎤 ¡Hora del rock! Grita (escribe en mayúsculas) el estribillo que más te guste.',
  '🎤 ¡Balada romántica dedicada al último emoji que usaste! 💕',
  '🎤 ¡Rap exprés: 4 versos sobre la fiesta de esta noche!',
  '🎤 ¡Canta una canción infantil con voz de villano de película! 😈',
  '🎤 ¡Mariachi mode: escribe "¡AY AY AY!" y dedica una ranchera!',
  '🎤 ¡Karaoke inverso: el chat te escribe una frase y TÚ la cantas (la repites con 🎶)!',
  '🎤 ¡Gran final! Todos cantan el "lalala" de la victoria: ¡escríbelo ahora! 🎶',
];

const SLEEPOVER_STORIES: readonly string[] = [
  '🌙 Había una vez una estrellita que tenía miedo a la oscuridad... hasta que descubrió que ella misma era luz. Y brilló feliz para siempre. Fin. ✨',
  '🌙 Un osito de peluche organizaba fiestas secretas cada noche cuando su dueño dormía. Esta noche, tú estás invitado/a. 🧸',
  '🌙 La Luna y el Sol se turnaban para cuidarnos, y se escribían cartas en cada eclipse. Esta noche la Luna te manda un abrazo. 🌕',
  '🌙 Un tren de almohadas recorría el mundo recogiendo sueños bonitos. El tuyo de esta noche será el más bonito de todos. 🚂',
  '🌙 Había un dragón que en vez de fuego escupía mantitas calientes para arropar a quien tuviera frío. Que te arrope bien. 🐉',
  '🌙 Las ovejas que cuentas para dormir son pastoras de sueños: cada una te trae un sueño mejor que el anterior. 🐑',
  '🌙 Un faro en medio del mar guiaba a los barcos perdidos cantando nanas. Escucha... ya puedes dormir. 🗼',
  '🌙 La lluvia de esta noche son aplausos de las nubes porque fuiste genial hoy. Duerme orgulloso/a. 🌧️',
  '🌙 Un gato astronauta patrullaba el cielo para que ninguna pesadilla se acercara. Turno de noche: cubierto. 🐱🚀',
  '🌙 Los cojines del sofá guardan todos los secretos divertidos del día para contártelos mañana. Descansa. 🛋️',
  '🌙 Érase un bosque donde los árboles susurraban "todo va a estar bien" con la brisa. Respira hondo y duerme. 🌲',
  '🌙 Y colorín colorado, la fiesta se ha acabado... por hoy. Mañana habrá más risas. Dulces sueños. 💤',
];

const ROAST_LITE: readonly string[] = [
  'Eres como el WiFi del vecino: apareces, pero nadie te quiere usar. 📶 (Con cariño)',
  'Tienes el carisma de una contraseña temporal. 🔑 (Pero te queremos igual)',
  'Eres la razón por la que existe el botón "omitir intro". ⏭️',
  'Tu nivel de energía es "lunes a las 7am". 🥱 ¡Tómate un café virtual! ☕',
  'Eres como un tutorial sin botón de saltar: largo, pero útil. 📖',
  'Google te buscaría y preguntaría "¿quisiste decir alguien genial?". 🔍 ¡Porque lo eres!',
  'Tienes menos chispa que un encendedor mojado... pero más corazón que nadie. 💧❤️',
  'Eres el anuncio antes del video: inevitable, pero al final te apreciamos. 📺',
  'Tu aura es "modo avión": desconectado/a del drama. ✈️ ¡Bien ahí!',
  'Eres el captcha que nadie pasa a la primera: ¡todo un enigma! 🤖',
  'Tienes el misterio de un calcetín perdido... y el encanto de encontrarlo. 🧦',
  'Eres el DLC gratuito: nadie te esperaba y resultaste ser lo mejor. 🎮',
];

const CONGA_LINES: readonly string[] = [
  '🎺 ¡Todos en fila! ¡La conga arranca por aquí!',
  '🎺 ¡Manos en los hombros del de adelante (virtualmente)! ¡A bailar!',
  '🎺 ¡La conga recorre todo el servidor! ¡Súbanse!',
  '🎺 ¡Paso a la izquierda, paso a la derecha, y a dar la vuelta!',
  '🎺 ¡El tren de la alegría no tiene frenos! ¡Todos a bordo! 🚂',
  '🎺 ¡Conga infinita activada! ¡Nadie se puede bajar!',
];

const CONFETTI_BURSTS: readonly string[] = [
  '🎊 *¡PUM!* Lluvia de confeti:\n✨🎉✨🎊✨🎉✨\n🎉✨🎊✨🎉✨🎊\n¡Que no pare la fiesta!',
  '🎊 *¡FIESTAAA!* Cañón de confeti disparado:\n🟥🟧🟨🟩🟦🟪\n🟪🟦🟩🟨🟧🟥\n¡Todo el chat brilla!',
  '🎊 ¡Explosión de alegría!\n⭐🌟⭐🌟⭐🌟\n🌟⭐🌟⭐🌟⭐\n¡Recoge tu puñado de felicidad!',
  '🎊 ¡Confeti virtual para todos!\n🎈🎈🎈🎈🎈🎈\n🎉🎉🎉🎉🎉🎉\n¡Sin recoger ni limpiar!',
];

const FIREWORKS_SHOWS: readonly string[] = [
  '🎆 ¡Espectáculo de fuegos artificiales!\n🎇 . . 💥 . . 🎇\n. 💥 🎆 💥 🎆 💥 .\n🎇 . . 💥 . . 🎇\n¡Oohhh! ¡Aaahhh!',
  '🎇 ¡Gran final pirotécnico!\n✨💥✨💥✨\n💥🌟💥🌟💥\n✨💥✨💥✨\n¡El cielo (del chat) se ilumina!',
  '🎆 ¡Lluvia de estrellas!\n. * . * . * .\n* ✨ * ✨ * ✨ *\n. * . * . * .\n¡Pide un deseo!',
  '🎇 ¡Fuegos de colores!\n🔴🟠🟡🟢🔵🟣\n💥💥💥💥💥💥\n¡La noche es nuestra!',
];

const COIN_RACE_FLAVORS: readonly string[] = [
  '¡La moneda gira por los aires...!',
  '¡Moneda al aire! ¡Que gane el mejor!',
  '¡Lanzamiento épico! ¡Todos miran al cielo!',
  '¡La moneda da 47 vueltas antes de caer!',
  '¡El árbitro (yo) supervisa el lanzamiento!',
  '¡Silencio en el estadio... la moneda está en el aire!',
];

const WAVE_LINES: readonly string[] = [
  '👋 ¡Hola hola! ¡Qué bueno verte por la fiesta!',
  '👋 ¡Saludos con la ola más épica del servidor! 🌊',
  '👋 ¡Te manda una ola gigante que casi te tumba! ¡Cuidado!',
  '👋 ¡Ola virtual enviada con cariño y confeti! 🎊',
  '👋 ¡Hace la ola mexicana él/ella solito/a! ¡Impresionante! 🇲🇽',
  '👋 ¡Saluda con las dos manos y una sonrisa enorme! 😄',
  '👋 ¡Ola con voltereta incluida! ¡Nivel profesional! 🤸',
  '👋 ¡Te saluda desde la pista de baile sin parar de bailar! 💃',
];

const SHOUTOUT_TEMPLATES: readonly string[] = [
  '📣 ¡Un aplauso enorme para {user}! ¡Eres lo máximo! 👏👏👏',
  '📣 ¡Atención fiesta! ¡{user} acaba de llegar y esto se pone bueno! 🎉',
  '📣 ¡Shoutout especial para {user}! ¡Gracias por la buena vibra! ✨',
  '📣 ¡Que todo el chat salude a {user}! ¡A la de tres: HOLA! 👋',
  '📣 ¡{user} es oficialmente la estrella de esta noche! ¡Brilla! 🌟',
  '📣 ¡Dediquemos esta canción a {user}! ¡Esta fiesta es tuya! 🎶',
];

const GUESS_EMOJI_POOL: readonly string[] = ['🎃', '🔥', '🌈', '⚡', '🍕', '🐱', '🦄', '🐸', '🍩', '🚀', '🎮', '🍓'];

const RPS_LABEL: Record<string, string> = { rock: '🪨 Piedra', paper: '📄 Papel', scissors: '✂️ Tijera' };
const RPS_MOVES: readonly string[] = ['rock', 'paper', 'scissors'];

function rpsWinner(user: string, bot: string): 'win' | 'lose' | 'tie' {
  if (user === bot) return 'tie';
  if ((user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper')) return 'win';
  return 'lose';
}

function guessEmojiTrio(userId: string, bucket: number): [string, string, string] {
  const a = GUESS_EMOJI_POOL[seededInt(`ge|${userId}|${bucket}|a`, GUESS_EMOJI_POOL.length)] as string;
  let b = GUESS_EMOJI_POOL[seededInt(`ge|${userId}|${bucket}|b`, GUESS_EMOJI_POOL.length)] as string;
  let c = GUESS_EMOJI_POOL[seededInt(`ge|${userId}|${bucket}|c`, GUESS_EMOJI_POOL.length)] as string;
  if (b === a) b = GUESS_EMOJI_POOL[(GUESS_EMOJI_POOL.indexOf(a) + 4) % GUESS_EMOJI_POOL.length] as string;
  if (c === a || c === b) c = GUESS_EMOJI_POOL[(GUESS_EMOJI_POOL.indexOf(b) + 5) % GUESS_EMOJI_POOL.length] as string;
  return [a, b, c];
}

export const party: Command = {
  data: new SlashCommandBuilder()
    .setName('fiesta')
    .setDescription('Fiesta total: juegos y diversión 100% locales')
    .addSubcommand((s) => s.setName('verdad').setDescription('Verdad aleatoria para la fiesta'))
    .addSubcommand((s) => s.setName('reto').setDescription('Reto sano y divertido'))
    .addSubcommand((s) => s.setName('verdad-o-reto').setDescription('Verdad o reto: el bot elige por ti'))
    .addSubcommand((s) => s.setName('que-prefieres').setDescription('¿Qué prefieres? Pregunta aleatoria'))
    .addSubcommand((s) => s.setName('yo-nunca').setDescription('Yo nunca... Reacciona si lo hiciste'))
    .addSubcommand((s) => s.setName('paranoia').setDescription('¿Quién es más probable que...?'))
    .addSubcommand((s) => s.setName('historia').setDescription('Mini historia fiestera'))
    .addSubcommand((s) => s.setName('brindis').setDescription('Un brindis para la ocasión'))
    .addSubcommand((s) => s.setName('salud').setDescription('¡Salud! Frase rápida de brindis'))
    .addSubcommand((s) => s.setName('animo').setDescription('Sube la energía del chat'))
    .addSubcommand((s) => s.setName('bailar').setDescription('Saca tus pasos prohibidos'))
    .addSubcommand((s) => s.setName('conga').setDescription('Inicia la conga en el chat'))
    .addSubcommand((s) => s.setName('confeti').setDescription('Lluvia de confeti virtual'))
    .addSubcommand((s) => s.setName('fuegos-artificiales').setDescription('Espectáculo de fuegos artificiales'))
    .addSubcommand((s) => s.setName('karaoke').setDescription('Te asigna un reto de karaoke'))
    .addSubcommand((s) =>
      s.setName('saludo').setDescription('Dedica un saludo especial a alguien').addUserOption((o) => o.setName('usuario').setDescription('A quién saludar')),
    )
    .addSubcommand((s) =>
      s.setName('duelo-cumplidos').setDescription('Duelo de cumplidos contra alguien').addUserOption((o) => o.setName('usuario').setDescription('Tu rival')),
    )
    .addSubcommand((s) =>
      s.setName('vacile-suave').setDescription('Vacile suave y sano, con cariño').addUserOption((o) => o.setName('usuario').setDescription('A quién vacilar (suave)')),
    )
    .addSubcommand((s) =>
      s
        .setName('adivina-emoji')
        .setDescription('Adivina el emoji secreto entre 3 (úsalo sin eleccion para verlos)')
        .addStringOption((o) => o.setName('eleccion').setDescription('Tu elección (pega uno de los 3 emojis)').setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s
        .setName('adivina-numero')
        .setDescription('Adivina el número secreto del 1 al 10')
        .addIntegerOption((o) => o.setName('numero').setDescription('Tu número (1-10)').setRequired(true).setMinValue(1).setMaxValue(10)),
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
    .addSubcommand((s) => s.setName('duelo-dados').setDescription('Duelo de dados: tú contra el bot'))
    .addSubcommand((s) => s.setName('carrera-moneda').setDescription('Carrera de una moneda: tú (cara) vs el bot (cruz)'))
    .addSubcommand((s) =>
      s.setName('ola-fiesta').setDescription('Saluda con la ola fiestera').addUserOption((o) => o.setName('usuario').setDescription('A quién saludar')),
    )
    .addSubcommand((s) => s.setName('pijamada').setDescription('Historia corta para dormir')),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'verdad') {
      await interaction.reply({ embeds: [Embeds.primary('😳 Verdad', pick(TRUTHS))] });
      return;
    }

    if (sub === 'reto') {
      await interaction.reply({ embeds: [Embeds.primary('😈 Reto', pick(DARES))] });
      return;
    }

    if (sub === 'verdad-o-reto') {
      const isTruth = Math.random() < 0.5;
      const text = isTruth ? pick(TRUTHS) : pick(DARES);
      await interaction.reply({ embeds: [Embeds.primary(isTruth ? '😳 ¡Te tocó VERDAD!' : '😈 ¡Te tocó RETO!', text)] });
      return;
    }

    if (sub === 'que-prefieres') {
      await interaction.reply({ embeds: [Embeds.primary('🤔 ¿Qué prefieres?', pick(WOULDYOU))] });
      return;
    }

    if (sub === 'yo-nunca') {
      await interaction.reply({ embeds: [Embeds.primary('👀 Yo nunca...', `${pick(NEVERHAVE)}\n\n_Reacciona con ✅ si SÍ lo hiciste y con ❌ si eres un angelito._`)] });
      return;
    }

    if (sub === 'paranoia') {
      await interaction.reply({ embeds: [Embeds.primary('🫣 Paranoia', `${pick(PARANOIA)}\n\n_Mencionen a su candidato/a... bajo su propio riesgo. 😏_`)] });
      return;
    }

    if (sub === 'historia') {
      await interaction.reply({ embeds: [Embeds.primary('📖 Historia fiestera', pick(STORIES))] });
      return;
    }

    if (sub === 'brindis') {
      await interaction.reply({ embeds: [Embeds.success('Brindis', pick(TOASTS))] });
      return;
    }

    if (sub === 'salud') {
      await interaction.reply({ embeds: [Embeds.success('¡Salud!', pick(CHEERS_LINES))] });
      return;
    }

    if (sub === 'animo') {
      await interaction.reply({ embeds: [Embeds.success('ÁNIMO', pick(HYPES))] });
      return;
    }

    if (sub === 'bailar') {
      await interaction.reply({ embeds: [Embeds.primary('¡A bailar!', `${interaction.user} ${pick(DANCES)}`)] });
      return;
    }

    if (sub === 'conga') {
      await interaction.reply({ embeds: [Embeds.primary('La conga', `${interaction.user} ${pick(CONGA_LINES)}`)] });
      return;
    }

    if (sub === 'confeti') {
      await interaction.reply({ embeds: [Embeds.primary('¡Confeti!', pick(CONFETTI_BURSTS))] });
      return;
    }

    if (sub === 'fuegos-artificiales') {
      await interaction.reply({ embeds: [Embeds.primary('Fuegos artificiales', pick(FIREWORKS_SHOWS))] });
      return;
    }

    if (sub === 'karaoke') {
      await interaction.reply({ embeds: [Embeds.primary(`🎤 Karaoke para ${interaction.user.username}`, `${interaction.user} ${pick(KARAOKE_SONGS)}`)] });
      return;
    }

    if (sub === 'saludo') {
      const target = interaction.options.getUser('usuario') ?? interaction.user;
      const template = pick(SHOUTOUT_TEMPLATES);
      await interaction.reply({ embeds: [Embeds.success('Saludo', template.replace('{user}', `${target}`))] });
      return;
    }

    if (sub === 'duelo-cumplidos') {
      const rival = interaction.options.getUser('usuario') ?? interaction.client.user ?? interaction.user;
      const me = interaction.user;
      if (rival.id === me.id) {
        await interaction.reply({ embeds: [Embeds.error('Sin duelo', 'No puedes batirte en duelo contigo mismo/a. ¡Elige a un rival!')], ephemeral: true });
        return;
      }
      const myScore = 1 + Math.floor(Math.random() * 100);
      const rivalScore = 1 + Math.floor(Math.random() * 100);
      const winner = myScore === rivalScore ? null : myScore > rivalScore ? me : rival;
      const text =
        `${me} ⚔️ ${rival}\n\n` +
        `💖 ${me}: **${myScore}** pts — ¡carisma arrollador!\n` +
        `💖 ${rival}: **${rivalScore}** pts — ¡encanto legendario!\n\n` +
        (winner === null ? '🤝 ¡EMPATE! ¡Doble ración de cumplidos para ambos!' : `🏆 ¡${winner} gana el duelo de cumplidos! ¡Felicidades!`);
      await interaction.reply({ embeds: [Embeds.success('Duelo de cumplidos', text)] });
      return;
    }

    if (sub === 'vacile-suave') {
      const target = interaction.options.getUser('usuario') ?? interaction.user;
      if (target.bot) {
        await interaction.reply({ embeds: [Embeds.error('Sin vacile', 'No puedo vacilar a un bot... somos familia. 🤖💜')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`🔥 Vacile-suave para ${target.username}`, `${target} ${pick(ROAST_LITE)}\n\n_(Todo con cariño, eres genial)_ 💛`)] });
      return;
    }

    if (sub === 'adivina-emoji') {
      const userId = interaction.user.id;
      const rawPick = interaction.options.getString('eleccion');
      const trioFor = (bucket: number): [string, string, string] => guessEmojiTrio(userId, bucket);
      if (rawPick === null || rawPick.trim() === '') {
        const trio = trioFor(minuteBucket());
        const secretIndex = seededInt(`ges|${userId}|${minuteBucket()}`, 3);
        void secretIndex;
        await interaction.reply({
          embeds: [Embeds.primary('🔮 Adivina el emoji', `He escondido un emoji secreto entre estos 3:\n\n**${trio.join('   ')}**\n\nVuelve a usar \`/fiesta adivina-emoji\` con tu \`eleccion\` (pega el emoji que creas que es el secreto). ¡Tienes 2 minutos!`)],
        });
        return;
      }
      const pickText = rawPick.trim();
      if (pickText.length > 50) {
        await interaction.reply({ embeds: [Embeds.error('Elección inválida', 'Pega solo uno de los 3 emojis mostrados.')], ephemeral: true });
        return;
      }
      let won = false;
      let shown: [string, string, string] | null = null;
      for (const bucket of [minuteBucket(), minuteBucket(-1), minuteBucket(-2)]) {
        const trio = trioFor(bucket);
        if (!trio.some((e) => pickText.includes(e))) continue;
        shown = trio;
        const secret = trio[seededInt(`ges|${userId}|${bucket}`, 3)] as string;
        won = pickText.includes(secret);
        if (won) break;
      }
      if (shown === null) {
        await interaction.reply({
          embeds: [Embeds.error('Emoji no válido', 'Tu `eleccion` no coincide con ningún reto reciente. Usa el comando sin `eleccion` para ver los 3 emojis y elige uno.')],
          ephemeral: true,
        });
        return;
      }
      if (won) {
        await interaction.reply({ embeds: [Embeds.success('¡Adivinaste!', `Tu elección **${pickText}** era el emoji secreto. ¡Increíble! 🎉\n\n${shown.join('   ')}`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('¡Fallaste!', `Tu elección **${pickText}** no era el secreto. ¡Suerte a la próxima! 🍀\n\nLos emojis eran: ${shown.join('   ')}`)] });
      }
      return;
    }

    if (sub === 'adivina-numero') {
      const guess = interaction.options.getInteger('numero', true);
      if (!Number.isInteger(guess) || guess < 1 || guess > 10) {
        await interaction.reply({ embeds: [Embeds.error('Número inválido', 'Elige un número del 1 al 10.')], ephemeral: true });
        return;
      }
      const secret = 1 + Math.floor(Math.random() * 10);
      if (guess === secret) {
        await interaction.reply({ embeds: [Embeds.success('¡Adivinaste!', `Dijiste **${guess}** y el secreto era **${secret}**. ¡Brujería! 🔮🎉`)] });
      } else {
        const hint = guess < secret ? 'El secreto era **mayor** 📈.' : 'El secreto era **menor** 📉.';
        await interaction.reply({ embeds: [Embeds.error('¡Fallaste!', `Dijiste **${guess}** pero el secreto era **${secret}**. ${hint} ¡Inténtalo de nuevo!`)] });
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
        await interaction.reply({ embeds: [Embeds.primary('🪨📄✂️ ¡Empate!', `Tú: ${me}\nBot: ${botLabel}\n\n¡Otra ronda!`)] });
      } else if (result === 'win') {
        await interaction.reply({ embeds: [Embeds.success('¡Ganaste!', `Tú: ${me}\nBot: ${botLabel}\n\n¡Victoria fiestera! 🎉`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('Perdiste', `Tú: ${me}\nBot: ${botLabel}\n\nEl bot baila de alegría. 💃`)] });
      }
      return;
    }

    if (sub === 'duelo-dados') {
      const mine = 1 + Math.floor(Math.random() * 6);
      const bot = 1 + Math.floor(Math.random() * 6);
      const text = `🎲 ${interaction.user}: **${mine}**\n🤖 Bot: **${bot}**\n\n`;
      if (mine === bot) {
        await interaction.reply({ embeds: [Embeds.primary('🎲 Duelo de dados: empate', `${text}¡Increíble empate! ¡Revancha!`)] });
      } else if (mine > bot) {
        await interaction.reply({ embeds: [Embeds.success('¡Ganaste el duelo!', `${text}¡Tus dados están bendecidos! 🍀`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.error('Perdiste el duelo', `${text}El bot sopla sus dados imaginarios. 🎲💨`)] });
      }
      return;
    }

    if (sub === 'carrera-moneda') {
      const flavor = pick(COIN_RACE_FLAVORS);
      const cara = Math.random() < 0.5;
      const text =
        `${flavor}\n\n🪙 Resultado: **${cara ? '¡CARA!' : '¡CRUZ!'}**\n\n` +
        (cara ? `🎉 ¡${interaction.user} (Cara) gana la carrera! 🏁` : '🤖 ¡El bot (Cruz) gana la carrera! ¡Pide la revancha! 🏁');
      await interaction.reply({ embeds: [cara ? Embeds.success('Carrera de moneda', text) : Embeds.error('Carrera de moneda', text)] });
      return;
    }

    if (sub === 'ola-fiesta') {
      const target = interaction.options.getUser('usuario');
      const line = pick(WAVE_LINES);
      await interaction.reply({ embeds: [Embeds.primary('Ola fiestera', target ? `${target} ${line}` : `${interaction.user} ${line}`)] });
      return;
    }

    if (sub === 'pijamada') {
      await interaction.reply({ embeds: [Embeds.primary('💤 Hora del pijama', pick(SLEEPOVER_STORIES))] });
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
  },
};
