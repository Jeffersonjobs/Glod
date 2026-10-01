/**
 * Rank card renderer (node-canvas). Fallback to embed when canvas unavailable.
 * @module utils/rankCard
 */
import { AttachmentBuilder } from 'discord.js';

export async function renderRankCard(opts: { username: string; level: number; xp: number; nextXp: number }): Promise<AttachmentBuilder | null> {
  try {
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(800, 220);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 0, 800, 220);
    ctx.fillStyle = '#5865f2';
    ctx.fillRect(0, 0, 800, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Sans';
    ctx.fillText(opts.username.slice(0, 20), 40, 80);
    ctx.font = '28px Sans';
    ctx.fillStyle = '#b5bac1';
    ctx.fillText(`Level ${opts.level} · ${opts.xp}/${opts.nextXp} XP`, 40, 125);
    const pct = Math.min(1, opts.xp / Math.max(1, opts.nextXp));
    ctx.fillStyle = '#383a40';
    ctx.fillRect(40, 150, 720, 24);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(40, 150, 720 * pct, 24);
    return new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
  } catch {
    return null;
  }
}
