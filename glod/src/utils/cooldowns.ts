/**
 * In-memory cooldown manager (per command + user). Swap with Redis if needed.
 * @module utils/cooldowns
 */
const buckets = new Map<string, number>();

export function checkCooldown(key: string, seconds: number): number {
  const now = Date.now();
  const expires = buckets.get(key) ?? 0;
  if (now < expires) return Math.ceil((expires - now) / 1000);
  buckets.set(key, now + seconds * 1000);
  // opportunistic cleanup
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v <= now) buckets.delete(k);
  }
  return 0;
}

export function clearCooldown(key: string): void {
  buckets.delete(key);
}
