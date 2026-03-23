/**
 * hooks/useWatchMode.js — Continuous Watch Mode
 *
 * Samples a frame every INTERVAL_MS. Sends to detection service with a
 * change-detection prompt. Speaks ONLY if something meaningful changed
 * or if a hazard appears. Urgency keywords always interrupt immediately.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import * as Haptics  from 'expo-haptics';
import * as Battery  from 'expo-battery';
import { normalizeArabicForTTS as n } from '../services/tts/normalize';

// How often to sample a frame (ms).
// Real-world cycle = INTERVAL_MS + Gemini latency (~1.5-2.5s) ≈ 4-5s total.
// At walking pace (~1.2 m/s) that's ~5-6m per cycle — fast enough for hazards.
const INTERVAL_MS = 2500;

// Jaccard similarity threshold — below this = "changed enough to speak".
// 0.55 means descriptions must share >55% vocabulary to be considered the same.
// Higher = stricter = fewer false positives from Gemini rewording the same scene.
const SIMILARITY = 0.55;

// Minimum gap between non-hazard speech events (ms).
// 4000ms = ~5m walked before a new non-hazard update.
// Hazards always bypass this cooldown entirely.
const MIN_SPEAK_GAP_MS = 4000;

const HAZARD_EN = /\b(step|stair|car|vehicle|moving|approaching|door|edge|curb|obstacle|blocked|danger|warning|caution|traffic|person approaching)\b/i;
const HAZARD_AR = /(درجة|درج|سيارة|متحرك|مقترب|باب|حافة|رصيف|عائق|خطر|تحذير|مرور)/;

// Battery thresholds
// WARN:  speak a low-battery warning once, keep watching
// STOP:  stop watch mode automatically — too risky to drain further
// Charging/full state always bypasses both thresholds.
const BATTERY_WARN_LEVEL = 0.15;   // 15%
const BATTERY_STOP_LEVEL = 0.05;   // 5%
const BATTERY_CHECK_MS   = 60000;  // check every 60s (independent of capture loop)

function isCleared(text) {
    if (!text) return true;
    const normalized = text.trim().toLowerCase().replace(/[.،,!؟?]/g, '');
    if (normalized === 'clear' || normalized === 'واضح') return true;
    if (/^(no changes?|nothing (important|new|changed?)|scene unchanged|all clear|nothing to report)$/.test(normalized)) return true;
    return false;
}

function isHazard(text) {
    if (!text) return false;
    // Run both regexes unconditionally — Gemini sometimes code-switches
    // (returns English words in Arabic mode or vice versa).
    // isCleared() follows the same pattern.
    return HAZARD_EN.test(text) || HAZARD_AR.test(text);
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
    const [watching, setWatching] = useState(false);

    const frameCountRef    = useRef(0);   // debug counter — ref, never causes re-render

    const watchingRef      = useRef(false);
    const lastResultRef    = useRef('');
    const timerRef         = useRef(null);
    const isMountedRef     = useRef(true);
    const isCapturingRef   = useRef(false);
    const lastSpokenAtRef  = useRef(0);
    const langRef          = useRef(lang);
    const speakRef         = useRef(speak);
    const detectRef        = useRef(detect);
    const connRef          = useRef(isConnected);

    // Battery awareness — refs so checks never cause re-renders
    const batteryTimerRef      = useRef(null);
    const batteryWarnedRef     = useRef(false);  // true once low-battery warning spoken

    langRef.current   = lang;
    speakRef.current  = speak;
    detectRef.current = detect;
    connRef.current   = isConnected;

    useEffect(() => () => { isMountedRef.current = false; }, []);

    // ── Battery check ─────────────────────────────────────────────────────────
    // Runs independently — never blocks or delays the capture loop.
    // Returns true if watch should continue, false if it should stop.
    const checkBattery = useCallback(async () => {
        try {
            const [level, state] = await Promise.all([
                Battery.getBatteryLevelAsync(),
                Battery.getBatteryStateAsync(),
            ]);

            // Charging or full → no warnings needed
            const isCharging = state === Battery.BatteryState.CHARGING
                             || state === Battery.BatteryState.FULL;
            if (isCharging) return true;

            const ar = langRef.current === 'ar';

            if (level <= BATTERY_STOP_LEVEL) {
                // Critical — stop watch automatically
                const msg = ar
                    ? n('البطارية منخفضة جداً. تمَّ إيقاف المراقبة.')
                    : 'Battery critically low. Stopping watch mode.';
                speakRef.current(msg, 'high');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return false;  // caller stops watch
            }

            if (level <= BATTERY_WARN_LEVEL && !batteryWarnedRef.current) {
                // Low — warn once, keep watching
                batteryWarnedRef.current = true;
                const pct = Math.round(level * 100);
                const msg = ar
                    ? n(`تَحذير: البطارية ${pct} بالمئة. اشحن الهاتف قريباً.`)
                    : `Battery at ${pct}%. Connect charger soon.`;
                speakRef.current(msg, 'high');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }

            return true;
        } catch {
            // expo-battery unavailable (simulator etc.) — silently continue
            return true;
        }
    }, []);

    // Schedules recurring battery checks while watching.
    // Runs on its own timer, completely separate from the capture loop.
    // Note: uses watchingRef to self-stop rather than calling stopWatch()
    // directly — avoids a circular useCallback dependency.
    const startBatteryChecks = useCallback(() => {
        clearInterval(batteryTimerRef.current);
        batteryTimerRef.current = setInterval(async () => {
            if (!watchingRef.current) return;
            const ok = await checkBattery();
            if (!ok && watchingRef.current) {
                // Inline stop to avoid circular dep with stopWatch
                watchingRef.current    = false;
                isCapturingRef.current = false;
                clearTimeout(timerRef.current);
                clearInterval(batteryTimerRef.current);
                lastResultRef.current  = '';
                setWatching(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        }, BATTERY_CHECK_MS);
    }, [checkBattery]);


    // ── Single frame capture + analysis ───────────────────────────────────────
    const captureAndAnalyze = useCallback(async () => {
        if (!watchingRef.current || !cameraRef.current) return;
        if (isCapturingRef.current) return;
        isCapturingRef.current = true;

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true, quality: 0.25,
                skipProcessing: true, shutterSound: false,
            });
            if (!photo?.base64 || !watchingRef.current) return;

            const { result } = await detectRef.current(
                photo.base64, '__watch__', connRef.current, langRef.current,
                lastResultRef.current,   // context: last spoken description for Gemini diff
            );

            if (!isMountedRef.current || !watchingRef.current || !result) return;
            if (isCleared(result)) { frameCountRef.current += 1; return; }

            const hazard  = isHazard(result);
            const similar = jaccardSimilarity(lastResultRef.current, result) >= SIMILARITY;
            const now     = Date.now();

            if (hazard) {
                lastResultRef.current   = result;
                lastSpokenAtRef.current = now;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                speakRef.current(result, 'high');
            } else if (!similar) {
                if ((now - lastSpokenAtRef.current) >= MIN_SPEAK_GAP_MS) {
                    lastResultRef.current   = result;
                    lastSpokenAtRef.current = now;
                    speakRef.current(result, 'normal');
                }
            }

            frameCountRef.current += 1;
        } catch (err) {
            console.warn('[WatchMode] frame error:', err?.message);
        } finally {
            isCapturingRef.current = false;
        }
    }, [cameraRef]);

    const scheduleNext = useCallback(() => {
        if (!watchingRef.current) return;
        timerRef.current = setTimeout(() => {
            captureAndAnalyze().finally(() => { if (watchingRef.current) scheduleNext(); });
        }, INTERVAL_MS);
    }, [captureAndAnalyze]);

    const startWatch = useCallback(async () => {
        if (watchingRef.current) return;

        // Check battery before starting — refuse at critical level
        try {
            const [level, state] = await Promise.all([
                Battery.getBatteryLevelAsync(),
                Battery.getBatteryStateAsync(),
            ]);
            const isCharging = state === Battery.BatteryState.CHARGING
                             || state === Battery.BatteryState.FULL;
            const ar = langRef.current === 'ar';

            if (!isCharging && level <= BATTERY_STOP_LEVEL) {
                const msg = ar
                    ? n('البطارية منخفضة جداً. لا يمكن تشغيل المراقبة.')
                    : 'Battery too low to start watch mode. Please charge first.';
                speakRef.current(msg, 'high');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;  // abort start
            }
        } catch { /* simulator / unavailable — proceed */ }

        watchingRef.current     = true;
        lastResultRef.current   = '';
        lastSpokenAtRef.current = 0;
        isCapturingRef.current  = false;
        batteryWarnedRef.current = false;  // reset warning flag each session
        setWatching(true);
        frameCountRef.current   = 0;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const msg = langRef.current === 'ar'
            ? n('وَضع المراقبة مُفعَّل. سأخبرك عند تغيّر المشهد.')
            : "Watch mode on. I'll speak when something changes.";
        speakRef.current(msg, 'high');

        // Start periodic battery checks on their own timer
        startBatteryChecks();

        setTimeout(() => {
            if (watchingRef.current) {
                captureAndAnalyze().finally(() => { if (watchingRef.current) scheduleNext(); });
            }
        }, 1400);
    }, [captureAndAnalyze, scheduleNext, startBatteryChecks]);

    const stopWatch = useCallback(() => {
        if (!watchingRef.current) return;
        watchingRef.current    = false;
        isCapturingRef.current = false;
        clearTimeout(timerRef.current);
        clearInterval(batteryTimerRef.current);
        lastResultRef.current  = '';
        setWatching(false);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const msg = langRef.current === 'ar' ? n('تمَّ إيقاف المراقبة.') : 'Watch mode off.';
        speakRef.current(msg, 'high');
    }, []);

    const toggleWatch = useCallback(() => {
        if (watchingRef.current) stopWatch();
        else startWatch();
    }, [startWatch, stopWatch]);

    useEffect(() => () => {
        watchingRef.current = false;
        clearTimeout(timerRef.current);
        clearInterval(batteryTimerRef.current);
    }, []);

    return { watching, startWatch, stopWatch, toggleWatch };
}
