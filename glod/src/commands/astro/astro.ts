/**
 * Astro: /astro <25 vibes y fortuna 100% locales con random sembrado>.
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Percent 0-100 derived deterministically from a seed (stable per user+day). */
function seededPercent(seed: string): number {
  return hashStr(seed) % 101;
}

function seededPick<T>(arr: readonly T[], seed: string): T {
  return arr[hashStr(seed) % arr.length] as T;
}

function bar(pct: number, len = 10): string {
  const filled = Math.round((pct / 100) * len);
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface SignInfo {
  readonly id: string;
  readonly name: string;
  readonly element: string;
  readonly dates: string;
}

const SIGNS: readonly SignInfo[] = [
  { id: 'aries', name: 'Aries', element: 'Fuego', dates: '21 mar – 19 abr' },
  { id: 'tauro', name: 'Tauro', element: 'Tierra', dates: '20 abr – 20 may' },
  { id: 'geminis', name: 'Géminis', element: 'Aire', dates: '21 may – 20 jun' },
  { id: 'cancer', name: 'Cáncer', element: 'Agua', dates: '21 jun – 22 jul' },
  { id: 'leo', name: 'Leo', element: 'Fuego', dates: '23 jul – 22 ago' },
  { id: 'virgo', name: 'Virgo', element: 'Tierra', dates: '23 ago – 22 sep' },
  { id: 'libra', name: 'Libra', element: 'Aire', dates: '23 sep – 22 oct' },
  { id: 'escorpio', name: 'Escorpio', element: 'Agua', dates: '23 oct – 21 nov' },
  { id: 'sagitario', name: 'Sagitario', element: 'Fuego', dates: '22 nov – 21 dic' },
  { id: 'capricornio', name: 'Capricornio', element: 'Tierra', dates: '22 dic – 19 ene' },
  { id: 'acuario', name: 'Acuario', element: 'Aire', dates: '20 ene – 18 feb' },
  { id: 'piscis', name: 'Piscis', element: 'Agua', dates: '19 feb – 20 mar' },
];

function signById(id: string): SignInfo {
  return SIGNS.find((s) => s.id === id) ?? SIGNS[0];
}

function signFromDate(m: number, d: number): SignInfo {
  let id = 'piscis';
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) id = 'aries';
  else if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) id = 'tauro';
  else if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) id = 'geminis';
  else if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) id = 'cancer';
  else if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) id = 'leo';
  else if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) id = 'virgo';
  else if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) id = 'libra';
  else if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) id = 'escorpio';
  else if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) id = 'sagitario';
  else if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) id = 'capricornio';
  else if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) id = 'acuario';
  else if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) id = 'piscis';
  return signById(id);
}

interface ParsedDate {
  readonly y: number;
  readonly m: number;
  readonly d: number;
}

function parseISODate(s: string): ParsedDate | null {
  const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!mt) return null;
  const y = Number(mt[1] ?? '');
  const m = Number(mt[2] ?? '');
  const d = Number(mt[3] ?? '');
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return { y, m, d };
}

interface MoonInfo {
  readonly name: string;
  readonly emoji: string;
  readonly illumination: number;
}

const MOON_PHASES: readonly MoonInfo[] = [
  { name: 'Luna nueva', emoji: '🌑', illumination: 0 },
  { name: 'Luna creciente', emoji: '🌒', illumination: 0 },
  { name: 'Cuarto creciente', emoji: '🌓', illumination: 0 },
  { name: 'Gibosa creciente', emoji: '🌔', illumination: 0 },
  { name: 'Luna llena', emoji: '🌕', illumination: 0 },
  { name: 'Gibosa menguante', emoji: '🌖', illumination: 0 },
  { name: 'Cuarto menguante', emoji: '🌗', illumination: 0 },
  { name: 'Luna menguante', emoji: '🌘', illumination: 0 },
];

/** Fase lunar aproximada con algoritmo sinódico (29.53 días, ref: luna nueva 2000-01-06). */
function moonPhase(y: number, m: number, d: number): MoonInfo {
  const ref = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const days = Date.UTC(y, m - 1, d) / 86400000 - ref;
  const synodic = 29.53058867;
  const age = ((days % synodic) + synodic) % synodic;
  const idx = Math.floor((age / synodic) * 8 + 0.5) % 8;
  const illum = Math.round(((1 - Math.cos((2 * Math.PI * age) / synodic)) / 2) * 100);
  const base = MOON_PHASES[idx] ?? MOON_PHASES[0];
  return { name: base.name, emoji: base.emoji, illumination: illum };
}

