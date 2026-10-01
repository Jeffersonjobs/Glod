/**
 * Dashboard-ready REST API (Express). Bearer-token auth.
 * Expone ajustes, analíticas, canales/roles, anuncios y todas las colecciones.
 * El dashboard `glod-dashboard/` consume estos endpoints vía proxy.
 * @module api/server
 */
import express from 'express';
import { ChannelType, EmbedBuilder } from 'discord.js';
import type { GlodClient } from '../client.js';
import { config } from '../config.js';
import { getGuildSettings } from '../database/models/GuildSettings.js';
import { Warning } from '../database/models/Warning.js';
import { EconomyUser, Giveaway, Level, Suggestion, Ticket } from '../database/models/entities.js';
import { logger } from '../utils/logger.js';

const GOLD = 0xd4af37;

function guildJson(guild: NonNullable<GlodClient['guilds']['cache'] extends Map<string, infer T> ? T : never>): Record<string, unknown> {
  const g = guild as unknown as {
    id: string;
    name: string;
    memberCount?: number;
    preferredLocale?: string;
    premiumSubscriptionCount?: number;
    premiumTier?: number;
    iconURL?: (o?: unknown) => string | null;
  };
  return {
    id: g.id,
    name: g.name,
    memberCount: g.memberCount ?? 0,
    locale: g.preferredLocale ?? 'es',
    boosts: g.premiumSubscriptionCount ?? 0,
    boostTier: g.premiumTier ?? 0,
    icon: typeof g.iconURL === 'function' ? g.iconURL({ size: 128 }) : null,
  };
}

