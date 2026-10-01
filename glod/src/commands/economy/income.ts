/**
 * Income: /ingresos — 10 subcomandos de ganancia con cooldowns propios.
 * `salary` usa el campo persistente `lastWorkAt`; el resto usa el Map en
 * memoria `incomeCooldowns` (clave guild+user+sub). El balance siempre se
 * persiste en MongoDB con `w.save()` / `addBalance`.
 * @module commands/economy/income
 */
import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { addBalance, fmt, getWallet } from '../../systems/economy.js';
import { Embeds } from '../../utils/embeds.js';

/** Cooldowns en memoria por `guildId:userId:subcomando` (timestamp ms). */
export const incomeCooldowns = new Map<string, number>();

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cdKey(guildId: string, userId: string, sub: string): string {
  return `${guildId}:${userId}:${sub}`;
}

function remainingMs(guildId: string, userId: string, sub: string, cooldownMs: number): number {
  const last = incomeCooldowns.get(cdKey(guildId, userId, sub)) ?? 0;
  const left = last + cooldownMs - Date.now();
  return left > 0 ? left : 0;
}

function touchCd(guildId: string, userId: string, sub: string): void {
  incomeCooldowns.set(cdKey(guildId, userId, sub), Date.now());
}

function formatRemaining(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r > 0 ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

async function requireGuildId(interaction: ChatInputCommandInteraction): Promise<string | null> {
  if (!interaction.guildId) {
    await interaction.reply({
      embeds: [Embeds.error('Sin servidor', 'Este comando solo puede usarse en un servidor.')],
      ephemeral: true,
    });
    return null;
  }
  return interaction.guildId;
}

async function blockedByCd(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  sub: string,
  cooldownMs: number,
): Promise<boolean> {
  const left = remainingMs(guildId, interaction.user.id, sub, cooldownMs);
  if (left > 0) {
    await interaction.reply({
      embeds: [Embeds.warning('En espera', `Vuelve en **${formatRemaining(left)}** para usar esto de nuevo.`)],
      ephemeral: true,
    });
    return true;
  }
  return false;
}

const SIX_HOURS = 6 * 3600_000;

export const income: Command = {
  data: new SlashCommandBuilder()
    .setName('ingresos')
    .setDescription('Gana monedas con trabajos y actividades')
    .addSubcommand((s) => s.setName('mendigar').setDescription('Mendiga unas monedas (30-120, 60s)'))
    .addSubcommand((s) => s.setName('crimen').setDescription('Comete un crimen (0-400, 30% de multa 100, 5min)'))
    .addSubcommand((s) =>
      s
        .setName('robar')
        .setDescription('Roba el 10% de la cartera de otro usuario (máx 500, 40% éxito, 10min)')
        .addUserOption((o) => o.setName('objetivo').setDescription('A quién robar').setRequired(true)),
    )
    .addSubcommand((s) => s.setName('pescar').setDescription('Pesca algo (20-150, 2min)'))
    .addSubcommand((s) => s.setName('cazar').setDescription('Caza algo (20-180, 2min)'))
    .addSubcommand((s) => s.setName('excavar').setDescription('Excava en busca de tesoros (10-120, 90s)'))
    .addSubcommand((s) => s.setName('cultivar').setDescription('Cultiva la granja (50-200, 5min)'))
    .addSubcommand((s) => s.setName('musica').setDescription('Toca música en la calle (20-100, 60s)'))
    .addSubcommand((s) => s.setName('salario').setDescription('Cobra tu salario fijo de 300 (cada 6h)'))
    .addSubcommand((s) => s.setName('bono').setDescription('Bono sorpresa (50-150, cada 10min)')),
  cooldown: 5,
  guildOnly: true,
  async execute(interaction) {
    const guildId = await requireGuildId(interaction);
    if (!guildId) return;
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'mendigar') {
      if (await blockedByCd(interaction, guildId, sub, 60_000)) return;
      const amount = randInt(30, 120);
      const w = await getWallet(guildId, userId);
      w.balance = Math.floor(w.balance) + amount;
      await w.save();
      touchCd(guildId, userId, sub);
      const flavor = pick(['Un alma generosa te dio unas monedas.', 'Alguien se apiadó de ti en la plaza.', 'Encontraste monedas en un sombrero ajeno.']);
      await interaction.reply({ embeds: [Embeds.success('🙏 Mendigar', `${flavor}\nGanaste **${fmt(amount)}**.\nSaldo: **${fmt(Math.floor(w.balance))}**.`)] });
      return;
    }

    if (sub === 'crimen') {
      if (await blockedByCd(interaction, guildId, sub, 300_000)) return;
      const w = await getWallet(guildId, userId);
      w.balance = Math.floor(w.balance);
      if (Math.random() < 0.3) {
        const fine = Math.min(w.balance, 100);
        w.balance -= fine;
        await w.save();
        touchCd(guildId, userId, sub);
        await interaction.reply({ embeds: [Embeds.error('🚨 ¡Atrapado!', `La policía te multó con **${fmt(fine)}**.\nSaldo: **${fmt(Math.floor(w.balance))}**.`)] });
        return;
      }
      const gain = randInt(0, 400);
      w.balance += gain;
      await w.save();
      touchCd(guildId, userId, sub);
      await interaction.reply({
        embeds: [
          gain > 0
            ? Embeds.success('🔪 Crimen exitoso', `El golpe salió bien y conseguiste **${fmt(gain)}**.\nSaldo: **${fmt(Math.floor(w.balance))}**.`)
            : Embeds.warning('🔪 Crimen fallido', `Hiciste mucho ruido y escapaste sin nada.\nSaldo: **${fmt(Math.floor(w.balance))}**.`),
        ],
      });
      return;
    }

    if (sub === 'robar') {
      const target = interaction.options.getUser('objetivo', true);
      if (target.id === userId) {
        await interaction.reply({ embeds: [Embeds.error('Objetivo inválido', 'No puedes robarte a ti mismo.')], ephemeral: true });
        return;
      }
      if (target.bot) {
        await interaction.reply({ embeds: [Embeds.error('Objetivo inválido', 'No puedes robar a un bot.')], ephemeral: true });
        return;
      }
      if (await blockedByCd(interaction, guildId, sub, 600_000)) return;
      const success = Math.random() < 0.4;
      if (success) {
        const victim = await getWallet(guildId, target.id);
        const stolen = Math.min(500, Math.floor(Math.floor(victim.balance) * 0.1));
        if (stolen <= 0) {
          touchCd(guildId, userId, sub);
          await interaction.reply({ embeds: [Embeds.warning('🥷 Robo vacío', `<@${target.id}> no tiene monedas que robar.`)] });
          return;
        }
        victim.balance = Math.floor(victim.balance) - stolen;
        await victim.save();
        const updated = await addBalance(guildId, userId, stolen);
        touchCd(guildId, userId, sub);
        await interaction.reply({ embeds: [Embeds.success('🥷 Robo exitoso', `Le robaste **${fmt(stolen)}** a <@${target.id}>.\nSaldo: **${fmt(Math.floor(updated.balance))}**.`)] });
        return;
      }
      const stealer = await getWallet(guildId, userId);
      stealer.balance = Math.floor(stealer.balance);
      const fine = Math.min(stealer.balance, 75);
      stealer.balance -= fine;
      await stealer.save();
      touchCd(guildId, userId, sub);
      await interaction.reply({ embeds: [Embeds.error('🚨 Robo fallido', `<@${target.id}> te descubrió y pagaste **${fmt(fine)}** de multa.\nSaldo: **${fmt(Math.floor(stealer.balance))}**.`)] });
      return;
    }

    if (sub === 'pescar') {
      if (await blockedByCd(interaction, guildId, sub, 120_000)) return;
      const w = await getWallet(guildId, userId);
      const catches = ['🐟 Pez común', '🐠 Pez tropical', '🐡 Pez globo', '🦈 Tiburón', '👢 Bota vieja'] as const;
      const caught = pick(catches);
      const amount = caught === '👢 Bota vieja' ? randInt(5, 15) : randInt(20, 150);
      w.balance = Math.floor(w.balance) + amount;
      await w.save();
      touchCd(guildId, userId, sub);
      await interaction.reply({ embeds: [Embeds.success('🎣 Pesca', `Atrapaste: **${caught}** y lo vendiste por **${fmt(amount)}**.\nSaldo: **${fmt(Math.floor(w.balance))}**.`)] });
      return;
    }

    if (sub === 'cazar') {
      if (await blockedByCd(interaction, guildId, sub, 120_000)) return;
      const w = await getWallet(guildId, userId);
      const prey = ['🐇 Conejo', '🐗 Jabalí', '🦌 Ciervo', '🐻 Oso'] as const;
      const caught = pick(prey);
      const amount = caught === '🐻 Oso' ? randInt(100, 180) : randInt(20, 180);
      w.balance = Math.floor(w.balance) + amount;
      await w.save();
      touchCd(guildId, userId, sub);
      await interaction.reply({ embeds: [Embeds.success('🏹 Caza', `Cazaste un **${caught}** y ganaste **${fmt(amount)}**.\nSaldo: **${fmt(Math.floor(w.balance))}**.`)] });
      return;
    }

    if (sub === 'excavar') {
      if (await blockedByCd(interaction, guildId, sub, 90_000)) return;
      const w = await getWallet(guildId, userId);
      const finds = ['🪙 Monedas enterradas', '🦴 Hueso viejo', '🏺 Vasija antigua', '💎 Gema brillante'] as const;
      const found = pick(finds);
      let amount = randInt(10, 120);
      if (found === '💎 Gema brillante') amount += 50;
      w.balance = Math.floor(w.balance) + amount;
      await w.save();
      touchCd(guildId, userId, sub);
      await interaction.reply({ embeds: [Embeds.success('⛏️ Excavación', `Encontraste **${found}** por valor de **${fmt(amount)}**.\nSaldo: **${fmt(Math.floor(w.balance))}**.`)] });
      return;
    }

    if (sub === 'cultivar') {
      if (await blockedByCd(interaction, guildId, sub, 300_000)) return;
      const w = await getWallet(guildId, userId);
      const crops = ['🌾 Trigo', '🎃 Calabaza', '🍎 Manzanas', '🥕 Zanahorias'] as const;
      const crop = pick(crops);
      const amount = randInt(50, 200);
      w.balance = Math.floor(w.balance) + amount;
      await w.save();
      touchCd(guildId, userId, sub);
      await interaction.reply({ embeds: [Embeds.success('🚜 Granja', `Cosechaste **${crop}** y ganaste **${fmt(amount)}**.\nSaldo: **${fmt(Math.floor(w.balance))}**.`)] });
      return;
    }

    if (sub === 'musica') {
      if (await blockedByCd(interaction, guildId, sub, 60_000)) return;
      const w = await getWallet(guildId, userId);
      const instruments = ['🎸 Guitarra', '🎻 Violín', '🎺 Trompeta', '🪗 Acordeón', '🥁 Batería'] as const;
      const instrument = pick(instruments);
      const amount = randInt(20, 100);
      w.balance = Math.floor(w.balance) + amount;
      await w.save();
      touchCd(guildId, userId, sub);
      await interaction.reply({ embeds: [Embeds.success('🎶 Música callejera', `Tocaste la **${instrument}** y el público te dio **${fmt(amount)}**.\nSaldo: **${fmt(Math.floor(w.balance))}**.`)] });
      return;
    }

    if (sub === 'salario') {
      const w = await getWallet(guildId, userId);
      const now = Date.now();
      const last = w.lastWorkAt ? new Date(w.lastWorkAt).getTime() : 0;
      if (last > 0 && now - last < SIX_HOURS) {
        await interaction.reply({
          embeds: [Embeds.warning('💼 Sin nómina', `Cobra tu próximo salario en **${formatRemaining(last + SIX_HOURS - now)}**.`)],
          ephemeral: true,
        });
        return;
      }
      const amount = 300;
      w.balance = Math.floor(w.balance) + amount;
      w.lastWorkAt = new Date();
      await w.save();
      await interaction.reply({ embeds: [Embeds.success('💼 Salario', `Cobraste tu salario de **${fmt(amount)}**.\nSaldo: **${fmt(Math.floor(w.balance))}**.`)] });
      return;
    }

    if (sub === 'bono') {
      if (await blockedByCd(interaction, guildId, sub, 600_000)) return;
      const w = await getWallet(guildId, userId);
      const amount = randInt(50, 150);
      w.balance = Math.floor(w.balance) + amount;
      await w.save();
      touchCd(guildId, userId, sub);
      await interaction.reply({ embeds: [Embeds.success('🎁 Bono', `Bono sorpresa de **${fmt(amount)}**.\nSaldo: **${fmt(Math.floor(w.balance))}**.`)] });
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Desconocido', `Subcomando desconocido: \`${sub}\`.`)], ephemeral: true });
  },
};