const HOROSCOPES: readonly string[] = [
  'Hoy los astros te piden calma: algo que esperas se está cocinando a fuego lento. Paciencia. 🌙',
  'Día ideal para cerrar pendientes: tu concentración está en su punto máximo. 📋',
  'Una conversación pendiente se resolverá a tu favor si escuchas primero. 💬',
  'Tu energía atrae buenas noticias: mantente visible y comparte tus ideas. ✨',
  'Evita decisiones impulsivas por la tarde; la noche trae claridad. 🌆',
  'Alguien cercano necesita tu apoyo aunque no lo pida. Escríbele. 💛',
  'Es un gran día para empezar eso que llevas posponiendo. El primer paso cuenta doble. 🚀',
  'Tu creatividad está desbordada: anota todo, una idea vale oro. 🎨',
  'Cuida tu descanso hoy: el universo premia a quien recarga baterías. 😴',
  'El amor y la amistad sonríen: un plan improvisado saldrá redondo. 💖',
  'Dinero: evita gastos hormiga y celebra lo que ya tienes. 💰',
  'Tu intuición está afilada: si algo no te cuadra, hazle caso. 🔮',
  'Día de brillar en equipo: tu aporte será reconocido. 🌟',
  'Desconecta una hora del ruido digital y reconecta contigo. 🍃',
  'Lo que parecía un obstáculo resultará ser un atajo disfrazado. 🛤️',
];

interface ColorEntry {
  readonly name: string;
  readonly hex: string;
}

const LUCKY_COLORS: readonly ColorEntry[] = [
  { name: 'Rojo pasión', hex: '#E63946' },
  { name: 'Dorado abundancia', hex: '#D4A017' },
  { name: 'Verde esmeralda', hex: '#2A9D8F' },
  { name: 'Azul cielo', hex: '#4EA8DE' },
  { name: 'Violeta místico', hex: '#7B2CBF' },
  { name: 'Rosa cuarzo', hex: '#F4A7C3' },
  { name: 'Naranja vital', hex: '#F4842B' },
  { name: 'Turquesa calma', hex: '#40C4AA' },
  { name: 'Índigo profundo', hex: '#3A3F9E' },
  { name: 'Blanco lunar', hex: '#EDEDE9' },
  { name: 'Negro protección', hex: '#2B2D42' },
  { name: 'Coral alegría', hex: '#FF6F61' },
];

const LUCKY_EMOJIS: readonly string[] = [
  '🍀', '⭐', '🌙', '🔥', '🌈', '💎', '🚀', '🎧', '🌵', '🐬', '🦋', '🍩',
];

const MOODS: readonly string[] = [
  '☀️ Radiante: contagias luz allá donde vas.',
  '🍃 Tranquilo: fluyes sin prisa y sin pausa.',
  '🎨 Creativo: hoy todo puede ser una obra de arte.',
  '⚡ Enérgico: nada se te resiste este día.',
  '🌧️ Melancólico: permítete sentir, mañana sale el sol.',
  '🌙 Soñador: tu imaginación viaja lejos hoy.',
  '🦁 Valiente: enfrenta eso que te impone.',
  '🎈 Juguetón: ríete más, preocúpate menos.',
  '🦉 Sabio: observas lo que otros no ven.',
  '🔥 Apasionado: pones el corazón en todo.',
  '🌊 Sereno: eres remanso en medio del ruido.',
  '🔍 Curioso: una pregunta te llevará a un descubrimiento.',
];

interface AuraEntry {
  readonly name: string;
  readonly hex: string;
  readonly meaning: string;
}

const AURAS: readonly AuraEntry[] = [
  { name: 'Dorada', hex: '#D4A017', meaning: 'abundancia y liderazgo' },
  { name: 'Violeta', hex: '#7B2CBF', meaning: 'intuición y espiritualidad' },
  { name: 'Turquesa', hex: '#40C4AA', meaning: 'calma y comunicación' },
  { name: 'Rosa', hex: '#F4A7C3', meaning: 'amor y ternura' },
  { name: 'Azul', hex: '#4EA8DE', meaning: 'serenidad y confianza' },
  { name: 'Verde', hex: '#2A9D8F', meaning: 'sanación y crecimiento' },
  { name: 'Naranja', hex: '#F4842B', meaning: 'creatividad y entusiasmo' },
  { name: 'Roja', hex: '#E63946', meaning: 'pasión y energía' },
  { name: 'Blanca', hex: '#EDEDE9', meaning: 'pureza y nuevos comienzos' },
  { name: 'Índigo', hex: '#3A3F9E', meaning: 'sabiduría profunda' },
];

interface ChakraEntry {
  readonly name: string;
  readonly meaning: string;
}

const CHAKRAS: readonly ChakraEntry[] = [
  { name: 'Raíz ❤️', meaning: 'seguridad y conexión con la tierra' },
  { name: 'Sacro 🧡', meaning: 'creatividad y emociones' },
  { name: 'Plexo solar 💛', meaning: 'confianza y poder personal' },
  { name: 'Corazón 💚', meaning: 'amor y compasión' },
  { name: 'Garganta 💙', meaning: 'expresión y verdad' },
  { name: 'Tercer ojo 💜', meaning: 'intuición y claridad mental' },
  { name: 'Corona 🤍', meaning: 'conexión espiritual y propósito' },
];

interface TarotEntry {
  readonly name: string;
  readonly meaning: string;
}

