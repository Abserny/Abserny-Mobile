/**
 * i18n/index.js
 * Central export point for all localisation data.
 * Components import from here — never directly from strings.en / strings.ar.
 */

import { en } from './strings.en';
import { ar } from './strings.ar';
export { GEMINI_PROMPTS, WATCH_PROMPTS, MODES_STRINGS } from './prompts';

export const STRINGS = { en, ar };

/**
 * t(lang, key, ...args)
 * Stateless translation helper — useful outside of the useLanguage hook,
 * e.g. in services that don't have access to React context.
 */
export function t(lang, key, ...args) {
    const strings = STRINGS[lang ?? 'en'] ?? STRINGS.en;
    const val = strings[key];
    if (typeof val === 'function') return val(...args);
    return val ?? key;
}
