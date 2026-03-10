/**
 * useDetection.js — Gemini online + ML Kit offline
 *
 * Online:  Gemini 2.0 Flash Lite — full natural sentences
 * Offline: ML Kit image labeling + text recognition — real on-device AI
 *
 * Add your Gemini key below. Get one free at: https://aistudio.google.com
 */

import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

// ─────────────────────────────────────────────────────────────────────────────
//  YOUR GEMINI KEY ↓  (app works offline without it)
// ─────────────────────────────────────────────────────────────────────────────
const GEMINI_KEY = 'PASTE_YOUR_KEY_HERE';
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_URL  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`;
const TIMEOUT_MS  = 15000;

// ── Prompts ───────────────────────────────────────────────────────────────────
const PROMPTS = {
    scene: `You are a navigation assistant for a blind person. Describe the scene in ONE clear sentence, max 15 words.
Rules:
- Mention hazards and obstacles FIRST (steps, doors, people blocking path)
- Use spatial directions: ahead, to your left, to your right, nearby, behind
- Mention people before objects
- Max 4 items
- Never start with "I see", "I can see", "There is", "The image shows"
- Be direct. Example: "Steps ahead, a table to your left, person nearby on your right."`,

    object: `You are an assistant for a blind person identifying objects. ONE sentence, max 15 words.
- Name the specific object precisely
- Add one important detail: state, color, orientation, brand if relevant
- Never start with "I see" or "There is"
- Example: "A blue medicine bottle with the cap open."`,

    read: `You are an assistant for a blind person. Read ALL text visible in this image.
- Read every word exactly as written, left to right, top to bottom
- Include ALL text: signs, labels, menus, screens, documents, buttons
- Separate sections with a pause (comma or period)
- If no text is visible at all, say only: "No text found."
- Do NOT describe the image, ONLY read the text`,

    people: `You are a navigation assistant for a blind person. Describe people in the scene. ONE sentence, max 20 words.
- Count how many people
- Where they are relative to the viewer: ahead, left, right, nearby
- What they appear to be doing if relevant
- If no people at all, say exactly: "No people detected."
- Example: "Two people ahead, one walking toward you, one standing to your right."`,
};

const MAX_TOKENS  = { scene: 80, object: 60, read: 400, people: 80 };
const TEMPERATURE = { scene: 0.2, object: 0.15, read: 0.0, people: 0.2 };

// ── ML Kit imports ────────────────────────────────────────────────────────────
let ImageLabeler   = null;
let TextRecognizer = null;
try { ImageLabeler   = require('@react-native-ml-kit/image-labeling').default;  } catch (_) {}
try { TextRecognizer = require('@react-native-ml-kit/text-recognition').default; } catch (_) {}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
async function detectWithGemini(base64, mode) {
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
                    { text: PROMPTS[mode] || PROMPTS.scene },
                ]}],
                generationConfig: {
                    maxOutputTokens: MAX_TOKENS[mode]  ?? 80,
                    temperature:     TEMPERATURE[mode] ?? 0.2,
                },
            }),
        });

        const data = await response.json();

        if (data.error) throw new Error(`Gemini: ${data.error.message}`);

        const candidate = data.candidates?.[0];
        if (!candidate) throw new Error('Gemini: no candidates');
        if (candidate.finishReason === 'SAFETY') throw new Error('Gemini: safety block');

        const text = candidate?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error('Gemini: empty response');

        return text;

    } finally {
        clearTimeout(timeoutId);
    }
}

// ── ML Kit — image labels ─────────────────────────────────────────────────────
async function detectWithLabels(base64, mode) {
    if (!ImageLabeler) throw new Error('ML Kit not installed');

    return withTempFile(base64, async (path) => {
        const labels = await ImageLabeler.label(path);

        if (!labels || labels.length === 0) {
            return mode === 'people'
                ? 'No people detected.'
                : 'Nothing clearly identified. Try pointing the camera more directly.';
        }

        const names = labels
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 6)
            .map(l => (l.text || l.label || '').trim().toLowerCase())
            .filter(Boolean);

        if (names.length === 0) return 'Nothing identified in view.';

        if (mode === 'people') {
            const personTerms = /person|human|face|man|woman|boy|girl|child|people|crowd|body/i;
            const hasPerson = names.some(n => personTerms.test(n));
            if (!hasPerson) return `No people detected. I see: ${names.slice(0, 3).join(', ')}.`;
            const others = names.filter(n => !personTerms.test(n)).slice(0, 2);
            return others.length
                ? `Person detected nearby. Also: ${others.join(', ')}.`
                : 'Person detected nearby.';
        }

        if (mode === 'object') {
            return names.length === 1
                ? `${names[0]}.`
                : `${names[0]}, also ${names[1]}.`;
        }

        // scene
        const top = names.slice(0, 4);
        if (top.length === 1) return `${top[0]} ahead.`;
        if (top.length === 2) return `${top[0]} and ${top[1]} ahead.`;
        return `${top[0]}, ${top[1]}, and ${top[2]} nearby.`;
    });
}

// ── ML Kit — text recognition ─────────────────────────────────────────────────
async function detectWithText(base64) {
    if (!TextRecognizer) throw new Error('ML Kit text recognition not installed');

    return withTempFile(base64, async (path) => {
        const result = await TextRecognizer.recognize(path);
        const text   = result?.text?.trim();
        return text || 'No text found.';
    });
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useDetection() {

    const detect = useCallback(async (base64, mode, isConnected) => {

        const hasKey = GEMINI_KEY && GEMINI_KEY !== 'PASTE_YOUR_KEY_HERE';

        // 1. Gemini online
        if (isConnected && hasKey) {
            try {
                const result = await detectWithGemini(base64, mode);
                return { result, source: 'online' };
            } catch (err) {
                console.warn('[Abserny] Gemini failed, using ML Kit:', err.message);
                // Fall through to ML Kit
            }
        }

        // 2. ML Kit offline
        try {
            const result = mode === 'read'
                ? await detectWithText(base64)
                : await detectWithLabels(base64, mode);
            return { result, source: 'offline' };
        } catch (err) {
            console.warn('[Abserny] ML Kit error:', err.message);
            return {
                result: hasKey
                    ? 'Detection failed. Check your internet connection.'
                    : 'Add your Gemini key to useDetection.js for online detection.',
                source: 'error',
            };
        }

    }, []);

    return { detect };
}