const TAROT: readonly TarotEntry[] = [
  { name: 'El Loco', meaning: 'nuevos comienzos: lánzate sin miedo a lo desconocido.' },
  { name: 'El Mago', meaning: 'tienes todas las herramientas: es hora de actuar.' },
  { name: 'La Sacerdotisa', meaning: 'escucha tu voz interior antes de decidir.' },
  { name: 'La Emperatriz', meaning: 'abundancia y cuidado: nutre tus proyectos.' },
  { name: 'El Emperador', meaning: 'orden y estructura: pon límites sanos.' },
  { name: 'El Hierofante', meaning: 'busca consejo sabio o sigue la tradición.' },
  { name: 'Los Enamorados', meaning: 'una elección del corazón marcará tu día.' },
  { name: 'El Carro', meaning: 'avance imparable si mantienes el rumbo.' },
  { name: 'La Fuerza', meaning: 'la paciencia vence más que la prisa.' },
  { name: 'El Ermitaño', meaning: 'un momento a solas te dará la respuesta.' },
  { name: 'La Rueda de la Fortuna', meaning: 'un giro inesperado jugará a tu favor.' },
  { name: 'El Sol', meaning: 'éxito y alegría: tu mejor día de la semana.' },
];

interface RuneEntry {
  readonly char: string;
  readonly name: string;
  readonly meaning: string;
}

const RUNES: readonly RuneEntry[] = [
  { char: 'ᚠ', name: 'Fehu', meaning: 'riqueza y nuevos ingresos.' },
  { char: 'ᚢ', name: 'Uruz', meaning: 'fuerza vital y salud.' },
  { char: 'ᚦ', name: 'Thurisaz', meaning: 'protección ante un desafío.' },
  { char: 'ᚨ', name: 'Ansuz', meaning: 'mensajes y sabiduría.' },
  { char: 'ᚱ', name: 'Raidho', meaning: 'viajes y movimiento.' },
  { char: 'ᚲ', name: 'Kenaz', meaning: 'claridad e inspiración.' },
  { char: 'ᚷ', name: 'Gebo', meaning: 'regalos y equilibrio en tus relaciones.' },
  { char: 'ᚺ', name: 'Hagalaz', meaning: 'cambio necesario: suelta el control.' },
  { char: 'ᚾ', name: 'Nauthiz', meaning: 'paciencia ante la espera.' },
  { char: 'ᛁ', name: 'Isa', meaning: 'pausa: no fuerces lo que está quieto.' },
  { char: 'ᛃ', name: 'Jera', meaning: 'cosecha: recogerás lo sembrado.' },
  { char: 'ᛊ', name: 'Sowilo', meaning: 'victoria y energía solar.' },
];

interface CrystalEntry {
  readonly name: string;
  readonly property: string;
}

const CRYSTALS: readonly CrystalEntry[] = [
  { name: 'Amatista', property: 'calma mental y buen descanso' },
  { name: 'Cuarzo rosa', property: 'amor propio y armonía' },
  { name: 'Citrino', property: 'abundancia y optimismo' },
  { name: 'Ojo de tigre', property: 'protección y decisión' },
  { name: 'Lapislázuli', property: 'sabiduría y comunicación' },
  { name: 'Cuarzo cristal', property: 'claridad y energía' },
  { name: 'Jade', property: 'suerte y equilibrio' },
  { name: 'Ónix', property: 'fuerza y enraizamiento' },
  { name: 'Selenita', property: 'limpieza energética' },
  { name: 'Turquesa', property: 'protección viajera' },
  { name: 'Jaspe rojo', property: 'vitalidad y coraje' },
  { name: 'Piedra luna', property: 'intuición y nuevos ciclos' },
];

const AFFIRMATIONS: readonly string[] = [
  'Soy capaz de lograr todo lo que me propongo. 💪',
  'Merezco cosas buenas y las recibo con gratitud. 🌟',
  'Cada día crezco y aprendo algo nuevo. 🌱',
  'Mi energía positiva atrae personas positivas. ✨',
  'Confío en mi proceso y en mis tiempos. 🕰️',
  'Soy suficiente tal como soy. 💛',
  'Transformo los retos en oportunidades. 🔥',
  'Mi voz importa y merece ser escuchada. 📢',
  'Elijo la calma frente al caos. 🍃',
  'El universo conspira a mi favor. 🌌',
  'Agradezco lo que tengo y atraigo lo que viene. 🙏',
  'Soy resiliencia en movimiento. 🌊',
  'Hoy elijo brillar sin pedir permiso. ☀️',
  'Mis sueños son planes esperando su turno. 🗺️',
  'Irradio amor y lo recibo multiplicado. 💖',
];

const MANIFEST_STEPS_1: readonly string[] = [
  'Visualiza tu meta con todo detalle durante 2 minutos.',
  'Escribe tu meta en presente como si ya fuera real.',
  'Cierra los ojos e imagina cómo se siente lograrlo.',
  'Dibuja o representa tu meta en una hoja.',
  'Repite tu meta en voz alta 3 veces con convicción.',
  'Crea un tablero visual (físico o mental) de tu meta.',
];

const MANIFEST_STEPS_2: readonly string[] = [
  'Da hoy un micro-paso concreto hacia tu meta.',
  'Elimina una distracción que te aleja de tu meta.',
  'Cuéntale tu meta a alguien que te apoye.',
  'Dedica 15 minutos hoy solo a avanzar en tu meta.',
  'Divide tu meta en 3 tareas pequeñas y haz la primera.',
  'Investiga 10 minutos cómo otros lograron algo similar.',
];

