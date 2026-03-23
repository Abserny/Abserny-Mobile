/**
 * services/haptics/priority.js
 *
 * Classifies a scan result into one of three priority tiers and plays
 * a distinct haptic pattern before speech begins.
 *
 * WHY THIS EXISTS:
 * Before a blind user processes a spoken word, their body has already received
 * the haptic signal. If that signal carries meaning, the brain shifts into the
 * right attentional mode (calm vs alert) before the voice even starts.
 *
 * THE THREE TIERS:
 *   NEUTRAL  — single Heavy tap (existing behaviour, unchanged)
 *              "A chair to your left."
 *
 *   NOTABLE  — Heavy tap + one short 80ms buzz after a 100ms gap
 *              "A person ahead." — worth attention, not urgent
 *
 *   DANGER   — Heavy tap + rapid triple buzz [80·60·80·60·80ms]
 *              "Car approaching." — act now
 *
 * SEQUENCE: thud → pattern → 80ms silence → voice begins
 * The Heavy tap stays as "result incoming" (user's existing mental model).
 * The pattern is additional information in the gap before first spoken word.
 *
 * THIS IS OPTIONAL: the caller checks a user preference before calling this.
 * When disabled, caller falls back to the plain Heavy tap as before.
 */

import * as Haptics   from 'expo-haptics';
import { Vibration }  from 'react-native';

// ── Classification keywords ───────────────────────────────────────────────────
// Run both EN and AR regardless of current language — Gemini sometimes code-switches.

const DANGER_EN = /\b(step|stair|car|truck|bus|motorcycle|vehicle|moving|approaching|door|edge|curb|obstacle|blocked|danger|warning|caution|traffic|fire|fall)\b/i;
const DANGER_AR = /(درجة|درج|سيارة|شاحنة|حافلة|دراجة|متحرك|مقترب|حافة|رصيف|عائق|خطر|تحذير|مرور|نار|سقوط)/;

const NOTABLE_EN = /\b(person|people|man|woman|child|text|sign|exit|phone|medicine|food|money|price|door|hand)\b/i;
const NOTABLE_AR = /(شخص|أشخاص|رجل|امرأة|طفل|نص|لافتة|خروج|هاتف|دواء|طعام|مال|سعر|يد)/;

/**
 * classifyResult(text) → 'danger' | 'notable' | 'neutral'
 * Danger is checked first — if something is both a person AND moving, it's danger.
 */
export function classifyResult(text) {
    if (!text) return 'neutral';
    if (DANGER_EN.test(text) || DANGER_AR.test(text)) return 'danger';
    if (NOTABLE_EN.test(text) || NOTABLE_AR.test(text)) return 'notable';
    return 'neutral';
}

/**
 * playPriorityHaptic(priority) → Promise<void>
 *
 * Plays the haptic pattern for the given priority tier and resolves
 * when the pattern is complete, so the caller can then start speech.
 *
 * neutral:  resolves immediately (caller plays its own Heavy tap separately)
 * notable:  100ms gap → 80ms buzz → resolves
 * danger:   100ms gap → triple buzz [80·60·80·60·80ms] → resolves
 */
export function playPriorityHaptic(priority) {
    return new Promise((resolve) => {
        if (priority === 'neutral') {
            // Nothing extra — caller already fired the Heavy tap
            resolve();
            return;
        }

        if (priority === 'notable') {
            // Short gap then one firm buzz
            setTimeout(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setTimeout(resolve, 120); // wait for buzz to finish
            }, 100);
            return;
        }

        if (priority === 'danger') {
            // Short gap then rapid triple buzz using Vibration for pattern control
            setTimeout(() => {
                // [wait, buzz, gap, buzz, gap, buzz]
                Vibration.vibrate([0, 80, 60, 80, 60, 80]);
                // Total pattern duration: 80+60+80+60+80 = 360ms
                setTimeout(resolve, 380);
            }, 100);
            return;
        }

        resolve();
    });
}
