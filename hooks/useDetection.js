/**
 * useDetection.js
 * Handles AI detection. Online → Gemini 2.0 Flash Lite.
 * Offline → simple label from TFLite (placeholder until model is ready).
 *
 * Returns: detect(base64Image, mode) → string description
 */

import { useCallback } from 'react';

const GEMINI_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your key
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`;
const TIMEOUT_MS = 12000;

// ── Prompts per mode ──────────────────────────────────────────────────────────
const PROMPTS = {
    scene: `You help visually impaired people understand their surroundings.
Describe what you see in 1 short sentence, max 12 words.
Rules:
- Mention obstacles or stairs FIRST if present
- Use spatial words: ahead, to your left, to your right, nearby
- People before objects
- List max 4 things
- Do NOT say "I can see" or "There is" — start directly
- Example: "A chair and desk ahead, person to your left."`,

    object: `You help a visually impaired person identify what they are holding or touching.
Describe the object in 1 sentence, max 10 words.
Be direct. Example: "A plastic water bottle, cap is on."`,

    read: `Read all visible text in this image.
Read it exactly as written, nothing else.
If no text is visible say: "No text found."`,

    people: `You help a visually impaired person detect people nearby.
Only describe people in the image.
How many, where they are, what they seem to be doing. Max 10 words.
If no people: "No people detected."`,
};

export function useDetection() {

    const detectOnline = useCallback(async (base64, mode) => {
        const prompt = PROMPTS[mode] || PROMPTS.scene;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const res = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
                            { text: prompt },
                        ],
                    }],
                    generationConfig: {
                        maxOutputTokens: 60,
                        temperature: 0.2,
                    },
                }),
            });

            const data = await res.json();

            if (data.error) throw new Error(data.error.message);

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (!text) throw new Error('Empty response');

            return { result: text, source: 'online' };

        } finally {
            clearTimeout(timeout);
        }
    }, []);

    // Offline fallback — returns basic result from TFLite
    // Replace this body when your TFLite model is integrated
    const detectOffline = useCallback(async (base64, mode) => {
        // TODO: integrate TFLite model here
        // For now returns a placeholder so the app doesn't crash offline
        return {
            result: 'Offline mode. Connect to internet for full descriptions.',
            source: 'offline',
        };
    }, []);

    const detect = useCallback(async (base64, mode, isConnected) => {
        if (isConnected) {
            try {
                return await detectOnline(base64, mode);
            } catch (e) {
                // If online fails, try offline
                console.warn('Online detection failed:', e.message);
                return await detectOffline(base64, mode);
            }
        } else {
            return await detectOffline(base64, mode);
        }
    }, [detectOnline, detectOffline]);

    return { detect };
}