const MANIFEST_STEPS_3: readonly string[] = [
  'Agradece en voz alta 3 cosas que ya tienes.',
  'Escribe una carta de gratitud a tu yo futuro.',
  'Comparte algo bueno con alguien hoy.',
  'Respira profundo y suelta la ansiedad por el resultado.',
  'Celebra un avance pequeño que ya lograste.',
  'Medita 5 minutos enfocándote en la gratitud.',
];

const JOURNAL_PROMPTS: readonly string[] = [
  '¿Qué harías hoy si no tuvieras miedo? ✍️',
  'Describe tu día perfecto con todo detalle. ☀️',
  '¿Qué hábito quieres soltar y cuál adoptar? 🌱',
  'Escribe una carta a tu yo de dentro de un año. 💌',
  '¿Qué te hizo sonreír esta semana? 😊',
  '¿Cuál es tu mayor sueño y qué te frena? 🌙',
  'Lista 5 cosas que te hacen único/a. ⭐',
  '¿Qué consejo le darías a tu yo de hace 5 años? 🕰️',
  'Describe un lugar donde te sientas en paz. 🏝️',
  '¿Qué significa el éxito para ti hoy? 🏆',
  '¿A quién admiras y por qué? 👀',
  '¿Qué harías con un día extra a la semana? 📅',
  'Escribe sobre un reto que te hizo más fuerte. 💪',
  '¿Qué quieres aprender este mes? 📚',
  '¿Cómo quieres sentirte al final del día? 💛',
];

const GRATITUDE: readonly string[] = [
  'una persona que te arrancó una sonrisa hoy 😊',
  'algo de tu cuerpo que te permite disfrutar la vida 💪',
  'una comida o bebida que disfrutaste 🍎',
  'un lugar donde te sientes seguro/a 🏠',
  'una oportunidad que tienes esta semana 🚪',
  'algo de la naturaleza que te maravilla 🌳',
  'una canción que te levanta el ánimo 🎵',
  'un objeto cotidiano que facilita tu día 📱',
  'un recuerdo bonito de tu infancia 🧸',
  'algo que aprendiste recientemente 📚',
  'un talento tuyo que das por sentado 🎨',
  'este momento presente, aquí y ahora 🌟',
];

const INTENTION_FOCUS: readonly string[] = [
  'llévala contigo y repítela cada vez que dudes.',
  'escríbela donde la veas durante el día.',
  'respira con ella 3 veces antes de empezar algo importante.',
  'compártela con alguien de confianza para anclarla.',
  'úsala como filtro para tus decisiones de hoy.',
  'regresa a ella cuando el ruido te distraiga.',
  'ciérrala en la noche agradeciendo un momento que la honró.',
  'conviértela en una acción pequeña y concreta hoy.',
];

interface DreamEntry {
  readonly key: string;
  readonly meaning: string;
}

const DREAMS: readonly DreamEntry[] = [
  { key: 'agua', meaning: 'El agua representa tus emociones: clara es calma, turbia es inquietud que pide atención. 🌊' },
  { key: 'volar', meaning: 'Soñar que vuelas habla de libertad y ganas de superar límites. 🕊️' },
  { key: 'diente', meaning: 'Los dientes en sueños se asocian a inseguridad o miedo al cambio. Sonríe igual. 😁' },
  { key: 'serpiente', meaning: 'La serpiente simboliza transformación: algo en ti está mudando de piel. 🐍' },
  { key: 'dinero', meaning: 'El dinero en sueños refleja autoestima y valor personal, no solo finanzas. 💰' },
  { key: 'boda', meaning: 'Las bodas anuncian uniones o compromisos nuevos en tu vida. 💒' },
  { key: 'fuego', meaning: 'El fuego es pasión y energía creativa buscando salida. 🔥' },
  { key: 'perro', meaning: 'El perro representa lealtad: valora a quienes siempre están. 🐶' },
  { key: 'examen', meaning: 'Soñar exámenes refleja presión por demostrar tu valía. Ya vas bien. 📝' },
  { key: 'casa', meaning: 'La casa eres tú: cada habitación, una parte de tu interior. 🏠' },
  { key: 'bebe', meaning: 'Un bebé en sueños anuncia un proyecto nuevo que necesita cuidado. 👶' },
  { key: 'bosque', meaning: 'El bosque invita a explorar lo desconocido dentro de ti. 🌲' },
];

interface SpiritEntry {
  readonly name: string;
  readonly emoji: string;
  readonly trait: string;
}

