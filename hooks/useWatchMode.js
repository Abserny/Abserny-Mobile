/**
 * useWatchMode.js — Continuous Watch Mode
 *
 * Samples a frame every INTERVAL_MS. Sends to Gemini with a change-detection
 * prompt. Speaks ONLY if something meaningful changed or if a hazard appears.
 * Urgency keywords always interrupt immediately regardless of similarity.
 *
 * Fixes applied:
 *  1. isCapturingRef guard — prevents concurrent takePictureAsync() calls
 *     that can crash the Android camera with "already taking a picture".
 *  2. isCleared() is now case-insensitive and strips punctuation — handles
 *     'Clear', 'CLEAR.', 'clear,' etc. that Gemini occasionally returns.
 *  3. lastSpokenAtRef cooldown — non-hazard speech is throttled to once per
 *     MIN_SPEAK_GAP_MS so a slowly-changing scene doesn't spam the user.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';

const INTERVAL_MS       = 3000;   // sample every 3 s
const SIMILARITY        = 0.40;   // Jaccard threshold — below = meaningful change
const MIN_SPEAK_GAP_MS  = 8000;   // minimum ms between non-hazard speech events

// Hazard keywords — always speak immediately, no cooldown
const HAZARD_EN = /\b(step|stair|car|vehicle|moving|approaching|door|edge|curb|obstacle|blocked|danger|warning|caution|traffic|person approaching)\b/i;
const HAZARD_AR = /(درجة|درج|سيارة|متحرك|مقترب|باب|حافة|رصيف|عائق|خطر|تحذير|مرور)/;

// Watch-mode specific Gemini prompts
export const WATCH_PROMPTS = {
    en: `You are a continuous awareness assistant for a blind person walking.
Look at this image and respond in ONE of two ways only:
1. If there is a HAZARD or IMPORTANT CHANGE (person, step, obstacle, moving object, new text): describe it in max 10 words using directions (ahead, left, right).
2. If nothing important or changed: respond with exactly the single word: CLEAR
Do NOT greet. Do NOT explain. ONE line only.`,

    ar: `أنت مساعد وعي مستمر لشخص كفيف يمشي.
انظر إلى هذه الصورة وأجب بإحدى طريقتين فقط:
١. إذا كان هناك خطر أو تغيير مهم (شخص، درجة، عائق، شيء متحرك، نص جديد): صِفه في ١٠ كلمات باستخدام الاتجاهات (أمامك، يسارك، يمينك).
٢. إذا لم يكن هناك شيء مهم: أجب بكلمة واحدة فقط: واضح
لا تُحيّ. لا تُفسّر. سطر واحد فقط.`,
};

// FIX: case-insensitive, punctuation-stripped clear check
// Handles: 'CLEAR', 'Clear', 'clear.', 'clear,', 'واضح.' etc.
function isCleared(text) {
    if (!text) return true;
    const normalized = text.trim().toLowerCase().replace(/[.،,!؟?]/g, '');
    return normalized === 'clear' || normalized === 'واضح';
}

function isHazard(text, lang) {
    if (!text) return false;
    return lang === 'ar' ? HAZARD_AR.test(text) : HAZARD_EN.test(text);
}

function jaccardSimilarity(a, b) {
    if (!a || !b) return 0;
    const sa = new Set(a.toLowerCase().split(/\s+/));
    const sb = new Set(b.toLowerCase().split(/\s+/));
    let inter = 0;
    sa.forEach(w => { if (sb.has(w)) inter++; });
    const union = sa.size + sb.size - inter;
    return union === 0 ? 1 : inter / union;
}

export function useWatchMode({ cameraRef, detect, speak, lang, isConnected }) {
    const [watching,    setWatching]    = useState(false);
    const [frameCount,  setFrameCount]  = useState(0);

    // Refs so callbacks are never stale
    const watchingRef      = useRef(false);
    const lastResultRef    = useRef('');
    const timerRef         = useRef(null);
    const isMountedRef     = useRef(true);
    const isCapturingRef   = useRef(false);   // FIX #1: concurrent capture guard
    const lastSpokenAtRef  = useRef(0);       // FIX #3: cooldown tracker
    const langRef          = useRef(lang);
    const speakRef         = useRef(speak);
    const detectRef        = useRef(detect);
    const connRef          = useRef(isConnected);

    langRef.current   = lang;
    speakRef.current  = speak;
    detectRef.current = detect;
    connRef.current   = isConnected;

    useEffect(() => () => { isMountedRef.current = false; }, []);

    // ── Single frame capture + analysis ──────────────────────────────────────
    const captureAndAnalyze = useCallback(async () => {
        if (!watchingRef.current || !cameraRef.current) return;

        // FIX #1: bail if a capture is already in progress — prevents
        // concurrent takePictureAsync() calls crashing the Android camera
        if (isCapturingRef.current) return;
        isCapturingRef.current = true;

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true, quality: 0.25,
                skipProcessing: true, shutterSound: false,
            });
            if (!photo?.base64 || !watchingRef.current) return;

            const { result } = await detectRef.current(
                photo.base64,
                '__watch__',
                connRef.current,
                langRef.current,
            );

            if (!isMountedRef.current || !watchingRef.current) return;
            if (!result) return;

            // FIX #2: robust clear check — handles 'Clear', 'CLEAR.', etc.
            if (isCleared(result)) {
                setFrameCount(c => c + 1);
                return; // silent — scene unchanged
            }

            const hazard  = isHazard(result, langRef.current);
            const similar = jaccardSimilarity(lastResultRef.current, result) >= SIMILARITY;
            const now     = Date.now();

            if (hazard) {
                // Hazards always speak — interrupt anything, no cooldown
                lastResultRef.current = result;
                lastSpokenAtRef.current = now;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                speakRef.current(result, 'high');
            } else if (!similar) {
                // FIX #3: enforce minimum gap between non-hazard speech events
                const gapOk = (now - lastSpokenAtRef.current) >= MIN_SPEAK_GAP_MS;
                if (gapOk) {
                    lastResultRef.current = result;
                    lastSpokenAtRef.current = now;
                    speakRef.current(result, 'normal');
                }
            }

            setFrameCount(c => c + 1);

        } catch (err) {
            // Silent fail — never interrupt the user with watch errors
            console.warn('[WatchMode] frame error:', err?.message);
        } finally {
            // FIX #1: always release the capture lock
            isCapturingRef.current = false;
        }
    }, [cameraRef]);

    // ── Recursive scheduler ───────────────────────────────────────────────────
    const scheduleNext = useCallback(() => {
        if (!watchingRef.current) return;
        timerRef.current = setTimeout(() => {
            captureAndAnalyze().finally(() => {
                if (watchingRef.current) scheduleNext();
            });
        }, INTERVAL_MS);
    }, [captureAndAnalyze]);

    // ── Start / Stop ──────────────────────────────────────────────────────────
    const startWatch = useCallback(() => {
        if (watchingRef.current) return;
        watchingRef.current     = true;
        lastResultRef.current   = '';
        lastSpokenAtRef.current = 0;
        isCapturingRef.current  = false;
        setWatching(true);
        setFrameCount(0);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const msg = langRef.current === 'ar'
            ? 'وضع المراقبة مفعّل. سأخبرك عند تغيّر المشهد.'
            : 'Watch mode on. I\'ll speak when something changes.';
        speakRef.current(msg, 'high');

        // First frame after announcement finishes
        setTimeout(() => {
            if (watchingRef.current) {
                captureAndAnalyze().finally(() => {
                    if (watchingRef.current) scheduleNext();
                });
            }
        }, 1400);
    }, [captureAndAnalyze, scheduleNext]);

    const stopWatch = useCallback(() => {
        if (!watchingRef.current) return;
        watchingRef.current    = false;
        isCapturingRef.current = false;
        clearTimeout(timerRef.current);
        lastResultRef.current  = '';
        setWatching(false);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const msg = langRef.current === 'ar' ? 'تم إيقاف المراقبة.' : 'Watch mode off.';
        speakRef.current(msg, 'high');
    }, []);

    const toggleWatch = useCallback(() => {
        if (watchingRef.current) stopWatch();
            else startWatch();
    }, [startWatch, stopWatch]);

    // Cleanup on unmount
    useEffect(() => () => {
        watchingRef.current = false;
        clearTimeout(timerRef.current);
    }, []);

    return { watching, frameCount, startWatch, stopWatch, toggleWatch };
}
