/**
 * screens/OnboardingScreen/index.js
 *
 * Voice: all fixed strings now play via playVoice() from services/audio/voiceover.
 * The STEPS array still holds the text strings — used as TTS fallback if a
 * recording is missing, and as the displayed instruction text on screen.
 *
 * Design: solid colors, no alpha. Fades only (180ms out / 260ms in, cubic).
 * Logic: fully preserved — language pick, bilingual intro, 13-step tutorial,
 *        repeat mode, skip, single-tap replay, long-press replay, all gates.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, Animated, Easing, Image,
    StyleSheet, Dimensions, StatusBar, PanResponder,
} from 'react-native';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { normalizeArabicForTTS as n } from '../../services/tts/normalize';
import { playVoice, stopVoice } from '../../services/audio/voiceover';

const { width: W, height: H } = Dimensions.get('window');

// ── Palette — all solid ───────────────────────────────────────────────────────
const BG          = '#08090D';
const BG_CARD     = '#0F1118';
const BG_ACTIVE   = '#131720';
const TEXT_HI     = '#F0F0F2';
const TEXT_MID    = '#7A7D8A';
const TEXT_LO     = '#353840';
const BORDER_IDLE = '#1C1E26';
const ACCENT_BLUE = '#5AC8E8';
const ACCENT_TEAL = '#4EDBA0';
const ACCENT_GOLD = '#F0A830';
const ACCENT_PURP = '#A78BFA';

// ── Step accent colors ────────────────────────────────────────────────────────
const STEP_COLOR = {
    welcome:      ACCENT_BLUE,
    app_intro:    ACCENT_BLUE,
    intro:        ACCENT_BLUE,
    double_tap:   ACCENT_BLUE,
    double_done:  ACCENT_TEAL,
    long_press:   ACCENT_PURP,
    long_done:    ACCENT_TEAL,
    swipe:        ACCENT_TEAL,
    modes_detail: ACCENT_TEAL,
    triple_tap:   ACCENT_GOLD,
    swipe_up:     ACCENT_BLUE,
    offline_note: ACCENT_TEAL,
    finish:       ACCENT_GOLD,
};

// ── Tutorial steps ────────────────────────────────────────────────────────────
// text = fallback for TTS and screen display
// voiceKey = clip key passed to playVoice (matches filename without .mp3)
const STEPS = {
    en: [
        { id: 'welcome',      voiceKey: 'welcome',      waitFor: null,        text: "Hey, welcome. I'm Abserny — I'll be your eyes. Let me show you how I work." },
        { id: 'app_intro',    voiceKey: 'app_intro',    waitFor: null,        text: "Point your camera at anything — a street, a sign, a face — and I'll describe it out loud. No looking at the screen needed." },
        { id: 'intro',        voiceKey: 'intro',        waitFor: null,        text: "There are six gestures. I'll teach you one at a time. Tap once anytime to hear the current step again." },
        { id: 'double_tap',   voiceKey: 'double_tap',   waitFor: 'doubleTap', text: "Double tap anywhere to take a photo and hear what's there. Go ahead — try it now." },
        { id: 'double_done',  voiceKey: 'double_done',  waitFor: null,        text: "Nice. That's your main move — double tap to scan. Any time, anywhere." },
        { id: 'long_press',   voiceKey: 'long_press',   waitFor: 'longPress', text: "Long press — hold your finger down — to replay the last thing I said. Try holding now." },
        { id: 'long_done',    voiceKey: 'long_done',    waitFor: null,        text: "Good. Never lose what I said — just hold to hear it again." },
        { id: 'swipe',        voiceKey: 'swipe',        waitFor: 'swipe',     text: "Swipe left or right to switch modes. Give it a try." },
        { id: 'modes_detail', voiceKey: 'modes_detail', waitFor: null,        text: "Four modes — Scene for your surroundings, Object to identify things, Read for text, People to spot someone nearby." },
        { id: 'triple_tap',   voiceKey: 'triple_tap',   waitFor: 'tripleTap', text: "Triple tap — three quick taps — to open settings. Try it." },
        { id: 'swipe_up',     voiceKey: 'swipe_up',     waitFor: 'swipeUp',   text: "Swipe up for Watch Mode. I keep watching and warn you if something changes or there's a hazard ahead. Try it." },
        { id: 'offline_note', voiceKey: 'offline_note', waitFor: null,        text: "One last thing — I work without internet too. Your device handles it on its own." },
        { id: 'finish',       voiceKey: 'finish',       waitFor: 'doubleTap', text: "That's everything. You're ready. Double tap to start." },
    ],
    ar: [
        { id: 'welcome',      voiceKey: 'welcome',      waitFor: null,        text: n('أهلاً. أنا أَبصِرني — سأكون عيونك. دعني أريك كيف أعمل.') },
        { id: 'app_intro',    voiceKey: 'app_intro',    waitFor: null,        text: n('وجّه الكاميرا على أي شيء — شارع أو لافتة أو وجه — وسأصفه لك بصوت عالٍ. بدون ما تنظر للشاشة.') },
        { id: 'intro',        voiceKey: 'intro',        waitFor: null,        text: n('هناك ست إيماءات. سأعلّمك واحدة في كل مرة. اِنقُر مرة في أي وقت لإعادة سماع الخطوة الحالية.') },
        { id: 'double_tap',   voiceKey: 'double_tap',   waitFor: 'doubleTap', text: n('اِنقُر مرتين في أي مكان لالتقاط صورة وسماع ما فيها. جرّب الآن.') },
        { id: 'double_done',  voiceKey: 'double_done',  waitFor: null,        text: n('ممتاز. هذه حركتك الأساسية — نقرتان للمسح. في أي وقت وأي مكان.') },
        { id: 'long_press',   voiceKey: 'long_press',   waitFor: 'longPress', text: n('اضغط مطولاً — اثبت إصبعك على الشاشة — لإعادة آخر شيء قلته. جرّب.') },
        { id: 'long_done',    voiceKey: 'long_done',    waitFor: null,        text: n('جيد. لا تفوتك أي معلومة — فقط اضغط مطولاً لإعادتها.') },
        { id: 'swipe',        voiceKey: 'swipe',        waitFor: 'swipe',     text: n('مَرِّر يميناً أو يساراً للتبديل بين الأوضاع. جرّب.') },
        { id: 'modes_detail', voiceKey: 'modes_detail', waitFor: null,        text: n('أربعة أوضاع — المشهد لمحيطك، والأشياء للتعرف على الأغراض، والقراءة للنصوص، والأشخاص للعثور على الناس قربك.') },
        { id: 'triple_tap',   voiceKey: 'triple_tap',   waitFor: 'tripleTap', text: n('اِنقُر ثلاث مرات بسرعة لفتح الإعدادات. جرّب.') },
        { id: 'swipe_up',     voiceKey: 'swipe_up',     waitFor: 'swipeUp',   text: n('مَرِّر لأعلى لتفعيل وضع المراقبة. سأظل أراقب وأحذّرك عند أي تغيير أو خطر أمامك. جرّب.') },
        { id: 'offline_note', voiceKey: 'offline_note', waitFor: null,        text: n('شيء أخير — أنا أعمل بدون إنترنت أيضاً. جهازك يتولى الأمر وحده.') },
        { id: 'finish',       voiceKey: 'finish',       waitFor: 'doubleTap', text: n('هذا كل شيء. أنت مستعد. اِنقُر مرتين للبدء.') },
    ],
};

function getRepeatStart(lang) {
    return STEPS[lang]?.findIndex(s => s.id === 'double_tap') ?? 0;
}

// ── Bilingual language screen voice ──────────────────────────────────────────
// lang_intro plays EN clip first, then AR clip after a short gap
function speakLangIntro(onDone) {
    stopVoice();
    playVoice('lang_intro', 'en', () => {
        setTimeout(() => playVoice('lang_intro', 'ar', onDone, 'مرحباً في أَبصِرني. اضغط لاختيار لغتك.'), 320);
    }, 'Welcome to Abserny. Tap to choose your language, then double tap to confirm.');
}

function speakLangReannounce() {
    stopVoice();
    playVoice('lang_reannounce', 'en', () => {
        setTimeout(() => playVoice('lang_reannounce', 'ar', null, 'اضغط للتبديل. اِنقُر مرتين للتأكيد.'), 220);
    }, 'Tap to switch language. Double tap to confirm.');
}

function speakLangSelected(code) {
    stopVoice();
    if (code === 'en') {
        playVoice('lang_selected_en', 'en', null, 'English selected. Double tap to confirm.');
    } else {
        playVoice('lang_selected_ar', 'ar', null, 'تم اختيار العربية. اِنقُر مرتين للتأكيد.');
    }
}

// ── Step voice ────────────────────────────────────────────────────────────────
function speakStep(voiceKey, fallbackText, lang, onDone, onError) {
    stopVoice();
    playVoice(voiceKey, lang, onDone ?? onError, fallbackText);
}

// ── Gesture thresholds ────────────────────────────────────────────────────────
const SH = 55, SU = 80, SD = 80;

// ── Lottie assets ─────────────────────────────────────────────────────────────
const LOTTIE = {
    double_tap:   require('../../../assets/lottie/double_tap.json'),
    double_done:  require('../../../assets/lottie/double_tap.json'),
    long_press:   require('../../../assets/lottie/long_press.json'),
    long_done:    require('../../../assets/lottie/long_press.json'),
    swipe:        require('../../../assets/lottie/swipe.json'),
    modes_detail: require('../../../assets/lottie/swipe.json'),
    triple_tap:   require('../../../assets/lottie/triple_tap.json'),
    swipe_up:     require('../../../assets/lottie/swipe_up.json'),
    finish:       require('../../../assets/lottie/finish.json'),
};
const LOTTIE_PHONE = require('../../../assets/lottie/phone.json');

// ── Step icon ─────────────────────────────────────────────────────────────────
function StepIcon({ stepId, color }) {
    const op     = useRef(new Animated.Value(0)).current;
    const lottie = useRef(null);

    useEffect(() => {
        op.setValue(0);
        Animated.timing(op, {
            toValue: 1, duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
        lottie.current?.reset();
        lottie.current?.play();
    }, [stepId]); // eslint-disable-line

    const source = LOTTIE[stepId] ?? LOTTIE_PHONE;
    return (
        <Animated.View style={{ opacity: op, alignItems: 'center', justifyContent: 'center' }}>
            <LottieView
                ref={lottie}
                source={source}
                autoPlay loop
                style={{ width: 88, height: 88 }}
                colorFilters={[{ keypath: '*', color }]}
            />
        </Animated.View>
    );
}

// ── Progress dots ─────────────────────────────────────────────────────────────
function ProgressDots({ total, current, color }) {
    const widths = useRef(
        Array.from({ length: total }, (_, i) => new Animated.Value(i === 0 ? 18 : 4))
    ).current;

    useEffect(() => {
        widths.forEach((w, i) => {
            Animated.timing(w, {
                toValue: i === current ? 18 : 4,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        });
    }, [current]); // eslint-disable-line

    if (total > 13) {
        return (
            <Text style={s.stepCounter}>
                <Text style={{ color }}>{current + 1}</Text>
                <Text style={{ color: TEXT_LO }}>{'/' + total}</Text>
            </Text>
        );
    }

    return (
        <View style={s.dotsRow}>
            {widths.map((w, i) => (
                <Animated.View key={i} style={[s.dot, {
                    width: w,
                    backgroundColor: i <= current ? color : TEXT_LO,
                    opacity: i === current ? 1 : i < current ? 0.4 : 0.2,
                }]} />
            ))}
        </View>
    );
}

// ── Waiting dot ───────────────────────────────────────────────────────────────
function WaitingDot({ color }) {
    const op = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(op, { toValue: 0.15, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(op, { toValue: 1.0,  duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, []); // eslint-disable-line
    return <Animated.View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color, opacity: op }} />;
}

// ── Language card ─────────────────────────────────────────────────────────────
function LangCard({ label, sublabel, color, active }) {
    return (
        <View style={[
            s.langCard,
            active
                ? { backgroundColor: BG_ACTIVE, borderColor: color }
                : { backgroundColor: BG_CARD,   borderColor: BORDER_IDLE },
        ]}>
            <View style={[s.langCardBar, { backgroundColor: active ? color : BG_CARD }]} />
            <View style={s.langCardContent}>
                <Text style={[s.langLabel, { color: active ? TEXT_HI : TEXT_MID }]}>{label}</Text>
                {active && <Text style={[s.langSublabel, { color }]}>{sublabel}</Text>}
            </View>
        </View>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OnboardingScreen({
    onComplete,
    initialPhase = 'language',
    initialLang  = 'en',
    isRepeat     = false,
}) {
    const [phase,      setPhase]      = useState(initialPhase);
    const [selLang,    setSelLang]    = useState(initialLang);
    const [lang,       setLang]       = useState(initialLang);
    const [tutStep,    setTutStep]    = useState(0);
    const [accentColor, setAccentColor] = useState(STEP_COLOR.welcome ?? ACCENT_BLUE);

    const phaseRef      = useRef(initialPhase);
    const langRef       = useRef(initialLang);
    const selLangRef    = useRef(initialLang);
    const tutStepRef    = useRef(0);
    const waitingFor    = useRef(null);
    const isRepeatRef   = useRef(isRepeat);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;
    const isAutoAdv     = useRef(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const stepFade = useRef(new Animated.Value(1)).current;

    const tapCount  = useRef(0);
    const tapTimer  = useRef(null);
    const longTimer = useRef(null);
    const longFired = useRef(false);
    const startPos  = useRef({ x: 0, y: 0 });

    const runStepRef     = useRef(null);
    const gestureRef     = useRef(null);
    const confirmLangRef = useRef(null);
    const skipRef        = useRef(null);

    const EASE_OUT = Easing.out(Easing.cubic);
    const EASE_IN  = Easing.in(Easing.cubic);

    // ── Fade helpers ──────────────────────────────────────────────────────────
    const fadeIn = (cb) => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, easing: EASE_OUT, useNativeDriver: true }).start(cb);
    };

    const fadeOut = (cb) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, easing: EASE_IN, useNativeDriver: true }).start(cb);
    };

    const crossFadeStep = (newColor, cb) => {
        Animated.timing(stepFade, { toValue: 0, duration: 160, easing: EASE_IN, useNativeDriver: true }).start(() => {
            setAccentColor(newColor);
            cb?.();
            Animated.timing(stepFade, { toValue: 1, duration: 240, easing: EASE_OUT, useNativeDriver: true }).start();
        });
    };

    // ── Skip ──────────────────────────────────────────────────────────────────
    skipRef.current = () => {
        const steps   = STEPS[langRef.current] ?? STEPS.en;
        const finishI = steps.findIndex(st => st.id === 'finish');
        if (finishI < 0) return;
        isAutoAdv.current  = false;
        waitingFor.current = null;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        playVoice('skipped', langRef.current, null,
            langRef.current === 'ar' ? 'تمَّ التخطّي.' : 'Skipped.');
        setTimeout(() => runStepRef.current(finishI, langRef.current), 700);
    };

    // ── Core step runner ──────────────────────────────────────────────────────
    runStepRef.current = (idx, curLang) => {
        const steps = STEPS[curLang] ?? STEPS.en;
        if (idx >= steps.length) return;
        const step  = steps[idx];
        const color = STEP_COLOR[step.id] ?? ACCENT_BLUE;

        waitingFor.current = step.waitFor;
        tutStepRef.current = idx;
        isAutoAdv.current  = false;

        crossFadeStep(color, () => setTutStep(idx));

        setTimeout(() => {
            if (step.waitFor) {
                isAutoAdv.current = false;
                speakStep(step.voiceKey, step.text, curLang);
            } else {
                isAutoAdv.current = true;
                const next = idx + 1;
                const advance = () => {
                    isAutoAdv.current = false;
                    setTimeout(() => {
                        if (next >= steps.length) onCompleteRef.current(curLang);
                        else runStepRef.current(next, curLang);
                    }, 700);
                };
                speakStep(step.voiceKey, step.text, curLang, advance, advance);
            }
        }, 120);
    };

    // ── Gesture handler ───────────────────────────────────────────────────────
    gestureRef.current = (gType) => {
        if (waitingFor.current !== gType) return;
        waitingFor.current = null;
        const curLang = langRef.current;
        const step    = (STEPS[curLang] ?? STEPS.en)[tutStepRef.current];
        if (step?.id === 'finish') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setTimeout(() => onCompleteRef.current(curLang), 150);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => runStepRef.current(tutStepRef.current + 1, curLang), 250);
    };

    // ── Language confirm ──────────────────────────────────────────────────────
    confirmLangRef.current = () => {
        const chosen = selLangRef.current;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        playVoice('lang_confirm', chosen, null,
            chosen === 'en' ? 'Got it.' : 'تمَّ الأمر.');
        setTimeout(() => {
            fadeOut(() => {
                langRef.current  = chosen;
                phaseRef.current = 'tutorial';
                setLang(chosen);
                setPhase('tutorial');
                setTutStep(0);
                tutStepRef.current = 0;
                waitingFor.current = null;
                isAutoAdv.current  = false;
                fadeIn(() => {
                    const startIdx = isRepeatRef.current ? getRepeatStart(chosen) : 0;
                    setTimeout(() => {
                        if (isRepeatRef.current) {
                            playVoice('repeat_reminder', chosen,
                                () => setTimeout(() => runStepRef.current(startIdx, chosen), 400),
                                chosen === 'ar'
                                    ? 'بسرعة — اِنقُر مرة لإعادة أي خطوة.'
                                    : 'Quick reminder — tap once to replay any step.',
                            );
                        } else {
                            runStepRef.current(startIdx, chosen);
                        }
                    }, 100);
                });
            });
        }, 380);
    };

    // ── Mount ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        fadeIn();
        if (initialPhase === 'tutorial') {
            const startIdx = isRepeatRef.current ? getRepeatStart(initialLang) : 0;
            setTimeout(() => runStepRef.current(startIdx, initialLang), 200);
        } else {
            setTimeout(() => speakLangIntro(), 400);
        }
        return () => stopVoice();
    }, []); // eslint-disable-line

    // ── PanResponder ──────────────────────────────────────────────────────────
    const pan = useRef(PanResponder.create({
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
                    speakLangReannounce();
                } else if (waitingFor.current === 'longPress') {
                    gestureRef.current('longPress');
                } else {
                    if (!isAutoAdv.current) {
                        Haptics.selectionAsync();
                        runStepRef.current(tutStepRef.current, langRef.current);
                    }
                }
            }, 700);
        },

        onPanResponderRelease: (e) => {
            clearTimeout(longTimer.current);
            if (longFired.current) return;

            const dx  = e.nativeEvent.pageX - startPos.current.x;
            const dy  = e.nativeEvent.pageY - startPos.current.y;
            const adx = Math.abs(dx), ady = Math.abs(dy);

            if (dy > SD && ady > adx * 1.3) {
                tapCount.current = 0; clearTimeout(tapTimer.current);
                if (phaseRef.current === 'tutorial' && isRepeatRef.current) skipRef.current();
                return;
            }

            if (dy < -SU && ady > adx * 1.3) {
                tapCount.current = 0; clearTimeout(tapTimer.current);
                if (phaseRef.current === 'tutorial') gestureRef.current('swipeUp');
                return;
            }

            if (adx >= SH && adx > ady * 1.2) {
                tapCount.current = 0; clearTimeout(tapTimer.current);
                if (phaseRef.current === 'language') {
                    const code = selLangRef.current === 'en' ? 'ar' : 'en';
                    selLangRef.current = code; setSelLang(code);
                    Haptics.selectionAsync();
                    speakLangSelected(code);
                } else {
                    gestureRef.current('swipe');
                }
                return;
            }

            if (adx > 20 || ady > 20) return;

            tapCount.current += 1;
            clearTimeout(tapTimer.current);

            if (tapCount.current === 3) {
                tapCount.current = 0;
                if (phaseRef.current === 'tutorial') gestureRef.current('tripleTap');
                return;
            }

            if (tapCount.current > 3) {
                tapCount.current = 0;
                return;
            }

            tapTimer.current = setTimeout(() => {
                const count = tapCount.current; tapCount.current = 0;
                if (count === 2) {
                    if (phaseRef.current === 'language') confirmLangRef.current();
                    else gestureRef.current('doubleTap');
                } else if (count === 1) {
                    if (phaseRef.current === 'language') {
                        speakLangReannounce();
                    } else {
                        if (!isAutoAdv.current) {
                            stopVoice();
                            Haptics.selectionAsync();
                            runStepRef.current(tutStepRef.current, langRef.current);
                        }
                    }
                }
            }, 380);
        },

        onPanResponderTerminate: () => {
            clearTimeout(longTimer.current);
            clearTimeout(tapTimer.current);
            longFired.current = false;
            tapCount.current  = 0;
        },
    })).current;

    // ── Derived ───────────────────────────────────────────────────────────────
    const steps     = STEPS[lang] ?? STEPS.en;
    const step      = steps[Math.min(tutStep, steps.length - 1)];
    const stepColor = STEP_COLOR[step?.id] ?? ACCENT_BLUE;
    const isWaiting = !!step?.waitFor;
    const isRTL     = lang === 'ar';

    return (
        <View style={s.root} {...pan.panHandlers}>
            <StatusBar hidden />

            <Animated.View style={[s.screen, { opacity: fadeAnim }]}>

                <View style={s.header}>
                    <Image
                        source={require('../../../assets/images/logorm.png')}
                        style={s.logo}
                        resizeMode="contain"
                        accessibilityLabel="Abserny"
                    />
                </View>

                {/* ── Language phase ── */}
                {phase === 'language' && (
                    <View style={s.langScreen}>
                        <Text style={s.langEyebrow}>SELECT LANGUAGE · اختر اللغة</Text>
                        <View style={s.langList}>
                            <LangCard label="English"  sublabel="double tap to confirm"     color={ACCENT_BLUE} active={selLang === 'en'} />
                            <View style={s.langDivider} />
                            <LangCard label="العربية" sublabel="اِنقُر مرتين للتأكيد"      color={ACCENT_TEAL} active={selLang === 'ar'} />
                        </View>
                        <Text style={s.langHint}>
                            {selLang === 'en'
                                ? 'swipe to switch · double tap to confirm'
                                : 'مرّر للتبديل · اِنقُر مرتين للتأكيد'}
                        </Text>
                    </View>
                )}

                {/* ── Tutorial phase ── */}
                {phase === 'tutorial' && (
                    <View style={s.tutScreen}>
                        <View style={s.progressArea}>
                            <ProgressDots total={steps.length} current={tutStep} color={stepColor} />
                        </View>

                        <Animated.View style={[s.instructionArea, { opacity: stepFade }]}>
                            <Text style={[s.instructionText, isRTL && s.rtl]}>
                                {step?.text ?? ''}
                            </Text>
                        </Animated.View>

                        <Animated.View style={[s.iconArea, { opacity: stepFade }]}>
                            <StepIcon stepId={step?.id} color={stepColor} />
                        </Animated.View>

                        <View style={s.hintArea}>
                            {isWaiting ? (
                                <View style={s.waitingRow}>
                                    <WaitingDot color={stepColor} />
                                    <Text style={[s.waitingText, { color: stepColor }]}>
                                        {isRTL ? 'يجري الانتظار' : 'WAITING FOR GESTURE'}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={s.hintText}>
                                    {isRTL ? 'اِنقُر مرة للإعادة' : 'TAP ONCE TO REPLAY'}
                                </Text>
                            )}
                            {isRepeat && !isWaiting && (
                                <Text style={[s.hintText, { marginTop: 8 }]}>
                                    {isRTL ? 'مرّر للأسفل للتخطّي' : 'SWIPE DOWN TO SKIP'}
                                </Text>
                            )}
                        </View>

                        <View style={[s.bottomLine, { backgroundColor: accentColor }]} />
                    </View>
                )}

            </Animated.View>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root:   { flex: 1, backgroundColor: BG },
    screen: { flex: 1 },
    header: { alignItems: 'center', paddingTop: 56 },
    logo:   { width: 96, height: 30 },

    langScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 64 },
    langEyebrow: { color: TEXT_MID, fontSize: 9, letterSpacing: 3, fontWeight: '600', textAlign: 'center', marginBottom: 36 },
    langList: { width: '100%', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER_IDLE },
    langCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 28, borderWidth: 0 },
    langCardBar: { width: 3, height: 32, marginRight: 22 },
    langCardContent: { flex: 1, paddingRight: 20 },
    langLabel: { fontSize: 28, fontWeight: '500', letterSpacing: -0.4 },
    langSublabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 5 },
    langDivider: { height: 1, backgroundColor: BORDER_IDLE },
    langHint: { marginTop: 28, color: TEXT_LO, fontSize: 10, letterSpacing: 1.5, textAlign: 'center', fontWeight: '500' },

    tutScreen: { flex: 1, paddingHorizontal: 30 },
    progressArea: { paddingTop: 24, paddingBottom: 36, alignItems: 'flex-start' },
    dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot: { height: 3, borderRadius: 1.5 },
    stepCounter: { fontSize: 12, fontWeight: '600', letterSpacing: 1, color: TEXT_LO },

    instructionArea: { flex: 1, justifyContent: 'center', paddingBottom: 12 },
    instructionText: { color: TEXT_HI, fontSize: 26, lineHeight: 40, fontWeight: '300', letterSpacing: -0.3, textAlign: 'left' },
    rtl: { textAlign: 'right', writingDirection: 'rtl' },

    iconArea: { alignItems: 'center', justifyContent: 'center', paddingBottom: 28, height: 104 },

    hintArea: { alignItems: 'center', paddingBottom: 52 },
    waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    waitingText: { fontSize: 9, letterSpacing: 2.5, fontWeight: '600' },
    hintText: { color: TEXT_LO, fontSize: 9, letterSpacing: 2.5, fontWeight: '600' },

    bottomLine: { position: 'absolute', bottom: 0, left: '25%', right: '25%', height: 1 },
});
