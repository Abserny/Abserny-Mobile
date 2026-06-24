import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();
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
// FIX: use ensureModel() from the detection service — it's a singleton that
// loads the model exactly once and shares the Promise across all callers.
// The previous approach called loadTensorflowModel() directly here AND
// ensureModel() fires at import time in detection/index.js, causing the
// model to load twice (visible as two "Loading Tensorflow Lite Model 1" logs).
setTimeout(() => {
    try {
        require('./src/services/detection/tflite').ensureModel().catch(() => {});
    } catch (_) {}
}, 0);

const App = require('./src/App').default;
registerRootComponent(App);
