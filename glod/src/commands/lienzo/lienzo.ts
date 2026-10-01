/**
 * Lienzo: /lienzo <14 subcomandos que generan imágenes PNG PRO con canvas>.
 * Todo dibujado por código: degradados, recortes circulares, sombras y
 * tipografías del sistema. Sin assets externos (solo avatares de Discord).
 */
import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction, User } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import type { Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';
import { Level } from '../../database/models/entities.js';
import { getGuildSettings } from '../../database/models/GuildSettings.js';
import { xpForLevel } from '../../systems/leveling.js';

// ── Utilidades de dibujo ──────────────────────────────────────────────

type AvatarSource = Image | Canvas;

async function loadAvatar(user: User): Promise<Image | null> {
  try {
    const url = user.displayAvatarURL({ extension: 'png', size: 256 });
    if (!url.startsWith('https://cdn.discordapp.com/')) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await loadImage(buf);
  } catch {
    return null;
  }
}

function paintGradient(ctx: CanvasRenderingContext2D, w: number, h: number, c1: string, c2: string, diagonal = false): void {
  const g = diagonal ? ctx.createLinearGradient(0, 0, w, h) : ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function sprinkleDots(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, color: string, maxR: number, seed: number): void {
  let s = seed >>> 0;
  const rnd = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.12 + rnd() * 0.5;
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 1 + rnd() * maxR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, baseSize: number, weight = 'bold', family = 'sans-serif'): void {
  let size = baseSize;
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `${weight} ${size}px ${family}`;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const trial = current === '' ? word : `${current} ${word}`;
    if (ctx.measureText(trial).width <= maxWidth) {
      current = trial;
    } else {
      if (current !== '') lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current !== '' && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

function drawCover(ctx: CanvasRenderingContext2D, img: AvatarSource, dx: number, dy: number, dw: number, dh: number): void {
  const sw = img.width;
  const sh = img.height;
  if (sw <= 0 || sh <= 0) return;
  const scale = Math.max(dw / sw, dh / sh);
  const cw = dw / scale;
  const ch = dh / scale;
  const sx = (sw - cw) / 2;
  const sy = (sh - ch) / 2;
  ctx.drawImage(img, sx, sy, cw, ch, dx, dy, dw, dh);
}

function initialsOf(name: string): string {
  const t = name.trim();
  return (t.charAt(0) || '?').toUpperCase();
}

function placeholderCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, name: string): void {
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, '#5865f2');
  g.addColorStop(1, '#9b59b6');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, initialsOf(name), r, Math.floor(r));
  ctx.fillText(initialsOf(name), cx, cy + 2);
}

function placeholderRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, name: string): void {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#3a3f6b');
  g.addColorStop(1, '#7b4b9e');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, initialsOf(name), Math.min(w, h), Math.floor(Math.min(w, h) / 2));
  ctx.fillText(initialsOf(name), x + w / 2, y + h / 2 + 2);
}

function drawAvatarCircle(
  ctx: CanvasRenderingContext2D,
  img: Image | null,
  name: string,
  cx: number,
  cy: number,
  r: number,
  ring: string | null,
  ringWidth = 6,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (img) drawCover(ctx, img, cx - r, cy - r, r * 2, r * 2);
  else {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, '#5865f2');
    g.addColorStop(1, '#9b59b6');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitFont(ctx, initialsOf(name), r, Math.floor(r));
    ctx.fillText(initialsOf(name), cx, cy + 2);
  }
  ctx.restore();
  if (ring) {
    ctx.save();
    ctx.lineWidth = ringWidth;
    ctx.strokeStyle = ring;
    ctx.shadowColor = ring;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.4, cy, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.4, cy, cx, cy + s * 0.9);
  ctx.fill();
  ctx.restore();
}

