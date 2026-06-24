/**
 * services/audio/voiceover.js
 *
 * Plays pre-recorded MP3 clips for boot screen and onboarding.
 * Falls back to expo-speech if a clip is missing or playback fails.
 *
 * expo-av v16 API: Audio.Sound.createAsync (not Audio.loadAsync)
 */

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const CLIPS = {
    en: {
        boot:             require('../../../assets/audio/en/boot.mp3'),
        lang_intro:       require('../../../assets/audio/en/lang_intro.mp3'),
        lang_reannounce:  require('../../../assets/audio/en/lang_reannounce.mp3'),
        lang_selected_en: require('../../../assets/audio/en/lang_selected_en.mp3'),
        lang_selected_ar: require('../../../assets/audio/en/lang_selected_ar.mp3'),
        lang_confirm:     require('../../../assets/audio/en/lang_confirm.mp3'),
        welcome:          require('../../../assets/audio/en/welcome.mp3'),
        app_intro:        require('../../../assets/audio/en/app_intro.mp3'),
        intro:            require('../../../assets/audio/en/intro.mp3'),
        double_tap:       require('../../../assets/audio/en/double_tap.mp3'),
        double_done:      require('../../../assets/audio/en/double_done.mp3'),
        long_press:       require('../../../assets/audio/en/long_press.mp3'),
        long_done:        require('../../../assets/audio/en/long_done.mp3'),
        swipe:            require('../../../assets/audio/en/swipe.mp3'),
        modes_detail:     require('../../../assets/audio/en/modes_detail.mp3'),
        triple_tap:       require('../../../assets/audio/en/triple_tap.mp3'),
        swipe_up:         require('../../../assets/audio/en/swipe_up.mp3'),
        offline_note:     require('../../../assets/audio/en/offline_note.mp3'),
        finish:           require('../../../assets/audio/en/finish.mp3'),
        repeat_reminder:  require('../../../assets/audio/en/repeat_reminder.mp3'),
        skipped:          require('../../../assets/audio/en/skipped.mp3'),
    },
    ar: {
        boot:             require('../../../assets/audio/ar/boot.mp3'),
        lang_intro:       require('../../../assets/audio/ar/lang_intro.mp3'),
        lang_reannounce:  require('../../../assets/audio/ar/lang_reannounce.mp3'),
        lang_selected_en: require('../../../assets/audio/ar/lang_selected_en.mp3'),
        lang_selected_ar: require('../../../assets/audio/ar/lang_selected_ar.mp3'),
        lang_confirm:     require('../../../assets/audio/ar/lang_confirm.mp3'),
        welcome:          require('../../../assets/audio/ar/welcome.mp3'),
        app_intro:        require('../../../assets/audio/ar/app_intro.mp3'),
        intro:            require('../../../assets/audio/ar/intro.mp3'),
        double_tap:       require('../../../assets/audio/ar/double_tap.mp3'),
        double_done:      require('../../../assets/audio/ar/double_done.mp3'),
        long_press:       require('../../../assets/audio/ar/long_press.mp3'),
        long_done:        require('../../../assets/audio/ar/long_done.mp3'),
        swipe:            require('../../../assets/audio/ar/swipe.mp3'),
        modes_detail:     require('../../../assets/audio/ar/modes_detail.mp3'),
        triple_tap:       require('../../../assets/audio/ar/triple_tap.mp3'),
        swipe_up:         require('../../../assets/audio/ar/swipe_up.mp3'),
        offline_note:     require('../../../assets/audio/ar/offline_note.mp3'),
        finish:           require('../../../assets/audio/ar/finish.mp3'),
        repeat_reminder:  require('../../../assets/audio/ar/repeat_reminder.mp3'),
        skipped:          require('../../../assets/audio/ar/skipped.mp3'),
    },
};

let _sound   = null;
let _stopped = false;

export async function playVoice(key, lang, onDone, fallbackText) {
    _stopped = false;

    // Stop anything currently playing
    if (_sound) {
        await _sound.stopAsync().catch(() => {});
        await _sound.unloadAsync().catch(() => {});
        _sound = null;
    }

    const source = CLIPS[lang]?.[key] ?? CLIPS.en?.[key] ?? null;

    if (!source) {
        _fallbackSpeak(fallbackText, lang, onDone);
        return;
    }

    try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

        // expo-av v16: Audio.Sound.createAsync replaces Audio.loadAsync
        const { sound } = await Audio.Sound.createAsync(
            source,
            { shouldPlay: false },
        );
        _sound = sound;

        sound.setOnPlaybackStatusUpdate((status) => {
            if (_stopped) return;
            if (status.didJustFinish) {
                sound.unloadAsync().catch(() => {});
                if (_sound === sound) _sound = null;
                onDone?.();
            }
            if (status.error) {
                console.warn('[Abserny] Audio status error:', status.error);
                sound.unloadAsync().catch(() => {});
                if (_sound === sound) _sound = null;
                _fallbackSpeak(fallbackText, lang, onDone);
            }
        });

        if (!_stopped) await sound.playAsync();

    } catch (err) {
        console.warn('[Abserny] playVoice failed:', err.message);
        _fallbackSpeak(fallbackText, lang, onDone);
    }
}

export async function stopVoice() {
    _stopped = true;
    Speech.stop();
    if (_sound) {
        await _sound.stopAsync().catch(() => {});
        await _sound.unloadAsync().catch(() => {});
        _sound = null;
    }
}

function _fallbackSpeak(text, lang, onDone) {
    if (text) {
        Speech.speak(text, {
            language: lang === 'ar' ? 'ar-SA' : 'en-US',
            rate:     lang === 'ar' ? 0.84 : 0.88,
            onDone,
            onError: onDone,
        });
    } else {
        onDone?.();
    }
}
