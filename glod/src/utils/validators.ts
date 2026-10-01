/**
 * Small validation helpers.
 * @module utils/validators
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function isUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const INVITE = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/\S+/i;
export function containsInvite(text: string): boolean {
  return INVITE.test(text);
}

const LINK = /https?:\/\/\S+/i;
export function containsLink(text: string): boolean {
  return LINK.test(text);
}

/** Replace {user} {username} {server} {count} variables in welcome templates. */
export function applyVariables(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}
