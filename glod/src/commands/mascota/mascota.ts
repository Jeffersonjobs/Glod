/**
 * Mascota virtual persistente: /mascota <12 subcomandos de cuidado>.
 * Decaimiento por tiempo real desde updatedAt; SQLite vía modelo Mascota.
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';
import { Mascota } from '../../database/models/Mascota.js';

const ESPECIES: readonly string[] = ['gato', 'perro', 'dragon', 'hamster', 'loro', 'tortuga', 'conejo', 'zorro'];

const ESPECIE_EMOJI: Record<string, string> = {
  gato: '🐱',
  perro: '🐶',
  dragon: '🐉',
  hamster: '🐹',
  loro: '🦜',
  tortuga: '🐢',
  conejo: '🐰',
  zorro: '🦊',
};

function emojiDe(especie: string): string {
  return ESPECIE_EMOJI[especie] ?? '🐾';
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function barra(valor: number): string {
  const llena = Math.max(0, Math.min(10, Math.round(valor / 10)));
  return '█'.repeat(llena) + '░'.repeat(10 - llena);
}

function estadoDe(pet: Mascota): string {
  if (pet.dormida) return 'Durmiendo 😴';
  if (pet.hambre <= 20) return 'Hambrienta 🍖';
  if (pet.felicidad < 30) return 'Triste 😢';
  return 'Feliz 😊';
}

/**
 * Aplica el decaimiento por tiempo real desde updatedAt.
 * Devuelve true si despertó sola (dormía más de 8h seguidas).
 */
function aplicarDecaimiento(pet: Mascota): boolean {
  const horas = Math.max(0, (Date.now() - pet.updatedAt.getTime()) / 3600000);
  if (horas <= 0) return false;
  pet.hambre = clamp(pet.hambre - 4 * horas);
  pet.felicidad = clamp(pet.felicidad - 3 * horas);
  if (pet.dormida) {
    pet.energia = clamp(pet.energia + 15 * horas);
    if (horas >= 8) {
      pet.dormida = false;
      if (pet.hambre <= 0) pet.salud = clamp(pet.salud - 5 * horas);
      else if (pet.hambre > 50) pet.salud = clamp(pet.salud + 2 * horas);
      return true;
    }
  } else {
    pet.energia = clamp(pet.energia - 2 * horas);
  }
  if (pet.hambre <= 0) pet.salud = clamp(pet.salud - 5 * horas);
  else if (pet.hambre > 50) pet.salud = clamp(pet.salud + 2 * horas);
  return false;
}

function ficha(pet: Mascota): string {
  return (
    `${emojiDe(pet.especie)} **${pet.nombre}** (${pet.especie}) — ${estadoDe(pet)}\n\n` +
    `🍖 Hambre: \`${barra(pet.hambre)}\` ${Math.round(pet.hambre)}\n` +
    `😊 Felicidad: \`${barra(pet.felicidad)}\` ${Math.round(pet.felicidad)}\n` +
    `⚡ Energía: \`${barra(pet.energia)}\` ${Math.round(pet.energia)}\n` +
    `❤️ Salud: \`${barra(pet.salud)}\` ${Math.round(pet.salud)}`
  );
}

