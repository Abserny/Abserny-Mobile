/**
 * screens/OnboardingScreen/index.js
 *
 * GESTURE MAP (tutorial phase):
 *   single tap    → replay current step audio (if not auto-advancing)
 *   long press    → same as single tap (accessible alternative)
 *   swipe left/right → practice swipe gesture
 *   swipe up      → practice watch mode gesture
 *   swipe down    → skip to finish (repeat runs ONLY)
 *   double tap    → practice double tap gesture / confirm language
 *   triple tap    → practice triple tap gesture
 *
 * FIRST-TIME FLOW:
 *   welcome → app_intro → intro → [gesture steps] → offline_note → finish
 *
 *   welcome:   "Welcome to Abserny. I'll guide you through everything.
 *               Just listen for now. Tap once anytime to repeat what I said."
 *   app_intro: what the app does
 *   intro:     "Six gestures. Each controls a feature. Let's begin."
 *   [steps]:   each gesture taught in sequence
 *
 * REPEAT FLOW (isRepeat=true):
 *   repeat_intro → [gesture steps from double_tap] → offline_note → finish
 *
 *   repeat_intro: "Tutorial. Tap once to repeat a step. Swipe down to skip."
 *                 Auto-advances after TTS — straight into the gesture steps.
 *                 No welcome, no app description — user already knows.
 *
 * FIXES:
 *   1. Skip uses SWIPE DOWN — not double tap — so it can never conflict
 *      with the double_tap gesture practice step.
 *   2. isAutoAdvancingRef prevents single-tap replay racing with TTS onDone
 *      on auto-advancing (waitFor:null) steps.
 *   3. Welcome step is its own dedicated audio moment — "tap once to repeat"
 *      is taught clearly and alone before anything else happens.
 *   4. Skip announcement is IN the repeat_intro step text — no async delay,
 *      no audio overlap.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Image, Animated, StatusBar, PanResponder } from 'react-native';
import * as Speech  from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { LanguagePhase }  from './LanguagePhase';
import { TutorialPhase }  from './TutorialPhase';
import { s }              from './styles';
import { normalizeArabicForTTS as n } from '../../services/tts/normalize';

function speakNow(text, lang = 'en-US', rate = 0.88) {
    Speech.stop();
    Speech.speak(text, { language: lang, rate });
}

// ── Swipe thresholds ──────────────────────────────────────────────────────────
const SWIPE_H_PX    = 55;
const SWIPE_UP_PX   = 80;
const SWIPE_DOWN_PX = 80;

// ── Step colors ───────────────────────────────────────────────────────────────
const STEP_COLORS = {
    welcome:      '#00BFFF',
    app_intro:    '#00BFFF',
    intro:        '#00BFFF',
    repeat_intro: '#00BFFF',
    double_tap:   '#00BFFF',
    double_done:  '#00E5A0',
    long_press:   '#A78BFA',
    long_done:    '#00E5A0',
    swipe:        '#00E5A0',
    modes_detail: '#00E5A0',
    triple_tap:   '#FFB020',
    swipe_up:     '#00BFFF',
    offline_note: '#00E5A0',
    finish:       '#FFB020',
};

// ─────────────────────────────────────────────────────────────────────────────
// TUTORIAL_STEPS
//
// First-time steps: welcome → app_intro → intro → gestures → finish
// Repeat steps: repeat_intro → gestures → finish
//   (repeat_intro fast-tracks straight to double_tap, skipping welcome/app_intro/intro)
//
// waitFor: null  = auto-advances after TTS finishes (user just listens)
// waitFor: 'X'   = waits for user gesture (user actively practices)
// ─────────────────────────────────────────────────────────────────────────────
const TUTORIAL_STEPS = {
    en: [
        // ── Welcome (first-time only, excluded on repeat) ──────────────────
        {
            id: 'welcome',
            text: "Welcome to Abserny. I'll guide you through everything. Just listen for now. Tap once anytime to repeat what I just said.",
            waitFor: null,
        },
        // ── What is Abserny ────────────────────────────────────────────────
        {
            id: 'app_intro',
            text: 'Abserny describes the world around you using your camera and AI. No sight needed.',
            waitFor: null,
        },
        {
            id: 'intro',
            text: "Six gestures. Each one controls a different feature. Let's begin.",
            waitFor: null,
        },

        // ── Repeat-only intro (start index set programmatically on isRepeat) ─
        {
            id: 'repeat_intro',
            text: 'Tutorial. Tap once to repeat any step. Swipe down to skip straight to the end.',
            waitFor: null,
        },

        // ── Gesture 1: Double tap ──────────────────────────────────────────
        {
            id: 'double_tap',
            text: 'First: double tap anywhere to take a photo and hear a description. Try it now.',
            waitFor: 'doubleTap',
        },
        {
            id: 'double_done',
            text: 'Good. Every double tap captures and describes what the camera sees.',
            waitFor: null,
        },

        // ── Gesture 2: Long press ──────────────────────────────────────────
        {
            id: 'long_press',
            text: 'Second: long press to repeat the last description. Hold your finger down now.',
            waitFor: 'longPress',
        },
        {
            id: 'long_done',
            text: 'Good. Long press replays the last result — useful when you miss something.',
            waitFor: null,
        },

        // ── Gesture 3: Swipe + modes ───────────────────────────────────────
        {
            id: 'swipe',
            text: 'Third: swipe left or right to change modes. Try swiping now.',
            waitFor: 'swipe',
        },
        {
            id: 'modes_detail',
            text: 'Four modes: Scene describes surroundings. Object identifies items. Read reads text. People locates people.',
            waitFor: null,
        },

        // ── Gesture 4: Triple tap ──────────────────────────────────────────
        {
            id: 'triple_tap',
            text: 'Fourth: triple tap to open settings — change language or replay this tutorial. Try tapping three times.',
            waitFor: 'tripleTap',
        },

        // ── Gesture 5: Watch mode ──────────────────────────────────────────
        {
            id: 'swipe_up',
            text: 'Fifth: swipe up for Watch mode. Runs hands-free while you walk and warns about hazards like steps and cars. Try it.',
            waitFor: 'swipeUp',
        },

        // ── Offline note ───────────────────────────────────────────────────
        {
            id: 'offline_note',
            text: 'One more thing: Abserny works offline too, using your device. No internet required.',
            waitFor: null,
        },

        // ── Finish ─────────────────────────────────────────────────────────
        {
            id: 'finish',
            text: 'You know everything. Double tap now to start.',
            waitFor: 'doubleTap',
        },
    ],

    ar: [
        // ── ترحيب (المرة الأولى فقط) ───────────────────────────────────────
        {
            id: 'welcome',
            text: n('أهلاً بك في أَبصِرني. سأرشدك خلال كل شيء. فقط استمع الآن. اِنقُر مرة واحدة في أي وقت لإعادة ما قلته.'),
            waitFor: null,
        },
        // ── ما هو أَبصِرني ─────────────────────────────────────────────────
        {
            id: 'app_intro',
            text: n('أَبصِرني يَصِف العالم من حولك باستخدام الكاميرا والذكاء الاصطناعي. لا حاجة للبصر.'),
            waitFor: null,
        },
        {
            id: 'intro',
            text: n('ست إيماءات. كل واحدة تَتحكَّم بِميزة مختلفة. لنبدأ.'),
            waitFor: null,
        },

        // ── مقدمة الإعادة فقط ─────────────────────────────────────────────
        {
            id: 'repeat_intro',
            text: n('الشرح مجدداً. اِنقُر مرة لإعادة أي خطوة. مَرِّر للأسفل للتخطّي للنهاية.'),
            waitFor: null,
        },

        // ── الإيماءة الأولى: النقر المزدوج ────────────────────────────────
        {
            id: 'double_tap',
            text: n('الأولى: اِنقُر مرتين في أي مكان لالتقاط صورة وسماع وصف. جرّبها الآن.'),
            waitFor: 'doubleTap',
        },
        {
            id: 'double_done',
            text: n('جيد. كل نقرة مزدوجة تلتقط وتَصِف ما تراه الكاميرا.'),
            waitFor: null,
        },

        // ── الإيماءة الثانية: الضغط المطوّل ──────────────────────────────
        {
            id: 'long_press',
            text: n('الثانية: اضغط مطولاً لتكرار آخر وصف. اضغط واستمر الآن.'),
            waitFor: 'longPress',
        },
        {
            id: 'long_done',
            text: n('جيد. الضغط المطوّل يُعيد آخر نتيجة — مفيد إذا فاتك شيء.'),
            waitFor: null,
        },

        // ── الإيماءة الثالثة: التمرير + الأوضاع ──────────────────────────
        {
            id: 'swipe',
            text: n('الثالثة: مَرِّر يميناً أو يساراً لتغيير الوضع. جرّب الآن.'),
            waitFor: 'swipe',
        },
        {
            id: 'modes_detail',
            text: n('أربعة أوضاع: المشهد يَصِف محيطك. الأشياء تُعرّف بالأغراض. القراءة تقرأ النصوص. الأشخاص يُحدِّد الناس.'),
            waitFor: null,
        },

        // ── الإيماءة الرابعة: النقر الثلاثي ──────────────────────────────
        {
            id: 'triple_tap',
            text: n('الرابعة: اِنقُر ثلاث مرات لفتح الإعدادات — تغيير اللغة أو إعادة الشرح. جرّب الآن.'),
            waitFor: 'tripleTap',
        },

        // ── الإيماءة الخامسة: وضع المراقبة ───────────────────────────────
        {
            id: 'swipe_up',
            text: n('الخامسة: مَرِّر لأعلى لوَضع المراقبة. يعمل بدون يدين أثناء المشي ويُحذِّرك من العوائق. جرّب.'),
            waitFor: 'swipeUp',
        },

        // ── ملاحظة عن وضع عدم الاتصال ─────────────────────────────────────
        {
            id: 'offline_note',
            text: n('مُلاحَظة أخيرة: أَبصِرني يعمل بدون إنترنت أيضاً، باستخدام الذكاء المُدمَج في جهازك.'),
            waitFor: null,
        },

        // ── الانتهاء ───────────────────────────────────────────────────────
        {
            id: 'finish',
            text: n('تعلمت كل شيء. اِنقُر مرتين الآن للبدء.'),
            waitFor: 'doubleTap',
        },
    ],
};

// The index of 'double_tap' in the steps array — repeat run starts here
function getRepeatStartIndex(lang) {
    const steps = TUTORIAL_STEPS[lang] ?? TUTORIAL_STEPS.en;
    // repeat_intro is just before double_tap — start from repeat_intro
    return steps.findIndex(s => s.id === 'repeat_intro');
}

export default function OnboardingScreen({
    onComplete,
    initialPhase = 'language',
    initialLang  = 'en',
    isRepeat     = false,
}) {
    const [phase,        setPhase]        = useState(initialPhase);
    const [selectedLang, setSelectedLang] = useState(initialLang);
    const [lang,         setLang]         = useState(initialLang);
    const [tutStep,      setTutStep]      = useState(0);

    const phaseRef        = useRef(initialPhase);
    const langRef         = useRef(initialLang);
    const selectedLangRef = useRef(initialLang);
    const tutStepRef      = useRef(0);
    const waitingFor      = useRef(null);
    const isRepeatRef     = useRef(isRepeat);
    const onCompleteRef   = useRef(onComplete);
    onCompleteRef.current = onComplete;

    // Tracks whether a waitFor:null step is currently auto-advancing via TTS.
    // Single-tap replay is disabled during this window to prevent racing.
    const isAutoAdvancingRef = useRef(false);

    const fadeAnim     = useRef(new Animated.Value(0)).current;
    const slideAnim    = useRef(new Animated.Value(20)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const stepFade     = useRef(new Animated.Value(1)).current;
    const stepSlide    = useRef(new Animated.Value(0)).current;
    const enScale      = useRef(new Animated.Value(initialLang === 'en' ? 1 : 0.96)).current;
    const arScale      = useRef(new Animated.Value(initialLang === 'ar' ? 1 : 0.96)).current;

    const tapCount  = useRef(0);
    const tapTimer  = useRef(null);
    const longTimer = useRef(null);
    const longFired = useRef(false);
    const startPos  = useRef({ x: 0, y: 0 });

    const runStepRef           = useRef(null);
    const onGestureDetectedRef = useRef(null);
    const confirmLangRef       = useRef(null);

    // ── Skip to finish (swipe down on repeat runs) ────────────────────────────
    const skipToFinish = (currentLang) => {
        const steps   = TUTORIAL_STEPS[currentLang] ?? TUTORIAL_STEPS.en;
        const finishI = steps.findIndex(s => s.id === 'finish');
        if (finishI < 0) return;
        isAutoAdvancingRef.current = false;
        waitingFor.current = null;
        const sLang = currentLang === 'ar' ? 'ar-SA' : 'en-US';
        const msg   = currentLang === 'ar'
            ? n('تمَّ التخطّي.')
            : 'Skipped.';
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        speakNow(msg, sLang);
        setTimeout(() => runStepRef.current(finishI, currentLang), 700);
    };

    // ── Core step runner ──────────────────────────────────────────────────────
    runStepRef.current = (stepIndex, currentLang) => {
        const steps = TUTORIAL_STEPS[currentLang] ?? TUTORIAL_STEPS.en;
        if (stepIndex >= steps.length) return;
        const step  = steps[stepIndex];
        const sLang = currentLang === 'ar' ? 'ar-SA' : 'en-US';
        const sRate = currentLang === 'ar' ? 0.82 : 0.88;

        waitingFor.current         = step.waitFor;
        tutStepRef.current         = stepIndex;
        isAutoAdvancingRef.current = false;  // reset — set true below if auto-advancing

        stepFade.setValue(0);
        stepSlide.setValue(14);
        setTutStep(stepIndex);

        requestAnimationFrame(() => {
            Animated.parallel([
                Animated.timing(stepFade,  { toValue: 1, duration: 240, useNativeDriver: true }),
                Animated.timing(stepSlide, { toValue: 0, duration: 240, useNativeDriver: true }),
            ]).start();
        });

        Animated.timing(progressAnim, {
            toValue:  steps.length > 1 ? stepIndex / (steps.length - 1) : 1,
            duration: 500,
            useNativeDriver: false,
        }).start();

        setTimeout(() => {
            Speech.stop();

            if (step.waitFor) {
                // User must perform a gesture — single tap replay is allowed
                isAutoAdvancingRef.current = false;
                Speech.speak(step.text, { language: sLang, rate: sRate });
            } else {
                // Auto-advancing step — block single-tap replay while TTS plays
                // to prevent the replay racing with onDone → runStepRef(next)
                isAutoAdvancingRef.current = true;
                const next = stepIndex + 1;
                Speech.speak(step.text, {
                    language: sLang,
                    rate:     sRate,
                    onDone: () => {
                        isAutoAdvancingRef.current = false;
                        setTimeout(() => {
                            if (next >= steps.length) onCompleteRef.current(currentLang);
                            else runStepRef.current(next, currentLang);
                        }, 500);
                    },
                    onError: () => {
                        isAutoAdvancingRef.current = false;
                        setTimeout(() => {
                            if (next >= steps.length) onCompleteRef.current(currentLang);
                            else runStepRef.current(next, currentLang);
                        }, 1000);
                    },
                });
            }
        }, 100);
    };

    // ── Gesture detected ──────────────────────────────────────────────────────
    onGestureDetectedRef.current = (gestureType) => {
        if (waitingFor.current !== gestureType) return;
        waitingFor.current = null;
        const currentLang = langRef.current;
        const step = (TUTORIAL_STEPS[currentLang] ?? TUTORIAL_STEPS.en)[tutStepRef.current];
        if (step?.id === 'finish') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setTimeout(() => onCompleteRef.current(currentLang), 150);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => runStepRef.current(tutStepRef.current + 1, currentLang), 250);
    };

    // ── Language confirm ──────────────────────────────────────────────────────
    confirmLangRef.current = () => {
        const chosenLang = selectedLangRef.current;
        langRef.current  = chosenLang;
        phaseRef.current = 'tutorial';
        setLang(chosenLang);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        speakNow(
            chosenLang === 'en' ? 'Got it.' : n('تمَّ الأمر.'),
            chosenLang === 'en' ? 'en-US' : 'ar-SA',
        );
        setTimeout(() => {
            Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true })
                .start(() => {
                    setPhase('tutorial');
                    setTutStep(0);
                    tutStepRef.current = 0;
                    waitingFor.current = null;
                    isAutoAdvancingRef.current = false;
                    stepFade.setValue(1);
                    stepSlide.setValue(0);
                    fadeAnim.setValue(0);
                    slideAnim.setValue(16);
                    Animated.parallel([
                        Animated.timing(fadeAnim,  { toValue: 1, duration: 320, useNativeDriver: true }),
                        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
                    ]).start(() => setTimeout(() => runStepRef.current(0, chosenLang), 100));
                });
        }, 500);
    };

    // ── Mount ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();

        if (initialPhase === 'tutorial') {
            const startIdx = isRepeatRef.current
                ? getRepeatStartIndex(initialLang)   // → repeat_intro
                : 0;                                  // → welcome
            setTimeout(() => runStepRef.current(startIdx, initialLang), 200);
        } else {
            setTimeout(() => speakNow(
                'Welcome to Abserny. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',
                'en-US', 0.88,
            ), 150);
        }
    }, []); // eslint-disable-line

    // ── PanResponder ──────────────────────────────────────────────────────────
    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder:        () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder:         () => false,

        onPanResponderGrant: (e) => {
            longFired.current = false;
            startPos.current  = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
            longTimer.current = setTimeout(() => {
                longFired.current = true;
                tapCount.current  = 0;
                clearTimeout(tapTimer.current);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                if (phaseRef.current === 'language') {
                    speakNow(
                        'Swipe right for English. Swipe left for Arabic. Double tap to confirm.',
                        'en-US',
                    );
                } else if (waitingFor.current === 'longPress') {
                    // On the long_press teaching step: user performed it — advance.
                    onGestureDetectedRef.current('longPress');
                }
                // On all other tutorial steps: long press does NOTHING.
                // Single tap already handles replay. Adding replay here caused
                // the "keeps repeating" bug — both fired in sequence.
            }, 700);
        },

        onPanResponderRelease: (e) => {
            clearTimeout(longTimer.current);
            if (longFired.current) return;

            const dx  = e.nativeEvent.pageX - startPos.current.x;
            const dy  = e.nativeEvent.pageY - startPos.current.y;
            const adx = Math.abs(dx);
            const ady = Math.abs(dy);

            // ── Swipe DOWN → skip (repeat runs only) ─────────────────────
            if (dy > SWIPE_DOWN_PX && ady > adx * 1.3) {
                tapCount.current = 0;
                clearTimeout(tapTimer.current);
                if (phaseRef.current === 'tutorial' && isRepeatRef.current) {
                    skipToFinish(langRef.current);
                }
                return;
            }

            // ── Swipe UP → watch mode gesture step ────────────────────────
            if (dy < -SWIPE_UP_PX && ady > adx * 1.3) {
                tapCount.current = 0;
                clearTimeout(tapTimer.current);
                if (phaseRef.current === 'tutorial') onGestureDetectedRef.current('swipeUp');
                return;
            }

            // ── Swipe LEFT/RIGHT → lang select or swipe gesture step ──────
            if (adx >= SWIPE_H_PX && adx > ady * 1.2) {
                tapCount.current = 0;
                clearTimeout(tapTimer.current);
                if (phaseRef.current === 'language') {
                    // Wrap: swipe always toggles to the other language —
                    // so swiping right when English is already selected still
                    // works (it selects Arabic, wrapping around).
                    // Same feel as mode navigation in the main screen.
                    const current = selectedLangRef.current;
                    const code    = current === 'en' ? 'ar' : 'en';
                    selectedLangRef.current = code;
                    setSelectedLang(code);
                    Animated.parallel([
                        Animated.spring(code === 'en' ? enScale : arScale, { toValue: 1,    useNativeDriver: true, tension: 260, friction: 12 }),
                        Animated.spring(code === 'en' ? arScale : enScale, { toValue: 0.96, useNativeDriver: true, tension: 260, friction: 12 }),
                    ]).start();
                    speakNow(
                        code === 'en'
                            ? 'English selected. Double tap to confirm.'
                            : n('تم اختيار العربية. اِنقُر مرتين للتأكيد.'),
                        code === 'en' ? 'en-US' : 'ar-SA',
                        code === 'en' ? 0.88    : 0.82,
                    );
                    Haptics.selectionAsync();
                } else {
                    onGestureDetectedRef.current('swipe');
                }
                return;
            }

            if (adx > 20 || ady > 20) return;

            // ── Tap counting ──────────────────────────────────────────────
            tapCount.current += 1;
            clearTimeout(tapTimer.current);

            // Triple tap → settings gesture step
            if (tapCount.current >= 3) {
                tapCount.current = 0;
                if (phaseRef.current === 'tutorial') onGestureDetectedRef.current('tripleTap');
                return;
            }

            tapTimer.current = setTimeout(() => {
                const count = tapCount.current;
                tapCount.current = 0;

                if (count === 2) {
                    if (phaseRef.current === 'language') {
                        confirmLangRef.current();
                    } else {
                        // Double tap in tutorial → ONLY fires doubleTap gesture
                        // Skip is now SWIPE DOWN — no conflict possible here.
                        onGestureDetectedRef.current('doubleTap');
                    }

                } else if (count === 1) {
                    if (phaseRef.current === 'language') {
                        // Re-announce current language selection
                        const code = selectedLangRef.current;
                        speakNow(
                            code === 'en'
                                ? 'English selected. Double tap to confirm.'
                                : n('تم اختيار العربية. اِنقُر مرتين للتأكيد.'),
                            code === 'en' ? 'en-US' : 'ar-SA',
                        );
                    } else {
                        // Replay current step — only if not mid-auto-advance.
                        // This prevents racing with the TTS onDone → runStepRef(next).
                        if (!isAutoAdvancingRef.current) {
                            Speech.stop();
                            Haptics.selectionAsync();
                            runStepRef.current(tutStepRef.current, langRef.current);
                        }
                        // If auto-advancing, silently ignore — the TTS will finish naturally.
                    }
                }
            }, 320);
        },

        onPanResponderTerminate: () => {
            clearTimeout(longTimer.current);
            clearTimeout(tapTimer.current);
        },
    })).current;

    // ── Render ────────────────────────────────────────────────────────────────
    const steps       = TUTORIAL_STEPS[lang] ?? TUTORIAL_STEPS.en;
    const currentStep = steps[Math.min(tutStep, steps.length - 1)];
    const stepColor   = STEP_COLORS[currentStep?.id] ?? '#00BFFF';
    const isWaiting   = !!currentStep?.waitFor;
    const isRTL       = lang === 'ar';

    return (
        <View style={s.root} {...panResponder.panHandlers}>
            <StatusBar hidden />
            <Animated.View style={[
                s.content,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}>
                <Image
                    source={require('../../../assets/images/logorm.png')}
                    style={s.logo}
                />
                {phase === 'language' ? (
                    <LanguagePhase
                        selectedLang={selectedLang}
                        enScale={enScale}
                        arScale={arScale}
                    />
                ) : (
                    <TutorialPhase
                        currentStep={currentStep}
                        tutStep={tutStep}
                        stepsLength={steps.length}
                        stepColor={stepColor}
                        stepFade={stepFade}
                        stepSlide={stepSlide}
                        progressAnim={progressAnim}
                        isWaiting={isWaiting}
                        isRTL={isRTL}
                        isRepeat={isRepeat}
                    />
                )}
            </Animated.View>
        </View>
    );
}
