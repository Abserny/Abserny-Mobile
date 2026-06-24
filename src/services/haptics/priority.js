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
 *   NOTABLE  — Heavy tap + one Medium buzz after a 100ms gap
 *              "A person ahead." — worth attention, not urgent
 *
 *   DANGER   — Heavy tap + triple Heavy buzz [t+100, t+200, t+300ms]
 *              "Car approaching." — act now
 *
 * SEQUENCE: thud → pattern → 80ms silence → voice begins
 * The Heavy tap stays as "result incoming" (user's existing mental model).
 * The pattern is additional information in the gap before first spoken word.
 *
 * iOS NOTE:
 * Vibration.vibrate() with a pattern array is silently ignored on iOS —
 * only the first element (a wait, not a buzz) is honoured, so the danger
 * pattern produced zero feedback on iOS. All tiers now use impactAsync()
 * exclusively, which works identically on Android and iOS.
 *
 * THIS IS OPTIONAL: the caller checks a user preference before calling this.
 * When disabled, caller falls back to the plain Heavy tap as before.
 */

import * as Haptics from 'expo-haptics';

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
 * notable:  100ms gap → 1× Medium impact → resolves (~120ms total)
 * danger:   100ms gap → 3× Heavy impacts at 100ms intervals → resolves (~400ms total)
 *
 * All impacts use expo-haptics (impactAsync) — no Vibration API anywhere.
 * This ensures consistent behaviour on both Android and iOS.
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
                setTimeout(resolve, 120);
            }, 100);
            return;
        }

        if (priority === 'danger') {
            // Three sharp Heavy impacts, 100ms apart
            // Feels like: THUD — pause — THUD·THUD·THUD — voice
            setTimeout(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setTimeout(() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    setTimeout(() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        setTimeout(resolve, 80); // brief silence before voice
                    }, 100);
                }, 100);
            }, 100);
            return;
        }

        resolve();
    });
}
