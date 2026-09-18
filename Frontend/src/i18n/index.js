import en from './en.js';
import ny from './ny.js';

export const LANGUAGES = { en, ny };
export const DEFAULT_LANG = 'ny';

/**
 * Look up a dotted key, e.g. t('loans.approve').
 * Falls back to English, then to the key itself, so a missing
 * translation never renders as a blank screen.
 */
export function translate(lang, key, ...args) {
  const read = (dict) =>
    key.split('.').reduce((node, part) => (node && node[part] !== undefined ? node[part] : undefined), dict);

  let value = read(LANGUAGES[lang] || LANGUAGES[DEFAULT_LANG]);
  if (value === undefined) value = read(LANGUAGES.en);
  if (value === undefined) return key;
  return typeof value === 'function' ? value(...args) : value;
}
