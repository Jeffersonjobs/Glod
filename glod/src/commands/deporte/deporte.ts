/**
 * Deporte: /deporte <25 subcomandos de rutinas 100% locales, sin APIs ni DB>.
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

interface Rutina {
  readonly nombre: string;
  readonly duracion: string;
  readonly nivel: string;
  readonly ejercicios: readonly string[];
  readonly consejo: string;
}

function formatRutina(r: Rutina): string {
  const lista = r.ejercicios.map((e, i) => `${i + 1}. ${e}`).join('\n');
  return `**${r.nombre}**\n\n**Duración:** ${r.duracion}\n**Nivel:** ${r.nivel}\n\n**Ejercicios:**\n${lista}\n\n**Consejo:** ${r.consejo}`;
}

const CALENTAMIENTO: readonly Rutina[] = [
  { nombre: 'Activación articular total', duracion: '8 min', nivel: 'Principiante', ejercicios: ['Rotación de cuello: 30 segundos por lado', 'Círculos de hombros: 15 repeticiones', 'Rotación de cadera: 12 repeticiones por lado', 'Sentadillas sin peso: 15 repeticiones', 'Marcha en el sitio: 60 segundos'], consejo: 'Respira de forma constante y no fuerces ninguna articulación.' },
  { nombre: 'Chispa matutina', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Saltos suaves (jumping jacks): 30 segundos', 'Balanceo de piernas: 12 repeticiones por pierna', 'Rotación de tronco: 15 repeticiones', 'Flexiones inclinadas: 10 repeticiones', 'Trote suave en el sitio: 60 segundos'], consejo: 'Empieza despacio y sube la intensidad poco a poco.' },
  { nombre: 'Movilidad dinámica', duracion: '10 min', nivel: 'Intermedio', ejercicios: ['Zancadas con giro: 10 repeticiones por lado', 'Puente de glúteos: 15 repeticiones', 'Gato-vaca: 12 repeticiones', 'Skipping bajo: 40 segundos', 'Plancha de antebrazos: 30 segundos'], consejo: 'Mantén el abdomen activo en cada movimiento.' },
  { nombre: 'Despertar corporal', duracion: '7 min', nivel: 'Principiante', ejercicios: ['Inclinaciones laterales: 12 repeticiones por lado', 'Elevación de rodillas: 20 repeticiones', 'Aperturas de pecho: 15 repeticiones', 'Sentadilla con pausa: 10 repeticiones'], consejo: 'Hazlo nada más levantarte para activar la circulación.' },
  { nombre: 'Pre-entreno exprés', duracion: '6 min', nivel: 'Intermedio', ejercicios: ['Jumping jacks: 40 segundos', 'Sentadillas con salto bajo: 10 repeticiones', 'Fondos de tríceps en silla: 10 repeticiones', 'Plancha lateral: 20 segundos por lado', 'Sprints en el sitio: 30 segundos'], consejo: 'Suda un poco: esa es la señal de que estás listo.' },
  { nombre: 'Articulaciones felices', duracion: '8 min', nivel: 'Principiante', ejercicios: ['Círculos de muñecas y tobillos: 30 segundos cada uno', 'Rotación de rodillas: 12 repeticiones', 'Estocadas laterales suaves: 10 por lado', 'Puente corto: 12 repeticiones', 'Respiración profunda con brazos: 6 repeticiones'], consejo: 'Ideal antes de cualquier deporte o caminata.' },
  { nombre: 'Calentamiento atlético', duracion: '12 min', nivel: 'Intermedio', ejercicios: ['Trote suave: 2 minutos', 'Zancadas caminando: 12 por pierna', 'Skipping alto: 30 segundos', 'Desplantes con salto alterno: 10 repeticiones', 'Burpees sin flexión: 8 repeticiones', 'Plancha: 40 segundos'], consejo: 'Termina con el pulso elevado pero pudiendo hablar.' },
  { nombre: 'Suave y progresivo', duracion: '9 min', nivel: 'Principiante', ejercicios: ['Marcha con brazos activos: 60 segundos', 'Sentadilla asistida en silla: 12 repeticiones', 'Elevaciones de talones: 15 repeticiones', 'Apertura de cadera de pie: 10 por lado', 'Rotación de hombros con pausa: 12 repeticiones'], consejo: 'Perfecto si llevas tiempo sin entrenar.' },
];

const BRAZOS: readonly Rutina[] = [
  { nombre: 'Brazos de acero en casa', duracion: '15 min', nivel: 'Principiante', ejercicios: ['Flexiones de rodillas: 10 repeticiones', 'Fondos en silla: 12 repeticiones', 'Curl con botellas: 12 repeticiones por brazo', 'Plancha con toques de hombro: 20 segundos'], consejo: 'Aprieta el bíceps un segundo arriba en cada repetición.' },
  { nombre: 'Bíceps y tríceps foco', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Flexiones diamante: 10 repeticiones', 'Fondos en silla con pies elevados: 12 repeticiones', 'Curl martillo con mochila: 12 repeticiones', 'Extensión de tríceps tras nuca: 12 repeticiones', 'Curl isométrico: 20 segundos'], consejo: 'Descansa 45 segundos entre series para rendir más.' },
  { nombre: 'Tonos sin material', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Flexiones inclinadas en mesa: 12 repeticiones', 'Fondos cortos en silla: 10 repeticiones', 'Círculos de brazos: 30 segundos', 'Plancha alta: 30 segundos', 'Superman con brazos al frente: 12 repeticiones'], consejo: 'Mantén los codos cerca del cuerpo en los fondos.' },
  { nombre: 'Explosión de brazos', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Flexiones estándar: 12 repeticiones', 'Flexiones con palmada en muslo: 8 repeticiones', 'Fondos profundos: 12 repeticiones', 'Pike push-ups: 10 repeticiones', 'Plancha a flexión (up-down): 10 repeticiones'], consejo: 'Si fallas la técnica, baja las repeticiones antes que la forma.' },
  { nombre: 'Brazos exprés', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Flexiones de pared: 15 repeticiones', 'Elevaciones frontales con botellas: 12 repeticiones', 'Patada de tríceps sin peso: 12 por brazo', 'Sombra de boxeo: 40 segundos'], consejo: 'Ideal como complemento de otro entrenamiento.' },
  { nombre: 'Hombros y brazos 360', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Pike push-ups: 12 repeticiones', 'Elevaciones laterales con botellas: 12 repeticiones', 'Flexiones abiertas: 10 repeticiones', 'Fondos en silla: 15 repeticiones', 'Plancha con desplazamiento: 30 segundos'], consejo: 'No encojas los hombros hacia las orejas.' },
  { nombre: 'Fuerza progresiva', duracion: '22 min', nivel: 'Intermedio', ejercicios: ['Flexiones estándar: 3 series de 10 repeticiones', 'Fondos en silla: 3 series de 12 repeticiones', 'Curl con mochila pesada: 3 series de 10 repeticiones', 'Extensión de tríceps: 3 series de 12 repeticiones'], consejo: 'Añade una repetición por semana para progresar.' },
  { nombre: 'Brazos suaves senior', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Flexiones de pared: 12 repeticiones', 'Elevación de brazos al frente sin peso: 12 repeticiones', 'Apretón de manos isométrico: 20 segundos', 'Círculos pequeños: 30 segundos', 'Estiramiento de tríceps: 20 segundos por brazo'], consejo: 'Sin dolor: el esfuerzo debe sentirse cómodo.' },
];

const PIERNAS: readonly Rutina[] = [
  { nombre: 'Piernas básicas', duracion: '15 min', nivel: 'Principiante', ejercicios: ['Sentadillas: 15 repeticiones', 'Zancadas estáticas: 10 por pierna', 'Elevación de talones: 15 repeticiones', 'Puente de glúteos: 12 repeticiones'], consejo: 'Empuja con los talones al subir en la sentadilla.' },
  { nombre: 'Cuádriceps de hierro', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Sentadillas con pausa de 3 segundos: 12 repeticiones', 'Zancadas caminando: 12 por pierna', 'Sentadilla búlgara en silla: 10 por pierna', 'Sentadilla con salto: 10 repeticiones', 'Pared (wall sit): 40 segundos'], consejo: 'Mantén las rodillas alineadas con los pies.' },
  { nombre: 'Piernas sin impacto', duracion: '14 min', nivel: 'Principiante', ejercicios: ['Sentadilla asistida: 12 repeticiones', 'Puente de glúteos: 15 repeticiones', 'Abducción tumbada: 12 por lado', 'Elevación de talones sentado: 15 repeticiones', 'Estiramiento de cuádriceps: 20 segundos por pierna'], consejo: 'Perfecta si te duelen las rodillas al saltar.' },
  { nombre: 'Tren inferior potente', duracion: '22 min', nivel: 'Intermedio', ejercicios: ['Sentadilla profunda: 15 repeticiones', 'Peso muerto a una pierna sin peso: 10 por lado', 'Zancada lateral: 12 por lado', 'Hip thrust en silla: 15 repeticiones', 'Salto a cajón bajo o escalón: 10 repeticiones'], consejo: 'Activa el glúteo apretando fuerte arriba.' },
  { nombre: 'Gemelos y muslos', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Elevación de talones de pie: 20 repeticiones', 'Sentadillas sumo: 12 repeticiones', 'Zancadas cortas: 10 por pierna', 'Puente con pies juntos: 12 repeticiones'], consejo: 'Sube lento y baja aún más lento en los talones.' },
  { nombre: 'Piernas exprés', duracion: '10 min', nivel: 'Intermedio', ejercicios: ['Sentadillas: 20 repeticiones', 'Zancadas alternas: 20 repeticiones totales', 'Sentadilla con salto: 10 repeticiones', 'Pared: 30 segundos'], consejo: 'Dos rondas si tienes 20 minutos.' },
  { nombre: 'Fuerza unilateral', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Sentadilla a una pierna asistida: 8 por lado', 'Zancada búlgara: 10 por pierna', 'Step-up en escalón: 12 por pierna', 'Puente a una pierna: 10 por lado', 'Pared a una pierna: 20 segundos por lado'], consejo: 'Trabaja el lado débil primero.' },
  { nombre: 'Piernas y glúteos suaves', duracion: '15 min', nivel: 'Principiante', ejercicios: ['Sentadillas cortas: 12 repeticiones', 'Puente de glúteos: 12 repeticiones', 'Patada de glúteo a cuatro patas: 12 por pierna', 'Elevación lateral tumbada: 12 por lado'], consejo: 'Siente el músculo trabajar, sin prisas.' },
];

const ABDOMEN: readonly Rutina[] = [
  { nombre: 'Core esencial', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Plancha de rodillas: 30 segundos', 'Crunch abdominal: 15 repeticiones', 'Elevación de piernas tumbada: 10 repeticiones', 'Giro ruso sin peso: 12 repeticiones'], consejo: 'Pega la zona lumbar al suelo en los crunch.' },
  { nombre: 'Abdominales de fuego', duracion: '15 min', nivel: 'Intermedio', ejercicios: ['Plancha alta: 45 segundos', 'Bicicletas: 20 repeticiones', 'Elevación de piernas: 12 repeticiones', 'Escaladores: 30 segundos', 'Hollow hold: 20 segundos'], consejo: 'Respira: exhala al contraer, inhala al volver.' },
  { nombre: 'Vientre plano suave', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Respiración abdominal tumbada: 60 segundos', 'Puente con abdomen activo: 12 repeticiones', 'Crunch corto: 12 repeticiones', 'Plancha de rodillas: 25 segundos', 'Gato-vaca: 10 repeticiones'], consejo: 'Combínala con caminatas para mejores resultados.' },
  { nombre: 'Core 360', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Plancha lateral: 30 segundos por lado', 'Giro ruso con botella: 16 repeticiones', 'Toques de talón: 20 repeticiones', 'Superman: 12 repeticiones', 'Plancha con toques de hombro: 30 segundos'], consejo: 'No olvides la espalda baja: también es core.' },
  { nombre: 'Abdominales exprés', duracion: '7 min', nivel: 'Principiante', ejercicios: ['Crunch: 15 repeticiones', 'Bicicletas lentas: 16 repeticiones', 'Plancha: 30 segundos', 'Elevación de cadera: 12 repeticiones'], consejo: 'Calidad antes que cantidad.' },
  { nombre: 'Oblicuos marcados', duracion: '14 min', nivel: 'Intermedio', ejercicios: ['Plancha lateral con elevación: 10 por lado', 'Giro ruso: 20 repeticiones', 'Leñador sin peso: 12 por lado', 'Plancha lateral dinámica: 30 segundos por lado'], consejo: 'Rota desde el tronco, no solo con los brazos.' },
  { nombre: 'Core de pie', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Elevación de rodilla al codo de pie: 12 por lado', 'Inclinación lateral de pie: 12 por lado', 'Marcha con rodilla alta: 40 segundos', 'Giro de tronco con brazos: 15 repeticiones'], consejo: 'Ideal si te molesta estar tumbado en el suelo.' },
  { nombre: 'Reto plancha total', duracion: '15 min', nivel: 'Intermedio', ejercicios: ['Plancha de antebrazos: 45 segundos', 'Plancha lateral derecha: 30 segundos', 'Plancha lateral izquierda: 30 segundos', 'Plancha inversa en silla: 25 segundos', 'Plancha alta: 40 segundos'], consejo: 'Aprieta glúteos y abdomen como un bloque.' },
];

const ESPALDA: readonly Rutina[] = [
  { nombre: 'Espalda sana', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Superman: 12 repeticiones', 'Remo con botellas inclinado: 12 repeticiones', 'Gato-vaca: 12 repeticiones', 'Ángel en pared: 10 repeticiones'], consejo: 'Junta los omóplatos en cada repetición de remo.' },
  { nombre: 'Dorsales fuertes', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Remo con mochila: 12 repeticiones', 'Superman con pausa: 12 repeticiones', 'Remo a un brazo con botella: 10 por lado', 'Plancha con remo alterno: 10 repeticiones', 'Puente prono: 30 segundos'], consejo: 'Baja el peso despacio para trabajar más.' },
  { nombre: 'Postura erguida', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Aperturas de pecho en puerta: 30 segundos', 'Encogimiento de omóplatos: 15 repeticiones', 'Superman corto: 10 repeticiones', 'Rotación externa con banda o toalla: 12 repeticiones'], consejo: 'Hazla a diario si trabajas sentado.' },
  { nombre: 'Espalda baja feliz', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Puente de glúteos: 12 repeticiones', 'Superman alterno (brazo-pierna): 10 por lado', 'Postura del niño: 40 segundos', 'Gato-vaca lento: 10 repeticiones'], consejo: 'Nunca fuerces si hay dolor agudo.' },
  { nombre: 'Espalda total', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Remo inclinado con mochila: 15 repeticiones', 'Peso muerto sin peso a una pierna: 10 por lado', 'Superman con brazos en cruz: 12 repeticiones', 'Remo renegado sin peso: 10 por lado', 'Plancha: 45 segundos'], consejo: 'Mantén la espalda recta como una tabla.' },
  { nombre: 'Alas exprés', duracion: '10 min', nivel: 'Intermedio', ejercicios: ['Remo con botellas: 15 repeticiones', 'Superman: 15 repeticiones', 'Ángel en suelo: 10 repeticiones', 'Plancha con toque de hombro: 30 segundos'], consejo: 'Controla la respiración en cada repetición.' },
  { nombre: 'Movilidad dorsal', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Rotación torácica a cuatro patas: 10 por lado', 'Hilo y aguja: 8 por lado', 'Extensión sobre silla: 10 repeticiones', 'Abrazo de rodillas: 30 segundos'], consejo: 'Muévete lento y disfruta el estiramiento.' },
  { nombre: 'Espalda de nadador', duracion: '15 min', nivel: 'Intermedio', ejercicios: ['Superman estilo braza: 12 repeticiones', 'Remo amplio con botellas: 12 repeticiones', 'Plancha con elevación de brazo: 10 por lado', 'Puente prono lateral: 25 segundos por lado'], consejo: 'Imagina que nadas en cada repetición.' },
];

const PECHO: readonly Rutina[] = [
  { nombre: 'Pecho básico', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Flexiones de rodillas: 10 repeticiones', 'Flexiones inclinadas: 12 repeticiones', 'Aperturas con botellas tumbado: 12 repeticiones', 'Plancha alta: 30 segundos'], consejo: 'Baja el pecho hasta casi rozar el suelo.' },
  { nombre: 'Pectorales potentes', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Flexiones estándar: 15 repeticiones', 'Flexiones abiertas: 12 repeticiones', 'Flexiones declinadas (pies en silla): 10 repeticiones', 'Fondos entre sillas: 10 repeticiones', 'Press con mochila tumbado: 12 repeticiones'], consejo: 'Descansa 60 segundos entre ejercicios duros.' },
  { nombre: 'Pecho sin suelo', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Flexiones de pared: 15 repeticiones', 'Press de pie con botellas: 12 repeticiones', 'Apretón isométrico de palmas: 20 segundos', 'Aperturas de pie: 12 repeticiones'], consejo: 'Aprieta fuerte las palmas en el isométrico.' },
  { nombre: 'Pecho y tríceps', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Flexiones diamante: 10 repeticiones', 'Flexiones estándar: 12 repeticiones', 'Fondos en silla: 12 repeticiones', 'Aperturas tumbado: 12 repeticiones', 'Plancha a flexión: 30 segundos'], consejo: 'Alterna un ejercicio de pecho y uno de tríceps.' },
  { nombre: 'Flexiones progresivas', duracion: '15 min', nivel: 'Principiante', ejercicios: ['Flexiones de pared: 12 repeticiones', 'Flexiones de rodillas: 10 repeticiones', 'Flexiones inclinadas bajas: 8 repeticiones', 'Plancha de rodillas: 30 segundos'], consejo: 'Avanza de nivel cuando completes todo sin parar.' },
  { nombre: 'Pecho exprés', duracion: '8 min', nivel: 'Intermedio', ejercicios: ['Flexiones estándar: 15 repeticiones', 'Flexiones abiertas: 10 repeticiones', 'Flexiones con pausa abajo: 8 repeticiones'], consejo: 'La pausa de 2 segundos abajo lo cambia todo.' },
  { nombre: 'Circuito pectoral', duracion: '16 min', nivel: 'Intermedio', ejercicios: ['Flexiones: 12 repeticiones', 'Aperturas con botellas: 12 repeticiones', 'Fondos: 10 repeticiones', 'Press tumbado con mochila: 10 repeticiones', 'Plancha: 40 segundos'], consejo: 'Repite el circuito 2 veces con 2 minutos de pausa.' },
  { nombre: 'Pecho suave senior', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Flexiones de pared: 12 repeticiones', 'Apretón de palmas: 15 segundos (3 veces)', 'Elevación de brazos cruzados: 10 repeticiones', 'Respiración con apertura: 8 repeticiones'], consejo: 'Movimientos controlados y sin rebotes.' },
];

const HOMBROS: readonly Rutina[] = [
  { nombre: 'Hombros redondos', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Elevaciones laterales con botellas: 12 repeticiones', 'Elevaciones frontales: 12 repeticiones', 'Círculos amplios: 30 segundos', 'Press de pie con botellas: 10 repeticiones'], consejo: 'No subas los brazos por encima de la línea de los hombros si molesta.' },
  { nombre: 'Deltoides 3D', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Press militar con mochila: 12 repeticiones', 'Elevaciones laterales: 12 repeticiones', 'Pájaros (deltoides posterior): 12 repeticiones', 'Pike push-ups: 10 repeticiones', 'Encogimientos: 15 repeticiones'], consejo: 'Trabaja las 3 cabezas del hombro en cada sesión.' },
  { nombre: 'Hombros sanos', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Rotación externa con toalla: 12 repeticiones', 'Ángel en pared: 10 repeticiones', 'Elevaciones suaves sin peso: 12 repeticiones', 'Estiramiento cruzado: 20 segundos por brazo'], consejo: 'El calentamiento es obligatorio para los hombros.' },
  { nombre: 'Press total', duracion: '15 min', nivel: 'Intermedio', ejercicios: ['Pike push-ups: 12 repeticiones', 'Press con botellas sentado: 12 repeticiones', 'Elevación lateral con pausa: 10 repeticiones', 'Plancha con toques: 30 segundos'], consejo: 'Mantén el core apretado al presionar.' },
  { nombre: 'Hombros exprés', duracion: '8 min', nivel: 'Principiante', ejercicios: ['Círculos adelante y atrás: 30 segundos', 'Elevaciones laterales ligeras: 12 repeticiones', 'Press sin peso: 15 repeticiones'], consejo: 'Perfecto como activación antes de nadar.' },
  { nombre: 'Fuerza overhead', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Press militar con mochila: 3 series de 10 repeticiones', 'Pike push-ups: 3 series de 10 repeticiones', 'Elevaciones laterales: 3 series de 12 repeticiones', 'Plancha alta: 45 segundos'], consejo: 'Aumenta el peso de la mochila poco a poco.' },
  { nombre: 'Movilidad de hombro', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Dislocaciones con toalla: 10 repeticiones', 'Rotación torácica: 10 por lado', 'Estiramiento de deltoides: 20 segundos por brazo', 'Gato-vaca: 10 repeticiones'], consejo: 'Si hay chasquidos con dolor, consulta a un profesional.' },
  { nombre: 'Hombros y trapecio', duracion: '14 min', nivel: 'Intermedio', ejercicios: ['Encogimientos con mochila: 15 repeticiones', 'Elevaciones laterales: 12 repeticiones', 'Remo al mentón con botellas: 12 repeticiones', 'Superman con brazos en Y: 10 repeticiones'], consejo: 'Baja los hombros lejos de las orejas al remar.' },
];

const GLUTEOS: readonly Rutina[] = [
  { nombre: 'Glúteos firmes', duracion: '14 min', nivel: 'Principiante', ejercicios: ['Puente de glúteos: 15 repeticiones', 'Patada a cuatro patas: 12 por pierna', 'Abducción tumbada: 12 por lado', 'Sentadillas: 12 repeticiones'], consejo: 'Aprieta fuerte arriba durante 2 segundos.' },
  { nombre: 'Booty en llamas', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Hip thrust en silla: 15 repeticiones', 'Sentadilla búlgara: 10 por pierna', 'Patada con pausa: 12 por pierna', 'Abducción con banda o toalla: 15 repeticiones', 'Puente a una pierna: 10 por lado'], consejo: 'Siente el glúteo, no la espalda baja.' },
  { nombre: 'Glúteos sin impacto', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Puente corto: 15 repeticiones', 'Almeja tumbada: 12 por lado', 'Elevación lateral de pie: 12 por pierna', 'Sentadilla sumo corta: 12 repeticiones'], consejo: 'Ideal para proteger las rodillas.' },
  { nombre: 'Potencia de cadera', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Hip thrust pesado con mochila: 12 repeticiones', 'Peso muerto rumano sin peso: 15 repeticiones', 'Zancada lateral: 12 por lado', 'Sentadilla con salto: 10 repeticiones', 'Pared: 40 segundos'], consejo: 'La cadera manda: empuja con fuerza.' },
  { nombre: 'Glúteos exprés', duracion: '8 min', nivel: 'Principiante', ejercicios: ['Puente: 15 repeticiones', 'Patadas traseras de pie: 12 por pierna', 'Sentadillas: 15 repeticiones'], consejo: 'Hazlo cada mañana para activar la postura.' },
  { nombre: 'Redondez total', duracion: '16 min', nivel: 'Intermedio', ejercicios: ['Sentadilla profunda: 15 repeticiones', 'Hip thrust a una pierna: 10 por lado', 'Step-up alto: 10 por pierna', 'Abducción tumbada con pausa: 12 por lado'], consejo: 'Combina fuerza y activación en la misma sesión.' },
  { nombre: 'Activación previa', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Puente con apertura: 12 repeticiones', 'Marcha de cangrejo lateral: 10 pasos por lado', 'Patada corta: 12 por pierna', 'Sentadilla sin peso: 10 repeticiones'], consejo: 'Úsala como calentamiento antes de correr.' },
  { nombre: 'Glúteos de pie', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Sentadilla sumo: 12 repeticiones', 'Patada trasera con apoyo en silla: 12 por pierna', 'Elevación lateral con apoyo: 12 por pierna', 'Zancada corta: 10 por pierna'], consejo: 'Apóyate en una silla si pierdes el equilibrio.' },
];

const CARDIO: readonly Rutina[] = [
  { nombre: 'Cardio feliz', duracion: '15 min', nivel: 'Principiante', ejercicios: ['Marcha enérgica en el sitio: 2 minutos', 'Jumping jacks suaves: 40 segundos', 'Elevación de rodillas: 40 segundos', 'Toques de talón atrás: 40 segundos', 'Marcha de enfriamiento: 60 segundos'], consejo: 'Debes poder hablar entrecortado, sin ahogarte.' },
  { nombre: 'Quema moderada', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Trote en el sitio: 2 minutos', 'Jumping jacks: 45 segundos', 'Skipping: 40 segundos', 'Burpees sin salto: 10 repeticiones', 'Escaladores: 40 segundos', 'Marcha: 60 segundos'], consejo: 'Bebe agua antes, durante y después.' },
  { nombre: 'Cardio sin saltos', duracion: '15 min', nivel: 'Principiante', ejercicios: ['Marcha rápida: 2 minutos', 'Pasos laterales rápidos: 45 segundos', 'Rodillas altas sin salto: 45 segundos', 'Boxeo de sombra: 60 segundos', 'Marcha suave: 60 segundos'], consejo: 'Cuida a tus vecinos: cero impacto, mismo esfuerzo.' },
  { nombre: 'Cardio dance', duracion: '18 min', nivel: 'Principiante', ejercicios: ['Paso lateral con palmada: 60 segundos', 'Marcha con brazos arriba: 60 segundos', 'Toque de pie alterno: 45 segundos', 'Giro con paso: 45 segundos', 'Baile libre: 2 minutos'], consejo: 'Pon tu música favorita y disfruta.' },
  { nombre: 'Cardio atlético', duracion: '22 min', nivel: 'Intermedio', ejercicios: ['Skipping alto: 45 segundos', 'Jumping jacks: 45 segundos', 'Zancadas con salto: 20 segundos', 'Burpees: 8 repeticiones', 'Sprint en el sitio: 30 segundos', 'Caminata: 90 segundos'], consejo: 'Repite el bloque 3 veces.' },
  { nombre: 'Cardio escalera', duracion: '16 min', nivel: 'Intermedio', ejercicios: ['Sube y baja escalones: 2 minutos', 'Step-up rápido: 45 segundos por pierna', 'Fondos en escalón: 10 repeticiones', 'Marcha en escalón: 60 segundos'], consejo: 'Agárrate al pasamanos si lo necesitas.' },
  { nombre: 'Cardio suave senior', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Caminata en el sitio: 3 minutos', 'Pasos laterales: 60 segundos', 'Elevación de brazos marchando: 60 segundos', 'Marcha lenta: 60 segundos'], consejo: 'A tu ritmo: moverse ya es ganar.' },
  { nombre: 'Cardio tabata light', duracion: '12 min', nivel: 'Intermedio', ejercicios: ['Jumping jacks: 20 segundos de trabajo y 10 de pausa (4 rondas)', 'Escaladores: 20 segundos de trabajo y 10 de pausa (4 rondas)', 'Sentadillas rápidas: 20 segundos de trabajo y 10 de pausa (4 rondas)'], consejo: 'Da el máximo en los 20 segundos.' },
];

const HIIT: readonly Rutina[] = [
  { nombre: 'HIIT iniciación', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Sentadillas: 30 segundos de trabajo y 20 de pausa', 'Flexiones de rodillas: 30 segundos de trabajo y 20 de pausa', 'Jumping jacks suaves: 30 segundos de trabajo y 20 de pausa', 'Plancha: 30 segundos de trabajo y 20 de pausa'], consejo: 'Repite el circuito 2 veces.' },
  { nombre: 'HIIT quemagrasa', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Burpees: 40 segundos de trabajo y 20 de pausa', 'Escaladores: 40 segundos de trabajo y 20 de pausa', 'Sentadilla con salto: 40 segundos de trabajo y 20 de pausa', 'Flexiones: 40 segundos de trabajo y 20 de pausa', 'Skipping: 40 segundos de trabajo y 20 de pausa'], consejo: 'Calienta 5 minutos antes, siempre.' },
  { nombre: 'HIIT sin saltos', duracion: '14 min', nivel: 'Principiante', ejercicios: ['Sentadillas rápidas: 30 segundos de trabajo y 20 de pausa', 'Remo sin peso inclinado: 30 segundos de trabajo y 20 de pausa', 'Zancadas alternas: 30 segundos de trabajo y 20 de pausa', 'Boxeo de sombra: 30 segundos de trabajo y 20 de pausa'], consejo: 'Intenso no significa con impacto.' },
  { nombre: 'HIIT total body', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Burpees con flexión: 40 segundos de trabajo y 20 de pausa', 'Zancadas con salto: 40 segundos de trabajo y 20 de pausa', 'Pike push-ups: 40 segundos de trabajo y 20 de pausa', 'Bicicletas: 40 segundos de trabajo y 20 de pausa', 'Plancha dinámica: 40 segundos de trabajo y 20 de pausa'], consejo: 'Termina con 3 minutos de caminata suave.' },
  { nombre: 'HIIT exprés', duracion: '8 min', nivel: 'Intermedio', ejercicios: ['Jumping jacks: 30 segundos de trabajo y 15 de pausa', 'Sentadillas: 30 segundos de trabajo y 15 de pausa', 'Escaladores: 30 segundos de trabajo y 15 de pausa', 'Burpees: 30 segundos de trabajo y 15 de pausa'], consejo: 'Corto pero brutal: dalo todo.' },
  { nombre: 'HIIT core', duracion: '12 min', nivel: 'Intermedio', ejercicios: ['Escaladores: 40 segundos de trabajo y 20 de pausa', 'Bicicletas: 40 segundos de trabajo y 20 de pausa', 'Plancha up-down: 40 segundos de trabajo y 20 de pausa', 'Giro ruso rápido: 40 segundos de trabajo y 20 de pausa'], consejo: 'Mantén la lumbar pegada al suelo.' },
  { nombre: 'HIIT piernas', duracion: '14 min', nivel: 'Intermedio', ejercicios: ['Sentadilla con salto: 40 segundos de trabajo y 20 de pausa', 'Zancadas alternas rápidas: 40 segundos de trabajo y 20 de pausa', 'Pared: 40 segundos de trabajo y 20 de pausa', 'Skipping: 40 segundos de trabajo y 20 de pausa'], consejo: 'Aterriza suave, con rodillas flexionadas.' },
  { nombre: 'HIIT suave', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Marcha rápida: 40 segundos de trabajo y 20 de pausa', 'Sentadillas: 40 segundos de trabajo y 20 de pausa', 'Toques de hombro en plancha alta: 40 segundos de trabajo y 20 de pausa'], consejo: 'Sube la intensidad semana a semana.' },
];

const ESTIRAMIENTO: readonly Rutina[] = [
  { nombre: 'Estiramiento matutino', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Estiramiento de cuello: 20 segundos por lado', 'Apertura de pecho en puerta: 30 segundos', 'Flexión de tronco colgando: 30 segundos', 'Cuádriceps de pie: 20 segundos por pierna', 'Gato-vaca: 8 repeticiones'], consejo: 'Nunca rebotes en un estiramiento.' },
  { nombre: 'Flexibilidad total', duracion: '15 min', nivel: 'Intermedio', ejercicios: ['Zancada profunda con brazos arriba: 30 segundos por lado', 'Plegado sentado: 40 segundos', 'Mariposa: 40 segundos', 'Puente suave: 30 segundos', 'Torsión tumbada: 30 segundos por lado'], consejo: 'Respira hondo y relaja en cada exhalación.' },
  { nombre: 'Piernas elásticas', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Isquios con pierna en silla: 30 segundos por pierna', 'Gemelos en pared: 30 segundos por pierna', 'Aductor sentado: 30 segundos', 'Cuádriceps tumbado: 30 segundos por pierna'], consejo: 'Estira después de entrenar, nunca en frío intenso.' },
  { nombre: 'Espalda liberada', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Postura del niño: 40 segundos', 'Torsión tumbada: 30 segundos por lado', 'Abrazo de rodillas: 30 segundos', 'Esfinge: 30 segundos'], consejo: 'Ideal al final del día de oficina.' },
  { nombre: 'Hombros y cuello', duracion: '8 min', nivel: 'Principiante', ejercicios: ['Oreja al hombro: 20 segundos por lado', 'Cruzado de brazo: 20 segundos por brazo', 'Tríceps tras nuca: 20 segundos por brazo', 'Círculos lentos de hombros: 30 segundos'], consejo: 'Suelta la mandíbula para relajar el cuello.' },
  { nombre: 'Cadera abierta', duracion: '14 min', nivel: 'Intermedio', ejercicios: ['Paloma (pigeon): 40 segundos por lado', 'Zancada baja profunda: 30 segundos por lado', 'Rana suave: 40 segundos', 'Torsión sentada: 30 segundos por lado'], consejo: 'No fuerces la rodilla en la paloma.' },
  { nombre: 'Enfriamiento post-entreno', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Caminata lenta: 60 segundos', 'Cuádriceps de pie: 20 segundos por pierna', 'Isquios inclinado: 30 segundos por pierna', 'Apertura de pecho: 30 segundos', 'Respiración profunda: 6 ciclos'], consejo: 'Baja las pulsaciones antes de estirar.' },
  { nombre: 'Split progresivo', duracion: '16 min', nivel: 'Intermedio', ejercicios: ['Zancada profunda: 40 segundos por lado', 'Isquio con pierna elevada: 40 segundos por lado', 'Aductor de pie amplio: 40 segundos', 'Mariposa con presión suave: 40 segundos', 'Plegado de pie: 40 segundos'], consejo: 'La constancia gana a la intensidad aquí.' },
];

const YOGA: readonly Rutina[] = [
  { nombre: 'Yoga despertar', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Postura de la montaña con respiración: 60 segundos', 'Saludo al sol corto: 3 rondas lentas', 'Perro boca abajo: 30 segundos', 'Cobra: 20 segundos', 'Postura del niño: 40 segundos'], consejo: 'Mueve al ritmo de tu respiración.' },
  { nombre: 'Vinyasa suave', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Saludo al sol completo: 4 rondas', 'Guerrero I: 30 segundos por lado', 'Guerrero II: 30 segundos por lado', 'Triángulo: 30 segundos por lado', 'Savasana: 2 minutos'], consejo: 'Activa las piernas para sostener las posturas.' },
  { nombre: 'Yoga noche tranquila', duracion: '14 min', nivel: 'Principiante', ejercicios: ['Gato-vaca: 8 repeticiones', 'Postura del niño extendida: 60 segundos', 'Torsión tumbada: 40 segundos por lado', 'Piernas en la pared: 2 minutos', 'Savasana: 2 minutos'], consejo: 'Atenúa las luces para relajarte más.' },
  { nombre: 'Fuerza yóguica', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Plancha a chaturanga: 5 repeticiones lentas', 'Silla (utkatasana): 40 segundos', 'Guerrero III: 25 segundos por lado', 'Cuervo asistido en silla: 20 segundos', 'Puente: 40 segundos'], consejo: 'La fuerza en yoga nace de la calma.' },
  { nombre: 'Yoga silla oficina', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Respiración consciente sentado: 60 segundos', 'Torsión en silla: 30 segundos por lado', 'Flexión sentada: 30 segundos', 'Apertura de pecho sentado: 30 segundos', 'Cuello y hombros: 60 segundos'], consejo: 'Puedes hacerlo en la pausa del trabajo.' },
  { nombre: 'Equilibrio zen', duracion: '15 min', nivel: 'Intermedio', ejercicios: ['Árbol: 40 segundos por pierna', 'Águila simplificada: 30 segundos por lado', 'Bailarín con apoyo: 30 segundos por lado', 'Montaña con ojos cerrados: 30 segundos'], consejo: 'Fija la mirada en un punto para no caer.' },
  { nombre: 'Yoga flexibilidad', duracion: '16 min', nivel: 'Principiante', ejercicios: ['Perro boca abajo pedaleando: 40 segundos', 'Lagarto bajo: 30 segundos por lado', 'Paloma: 40 segundos por lado', 'Plegado sentado: 60 segundos'], consejo: 'Acepta hasta dónde llegas hoy.' },
  { nombre: 'Saludo a la luna', duracion: '14 min', nivel: 'Intermedio', ejercicios: ['Flexión lateral de pie: 30 segundos por lado', 'Diosa con brazos: 40 segundos', 'Triángulo extendido: 30 segundos por lado', 'Pinza de pie: 40 segundos', 'Savasana: 2 minutos'], consejo: 'Movimientos fluidos como agua.' },
];

const FUERZA: readonly Rutina[] = [
  { nombre: 'Fuerza base total', duracion: '20 min', nivel: 'Principiante', ejercicios: ['Sentadillas: 12 repeticiones', 'Flexiones de rodillas: 10 repeticiones', 'Remo con mochila: 12 repeticiones', 'Puente de glúteos: 12 repeticiones', 'Plancha: 30 segundos'], consejo: 'Descansa 60 segundos entre ejercicios.' },
  { nombre: 'Fuerza pesada casera', duracion: '25 min', nivel: 'Intermedio', ejercicios: ['Sentadilla con mochila: 10 repeticiones', 'Peso muerto con mochila: 12 repeticiones', 'Press tumbado con mochila: 10 repeticiones', 'Remo con mochila: 12 repeticiones', 'Pared con mochila: 30 segundos'], consejo: 'Llena la mochila con libros para más carga.' },
  { nombre: 'Fuerza tren superior', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Flexiones: 12 repeticiones', 'Fondos en silla: 12 repeticiones', 'Remo a un brazo: 10 por lado', 'Pike push-ups: 10 repeticiones', 'Curl con mochila: 10 repeticiones'], consejo: '3 series de cada uno para un reto serio.' },
  { nombre: 'Fuerza tren inferior', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Sentadilla búlgara: 10 por pierna', 'Hip thrust con mochila: 12 repeticiones', 'Peso muerto rumano: 12 repeticiones', 'Step-up con peso: 10 por pierna'], consejo: 'La técnica perfecta vale más que el peso.' },
  { nombre: 'Fuerza exprés', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Sentadillas: 15 repeticiones', 'Flexiones inclinadas: 10 repeticiones', 'Superman: 12 repeticiones', 'Plancha: 30 segundos'], consejo: 'Dos rondas con 90 segundos de pausa.' },
  { nombre: 'Fuerza isométrica', duracion: '14 min', nivel: 'Principiante', ejercicios: ['Pared: 40 segundos', 'Plancha: 40 segundos', 'Puente sostenido: 30 segundos', 'Sentadilla sostenida abajo: 25 segundos', 'Apretón de palmas: 20 segundos'], consejo: 'Respira sin contener el aire.' },
  { nombre: 'Fuerza funcional', duracion: '22 min', nivel: 'Intermedio', ejercicios: ['Sentadilla y press con botellas: 10 repeticiones', 'Zancada con giro: 10 por lado', 'Remo renegado: 10 por lado', 'Levantamiento de mochila al hombro: 8 por lado', 'Paseo del granjero con bolsas: 40 segundos'], consejo: 'Imita movimientos de la vida real.' },
  { nombre: 'Fuerza progresión semanal', duracion: '20 min', nivel: 'Principiante', ejercicios: ['Sentadillas: 3 series de 10 repeticiones', 'Flexiones de rodillas: 3 series de 8 repeticiones', 'Remo con botellas: 3 series de 10 repeticiones', 'Plancha: 3 series de 25 segundos'], consejo: 'Suma una repetición a cada serie por semana.' },
];

const RESISTENCIA: readonly Rutina[] = [
  { nombre: 'Resistencia básica', duracion: '18 min', nivel: 'Principiante', ejercicios: ['Marcha rápida en el sitio: 3 minutos', 'Sentadillas: 15 repeticiones', 'Flexiones de rodillas: 10 repeticiones', 'Jumping jacks suaves: 45 segundos', 'Plancha: 30 segundos'], consejo: 'Mantén un ritmo que puedas sostener.' },
  { nombre: 'Fondo aeróbico', duracion: '25 min', nivel: 'Intermedio', ejercicios: ['Trote en el sitio: 5 minutos', 'Sentadillas: 20 repeticiones', 'Escaladores: 45 segundos', 'Zancadas: 20 totales', 'Burpees sin salto: 10 repeticiones', 'Caminata: 2 minutos'], consejo: 'Hidrátate cada 10 minutos.' },
  { nombre: 'Resistencia muscular', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Sentadillas: 25 repeticiones', 'Flexiones: 15 repeticiones', 'Remo con botellas: 20 repeticiones', 'Puente: 20 repeticiones', 'Plancha: 60 segundos'], consejo: 'Altas repeticiones con poco descanso.' },
  { nombre: 'Resistencia caminando', duracion: '30 min', nivel: 'Principiante', ejercicios: ['Caminata suave: 5 minutos', 'Caminata enérgica: 10 minutos', 'Caminata con rodillas altas: 2 minutos', 'Caminata enérgica: 10 minutos', 'Caminata suave: 3 minutos'], consejo: 'Lleva agua y buena música.' },
  { nombre: 'Circuito resistente', duracion: '22 min', nivel: 'Intermedio', ejercicios: ['Jumping jacks: 60 segundos', 'Sentadillas: 20 repeticiones', 'Flexiones: 12 repeticiones', 'Skipping: 45 segundos', 'Fondos: 12 repeticiones', 'Plancha: 45 segundos'], consejo: 'Repite 3 rondas con 1 minuto de pausa.' },
  { nombre: 'Resistencia suave', duracion: '15 min', nivel: 'Principiante', ejercicios: ['Marcha en el sitio: 3 minutos', 'Pasos laterales: 90 segundos', 'Sentadillas asistidas: 12 repeticiones', 'Elevación de brazos: 60 segundos'], consejo: 'Termina sintiendo que podrías seguir.' },
  { nombre: 'Escalera de esfuerzo', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Trote: 1 minuto, 2 minutos y 3 minutos con pausas de 60 segundos', 'Sentadillas: 10, 15 y 20 repeticiones', 'Plancha: 20, 30 y 40 segundos'], consejo: 'Sube y baja la intensidad como una ola.' },
  { nombre: 'Resistencia total semanal', duracion: '24 min', nivel: 'Intermedio', ejercicios: ['Trote suave: 4 minutos', 'Circuito de sentadillas y flexiones: 8 minutos', 'Skipping y escaladores: 6 minutos', 'Caminata de cierre: 6 minutos'], consejo: 'Repítela 3 veces por semana.' },
];

const VELOCIDAD: readonly Rutina[] = [
  { nombre: 'Chispa veloz', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Skipping bajo: 30 segundos', 'Talones atrás rápidos: 30 segundos', 'Pasos laterales rápidos: 30 segundos', 'Sprint en el sitio: 20 segundos', 'Caminata: 60 segundos'], consejo: 'Calienta bien tobillos y rodillas antes.' },
  { nombre: 'Sprints caseros', duracion: '16 min', nivel: 'Intermedio', ejercicios: ['Sprint en el sitio: 20 segundos de esfuerzo y 40 de pausa (6 veces)', 'Skipping alto: 30 segundos', 'Zancadas con salto: 20 segundos', 'Sentadilla con salto: 15 segundos'], consejo: 'Da el 90%, guarda un poco para la última serie.' },
  { nombre: 'Velocidad de pies', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Toques rápidos de pies: 20 segundos', 'Pasos cruzados: 30 segundos por lado', 'Marcha rápida con brazos: 60 segundos', 'Mini sprints: 15 segundos (4 veces)'], consejo: 'Mira al frente, no a tus pies.' },
  { nombre: 'Aceleración total', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Skipping alto: 40 segundos', 'Sprint en el sitio: 25 segundos (6 veces con 45 de pausa)', 'Burpees rápidos: 30 segundos', 'Salto largo sin desplazamiento: 8 repeticiones'], consejo: 'Enfría 3 minutos caminando al final.' },
  { nombre: 'Velocidad lúdica', duracion: '14 min', nivel: 'Principiante', ejercicios: ['Persecución imaginaria (sprint y pausa): 5 rondas de 20 segundos', 'Saltos laterales: 30 segundos', 'Carrera con cambios de ritmo: 4 minutos'], consejo: 'Juega: la velocidad mejora divirtiéndose.' },
  { nombre: 'Piques cortos', duracion: '12 min', nivel: 'Intermedio', ejercicios: ['Sprint máximo: 15 segundos (8 veces con 45 de pausa)', 'Sentadilla con salto: 10 repeticiones', 'Skipping: 30 segundos'], consejo: 'Recupera completo entre piques máximos.' },
  { nombre: 'Velocidad y agilidad mix', duracion: '15 min', nivel: 'Intermedio', ejercicios: ['Escalera imaginaria de pies: 40 segundos', 'Sprint: 20 segundos', 'Giros rápidos: 30 segundos', 'Saltos con rodillas altas: 30 segundos'], consejo: 'Marca un cuadrado en el suelo para guiarte.' },
  { nombre: 'Primera velocidad', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Trote suave: 2 minutos', 'Aceleraciones progresivas: 4 veces 20 segundos', 'Caminata: 2 minutos'], consejo: 'Acelera poco a poco, sin tirones.' },
];

const AGILIDAD: readonly Rutina[] = [
  { nombre: 'Pies ágiles', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Pasos laterales rápidos: 30 segundos', 'Toques de pie alternos: 30 segundos', 'Marcha con cambio de dirección: 60 segundos', 'Saltitos adelante-atrás: 30 segundos'], consejo: 'Mantén las rodillas flexionadas.' },
  { nombre: 'Circuito ágil', duracion: '16 min', nivel: 'Intermedio', ejercicios: ['Escalera imaginaria (4 patrones): 40 segundos cada uno', 'Saltos laterales: 30 segundos', 'Sprint con giro: 20 segundos (4 veces)', 'Zancadas laterales rápidas: 30 segundos'], consejo: 'La precisión primero, la velocidad después.' },
  { nombre: 'Agilidad lúdica', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Juego de direcciones (un amigo grita): 3 minutos', 'Saltos en cruz: 30 segundos', 'Carrera lateral: 30 segundos por lado'], consejo: 'Invita a alguien y compitan sanamente.' },
  { nombre: 'Reflejos felinos', duracion: '14 min', nivel: 'Intermedio', ejercicios: ['Toques rápidos al suelo: 20 segundos (5 veces)', 'Saltos con giro de 90 grados: 8 repeticiones', 'Sprint y frenada: 20 segundos (5 veces)', 'Plancha con toques rápidos: 30 segundos'], consejo: 'Frena con el cuerpo bajo para no resbalar.' },
  { nombre: 'Coordinación total', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Marcha cruzada (mano a pie contrario): 60 segundos', 'Pasos de baile lateral: 60 segundos', 'Equilibrio con pase de objeto: 8 por lado'], consejo: 'Si te equivocas, ríe y sigue.' },
  { nombre: 'Agilidad futbolera', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Conducción imaginaria con cambios: 3 minutos', 'Sprint en zigzag: 30 segundos (4 veces)', 'Saltos a una pierna: 20 segundos por pierna', 'Frenadas y arranques: 5 repeticiones'], consejo: 'Usa botellas como conos de marcaje.' },
  { nombre: 'Agilidad suave', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Pasos laterales lentos: 60 segundos', 'Marcha con giros suaves: 60 segundos', 'Toques de talón controlados: 60 segundos'], consejo: 'Perfecta para retomar el ejercicio.' },
  { nombre: 'Reto 4 esquinas', duracion: '15 min', nivel: 'Intermedio', ejercicios: ['Sprint a cada esquina imaginaria: 6 rondas', 'Sentadilla en cada esquina: 5 repeticiones', 'Plancha final: 40 segundos'], consejo: 'Marca las esquinas con cojines.' },
];

const EQUILIBRIO: readonly Rutina[] = [
  { nombre: 'Equilibrio base', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Apoyo en un pie con silla: 30 segundos por pierna', 'Tándem (un pie delante del otro): 30 segundos por lado', 'Elevación de talones: 12 repeticiones', 'Marcha en línea recta: 60 segundos'], consejo: 'Fija la vista en un punto quieto.' },
  { nombre: 'Estabilidad total', duracion: '14 min', nivel: 'Intermedio', ejercicios: ['Apoyo en un pie sin ayuda: 40 segundos por pierna', 'Avión (bisagra a una pierna): 8 por lado', 'Sentadilla a una pierna asistida: 8 por lado', 'Plancha lateral: 25 segundos por lado'], consejo: 'Activa el abdomen para no tambalearte.' },
  { nombre: 'Equilibrio divertido', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Árbol con apoyo en pared: 30 segundos por pierna', 'Pase de botella alrededor del cuerpo en un pie: 6 por lado', 'Marcha de puntillas: 60 segundos'], consejo: 'Descalzo sobre una alfombra es ideal.' },
  { nombre: 'Core equilibrista', duracion: '12 min', nivel: 'Intermedio', ejercicios: ['Plancha con elevación de pierna: 20 segundos por lado', 'Puente a una pierna: 10 por lado', 'Peso muerto a una pierna: 8 por lado', 'Árbol sin apoyo: 30 segundos por pierna'], consejo: 'Respira lento: la calma da estabilidad.' },
  { nombre: 'Equilibrio senior', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Apoyo lateral con silla: 30 segundos por lado', 'Marcha con apoyo: 2 minutos', 'Tándem con apoyo: 30 segundos por lado', 'Elevación de rodilla con apoyo: 8 por pierna'], consejo: 'Siempre con una silla o pared cerca.' },
  { nombre: 'Propiocepción pro', duracion: '15 min', nivel: 'Intermedio', ejercicios: ['Apoyo en un pie con ojos cerrados: 20 segundos por pierna', 'Sentadilla a una pierna: 8 por lado', 'Saltito y mantén 3 segundos: 6 por pierna', 'Avión con ojos abiertos: 30 segundos por lado'], consejo: 'Progresa de ojos abiertos a cerrados.' },
  { nombre: 'Yoga equilibrio', duracion: '12 min', nivel: 'Intermedio', ejercicios: ['Árbol: 40 segundos por pierna', 'Guerrero III con apoyo: 25 segundos por lado', 'Bailarín con silla: 25 segundos por lado', 'Montaña con talones elevados: 30 segundos'], consejo: 'Sonríe: la tensión te desestabiliza.' },
  { nombre: 'Tobillos de acero', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Elevación de talones: 15 repeticiones', 'Alfabeto con el pie en el aire: 1 vez por pie', 'Apoyo en un pie sobre cojín: 25 segundos por pierna'], consejo: 'Fortalece tobillos para evitar esguinces.' },
];

const POSTURA: readonly Rutina[] = [
  { nombre: 'Espalda recta', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Pared (pegar lumbar, hombros y cabeza): 60 segundos', 'Encogimiento de omóplatos: 15 repeticiones', 'Ángel en pared: 10 repeticiones', 'Apertura de pecho: 30 segundos'], consejo: 'Repite la prueba de la pared cada día.' },
  { nombre: 'Anti-joroba', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Remo con toalla: 12 repeticiones', 'Superman corto: 10 repeticiones', 'Estiramiento de pectoral: 30 segundos por lado', 'Rotación torácica: 10 por lado'], consejo: 'Levanta la pantalla a la altura de los ojos.' },
  { nombre: 'Postura oficina', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Cuello (meter barbilla): 10 repeticiones', 'Hombros atrás y abajo: 12 repeticiones', 'Puente de glúteos: 10 repeticiones', 'Gato-vaca: 8 repeticiones'], consejo: 'Levántate y muévete cada hora.' },
  { nombre: 'Columna feliz', duracion: '14 min', nivel: 'Intermedio', ejercicios: ['Plancha: 40 segundos', 'Superman: 12 repeticiones', 'Puente: 15 repeticiones', 'Peso muerto sin peso: 12 repeticiones', 'Postura del niño: 40 segundos'], consejo: 'Glúteos y abdomen firmes sostienen tu postura.' },
  { nombre: 'Cuello liberado', duracion: '8 min', nivel: 'Principiante', ejercicios: ['Inclinación suave: 20 segundos por lado', 'Rotación lenta: 8 repeticiones', 'Meter barbilla: 10 repeticiones', 'Hombros a orejas y soltar: 8 repeticiones'], consejo: 'Movimientos lentos, sin crujidos forzados.' },
  { nombre: 'Hombros abiertos', duracion: '10 min', nivel: 'Intermedio', ejercicios: ['Dislocaciones con toalla: 10 repeticiones', 'Ángel en suelo: 10 repeticiones', 'Apertura con banda o toalla: 12 repeticiones', 'Cobra: 25 segundos'], consejo: 'Abre el pecho al respirar.' },
  { nombre: 'Cadera alineada', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Puente: 12 repeticiones', 'Estiramiento de flexores de cadera: 30 segundos por lado', 'Plancha lateral de rodillas: 20 segundos por lado', 'Marcha en el sitio consciente: 60 segundos'], consejo: 'Evita estar sentado más de una hora seguida.' },
  { nombre: 'Postura de bailarín', duracion: '12 min', nivel: 'Intermedio', ejercicios: ['Montaña con coronilla al cielo: 60 segundos', 'Árbol: 30 segundos por pierna', 'Guerrero II: 30 segundos por lado', 'Plegado con espalda recta: 30 segundos'], consejo: 'Imagina un hilo que te estira hacia arriba.' },
];

const RESPIRACION: readonly Rutina[] = [
  { nombre: 'Calma inmediata', duracion: '5 min', nivel: 'Principiante', ejercicios: ['Respiración abdominal: 8 ciclos lentos', 'Inhala 4 segundos y exhala 6: 6 ciclos', 'Respiración con mano en pecho y vientre: 60 segundos'], consejo: 'El vientre sube, el pecho casi no se mueve.' },
  { nombre: 'Energía matutina', duracion: '6 min', nivel: 'Principiante', ejercicios: ['Inhalaciones nasales enérgicas: 20 repeticiones', 'Respiración completa (vientre, costillas y pecho): 6 ciclos', 'Exhalación con suspiro: 5 repeticiones'], consejo: 'Hazlo con la espalda recta.' },
  { nombre: 'Antiestrés 4-7-8', duracion: '6 min', nivel: 'Principiante', ejercicios: ['Inhala 4 segundos: 6 ciclos', 'Sostén 7 segundos: 6 ciclos', 'Exhala 8 segundos: 6 ciclos'], consejo: 'Si mareas, vuelve a respirar normal.' },
  { nombre: 'Respiración deportiva', duracion: '8 min', nivel: 'Intermedio', ejercicios: ['Respiración rítmica marchando (2 pasos inhalar, 2 exhalar): 3 minutos', 'Exhalación en esfuerzo con sentadilla: 10 repeticiones', 'Recuperación nasal tras skipping: 2 minutos'], consejo: 'Coordina la exhalación con el esfuerzo.' },
  { nombre: 'Coherencia cardíaca', duracion: '6 min', nivel: 'Principiante', ejercicios: ['Inhala 5 segundos y exhala 5 segundos: 12 ciclos', 'Respiración nasal consciente: 60 segundos'], consejo: 'Ideal antes de dormir o de un examen.' },
  { nombre: 'Capacidad pulmonar', duracion: '8 min', nivel: 'Intermedio', ejercicios: ['Inhalación máxima sostenida 5 segundos: 6 repeticiones', 'Exhalación completa lenta: 6 repeticiones', 'Respiración por un orificio nasal alterno: 8 ciclos'], consejo: 'Nunca fuerces hasta marearte.' },
  { nombre: 'Respiración yoga', duracion: '10 min', nivel: 'Intermedio', ejercicios: ['Respiración victoriosa (ujjayi) suave: 8 ciclos', 'Respiración alterna (nadi shodhana): 8 ciclos', 'Savasana respirando consciente: 2 minutos'], consejo: 'Tapa un orificio con el pulgar y el anular.' },
  { nombre: 'Recuperación exprés', duracion: '5 min', nivel: 'Principiante', ejercicios: ['Exhalación larga por boca: 6 ciclos', 'Respiración nasal lenta caminando: 2 minutos', 'Suspiro de alivio final: 3 repeticiones'], consejo: 'Úsala tras cualquier rutina intensa.' },
];

const CAMINATA: readonly Rutina[] = [
  { nombre: 'Paseo saludable', duracion: '20 min', nivel: 'Principiante', ejercicios: ['Caminata suave: 5 minutos', 'Caminata a buen ritmo: 10 minutos', 'Caminata suave de cierre: 5 minutos'], consejo: 'Bracea para quemar más calorías.' },
  { nombre: 'Caminata con intervalos', duracion: '25 min', nivel: 'Intermedio', ejercicios: ['Calentamiento caminando: 5 minutos', 'Rápido 2 minutos y suave 2 minutos (4 veces)', 'Enfriamiento: 4 minutos'], consejo: 'El ritmo rápido debe costarte hablar.' },
  { nombre: 'Caminata y fuerza', duracion: '22 min', nivel: 'Principiante', ejercicios: ['Caminata: 5 minutos', 'Sentadillas: 12 repeticiones', 'Caminata: 5 minutos', 'Flexiones de pared: 10 repeticiones', 'Caminata: 5 minutos'], consejo: 'Lleva una botella de agua como mancuerna.' },
  { nombre: 'Caminata consciente', duracion: '15 min', nivel: 'Principiante', ejercicios: ['Caminata lenta sintiendo los pies: 5 minutos', 'Caminata con respiración profunda: 5 minutos', 'Caminata agradeciendo el día: 5 minutos'], consejo: 'Deja el móvil en el bolsillo.' },
  { nombre: 'Sube cuestas', duracion: '25 min', nivel: 'Intermedio', ejercicios: ['Caminata llana: 5 minutos', 'Cuesta enérgica: 3 minutos (4 veces con 2 de llano)', 'Llano suave: 3 minutos'], consejo: 'Acorta el paso en las subidas.' },
  { nombre: 'Caminata nórdica', duracion: '30 min', nivel: 'Intermedio', ejercicios: ['Calentamiento con brazos: 5 minutos', 'Caminata impulsando brazos: 20 minutos', 'Estiramiento final: 5 minutos'], consejo: 'Usa bastones o botellas como palos.' },
  { nombre: 'Primeros pasos', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Caminata muy suave: 4 minutos', 'Caminata cómoda: 5 minutos', 'Caminata muy suave: 3 minutos'], consejo: 'Perfecta para empezar desde cero.' },
  { nombre: 'Caminata larga feliz', duracion: '45 min', nivel: 'Intermedio', ejercicios: ['Inicio suave: 10 minutos', 'Ritmo sostenido: 25 minutos', 'Cierre suave con estiramientos: 10 minutos'], consejo: 'Protector solar y calzado cómodo.' },
];

const CARRERA: readonly Rutina[] = [
  { nombre: 'Corre-camina inicial', duracion: '20 min', nivel: 'Principiante', ejercicios: ['Caminata: 5 minutos', 'Trote 1 minuto y caminata 2 minutos (4 veces)', 'Caminata final: 3 minutos'], consejo: 'Debes terminar con ganas de más.' },
  { nombre: 'Trote continuo', duracion: '25 min', nivel: 'Intermedio', ejercicios: ['Calentamiento con skipping: 5 minutos', 'Trote sostenido: 15 minutos', 'Caminata y estiramientos: 5 minutos'], consejo: 'Ritmo conversacional: puedes hablar.' },
  { nombre: 'Series divertidas', duracion: '22 min', nivel: 'Intermedio', ejercicios: ['Trote suave: 5 minutos', 'Rápido 1 minuto y suave 2 minutos (5 veces)', 'Enfriamiento: 2 minutos'], consejo: 'Cuenta los pasos para no mirar el reloj.' },
  { nombre: 'Técnica de carrera', duracion: '18 min', nivel: 'Principiante', ejercicios: ['Skipping: 40 segundos', 'Talones atrás: 40 segundos', 'Marcha con rodilla alta: 60 segundos', 'Trote técnico: 8 minutos', 'Caminata: 4 minutos'], consejo: 'Pasos cortos y silenciosos.' },
  { nombre: 'Fartlek libre', duracion: '25 min', nivel: 'Intermedio', ejercicios: ['Trote: 5 minutos', 'Aceleraciones hasta el próximo árbol o farola (8 veces)', 'Trote suave entre aceleraciones', 'Caminata final: 5 minutos'], consejo: 'Juega con el entorno, sin reloj.' },
  { nombre: 'Primera carrera 5K', duracion: '35 min', nivel: 'Intermedio', ejercicios: ['Calentamiento: 5 minutos', 'Trote 4 minutos y caminata 1 minuto (5 veces)', 'Caminata y estiramientos: 5 minutos'], consejo: 'La constancia de 3 días por semana lo logra.' },
  { nombre: 'Cuestas potentes', duracion: '24 min', nivel: 'Intermedio', ejercicios: ['Trote llano: 5 minutos', 'Subida fuerte 30 segundos y bajada caminando (8 veces)', 'Trote suave: 5 minutos'], consejo: 'Bracea fuerte en las subidas.' },
  { nombre: 'Recuperación trotando', duracion: '18 min', nivel: 'Principiante', ejercicios: ['Caminata: 5 minutos', 'Trote muy suave: 8 minutos', 'Caminata: 5 minutos'], consejo: 'Al día siguiente de un esfuerzo fuerte.' },
];

const BICICLETA: readonly Rutina[] = [
  { nombre: 'Paseo en bici', duracion: '25 min', nivel: 'Principiante', ejercicios: ['Pedaleo suave: 5 minutos', 'Pedaleo cómodo: 15 minutos', 'Pedaleo suave: 5 minutos'], consejo: 'Ajusta el sillín a la altura de tu cadera.' },
  { nombre: 'Bici intervalos', duracion: '28 min', nivel: 'Intermedio', ejercicios: ['Calentamiento: 5 minutos', 'Fuerte 2 minutos y suave 3 minutos (4 veces)', 'Enfriamiento: 3 minutos'], consejo: 'Mantén una cadencia viva de piernas.' },
  { nombre: 'Bici estática en casa', duracion: '20 min', nivel: 'Principiante', ejercicios: ['Pedaleo imaginario tumbado: 60 segundos', 'Sentadillas: 12 repeticiones', 'Bicicletas abdominales: 16 repeticiones', 'Puente: 12 repeticiones', 'Estiramiento: 3 minutos'], consejo: 'Sin bici también se entrena el pedaleo.' },
  { nombre: 'Subidas ciclistas', duracion: '30 min', nivel: 'Intermedio', ejercicios: ['Llano: 5 minutos', 'Subida simulada (piñón duro): 4 minutos (4 veces con 2 de llano)', 'Llano final: 3 minutos'], consejo: 'Siéntate y empuja redondo con todo el pie.' },
  { nombre: 'Bici y piernas', duracion: '26 min', nivel: 'Intermedio', ejercicios: ['Bici o pedaleo: 10 minutos', 'Sentadillas: 15 repeticiones', 'Zancadas: 10 por pierna', 'Bici: 5 minutos', 'Plancha: 30 segundos'], consejo: 'Combina cardio y fuerza en un día.' },
  { nombre: 'Rodaje largo', duracion: '45 min', nivel: 'Intermedio', ejercicios: ['Inicio progresivo: 10 minutos', 'Ritmo crucero: 25 minutos', 'Vuelta a la calma: 10 minutos'], consejo: 'Come algo ligero una hora antes.' },
  { nombre: 'Bici urbana segura', duracion: '20 min', nivel: 'Principiante', ejercicios: ['Revisión (frenos y casco): 3 minutos', 'Pedaleo tranquilo por carril bici: 14 minutos', 'Estiramiento final: 3 minutos'], consejo: 'Casco siempre, sin excepciones.' },
  { nombre: 'Sprints sobre ruedas', duracion: '22 min', nivel: 'Intermedio', ejercicios: ['Calentamiento: 5 minutos', 'Sprint 20 segundos y suave 2 minutos (6 veces)', 'Enfriamiento: 5 minutos'], consejo: 'Mira lejos y mantén el manillar firme.' },
];

const NATACION: readonly Rutina[] = [
  { nombre: 'Primera vez al agua', duracion: '20 min', nivel: 'Principiante', ejercicios: ['Caminar en la piscina: 5 minutos', 'Flotación con churro: 5 minutos', 'Patada agarrado al borde: 4 series de 30 segundos', 'Deslizamiento con tabla: 6 repeticiones'], consejo: 'Nunca nades solo en aguas abiertas.' },
  { nombre: 'Técnica de crol', duracion: '25 min', nivel: 'Intermedio', ejercicios: ['Calentamiento nadando suave: 5 minutos', 'Patada con tabla: 4 series de 50 metros', 'Brazada con pull-boy o piernas quietas: 4 series de 50 metros', 'Crol completo suave: 5 minutos'], consejo: 'Exhala bajo el agua, inhala al girar.' },
  { nombre: 'Nado continuo', duracion: '30 min', nivel: 'Intermedio', ejercicios: ['Calentamiento: 5 minutos', 'Nado a ritmo cómodo: 20 minutos', 'Vuelta a la calma: 5 minutos'], consejo: 'Cuenta tus brazadas para relajarte.' },
  { nombre: 'Aqua-fitness sin nadar', duracion: '20 min', nivel: 'Principiante', ejercicios: ['Marcha en el agua: 3 minutos', 'Sentadillas en el agua: 12 repeticiones', 'Tijeras con churro: 12 repeticiones', 'Bicicleta agarrado al borde: 60 segundos', 'Flotación final: 3 minutos'], consejo: 'El agua cuida tus articulaciones.' },
  { nombre: 'Series en piscina', duracion: '28 min', nivel: 'Intermedio', ejercicios: ['Calentamiento: 200 metros suaves', 'Rápido 50 metros y suave 50 metros (6 veces)', 'Piernas con tabla: 100 metros', 'Afloje: 100 metros'], consejo: 'Descansa lo necesario entre series.' },
  { nombre: 'Espalda sana en agua', duracion: '22 min', nivel: 'Principiante', ejercicios: ['Flotación boca arriba: 3 minutos', 'Espalda suave: 8 minutos', 'Patada de espaldas con tabla: 4 minutos', 'Estiramientos en el borde: 5 minutos'], consejo: 'La espalda es el estilo más amable.' },
  { nombre: 'Resistencia acuática', duracion: '30 min', nivel: 'Intermedio', ejercicios: ['Crol: 10 minutos', 'Espalda: 5 minutos', 'Braza: 5 minutos', 'Piernas: 5 minutos', 'Afloje: 5 minutos'], consejo: 'Alterna estilos para no aburrirte.' },
  { nombre: 'Juego en familia', duracion: '25 min', nivel: 'Principiante', ejercicios: ['Carrera caminando en el agua: 5 minutos', 'Recoger objetos del fondo: 8 repeticiones', 'Relevos nadando suave: 10 minutos', 'Flotación y risas: 5 minutos'], consejo: 'La mejor rutina es la que se disfruta.' },
];

const SALTO_CUERDA: readonly Rutina[] = [
  { nombre: 'Primeros saltos', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Salto imaginario sin cuerda: 60 segundos', 'Salto básico: 30 segundos de salto y 30 de pausa (5 veces)', 'Marcha: 60 segundos'], consejo: 'Gira la cuerda con las muñecas, no con los brazos.' },
  { nombre: 'Ritmo constante', duracion: '14 min', nivel: 'Intermedio', ejercicios: ['Salto básico: 60 segundos (5 veces con 30 de pausa)', 'Sentadillas: 12 repeticiones', 'Plancha: 30 segundos'], consejo: 'Aterriza de puntillas, suave.' },
  { nombre: 'Quema con cuerda', duracion: '16 min', nivel: 'Intermedio', ejercicios: ['Salto básico: 45 segundos de trabajo y 15 de pausa (6 veces)', 'Rodillas altas con cuerda: 30 segundos', 'Tijeras saltando: 30 segundos', 'Burpees: 8 repeticiones'], consejo: 'Cuenta de 10 en 10 para no desesperar.' },
  { nombre: 'Cuerda y fuerza', duracion: '18 min', nivel: 'Intermedio', ejercicios: ['Salto: 60 segundos', 'Flexiones: 10 repeticiones', 'Salto: 60 segundos', 'Sentadillas: 15 repeticiones', 'Salto: 60 segundos', 'Plancha: 40 segundos'], consejo: 'Alterna cardio y fuerza sin pausas largas.' },
  { nombre: 'Juego de pies', duracion: '12 min', nivel: 'Principiante', ejercicios: ['Salto lateral sobre línea: 30 segundos', 'Salto adelante-atrás: 30 segundos', 'Salto básico con cuerda: 30 segundos (4 rondas)', 'Caminata: 60 segundos'], consejo: 'Mantén los codos pegados al cuerpo.' },
  { nombre: 'Intervalos de cuerda', duracion: '15 min', nivel: 'Intermedio', ejercicios: ['Rápido 30 segundos y suave 30 segundos (8 veces)', 'Descanso caminando: 2 minutos', 'Ronda final rápida: 60 segundos'], consejo: 'Ajusta la cuerda a la altura de tus axilas.' },
  { nombre: 'Cuerda suave', duracion: '10 min', nivel: 'Principiante', ejercicios: ['Salto bajo sin despegar mucho: 20 segundos (6 veces con 40 de pausa)', 'Marcha en el sitio: 60 segundos', 'Elevación de talones: 12 repeticiones'], consejo: 'Salta solo 2 o 3 centímetros del suelo.' },
  { nombre: 'Reto 500 saltos', duracion: '20 min', nivel: 'Intermedio', ejercicios: ['Salto básico hasta sumar 500 saltos en bloques de 100', 'Pausa caminando 60 segundos entre bloques', 'Estiramiento de gemelos final: 2 minutos'], consejo: 'Divide y vencerás: ve bloque a bloque.' },
];

const RUTINA_SEMANAL: readonly Rutina[] = [
  { nombre: 'Semana empieza fuerte', duracion: '5 días x 20 min', nivel: 'Principiante', ejercicios: ['Lunes: caminata enérgica 20 minutos', 'Martes: piernas básicas y glúteos 20 minutos', 'Miércoles: descanso o paseo suave', 'Jueves: brazos y abdomen 20 minutos', 'Viernes: yoga suave 20 minutos'], consejo: 'Pégala en la nevera para no olvidarla.' },
  { nombre: 'Semana equilibrada', duracion: '5 días x 30 min', nivel: 'Intermedio', ejercicios: ['Lunes: fuerza total 30 minutos', 'Martes: carrera suave 30 minutos', 'Miércoles: yoga y movilidad 30 minutos', 'Jueves: HIIT 20 minutos más estiramiento', 'Viernes: caminata larga 30 minutos'], consejo: 'Duerme 7-8 horas para recuperarte.' },
  { nombre: 'Semana sin material', duracion: '4 días x 15 min', nivel: 'Principiante', ejercicios: ['Lunes: calentamiento más sentadillas y plancha', 'Martes: caminata consciente 15 minutos', 'Jueves: flexiones de rodillas y superman', 'Sábado: estiramiento total 15 minutos'], consejo: 'Cero excusas: no necesitas gimnasio.' },
  { nombre: 'Semana quema', duracion: '5 días x 25 min', nivel: 'Intermedio', ejercicios: ['Lunes: HIIT quemagrasa', 'Martes: bici o trote 25 minutos', 'Miércoles: fuerza tren inferior', 'Viernes: circuito resistente', 'Domingo: caminata larga feliz'], consejo: 'Acompáñala con buena hidratación.' },
  { nombre: 'Semana postura perfecta', duracion: '6 días x 10 min', nivel: 'Principiante', ejercicios: ['Lunes a sábado: rutina de postura 10 minutos', 'Añade caminata de 10 minutos tres días', 'Domingo: descanso total'], consejo: 'Poco cada día vale más que mucho un día.' },
  { nombre: 'Semana runner', duracion: '4 días mixtos', nivel: 'Intermedio', ejercicios: ['Lunes: técnica de carrera 18 minutos', 'Miércoles: series divertidas 22 minutos', 'Viernes: fuerza de piernas 20 minutos', 'Domingo: trote continuo 25 minutos'], consejo: 'Sube el volumen solo un 10% semanal.' },
  { nombre: 'Semana relax activo', duracion: '4 días x 15 min', nivel: 'Principiante', ejercicios: ['Lunes: yoga despertar', 'Miércoles: natación suave o caminata', 'Viernes: equilibrio base', 'Domingo: respiración y estiramiento'], consejo: 'Entrenar también es cuidarse con calma.' },
  { nombre: 'Semana total pro', duracion: '6 días x 30 min', nivel: 'Intermedio', ejercicios: ['Lunes: fuerza pesada casera', 'Martes: sprints o cuerda', 'Miércoles: yoga fuerza', 'Jueves: natación o bici', 'Viernes: HIIT total body', 'Sábado: caminata larga'], consejo: 'Escucha a tu cuerpo y descansa si duele.' },
];

export const deporte: Command = {
  data: new SlashCommandBuilder()
    .setName('deporte')
    .setDescription('Rutinas de ejercicio 100% locales')
    .addSubcommand((s) => s.setName('calentamiento').setDescription('Rutina de calentamiento'))
    .addSubcommand((s) => s.setName('brazos').setDescription('Rutina de brazos'))
    .addSubcommand((s) => s.setName('piernas').setDescription('Rutina de piernas'))
    .addSubcommand((s) => s.setName('abdomen').setDescription('Rutina de abdomen'))
    .addSubcommand((s) => s.setName('espalda').setDescription('Rutina de espalda'))
    .addSubcommand((s) => s.setName('pecho').setDescription('Rutina de pecho'))
    .addSubcommand((s) => s.setName('hombros').setDescription('Rutina de hombros'))
    .addSubcommand((s) => s.setName('gluteos').setDescription('Rutina de glúteos'))
    .addSubcommand((s) => s.setName('cardio').setDescription('Rutina de cardio'))
    .addSubcommand((s) => s.setName('hiit').setDescription('Rutina HIIT intensa'))
    .addSubcommand((s) => s.setName('estiramiento').setDescription('Rutina de estiramiento'))
    .addSubcommand((s) => s.setName('yoga').setDescription('Rutina de yoga'))
    .addSubcommand((s) => s.setName('fuerza').setDescription('Rutina de fuerza'))
    .addSubcommand((s) => s.setName('resistencia').setDescription('Rutina de resistencia'))
    .addSubcommand((s) => s.setName('velocidad').setDescription('Rutina de velocidad'))
    .addSubcommand((s) => s.setName('agilidad').setDescription('Rutina de agilidad'))
    .addSubcommand((s) => s.setName('equilibrio').setDescription('Rutina de equilibrio'))
    .addSubcommand((s) => s.setName('postura').setDescription('Rutina de postura'))
    .addSubcommand((s) => s.setName('respiracion').setDescription('Ejercicios de respiración'))
    .addSubcommand((s) => s.setName('caminata').setDescription('Rutina de caminata'))
    .addSubcommand((s) => s.setName('carrera').setDescription('Rutina de carrera'))
    .addSubcommand((s) => s.setName('bicicleta').setDescription('Rutina de bicicleta'))
    .addSubcommand((s) => s.setName('natacion').setDescription('Rutina de natación'))
    .addSubcommand((s) => s.setName('salto-cuerda').setDescription('Rutina de salto a la cuerda'))
    .addSubcommand((s) => s.setName('rutina-semanal').setDescription('Plan de rutina semanal')),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'calentamiento') {
      await interaction.reply({ embeds: [Embeds.success('🔥 Calentamiento', formatRutina(pick(CALENTAMIENTO)))] });
      return;
    }

    if (sub === 'brazos') {
      await interaction.reply({ embeds: [Embeds.success('💪 Brazos', formatRutina(pick(BRAZOS)))] });
      return;
    }

    if (sub === 'piernas') {
      await interaction.reply({ embeds: [Embeds.success('🦵 Piernas', formatRutina(pick(PIERNAS)))] });
      return;
    }

    if (sub === 'abdomen') {
      await interaction.reply({ embeds: [Embeds.success('🔥 Abdomen', formatRutina(pick(ABDOMEN)))] });
      return;
    }

    if (sub === 'espalda') {
      await interaction.reply({ embeds: [Embeds.success('🏋️ Espalda', formatRutina(pick(ESPALDA)))] });
      return;
    }

    if (sub === 'pecho') {
      await interaction.reply({ embeds: [Embeds.success('💥 Pecho', formatRutina(pick(PECHO)))] });
      return;
    }

    if (sub === 'hombros') {
      await interaction.reply({ embeds: [Embeds.success('🪨 Hombros', formatRutina(pick(HOMBROS)))] });
      return;
    }

    if (sub === 'gluteos') {
      await interaction.reply({ embeds: [Embeds.success('🍑 Glúteos', formatRutina(pick(GLUTEOS)))] });
      return;
    }

    if (sub === 'cardio') {
      await interaction.reply({ embeds: [Embeds.success('❤️ Cardio', formatRutina(pick(CARDIO)))] });
      return;
    }

    if (sub === 'hiit') {
      await interaction.reply({ embeds: [Embeds.success('⚡ HIIT', formatRutina(pick(HIIT)))] });
      return;
    }

    if (sub === 'estiramiento') {
      await interaction.reply({ embeds: [Embeds.success('🤸 Estiramiento', formatRutina(pick(ESTIRAMIENTO)))] });
      return;
    }

    if (sub === 'yoga') {
      await interaction.reply({ embeds: [Embeds.success('🧘 Yoga', formatRutina(pick(YOGA)))] });
      return;
    }

    if (sub === 'fuerza') {
      await interaction.reply({ embeds: [Embeds.success('💪 Fuerza', formatRutina(pick(FUERZA)))] });
      return;
    }

    if (sub === 'resistencia') {
      await interaction.reply({ embeds: [Embeds.success('🏃 Resistencia', formatRutina(pick(RESISTENCIA)))] });
      return;
    }

    if (sub === 'velocidad') {
      await interaction.reply({ embeds: [Embeds.success('🚀 Velocidad', formatRutina(pick(VELOCIDAD)))] });
      return;
    }

    if (sub === 'agilidad') {
      await interaction.reply({ embeds: [Embeds.success('🤾 Agilidad', formatRutina(pick(AGILIDAD)))] });
      return;
    }

    if (sub === 'equilibrio') {
      await interaction.reply({ embeds: [Embeds.success('⚖️ Equilibrio', formatRutina(pick(EQUILIBRIO)))] });
      return;
    }

    if (sub === 'postura') {
      await interaction.reply({ embeds: [Embeds.success('🧍 Postura', formatRutina(pick(POSTURA)))] });
      return;
    }

    if (sub === 'respiracion') {
      await interaction.reply({ embeds: [Embeds.success('🌬️ Respiración', formatRutina(pick(RESPIRACION)))] });
      return;
    }

    if (sub === 'caminata') {
      await interaction.reply({ embeds: [Embeds.success('🚶 Caminata', formatRutina(pick(CAMINATA)))] });
      return;
    }

    if (sub === 'carrera') {
      await interaction.reply({ embeds: [Embeds.success('🏃 Carrera', formatRutina(pick(CARRERA)))] });
      return;
    }

    if (sub === 'bicicleta') {
      await interaction.reply({ embeds: [Embeds.success('🚴 Bicicleta', formatRutina(pick(BICICLETA)))] });
      return;
    }

    if (sub === 'natacion') {
      await interaction.reply({ embeds: [Embeds.success('🏊 Natación', formatRutina(pick(NATACION)))] });
      return;
    }

    if (sub === 'salto-cuerda') {
      await interaction.reply({ embeds: [Embeds.success('🪢 Salto a la cuerda', formatRutina(pick(SALTO_CUERDA)))] });
      return;
    }

    if (sub === 'rutina-semanal') {
      await interaction.reply({ embeds: [Embeds.success('📅 Rutina semanal', formatRutina(pick(RUTINA_SEMANAL)))] });
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
  },
};
