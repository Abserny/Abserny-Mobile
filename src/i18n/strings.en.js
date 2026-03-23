/**
 * i18n/strings.en.js
 * All English UI and speech strings.
 * Pure data — no imports, no logic.
 * To edit copy: change values here only.
 */

export const en = {
    // Onboarding
    lang_welcome:     'Welcome to Abserny. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',
    lang_selected_en: 'English selected. Double tap to confirm.',
    lang_selected_ar: 'Arabic selected. Double tap to confirm.',
    lang_confirmed:   'Got it.',

    // Tutorial
    tutorial_intro:    "Let's learn the gestures. I'll guide you through each one.",
    tut_double_tap:    'First gesture: Double tap anywhere to scan. Try it now.',
    tut_double_done:   'Perfect. Double tap will scan and describe what the camera sees.',
    tut_long_press:    'Second gesture: Long press to repeat the last result. Try holding your finger down.',
    tut_long_done:     'Great. Long press repeats the last description.',
    tut_swipe_right:   'Third: Swipe right to go to the next mode. Try swiping right now.',
    tut_swipe_done:    'Good. Swipe left goes back. There are four modes: Scene, Object, Read, and People.',
    tut_triple_tap:    'Fourth: Triple tap to open settings. Try tapping three times now.',
    tut_triple_done:   'Good. Triple tap opens the settings menu.',
    tut_swipe_up:      'Last gesture: Swipe up to toggle Watch Mode. It scans continuously and speaks when something changes. Try it.',
    tut_swipe_up_done: 'Watch mode is now on. Swipe up again to turn it off.',
    tut_finish:        'You know all the gestures. Double tap to start scanning.',

    // Settings overlay
    settings_open:        'Settings. Swipe to navigate. Double tap to select. Triple tap to close.',
    settings_repeat_tour: 'Repeat gesture tutorial.',
    settings_change_lang: 'Change language.',
    settings_close:       'Close settings.',
    settings_haptics_on:  'Priority vibration: on.',
    settings_haptics_off: 'Priority vibration: off.',
    settings_selected:    (item) => `${item} selected. Double tap to confirm.`,
    settings_closed:      'Settings closed.',
    tour_restarting:      'Starting tutorial again.',
    skip_tour:            'You can skip this tutorial. Double tap to skip.',
    tour_skipped:         'Tutorial skipped.',
    lang_restarting:      'Language picker. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',

    // Boot + scanning
    ready:        (mode, hint) => `Abserny ready. ${mode}. ${hint}`,
    scanning:     'Scanning.',
    analyzing:    'Analyzing.',
    repeat_empty: 'Nothing to repeat.',
    cant_scan:    "Couldn't scan. Try again.",
    auto_on:      'Auto scan on. Scanning every four seconds. Double tap to stop.',
    auto_off:     'Auto scan off.',
    no_permission:'Camera permission required. Please allow in settings.',

    // Permission screen (visual + spoken)
    perm_title:  'Camera Access Required',
    perm_body:   'Abserny needs your camera to describe your surroundings.',
    perm_button: 'Allow Camera',

    // Hints (visual only — not spoken)
    hint_ready:    'DOUBLE TAP TO SCAN',
    hint_auto:     'DOUBLE TAP TO STOP',
    hint_scanning: 'ANALYZING...',
    hint_speaking: 'LONG PRESS TO REPEAT',
    gesture_prev:  'prev',
    gesture_next:  'next',

    // Watch mode
    watch_on:     "Watch mode on. I'll speak when something changes.",
    watch_off:    'Watch mode off.',

    // Speech engine config
    speechLang: 'en-US',
    speechRate: 0.88,
    isRTL:      false,
};
