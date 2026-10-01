/**
 * Juego de rol: /juego-rol <25 comandos sociales>.
 * 100% texto local con variantes aleatorias, sin APIs externas.
 * Tono amistoso en español, nada romantico explicito ni NSFW.
 * Cooldown 3.
 */
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

interface RpDef {
  emoji: string;
  verb: string;
  phrases: string[];
}

const RP: Record<string, RpDef> = {
  abrazo: {
    emoji: '🤗',
    verb: 'abraza a',
    phrases: [
      'Un abrazo calido que recarga las energias de todo el dia.',
      'Los mejores abrazos son los que se dan sin motivo.',
      'Abrazo nivel: oso de peluche gigante.',
      'Un abrazo a tiempo vale mas que mil palabras.',
      'Cuidado: este abrazo puede causar sonrisas incontrolables.',
      'Abrazo entregado con envio gratis y sin devolucion.',
      'Dicen que los abrazos reducen el estres. Dato confirmado por este bot.',
      'Un abrazo fuerte para recordar que no estas solo/a.',
    ],
  },
  palmadita: {
    emoji: '🐾',
    verb: 'le da una palmadita en el hombro a',
    phrases: [
      'Buen trabajo, sigue asi.',
      'Todo va a salir bien, ya veras.',
      'Esa palmadita significa: creo en ti.',
      'Pequeno gesto, gran animo.',
      'Para los dias dificiles: palmadita de apoyo.',
      'Sigue brillando!',
      'Una palmadita con poderes motivacionales.',
      'El reconocimiento tambien se da en miniatura.',
    ],
  },
  'choca-cinco': {
    emoji: '🙏',
    verb: 'choca los cinco con',
    phrases: [
      'Chocala! Eso estuvo genial.',
      'High five con efecto de sonido incluido: plas!',
      'Sincronizacion perfecta, como en las peliculas.',
      'Ese choque de manos merecia camara lenta.',
      'Buen trabajo en equipo!',
      'Choca esos cinco, campeon/a.',
      'El sonido del exito: plas!',
      'Cinco dedos, una sola victoria.',
    ],
  },
  apreton: {
    emoji: '🤝',
    verb: 'le da un apreton de manos a',
    phrases: [
      'Un trato es un trato. Encantado de conocerte!',
      'Apreton firme, amistad duradera.',
      'Asi se sellan las grandes alianzas.',
      'Bienvenido/a al equipo.',
      'Un apreton de manos y una sonrisa: protocolo de amistad.',
      'Que empiece una gran colaboracion.',
      'Formalidades listas. Ahora a divertirse!',
      'Manos que se estrechan, corazones que se entienden.',
    ],
  },
  saludo: {
    emoji: '👋',
    verb: 'saluda a',
    phrases: [
      'Hola! Que alegria verte por aqui.',
      'Saludo con la mano y sonrisa incluida.',
      'Ey! Pasa, ponte comodo/a.',
      'Un saludo amistoso para alegrar el chat.',
      'Hola hola! Que tal tu dia?',
      'Saludo enviado con buena vibra.',
      'Mira quien llego! Bienvenido/a.',
      'Onda amistosa a la distancia.',
    ],
  },
  toque: {
    emoji: '👉',
    verb: 'le da un toquecito a',
    phrases: [
      'Toc toc. Hay alguien ahi?',
      'Solo pasaba a recordarte que eres genial.',
      'Toquecito amistoso para llamar tu atencion.',
      'Ey tu! Si, tu. Sonrie.',
      'Un poke de buena suerte.',
      'Llamando a tu atencion con carino.',
      'Toquecito en el hombro: hora de la diversion.',
      'Ping humano enviado correctamente.',
    ],
  },
  boop: {
    emoji: '🐽',
    verb: 'le da un boop en la nariz a',
    phrases: [
      'Boop! Nariz oficialmente boopeada.',
      'Boop con amor y cero remordimientos.',
      'La nariz ha sido tocada. Mision cumplida.',
      'Boop! +10 puntos de ternura.',
      'Boop preventivo contra el mal humor.',
      'Tocar la nariz trae buena suerte. Lo dice la ciencia (no verificada).',
      'Boop! Que tengas un dia adorable.',
      'Boop entregado con suavidad profesional.',
    ],
  },
  mimos: {
    emoji: '🧸',
    verb: 'se acurruca con mantita y chocolate junto a',
    phrases: [
      'Mantita, chocolate caliente y buena compania.',
      'Momento acogedor para recargar energias.',
      'Los mejores planes son los tranquilos.',
      'Acurrucarse tambien es autocuidado.',
      'Pijamas, mantas y cero preocupaciones.',
      'Un rato de calma entre amigos.',
      'La comodidad es felicidad en modo suave.',
      'Recarga de ternura completada.',
    ],
  },
  animar: {
    emoji: '📣',
    verb: 'anima a',
    phrases: [
      'Tu puedes! Vamos, que lo logras!',
      'Porras, aplausos y confeti para ti.',
      'Dale que dale! El exito te espera.',
      'Gritando tu nombre desde la grada.',
      'Animo! Estoy en tu equipo.',
      'Ole ole, a por todas!',
      'Tu fan numero uno esta aqui.',
      'Vamos! Hoy es tu dia.',
    ],
  },
  consolar: {
    emoji: '💛',
    verb: 'consuela a',
    phrases: [
      'Todo va a estar bien. Estoy aqui para ti.',
      'Los dias grises tambien pasan.',
      'Un abrazo virtual y un te caliente para el alma.',
      'No tienes que ser fuerte todo el tiempo.',
      'Respira hondo. Un paso a la vez.',
      'Tu sentir es valido. Te acompano.',
      'Despues de la tormenta siempre sale el sol.',
      'Cuenta conmigo para lo que necesites.',
    ],
  },
  celebrar: {
    emoji: '🎉',
    verb: 'celebra con',
    phrases: [
      'Fiesta! Confeti por todas partes.',
      'Este logro merecia celebracion.',
      'Salud! Por ti y tus exitos.',
      'Musica, baile y alegria.',
      'Hoy se celebra en grande.',
      'Felicidades! Te lo mereces.',
      'Que suenen las trompetas.',
      'Brindemos por este gran momento.',
    ],
  },
  'bailar-con': {
    emoji: '💃',
    verb: 'baila con',
    phrases: [
      'A mover esos pies al ritmo de la musica!',
      'Baile improvisado: el mejor tipo de baile.',
      'Gira, salta y rie sin parar.',
      'La pista de baile es toda suya.',
      'Pasos prohibidos permitidos hoy.',
      'Bailar quema calorias y crea recuerdos.',
      'Sube el volumen que empieza la fiesta!',
      'Duo dinamico en la pista.',
    ],
  },
  'cantar-a': {
    emoji: '🎤',
    verb: 'le canta a',
    phrases: [
      'Lalala~ Una cancion dedicada con carino.',
      'Serenata amistosa en camino.',
      'Afinando la voz... que comience el show!',
      'Esta cancion me recuerda a ti.',
      'Karaoke improvisado, unete!',
      'Cantando fuerte y sin verguenza.',
      'Una melodia para alegrar tu dia.',
      'Bis! Bis! El publico pide otra.',
    ],
  },
  'cocinar-para': {
    emoji: '🍳',
    verb: 'cocina para',
    phrases: [
      'Plato del dia preparado con amor.',
      'El ingrediente secreto siempre es el carino.',
      'Cena casera para compartir entre amigos.',
      'Cuidado, chef trabajando!',
      'Comida calentita para el corazon.',
      'Receta de la amistad: risa, charla y buen sabor.',
      'Bon appetit, que aproveche.',
      'Galletas recien horneadas para ti.',
    ],
  },
  regalo: {
    emoji: '🎁',
    verb: 'le regala algo a',
    phrases: [
      'Un regalito envuelto con mucho carino.',
      'Lo importante es el detalle.',
      'Sorpresa! Espero que te guste.',
      'Regalo sin ocasion: los mejores.',
      'Abre con cuidado... es fragil y especial!',
      'Pequeno obsequio, gran amistad.',
      'Elegido pensando en ti.',
      'Feliz dia del regalo inesperado!',
    ],
  },
  te: {
    emoji: '🍵',
    verb: 'comparte un te con',
    phrases: [
      'Te calentito para una charla tranquila.',
      'Nada como un te entre amigos.',
      'Hora del te: momento de calma.',
      'Te de manzanilla para relajar la mente.',
      'Conversaciones profundas saben mejor con te.',
      'Un sorbo de paz en buena compania.',
      'Te verde para recargar energias.',
      'La tetera esta lista, sientate.',
    ],
  },
  cafe: {
    emoji: '☕',
    verb: 'comparte un cafe con',
    phrases: [
      'Cafe recien hecho para empezar el dia.',
      'Un cafe y una buena charla lo arreglan todo.',
      'Hora del cafe entre amigos.',
      'Con leche, con azucar o solo: como prefieras.',
      'El cafe sabe mejor en buena compania.',
      'Pausa para el cafe: recarga completada.',
      'Capuchino con dibujito incluido.',
      'Conversacion y cafeina: combinacion perfecta.',
    ],
  },
  pizza: {
    emoji: '🍕',
    verb: 'comparte una pizza con',
    phrases: [
      'Pizza para dos: la amistad sabe a queso.',
      'Porcion extra de pepperoni para ti.',
      'Noche de pizza, la mejor noche.',
      'El borde relleno es para compartir.',
      'Pizza caliente, amistad mas caliente.',
      'Pina en la pizza? Debate amistoso en camino.',
      'Una rebanada de felicidad para cada uno.',
      'Compartir pizza es compartir amor.',
    ],
  },
  pelicula: {
    emoji: '🎬',
    verb: 've una peli con',
    phrases: [
      'Palomitas listas, que empiece la funcion!',
      'Noche de cine en casa.',
      'Tu eliges la peli, yo traigo las palomitas.',
      'Maraton de peliculas en camino.',
      'Asientos comodos y buena compania.',
      'Comedia o aventura: la noche es joven.',
      'Silencio... ya empieza!',
      'Los creditos no terminan la amistad.',
    ],
  },
  'mirar-estrellas': {
    emoji: '🔭',
    verb: 'mira las estrellas con',
    phrases: [
      'El cielo esta lleno de historias esta noche.',
      'Contando estrellas y pidiendo deseos.',
      'Una manta, cielo despejado y buena compania.',
      'Las estrellas brillan mas entre amigos.',
      'Ves esa constelacion? Te la dedico.',
      'El universo cabe en una buena conversacion.',
      'Noche perfecta para sonar despiertos.',
      'Cada estrella, un motivo para sonreir.',
    ],
  },
  fogata: {
    emoji: '🔥',
    verb: 'comparte una fogata con',
    phrases: [
      'Fogata encendida, historias por contar.',
      'Malvaviscos tostados para todos.',
      'El crepitar del fuego acompana la charla.',
      'Noche de fogata y cuentos.',
      'Calor del fuego, calor de la amistad.',
      'Mirando las llamas, sonando en grande.',
      'Guitarra imaginaria y canciones al viento.',
      'Bajo las estrellas, junto al fuego.',
    ],
  },
  aventura: {
    emoji: '🗺️',
    verb: 'vive una aventura con',
    phrases: [
      'Mochilas listas! La aventura nos espera.',
      'Mapa en mano y curiosidad infinita.',
      'Los mejores recuerdos se hacen explorando.',
      'Rumbo a lo desconocido, juntos.',
      'Aventura epica en modo amistad.',
      'Cada camino esconde una sorpresa.',
      'Exploradores oficiales de la diversion.',
      'Que empiece la expedicion!',
    ],
  },
  'estudiar-con': {
    emoji: '📚',
    verb: 'estudia con',
    phrases: [
      'Sesion de estudio en equipo: a por ese examen!',
      'Apuntes compartidos, conocimiento duplicado.',
      'Concentracion maxima y descansos merecidos.',
      'Estudiar juntos hace todo mas facil.',
      'Resumenes, esquemas y buena compania.',
      'Tu puedes con ese examen!',
      'Biblioteca, cafe y ganas de aprender.',
      'Duo de estudio imparable.',
    ],
  },
  'entrenar-con': {
    emoji: '💪',
    verb: 'entrena con',
    phrases: [
      'Una repeticion mas! Tu puedes!',
      'Compañero de gym oficial.',
      'Sudor, esfuerzo y buenos resultados.',
      'Entrenar juntos es mas divertido.',
      'Calentamiento listo, a darle!',
      'Rutina completada en equipo.',
      'Mente sana en cuerpo sano.',
      'High five post-entreno. Lo lograron!',
    ],
  },
  pijamada: {
    emoji: '🌙',
    verb: 'hace pijamada con',
    phrases: [
      'Pijamada oficial: pelis, palomitas y secretos.',
      'Sacos de dormir listos para la diversion.',
      'Noche de juegos y risas hasta tarde.',
      'Historias antes de dormir incluidas.',
      'Desayuno de campeones por la manana.',
      'Batalla de almohadas amistosa.',
      'Luces apagadas, linternas encendidas: hora de cuentos.',
      'Dulces suenos en buena compania.',
    ],
  },
};

