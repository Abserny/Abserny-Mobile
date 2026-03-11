/**
 * OnboardingScreen.js
 * Two-phase onboarding:
 *   Phase 1 — Language picker (gesture-driven, fully spoken)
 *   Phase 2 — Interactive gesture tutorial (user must perform each gesture)
 *
 * Fix v3.2 — all three bugs were stale closure issues in PanResponder:
 *   1. PanResponder reads phase/lang via refs (not captured state)
 *   2. gestureDetected reads lang/tutStep via refs (not stale closures)
 *   3. Tutorial speech fires after phase transition with correct language
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, Animated,
    Dimensions, StatusBar, Image, PanResponder,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const CYAN  = '#00BFFF';
const GREEN = '#00E5A0';

function speakNow(text, lang = 'en-US', rate = 0.88) {
    Speech.stop();
    Speech.speak(text, { language: lang, rate });
}

const TUTORIAL_STEPS = {
    en: [
        { id: 'intro',       text: "Let's learn the gestures. I'll guide you through each one.", waitFor: null,        icon: '👋' },
        { id: 'double_tap',  text: 'First gesture: Double tap anywhere to scan. Try it now.',    waitFor: 'doubleTap', icon: '👆👆' },
        { id: 'double_done', text: 'Perfect. Double tap scans and describes what the camera sees.', waitFor: null,     icon: '✓' },
        { id: 'long_press',  text: 'Second: Long press to repeat the last result. Try holding your finger down now.', waitFor: 'longPress', icon: '✋' },
        { id: 'long_done',   text: 'Great. Long press repeats the last description.',            waitFor: null,        icon: '✓' },
        { id: 'swipe',       text: 'Third: Swipe right or left to change modes. Try swiping right.', waitFor: 'swipe', icon: '👉' },
        { id: 'swipe_done',  text: 'Good. Four modes: Scene, Object, Read, People.',             waitFor: null,        icon: '✓' },
        { id: 'triple_tap',  text: 'Last: Triple tap to open settings. Tap three times now.',    waitFor: 'tripleTap', icon: '👆👆👆' },
        { id: 'finish',      text: 'Excellent. You know all gestures. Double tap to start.',     waitFor: null,        icon: '🎉' },
    ],
    ar: [
        { id: 'intro',       text: 'لنتعلم الإيماءات. سأرشدك خطوة بخطوة.',                       waitFor: null,        icon: '👋' },
        { id: 'double_tap',  text: 'الإيماءة الأولى: انقر مرتين في أي مكان للمسح. جرّبها الآن.', waitFor: 'doubleTap', icon: '👆👆' },
        { id: 'double_done', text: 'ممتاز. النقر المزدوج يمسح ويصف ما تراه الكاميرا.',            waitFor: null,        icon: '✓' },
        { id: 'long_press',  text: 'الثانية: اضغط مطولاً لتكرار آخر نتيجة. جرّب الآن.',          waitFor: 'longPress', icon: '✋' },
        { id: 'long_done',   text: 'رائع. الضغط المطوّل يكرر آخر وصف.',                           waitFor: null,        icon: '✓' },
        { id: 'swipe',       text: 'الثالثة: مرر يميناً أو يساراً لتغيير الوضع. جرّب التمرير.',  waitFor: 'swipe',     icon: '👉' },
        { id: 'swipe_done',  text: 'جيد. أربعة أوضاع: مشهد، أشياء، قراءة، أشخاص.',              waitFor: null,        icon: '✓' },
        { id: 'triple_tap',  text: 'الأخيرة: انقر ثلاث مرات لفتح الإعدادات. جرّب الآن.',        waitFor: 'tripleTap', icon: '👆👆👆' },
        { id: 'finish',      text: 'ممتاز. تعلمت كل الإيماءات. انقر مرتين للبدء.',               waitFor: null,        icon: '🎉' },
    ],
};

export default function OnboardingScreen({ onComplete }) {

    const [phase,        setPhase]        = useState('language');
    const [selectedLang, setSelectedLang] = useState('en');
    const [lang,         setLang]         = useState('en');
    const [tutStep,      setTutStep]      = useState(0);

    // ── Refs mirror state so PanResponder is never stale ─────────────────────
    const phaseRef        = useRef('language');
    const langRef         = useRef('en');
    const selectedLangRef = useRef('en');
    const tutStepRef      = useRef(0);
    const waitingFor      = useRef(null);

    // Animations
    const fadeAnim     = useRef(new Animated.Value(0)).current;
    const slideAnim    = useRef(new Animated.Value(30)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim    = useRef(new Animated.Value(1)).current;

    // Gesture timing
    const tapCount  = useRef(0);
    const tapTimer  = useRef(null);
    const longTimer = useRef(null);
    const longFired = useRef(false);
    const startPos  = useRef({ x: 0, y: 0 });

    // ── Boot ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();

        setTimeout(() => speakNow(
            'Welcome to Abserny. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',
            'en-US', 0.88
        ), 400);

        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.1, duration: 900, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, []);

    // ── Tutorial step runner ──────────────────────────────────────────────────
    // Takes lang as a parameter — never reads from stale ref inside setTimeout
    const runStep = useCallback((stepIndex, currentLang) => {
        const steps = TUTORIAL_STEPS[currentLang] || TUTORIAL_STEPS.en;
        if (stepIndex >= steps.length) return;

        const step  = steps[stepIndex];
        const sLang = currentLang === 'ar' ? 'ar-SA' : 'en-US';
        const sRate = currentLang === 'ar' ? 0.82 : 0.88;

        waitingFor.current  = step.waitFor;
        tutStepRef.current  = stepIndex;
        setTutStep(stepIndex);

        Animated.timing(progressAnim, {
            toValue: stepIndex / (steps.length - 1),
            duration: 400,
            useNativeDriver: false,
        }).start();

        // Speak step — if no gesture needed, advance AFTER speech finishes
        setTimeout(() => {
            if (!step.waitFor) {
                const nextIndex = stepIndex + 1;
                Speech.stop();
                Speech.speak(step.text, {
                    language: sLang, rate: sRate,
                    onDone:  () => setTimeout(() => {
                        if (nextIndex >= steps.length) onComplete(currentLang);
                            else runStep(nextIndex, currentLang);
                    }, 600),
                    onError: () => setTimeout(() => {
                        if (nextIndex >= steps.length) onComplete(currentLang);
                            else runStep(nextIndex, currentLang);
                    }, 1000),
                });
            } else {
                speakNow(step.text, sLang, sRate);
            }
        }, 150);
    }, [onComplete, progressAnim]);

    // ── Gesture confirmed during tutorial ─────────────────────────────────────
    // Reads ONLY refs — never stale
    const onGestureDetected = useCallback((gestureType) => {
        if (waitingFor.current !== gestureType) return;
        waitingFor.current = null;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const nextIndex   = tutStepRef.current + 1;
        const currentLang = langRef.current;           // ref — always current
        const steps       = TUTORIAL_STEPS[currentLang] || TUTORIAL_STEPS.en;

        if (nextIndex < steps.length) {
            setTimeout(() => runStep(nextIndex, currentLang), 300);
        }
    }, [runStep]);

    // ── Confirm language → start tutorial ────────────────────────────────────
    const confirmLang = useCallback(() => {
        const chosenLang = selectedLangRef.current;   // ref — always current

        // Update all refs BEFORE any async work
        langRef.current  = chosenLang;
        phaseRef.current = 'tutorial';
        setLang(chosenLang);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        speakNow(chosenLang === 'en' ? 'Got it.' : 'تم.', chosenLang === 'en' ? 'en-US' : 'ar-SA');

        setTimeout(() => {
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                setPhase('tutorial');
                setTutStep(0);
                tutStepRef.current = 0;
                waitingFor.current = null;
                fadeAnim.setValue(0);
                slideAnim.setValue(20);

                Animated.parallel([
                    Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                ]).start(() => {
                        // chosenLang is captured in this closure — never stale
                        runStep(0, chosenLang);
                    });
            });
        }, 700);
    }, [fadeAnim, slideAnim, runStep]);

    // ── PanResponder — reads ONLY refs ────────────────────────────────────────
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
                        'en-US', 0.88
                    );
                } else {
                    onGestureDetected('longPress');
                }
            }, 700);
        },

        onPanResponderRelease: (e) => {
            clearTimeout(longTimer.current);
            if (longFired.current) return;

            const dx = e.nativeEvent.pageX - startPos.current.x;
            const dy = e.nativeEvent.pageY - startPos.current.y;

            // Swipe
            if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                tapCount.current = 0;
                clearTimeout(tapTimer.current);

                if (phaseRef.current === 'language') {
                    const code = dx > 0 ? 'en' : 'ar';
                    selectedLangRef.current = code;
                    setSelectedLang(code);
                    const msg  = code === 'en'
                        ? 'English selected. Double tap to confirm.'
                        : 'تم اختيار العربية. انقر مرتين للتأكيد.';
                    speakNow(msg, code === 'en' ? 'en-US' : 'ar-SA', code === 'en' ? 0.88 : 0.82);
                    Haptics.selectionAsync();
                } else {
                    onGestureDetected('swipe');
                }
                return;
            }

            if (Math.abs(dx) > 20 || Math.abs(dy) > 20) return;

            // Tap counting
            tapCount.current += 1;
            clearTimeout(tapTimer.current);

            if (tapCount.current >= 3) {
                tapCount.current = 0;
                if (phaseRef.current === 'tutorial') onGestureDetected('tripleTap');
                return;
            }

            tapTimer.current = setTimeout(() => {
                const count      = tapCount.current;
                tapCount.current = 0;

                if (count === 2) {
                    if (phaseRef.current === 'language') {
                        confirmLang();
                    } else {
                        onGestureDetected('doubleTap');
                    }
                }
                if (count === 1 && phaseRef.current === 'language') {
                    const code = selectedLangRef.current;
                    speakNow(
                        code === 'en'
                            ? 'English selected. Double tap to confirm.'
                            : 'تم اختيار العربية. انقر مرتين للتأكيد.',
                        code === 'en' ? 'en-US' : 'ar-SA'
                    );
                }
            }, 320);
        },

        onPanResponderTerminate: () => {
            clearTimeout(longTimer.current);
            clearTimeout(tapTimer.current);
        },
    })).current;

    // ── Render ────────────────────────────────────────────────────────────────
    const steps       = TUTORIAL_STEPS[lang] || TUTORIAL_STEPS.en;
    const currentStep = steps[Math.min(tutStep, steps.length - 1)];
    const progressW   = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    return (
        <View style={styles.root} {...panResponder.panHandlers}>
            <StatusBar hidden />
            <View style={styles.gridH1} />
            <View style={styles.gridH2} />
            <View style={styles.gridV1} />
            <View style={styles.gridV2} />

            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <Image source={require('./assets/logorm.png')} style={styles.logo} />

                {phase === 'language' ? (
                    <View style={styles.langPhase}>
                        <Text style={styles.phaseLabel}>SELECT LANGUAGE · اختر اللغة</Text>
                        <View style={styles.langCards}>
                            <Animated.View style={[
                                styles.langCard,
                                selectedLang === 'en' && { borderColor: CYAN, backgroundColor: 'rgba(0,191,255,0.08)' },
                                { transform: [{ scale: selectedLang === 'en' ? pulseAnim : new Animated.Value(1) }] },
                            ]}>
                                <Text style={styles.langFlag}>🇬🇧</Text>
                                <Text style={[styles.langName, selectedLang === 'en' && { color: CYAN }]}>English</Text>
                                <Text style={styles.langGesture}>swipe right →</Text>
                            </Animated.View>
                            <Animated.View style={[
                                styles.langCard,
                                selectedLang === 'ar' && { borderColor: GREEN, backgroundColor: 'rgba(0,229,160,0.08)' },
                                { transform: [{ scale: selectedLang === 'ar' ? pulseAnim : new Animated.Value(1) }] },
                            ]}>
                                <Text style={styles.langFlag}>🇸🇦</Text>
                                <Text style={[styles.langName, selectedLang === 'ar' && { color: GREEN }]}>العربية</Text>
                                <Text style={styles.langGesture}>← مرر يساراً</Text>
                            </Animated.View>
                        </View>
                        <View style={styles.confirmHint}>
                            <View style={[styles.confirmDot, { backgroundColor: selectedLang === 'en' ? CYAN : GREEN }]} />
                            <Text style={[styles.confirmText, { color: selectedLang === 'en' ? CYAN : GREEN }]}>
                                {selectedLang === 'en' ? 'Double tap to confirm' : 'انقر مرتين للتأكيد'}
                            </Text>
                        </View>
                    </View>

                ) : (
                        <View style={styles.tutPhase}>
                            <View style={styles.progressTrack}>
                                <Animated.View style={[styles.progressFill, { width: progressW }]} />
                            </View>
                            <Text style={styles.stepCounter}>
                                {Math.min(tutStep + 1, steps.length)} / {steps.length}
                            </Text>
                            <View style={styles.gestureIconBox}>
                                <Text style={styles.gestureIconBig}>{currentStep?.icon || '👆'}</Text>
                                {currentStep?.waitFor && (
                                    <View style={styles.waitingPill}>
                                        <Text style={styles.waitingText}>
                                            {lang === 'ar' ? 'جارٍ الانتظار...' : 'waiting for gesture...'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.tutText, lang === 'ar' && styles.rtlText]}>
                                {currentStep?.text || ''}
                            </Text>
                            <Text style={styles.singleTapHint}>
                                {lang === 'ar' ? 'انقر مرة للإعادة' : 'single tap to repeat'}
                            </Text>
                        </View>
                    )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    root:          { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    gridH1:        { position:'absolute', top:SCREEN_H*0.28, left:0, right:0, height:1, backgroundColor:'rgba(0,191,255,0.07)' },
    gridH2:        { position:'absolute', top:SCREEN_H*0.72, left:0, right:0, height:1, backgroundColor:'rgba(0,191,255,0.07)' },
    gridV1:        { position:'absolute', left:SCREEN_W*0.28, top:0, bottom:0, width:1, backgroundColor:'rgba(0,191,255,0.07)' },
    gridV2:        { position:'absolute', left:SCREEN_W*0.72, top:0, bottom:0, width:1, backgroundColor:'rgba(0,191,255,0.07)' },
    content:       { alignItems: 'center', paddingHorizontal: 28, width: '100%' },
    logo:          { width: 140, height: 44, resizeMode: 'contain', marginBottom: 36 },
    langPhase:     { alignItems: 'center', width: '100%', gap: 28 },
    phaseLabel:    { color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: 3 },
    langCards:     { flexDirection: 'row', gap: 14, width: '100%' },
    langCard:      { flex: 1, paddingVertical: 28, borderRadius: 14, alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
    langFlag:      { fontSize: 34 },
    langName:      { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '700' },
    langGesture:   { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
    confirmHint:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    confirmDot:    { width: 6, height: 6, borderRadius: 3 },
    confirmText:   { fontSize: 13, fontWeight: '600' },
    tutPhase:      { alignItems: 'center', width: '100%', gap: 24 },
    progressTrack: { width: '100%', height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
    progressFill:  { height: '100%', backgroundColor: CYAN, borderRadius: 1 },
    stepCounter:   { color: 'rgba(255,255,255,0.25)', fontSize: 11, letterSpacing: 3 },
    gestureIconBox:{ alignItems: 'center', gap: 12, marginVertical: 8 },
    gestureIconBig:{ fontSize: 56 },
    waitingPill:   { paddingHorizontal: 14, paddingVertical: 5, backgroundColor: 'rgba(0,191,255,0.1)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,191,255,0.3)' },
    waitingText:   { color: CYAN, fontSize: 11, letterSpacing: 2 },
    tutText:       { color: 'rgba(255,255,255,0.85)', fontSize: 17, textAlign: 'center', lineHeight: 26 },
    rtlText:       { textAlign: 'right' },
    singleTapHint: { color: 'rgba(255,255,255,0.18)', fontSize: 11, letterSpacing: 2, marginTop: 4 },
});