const SPIRITS: readonly SpiritEntry[] = [
  { name: 'Lobo', emoji: '🐺', trait: 'lealtad e instinto' },
  { name: 'Búho', emoji: '🦉', trait: 'sabiduría y visión' },
  { name: 'Zorro', emoji: '🦊', trait: 'astucia y adaptabilidad' },
  { name: 'Tortuga', emoji: '🐢', trait: 'paciencia y constancia' },
  { name: 'Águila', emoji: '🦅', trait: 'perspectiva y libertad' },
  { name: 'Delfín', emoji: '🐬', trait: 'alegría e inteligencia' },
  { name: 'Gato', emoji: '🐱', trait: 'independencia y misterio' },
  { name: 'Oso', emoji: '🐻', trait: 'fuerza y protección' },
  { name: 'Mariposa', emoji: '🦋', trait: 'transformación' },
  { name: 'Ciervo', emoji: '🦌', trait: 'sensibilidad y nobleza' },
  { name: 'Elefante', emoji: '🐘', trait: 'memoria y lealtad familiar' },
  { name: 'Colibrí', emoji: '🐦', trait: 'ligereza y disfrute del presente' },
];

interface BirthstoneEntry {
  readonly stone: string;
  readonly property: string;
}

const BIRTHSTONES: readonly BirthstoneEntry[] = [
  { stone: 'Granate', property: 'protección y energía vital' },
  { stone: 'Amatista', property: 'calma y claridad mental' },
  { stone: 'Aguamarina', property: 'serenidad y comunicación' },
  { stone: 'Diamante', property: 'fortaleza y pureza' },
  { stone: 'Esmeralda', property: 'amor y renovación' },
  { stone: 'Perla', property: 'pureza y sabiduría' },
  { stone: 'Rubí', property: 'pasión y coraje' },
  { stone: 'Peridoto', property: 'alegría y buena fortuna' },
  { stone: 'Zafiro', property: 'sabiduría y lealtad' },
  { stone: 'Ópalo', property: 'creatividad e inspiración' },
  { stone: 'Topacio', property: 'abundancia y generosidad' },
  { stone: 'Turquesa', property: 'protección y buena suerte' },
];

