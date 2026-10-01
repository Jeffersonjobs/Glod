/**
 * Minimal i18n with JSON locales + fallback to English.
 * Guild locale resolution is done via GuildSettings in systems.
 * @module utils/i18n
 */
import en from '../locales/en.json';
import es from '../locales/es.json';

type Dict = Record<string, string>;
const bundles: Record<string, Dict> = { en: en as Dict, es: es as Dict };

/**
 * Translate a key, interpolating `{var}` placeholders.
 * @param key dotted key in locale JSON
 * @param locale requested locale
 * @param vars interpolation map
 */
export function t(key: string, locale = 'en', vars: Record<string, string | number> = {}): string {
  const dict = bundles[locale] ?? bundles.en;
  let out: string = dict[key] ?? (bundles.en as Dict)[key] ?? key;
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

export const supportedLocales = Object.keys(bundles);
