/**
 * Casino: /casino — 13 subcomandos de juego con dinero real de la cartera.
 * Todas las apuestas se descuentan del balance y los premios se acreditan
 * con `w.save()`. Cantidades siempre enteras, mensajes con `fmt()`.
 * @module commands/economy/casino
 */
import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { addBalance, fmt, getWallet } from '../../systems/economy.js';
import { Embeds } from '../../utils/embeds.js';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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

function readBet(interaction: ChatInputCommandInteraction): number {
  return Math.floor(interaction.options.getInteger('apuesta') ?? 0);
}

async function invalidBet(
  interaction: ChatInputCommandInteraction,
  bet: number,
  min: number,
  max: number,
): Promise<boolean> {
  if (!Number.isFinite(bet) || bet < min || bet > max) {
    await interaction.reply({
      embeds: [Embeds.error('Apuesta inválida', `La apuesta debe estar entre **${fmt(min)}** y **${fmt(max)}**.`)],
      ephemeral: true,
    });
    return true;
  }
  return false;
}

/** Carga el wallet y descuenta la apuesta. Devuelve null si no hay fondos (ya responde). */
async function chargeBet(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  bet: number,
): Promise<{ userId: string; w: any } | null> {
  const w = await getWallet(guildId, interaction.user.id);
  w.balance = Math.floor(w.balance);
  if (w.balance < bet) {
    await interaction.reply({
      embeds: [Embeds.error('Fondos insuficientes', `Tu saldo: **${fmt(w.balance)}**. Apuesta: **${fmt(bet)}**.`)],
      ephemeral: true,
    });
    return null;
  }
  w.balance -= bet;
  return { userId: interaction.user.id, w };
}

async function settle(
  interaction: ChatInputCommandInteraction,
  title: string,
  lines: string[],
  w: any,
  prize: number,
  won: boolean,
): Promise<void> {
  w.balance = Math.floor(w.balance) + Math.floor(prize);
  await w.save();
  const desc = `${lines.join('\n')}\nSaldo: **${fmt(Math.floor(w.balance))}**.`;
  await interaction.reply({
    embeds: [won ? Embeds.success(title, desc) : Embeds.error(title, desc)],
  });
}

// ── Blackjack helpers ──
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const SUITS = ['♠️', '♥️', '♦️', '♣️'] as const;

interface BjCard {
  rank: string;
  suit: string;
  value: number;
}

function drawBjCard(): BjCard {
  const rank = pick(RANKS);
  const suit = pick(SUITS);
  const value = rank === 'A' ? 11 : rank === 'J' || rank === 'Q' || rank === 'K' ? 10 : parseInt(rank, 10);
  return { rank, suit, value };
}

