/**
 * services/detection/gemini.js
 * Gemini API — key pool, rotation, request, response extraction.
 * Edit this file when: changing model, timeout, key rotation logic, payload.
 */

import Constants from 'expo-constants';
import { GEMINI_PROMPTS, WATCH_PROMPTS, buildWatchPrompt } from '../../i18n/prompts';

// ── Key pool ──────────────────────────────────────────────────────────────────
const RAW_KEYS = (() => {
    const extra = Constants.expoConfig?.extra ?? {};
    if (Array.isArray(extra.geminiKeys) && extra.geminiKeys.length > 0) {
        return extra.geminiKeys.filter(
            k => k && k.length > 20 && !k.startsWith('PASTE') && !k.startsWith('YOUR')
        );
    }
    if (extra.geminiKey && extra.geminiKey.length > 20
        && !extra.geminiKey.startsWith('PASTE') && !extra.geminiKey.startsWith('YOUR')) {
        return [extra.geminiKey];
    }
    return [];
})();

function getPacificDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

const keyState = { idx: 0, exhausted: new Map() };
if (__DEV__) { keyState.exhausted.clear(); }

function isExhausted(k)   { return keyState.exhausted.get(k) === getPacificDate(); }
function markExhausted(k) {
    keyState.exhausted.set(k, getPacificDate());
    console.warn(`[Abserny] Key ...${k.slice(-6)} RPD exhausted`);
}
function rotateKey() { keyState.idx = (keyState.idx + 1) % Math.max(1, RAW_KEYS.length); }

export function getActiveKey() {
    if (!RAW_KEYS.length) return null;
    for (let i = 0; i < RAW_KEYS.length; i++) {
        const k = RAW_KEYS[(keyState.idx + i) % RAW_KEYS.length];
        if (!isExhausted(k)) { keyState.idx = (keyState.idx + i) % RAW_KEYS.length; return k; }
    }
    return null;
}

export function hasKeys() { return getActiveKey() !== null; }

// ── Config ────────────────────────────────────────────────────────────────────
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=';
const TIMEOUT_MS  = 20000;

const MAX_TOKENS  = { scene: 80, object: 60, read: 400, people: 80, __watch__: 40 };
const TEMPERATURE = { scene: 0.2, object: 0.15, read: 0.0, people: 0.2, __watch__: 0.1 };

// ── Main export ───────────────────────────────────────────────────────────────
// context: optional — previous scene description for watch mode continuity.
//          Ignored for all other modes.
export async function detectWithGemini(base64, mode, lang, context = '') {
    const prompt = mode === '__watch__'
        ? buildWatchPrompt(lang, context)
        : ((GEMINI_PROMPTS[lang] ?? GEMINI_PROMPTS.en)[mode] ?? GEMINI_PROMPTS.en[mode]);

    const body = JSON.stringify({
        contents: [{ parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
            { text: prompt },
        ]}],
        generationConfig: {
            maxOutputTokens: MAX_TOKENS[mode] ?? 80,
            temperature:     TEMPERATURE[mode] ?? 0.2,
        },
    });

    const tryKey = async (key) => {
        const ctrl   = new AbortController();
        const tid    = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        const t0     = Date.now();
        const sizeKB = Math.round(base64.length * 0.75 / 1024);
        try {
            console.log(`[Abserny] Gemini → key ...${key.slice(-6)} payload~${sizeKB}KB`);
            const res = await fetch(GEMINI_BASE + key, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: ctrl.signal,
                body,
            });
            console.log(`[Abserny] Gemini ← HTTP ${res.status} in ${Date.now() - t0}ms`);
            return { status: res.status, data: await res.json() };
        } catch (err) {
            const elapsed = Date.now() - t0;
            if (err.name === 'AbortError') throw new Error(`Gemini timed out after ${elapsed}ms`);
            throw new Error(`Gemini network error after ${elapsed}ms: ${err.message}`);
        } finally {
            clearTimeout(tid);
        }
    };

    const extract = (data) => {
        if (data.error) throw new Error(data.error.message);
        const c = data.candidates?.[0];
        if (!c) throw new Error('no candidates');
        if (c.finishReason === 'SAFETY') throw new Error('safety block');
        const text = c?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error('empty response');
        return text;
    };

    let lastError = 'all keys exhausted';
    for (let attempt = 0; attempt < RAW_KEYS.length; attempt++) {
        const key = getActiveKey();
        if (!key) break;

        let status, data;
        try {
            ({ status, data } = await tryKey(key));
        } catch (networkErr) {
            throw networkErr;
        }

        if (status === 200) return extract(data);

        if (status === 429) {
            const msg = (data?.error?.message ?? '').toLowerCase();
            if (msg.includes('daily') || msg.includes('quota exceeded')) markExhausted(key);
            rotateKey();
            lastError = `rate limited on key ...${key.slice(-6)}`;
            continue;
        }

        throw new Error(`Gemini HTTP ${status}: ${data?.error?.message ?? 'unknown'}`);
    }

    throw new Error(lastError);
}
