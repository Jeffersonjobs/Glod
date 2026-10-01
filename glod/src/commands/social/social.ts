/**
 * Social: /social — perfil sano, reputación, matrimonios y acciones amistosas.
 * Reputación/matrimonios/flechazos viven en memoria (sin nueva base de datos).
 * Level/EconomyUser solo se leen para las estadísticas del perfil.
 * @module commands/social/social
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { EconomyUser, Level } from '../../database/models/entities.js';
import { Embeds } from '../../utils/embeds.js';

const REP_COOLDOWN_MS = 3600_000; // 1h por donante
const repCounts = new Map<string, number>();
const repCooldowns = new Map<string, number>();
const marriages = new Map<string, string>();
const crushes = new Map<string, string>();

const repKey = (guildId: string, userId: string): string => `${guildId}:${userId}`;

const HUG_GIFS: string[] = [
  '🤗 le da un gran abrazo cálido a',
  '🫂 aprieta fuerte con un abrazo amistoso a',
  '🤗 comparte galletas y un abrazo acogedor con',
];
const KISS_EMOTES: string[] = ['💋 le manda un beso amistoso en la mejilla a', '😘 le envía un dulce beso platónico en la frente a'];
const PAT_LINES: string[] = ['acaricia suavemente la cabeza de', 'le da una palmadita amistosa a', 'acaricia con orgullo, como un buen entrenador, a'];
const SLAP_LINES: string[] = ['le da un golpe juguetón con un churro de espuma a', 'le pega con un pez gigante de juguete a', 'le lanza una almohada inofensiva a'];
const HIGHFIVE_LINES: string[] = ['comparte un choca-cinco épico con', 'salta para un doble choca-cinco con', 'celebra con un choca-cinco a'];
const CRUSH_LINES: string[] = ['tiene un admirador secreto… ¿serás tú? 👀', 'se ha sonrojado — alguien anónimo cree que es genial 💘', 'acaba de recibir un cumplido anónimo 💌'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export const social: Command = {
  data: new SlashCommandBuilder()
    .setName('social')
    .setDescription('Interacciones sociales sanas')
    .addSubcommand((s) => s.setName('perfil').setDescription('Muestra nivel de XP + saldo').addUserOption((o) => o.setName('usuario').setDescription('Usuario')))
    .addSubcommand((s) => s.setName('dar-rep').setDescription('Da +1 rep (1h de espera)').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand((s) => s.setName('reputacion').setDescription('Ver la cantidad de reps').addUserOption((o) => o.setName('usuario').setDescription('Usuario')))
    .addSubcommand((s) => s.setName('casarse').setDescription('Propone un matrimonio juguetón').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand((s) => s.setName('divorcio').setDescription('Termina tu matrimonio juguetón'))
    .addSubcommand((s) => s.setName('abrazo').setDescription('Abraza a alguien con cariño').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand((s) => s.setName('beso').setDescription('Envía un beso sano en la mejilla').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand((s) => s.setName('caricia').setDescription('Acaricia la cabeza de alguien').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand((s) => s.setName('bofetada').setDescription('Bofetada tonta e inofensiva').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand((s) => s.setName('choca-cinco').setDescription('Choca los cinco con alguien').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand((s) => s.setName('flechazo').setDescription('Flechazo sano y anónimo').addUserOption((o) => o.setName('usuario').setDescription('Usuario')))
    .addSubcommand((s) => s.setName('mejor-amigo').setDescription('Declara a alguien tu mejor amigo').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true))),
  cooldown: 4,
  async execute(interaction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ embeds: [Embeds.error('Sin servidor', 'Este comando solo funciona dentro de un servidor.')], ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('usuario') ?? interaction.user;

    if (sub === 'perfil') {
      const [lvl, eco] = await Promise.all([
        Level.findOne({ guildId, userId: target.id }),
        EconomyUser.findOne({ guildId, userId: target.id }),
      ]);
      const embed = Embeds.primary(`🌟 Perfil de ${target.username}`, `Nivel **${lvl?.level ?? 0}** · **${lvl?.xp ?? 0}** XP\nSaldo: **${eco?.balance ?? 0}** monedas\nReps: **${repCounts.get(repKey(guildId, target.id)) ?? 0}** ⭐`).setThumbnail(target.displayAvatarURL());
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'dar-rep') {
      if (target.id === interaction.user.id) {
        await interaction.reply({ embeds: [Embeds.warning('¡Buen intento!', 'No puedes darte rep a ti mismo. ¡Reparte amabilidad!')], ephemeral: true });
        return;
      }
      if (target.bot) {
        await interaction.reply({ embeds: [Embeds.warning('Bots', 'Los bots no necesitan reps — funcionan con electricidad, no con amabilidad.')], ephemeral: true });
        return;
      }
      const now = Date.now();
      const last = repCooldowns.get(repKey(guildId, interaction.user.id)) ?? 0;
      if (now - last < REP_COOLDOWN_MS) {
        const mins = Math.ceil((REP_COOLDOWN_MS - (now - last)) / 60000);
        await interaction.reply({ embeds: [Embeds.warning('Despacio', `Podrás dar rep de nuevo en **${mins} min**.`)], ephemeral: true });
        return;
      }
      repCooldowns.set(repKey(guildId, interaction.user.id), now);
      const total = (repCounts.get(repKey(guildId, target.id)) ?? 0) + 1;
      repCounts.set(repKey(guildId, target.id), total);
      await interaction.reply({ embeds: [Embeds.primary('⭐ +1 Rep!', `<@${interaction.user.id}> le dio una rep a <@${target.id}>!\n¡Ahora tiene **${total}** reps. Sigue así!`)] });
      return;
    }

    if (sub === 'reputacion') {
      const total = repCounts.get(repKey(guildId, target.id)) ?? 0;
      await interaction.reply({ embeds: [Embeds.primary(`⭐ Reps de ${target.username}`, `<@${target.id}> tiene **${total}** reps.`).setThumbnail(target.displayAvatarURL())] });
      return;
    }

    if (sub === 'casarse') {
      if (target.id === interaction.user.id) {
        await interaction.reply({ embeds: [Embeds.warning('¿Soltero para siempre?', 'No puedes casarte contigo mismo. ¡Pero quiérete mucho! 💛')], ephemeral: true });
        return;
      }
      if (target.bot) {
        await interaction.reply({ embeds: [Embeds.warning('Robots', 'Los bots ya están casados con la nube. ☁️')], ephemeral: true });
        return;
      }
      const meKey = repKey(guildId, interaction.user.id);
      const themKey = repKey(guildId, target.id);
      if (marriages.has(meKey) || marriages.has(themKey)) {
        await interaction.reply({ embeds: [Embeds.warning('Ya casados', 'Uno de los dos ya está en un matrimonio juguetón. ¡Primero `/social divorcio`!')], ephemeral: true });
        return;
      }
      if (Math.random() < 0.5) {
        marriages.set(meKey, target.id);
        marriages.set(themKey, interaction.user.id);
        await interaction.reply({ embeds: [Embeds.primary('💍 ¡Dijo que SÍ!', `<@${target.id}> aceptó la propuesta juguetona de <@${interaction.user.id}>! ¡Que vivan muchas aventuras divertidas juntos! 🎉`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.primary('💔 Será la próxima', `<@${target.id}> rechazó con cariño la propuesta juguetona… ¡pero su amistad sigue siendo genial! ¡Sigue brillando, <@${interaction.user.id}>!`)] });
      }
      return;
    }

    if (sub === 'divorcio') {
      const meKey = repKey(guildId, interaction.user.id);
      const partnerId = marriages.get(meKey);
      if (!partnerId) {
        await interaction.reply({ embeds: [Embeds.info('Soltero', 'No estás en un matrimonio juguetón. ¡Alma libre! 🕊️')], ephemeral: true });
        return;
      }
      marriages.delete(meKey);
      marriages.delete(repKey(guildId, partnerId));
      await interaction.reply({ embeds: [Embeds.primary('📄 Divorcio finalizado', `<@${interaction.user.id}> y <@${partnerId}> se separan como buenos amigos. ¡Sin rencores! 💛`)] });
      return;
    }

    if (sub === 'abrazo' || sub === 'caricia' || sub === 'bofetada' || sub === 'choca-cinco') {
      if (target.id === interaction.user.id) {
        await interaction.reply({ embeds: [Embeds.warning('Amor propio', 'Mejor trata a los demás — ¡la amabilidad compartida se multiplica! 💛')], ephemeral: true });
        return;
      }
      const line = sub === 'abrazo' ? pick(HUG_GIFS) : sub === 'caricia' ? pick(PAT_LINES) : sub === 'bofetada' ? pick(SLAP_LINES) : pick(HIGHFIVE_LINES);
      const title = sub === 'abrazo' ? '🤗 ¡Abrazo!' : sub === 'caricia' ? '🐾 ¡Caricia!' : sub === 'bofetada' ? '🐟 ¡Bofetada tonta!' : '🙌 ¡Choca-cinco!';
      await interaction.reply({ embeds: [Embeds.primary(title, `<@${interaction.user.id}> ${line} <@${target.id}>!`)] });
      return;
    }

    if (sub === 'beso') {
      if (target.id === interaction.user.id) {
        await interaction.reply({ embeds: [Embeds.warning('Amor propio', 'Mejor manda besos a tus amigos — ¡el cariño platónico siempre gana! 💛')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary('💋 Beso sano', `<@${interaction.user.id}> ${pick(KISS_EMOTES)} <@${target.id}> — ¡solo platónico y amistoso!`)] });
      return;
    }

    if (sub === 'flechazo') {
      const who = interaction.options.getUser('usuario');
      if (who) {
        crushes.set(repKey(guildId, who.id), interaction.user.id);
        await interaction.reply({ embeds: [Embeds.primary('💘 Flechazo anónimo', `<@${who.id}> ${pick(CRUSH_LINES)}\n*Firmado: un admirador secreto 🤫*`)] });
      } else {
        await interaction.reply({ embeds: [Embeds.primary('💘 Radar de flechazos', `Alguien de este servidor ${pick(CRUSH_LINES)}`)] });
      }
      return;
    }

    if (sub === 'mejor-amigo') {
      if (target.id === interaction.user.id) {
        await interaction.reply({ embeds: [Embeds.warning('Tu mejor amigo', '¡Tú eres tu mejor amigo, y eso es genial! ¡Ahora elige a un colega! 💛')], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary('👯 ¡Mejores amigos!', `<@${interaction.user.id}> declara a <@${target.id}> su MEJOR AMIGO para siempre! ¡Pulseras de amistad para todos! 🌈`)] });
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Subcomando desconocido', 'Ese subcomando no existe.')], ephemeral: true });
  },
};
