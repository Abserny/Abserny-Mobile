/**
 * i18n/strings.ar.js
 * All Arabic UI and speech strings.
 * Pure data — the only import is normalizeArabicForTTS (pronunciation fix layer).
 * To edit copy: change values here only.
 */

import { normalizeArabicForTTS as n } from '../services/tts/normalize';

export const ar = {
    // Onboarding
    lang_welcome:     n('مرحباً بك في أَبصِرني. مَرِّر لليمين للإنجليزية. مَرِّر لليسار للعربية. اِنقُر مرتين للتأكيد.'),
    lang_selected_en: n('تم اختيار الإنجليزية. اِنقُر مرتين للتأكيد.'),
    lang_selected_ar: n('تم اختيار العربية. اِنقُر مرتين للتأكيد.'),
    lang_confirmed:   n('تمَّ الأمر.'),

    // Tutorial
    tutorial_intro:    n('لنتعلم الإيماءات. سأرشدك خطوة بخطوة.'),
    tut_double_tap:    n('الإيماءة الأولى: اِنقُر مرتين في أي مكان للمسح. جرّبها الآن.'),
    tut_double_done:   n('ممتاز. النقر المزدوج يمسح ويصف ما تراه الكاميرا.'),
    tut_long_press:    n('الثانية: اضغط مطولاً لتكرار آخر نتيجة. جرّب الضغط المطوّل.'),
    tut_long_done:     n('رائع. الضغط المطوّل يكرر آخر وصف.'),
    tut_swipe_right:   n('الثالثة: مَرِّر لليمين للانتقال للوضع التالي. جرّب الآن.'),
    tut_swipe_done:    n('جيد. التمرير لليسار للرجوع. هناك أربعة أوضاع: المشهد، الأشياء، القراءة، والأشخاص.'),
    tut_triple_tap:    n('الرابعة: اِنقُر ثلاث مرات لفتح الإعدادات. جرّب الآن.'),
    tut_triple_done:   n('جيد. النقر الثلاثي يفتح قائمة الإعدادات.'),
    tut_swipe_up:      n('الأخيرة: مَرِّر لأعلى لتفعيل وضع المراقبة. يمسح تلقائياً ويتحدث عند التغيير. جرّب الآن.'),
    tut_swipe_up_done: n('وضع المراقبة مفعّل. مَرِّر لأعلى مجدداً لإيقافه.'),
    tut_finish:        n('تعلمت كل الإيماءات. اِنقُر مرتين الآن للبدء.'),

    // Settings overlay
    settings_open:        n('الإعدادات. مَرِّر للتنقل. اِنقُر مرتين للاختيار. اِنقُر ثلاثاً للإغلاق.'),
    settings_repeat_tour: n('إعادة شرح الإيماءات.'),
    settings_change_lang: n('تغيير اللغة.'),
    settings_close:       n('إغلاق الإعدادات.'),
    settings_haptics_on:  n('الاهتزاز التنبيهي: مُفعَّل.'),
    settings_haptics_off: n('الاهتزاز التنبيهي: مُعطَّل.'),
    // item is already normalised — do NOT wrap the composite in n()
    settings_selected:    (item) => `${item}. اِنقُر مرتين للتأكيد.`,
    settings_closed:      n('تمَّ إغلاق الإعدادات.'),
    tour_restarting:      n('يجري إعادة الشرح.'),
    skip_tour:            n('يمكنك تخطّي الشرح. اِنقُر مرتين للتخطّي.'),
    tour_skipped:         n('تمَّ تخطّي الشرح.'),
    lang_restarting:      n('اختيار اللغة. مَرِّر لليمين للإنجليزية. مَرِّر لليسار للعربية. اِنقُر مرتين للتأكيد.'),

    // Boot + scanning
    ready:        (mode, hint) => n(`أَبصِرني جاهز. ${mode}. ${hint}`),
    scanning:     n('يجري المسح.'),
    analyzing:    n('يجري التحليل.'),
    repeat_empty: n('لا يوجد شيء للتكرار.'),
    cant_scan:    n('تعذّر المسح. حاول مجدداً.'),
    auto_on:      n('المسح التلقائي مفعّل. كل أربع ثوانٍ. اِنقُر مرتين للإيقاف.'),
    auto_off:     n('تمَّ إيقاف المسح التلقائي.'),
    no_permission:n('يلزم السماح باستخدام الكاميرا من الإعدادات.'),

    // Permission screen
    perm_title:  'يلزم الوصول إلى الكاميرا',
    perm_body:   n('يحتاج أَبصِرني إلى الكاميرا لوصف محيطك.'),
    perm_button: 'السماح بالكاميرا',

    // Hints (visual only)
    hint_ready:    'اِنقُر مرتين للمسح',
    hint_auto:     'اِنقُر مرتين للإيقاف',
    hint_scanning: 'يجري التحليل...',
    hint_speaking: 'اضغط مطولاً للتكرار',
    gesture_prev:  'السابق',
    gesture_next:  'التالي',

    // Watch mode
    watch_on:  n('وَضع المراقبة مفعّل. سأخبرك عند تغيّر المشهد.'),
    watch_off: n('تمَّ إيقاف المراقبة.'),

    // Speech engine config
    speechLang: 'ar-SA',
    speechRate: 0.82,
    isRTL:      true,
};
