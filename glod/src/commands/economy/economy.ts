/**
 * Economy: /saldo /diario /trabajar /tienda /comprar /inventario /transferir
 */
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { EconomyUser, ShopItem } from '../../database/models/entities.js';
import { addBalance, fmt, getWallet } from '../../systems/economy.js';
import { Embeds } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';
import { config } from '../../config.js';

const DAY = 24 * 3600_000;
const WORK_CD = 3600_000;

export const balance: Command = {
  data: new SlashCommandBuilder().setName('saldo').setDescription('Ver tu saldo').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
  cooldown: 3,
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') ?? interaction.user;
    const w = await getWallet(interaction.guildId!, user.id);
    await interaction.reply({
      embeds: [Embeds.primary(`💰 Saldo de ${user.username}`, `Cartera: **${fmt(w.balance)}**\nObjetos en inventario: **${w.inventory.length}**`).setThumbnail(user.displayAvatarURL())],
    });
  },
};

export const daily: Command = {
  data: new SlashCommandBuilder().setName('diario').setDescription('Reclamar recompensa diaria'),
  cooldown: 5,
  async execute(interaction) {
    const settings = await getGuildSettings(interaction.guildId!).catch(() => null);
    const locale = settings?.locale ?? config.defaultLocale;
    const w = await getWallet(interaction.guildId!, interaction.user.id);
    const now = Date.now();
    if (w.lastDailyAt && now - w.lastDailyAt.getTime() < DAY) {
      const remaining = new Date(w.lastDailyAt.getTime() + DAY - now).toISOString().slice(11, 19);
      await interaction.reply({ embeds: [Embeds.warning('Ya reclamado', t('economy.daily.already', locale, { remaining }))], ephemeral: true });
      return;
    }
    const amount = 200 + Math.floor(Math.random() * 300);
    w.balance += amount;
    w.lastDailyAt = new Date();
    await w.save();
    await interaction.reply({ embeds: [Embeds.success('Recompensa diaria', t('economy.daily.claimed', locale, { amount: fmt(amount) }))] });
  },
};

export const work: Command = {
  data: new SlashCommandBuilder().setName('trabajar').setDescription('Trabajar por monedas (1h de espera)'),
  cooldown: 5,
  async execute(interaction) {
    const w = await getWallet(interaction.guildId!, interaction.user.id);
    const now = Date.now();
    if (w.lastWorkAt && now - w.lastWorkAt.getTime() < WORK_CD) {
      const mins = Math.ceil((WORK_CD - (now - w.lastWorkAt.getTime())) / 60000);
      await interaction.reply({ embeds: [Embeds.warning('Cansado', `Descansa **${mins}m** antes de trabajar de nuevo.`)], ephemeral: true });
      return;
    }
    const jobs = ['programador', 'diseñador', 'cocinero', 'conductor', 'profesor', 'streamer'];
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const amount = 80 + Math.floor(Math.random() * 220);
    w.balance += amount;
    w.lastWorkAt = new Date();
    await w.save();
    await interaction.reply({ embeds: [Embeds.success('Turno completado', `Trabajaste como **${job}** y ganaste **${fmt(amount)}**.`)] });
  },
};

export const shop: Command = {
  data: new SlashCommandBuilder().setName('tienda').setDescription('Ver la tienda'),
  cooldown: 5,
  async execute(interaction) {
    const items = await ShopItem.find({ guildId: interaction.guildId! }).limit(20);
    if (!items.length) {
      await interaction.reply({ embeds: [Embeds.info('Tienda vacía', 'El personal puede añadir artículos con `/tienda-agregar`.')] });
      return;
    }
    const desc = items.map((i) => `**${i.name}** — ${fmt(i.price)}\n*${i.description}*`).join('\n\n');
    await interaction.reply({ embeds: [Embeds.primary('🛒 Tienda', desc)] });
  },
};

export const shopAdd: Command = {
  data: new SlashCommandBuilder()
    .setName('tienda-agregar')
    .setDescription('Añadir un artículo a la tienda (admin)')
    .addStringOption((o) => o.setName('nombre').setDescription('Nombre').setRequired(true))
    .addIntegerOption((o) => o.setName('precio').setDescription('Precio').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('descripcion').setDescription('Descripción'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const name = interaction.options.getString('nombre', true);
    const price = interaction.options.getInteger('precio', true);
    const description = interaction.options.getString('descripcion') ?? '';
    await ShopItem.findOneAndUpdate({ guildId: interaction.guildId!, name }, { price, description }, { upsert: true });
    await interaction.reply({ embeds: [Embeds.success('Artículo añadido', `**${name}** por **${fmt(price)}**.`)] });
  },
};

export const buy: Command = {
  data: new SlashCommandBuilder().setName('comprar').setDescription('Comprar un artículo de la tienda').addStringOption((o) => o.setName('articulo').setDescription('Nombre del artículo').setRequired(true)),
  cooldown: 5,
  async execute(interaction) {
    const name = interaction.options.getString('articulo', true);
    const item = await ShopItem.findOne({ guildId: interaction.guildId!, name });
    if (!item) {
      await interaction.reply({ embeds: [Embeds.error('No encontrado', `No hay ningún artículo llamado **${name}**.`)], ephemeral: true });
      return;
    }
    const w = await getWallet(interaction.guildId!, interaction.user.id);
    if (w.balance < item.price) {
      await interaction.reply({ embeds: [Embeds.error('Fondos insuficientes', `Necesitas **${fmt(item.price)}**.`)], ephemeral: true });
      return;
    }
    w.balance -= item.price;
    w.inventory.push(item.name);
    await w.save();
    await interaction.reply({ embeds: [Embeds.success('Compra realizada', `Compraste **${item.name}** por **${fmt(item.price)}**.`)] });
  },
};

export const inventory: Command = {
  data: new SlashCommandBuilder().setName('inventario').setDescription('Ver inventario').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
  cooldown: 3,
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') ?? interaction.user;
    const w = await getWallet(interaction.guildId!, user.id);
    const desc = w.inventory.length ? w.inventory.map((i, n) => `${n + 1}. **${i}**`).join('\n') : '*Vacío*';
    await interaction.reply({ embeds: [Embeds.primary(`🎒 Inventario de ${user.username}`, desc)] });
  },
};

export const transfer: Command = {
  data: new SlashCommandBuilder()
    .setName('transferir')
    .setDescription('Enviar monedas a otro usuario')
    .addUserOption((o) => o.setName('usuario').setDescription('Destinatario').setRequired(true))
    .addIntegerOption((o) => o.setName('cantidad').setDescription('Cantidad').setRequired(true).setMinValue(1)),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('usuario', true);
    const amount = interaction.options.getInteger('cantidad', true);
    if (target.id === interaction.user.id || target.bot) {
      await interaction.reply({ embeds: [Embeds.error('Destinatario inválido', 'Elige otro usuario humano.')], ephemeral: true });
      return;
    }
    const from = await getWallet(interaction.guildId!, interaction.user.id);
    if (from.balance < amount) {
      await interaction.reply({ embeds: [Embeds.error('Fondos insuficientes', `Saldo: **${fmt(from.balance)}**.`)], ephemeral: true });
      return;
    }
    from.balance -= amount;
    await from.save();
    await addBalance(interaction.guildId!, target.id, amount);
    await interaction.reply({ embeds: [Embeds.success('Transferencia realizada', `<@${interaction.user.id}> → <@${target.id}>: **${fmt(amount)}**.`)] });
  },
};

export const __reexport = EconomyUser;
