import { registerRootComponent } from 'expo';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── TTS prewarm ───────────────────────────────────────────────────────────────
// Fires at the earliest possible moment — before App.js is even parsed.
// On Android the TTS engine cold-start costs 1–4 s.
(async () => {
    try {
        const lang = await AsyncStorage.getItem('abserny_language');
        const opts = { language: lang === 'ar' ? 'ar-SA' : 'en-US', volume: 0.05, rate: 0.5 };
        Speech.speak('\u00A0', opts);
        setTimeout(() => Speech.speak('\u00A0', opts), 400);
    } catch (_) {
        Speech.speak('\u00A0', { language: 'en-US', volume: 0.05, rate: 0.5 });
    }
})();

// ── TFLite model prewarm ──────────────────────────────────────────────────────
// ensureModel() is a singleton — calling it here and in the detection service
// shares the same Promise. Model loads exactly once.
setTimeout(() => {
    try {
        const { loadTensorflowModel } = require('react-native-fast-tflite');
        // Updated path: assets/models/ after scaffold
        loadTensorflowModel(require('./assets/models/efficientdet_lite2.tflite')).catch(() => {});
    } catch (_) {}
}, 0);

const App = require('./src/App').default;
registerRootComponent(App);
