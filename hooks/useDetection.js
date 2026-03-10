/**
 * useDetection.js — ML Kit offline + optional Gemini online
 */

import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

// ── ML Kit imports ────────────────────────────────────────────────────────────
let ImageLabeler    = null;
let TextRecognizer  = null;

try { ImageLabeler   = require('@react-native-ml-kit/image-labeling').default;  } catch (e) {}
try { TextRecognizer = require('@react-native-ml-kit/text-recognition').default; } catch (e) {}

// ── Optional Gemini key — app works fully without this ────────────────────────
const GEMINI_KEY = 'PASTE_YOUR_KEY_HERE';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`;

const GEMINI_PROMPTS = {
    scene:  `Describe this image for a blind person in ONE sentence, max 15 words. Use spatial words (ahead, left, right). Mention obstacles first. Start directly — no "I see".`,
    object: `Identify the main object for a blind person in ONE sentence, max 15 words. Name it and add one useful detail. Start directly.`,
    read:   `Read ALL visible text in this image exactly as written. If no text, say only: "No text found."`,
    people: `Describe the people in this image for a blind person in ONE sentence, max 20 words. Count them, use spatial words. If none: "No people detected."`,
};

// ── Gemini ────────────────────────────────────────────────────────────────────
async function detectWithGemini(base64, mode) {
    if (!GEMINI_KEY || GEMINI_KEY === 'PASTE_YOUR_KEY_HERE') throw new Error('no key');
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 15000);
    try {
        const res = await fetch(GEMINI_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            signal:  controller.signal,
            body: JSON.stringify({
                contents: [{ parts: [
                    { inline_data: { mime_type: 'image/jpeg', data: base64 } },
                    { text: GEMINI_PROMPTS[mode] || GEMINI_PROMPTS.scene },
                ]}],
                generationConfig: {
                    maxOutputTokens: mode === 'read' ? 500 : 80,
                    temperature:     mode === 'read' ? 0.0 : 0.2,
                },
            }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error('empty response');
        return text;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ── Write base64 to temp file, run fn(path), delete temp file ────────────────
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

// ── Image labeling — scene / object / people ──────────────────────────────────
async function detectLabels(base64, mode) {
    if (!ImageLabeler) throw new Error('ML Kit image-labeling not installed');

    return withTempFile(base64, async (path) => {
        const labels = await ImageLabeler.label(path);

        if (!labels || labels.length === 0) {
            if (mode === 'people') return 'No people detected.';
            return 'Nothing clearly identified. Try pointing the camera more directly.';
        }

        const names = labels
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5)
        .map(l => l.text || l.label || '')
        .filter(Boolean);

        if (names.length === 0) return 'Could not identify what is in view.';

        if (mode === 'people') {
            const hasPerson = names.some(n =>
                /person|human|face|man|woman|boy|girl|child|people|crowd/i.test(n)
            );
            return hasPerson
                ? `Person detected nearby. Also: ${names.slice(0, 3).join(', ')}.`
                : `No people detected. I see: ${names.slice(0, 3).join(', ')}.`;
        }

        if (mode === 'object') {
            return names.length === 1 ? `${names[0]}.` : `${names[0]}, also ${names[1]}.`;
        }

        // scene
        if (names.length === 1) return `${names[0]} ahead.`;
        if (names.length === 2) return `${names[0]} and ${names[1]} ahead.`;
        return `${names[0]}, ${names[1]}, and ${names[2]} nearby.`;
    });
}

// ── Text recognition — read mode ──────────────────────────────────────────────
async function detectText(base64) {
    if (!TextRecognizer) throw new Error('ML Kit text-recognition not installed');

    return withTempFile(base64, async (path) => {
        const result = await TextRecognizer.recognize(path);
        const text   = result?.text?.trim();
        return text || 'No text found.';
    });
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useDetection() {

    const detect = useCallback(async (base64, mode, isConnected) => {

        // Try Gemini online first if key is configured
        if (isConnected && GEMINI_KEY !== 'PASTE_YOUR_KEY_HERE') {
            try {
                const result = await detectWithGemini(base64, mode);
                return { result, source: 'online' };
            } catch (err) {
                console.warn('[Abserny] Gemini failed, falling back to ML Kit:', err.message);
            }
        }

        // ML Kit offline
        try {
            const result = mode === 'read'
                ? await detectText(base64)
                : await detectLabels(base64, mode);
            return { result, source: 'offline' };
        } catch (err) {
            console.warn('[Abserny] ML Kit error:', err.message);
            return {
                result: `Detection error: ${err.message}`,
                source: 'error',
            };
        }

    }, []);

    return { detect };
}