function bjValue(hand: BjCard[]): number {
  let total = hand.reduce((s, c) => s + c.value, 0);
  let aces = hand.filter((c) => c.rank === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function bjPlay(): BjCard[] {
  const hand: BjCard[] = [drawBjCard(), drawBjCard()];
  while (bjValue(hand) < 17) hand.push(drawBjCard());
  return hand;
}

function bjLabel(hand: BjCard[]): string {
  return hand.map((c) => `${c.rank}${c.suit}`).join(' ');
}

// ── Roulette helpers ──
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const RED_EMOJI = '🔴';
const BLACK_EMOJI = '⚫';
const GREEN_EMOJI = '🟢';

function rouletteColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return REDS.has(n) ? 'red' : 'black';
}

function colorEmoji(color: 'red' | 'black' | 'green'): string {
  return color === 'red' ? RED_EMOJI : color === 'black' ? BLACK_EMOJI : GREEN_EMOJI;
}

function cardName(v: number): string {
  if (v === 1) return 'A';
  if (v === 11) return 'J';
  if (v === 12) return 'Q';
  if (v === 13) return 'K';
  return String(v);
}

export const casino: Command = {
  data: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Juegos de casino con dinero real de la cartera')
    .addSubcommand((s) =>
      s
        .setName('tragaperras')
        .setDescription('Tragaperras: 3 símbolos (x2 / x5 / x10)')
        .addIntegerOption((o) => o.setName('apuesta').setDescription('Apuesta').setRequired(true).setMinValue(10).setMaxValue(10000)),
    )
    .addSubcommand((s) =>
      s
        .setName('blackjack')
        .setDescription('Blackjack simplificado contra el crupier (x2)')
        .addIntegerOption((o) => o.setName('apuesta').setDescription('Apuesta').setRequired(true).setMinValue(1)),
    )
    .addSubcommand((s) =>
      s
        .setName('ruleta')
        .setDescription('Ruleta: rojo/negro (x2), verde (x14) o número (x35)')
        .addIntegerOption((o) => o.setName('apuesta').setDescription('Apuesta').setRequired(true).setMinValue(1))
        .addStringOption((o) =>
          o
            .setName('eleccion')
            .setDescription('Apuesta a color o número')
            .setRequired(true)
            .addChoices(
              { name: 'Rojo', value: 'red' },
              { name: 'Negro', value: 'black' },
              { name: 'Verde (0)', value: 'green' },
              { name: 'Número exacto', value: 'number' },
            ),
        )
        .addIntegerOption((o) => o.setName('numero').setDescription('Número 0-36 (solo con Número exacto)').setMinValue(0).setMaxValue(36)),
    )
    .addSubcommand((s) =>
      s
        .setName('moneda')
        .setDescription('Cara o cruz (x2)')
        .addIntegerOption((o) => o.setName('apuesta').setDescription('Apuesta').setRequired(true).setMinValue(1))
        .addStringOption((o) =>
          o
            .setName('eleccion')
            .setDescription('Tu elección')
            .setRequired(true)
            .addChoices({ name: 'Cara', value: 'heads' }, { name: 'Cruz', value: 'tails' }),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('dado')
        .setDescription('Adivina el dado 1-6 (x6)')
        .addIntegerOption((o) => o.setName('apuesta').setDescription('Apuesta').setRequired(true).setMinValue(1))
        .addIntegerOption((o) => o.setName('eleccion').setDescription('Número 1-6').setRequired(true).setMinValue(1).setMaxValue(6)),
    )
    .addSubcommand((s) =>
      s
        .setName('carta-alta')
        .setDescription('Tu carta vs la del crupier, la más alta gana (x2)')
        .addIntegerOption((o) => o.setName('apuesta').setDescription('Apuesta').setRequired(true).setMinValue(1)),
    )
    .addSubcommand((s) => s.setName('loteria').setDescription('Lotería: cuesta 100, 1/50 de probabilidad de x20'))
    .addSubcommand((s) => s.setName('apostar-todo').setDescription('Apuesta TODO tu saldo con 45% de probabilidad de x2'))
    .addSubcommand((s) => s.setName('jackpot').setDescription('Jackpot: cuesta 500, 1/100 de probabilidad de x50'))
    .addSubcommand((s) =>
      s
        .setName('rasca')
        .setDescription('Rasca y gana: 3 símbolos (pareja x2, trío x10)')
        .addIntegerOption((o) => o.setName('apuesta').setDescription('Apuesta').setRequired(true).setMinValue(1)),
    )
    .addSubcommand((s) =>
      s
        .setName('doble-o-nada')
        .setDescription('50/50: duplica tu apuesta o piérdela (x2)')
        .addIntegerOption((o) => o.setName('apuesta').setDescription('Apuesta').setRequired(true).setMinValue(1)),
    )
    .addSubcommand((s) =>
      s
        .setName('piedra-papel-tijera')
        .setDescription('Piedra, papel o tijera contra el crupier (x2, empate devuelve)')
        .addIntegerOption((o) => o.setName('apuesta').setDescription('Apuesta').setRequired(true).setMinValue(1))
        .addStringOption((o) =>
          o
            .setName('eleccion')
            .setDescription('Tu jugada')
            .setRequired(true)
            .addChoices(
              { name: 'Piedra', value: 'rock' },
              { name: 'Papel', value: 'paper' },
              { name: 'Tijera', value: 'scissors' },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('rueda')
        .setDescription('Rueda de la fortuna: multiplicadores x0/x1/x2/x3/x5')
        .addIntegerOption((o) => o.setName('apuesta').setDescription('Apuesta').setRequired(true).setMinValue(1)),
    ),
  cooldown: 8,
  guildOnly: true,
  async execute(interaction) {
    const guildId = await requireGuildId(interaction);
    if (!guildId) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'tragaperras') {
      const bet = readBet(interaction);
      if (await invalidBet(interaction, bet, 10, 10000)) return;
      const ctx = await chargeBet(interaction, guildId, bet);
      if (!ctx) return;
      const emojis = ['🍒', '⭐', '💎', '🍀', '🔔', '7️⃣'] as const;
      const reels = [pick(emojis), pick(emojis), pick(emojis)];
      let mult = 0;
      if (reels[0] === reels[1] && reels[1] === reels[2]) mult = reels[0] === '7️⃣' ? 10 : 5;
      else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) mult = 2;
      const prize = bet * mult;
      await settle(interaction, '🎰 Slots', [`${reels.join(' | ')}`, `Apuesta: **${fmt(bet)}**`, mult > 0 ? `Premio: **${fmt(prize)}** (x${mult})` : 'Sin premio. ¡Suerte la próxima!'], ctx.w, prize, mult > 0);
      return;
    }

    if (sub === 'blackjack') {
      const bet = readBet(interaction);
      if (await invalidBet(interaction, bet, 1, 1000000)) return;
      const ctx = await chargeBet(interaction, guildId, bet);
      if (!ctx) return;
      const player = bjPlay();
      const dealer = bjPlay();
      const pv = bjValue(player);
      const dv = bjValue(dealer);
      const playerNatural = player.length === 2 && pv === 21;
      const dealerNatural = dealer.length === 2 && dv === 21;
      let prize = 0;
      let title = '🃏 Blackjack';
      if (playerNatural && !dealerNatural) {
        prize = Math.floor((bet * 5) / 2);
        title = '🃏 ¡Blackjack natural!';
      } else if (pv > 21 && dv > 21) {
        prize = bet;
        title = '🃏 Empate (ambos se pasan)';
      } else if (pv > 21) {
        prize = 0;
      } else if (dv > 21 || pv > dv) {
        prize = bet * 2;
      } else if (pv === dv) {
        prize = bet;
        title = '🃏 Empate (push)';
      } else {
        prize = 0;
      }
      const won = prize > bet;
      const push = prize === bet;
      await settle(
        interaction,
        title,
        [
          `Tú: **${bjLabel(player)}** = **${pv}**`,
          `Crupier: **${bjLabel(dealer)}** = **${dv}**`,
          `Apuesta: **${fmt(bet)}**`,
          prize > 0 ? (push ? `Devolución: **${fmt(prize)}**` : `Premio: **${fmt(prize)}**`) : 'La banca gana.',
        ],
        ctx.w,
        prize,
        won || push,
      );
      return;
    }

    if (sub === 'ruleta') {
      const bet = readBet(interaction);
      if (await invalidBet(interaction, bet, 1, 1000000)) return;
      const choice = interaction.options.getString('eleccion', true);
      const picked = interaction.options.getInteger('numero');
      if (choice === 'number' && (picked === null || picked < 0 || picked > 36)) {
        await interaction.reply({
          embeds: [Embeds.error('Falta número', 'Debes indicar `numero` (0-36) cuando eliges **Número exacto**.')],
          ephemeral: true,
        });
        return;
      }
      const ctx = await chargeBet(interaction, guildId, bet);
      if (!ctx) return;
      const result = randInt(0, 36);
      const color = rouletteColor(result);
      let mult = 0;
      if (choice === 'red' || choice === 'black') mult = color === choice ? 2 : 0;
      else if (choice === 'green') mult = result === 0 ? 14 : 0;
      else mult = picked === result ? 35 : 0;
      const prize = bet * mult;
      await settle(
        interaction,
        '🎡 Ruleta',
        [
          `Bola: **${result}** ${colorEmoji(color)}`,
          `Tu apuesta: **${choice === 'number' ? `número ${picked}` : choice}** — **${fmt(bet)}**`,
          mult > 0 ? `Premio: **${fmt(prize)}** (x${mult})` : 'Sin premio.',
        ],
        ctx.w,
        prize,
        mult > 0,
      );
      return;
    }

    if (sub === 'moneda') {
      const bet = readBet(interaction);
      if (await invalidBet(interaction, bet, 1, 1000000)) return;
      const choice = interaction.options.getString('eleccion', true);
      const ctx = await chargeBet(interaction, guildId, bet);
      if (!ctx) return;
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = result === choice;
      const prize = won ? bet * 2 : 0;
      const label = (v: string): string => (v === 'heads' ? 'Cara 🪙' : 'Cruz ❌');
      await settle(interaction, '🪙 Cara o cruz', [`Salió: **${label(result)}**`, `Elegiste: **${label(choice)}** — **${fmt(bet)}**`, won ? `Premio: **${fmt(prize)}** (x2)` : 'Perdiste la apuesta.'], ctx.w, prize, won);
      return;
    }

    if (sub === 'dado') {
      const bet = readBet(interaction);
      if (await invalidBet(interaction, bet, 1, 1000000)) return;
      const choice = interaction.options.getInteger('eleccion', true);
      const ctx = await chargeBet(interaction, guildId, bet);
      if (!ctx) return;
      const roll = randInt(1, 6);
      const won = roll === choice;
      const prize = won ? bet * 6 : 0;
      await settle(interaction, '🎲 Dado', [`Dado: **${roll}**`, `Elegiste: **${choice}** — **${fmt(bet)}**`, won ? `Premio: **${fmt(prize)}** (x6)` : 'Fallaste.'], ctx.w, prize, won);
      return;
    }

    if (sub === 'carta-alta') {
      const bet = readBet(interaction);
      if (await invalidBet(interaction, bet, 1, 1000000)) return;
      const ctx = await chargeBet(interaction, guildId, bet);
      if (!ctx) return;
      const player = randInt(1, 13);
      const dealer = randInt(1, 13);
      let prize = 0;
      let title = '🂡 Carta alta';
      if (player > dealer) {
        prize = bet * 2;
        title = '🂡 ¡Ganaste!';
      } else if (player === dealer) {
        prize = bet;
        title = '🂡 Empate (devolución)';
      }
      await settle(
        interaction,
        title,
        [`Tú: **${cardName(player)}** vs Crupier: **${cardName(dealer)}**`, `Apuesta: **${fmt(bet)}**`, prize > bet ? `Premio: **${fmt(prize)}** (x2)` : prize === bet ? `Devolución: **${fmt(prize)}**` : 'Tu carta fue más baja.'],
        ctx.w,
        prize,
        prize >= bet,
      );
      return;
    }

    if (sub === 'loteria') {
      const cost = 100;
      const ctx = await chargeBet(interaction, guildId, cost);
      if (!ctx) return;
      const lucky = randInt(1, 50);
      const won = lucky === 7;
      const prize = won ? cost * 20 : 0;
      await settle(interaction, won ? '🎟️ ¡Lotería ganada!' : '🎟️ Lotería', [`Boleto: **${fmt(cost)}**`, `Número: **${lucky}/50** (gana el 7)`, won ? `Premio: **${fmt(prize)}** (x20)` : 'No hubo suerte esta vez.'], ctx.w, prize, won);
      return;
    }

    if (sub === 'apostar-todo') {
      const w = await getWallet(guildId, interaction.user.id);
      const all = Math.floor(w.balance);
      if (all <= 0) {
        await interaction.reply({ embeds: [Embeds.error('Sin fondos', 'No tienes monedas para apostar.')], ephemeral: true });
        return;
      }
      const won = Math.random() < 0.45;
      const updated = won ? await addBalance(guildId, interaction.user.id, all) : await addBalance(guildId, interaction.user.id, -all);
      const balance = Math.floor(updated.balance);
      await interaction.reply({
        embeds: [
          won
            ? Embeds.success('🎲 ¡All-in ganado!', `Apostaste **${fmt(all)}** y duplicaste.\nSaldo: **${fmt(balance)}**.`)
            : Embeds.error('🎲 All-in perdido', `Apostaste **${fmt(all)}** y lo perdiste todo.\nSaldo: **${fmt(balance)}**.`),
        ],
      });
      return;
    }

    if (sub === 'jackpot') {
      const cost = 500;
      const ctx = await chargeBet(interaction, guildId, cost);
      if (!ctx) return;
      const ticket = randInt(1, 100);
      const won = ticket === 77;
      const prize = won ? cost * 50 : 0;
      await settle(interaction, won ? '💰 ¡JACKPOT!' : '💰 Jackpot', [`Boleto: **${fmt(cost)}**`, `Número: **${ticket}/100** (gana el 77)`, won ? `Premio: **${fmt(prize)}** (x50)` : 'Sin jackpot esta vez.'], ctx.w, prize, won);
      return;
    }

    if (sub === 'rasca') {
      const bet = readBet(interaction);
      if (await invalidBet(interaction, bet, 1, 1000000)) return;
      const ctx = await chargeBet(interaction, guildId, bet);
      if (!ctx) return;
      const syms = ['🍒', '⭐', '💎'] as const;
      const cells = [pick(syms), pick(syms), pick(syms)];
      let mult = 0;
      if (cells[0] === cells[1] && cells[1] === cells[2]) mult = 10;
      else if (cells[0] === cells[1] || cells[1] === cells[2] || cells[0] === cells[2]) mult = 2;
      const prize = bet * mult;
      await settle(interaction, '🧾 Rasca y gana', [`${cells.join(' | ')}`, `Apuesta: **${fmt(bet)}**`, mult > 0 ? `Premio: **${fmt(prize)}** (x${mult})` : 'Sin premio.'], ctx.w, prize, mult > 0);
      return;
    }

    if (sub === 'doble-o-nada') {
      const bet = readBet(interaction);
      if (await invalidBet(interaction, bet, 1, 1000000)) return;
      const ctx = await chargeBet(interaction, guildId, bet);
      if (!ctx) return;
      const won = Math.random() < 0.5;
      const prize = won ? bet * 2 : 0;
      await settle(interaction, won ? '⚖️ ¡Duplicado!' : '⚖️ Doble o nada', [`Apuesta: **${fmt(bet)}**`, won ? `Premio: **${fmt(prize)}** (x2)` : 'Lo perdiste todo en esta ronda.'], ctx.w, prize, won);
      return;
    }

    if (sub === 'piedra-papel-tijera') {
      const bet = readBet(interaction);
      if (await invalidBet(interaction, bet, 1, 1000000)) return;
      const choice = interaction.options.getString('eleccion', true);
      const ctx = await chargeBet(interaction, guildId, bet);
      if (!ctx) return;
      const moves = ['rock', 'paper', 'scissors'] as const;
      const bot = pick(moves);
      const emoji = (m: string): string => (m === 'rock' ? '🪨' : m === 'paper' ? '📄' : '✂️');
      const beats: Record<string, string> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
      let prize = 0;
      let title = '✂️ Piedra, papel o tijera';
      if (bot === choice) {
        prize = bet;
        title = '✂️ Empate (devolución)';
      } else if (beats[choice] === bot) {
        prize = bet * 2;
        title = '✂️ ¡Ganaste!';
      }
      await settle(
        interaction,
        title,
        [`Tú: **${emoji(choice)}** vs Crupier: **${emoji(bot)}**`, `Apuesta: **${fmt(bet)}**`, prize > bet ? `Premio: **${fmt(prize)}** (x2)` : prize === bet ? `Devolución: **${fmt(prize)}**` : 'El crupier te ganó.'],
        ctx.w,
        prize,
        prize >= bet,
      );
      return;
    }

    if (sub === 'rueda') {
      const bet = readBet(interaction);
      if (await invalidBet(interaction, bet, 1, 1000000)) return;
      const ctx = await chargeBet(interaction, guildId, bet);
      if (!ctx) return;
      const segments = [
        { mult: 0, weight: 30, label: '💀 x0' },
        { mult: 1, weight: 30, label: '😐 x1 (devolución)' },
        { mult: 2, weight: 25, label: '🙂 x2' },
        { mult: 3, weight: 10, label: '😄 x3' },
        { mult: 5, weight: 5, label: '🤩 x5' },
      ] as const;
      const totalWeight = segments.reduce((s, g) => s + g.weight, 0);
      let roll = Math.random() * totalWeight;
      let landed: { mult: number; weight: number; label: string } = segments[0] as unknown as { mult: number; weight: number; label: string };
      for (const seg of segments) {
        roll -= seg.weight;
        if (roll <= 0) {
          landed = seg;
          break;
        }
      }
      const prize = bet * landed.mult;
      await settle(
        interaction,
        '🎡 Rueda de la fortuna',
        [`La rueda cayó en: **${landed.label}**`, `Apuesta: **${fmt(bet)}**`, landed.mult > 1 ? `Premio: **${fmt(prize)}** (x${landed.mult})` : landed.mult === 1 ? `Devolución: **${fmt(prize)}**` : 'Sin premio.'],
        ctx.w,
        prize,
        landed.mult >= 1,
      );
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Desconocido', `Subcomando desconocido: \`${sub}\`.`)], ephemeral: true });
  },
};
