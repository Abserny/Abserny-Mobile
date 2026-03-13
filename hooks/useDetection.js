/**
 * useDetection.js — Gemini online + ML Kit offline, bilingual
 * Supports 4 standard modes + __watch__ for continuous watch mode.
 *
 * HOW TO SET YOUR API KEYS:
 *   In app.json under "expo" → "extra":
 *     "geminiKeys": ["KEY_1", "KEY_2", "KEY_3"]
 *   Each key should be from a DIFFERENT Google account — keys from the
 *   same account share the same quota and rotation won't help.
 *   Get free keys at: https://aistudio.google.com
 *
 * HOW KEY ROTATION WORKS:
 *   - Keys are tried in order starting from the current active key.
 *   - On HTTP 429 (rate limited): rotate to next key immediately, retry once.
 *   - On RPM limit: the rotated key works right away.
 *   - On RPD limit: key is marked exhausted for the rest of the day
 *     (resets at midnight Pacific). Rotation skips exhausted keys.
 *   - On any other error (network, safety block, etc.): no rotation,
 *     fall through to ML Kit immediately.
 *   - If ALL keys are exhausted: fall through to ML Kit.
 */

import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { GEMINI_PROMPTS } from './useLanguage';
import { WATCH_PROMPTS }  from './useWatchMode';

// ── Key pool ──────────────────────────────────────────────────────────────────
// Read array of keys from app.json extra.geminiKeys.
// Falls back to single extra.geminiKey for backwards compatibility.
const RAW_KEYS = (() => {
    const extra = Constants.expoConfig?.extra ?? {};
    if (Array.isArray(extra.geminiKeys) && extra.geminiKeys.length > 0) {
        return extra.geminiKeys.filter(k => k && k.length > 10);
    }
    if (extra.geminiKey && extra.geminiKey.length > 10) {
        return [extra.geminiKey];
    }
    return [];
})();