export function startApi(client: GlodClient): void {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  // CORS libre para el panel local (el token Bearer sigue protegiendo).
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use((req, res, next) => {
    if (req.path === '/health') return next();
    if (req.headers.authorization !== `Bearer ${config.api.token}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      bot: client.user ? { id: client.user.id, tag: client.user.tag } : null,
      guilds: client.guilds.cache.size,
      users: client.guilds.cache.reduce((n, g) => n + (g.memberCount ?? 0), 0),
      uptime: Date.now() - client.startTime,
      commands: client.commands.size,
    });
  });

  // ── Servidores ──
  app.get('/api/guilds', (_req, res) => {
    res.json(
      client.guilds.cache.map((g) => ({
        ...(guildJson(g as never) as object),
        channels: g.channels.cache.filter((c) => c.type === ChannelType.GuildText).size,
        roles: g.roles.cache.size,
      })),
    );
  });

  app.get('/api/guilds/:id', (req, res) => {
    const g = client.guilds.cache.get(req.params.id);
    if (!g) {
      res.status(404).json({ error: 'Guild not found (¿el bot está dentro?)' });
      return;
    }
    const channels = g.channels.cache
      .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      .map((c) => ({ id: c.id, name: (c as { name?: string }).name ?? c.id, type: c.type }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const voice = g.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const roles = g.roles.cache
      .map((r) => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position, members: undefined as unknown }))
      .sort((a, b) => b.position - a.position)
      .slice(0, 100);
    res.json({
      ...(guildJson(g as never) as object),
      channels,
      voiceChannels: voice,
      roles,
      channelsCount: g.channels.cache.size,
      rolesCount: g.roles.cache.size,
    });
  });

  // ── Analíticas ──
  app.get('/api/guilds/:id/stats', async (req, res) => {
    try {
      const gid = req.params.id;
      const guild = client.guilds.cache.get(gid);
      const [levels, economy, tickets, warnings, giveaways, suggestions] = await Promise.all([
        Level.find({ guildId: gid }).then((r) => r as Level[]).catch(() => [] as Level[]),
        EconomyUser.find({ guildId: gid }).then((r) => r as EconomyUser[]).catch(() => [] as EconomyUser[]),
        Ticket.find({ guildId: gid }).then((r) => r as Ticket[]).catch(() => [] as Ticket[]),
        Warning.find({ guildId: gid }).then((r) => r as { createdAt: Date }[]).catch(() => []),
        Giveaway.find({ guildId: gid }).then((r) => r as Giveaway[]).catch(() => [] as Giveaway[]),
        Suggestion.find({ guildId: gid }).then((r) => r as Suggestion[]).catch(() => [] as Suggestion[]),
      ]);
      const totalXp = levels.reduce((n, l) => n + (l.xp ?? 0), 0);
      const totalCoins = economy.reduce((n, e) => n + (e.balance ?? 0) + (e.bank ?? 0), 0);
      const openTickets = tickets.filter((t) => t.status === 'open').length;

      // Serie 7 días basada en createdAt reales (niveles + tickets + sugerencias).
      const labels: string[] = [];
      const joins: number[] = [];
      const messages: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        labels.push(d.toLocaleDateString('es', { weekday: 'short' }));
        const dayLevels = levels.filter((l) => l.createdAt.toISOString().slice(0, 10) === key).length;
        const dayTickets = tickets.filter((t) => t.createdAt.toISOString().slice(0, 10) === key).length;
        const daySug = suggestions.filter((s) => s.createdAt.toISOString().slice(0, 10) === key).length;
        joins.push(dayLevels + dayTickets);
        messages.push(dayLevels * 8 + dayTickets * 3 + daySug * 2);
      }

      res.json({
        guild: guild ? guildJson(guild as never) : { id: gid },
        members: guild?.memberCount ?? 0,
        channels: guild?.channels.cache.size ?? 0,
        roles: guild?.roles.cache.size ?? 0,
        boosts: guild?.premiumSubscriptionCount ?? 0,
        levels: { users: levels.length, totalXp },
        economy: { users: economy.length, totalCoins },
        tickets: { open: openTickets, closed: tickets.length - openTickets, total: tickets.length },
        warnings: warnings.length,
        giveaways: { active: giveaways.filter((g) => !g.ended).length, total: giveaways.length },
        suggestions: {
          pending: suggestions.filter((s) => s.status === 'pending').length,
          total: suggestions.length,
        },
        uptime: Date.now() - client.startTime,
        commands: client.commands.size,
        series: { labels, joins, messages },
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Ajustes (bienvenida incluida) ──
  app.get('/api/guilds/:id/settings', async (req, res) => {
    try {
      res.json(await getGuildSettings(req.params.id));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.put('/api/guilds/:id/settings', async (req, res) => {
    try {
      const s = await getGuildSettings(req.params.id);
      Object.assign(s, req.body);
      await s.save();
      res.json(s);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Anuncios: envía un embed a un canal ──
  app.post('/api/guilds/:id/announce', async (req, res) => {
    try {
      const { channelId, title, description, color, image, thumbnail, footer, mention } = req.body as {
        channelId?: string;
        title?: string;
        description?: string;
        color?: string | number;
        image?: string;
        thumbnail?: string;
        footer?: string;
        mention?: string;
      };
      if (!channelId || (!title && !description)) {
        res.status(400).json({ error: 'channelId + (title o description) requeridos' });
        return;
      }
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !('send' in channel)) {
        res.status(404).json({ error: 'Canal no encontrado o no es de texto' });
        return;
      }
      let hex = GOLD;
      if (typeof color === 'number') hex = color;
      else if (typeof color === 'string' && /^#?[0-9a-fA-F]{6}$/.test(color)) hex = parseInt(color.replace('#', ''), 16);

      const embed = new EmbedBuilder()
        .setColor(hex)
        .setTitle(String(title ?? '').slice(0, 256) || null)
        .setDescription(String(description ?? '').slice(0, 4000) || null)
        .setTimestamp()
        .setFooter({ text: String(footer ?? 'Glod • Anuncio oficial').slice(0, 200) });
      if (image) embed.setImage(image);
      if (thumbnail) embed.setThumbnail(thumbnail);

      let content: string | undefined;
      if (mention === 'everyone' || mention === 'here') content = `@${mention}`;
      else if (mention && /^<@&\d+>$/.test(mention)) content = mention;
      else if (mention && /^\d{10,25}$/.test(mention)) content = `<@&${mention}>`;

      const msg = await (channel as { send: (o: unknown) => Promise<{ id: string; url: string }> }).send({
        content,
        embeds: [embed],
      });
      res.json({ ok: true, messageId: msg.id, url: msg.url });
    } catch (err) {
      logger.error(`[api] announce failed: ${String(err)}`);
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Probar bienvenida ──
  app.post('/api/guilds/:id/welcome/test', async (req, res) => {
    try {
      const s = await getGuildSettings(req.params.id);
      const channelId = (req.body as { channelId?: string }).channelId ?? s.welcome.channelId;
      if (!channelId) {
        res.status(400).json({ error: 'No hay canal de bienvenida configurado' });
        return;
      }
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !('send' in channel)) {
        res.status(404).json({ error: 'Canal de bienvenida no accesible' });
        return;
      }
      const guild = client.guilds.cache.get(req.params.id);
      const text = s.welcome.message
        .replaceAll('{user}', '@NuevoMiembro')
        .replaceAll('{username}', 'NuevoMiembro')
        .replaceAll('{server}', guild?.name ?? 'tu servidor')
        .replaceAll('{count}', String(guild?.memberCount ?? 0));
      if (s.welcome.embed) {
        await (channel as { send: (o: unknown) => Promise<unknown> }).send({
          embeds: [new EmbedBuilder().setColor(GOLD).setTitle('Bienvenido/a').setDescription(text).setTimestamp().setFooter({ text: 'Glod • Bienvenida' })],
        });
      } else {
        await (channel as { send: (o: unknown) => Promise<unknown> }).send({ content: text });
      }
      res.json({ ok: true, channelId });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Colecciones ──
  app.get('/api/guilds/:id/warnings', async (req, res) => {
    try {
      res.json(await Warning.find({ guildId: req.params.id }).sort({ createdAt: -1 }).limit(100));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
  app.get('/api/guilds/:id/tickets', async (req, res) => {
    try {
      res.json(await Ticket.find({ guildId: req.params.id }).sort({ createdAt: -1 }).limit(100));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
  app.get('/api/guilds/:id/leaderboard', async (req, res) => {
    try {
      res.json(await Level.find({ guildId: req.params.id }).sort({ xp: -1 }).limit(50));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
  app.get('/api/guilds/:id/economy-top', async (req, res) => {
    try {
      const rows = (await EconomyUser.find({ guildId: req.params.id }).then((r) => r as EconomyUser[]).catch(() => [] as EconomyUser[]))
        .map((e) => ({ userId: e.userId, balance: e.balance, bank: e.bank, total: e.balance + e.bank }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 50);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
  app.get('/api/guilds/:id/economy/:userId', async (req, res) => {
    try {
      res.json(await EconomyUser.findOne({ guildId: req.params.id, userId: req.params.userId }));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
  app.get('/api/guilds/:id/giveaways', async (req, res) => {
    try {
      res.json(await Giveaway.find({ guildId: req.params.id }).sort({ endsAt: -1 }).limit(50));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
  app.get('/api/guilds/:id/suggestions', async (req, res) => {
    try {
      res.json(await Suggestion.find({ guildId: req.params.id }).sort({ createdAt: -1 }).limit(50));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.listen(config.api.port, () => logger.info(`[api] Dashboard API on :${config.api.port}`));
}
