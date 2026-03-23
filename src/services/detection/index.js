/**
 * services/detection/index.js
 * Unified detect() — picks the right tier: Gemini → ML Kit → TFLite.
 * This is the only file hooks/useDetection.js needs to import from.
 */

import { detectWithGemini, getActiveKey, hasKeys } from './gemini';
import { detectWithTFLite, ensureModel }           from './tflite';
import { detectWithText }                          from './mlkit';
import { normalizeArabicForTTS }                   from '../tts/normalize';

// Pre-warm the TFLite model at import time (singleton, loads once)
ensureModel().catch(() => {});

export { hasKeys, getActiveKey };

/**
 * detect(base64, mode, isConnected, lang, context?)
 * Returns { result: string, source: 'gemini' | 'tflite' | 'mlkit_text' | 'error' }
 *
 * context: optional previous scene description — used only in watch mode
 *          to give Gemini genuine change-detection context.
 */
export async function detect(base64, mode, isConnected, lang = 'en', context = '') {
    const keysAvailable = getActiveKey() !== null;
    console.log(`[Abserny] detect() — mode:${mode} connected:${isConnected} hasKeys:${keysAvailable} lang:${lang}`);

    // Tier 1: Gemini (online + keys available)
    if (isConnected && keysAvailable) {
        try {
            const result = await detectWithGemini(base64, mode, lang, context);
            return {
                result: lang === 'ar' ? normalizeArabicForTTS(result) : result,
                source: 'gemini',
            };
        } catch (err) {
            console.warn(`[Abserny] Gemini FAILED: ${err.message}`);
        }
    }

    // Tier 2a: ML Kit (read mode offline)
    if (mode === 'read') {
        try {
            return { result: await detectWithText(base64, lang), source: 'mlkit_text' };
        } catch (err) {
            console.warn(`[Abserny] ML Kit FAILED: ${err.message}`);
            return {
                result: lang === 'ar' ? normalizeArabicForTTS('لا يوجد نص.') : 'No text found.',
                source: 'error',
            };
        }
    }

    // Tier 2b: TFLite (all other modes offline)
    try {
        const result = await detectWithTFLite(base64, mode, lang);
        return { result, source: 'tflite' };
    } catch (err) {
        console.warn(`[Abserny] TFLite FAILED: ${err.message}`);
        return {
            result: mode === '__watch__'
                ? (lang === 'ar' ? 'واضح' : 'CLEAR')
                : (lang === 'ar'
                    ? normalizeArabicForTTS('لم يُتعرَّف على شيء.')
                    : 'Detection unavailable.'),
            source: 'error',
        };
    }
}
