/**
 * services/detection/mlkit.js
 * ML Kit text recognition — used for read mode when offline.
 * Edit this file if ML Kit's API changes.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { normalizeArabicForTTS } from '../tts/normalize';

let TextRecognizer = null;
try { TextRecognizer = require('@react-native-ml-kit/text-recognition').default; } catch (_) {}

async function withTempFile(base64, fn) {
    const path = `${FileSystem.cacheDirectory}abserny_tmp_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    try    { return await fn(path); }
    finally { FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {}); }
}

export async function detectWithText(base64, lang) {
    if (!TextRecognizer) throw new Error('ML Kit text recognition not available');
    return withTempFile(base64, async (path) => {
        const result = await TextRecognizer.recognize(path);
        const text   = result?.text?.trim();
        if (!text) return lang === 'ar' ? normalizeArabicForTTS('لا يوجد نص.') : 'No text found.';
        return lang === 'ar' ? normalizeArabicForTTS(text) : text;
    });
}
