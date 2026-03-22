/**
 * useLanguage.js
 * Stores language choice + onboarding completion in AsyncStorage.
 * Provides t() translation, mode strings, and Gemini prompts.
 *
 * FIXES in this version:
 *   1. settings_selected() no longer double-normalises the item argument.
 *   2. resetLanguage now also clears the persisted mode index.
 *   3. t() is null-safe — falls back to English while lang is still loading.
 *   4. [NEW] Language switch no longer calls I18nManager.forceRTL() or reloadApp().
 *      RTL is already handled per-component via `lang === 'ar'` checks throughout
 *      every component (flexDirection, textAlign, writingDirection). The global
 *      I18nManager flag is redundant here and was the sole reason the app
 *      restarted every time the user changed language. Removing it makes language
 *      switching instant with zero disruption.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeArabicForTTS } from './ttsUtils';

const KEY_LANG       = 'abserny_language';
const KEY_ONBOARDED  = 'abserny_onboarded';
const KEY_MODE       = 'abserny_mode_index';

const n = normalizeArabicForTTS;

// ── All UI + speech strings ───────────────────────────────────────────────────
export const STRINGS = {
    en: {
        lang_welcome:     'Welcome to Abserny. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',
        lang_selected_en: 'English selected. Double tap to confirm.',
        lang_selected_ar: 'Arabic selected. Double tap to confirm.',
        lang_confirmed:   'Got it.',
        tutorial_intro:   "Let's learn the gestures. I'll guide you through each one.",
        tut_double_tap:   'First gesture: Double tap anywhere to scan. Try it now.',
        tut_double_done:  'Perfect. Double tap will scan and describe what the camera sees.',
        tut_long_press:   'Second gesture: Long press to repeat the last result. Try holding your finger down.',
        tut_long_done:    'Great. Long press repeats the last description.',
        tut_swipe_right:  'Third: Swipe right to go to the next mode. Try swiping right now.',
        tut_swipe_done:   'Good. Swipe left goes back. There are four modes: Scene, Object, Read, and People.',
        tut_triple_tap:   'Fourth: Triple tap to open settings. Try tapping three times now.',
        tut_triple_done:  'Good. Triple tap opens the settings menu.',
        tut_swipe_up:     'Last gesture: Swipe up to toggle Watch Mode. It scans continuously and speaks when something changes. Try it.',
        tut_swipe_up_done:'Watch mode is now on. Swipe up again to turn it off.',
        tut_finish:       'You know all the gestures. Double tap to start scanning.',
        settings_open:        'Settings. Swipe to navigate. Double tap to select. Triple tap to close.',
        settings_repeat_tour: 'Repeat gesture tutorial.',
        settings_change_lang: 'Change language.',
        settings_close:       'Close settings.',
        settings_selected:    (item) => `${item} selected. Double tap to confirm.`,
        settings_closed:      'Settings closed.',
        tour_restarting:      'Starting tutorial again.',
        lang_restarting:      'Language picker. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',
        ready:            (mode, hint) => `Abserny ready. ${mode}. ${hint}`,
        scanning:         'Scanning.',
        analyzing:        'Analyzing.',
        repeat_empty:     'Nothing to repeat.',
        cant_scan:        "Couldn't scan. Try again.",
        auto_on:          'Auto scan on. Scanning every four seconds. Double tap to stop.',
        auto_off:         'Auto scan off.',
        no_permission:    'Camera permission required. Please allow in settings.',
        perm_title:       'Camera Access Required',
        perm_body:        'Abserny needs your camera to describe your surroundings.',
        perm_button:      'Allow Camera',
        hint_ready:       'DOUBLE TAP TO SCAN',
        hint_auto:        'DOUBLE TAP TO STOP',
        hint_scanning:    'ANALYZING...',
        hint_speaking:    'LONG PRESS TO REPEAT',
        gesture_prev:     'prev',
        gesture_next:     'next',
        gesture_cycle:    'cycle',
        watch_on:         "Watch mode on. I'll speak when something changes.",
        watch_off:        'Watch mode off.',
        watch_toggle:     'Watch mode.',
        hint_watch:       'SWIPE UP TO STOP',
        speechLang:       'en-US',
        speechRate:       0.88,
        isRTL:            false,
    },

    ar: {
        lang_welcome:     n('مرحباً بك في أَبصِرني. مَرِّر لليمين للإنجليزية. مَرِّر لليسار للعربية. اِنقُر مرتين للتأكيد.'),
        lang_selected_en: n('تم اختيار الإنجليزية. اِنقُر مرتين للتأكيد.'),
        lang_selected_ar: n('تم اختيار العربية. اِنقُر مرتين للتأكيد.'),
        lang_confirmed:   n('تمَّ الأمر.'),
        tutorial_intro:   n('لنتعلم الإيماءات. سأرشدك خطوة بخطوة.'),
        tut_double_tap:   n('الإيماءة الأولى: اِنقُر مرتين في أي مكان للمسح. جرّبها الآن.'),
        tut_double_done:  n('ممتاز. النقر المزدوج يمسح ويصف ما تراه الكاميرا.'),
        tut_long_press:   n('الثانية: اضغط مطولاً لتكرار آخر نتيجة. جرّب الضغط المطوّل.'),
        tut_long_done:    n('رائع. الضغط المطوّل يكرر آخر وصف.'),
        tut_swipe_right:  n('الثالثة: مَرِّر لليمين للانتقال للوضع التالي. جرّب الآن.'),
        tut_swipe_done:   n('جيد. التمرير لليسار للرجوع. هناك أربعة أوضاع: المشهد، الأشياء، القراءة، والأشخاص.'),
        tut_triple_tap:   n('الرابعة: اِنقُر ثلاث مرات لفتح الإعدادات. جرّب الآن.'),
        tut_triple_done:  n('جيد. النقر الثلاثي يفتح قائمة الإعدادات.'),
        tut_swipe_up:     n('الأخيرة: مَرِّر لأعلى لتفعيل وضع المراقبة. يمسح تلقائياً ويتحدث عند التغيير. جرّب الآن.'),
        tut_swipe_up_done:n('وضع المراقبة مفعّل. مَرِّر لأعلى مجدداً لإيقافه.'),
        tut_finish:       n('تعلمت كل الإيماءات. اِنقُر مرتين الآن للبدء.'),
        settings_open:        n('الإعدادات. مَرِّر للتنقل. اِنقُر مرتين للاختيار. اِنقُر ثلاثاً للإغلاق.'),
        settings_repeat_tour: n('إعادة شرح الإيماءات.'),
        settings_change_lang: n('تغيير اللغة.'),
        settings_close:       n('إغلاق الإعدادات.'),
        settings_selected: (item) => `${item}. اِنقُر مرتين للتأكيد.`,
        settings_closed:      n('تمَّ إغلاق الإعدادات.'),
        tour_restarting:      n('يجري إعادة الشرح.'),
        lang_restarting:      n('اختيار اللغة. مَرِّر لليمين للإنجليزية. مَرِّر لليسار للعربية. اِنقُر مرتين للتأكيد.'),
        ready:            (mode, hint) => n(`أَبصِرني جاهز. ${mode}. ${hint}`),
        scanning:         n('يجري المسح.'),
        analyzing:        n('يجري التحليل.'),
        repeat_empty:     n('لا يوجد شيء للتكرار.'),
        cant_scan:        n('تعذّر المسح. حاول مجدداً.'),
        auto_on:          n('المسح التلقائي مفعّل. كل أربع ثوانٍ. اِنقُر مرتين للإيقاف.'),
        auto_off:         n('تمَّ إيقاف المسح التلقائي.'),
        no_permission:    n('يلزم السماح باستخدام الكاميرا من الإعدادات.'),
        perm_title:       'يلزم الوصول إلى الكاميرا',
        perm_body:        n('يحتاج أَبصِرني إلى الكاميرا لوصف محيطك.'),
        perm_button:      'السماح بالكاميرا',
        hint_ready:       'اِنقُر مرتين للمسح',
        hint_auto:        'اِنقُر مرتين للإيقاف',
        hint_scanning:    'يجري التحليل...',
        hint_speaking:    'اضغط مطولاً للتكرار',
        gesture_prev:     'السابق',
        gesture_next:     'التالي',
        gesture_cycle:    'تدوير',
        watch_on:         n('وَضع المراقبة مفعّل. سأخبرك عند تغيّر المشهد.'),
        watch_off:        n('تمَّ إيقاف المراقبة.'),
        watch_toggle:     n('وَضع المراقبة.'),
        hint_watch:       'مَرِّر لأعلى للإيقاف',
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
        scene:  { label: n('وَضع المشهد'),   hint: n('اِنقُر مرتين لوصف محيطك.') },
        object: { label: n('وَضع الأشياء'),  hint: n('قرّب الشيء واِنقُر مرتين.') },
        read:   { label: n('وَضع القراءة'),  hint: n('وجّه الكاميرا نحو النص واِنقُر مرتين.') },
        people: { label: n('وَضع الأشخاص'), hint: n('اِنقُر مرتين للكشف عن الأشخاص.') },
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
        scene:  `أنت مساعد تنقل للمكفوفين. يجب أن تكون إجابتك باللغة العربية الفصحى فقط بدون أي كلمات إنجليزية أو أرقام.
صِف المشهد بجملة عربية واحدة واضحة، بحد أقصى 12 كلمة.
- اذكر العوائق أولاً (درجات، عقبات، أشخاص يسدّون الطريق)
- استخدم الاتجاهات: أمامك، يسارك، يمينك، بالقرب
- لا تبدأ بـ "أرى" أو "يوجد" أو "هناك"
- لا تستخدم الأرقام، اكتبها بالكلمات
مثال: "درجات أمامك، طاولة على يسارك."`,
        object: `أنت مساعد للمكفوفين. يجب أن تكون إجابتك باللغة العربية الفصحى فقط بدون أي كلمات إنجليزية.
جملة عربية واحدة، بحد أقصى 12 كلمة. سمِّ الشيء بدقة مع تفصيل مفيد. لا تبدأ بـ "أرى".
مثال: "زجاجة دواء زرقاء والغطاء مفتوح."`,
        read:   `اقرأ كل النصوص المرئية في هذه الصورة بالضبط كما هي مكتوبة (سواء كانت عربية أو إنجليزية أو غيرها).
إذا لم يوجد نص، قل فقط: "لا يوجد نص."
لا تصف الصورة. اقرأ النص فقط.`,
        people: `أنت مساعد تنقل للمكفوفين. يجب أن تكون إجابتك باللغة العربية الفصحى فقط بدون أي كلمات إنجليزية.
صِف الأشخاص بجملة عربية واحدة، بحد أقصى 15 كلمة. عدد الأشخاص ومكانهم وما يفعلونه إن كان مهماً.
إذا لم يوجد أشخاص، قل فقط: "لا يوجد أشخاص."`,
    },
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useLanguage() {
    const [lang,      setLang]      = useState(null);
    const [onboarded, setOnboarded] = useState(false);
    const [loaded,    setLoaded]    = useState(false);

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
            .finally(() => setLoaded(true));
    }, []);

    const chooseLang = useCallback(async (code) => {
        await AsyncStorage.setItem(KEY_LANG, code);
        setLang(code);
        // RTL is handled per-component via lang === 'ar' checks.
        // No I18nManager.forceRTL() or reloadApp() needed — removing these
        // eliminates the disruptive full restart on every language change.
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
        await AsyncStorage.multiRemove([KEY_LANG, KEY_ONBOARDED, KEY_MODE]);
        setLang(null);
        setOnboarded(false);
    }, []);

    const t = useCallback((key, ...args) => {
        const strings = STRINGS[lang ?? 'en'] || STRINGS.en;
        const val = strings[key];
        if (typeof val === 'function') return val(...args);
        return val ?? key;
    }, [lang]);

    return {
        lang, loaded, onboarded,
        chooseLang, completeOnboarding, resetOnboarding, resetLanguage, t,
        strings: STRINGS[lang] || STRINGS.en,
    };
}