function lovePercent(a: string, b: string): number {
  const s = [a, b].sort().join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 101;
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function footer(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Glod • Lienzo', w - 20, h - 14);
  ctx.restore();
}

async function sendImage(interaction: ChatInputCommandInteraction, buffer: Buffer, title: string, description: string): Promise<void> {
  const attachment = new AttachmentBuilder(buffer, { name: 'lienzo.png' });
  const embed = Embeds.primary(title, description).setImage('attachment://lienzo.png');
  await interaction.editReply({ embeds: [embed], files: [attachment] });
}

// ── Comando ───────────────────────────────────────────────────────────

export const lienzo: Command = {
  data: new SlashCommandBuilder()
    .setName('lienzo')
    .setDescription('Genera imágenes PRO con canvas')
    .addSubcommand((s) =>
      s.setName('perfil').setDescription('Tarjeta de perfil de un usuario').addUserOption((o) => o.setName('usuario').setDescription('Usuario a mostrar')),
    )
    .addSubcommand((s) =>
      s
        .setName('versus')
        .setDescription('Duelo épico entre dos usuarios')
        .addUserOption((o) => o.setName('usuario1').setDescription('Primer duelista').setRequired(true))
        .addUserOption((o) => o.setName('usuario2').setDescription('Segundo duelista')),
    )
    .addSubcommand((s) =>
      s.setName('logro').setDescription('Logro estilo Minecraft').addStringOption((o) => o.setName('texto').setDescription('Texto del logro').setRequired(true).setMaxLength(60)),
    )
    .addSubcommand((s) =>
      s.setName('rango').setDescription('Tarjeta de rango con XP real').addUserOption((o) => o.setName('usuario').setDescription('Usuario a mostrar')),
    )
    .addSubcommand((s) =>
      s.setName('bienvenida').setDescription('Imagen de bienvenida').addUserOption((o) => o.setName('usuario').setDescription('Usuario a dar la bienvenida')),
    )
    .addSubcommand((s) =>
      s.setName('despedida').setDescription('Imagen de despedida').addUserOption((o) => o.setName('usuario').setDescription('Usuario que se despide')),
    )
    .addSubcommand((s) =>
      s
        .setName('ship')
        .setDescription('Compatibilidad amorosa entre dos usuarios')
        .addUserOption((o) => o.setName('usuario1').setDescription('Primera persona').setRequired(true))
        .addUserOption((o) => o.setName('usuario2').setDescription('Segunda persona')),
    )
    .addSubcommand((s) =>
      s
        .setName('wanted')
        .setDescription('Póster de SE BUSCA')
        .addUserOption((o) => o.setName('usuario').setDescription('El buscado'))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo de la búsqueda').setMaxLength(60)),
    )
    .addSubcommand((s) =>
      s
        .setName('cita')
        .setDescription('Tarjeta elegante con una cita')
        .addStringOption((o) => o.setName('texto').setDescription('Texto de la cita').setRequired(true).setMaxLength(200))
        .addStringOption((o) => o.setName('autor').setDescription('Autor de la cita').setMaxLength(60)),
    )
    .addSubcommand((s) =>
      s
        .setName('degradado')
        .setDescription('Texto sobre un fondo degradado')
        .addStringOption((o) => o.setName('texto').setDescription('Texto a mostrar').setRequired(true).setMaxLength(80))
        .addStringOption((o) => o.setName('color1').setDescription('Color inicial HEX, ej. #5865f2'))
        .addStringOption((o) => o.setName('color2').setDescription('Color final HEX, ej. #eb459e')),
    )
    .addSubcommand((s) =>
      s.setName('avatar-gris').setDescription('Avatar en blanco y negro').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('avatar-pixel').setDescription('Avatar pixelado estilo mosaico').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('avatar-espejo').setDescription('Avatar con mitad reflejada').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    )
    .addSubcommand((s) =>
      s.setName('avatar-marco').setDescription('Avatar con marco degradado y nombre').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    ),
  cooldown: 8,
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const sub = interaction.options.getSubcommand();

      if (sub === 'perfil') {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const avatar = await loadAvatar(user);
        const W = 800;
        const H = 300;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        paintGradient(ctx, W, H, '#1a1c2e', '#4a3aff');
        sprinkleDots(ctx, W, H, 70, '#ffffff', 3, 42);
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath();
        ctx.arc(700, 40, 120, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(60, 260, 90, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawAvatarCircle(ctx, avatar, user.username, 150, 150, 95, '#ffd166', 8);
        ctx.save();
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('PERFIL', 280, 80);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        fitFont(ctx, user.username, 440, 52);
        ctx.fillText(user.username.slice(0, 32), 280, 140);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#c9d1ff';
        ctx.font = '24px sans-serif';
        ctx.fillText(`ID: ${user.id}`, 280, 185);
        const guildName = interaction.guild?.name ?? 'este servidor';
        fitFont(ctx, `Miembro de ${guildName}`, 440, 26, 'normal');
        ctx.fillStyle = '#e6e9ff';
        ctx.fillText(`Miembro de ${guildName}`.slice(0, 48), 280, 225);
        ctx.restore();
        footer(ctx, W, H);
        await sendImage(interaction, canvas.toBuffer('image/png'), `Perfil de ${user.username}`, `Tarjeta de perfil generada con Lienzo.`);
        return;
      }

      if (sub === 'versus') {
        const u1 = interaction.options.getUser('usuario1', true);
        const u2 = interaction.options.getUser('usuario2') ?? interaction.user;
        const [a1, a2] = await Promise.all([loadAvatar(u1), loadAvatar(u2)]);
        const W = 800;
        const H = 400;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        const left = ctx.createLinearGradient(0, 0, W / 2, 0);
        left.addColorStop(0, '#7a1010');
        left.addColorStop(1, '#ff4d4d');
        ctx.fillStyle = left;
        ctx.fillRect(0, 0, W / 2, H);
        const right = ctx.createLinearGradient(W / 2, 0, W, 0);
        right.addColorStop(0, '#3b82f6');
        right.addColorStop(1, '#101d7a');
        ctx.fillStyle = right;
        ctx.fillRect(W / 2, 0, W / 2, H);
        sprinkleDots(ctx, W, H, 90, '#ffffff', 3, 7);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(W / 2 - 14, 0, 28, H);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 10;
        ctx.fillText('DUELO ÉPICO', W / 2, 55);
        ctx.restore();
        drawAvatarCircle(ctx, a1, u1.username, 200, 190, 100, '#ffffff', 8);
        drawAvatarCircle(ctx, a2, u2.username, 600, 190, 100, '#ffffff', 8);
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(400, 190, 58, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#3a2200';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VS', 400, 192);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 8;
        fitFont(ctx, u1.username, 300, 30);
        ctx.fillText(u1.username.slice(0, 24), 200, 325);
        fitFont(ctx, u2.username, 300, 30);
        ctx.fillText(u2.username.slice(0, 24), 600, 325);
        ctx.restore();
        footer(ctx, W, H);
        await sendImage(interaction, canvas.toBuffer('image/png'), 'Versus', `${u1.username} contra ${u2.username}. ¡Que gane el mejor!`);
        return;
      }

      if (sub === 'logro') {
        const texto = interaction.options.getString('texto', true).slice(0, 60);
        const W = 700;
        const H = 180;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#212121';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#6b6b6b';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, W - 8, H - 8);
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(28, 28, 124, 124);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(28, 28, 124, 124);
        const px = 34;
        const py = 34;
        const cell = 14;
        let seed = 99;
        const rnd = (): number => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            if (row < 2) ctx.fillStyle = row === 0 ? '#6abe30' : '#4f9b26';
            else ctx.fillStyle = rnd() > 0.4 ? '#8a5a2b' : '#6b4420';
            ctx.fillRect(px + col * cell, py + row * cell, cell, cell);
          }
        }
        ctx.save();
        ctx.fillStyle = '#ffff54';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('¡Logro conseguido!', 180, 75);
        ctx.fillStyle = '#ffffff';
        fitFont(ctx, texto, 480, 32, 'normal');
        const lines = wrapLines(ctx, texto, 480, 2);
        lines.forEach((line, i) => ctx.fillText(line, 180, 115 + i * 36));
        ctx.restore();
        await sendImage(interaction, canvas.toBuffer('image/png'), 'Logro desbloqueado', texto);
        return;
      }

      if (sub === 'rango') {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const avatar = await loadAvatar(user);
        let xp = 0;
        let level = 0;
        let locale = 'es';
        if (interaction.guildId) {
          const settings = await getGuildSettings(interaction.guildId).catch(() => null);
          if (settings) locale = settings.locale;
          const doc = await Level.findOne({ guildId: interaction.guildId, userId: user.id }).catch(() => null);
          xp = doc?.xp ?? 0;
          level = doc?.level ?? 0;
        }
        const next = xpForLevel(level + 1);
        const pct = Math.min(1, xp / Math.max(1, next));
        const W = 800;
        const H = 250;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        paintGradient(ctx, W, H, '#0f2027', '#2c5364');
        sprinkleDots(ctx, W, H, 60, '#7ef9ff', 2, 1234);
        drawAvatarCircle(ctx, avatar, user.username, 125, 125, 80, '#2ee6a8', 7);
        ctx.save();
        ctx.textAlign = 'left';
        fitFont(ctx, user.username, 480, 44);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.fillText(user.username.slice(0, 28), 230, 90);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#9be7ff';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(`Nivel ${level}`, 230, 130);
        const barX = 230;
        const barY = 155;
        const barW = 530;
        const barH = 28;
        roundRectPath(ctx, barX, barY, barW, barH, 14);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();
        if (pct > 0) {
          roundRectPath(ctx, barX, barY, Math.max(barH, barW * pct), barH, 14);
          const g = ctx.createLinearGradient(barX, 0, barX + barW, 0);
          g.addColorStop(0, '#2ee6a8');
          g.addColorStop(1, '#c6ff4d');
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px sans-serif';
        ctx.fillText(`${xp.toLocaleString(locale)} / ${next.toLocaleString(locale)} XP`, 230, 220);
        ctx.restore();
        footer(ctx, W, H);
        await sendImage(
          interaction,
          canvas.toBuffer('image/png'),
          `Rango de ${user.username}`,
          `Nivel **${level}** con **${xp.toLocaleString(locale)}** XP.`,
        );
        return;
      }

      if (sub === 'bienvenida' || sub === 'despedida') {
        const leaving = sub === 'despedida';
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const avatar = await loadAvatar(user);
        const guildName = interaction.guild?.name ?? 'el servidor';
        const W = 900;
        const H = 300;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        if (leaving) paintGradient(ctx, W, H, '#232526', '#8e2f32');
        else paintGradient(ctx, W, H, '#5b2a86', '#ff5e9c');
        sprinkleDots(ctx, W, H, 110, '#ffffff', 4, leaving ? 555 : 888);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 12;
        fitFont(ctx, leaving ? '¡ADIÓS!' : '¡BIENVENIDO/A!', 800, 58);
        ctx.fillText(leaving ? '¡ADIÓS!' : '¡BIENVENIDO/A!', W / 2, 62);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffe9f2';
        fitFont(ctx, guildName, 800, 26, 'normal');
        ctx.fillText(`a ${guildName}`.slice(0, 60), W / 2, 98);
        ctx.restore();
        drawAvatarCircle(ctx, avatar, user.username, W / 2, 178, 62, '#ffffff', 6);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        fitFont(ctx, user.username, 700, 34);
        ctx.fillText(user.username.slice(0, 30), W / 2, 272);
        ctx.restore();
        const title = leaving ? `Adiós, ${user.username}` : `Bienvenido/a, ${user.username}`;
        const desc = leaving ? 'Esperamos verte pronto por aquí.' : `¡Bienvenido/a a ${guildName}!`;
        await sendImage(interaction, canvas.toBuffer('image/png'), title, desc);
        return;
      }

      if (sub === 'ship') {
        const u1 = interaction.options.getUser('usuario1', true);
        const u2 = interaction.options.getUser('usuario2') ?? interaction.user;
        const [a1, a2] = await Promise.all([loadAvatar(u1), loadAvatar(u2)]);
        const pct = lovePercent(u1.id, u2.id);
        const W = 800;
        const H = 400;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        paintGradient(ctx, W, H, '#ff5e9c', '#7b2ff7', true);
        sprinkleDots(ctx, W, H, 80, '#ffd6e8', 3, 2024);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText('COMPATIBILIDAD', W / 2, 48);
        ctx.restore();
        drawAvatarCircle(ctx, a1, u1.username, 250, 150, 85, '#ffffff', 7);
        drawAvatarCircle(ctx, a2, u2.username, 550, 150, 85, '#ffffff', 7);
        drawHeart(ctx, 400, 135, 34, '#ff1744');
        ctx.save();
        ctx.textAlign = 'center';
        fitFont(ctx, u1.username, 220, 26);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 6;
        ctx.fillText(u1.username.slice(0, 20), 250, 258);
        fitFont(ctx, u2.username, 220, 26);
        ctx.fillText(u2.username.slice(0, 20), 550, 258);
        ctx.font = 'bold 56px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${pct}%`, 400, 300);
        ctx.font = '24px sans-serif';
        ctx.fillStyle = '#ffe3ee';
        const verdict = pct >= 80 ? '¡Almas gemelas!' : pct >= 55 ? 'Hay química' : pct >= 30 ? 'Podría funcionar' : 'Mejor como amigos';
        ctx.fillText(verdict, 400, 332);
        const barX = 250;
        const barY = 348;
        const barW = 300;
        const barH = 18;
        roundRectPath(ctx, barX, barY, barW, barH, 9);
        ctx.fillStyle = 'rgba(255,255,255,0.30)';
        ctx.fill();
        if (pct > 0) {
          roundRectPath(ctx, barX, barY, Math.max(barH, (barW * pct) / 100), barH, 9);
          ctx.fillStyle = '#ff1744';
          ctx.fill();
        }
        ctx.restore();
        footer(ctx, W, H);
        await sendImage(interaction, canvas.toBuffer('image/png'), `Ship: ${u1.username} y ${u2.username}`, `Compatibilidad del **${pct}%**: ${verdict}`);
        return;
      }

      if (sub === 'wanted') {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const motivo = (interaction.options.getString('motivo') ?? 'Por ser demasiado genial').slice(0, 60);
        const avatar = await loadAvatar(user);
        const W = 600;
        const H = 750;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        paintGradient(ctx, W, H, '#efe0c0', '#c9a86a');
        sprinkleDots(ctx, W, H, 40, '#7a5a2a', 2, 31337);
        ctx.save();
        ctx.strokeStyle = '#4a2f14';
        ctx.lineWidth = 10;
        ctx.strokeRect(14, 14, W - 28, H - 28);
        ctx.lineWidth = 3;
        ctx.strokeRect(34, 34, W - 68, H - 68);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#2b1a08';
        ctx.textAlign = 'center';
        ctx.font = 'bold 84px sans-serif';
        ctx.fillText('W A N T E D', W / 2, 130);
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText('— SE BUSCA —', W / 2, 172);
        ctx.restore();
        const ax = 150;
        const ay = 200;
        const as = 300;
        ctx.save();
        ctx.strokeStyle = '#2b1a08';
        ctx.lineWidth = 8;
        ctx.strokeRect(ax - 8, ay - 8, as + 16, as + 16);
        if (avatar) {
          drawCover(ctx, avatar, ax, ay, as, as);
          ctx.fillStyle = 'rgba(120,72,20,0.25)';
          ctx.fillRect(ax, ay, as, as);
        } else {
          placeholderRect(ctx, ax, ay, as, as, user.username);
        }
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#2b1a08';
        ctx.textAlign = 'center';
        fitFont(ctx, user.username.toUpperCase(), 500, 44);
        ctx.fillText(user.username.toUpperCase().slice(0, 24), W / 2, 566);
        ctx.font = 'italic 28px serif';
        const mlines = wrapLines(ctx, motivo, 500, 2);
        mlines.forEach((line, i) => ctx.fillText(line, W / 2, 610 + i * 34));
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('RECOMPENSA · 1.000.000', W / 2, 700);
        ctx.restore();
        await sendImage(interaction, canvas.toBuffer('image/png'), `Se busca: ${user.username}`, motivo);
        return;
      }

      if (sub === 'cita') {
        const texto = interaction.options.getString('texto', true).slice(0, 200);
        const autor = (interaction.options.getString('autor') ?? 'Anónimo').slice(0, 60);
        const W = 800;
        const H = 400;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        paintGradient(ctx, W, H, '#14161f', '#2a2f45');
        sprinkleDots(ctx, W, H, 60, '#8fa2ff', 2, 777);
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.font = '180px serif';
        ctx.textAlign = 'left';
        ctx.fillText('“', 30, 170);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#f5f6ff';
        ctx.font = 'italic 34px serif';
        const lines = wrapLines(ctx, texto, 640, 4);
        const startY = 190 - ((lines.length - 1) * 22);
        lines.forEach((line, i) => {
          ctx.textAlign = 'center';
          ctx.fillText(line, W / 2, startY + i * 46);
        });
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'right';
        fitFont(ctx, `— ${autor}`, 600, 26);
        ctx.fillText(`— ${autor}`.slice(0, 62), W - 60, H - 50);
        ctx.restore();
        footer(ctx, W, H);
        await sendImage(interaction, canvas.toBuffer('image/png'), `Cita de ${autor}`, `“${texto}”`);
        return;
      }

      if (sub === 'degradado') {
        const texto = interaction.options.getString('texto', true).slice(0, 80);
        const raw1 = (interaction.options.getString('color1') ?? '#5865f2').trim();
        const raw2 = (interaction.options.getString('color2') ?? '#eb459e').trim();
        const c1 = isHexColor(raw1) ? raw1 : '#5865f2';
        const c2 = isHexColor(raw2) ? raw2 : '#eb459e';
        const W = 800;
        const H = 400;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        paintGradient(ctx, W, H, c1, c2, true);
        sprinkleDots(ctx, W, H, 90, '#ffffff', 3, 9001);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 14;
        ctx.font = 'bold 54px sans-serif';
        const lines = wrapLines(ctx, texto, 680, 3);
        fitFont(ctx, lines.join(' '), 680, 54);
        const sized = wrapLines(ctx, texto, 680, 3);
        const cy = H / 2 - ((sized.length - 1) * 32);
        sized.forEach((line, i) => ctx.fillText(line, W / 2, cy + i * 64));
        ctx.restore();
        footer(ctx, W, H);
        await sendImage(interaction, canvas.toBuffer('image/png'), 'Degradado', texto);
        return;
      }

      if (sub === 'avatar-gris') {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const avatar = await loadAvatar(user);
        const S = 512;
        const canvas = createCanvas(S, S);
        const ctx = canvas.getContext('2d');
        if (avatar) {
          drawCover(ctx, avatar, 0, 0, S, S);
          const data = ctx.getImageData(0, 0, S, S);
          const px = data.data;
          for (let i = 0; i < px.length; i += 4) {
            const r = px[i] ?? 0;
            const g = px[i + 1] ?? 0;
            const b = px[i + 2] ?? 0;
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            px[i] = gray;
            px[i + 1] = gray;
            px[i + 2] = gray;
          }
          ctx.putImageData(data, 0, 0);
        } else {
          placeholderRect(ctx, 0, 0, S, S, user.username);
        }
        await sendImage(interaction, canvas.toBuffer('image/png'), `Avatar gris de ${user.username}`, 'Filtro blanco y negro aplicado.');
        return;
      }

      if (sub === 'avatar-pixel') {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const avatar = await loadAvatar(user);
        const S = 512;
        const canvas = createCanvas(S, S);
        const ctx = canvas.getContext('2d');
        if (avatar) {
          const tiny = createCanvas(32, 32);
          const tctx = tiny.getContext('2d');
          drawCover(tctx, avatar, 0, 0, 32, 32);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tiny, 0, 0, S, S);
          ctx.imageSmoothingEnabled = true;
        } else {
          placeholderRect(ctx, 0, 0, S, S, user.username);
        }
        await sendImage(interaction, canvas.toBuffer('image/png'), `Avatar pixel de ${user.username}`, 'Mosaico de 16 píxeles aplicado.');
        return;
      }

      if (sub === 'avatar-espejo') {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const avatar = await loadAvatar(user);
        const S = 512;
        const half = S / 2;
        const canvas = createCanvas(S, S);
        const ctx = canvas.getContext('2d');
        if (avatar) {
          const base = createCanvas(S, S);
          const bctx = base.getContext('2d');
          drawCover(bctx, avatar, 0, 0, S, S);
          ctx.drawImage(base, 0, 0, half, S, 0, 0, half, S);
          ctx.save();
          ctx.translate(S, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(base, 0, 0, half, S, 0, 0, half, S);
          ctx.restore();
          ctx.fillStyle = '#ffd166';
          ctx.fillRect(half - 2, 0, 4, S);
        } else {
          placeholderRect(ctx, 0, 0, S, S, user.username);
        }
        await sendImage(interaction, canvas.toBuffer('image/png'), `Avatar espejo de ${user.username}`, 'Mitad izquierda reflejada.');
        return;
      }

      if (sub === 'avatar-marco') {
        const user = interaction.options.getUser('usuario') ?? interaction.user;
        const avatar = await loadAvatar(user);
        const S = 512;
        const canvas = createCanvas(S, S);
        const ctx = canvas.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, S, S);
        g.addColorStop(0, '#ffd166');
        g.addColorStop(0.5, '#ef476f');
        g.addColorStop(1, '#5865f2');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        const m = 28;
        if (avatar) drawCover(ctx, avatar, m, m, S - m * 2, S - m * 2);
        else placeholderRect(ctx, m, m, S - m * 2, S - m * 2, user.username);
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(m + 2, m + 2, S - m * 2 - 4, S - m * 2 - 4);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(m, S - m - 84, S - m * 2, 84);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        fitFont(ctx, user.username, S - m * 2 - 40, 36);
        ctx.fillText(user.username.slice(0, 24), S / 2, S - m - 42);
        ctx.restore();
        await sendImage(interaction, canvas.toBuffer('image/png'), `Avatar con marco de ${user.username}`, 'Marco degradado aplicado.');
        return;
      }

      await interaction.editReply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')] });
    } catch {
      const payload = { embeds: [Embeds.error('Error de lienzo', 'No se pudo generar la imagen. Inténtalo de nuevo.')] };
      try {
        if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
        else await interaction.reply({ ...payload, ephemeral: true });
      } catch {
        // Sin canal de respuesta disponible; nada más que hacer.
      }
    }
  },
};
