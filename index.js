import { registerRootComponent } from 'expo';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── TTS prewarm ───────────────────────────────────────────────────────────────
// Earliest possible moment: before App.js is parsed or executed.
// We use require() for App (not ES import) so Metro doesn't hoist it above
// this IIFE — ES `import` statements are always hoisted to the top of the
// module regardless of where you write them.
//
// On Android, the TTS engine cold-start costs 1–4 seconds. This fires the
// prewarm while App.js and its dependencies are still being loaded.
//
// volume: 0.01 not 0 — Android's TextToSpeech.speak() silently discards
// zero-volume utterances on many devices (Samsung, MIUI, stock Android 12+),
// so the engine never actually initializes. 0.01 is inaudible but non-zero.
(async () => {
    try {
        const lang = await AsyncStorage.getItem('abserny_language');
        Speech.speak(' ', {
            language: lang === 'ar' ? 'ar-SA' : 'en-US',
            volume: 0.01,
        });
    } catch (_) {
        Speech.speak(' ', { language: 'en-US', volume: 0.01 });
    }
})();

// Use require() so this runs AFTER the IIFE above, not before it.
const App = require('./App').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);