function pick(phrases: string[]): string {
  if (phrases.length === 0) return 'Que tengas un gran dia!';
  return phrases[Math.floor(Math.random() * phrases.length)] ?? phrases[0] ?? 'Que tengas un gran dia!';
}

async function sendRp(interaction: ChatInputCommandInteraction, key: string): Promise<void> {
  const def = RP[key];
  if (!def) {
    await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Comando no reconocido.')], ephemeral: true });
    return;
  }
  const actor = interaction.user;
  const target = interaction.options.getUser('usuario') ?? actor;
  const title = `${def.emoji} ${actor} ${def.verb} ${target}`;
  const description = target.id === actor.id ? `El amor propio tambien cuenta! 💛\n${pick(def.phrases)}` : pick(def.phrases);
  await interaction.reply({ embeds: [Embeds.primary(title, description)] });
}

function targetOption(s: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return s.addUserOption((o) => o.setName('usuario').setDescription('Con quién (por defecto tú)'));
}

export const roleplay: Command = {
  data: new SlashCommandBuilder()
    .setName('juego-rol')
    .setDescription('Interacciones sociales amistosas')
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('abrazo').setDescription('Abraza a alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('palmadita').setDescription('Palmadita de ánimo');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('choca-cinco').setDescription('Choca los cinco');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('apreton').setDescription('Apretón de manos');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('saludo').setDescription('Saluda a alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('toque').setDescription('Toquecito amistoso');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('boop').setDescription('Boop en la nariz');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('mimos').setDescription('Momento acogedor con mantita');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('animar').setDescription('Anima a alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('consolar').setDescription('Consuela a alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('celebrar').setDescription('Celebra con alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('bailar-con').setDescription('Baila con alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('cantar-a').setDescription('Cántale a alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('cocinar-para').setDescription('Cocina para alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('regalo').setDescription('Regálale algo a alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('te').setDescription('Comparte un té');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('cafe').setDescription('Comparte un café');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('pizza').setDescription('Comparte una pizza');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('pelicula').setDescription('Ve una película con alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('mirar-estrellas').setDescription('Mira las estrellas con alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('fogata').setDescription('Comparte una fogata');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('aventura').setDescription('Vive una aventura con alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('estudiar-con').setDescription('Estudia con alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('entrenar-con').setDescription('Entrena con alguien');
    })
    .addSubcommand((s) => {
      targetOption(s);
      return s.setName('pijamada').setDescription('Pijamada con alguien');
    }),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'abrazo') {
      await sendRp(interaction, 'abrazo');
      return;
    }
    if (sub === 'palmadita') {
      await sendRp(interaction, 'palmadita');
      return;
    }
    if (sub === 'choca-cinco') {
      await sendRp(interaction, 'choca-cinco');
      return;
    }
    if (sub === 'apreton') {
      await sendRp(interaction, 'apreton');
      return;
    }
    if (sub === 'saludo') {
      await sendRp(interaction, 'saludo');
      return;
    }
    if (sub === 'toque') {
      await sendRp(interaction, 'toque');
      return;
    }
    if (sub === 'boop') {
      await sendRp(interaction, 'boop');
      return;
    }
    if (sub === 'mimos') {
      await sendRp(interaction, 'mimos');
      return;
    }
    if (sub === 'animar') {
      await sendRp(interaction, 'animar');
      return;
    }
    if (sub === 'consolar') {
      await sendRp(interaction, 'consolar');
      return;
    }
    if (sub === 'celebrar') {
      await sendRp(interaction, 'celebrar');
      return;
    }
    if (sub === 'bailar-con') {
      await sendRp(interaction, 'bailar-con');
      return;
    }
    if (sub === 'cantar-a') {
      await sendRp(interaction, 'cantar-a');
      return;
    }
    if (sub === 'cocinar-para') {
      await sendRp(interaction, 'cocinar-para');
      return;
    }
    if (sub === 'regalo') {
      await sendRp(interaction, 'regalo');
      return;
    }
    if (sub === 'te') {
      await sendRp(interaction, 'te');
      return;
    }
    if (sub === 'cafe') {
      await sendRp(interaction, 'cafe');
      return;
    }
    if (sub === 'pizza') {
      await sendRp(interaction, 'pizza');
      return;
    }
    if (sub === 'pelicula') {
      await sendRp(interaction, 'pelicula');
      return;
    }
    if (sub === 'mirar-estrellas') {
      await sendRp(interaction, 'mirar-estrellas');
      return;
    }
    if (sub === 'fogata') {
      await sendRp(interaction, 'fogata');
      return;
    }
    if (sub === 'aventura') {
      await sendRp(interaction, 'aventura');
      return;
    }
    if (sub === 'estudiar-con') {
      await sendRp(interaction, 'estudiar-con');
      return;
    }
    if (sub === 'entrenar-con') {
      await sendRp(interaction, 'entrenar-con');
      return;
    }
    if (sub === 'pijamada') {
      await sendRp(interaction, 'pijamada');
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
  },
};