const WEEKDAYS: readonly string[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

interface PlaylistEntry {
  readonly genres: readonly [string, string, string];
  readonly desc: string;
}

const PLAYLISTS: Record<string, PlaylistEntry> = {
  happy: { genres: ['Pop', 'Funk', 'Reguetón'], desc: 'Ritmo arriba y sonrisas garantizadas. 🎉' },
  sad: { genres: ['Baladas', 'Lo-fi', 'Acústico'], desc: 'Para sentir, sanar y seguir adelante. 🌧️' },
  focus: { genres: ['Lo-fi', 'Clásica', 'Ambient'], desc: 'Concentración máxima, cero distracciones. 🎯' },
  party: { genres: ['Electrónica', 'Dembow', 'House'], desc: 'Volumen al máximo y a bailar. 🪩' },
  chill: { genres: ['Jazz suave', 'Bossa nova', 'Indie'], desc: 'Modo relax activado. 🛋️' },
};

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export const astro: Command = {
  data: new SlashCommandBuilder()
    .setName('astro')
    .setDescription('Vibes y fortuna 100% locales')
    .addSubcommand((s) =>
      s
        .setName('horoscopo')
        .setDescription('Tu horóscopo del día')
        .addStringOption((o) =>
          o
            .setName('signo')
            .setDescription('Tu signo')
            .setRequired(true)
            .addChoices(...SIGNS.map((sg) => ({ name: sg.name, value: sg.id }))),
        ),
    )
    .addSubcommand((s) =>
      s.setName('fase-lunar').setDescription('Fase lunar de una fecha').addStringOption((o) => o.setName('fecha').setDescription('Fecha YYYY-MM-DD').setRequired(true).setMaxLength(10)),
    )
    .addSubcommand((s) =>
      s.setName('mi-signo').setDescription('Descubre tu signo real').addStringOption((o) => o.setName('nacimiento').setDescription('Nacimiento YYYY-MM-DD').setRequired(true).setMaxLength(10)),
    )
    .addSubcommand((s) =>
      s
        .setName('compatibilidad')
        .setDescription('Compatibilidad entre dos signos')
        .addStringOption((o) =>
          o.setName('signo1').setDescription('Primer signo').setRequired(true).addChoices(...SIGNS.map((sg) => ({ name: sg.name, value: sg.id }))),
        )
        .addStringOption((o) =>
          o.setName('signo2').setDescription('Segundo signo').setRequired(true).addChoices(...SIGNS.map((sg) => ({ name: sg.name, value: sg.id }))),
        ),
    )
    .addSubcommand((s) =>
      s.setName('numero-suerte').setDescription('Tu número de la suerte de hoy').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('color-suerte').setDescription('Tu color de la suerte de hoy').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('emoji-suerte').setDescription('Tu emoji de la suerte de hoy').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('animo').setDescription('Tu estado de ánimo astral de hoy').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('energia').setDescription('Tu nivel de energía de hoy').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('aura').setDescription('El color de tu aura hoy').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('chakra').setDescription('Tu chakra del día').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) => s.setName('tarot').setDescription('Tu carta del tarot de hoy'))
    .addSubcommand((s) => s.setName('runa').setDescription('Tu runa del día'))
    .addSubcommand((s) => s.setName('cristal').setDescription('Tu cristal del día'))
    .addSubcommand((s) => s.setName('afirmacion').setDescription('Tu afirmación del día'))
    .addSubcommand((s) =>
      s.setName('manifestacion').setDescription('Ritual de 3 pasos para tu meta').addStringOption((o) => o.setName('meta').setDescription('Tu meta').setRequired(true).setMaxLength(200)),
    )
    .addSubcommand((s) => s.setName('diario').setDescription('Prompt de diario para hoy'))
    .addSubcommand((s) => s.setName('gratitud').setDescription('3 motivos de gratitud de hoy'))
    .addSubcommand((s) =>
      s.setName('intencion').setDescription('Fija tu intención del día').addStringOption((o) => o.setName('palabra').setDescription('Tu palabra').setRequired(true).setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s.setName('sueno').setDescription('Interpreta tu sueño').addStringOption((o) => o.setName('palabra-clave').setDescription('Palabra clave del sueño').setRequired(true).setMaxLength(50)),
    )
    .addSubcommand((s) =>
      s.setName('animal-espiritual').setDescription('Tu animal espiritual de hoy').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('descanso').setDescription('Consejo de descanso según tu edad').addIntegerOption((o) => o.setName('edad').setDescription('Tu edad').setRequired(true).setMinValue(1).setMaxValue(120)),
    )
    .addSubcommand((s) =>
      s
        .setName('playlist')
        .setDescription('Playlist según tu ánimo')
        .addStringOption((o) =>
          o
            .setName('animo')
            .setDescription('Tu ánimo')
            .setRequired(true)
            .addChoices(
              { name: 'Alegre', value: 'happy' },
              { name: 'Triste', value: 'sad' },
              { name: 'Concentración', value: 'focus' },
              { name: 'Fiesta', value: 'party' },
              { name: 'Relax', value: 'chill' },
            ),
        ),
    )
    .addSubcommand((s) =>
      s.setName('piedra-natal').setDescription('Tu piedra de nacimiento').addIntegerOption((o) => o.setName('mes').setDescription('Mes (1-12)').setRequired(true).setMinValue(1).setMaxValue(12)),
    )
    .addSubcommand((s) =>
      s.setName('dia-suerte').setDescription('Tu día de suerte de la semana').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    ),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const today = todayStr();

    switch (sub) {
      case 'horoscopo': {
        const sign = signById(interaction.options.getString('signo', true));
        const seed = `${sign.id}|${today}`;
        const text = seededPick(HOROSCOPES, seed);
        const lucky = (hashStr(seed) % 99) + 1;
        await interaction.reply({
          embeds: [Embeds.primary(`🔮 Horóscopo: ${sign.name} (${today})`, `${text}\n\n**Elemento:** ${sign.element}\n**Número de la suerte:** ${lucky}`)],
        });
        return;
      }
      case 'fase-lunar': {
        const parsed = parseISODate(interaction.options.getString('fecha', true));
        if (!parsed) {
          await interaction.reply({ embeds: [Embeds.error('Fecha inválida', 'Usa el formato `YYYY-MM-DD` con una fecha real.')], ephemeral: true });
          return;
        }
        const moon = moonPhase(parsed.y, parsed.m, parsed.d);
        await interaction.reply({
          embeds: [Embeds.primary(`${moon.emoji} Fase lunar`, `**Fecha:** ${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}\n**Fase:** ${moon.name}\n**Iluminación:** ${moon.illumination}% ${bar(moon.illumination)}`)],
        });
        return;
      }
      case 'mi-signo': {
        const parsed = parseISODate(interaction.options.getString('nacimiento', true));
        if (!parsed) {
          await interaction.reply({ embeds: [Embeds.error('Fecha inválida', 'Usa el formato `YYYY-MM-DD` con una fecha real.')], ephemeral: true });
          return;
        }
        const sign = signFromDate(parsed.m, parsed.d);
        await interaction.reply({
          embeds: [Embeds.success(`Tu signo es ${sign.name} ${['aries', 'leo', 'sagitario'].includes(sign.id) ? '🔥' : ['tauro', 'virgo', 'capricornio'].includes(sign.id) ? '🌍' : ['geminis', 'libra', 'acuario'].includes(sign.id) ? '🌬️' : '🌊'}`, `**Nacimiento:** ${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}\n**Signo:** ${sign.name} (${sign.dates})\n**Elemento:** ${sign.element}`)],
        });
        return;
      }
      case 'compatibilidad': {
        const s1 = signById(interaction.options.getString('signo1', true));
        const s2 = signById(interaction.options.getString('signo2', true));
        const pair = [s1.id, s2.id].sort().join('|');
        const pct = seededPercent(`compat|${pair}`);
        const verdict = pct >= 90 ? '¡Conexión legendaria! 💖' : pct >= 70 ? 'Gran compatibilidad ✨' : pct >= 50 ? 'Buena química 💫' : pct >= 30 ? 'Requiere paciencia 🌱' : 'Choque de trenes... pero divertido 🎢';
        const sameElement = s1.element === s2.element;
        const complementary =
          (s1.element === 'Fuego' && s2.element === 'Aire') ||
          (s1.element === 'Aire' && s2.element === 'Fuego') ||
          (s1.element === 'Tierra' && s2.element === 'Agua') ||
          (s1.element === 'Agua' && s2.element === 'Tierra');
        const extra = sameElement
          ? `Comparten elemento **${s1.element}**: se entienden casi sin hablar.`
          : complementary
            ? 'Elementos complementarios: se equilibran muy bien.'
            : 'Elementos distintos: la diferencia también suma.';
        await interaction.reply({
          embeds: [Embeds.primary(`💘 ${s1.name} + ${s2.name}`, `Compatibilidad: **${pct}%**\n${bar(pct)}\n${verdict}\n_${extra}_`)],
        });
        return;
      }
      case 'numero-suerte': {
        const target = interaction.options.getUser('usuario') ?? interaction.user;
        const n = (hashStr(`luckynum|${target.id}|${today}`) % 99) + 1;
        await interaction.reply({ embeds: [Embeds.success(`Número de la suerte de ${target.username}`, `${target}\nTu número de hoy es: **${n}** 🍀\n_(${today})_`) ] });
        return;
      }
      case 'color-suerte': {
        const target = interaction.options.getUser('usuario') ?? interaction.user;
        const color = seededPick(LUCKY_COLORS, `luckycolor|${target.id}|${today}`);
        const embed = Embeds.primary(`🎨 Color de la suerte de ${target.username}`, `${target}\nHoy tu color es **${color.name}** (\`${color.hex}\`)\n_(${today})_`).setColor(hexToInt(color.hex));
        await interaction.reply({ embeds: [embed] });
        return;
      }
      case 'emoji-suerte': {
        const target = interaction.options.getUser('usuario') ?? interaction.user;
        const emoji = seededPick(LUCKY_EMOJIS, `luckyemoji|${target.id}|${today}`);
        await interaction.reply({ embeds: [Embeds.primary(`Emoji de la suerte de ${target.username}`, `${target}\nTu emoji de hoy: ${emoji}\n_(${today})_`) ] });
        return;
      }
      case 'animo': {
        const target = interaction.options.getUser('usuario') ?? interaction.user;
        const mood = seededPick(MOODS, `mood|${target.id}|${today}`);
        await interaction.reply({ embeds: [Embeds.primary(`Ánimo astral de ${target.username}`, `${target}\nHoy estás: **${mood}**\n_(${today})_`) ] });
        return;
      }
      case 'energia': {
        const target = interaction.options.getUser('usuario') ?? interaction.user;
        const pct = seededPercent(`energy|${target.id}|${today}`);
        const msg = pct >= 80 ? '¡A tope! Aprovecha el día. ⚡' : pct >= 50 ? 'Buen nivel, ritmo constante. 🔋' : 'Día de bajón: ve con calma. 🛋️';
        await interaction.reply({ embeds: [Embeds.primary(`⚡ Energía de ${target.username}`, `${target}\nEnergía: **${pct}%**\n${bar(pct)}\n${msg}\n_(${today})_`) ] });
        return;
      }
      case 'aura': {
        const target = interaction.options.getUser('usuario') ?? interaction.user;
        const aura = seededPick(AURAS, `aura|${target.id}|${today}`);
        const embed = Embeds.primary(`🌈 Aura de ${target.username}`, `${target}\nTu aura de hoy es **${aura.name}**: ${aura.meaning}.\n_(${today})_`).setColor(hexToInt(aura.hex));
        await interaction.reply({ embeds: [embed] });
        return;
      }
      case 'chakra': {
        const target = interaction.options.getUser('usuario') ?? interaction.user;
        const chakra = seededPick(CHAKRAS, `chakra|${target.id}|${today}`);
        await interaction.reply({ embeds: [Embeds.primary(`🧘 Chakra del día de ${target.username}`, `${target}\nHoy trabaja tu chakra **${chakra.name}**: ${chakra.meaning}.\n_(${today})_`) ] });
        return;
      }
      case 'tarot': {
        const card = seededPick(TAROT, `tarot|${interaction.user.id}|${today}`);
        await interaction.reply({ embeds: [Embeds.primary(`🃏 Tu carta: ${card.name}`, `${card.meaning}\n_(${today})_`) ] });
        return;
      }
      case 'runa': {
        const rune = seededPick(RUNES, `rune|${interaction.user.id}|${today}`);
        await interaction.reply({ embeds: [Embeds.primary(`${rune.char} Tu runa: ${rune.name}`, `${rune.meaning}\n_(${today})_`) ] });
        return;
      }
      case 'cristal': {
        const crystal = seededPick(CRYSTALS, `crystal|${interaction.user.id}|${today}`);
        await interaction.reply({ embeds: [Embeds.primary(`💎 Tu cristal: ${crystal.name}`, `Propiedad: **${crystal.property}**.\nLlévalo contigo o visualízalo hoy.\n_(${today})_`) ] });
        return;
      }
      case 'afirmacion': {
        const text = seededPick(AFFIRMATIONS, `affirm|${interaction.user.id}|${today}`);
        await interaction.reply({ embeds: [Embeds.success('Tu afirmación de hoy', `${text}\n_(${today})_`) ] });
        return;
      }
      case 'manifestacion': {
        const goal = interaction.options.getString('meta', true);
        const seed = `${goal.toLowerCase()}|${today}`;
        const step1 = seededPick(MANIFEST_STEPS_1, `${seed}|1`);
        const step2 = seededPick(MANIFEST_STEPS_2, `${seed}|2`);
        const step3 = seededPick(MANIFEST_STEPS_3, `${seed}|3`);
        await interaction.reply({
          embeds: [Embeds.primary('🌟 Ritual de manifestación', `**Tu meta:** ${goal}\n\n**Paso 1 — Visualiza:** ${step1}\n**Paso 2 — Actúa:** ${step2}\n**Paso 3 — Agradece:** ${step3}\n_(${today})_`)],
        });
        return;
      }
      case 'diario': {
        const prompt = seededPick(JOURNAL_PROMPTS, `journal|${interaction.user.id}|${today}`);
        await interaction.reply({ embeds: [Embeds.primary('📓 Prompt de diario', `${prompt}\n_(${today})_`) ] });
        return;
      }
      case 'gratitud': {
        const h = hashStr(`gratitude|${interaction.user.id}|${today}`);
        const a = GRATITUDE[h % GRATITUDE.length] as string;
        const b = GRATITUDE[(h + 5) % GRATITUDE.length] as string;
        const c = GRATITUDE[(h + 9) % GRATITUDE.length] as string;
        await interaction.reply({
          embeds: [Embeds.success('🙏 Gratitud de hoy', `Agradece por:\n1. ${a}\n2. ${b}\n3. ${c}\n_(${today})_`)],
        });
        return;
      }
      case 'intencion': {
        const word = interaction.options.getString('palabra', true);
        const focus = seededPick(INTENTION_FOCUS, `${word.toLowerCase()}|${today}`);
        await interaction.reply({ embeds: [Embeds.primary('🎯 Tu intención', `Tu palabra de hoy es **${word}**: ${focus}`) ] });
        return;
      }
      case 'sueno': {
        const keyword = interaction.options.getString('palabra-clave', true);
        const nk = norm(keyword);
        const found = nk.length >= 3 ? DREAMS.find((e) => nk === e.key || nk.includes(e.key)) : undefined;
        if (found) {
          await interaction.reply({ embeds: [Embeds.primary(`💤 Sueño: "${keyword}"`, found.meaning) ] });
        } else {
          await interaction.reply({
            embeds: [Embeds.primary(`💤 Sueño: "${keyword}"`, 'Tu sueño habla de algo que ronda tu mente últimamente. Anótalo al despertar 3 noches seguidas y el patrón se revelará. 🌙')],
          });
        }
        return;
      }
      case 'animal-espiritual': {
        const target = interaction.options.getUser('usuario') ?? interaction.user;
        const spirit = seededPick(SPIRITS, `spirit|${target.id}|${today}`);
        await interaction.reply({
          embeds: [Embeds.primary(`${spirit.emoji} Animal espiritual de ${target.username}`, `${target}\nHoy te guía el **${spirit.name}**: ${spirit.trait}.\n_(${today})_`)],
        });
        return;
      }
      case 'descanso': {
        const age = interaction.options.getInteger('edad', true);
        const hours = age < 3 ? 12 : age <= 5 ? 11 : age <= 12 ? 10 : age <= 17 ? 9 : age <= 64 ? 8 : 7.5;
        const totalMin = ((7 * 60 - Math.round(hours * 60)) % 1440 + 1440) % 1440;
        const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
        const mm = String(totalMin % 60).padStart(2, '0');
        await interaction.reply({
          embeds: [Embeds.primary('😴 Consejo de descanso', `Con **${age} años** necesitas unas **${hours} horas** de sueño.\nSi quieres despertar a las 07:00, acuéstate sobre las **${hh}:${mm}**. 🌙`)],
        });
        return;
      }
      case 'playlist': {
        const mood = interaction.options.getString('animo', true);
        const entry = PLAYLISTS[mood] ?? PLAYLISTS['chill'];
        const pl = entry as PlaylistEntry;
        await interaction.reply({
          embeds: [Embeds.success(`🎧 Playlist: ${mood}`, `${pl.desc}\n**Géneros:** ${pl.genres.join(' • ')}`)],
        });
        return;
      }
      case 'piedra-natal': {
        const month = interaction.options.getInteger('mes', true);
        const entry = BIRTHSTONES[month - 1] as BirthstoneEntry;
        const monthName = new Date(Date.UTC(2024, month - 1, 1)).toLocaleString('es-ES', { month: 'long', timeZone: 'UTC' });
        await interaction.reply({ embeds: [Embeds.primary(`💎 Piedra del mes ${month} (${monthName})`, `Tu piedra es el **${entry.stone}**: ${entry.property}.`) ] });
        return;
      }
      case 'dia-suerte': {
        const target = interaction.options.getUser('usuario') ?? interaction.user;
        const day = seededPick(WEEKDAYS, `luckyday|${target.id}|${today}`);
        await interaction.reply({ embeds: [Embeds.success(`Día de suerte de ${target.username}`, `${target}\nTu día de suerte esta semana es el **${day}**. 🍀`) ] });
        return;
      }
      default: {
        await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
        return;
      }
    }
  },
};