// ── Key rotation state (module-level — persists across hook instances) ────────
// Midnight Pacific = UTC-8 (UTC-7 during DST). We approximate by using
// the calendar date in UTC-8 as the "day" key for exhaustion tracking.
function getPacificDateString() {
    const now = new Date();
    const pacificOffset = -8 * 60; // minutes, approximate (ignores DST)
    const pacific = new Date(now.getTime() + pacificOffset * 60 * 1000);
    return pacific.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

const keyState = {
    currentIndex: 0,
    // Map of key → date-string when it was marked RPD-exhausted
    exhaustedOn: new Map(),
};

function isExhausted(key) {
    const day = keyState.exhaustedOn.get(key);
    return day === getPacificDateString();
}

function markExhausted(key) {
    keyState.exhaustedOn.set(key, getPacificDateString());
    console.warn(`[Abserny] Key ending ...${key.slice(-6)} RPD exhausted for today.`);
}

// Returns the next non-exhausted key starting from currentIndex.
// Returns null if all keys are exhausted.
function getActiveKey() {
    if (RAW_KEYS.length === 0) return null;
    const start = keyState.currentIndex % RAW_KEYS.length;
    for (let i = 0; i < RAW_KEYS.length; i++) {
        const idx = (start + i) % RAW_KEYS.length;
        const key = RAW_KEYS[idx];
        if (!isExhausted(key)) {
            keyState.currentIndex = idx;
            return key;
        }
    }
    return null; // all exhausted
}

function rotateKey() {
    if (RAW_KEYS.length <= 1) return;
    keyState.currentIndex = (keyState.currentIndex + 1) % RAW_KEYS.length;
    console.log(`[Abserny] Rotated to key index ${keyState.currentIndex}`);
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=';
const TIMEOUT_MS  = 12000;

const MAX_TOKENS = {
    scene: 80, object: 60, read: 400, people: 80,
    __watch__: 40,
};
const TEMPERATURE = {
    scene: 0.2, object: 0.15, read: 0.0, people: 0.2,
    __watch__: 0.1,
};

// ── ML Kit (loaded lazily — fails gracefully if not installed) ────────────────
let ImageLabeler   = null;
let TextRecognizer = null;
try { ImageLabeler   = require('@react-native-ml-kit/image-labeling').default;  } catch (_) {}
try { TextRecognizer = require('@react-native-ml-kit/text-recognition').default; } catch (_) {}

// FIX #3: Arabic translation map for common ML Kit English label strings.
// ML Kit always returns English — this translates the most frequent ones
// so Arabic-mode users don't hear mixed-language results.
const AR_LABEL_MAP = {
    // People
    'person': 'شخص', 'human': 'إنسان', 'face': 'وجه', 'man': 'رجل',
    'woman': 'امرأة', 'boy': 'ولد', 'girl': 'فتاة', 'child': 'طفل',
    'people': 'أشخاص', 'crowd': 'حشد',
    // Furniture / indoor
    'chair': 'كرسي', 'table': 'طاولة', 'desk': 'مكتب', 'sofa': 'أريكة',
    'bed': 'سرير', 'door': 'باب', 'window': 'نافذة', 'wall': 'جدار',
    'floor': 'أرضية', 'ceiling': 'سقف', 'shelf': 'رف', 'lamp': 'مصباح',
    // Outdoor
    'car': 'سيارة', 'road': 'طريق', 'street': 'شارع', 'sidewalk': 'رصيف',
    'tree': 'شجرة', 'building': 'مبنى', 'sky': 'سماء', 'grass': 'عشب',
    'stairs': 'درج', 'step': 'درجة', 'curb': 'حافة رصيف',
    // Objects
    'bottle': 'زجاجة', 'cup': 'كوب', 'glass': 'كأس', 'phone': 'هاتف',
    'laptop': 'حاسوب محمول', 'book': 'كتاب', 'bag': 'حقيبة',
    'food': 'طعام', 'drink': 'مشروب', 'plant': 'نبتة',
    // Fallback — common generic labels
    'object': 'شيء', 'furniture': 'أثاث', 'vehicle': 'مركبة',
    'indoor': 'داخلي', 'outdoor': 'خارجي', 'text': 'نص',
};

function translateLabel(label, lang) {
    if (lang !== 'ar') return label;
    return AR_LABEL_MAP[label.toLowerCase()] ?? label;
}

// FIX #2: unique temp file per call — prevents concurrent calls clobbering each other
async function withTempFile(base64, fn) {
    const path = `${FileSystem.cacheDirectory}abserny_tmp_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
    });
    try {
        return await fn(path);
    } finally {
        FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    }
}

// ── Gemini (with key rotation) ────────────────────────────────────────────────
// Attempts the request with the current active key.
// On 429: distinguishes RPM vs RPD, rotates key, retries once.
// On any other failure: throws immediately (no rotation).
async function detectWithGemini(base64, mode, lang) {
    let prompt;
    if (mode === '__watch__') {
        prompt = WATCH_PROMPTS[lang] ?? WATCH_PROMPTS.en;
    } else {
        const prompts = GEMINI_PROMPTS[lang] ?? GEMINI_PROMPTS.en;
        prompt = prompts[mode] ?? prompts.scene;
    }

    const body = JSON.stringify({
        contents: [{ parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
            { text: prompt },
        ]}],
        generationConfig: {
            maxOutputTokens: MAX_TOKENS[mode]  ?? 80,
            temperature:     TEMPERATURE[mode] ?? 0.2,
        },
    });

    // Inner fetch — tries one specific key, returns parsed data or throws
    const tryKey = async (key) => {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const response = await fetch(GEMINI_BASE + key, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body,
            });
            const data = await response.json();
            return { status: response.status, data };
        } finally {
            clearTimeout(timeoutId);
        }
    };

    // Parse a successful response object into text, or throw
    const extractText = (data) => {
        if (data.error) throw new Error(data.error.message);
        const candidate = data.candidates?.[0];
        if (!candidate) throw new Error('no candidates');
        if (candidate.finishReason === 'SAFETY') throw new Error('safety block');
        const text = candidate?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error('empty response');
        return text;
    };

    // ── Attempt 1: current active key ─────────────────────────────────────────
    const key1 = getActiveKey();
    if (!key1) throw new Error('all keys exhausted');

    const { status: s1, data: d1 } = await tryKey(key1);

    if (s1 === 200) return extractText(d1);

    if (s1 === 429) {
        // Distinguish RPM (retry-after is short / message says "quota")
        // vs RPD (daily quota exceeded).
        const errMsg = (d1?.error?.message ?? '').toLowerCase();
        const isRPD  = errMsg.includes('daily') || errMsg.includes('quota exceeded');

        if (isRPD) {
            markExhausted(key1);
        }
        // Either way, rotate and try the next key
        rotateKey();
        const key2 = getActiveKey();
        if (!key2) throw new Error('all keys exhausted');

        console.log(`[Abserny] 429 on key1 (${isRPD ? 'RPD' : 'RPM'}), retrying with key2...`);
        const { status: s2, data: d2 } = await tryKey(key2);

        if (s2 === 200) return extractText(d2);

        // Second key also 429 — mark if RPD and give up (fall to ML Kit)
        if (s2 === 429) {
            const errMsg2 = (d2?.error?.message ?? '').toLowerCase();
            if (errMsg2.includes('daily') || errMsg2.includes('quota exceeded')) {
                markExhausted(key2);
            }
        }
        throw new Error(`429 on both keys: ${d2?.error?.message ?? 'rate limited'}`);
    }

    // Any other HTTP error — throw immediately, no rotation
    throw new Error(`Gemini HTTP ${s1}: ${d1?.error?.message ?? 'unknown'}`);
}

// ── ML Kit offline ────────────────────────────────────────────────────────────
const OFFLINE_MSGS = {
    en: {
        no_labels:   'Nothing clearly identified. Try pointing the camera more directly.',
        no_people:   'No people detected.',
        no_text:     'No text found.',
        watch_clear: 'CLEAR',
        person:      (o) => o.length ? `Person detected nearby. Also: ${o.join(', ')}.` : 'Person detected nearby.',
        object:      (n) => n.length === 1 ? `${n[0]}.` : `${n[0]}, also ${n[1]}.`,
        scene:       (n) => n.length === 1 ? `${n[0]} ahead.`
            : n.length === 2 ? `${n[0]} and ${n[1]} ahead.`
                : `${n[0]}, ${n[1]}, and ${n[2]} nearby.`,
    },
    ar: {
        no_labels:   'لم يتم التعرف على أي شيء. حاول توجيه الكاميرا بشكل مباشر أكثر.',
        no_people:   'لا يوجد أشخاص.',
        no_text:     'لا يوجد نص.',
        watch_clear: 'واضح',
        person:      (o) => o.length ? `شخص بالقرب. أرى أيضاً: ${o.join('، ')}.` : 'شخص بالقرب.',
        object:      (n) => n.length === 1 ? `${n[0]}.` : `${n[0]}، وأيضاً ${n[1]}.`,
        scene:       (n) => n.length === 1 ? `${n[0]} أمامك.`
            : n.length === 2 ? `${n[0]} و${n[1]} أمامك.`
                : `${n[0]}، ${n[1]}، و${n[2]} بالقرب.`,
    },
};

async function detectWithLabels(base64, mode, lang) {
    if (!ImageLabeler) throw new Error('ML Kit not installed');
    const msgs = OFFLINE_MSGS[lang] ?? OFFLINE_MSGS.en;

    return withTempFile(base64, async (path) => {
        const labels = await ImageLabeler.label(path);

        if (!labels || labels.length === 0) {
            if (mode === '__watch__') return msgs.watch_clear;
            return mode === 'people' ? msgs.no_people : msgs.no_labels;
        }

        // FIX #3: translate English labels to Arabic when in Arabic mode
        const names = labels
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 6)
        .map(l => {
            const raw = (l.text || l.label || '').trim().toLowerCase();
            return translateLabel(raw, lang);
        })
        .filter(Boolean);

        if (names.length === 0) return mode === '__watch__' ? msgs.watch_clear : msgs.no_labels;

        // Person detection uses English terms for the regex match (labels are
        // still English at this point — we translate after matching)
        const rawNames = labels
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 6)
        .map(l => (l.text || l.label || '').trim().toLowerCase())
        .filter(Boolean);

        const personTerms = /person|human|face|man|woman|boy|girl|child|people|crowd/i;

        if (mode === '__watch__') {
            const hasPerson = rawNames.some(n => personTerms.test(n));
            return hasPerson
                ? (lang === 'ar' ? 'شخص بالقرب.' : 'Person nearby.')
                : msgs.watch_clear;
        }

        if (mode === 'people') {
            const hasPerson = rawNames.some(n => personTerms.test(n));
            if (!hasPerson) return msgs.no_people;
            const others = rawNames
            .filter(n => !personTerms.test(n))
            .slice(0, 2)
            .map(n => translateLabel(n, lang));
            return msgs.person(others);
        }

        if (mode === 'object') return msgs.object(names);
        return msgs.scene(names.slice(0, 4));
    });
}

async function detectWithText(base64, lang) {
    if (!TextRecognizer) throw new Error('ML Kit text recognition not installed');
    const msgs = OFFLINE_MSGS[lang] ?? OFFLINE_MSGS.en;
    return withTempFile(base64, async (path) => {
        const result = await TextRecognizer.recognize(path);
        const text   = result?.text?.trim();
        return text || msgs.no_text;
    });
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useDetection() {

    const detect = useCallback(async (base64, mode, isConnected, lang = 'en') => {
        const hasKeys = getActiveKey() !== null;

        // Online — Gemini (with key rotation)
        if (isConnected && hasKeys) {
            try {
                const result = await detectWithGemini(base64, mode, lang);
                return { result, source: 'online' };
            } catch (err) {
                console.warn('[Abserny] Gemini failed, falling back to ML Kit:', err.message);
            }
        }

        // Offline — ML Kit
        try {
            const result = mode === 'read'
                ? await detectWithText(base64, lang)
                : await detectWithLabels(base64, mode, lang);
            return { result, source: 'offline' };
        } catch (err) {
            console.warn('[Abserny] ML Kit error:', err.message);
            const result = mode === '__watch__'
                ? 'CLEAR'
                : (lang === 'ar'
                    ? 'فشل الكشف. تحقق من اتصال الإنترنت.'
                    : 'Detection failed. Check your internet connection.');
            return { result, source: 'error' };
        }
    }, []);

    return { detect };
}
