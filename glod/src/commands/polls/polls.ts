/**
 * Votaciones: /votacion (crear/sino/puntuada/lista/nota-resultados/finalizar/activas/eliminar).
 * Voto por reacciones con seguimiento en memoria.
 * @module commands/polls/polls
 */
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction, Message } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
const YES_NO_EMOJIS = ['✅', '❌'];
const RATED_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

interface PollRecord {
  messageId: string;
  channelId: string;
  question: string;
  authorId: string;
  createdAt: number;
  kind: string;
}

/** Registro en memoria de las votaciones creadas desde el arranque. */
const activePolls = new Map<string, PollRecord>();

function canModerate(interaction: ChatInputCommandInteraction, authorId?: string): boolean {
  if (authorId && interaction.user.id === authorId) return true;
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages));
}

async function addReactions(msg: Message, emojis: string[]): Promise<void> {
  for (const e of emojis) {
    try {
      await msg.react(e);
    } catch {
      break;
    }
  }
}

async function sendPoll(
  interaction: ChatInputCommandInteraction,
  kind: string,
  question: string,
  options: string[],
  emojis: string[],
  extra?: string,
): Promise<void> {
  const lines = options.map((o, i) => `${emojis[i]} ${o}`);
  const desc = `**${question}**\n\n${lines.join('\n')}${extra ? `\n\n${extra}` : ''}\n\n*Vota reaccionando abajo.*`;
  await interaction.reply({ embeds: [Embeds.primary('📊 Votación', desc)] });
  const msg = await interaction.fetchReply();
  await addReactions(msg, emojis.slice(0, options.length));
  activePolls.set(msg.id, {
    messageId: msg.id,
    channelId: msg.channelId,
    question,
    authorId: interaction.user.id,
    createdAt: Date.now(),
    kind,
  });
  await interaction.followUp({
    embeds: [Embeds.info('Votación creada', `ID del mensaje: \`${msg.id}\` — usa \`/votacion finalizar mensaje-id:${msg.id}\` para cerrarla y contar los votos.`)],
    ephemeral: true,
  });
}

async function fetchTargetMessage(interaction: ChatInputCommandInteraction, messageId: string): Promise<Message | null> {
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || !('messages' in channel)) return null;
  return channel.messages.fetch(messageId).catch(() => null);
}

