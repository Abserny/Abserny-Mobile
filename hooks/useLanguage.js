/**
 * useLanguage.js
 * Stores language choice + onboarding completion in AsyncStorage.
 * Provides t() translation, mode strings, and Gemini prompts.
 *
 * Fixes:
 *  1. resetLanguage now also clears the persisted mode index (abserny_mode_index)
 *     so a full reset truly starts fresh.
 *  2. t() is null-safe — if called while lang is still null (loading state)
 *     it falls back to English rather than returning the key string.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_LANG       = 'abserny_language';
const KEY_ONBOARDED  = 'abserny_onboarded';
const KEY_MODE       = 'abserny_mode_index'; // kept in sync on full reset

// ── All UI + speech strings ───────────────────────────────────────────────────
export const STRINGS = {
    en: {
        // Onboarding — language pick
        lang_welcome:   'Welcome to Abserny. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',
        lang_selected_en: 'English selected. Double tap to confirm.',
        lang_selected_ar: 'Arabic selected. Double tap to confirm.',
        lang_confirmed: 'Got it.',

        // Tutorial steps — spoken instructions
        tutorial_intro:   "Let's learn the gestures. I'll guide you through each one.",
        tut_double_tap:   'First gesture: Double tap anywhere to scan. Try it now.',
        tut_double_done:  'Perfect. Double tap will scan and describe what the camera sees.',
        tut_long_press:   'Second gesture: Long press to repeat the last result. Try holding your finger down.',
        tut_long_done:    'Great. Long press repeats the last description.',
        tut_swipe_right:  'Third: Swipe right to go to the next mode. Try swiping right now.',
        tut_swipe_done:   'Good. Swipe left goes back. There are four modes: Scene, Object, Read, and People.',
        tut_triple_tap:   'Last: Triple tap to cycle through modes quickly. Try tapping three times.',
        tut_triple_done:  'Excellent. You know all the gestures.',
        tut_finish:       'Abserny is ready. Double tap to start scanning.',

        // Settings menu items (spoken)
        settings_open:        'Settings. Swipe to navigate. Double tap to select.',
        settings_repeat_tour: 'Repeat gesture tutorial.',
        settings_change_lang: 'Change language.',
        settings_close:       'Close settings.',
        settings_selected:    (item) => `${item} selected. Double tap to confirm.`,
        settings_closed:      'Settings closed.',
        tour_restarting:      'Starting tutorial again.',
        lang_restarting:      'Language picker. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',

        // Boot
        ready:            (mode, hint) => `Abserny ready. ${mode}. ${hint}`,
        // Scanning
        scanning:         'Scanning.',
        analyzing:        'Analyzing.',
        repeat_empty:     'Nothing to repeat.',
        cant_scan:        "Couldn't scan. Try again.",
        auto_on:          'Auto scan on. Scanning every 4 seconds. Double tap to stop.',
        auto_off:         'Auto scan off.',
        no_permission:    'Camera permission required. Please allow in settings.',
        // Permission screen
        perm_title:       'Camera Access Required',
        perm_body:        'Abserny needs your camera to describe your surroundings.',
        perm_button:      'Allow Camera',
        // Hints (visual only)
        hint_ready:       'DOUBLE TAP TO SCAN',
        hint_auto:        'DOUBLE TAP TO STOP',
        hint_scanning:    'ANALYZING...',
        hint_speaking:    'LONG PRESS TO REPEAT',
        gesture_prev:     'prev',
        gesture_next:     'next',
        gesture_cycle:    'cycle',
        // Watch mode
        watch_on:         "Watch mode on. I'll speak when something changes.",
        watch_off:        'Watch mode off.',
        watch_toggle:     'Watch mode.',
        hint_watch:       'SWIPE UP TO STOP',
        // Speech config
        speechLang:       'en-US',
        speechRate:       0.88,
        isRTL:            false,
    },
    ar: {
        // Onboarding
        lang_welcome:     'مرحباً بك في أبصرني. مرر لليمين للإنجليزية. مرر لليسار للعربية. انقر مرتين للتأكيد.',
        lang_selected_en: 'تم اختيار الإنجليزية. انقر مرتين للتأكيد.',
        lang_selected_ar: 'تم اختيار العربية. انقر مرتين للتأكيد.',
        lang_confirmed:   'تم.',

        // Tutorial
        tutorial_intro:   'لنتعلم الإيماءات. سأرشدك خطوة بخطوة.',
        tut_double_tap:   'الإيماءة الأولى: انقر مرتين في أي مكان للمسح. جرّبها الآن.',
        tut_double_done:  'ممتاز. النقر المزدوج يمسح ويصف ما تراه الكاميرا.',
        tut_long_press:   'الثانية: اضغط مطولاً لتكرار آخر نتيجة. جرّب الضغط المطوّل.',
        tut_long_done:    'رائع. الضغط المطوّل يكرر آخر وصف.',
        tut_swipe_right:  'الثالثة: مرر لليمين للانتقال للوضع التالي. جرّب التمرير الآن.',
        tut_swipe_done:   'جيد. التمرير لليسار للرجوع. هناك أربعة أوضاع: المشهد، الأشياء، القراءة، والأشخاص.',
        tut_triple_tap:   'الأخيرة: انقر ثلاث مرات للتنقل السريع بين الأوضاع. جرّب الآن.',
        tut_triple_done:  'ممتاز. لقد تعلمت كل الإيماءات.',
        tut_finish:       'أبصرني جاهز. انقر مرتين لبدء المسح.',

        // Settings
        settings_open:        'الإعدادات. مرر للتنقل. انقر مرتين للاختيار.',
        settings_repeat_tour: 'إعادة شرح الإيماءات.',
        settings_change_lang: 'تغيير اللغة.',
        settings_close:       'إغلاق الإعدادات.',
        settings_selected:    (item) => `${item}. انقر مرتين للتأكيد.`,
        settings_closed:      'تم إغلاق الإعدادات.',
        tour_restarting:      'جارٍ إعادة الشرح.',
        lang_restarting:      'اختيار اللغة. مرر لليمين للإنجليزية. مرر لليسار للعربية. انقر مرتين للتأكيد.',

        // Boot
        ready:            (mode, hint) => `أبصرني جاهز. ${mode}. ${hint}`,
        // Scanning
        scanning:         'جارٍ المسح.',
        analyzing:        'جارٍ التحليل.',
        repeat_empty:     'لا يوجد شيء للتكرار.',
        cant_scan:        'تعذّر المسح. حاول مجدداً.',
        auto_on:          'المسح التلقائي مفعّل. كل 4 ثوانٍ. انقر مرتين للإيقاف.',
        auto_off:         'تم إيقاف المسح التلقائي.',
        no_permission:    'يلزم السماح باستخدام الكاميرا من الإعدادات.',
        perm_title:       'يلزم الوصول إلى الكاميرا',
        perm_body:        'يحتاج أبصرني إلى الكاميرا لوصف محيطك.',
        perm_button:      'السماح بالكاميرا',
        hint_ready:       'انقر مرتين للمسح',
        hint_auto:        'انقر مرتين للإيقاف',
        hint_scanning:    'جارٍ التحليل...',
        hint_speaking:    'اضغط مطولاً للتكرار',
        gesture_prev:     'السابق',
        gesture_next:     'التالي',
        gesture_cycle:    'تدوير',
        // Watch mode
        watch_on:         'وضع المراقبة مفعّل. سأخبرك عند تغيّر المشهد.',
        watch_off:        'تم إيقاف المراقبة.',
        watch_toggle:     'وضع المراقبة.',
        hint_watch:       'مرر لأعلى للإيقاف',
        speechLang:       'ar-SA',
        speechRate:       0.82,
        isRTL:            true,
    },
};

export const MODES_STRINGS = {
    en: {
        scene:  { label: 'Scene mode',   hint: 'Double tap to describe your surroundings.' },
        object: { label: 'Object mode',  hint: 'Hold an object close and double tap.' },
        read:   { label: 'Read mode',    hint: 'Point at text and double tap to read it.' },
        people: { label: 'People mode',  hint: 'Double tap to detect people nearby.' },
    },
    ar: {
        scene:  { label: 'وضع المشهد',   hint: 'انقر مرتين لوصف محيطك.' },
        object: { label: 'وضع الأشياء',  hint: 'قرّب الشيء وانقر مرتين.' },
        read:   { label: 'وضع القراءة',  hint: 'وجّه الكاميرا نحو النص وانقر مرتين.' },
        people: { label: 'وضع الأشخاص', hint: 'انقر مرتين للكشف عن الأشخاص.' },
    },
};

export const GEMINI_PROMPTS = {
    en: {
        scene:  `You are a navigation assistant for a blind person. Describe the scene in ONE clear sentence, max 15 words.
- Mention hazards FIRST (steps, obstacles, people blocking path)
- Use spatial directions: ahead, to your left, to your right, nearby
- Never start with "I see", "I can see", "There is"
- Example: "Steps ahead, a table to your left, person nearby."`,
        object: `You are an assistant for a blind person identifying objects. ONE sentence, max 15 words.
- Name the object precisely with one important detail
- Never start with "I see"
- Example: "A blue medicine bottle with the cap open."`,
        read:   `Read ALL text visible in this image exactly as written, left to right, top to bottom.
If no text is visible, say only: "No text found."
Do NOT describe the image. ONLY read the text.`,
        people: `You are a navigation assistant for a blind person. Describe people in the scene. ONE sentence, max 20 words.
- Count people, say where they are, what they're doing if relevant
- If no people: "No people detected."
- Example: "Two people ahead, one walking toward you."`,
    },
    ar: {
        scene:  `أنت مساعد تنقل للمكفوفين. صِف المشهد بجملة واحدة واضحة، بحد أقصى 12 كلمة. اذكر العوائق أولاً. استخدم الاتجاهات: أمامك، يسارك، يمينك. لا تبدأ بـ "أرى". مثال: "درجات أمامك، طاولة على يسارك."`,
        object: `أنت مساعد للمكفوفين. جملة واحدة، بحد أقصى 12 كلمة. سمِّ الشيء بدقة مع تفصيل مفيد. لا تبدأ بـ "أرى". مثال: "زجاجة دواء زرقاء والغطاء مفتوح."`,
        read:   `اقرأ كل النصوص المرئية في هذه الصورة بالضبط كما هي. إذا لم يوجد نص، قل فقط: "لا يوجد نص." لا تصف الصورة.`,
        people: `أنت مساعد تنقل للمكفوفين. صِف الأشخاص بجملة واحدة، بحد أقصى 15 كلمة. عدد الأشخاص ومكانهم. إذا لم يوجد: "لا يوجد أشخاص."`,
    },
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useLanguage() {
    const [lang,       setLang]       = useState(null);  // null = not chosen
    const [onboarded,  setOnboarded]  = useState(false); // tutorial done?
    const [loading,    setLoading]    = useState(true);

    useEffect(() => {
        Promise.all([
            AsyncStorage.getItem(KEY_LANG),
            AsyncStorage.getItem(KEY_ONBOARDED),
        ])
            .then(([savedLang, savedOnboarded]) => {
                setLang(savedLang || null);
                setOnboarded(savedOnboarded === 'true');
            })
            .catch(() => { setLang('en'); setOnboarded(false); })
            .finally(() => setLoading(false));
    }, []);

    const chooseLang = useCallback(async (code) => {
        await AsyncStorage.setItem(KEY_LANG, code);
        setLang(code);
    }, []);

    const completeOnboarding = useCallback(async () => {
        await AsyncStorage.setItem(KEY_ONBOARDED, 'true');
        setOnboarded(true);
    }, []);

    const resetOnboarding = useCallback(async () => {
        await AsyncStorage.removeItem(KEY_ONBOARDED);
        setOnboarded(false);
    }, []);

    const resetLanguage = useCallback(async () => {
        // FIX: also clear mode index so a full reset truly starts from scratch
        await AsyncStorage.multiRemove([KEY_LANG, KEY_ONBOARDED, KEY_MODE]);
        setLang(null);
        setOnboarded(false);
    }, []);

    // FIX: t() is null-safe — lang can be null during the loading phase.
    // Falls back to English so it never returns the raw key string.
    const t = useCallback((key, ...args) => {
        const strings = STRINGS[lang ?? 'en'] || STRINGS.en;
        const val = strings[key];
        if (typeof val === 'function') return val(...args);
        return val ?? key;
    }, [lang]);

    return {
        lang, loading, onboarded,
        chooseLang, completeOnboarding, resetOnboarding, resetLanguage, t,
        strings: STRINGS[lang] || STRINGS.en,
    };
}