export const mascota: Command = {
  data: new SlashCommandBuilder()
    .setName('mascota')
    .setDescription('Cuida tu mascota virtual: alimenta, juega, pasea y más')
    .addSubcommand((s) =>
      s
        .setName('adoptar')
        .setDescription('Adopta una mascota virtual')
        .addStringOption((o) =>
          o
            .setName('especie')
            .setDescription('Especie de tu mascota')
            .setRequired(true)
            .addChoices(
              { name: 'Gato 🐱', value: 'gato' },
              { name: 'Perro 🐶', value: 'perro' },
              { name: 'Dragón 🐉', value: 'dragon' },
              { name: 'Hámster 🐹', value: 'hamster' },
              { name: 'Loro 🦜', value: 'loro' },
              { name: 'Tortuga 🐢', value: 'tortuga' },
              { name: 'Conejo 🐰', value: 'conejo' },
              { name: 'Zorro 🦊', value: 'zorro' },
            ),
        )
        .addStringOption((o) => o.setName('nombre').setDescription('Nombre de tu mascota').setRequired(true).setMaxLength(20)),
    )
    .addSubcommand((s) => s.setName('estado').setDescription('Ver el estado de tu mascota'))
    .addSubcommand((s) => s.setName('alimentar').setDescription('Dar de comer a tu mascota (+hambre, +felicidad)'))
    .addSubcommand((s) => s.setName('jugar').setDescription('Jugar con tu mascota (+felicidad, -energía)'))
    .addSubcommand((s) => s.setName('dormir').setDescription('Poner a dormir a tu mascota (recupera energía)'))
    .addSubcommand((s) => s.setName('despertar').setDescription('Despertar a tu mascota'))
    .addSubcommand((s) => s.setName('pasear').setDescription('Pasear con tu mascota (+felicidad, +salud)'))
    .addSubcommand((s) => s.setName('banar').setDescription('Bañar a tu mascota (+salud, +felicidad)'))
    .addSubcommand((s) => s.setName('curar').setDescription('Curar a tu mascota (+salud, solo si está enferma)'))
    .addSubcommand((s) =>
      s
        .setName('renombrar')
        .setDescription('Cambiar el nombre de tu mascota')
        .addStringOption((o) => o.setName('nombre').setDescription('Nuevo nombre').setRequired(true).setMaxLength(20)),
    )
    .addSubcommand((s) => s.setName('ranking').setDescription('Top 5 de mascotas del servidor'))
    .addSubcommand((s) =>
      s
        .setName('liberar')
        .setDescription('Liberar a tu mascota para siempre')
        .addBooleanOption((o) => o.setName('confirmar').setDescription('Confirma que quieres liberarla').setRequired(true)),
    ),
  cooldown: 3,
  async execute(interaction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ embeds: [Embeds.error('Sin servidor', 'Este comando solo funciona dentro de un servidor.')], ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const especie = interaction.options.getString('especie');
    const nombre = interaction.options.getString('nombre');
    const confirmar = interaction.options.getBoolean('confirmar');
    const userId = interaction.user.id;

    if (sub === 'adoptar') {
      const previa = await Mascota.findOne({ guildId, userId });
      if (previa) {
        await interaction.reply({
          embeds: [Embeds.error('Ya tienes mascota', `Ya cuidas a **${previa.nombre}** ${emojiDe(previa.especie)}. Libérala antes de adoptar otra.`)],
          ephemeral: true,
        });
        return;
      }
      const sp = (especie ?? '').toLowerCase();
      if (!ESPECIES.includes(sp)) {
        await interaction.reply({ embeds: [Embeds.error('Especie inválida', 'Elige una especie válida: gato, perro, dragon, hamster, loro, tortuga, conejo o zorro.')], ephemeral: true });
        return;
      }
      const nom = (nombre ?? '').trim();
      if (nom.length === 0) {
        await interaction.reply({ embeds: [Embeds.error('Sin nombre', 'Ponle un nombre a tu mascota (máximo 20 caracteres).')], ephemeral: true });
        return;
      }
      if (nom.length > 20) {
        await interaction.reply({ embeds: [Embeds.error('Nombre largo', 'El nombre no puede superar los 20 caracteres.')], ephemeral: true });
        return;
      }
      const pet = await Mascota.create({ guildId, userId, nombre: nom, especie: sp });
      await interaction.reply({ embeds: [Embeds.success('¡Mascota adoptada!', `${emojiDe(pet.especie)} ¡Bienvenido/a **${pet.nombre}**! Cuídalo/a bien: aliméntalo/a, juega y deja que descanse.\n\n${ficha(pet)}`)] });
      return;
    }

    if (sub === 'ranking') {
      const todas = await Mascota.find({ guildId });
      if (todas.length === 0) {
        await interaction.reply({ embeds: [Embeds.info('Sin mascotas', 'Nadie tiene mascota en este servidor todavía. ¡Sé la primera persona con `/mascota adoptar`!')] });
        return;
      }
      const ordenadas = todas
        .map((m) => {
          aplicarDecaimiento(m);
          return { pet: m, puntos: m.felicidad + m.salud };
        })
        .sort((a, b) => b.puntos - a.puntos)
        .slice(0, 5);
      const lineas = ordenadas.map((e, i) => `${i + 1}. ${emojiDe(e.pet.especie)} **${e.pet.nombre}** — <@${e.pet.userId}> (**${Math.round(e.puntos)}** pts)`);
      await interaction.reply({ embeds: [Embeds.primary('🏆 Ranking de mascotas', lineas.join('\n'))] });
      return;
    }

    if (sub === 'liberar') {
      if (confirmar !== true) {
        await interaction.reply({
          embeds: [Embeds.warning('Sin confirmar', 'Para liberar a tu mascota usa `/mascota liberar` con `confirmar` en verdadero. Esta acción no se puede deshacer.')],
          ephemeral: true,
        });
        return;
      }
      const res = await Mascota.deleteOne({ guildId, userId });
      if (res.deletedCount === 0) {
        await interaction.reply({ embeds: [Embeds.error('Sin mascota', 'No tienes ninguna mascota que liberar. Adopta una con `/mascota adoptar`.')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.success('Mascota liberada', 'Tu mascota ha vuelto a la naturaleza. ¡Gracias por cuidarla! 🍃')] });
      return;
    }

    const cargada = await Mascota.findOne({ guildId, userId });
    if (!cargada) {
      await interaction.reply({ embeds: [Embeds.error('Sin mascota', 'Aún no tienes mascota. Adóptala con `/mascota adoptar`.')], ephemeral: true });
      return;
    }
    const desperto = aplicarDecaimiento(cargada);
    const notaDespertar = desperto ? '\n\n⏰ Tu mascota durmió más de 8 horas y se despertó sola.' : '';

    if (sub === 'estado') {
      await cargada.save();
      await interaction.reply({ embeds: [Embeds.primary(`Mascota de ${interaction.user.username}`, `${ficha(cargada)}${notaDespertar}`)] });
      return;
    }

    if (sub === 'alimentar') {
      if (cargada.dormida) {
        await cargada.save();
        await interaction.reply({ embeds: [Embeds.error('Está dormida', 'Tu mascota está dormida. Despiértala primero con `/mascota despertar`.')], ephemeral: true });
        return;
      }
      if (cargada.hambre >= 100) {
        await cargada.save();
        await interaction.reply({ embeds: [Embeds.error('Llena', 'Tu mascota ya está llena. ¡Vuelve más tarde! 🍖')], ephemeral: true });
        return;
      }
      cargada.hambre = clamp(cargada.hambre + 25);
      cargada.felicidad = clamp(cargada.felicidad + 5);
      await cargada.save();
      await interaction.reply({ embeds: [Embeds.success('¡Ñam ñam!', `Le diste de comer a **${cargada.nombre}**. 🍖${notaDespertar}\n\n${ficha(cargada)}`)] });
      return;
    }

    if (sub === 'jugar') {
      if (cargada.dormida) {
        await cargada.save();
        await interaction.reply({ embeds: [Embeds.error('Está dormida', 'Tu mascota está dormida. Despiértala primero con `/mascota despertar`.')], ephemeral: true });
        return;
      }
      if (cargada.energia < 15) {
        await cargada.save();
        await interaction.reply({ embeds: [Embeds.error('Cansada', 'Tu mascota está demasiado cansada para jugar. Déjala dormir con `/mascota dormir`. ⚡')], ephemeral: true });
        return;
      }
      cargada.felicidad = clamp(cargada.felicidad + 15);
      cargada.energia = clamp(cargada.energia - 15);
      cargada.hambre = clamp(cargada.hambre - 10);
      await cargada.save();
      await interaction.reply({ embeds: [Embeds.success('¡A jugar!', `Jugaste con **${cargada.nombre}**. ¡Se lo pasó genial! 🎾${notaDespertar}\n\n${ficha(cargada)}`)] });
      return;
    }

    if (sub === 'dormir') {
      if (cargada.dormida) {
        await cargada.save();
        await interaction.reply({ embeds: [Embeds.error('Ya duerme', 'Tu mascota ya está durmiendo. 😴')], ephemeral: true });
        return;
      }
      cargada.dormida = true;
      await cargada.save();
      await interaction.reply({ embeds: [Embeds.primary('😴 A dormir', `**${cargada.nombre}** se fue a dormir. Dormida recupera energía (+15/hora).${notaDespertar}`)] });
      return;
    }

    if (sub === 'despertar') {
      if (!cargada.dormida) {
        await cargada.save();
        if (desperto) {
          await interaction.reply({ embeds: [Embeds.success('¡Despierta!', `**${cargada.nombre}** ya se había despertado sola tras dormir más de 8 horas. ☀️\n\n${ficha(cargada)}`)] });
        } else {
          await interaction.reply({ embeds: [Embeds.error('Despierta', 'Tu mascota ya está despierta. ☀️')], ephemeral: true });
        }
        return;
      }
      cargada.dormida = false;
      await cargada.save();
      await interaction.reply({ embeds: [Embeds.success('¡Despierta!', `**${cargada.nombre}** se despertó llena de energía. ☀️\n\n${ficha(cargada)}`)] });
      return;
    }

    if (sub === 'pasear') {
      if (cargada.dormida) {
        await cargada.save();
        await interaction.reply({ embeds: [Embeds.error('Está dormida', 'Tu mascota está dormida. Despiértala primero con `/mascota despertar`.')], ephemeral: true });
        return;
      }
      cargada.felicidad = clamp(cargada.felicidad + 12);
      cargada.salud = clamp(cargada.salud + 8);
      cargada.energia = clamp(cargada.energia - 12);
      await cargada.save();
      await interaction.reply({ embeds: [Embeds.success('¡De paseo!', `Paseaste con **${cargada.nombre}**. ¡Qué aire tan fresco! 🌳${notaDespertar}\n\n${ficha(cargada)}`)] });
      return;
    }

    if (sub === 'banar') {
      cargada.salud = clamp(cargada.salud + 10);
      cargada.felicidad = clamp(cargada.felicidad + 8);
      await cargada.save();
      await interaction.reply({ embeds: [Embeds.success('¡Limpia!', `Bañaste a **${cargada.nombre}**. ¡Quedó reluciente! 🛁${notaDespertar}\n\n${ficha(cargada)}`)] });
      return;
    }

    if (sub === 'curar') {
      if (cargada.salud >= 60) {
        await cargada.save();
        await interaction.reply({ embeds: [Embeds.error('Sana', 'Tu mascota está sana (salud 60 o más). Solo puedes curarla si su salud baja de 60. ❤️')], ephemeral: true });
        return;
      }
      const ultima = cargada.lastCuraAt ? cargada.lastCuraAt.getTime() : 0;
      const espera = 3600000 - (Date.now() - ultima);
      if (cargada.lastCuraAt && espera > 0) {
        await cargada.save();
        const mins = Math.max(1, Math.ceil(espera / 60000));
        await interaction.reply({ embeds: [Embeds.error('En reposo', `Acabas de curarla. Espera **${mins} min** antes de curarla de nuevo. 💊`)], ephemeral: true });
        return;
      }
      cargada.salud = clamp(cargada.salud + 30);
      cargada.lastCuraAt = new Date();
      await cargada.save();
      await interaction.reply({ embeds: [Embeds.success('¡Curada!', `Curaste a **${cargada.nombre}**. Se siente mucho mejor. 💊${notaDespertar}\n\n${ficha(cargada)}`)] });
      return;
    }

    if (sub === 'renombrar') {
      const nom = (nombre ?? '').trim();
      if (nom.length === 0) {
        await interaction.reply({ embeds: [Embeds.error('Sin nombre', 'Escribe el nuevo nombre (máximo 20 caracteres).')], ephemeral: true });
        return;
      }
      if (nom.length > 20) {
        await interaction.reply({ embeds: [Embeds.error('Nombre largo', 'El nombre no puede superar los 20 caracteres.')], ephemeral: true });
        return;
      }
      cargada.nombre = nom;
      await cargada.save();
      await interaction.reply({ embeds: [Embeds.success('Renombrada', `Tu mascota ahora se llama **${cargada.nombre}**. ✏️${notaDespertar}\n\n${ficha(cargada)}`)] });
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
  },
};
