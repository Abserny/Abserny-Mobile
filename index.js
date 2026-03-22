import { registerRootComponent } from 'expo';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── TTS prewarm ───────────────────────────────────────────────────────────────
// Fires at the earliest possible moment — before App.js is even parsed.
// On Android the TTS engine cold-start costs 1–4 s. This buys that time
// while Metro is still loading the rest of the JS bundle.
//
// volume: 0.05 — reliably above the silent-discard threshold on Samsung/MIUI/Pixel.
// Two utterances 400 ms apart — keeps the engine warm past the first callback.
(async () => {
    try {
        const lang = await AsyncStorage.getItem('abserny_language');
        const opts = {
            language: lang === 'ar' ? 'ar-SA' : 'en-US',
            volume: 0.05,
            rate: 0.5,
        };
        Speech.speak('\u00A0', opts);
        setTimeout(() => Speech.speak('\u00A0', opts), 400);
    } catch (_) {
        Speech.speak('\u00A0', { language: 'en-US', volume: 0.05, rate: 0.5 });
    }
})();

// ── TFLite model prewarm ──────────────────────────────────────────────────────
// Start loading the 23 MB model immediately — at the same time as the TTS
// prewarm — so it's ready before the user's first offline scan.
//
// ensureModel() is a singleton: calling it here and again inside useDetection
// shares the same Promise. The model only loads once regardless of who calls first.
//
// NOTE: In dev builds (Expo Go / dev client) the model downloads from the Metro
// dev server every launch — that's why startup is slow in dev. In a production
// APK build the model is bundled as a native asset and loads from local storage
// in ~300 ms. The 3–6 s delay you see in dev is normal and disappears in production.
setTimeout(() => {
    try {
        // We import this way (not ES import at top) because ES imports are hoisted
        // above the TTS prewarm IIFE, defeating its purpose.
        const { loadTensorflowModel } = require('react-native-fast-tflite');
        loadTensorflowModel(require('./assets/efficientdet_lite2.tflite')).catch(() => {});
    } catch (_) {}
}, 0);

const App = require('./App').default;
registerRootComponent(App);
