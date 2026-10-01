/**
 * Permission helpers — role hierarchy + permission validation.
 * @module utils/permissions
 */
import { GuildMember, PermissionsBitField } from 'discord.js';

/** Returns null when OK, otherwise a human-readable reason. */
export function canModerate(actor: GuildMember, target: GuildMember, ownerId: string): string | null {
  if (target.id === ownerId) return 'Target is the server owner.';
  if (actor.id === target.id) return 'You cannot moderate yourself.';
  if (target.id === actor.guild.members.me?.id) return 'I cannot moderate myself.';
  const bot = actor.guild.members.me;
  if (bot && bot.roles.highest.position <= target.roles.highest.position) {
    return 'My role is not high enough to moderate this member.';
  }
  if (actor.id !== ownerId && actor.roles.highest.position <= target.roles.highest.position) {
    return 'Your role is not high enough to moderate this member.';
  }
  return null;
}

export function missingPermissions(member: GuildMember | null, required: bigint[]): string[] {
  if (!member) return ['Unknown member'];
  const perms = member.permissions as PermissionsBitField;
  return required
    .filter((p) => !perms.has(p))
    .map((p) => new PermissionsBitField(p).toArray().join(', '));
}