export const poll: Command = {
  data: new SlashCommandBuilder()
    .setName('votacion')
    .setDescription('Crea y gestiona votaciones por reacciones')
    .addSubcommand((s) =>
      s
        .setName('crear')
        .setDescription('Crea una votación con hasta 4 opciones')
        .addStringOption((o) => o.setName('pregunta').setDescription('Pregunta de la votación').setRequired(true))
        .addStringOption((o) => o.setName('opcion1').setDescription('Primera opción').setRequired(true))
        .addStringOption((o) => o.setName('opcion2').setDescription('Segunda opción').setRequired(true))
        .addStringOption((o) => o.setName('opcion3').setDescription('Tercera opción'))
        .addStringOption((o) => o.setName('opcion4').setDescription('Cuarta opción'))
        .addIntegerOption((o) => o.setName('duracion').setDescription('Duración informativa en minutos').setMinValue(1).setMaxValue(10080)),
    )
    .addSubcommand((s) =>
      s
        .setName('sino')
        .setDescription('Votación Sí/No (✅❌)')
        .addStringOption((o) => o.setName('pregunta').setDescription('Pregunta de la votación').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('puntuada')
        .setDescription('Votación de 1 a 5')
        .addStringOption((o) => o.setName('pregunta').setDescription('Qué quieres puntuar').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('lista')
        .setDescription('Votación estilo lista desde texto separado por comas (2-8)')
        .addStringOption((o) => o.setName('pregunta').setDescription('Pregunta de la votación').setRequired(true))
        .addStringOption((o) => o.setName('opciones').setDescription('Opciones separadas por comas, 2-8 (p. ej. "rojo, azul, verde")').setRequired(true)),
    )
    .addSubcommand((s) => s.setName('nota-resultados').setDescription('Dónde ver los resultados'))
    .addSubcommand((s) =>
      s
        .setName('finalizar')
        .setDescription('Cierra una votación y cuenta las reacciones')
        .addStringOption((o) => o.setName('mensaje-id').setDescription('ID del mensaje de la votación').setRequired(true)),
    )
    .addSubcommand((s) => s.setName('activas').setDescription('Lista las votaciones guardadas en memoria'))
    .addSubcommand((s) =>
      s
        .setName('eliminar')
        .setDescription('Elimina un mensaje de votación del bot')
        .addStringOption((o) => o.setName('mensaje-id').setDescription('ID del mensaje de la votación').setRequired(true)),
    ),
  cooldown: 5,
  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'crear') {
      const question = interaction.options.getString('pregunta', true);
      const options = [
        interaction.options.getString('opcion1', true),
        interaction.options.getString('opcion2', true),
        interaction.options.getString('opcion3'),
        interaction.options.getString('opcion4'),
      ].filter((o): o is string => Boolean(o));
      const duration = interaction.options.getInteger('duracion');
      const extra = duration ? `⏱ Duración sugerida: ~${duration} min (informativa — cierra manualmente con \`/votacion finalizar\`).` : undefined;
      await sendPoll(interaction, 'crear', question, options, NUMBER_EMOJIS, extra);
      return;
    }

    if (sub === 'sino') {
      const question = interaction.options.getString('pregunta', true);
      await sendPoll(interaction, 'sino', question, ['Sí', 'No'], YES_NO_EMOJIS);
      return;
    }

    if (sub === 'puntuada') {
      const question = interaction.options.getString('pregunta', true);
      const options = ['1 — Fatal', '2 — Mal', '3 — Regular', '4 — Bien', '5 — Excelente'];
      await sendPoll(
        interaction,
        'puntuada',
        question,
        options,
        RATED_EMOJIS,
        '⭐ Puntúa del 1 al 5 reaccionando con el número correspondiente.',
      );
      return;
    }

    if (sub === 'lista') {
      const question = interaction.options.getString('pregunta', true);
      const raw = interaction.options.getString('opciones', true);
      const options = raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      if (options.length < 2 || options.length > 8) {
        await interaction.reply({
          embeds: [Embeds.error('Opciones no válidas', 'Indica de 2 a 8 opciones separadas por comas (p. ej. `"rojo, azul, verde"`).')],
          ephemeral: true,
        });
        return;
      }
      await sendPoll(
        interaction,
        'lista',
        question,
        options,
        NUMBER_EMOJIS,
        'Vota reaccionando con el número de tu opción favorita.',
      );
      return;
    }

    if (sub === 'nota-resultados') {
      await interaction.reply({
        embeds: [
          Embeds.info(
            '¿Dónde están los resultados?',
            'Los resultados están en el propio mensaje de la votación: cada reacción muestra su conteo junto al emoji.\n\n' +
              '• Los votantes reaccionan directamente en el mensaje.\n' +
              '• Usa `/votacion finalizar mensaje-id:<id>` para un resumen con el recuento (sin contar al bot).\n' +
              '• Usa `/votacion activas` para ver los IDs de las votaciones activas.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'finalizar') {
      const messageId = interaction.options.getString('mensaje-id', true);
      const record = activePolls.get(messageId);
      if (!canModerate(interaction, record?.authorId)) {
        await interaction.reply({
          embeds: [Embeds.error('Sin permiso', 'Solo el autor de la votación o un moderador (Gestionar mensajes) puede cerrarla.')],
          ephemeral: true,
        });
        return;
      }
      const msg = await fetchTargetMessage(interaction, messageId);
      if (!msg) {
        await interaction.reply({ embeds: [Embeds.error('No encontrada', 'No se pudo obtener ese mensaje en este canal.')], ephemeral: true });
        return;
      }
      const tally = msg.reactions.cache.map((r) => {
        const votes = Math.max(0, (r.count ?? 0) - (r.me ? 1 : 0));
        return `${r.emoji.toString()} — **${votes}** voto(s)`;
      });
      activePolls.delete(messageId);
      const question = record?.question ?? 'Votación';
      await interaction.reply({
        embeds: [Embeds.primary('📊 Resultados de la votación', `**${question}**\n\n${tally.join('\n') || '*Sin votos todavía.*'}`)],
      });
      return;
    }

    if (sub === 'activas') {
      if (activePolls.size === 0) {
        await interaction.reply({ embeds: [Embeds.info('Sin votaciones activas', 'No hay votaciones guardadas en memoria desde el arranque.')] });
        return;
      }
      const lines = [...activePolls.values()].map(
        (p) => `• \`${p.messageId}\` — **${p.question.slice(0, 80)}** (${p.kind}) por <@${p.authorId}> — <t:${Math.floor(p.createdAt / 1000)}:R>`,
      );
      await interaction.reply({ embeds: [Embeds.primary('📊 Votaciones activas', lines.join('\n').slice(0, 3900))] });
      return;
    }

    if (sub === 'eliminar') {
      const messageId = interaction.options.getString('mensaje-id', true);
      const record = activePolls.get(messageId);
      if (!canModerate(interaction, record?.authorId)) {
        await interaction.reply({
          embeds: [Embeds.error('Sin permiso', 'Solo el autor de la votación o un moderador (Gestionar mensajes) puede eliminarla.')],
          ephemeral: true,
        });
        return;
      }
      const msg = await fetchTargetMessage(interaction, messageId);
      if (!msg) {
        await interaction.reply({ embeds: [Embeds.error('No encontrada', 'No se pudo obtener ese mensaje en este canal.')], ephemeral: true });
        return;
      }
      if (msg.author.id !== client.user?.id) {
        await interaction.reply({ embeds: [Embeds.error('No es una votación del bot', 'Ese mensaje no lo envió el bot.')], ephemeral: true });
        return;
      }
      await msg.delete().catch(() => null);
      activePolls.delete(messageId);
      await interaction.reply({ embeds: [Embeds.success('Votación eliminada', `Mensaje de votación \`${messageId}\` eliminado.`)] });
      return;
    }
  },
};
