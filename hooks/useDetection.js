/**
 * useDetection.js — Gemini online + ML Kit offline, bilingual
 * Add your Gemini key below. Get one free at: https://aistudio.google.com
 */

import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { GEMINI_PROMPTS } from './useLanguage';

// ─────────────────────────────────────────────────────────────────────────────
const GEMINI_KEY = 'PASTE_YOUR_KEY_HERE';
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_URL  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`;
const TIMEOUT_MS  = 15000;
const MAX_TOKENS  = { scene: 80, object: 60, read: 400, people: 80 };
const TEMPERATURE = { scene: 0.2, object: 0.15, read: 0.0, people: 0.2 };

// ── ML Kit ────────────────────────────────────────────────────────────────────
let ImageLabeler   = null;
let TextRecognizer = null;
try { ImageLabeler   = require('@react-native-ml-kit/image-labeling').default;  } catch (_) {}
try { TextRecognizer = require('@react-native-ml-kit/text-recognition').default; } catch (_) {}

async function withTempFile(base64, fn) {
    const path = FileSystem.cacheDirectory + 'abserny_tmp.jpg';
    await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
    });
    try {
        return await fn(path);
    } finally {
        await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    }
}

// ── Gemini ────────────────────────────────────────────────────────────────────
async function detectWithGemini(base64, mode, lang) {
    const prompts    = GEMINI_PROMPTS[lang] || GEMINI_PROMPTS.en;
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(GEMINI_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            signal:  controller.signal,
            body: JSON.stringify({
                contents: [{ parts: [
                    { inline_data: { mime_type: 'image/jpeg', data: base64 } },
                    { text: prompts[mode] || prompts.scene },
                ]}],
                generationConfig: {
                    maxOutputTokens: MAX_TOKENS[mode]  ?? 80,
                    temperature:     TEMPERATURE[mode] ?? 0.2,
                },
            }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const candidate = data.candidates?.[0];
        if (!candidate) throw new Error('no candidates');
        if (candidate.finishReason === 'SAFETY') throw new Error('safety block');

        const text = candidate?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error('empty response');
        return text;

    } finally {
        clearTimeout(timeoutId);
    }
}

// ── ML Kit offline ────────────────────────────────────────────────────────────
const OFFLINE_MSGS = {
    en: {
        no_labels:  'Nothing clearly identified. Try pointing the camera more directly.',
        no_people:  'No people detected.',
        no_text:    'No text found.',
        person:     (others) => others.length ? `Person detected nearby. Also: ${others.join(', ')}.` : 'Person detected nearby.',
        object:     (names)  => names.length === 1 ? `${names[0]}.` : `${names[0]}, also ${names[1]}.`,
        scene:      (names)  => names.length === 1 ? `${names[0]} ahead.` : names.length === 2 ? `${names[0]} and ${names[1]} ahead.` : `${names[0]}, ${names[1]}, and ${names[2]} nearby.`,
    },
    ar: {
        no_labels:  'لم يتم التعرف على أي شيء. حاول توجيه الكاميرا بشكل مباشر أكثر.',
        no_people:  'لا يوجد أشخاص.',
        no_text:    'لا يوجد نص.',
        person:     (others) => others.length ? `شخص بالقرب. أرى أيضاً: ${others.join('، ')}.` : 'شخص بالقرب.',
        object:     (names)  => names.length === 1 ? `${names[0]}.` : `${names[0]}، وأيضاً ${names[1]}.`,
        scene:      (names)  => names.length === 1 ? `${names[0]} أمامك.` : names.length === 2 ? `${names[0]} و${names[1]} أمامك.` : `${names[0]}، ${names[1]}، و${names[2]} بالقرب.`,
    },
};

async function detectWithLabels(base64, mode, lang) {
    if (!ImageLabeler) throw new Error('ML Kit not installed');
    const msgs = OFFLINE_MSGS[lang] || OFFLINE_MSGS.en;

    return withTempFile(base64, async (path) => {
        const labels = await ImageLabeler.label(path);
        if (!labels || labels.length === 0) {
            return mode === 'people' ? msgs.no_people : msgs.no_labels;
        }

        const names = labels
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 6)
        .map(l => (l.text || l.label || '').trim().toLowerCase())
        .filter(Boolean);

        if (names.length === 0) return msgs.no_labels;

        if (mode === 'people') {
            const personTerms = /person|human|face|man|woman|boy|girl|child|people|crowd/i;
            const hasPerson   = names.some(n => personTerms.test(n));
            if (!hasPerson) return msgs.no_people;
            const others = names.filter(n => !personTerms.test(n)).slice(0, 2);
            return msgs.person(others);
        }

        if (mode === 'object') return msgs.object(names);

        return msgs.scene(names.slice(0, 4));
    });
}

async function detectWithText(base64, lang) {
    if (!TextRecognizer) throw new Error('ML Kit text recognition not installed');
    const msgs = OFFLINE_MSGS[lang] || OFFLINE_MSGS.en;

    return withTempFile(base64, async (path) => {
        const result = await TextRecognizer.recognize(path);
        const text   = result?.text?.trim();
        return text || msgs.no_text;
    });
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useDetection() {

    const detect = useCallback(async (base64, mode, isConnected, lang = 'en') => {
        const hasKey = GEMINI_KEY && GEMINI_KEY !== 'PASTE_YOUR_KEY_HERE';

        // Gemini online
        if (isConnected && hasKey) {
            try {
                const result = await detectWithGemini(base64, mode, lang);
                return { result, source: 'online' };
            } catch (err) {
                console.warn('[Abserny] Gemini failed, using ML Kit:', err.message);
            }
        }

        // ML Kit offline
        try {
            const result = mode === 'read'
                ? await detectWithText(base64, lang)
                : await detectWithLabels(base64, mode, lang);
            return { result, source: 'offline' };
        } catch (err) {
            console.warn('[Abserny] ML Kit error:', err.message);
            return {
                result: lang === 'ar'
                    ? 'فشل الكشف. تحقق من اتصال الإنترنت.'
                    : 'Detection failed. Check your internet connection.',
                source: 'error',
            };
        }
    }, []);

    return { detect };
}
