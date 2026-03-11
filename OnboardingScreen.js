/**
 * Design: surgical minimalism. No decorative borders, no grids, no box backgrounds.
 * Color is signal only. Typography does the heavy lifting.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, Animated,
    Dimensions, StatusBar, Image, PanResponder,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { GESTURE_ICONS } from './AbsernyIcons';

const { width: W, height: H } = Dimensions.get('window');
const BG     = '#161717';
const CYAN   = '#00BFFF';
const GREEN  = '#00E5A0';
const AMBER  = '#FFB020';
const PURPLE = '#A78BFA';
const DIM    = 'rgba(255,255,255,0.28)';
const DIMMER = 'rgba(255,255,255,0.12)';

const STEP_COLORS = {
    intro: CYAN, double_tap: CYAN, double_done: GREEN,
    long_press: PURPLE, long_done: GREEN,
    swipe: GREEN, swipe_done: GREEN,
    triple_tap: AMBER, finish: AMBER,
};

function speakNow(text, lang = 'en-US', rate = 0.88) {
    Speech.stop();
    Speech.speak(text, { language: lang, rate });
}

const TUTORIAL_STEPS = {
    en: [
        { id: 'intro',       text: "Let's learn the gestures. I'll guide you through each one.", waitFor: null         },
        { id: 'double_tap',  text: 'Double tap anywhere to scan. Try it now.',                   waitFor: 'doubleTap'  },
        { id: 'double_done', text: 'Perfect. Double tap scans and describes what the camera sees.', waitFor: null      },
        { id: 'long_press',  text: 'Long press to repeat the last result. Try holding down now.', waitFor: 'longPress' },
        { id: 'long_done',   text: 'Great. Long press repeats the last description.',            waitFor: null         },
        { id: 'swipe',       text: 'Swipe right or left to change modes. Try it now.',           waitFor: 'swipe'      },
        { id: 'swipe_done',  text: 'Good. Four modes: Scene, Object, Read, People.',             waitFor: null         },
        { id: 'triple_tap',  text: 'Triple tap to open settings. Tap three times now.',          waitFor: 'tripleTap'  },
        { id: 'finish',      text: 'You know all the gestures. Double tap now to start.',        waitFor: 'doubleTap'  },
    ],
    ar: [
        { id: 'intro',       text: 'لنتعلم الإيماءات. سأرشدك خطوة بخطوة.',                        waitFor: null         },
        { id: 'double_tap',  text: 'انقر مرتين في أي مكان للمسح. جرّبها الآن.',                    waitFor: 'doubleTap'  },
        { id: 'double_done', text: 'ممتاز. النقر المزدوج يمسح ويصف ما تراه الكاميرا.',             waitFor: null         },
        { id: 'long_press',  text: 'اضغط مطولاً لتكرار آخر نتيجة. جرّب الآن.',                    waitFor: 'longPress'  },
        { id: 'long_done',   text: 'رائع. الضغط المطوّل يكرر آخر وصف.',                            waitFor: null         },
        { id: 'swipe',       text: 'مرر يميناً أو يساراً لتغيير الوضع. جرّب الآن.',               waitFor: 'swipe'      },
        { id: 'swipe_done',  text: 'جيد. أربعة أوضاع: مشهد، أشياء، قراءة، أشخاص.',               waitFor: null         },
        { id: 'triple_tap',  text: 'انقر ثلاث مرات لفتح الإعدادات. جرّب الآن.',                   waitFor: 'tripleTap'  },
        { id: 'finish',      text: 'تعلمت كل الإيماءات. انقر مرتين الآن للبدء.',                  waitFor: 'doubleTap'  },
    ],
};

// Icon — entrance only, no loop, no box
function GestureIconAnimated({ stepId, color, size = 80 }) {
    const IconComponent = GESTURE_ICONS[stepId];
    const scale   = useRef(new Animated.Value(0.7)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        scale.setValue(0.7);
        opacity.setValue(0);
        Animated.parallel([
            Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 160, friction: 9 }),
            Animated.timing(opacity, { toValue: 1, useNativeDriver: true, duration: 200 }),
        ]).start();
    }, [stepId]);
    if (!IconComponent) return null;
    return (
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
            <IconComponent size={size} color={color} />
        </Animated.View>
    );
}

// Minimal ripple — two clean expanding rings
function WaitingRipple({ color }) {
    const r1 = useRef(new Animated.Value(0)).current;
    const r2 = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = (val, delay) => Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, { toValue: 1, duration: 1600, useNativeDriver: true }),
            Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]));
        const a1 = loop(r1, 0); const a2 = loop(r2, 800);
        a1.start(); a2.start();
        return () => { a1.stop(); a2.stop(); };
    }, []);
    const ring = (val) => ({
        position: 'absolute',
        width: 160, height: 160, borderRadius: 80,
        borderWidth: 1, borderColor: color,
        opacity:   val.interpolate({ inputRange:[0,0.2,1], outputRange:[0,0.35,0] }),
        transform: [{ scale: val.interpolate({ inputRange:[0,1], outputRange:[0.5,1.4] }) }],
    });
    return (
        <View style={{ width:160, height:160, alignItems:'center', justifyContent:'center' }}>
            <Animated.View style={ring(r1)} />
            <Animated.View style={ring(r2)} />
        </View>
    );
}

// Progress — single thin line, no dots
function ProgressBar({ progress, color }) {
    const w = progress.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] });
    return (
        <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: w, backgroundColor: color }]} />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingScreen({
    onComplete,
    initialPhase = 'language',
    initialLang  = 'en',
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
    const onCompleteRef   = useRef(onComplete);
    onCompleteRef.current = onComplete;

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

    // runStep as ref — never stale inside onDone
    const runStepRef = useRef(null);
    runStepRef.current = (stepIndex, currentLang) => {
        const steps = TUTORIAL_STEPS[currentLang] ?? TUTORIAL_STEPS.en;
        if (stepIndex >= steps.length) return;
        const step  = steps[stepIndex];
        const sLang = currentLang === 'ar' ? 'ar-SA' : 'en-US';
        const sRate = currentLang === 'ar' ? 0.82 : 0.88;

        waitingFor.current = step.waitFor;
        tutStepRef.current = stepIndex;

        stepFade.setValue(0);
        stepSlide.setValue(14);
        setTutStep(stepIndex);
        requestAnimationFrame(() => {
            Animated.parallel([
                Animated.timing(stepFade,  { toValue:1, duration:240, useNativeDriver:true }),
                Animated.timing(stepSlide, { toValue:0, duration:240, useNativeDriver:true }),
            ]).start();
        });

        Animated.timing(progressAnim, {
            toValue: steps.length > 1 ? stepIndex / (steps.length - 1) : 1,
            duration: 500, useNativeDriver: false,
        }).start();

        setTimeout(() => {
            Speech.stop();
            if (step.waitFor) {
                Speech.speak(step.text, { language: sLang, rate: sRate });
            } else {
                const next = stepIndex + 1;
                Speech.speak(step.text, {
                    language: sLang, rate: sRate,
                    onDone:  () => setTimeout(() => {
                        if (next >= steps.length) onCompleteRef.current(currentLang);
                            else runStepRef.current(next, currentLang);
                    }, 500),
                    onError: () => setTimeout(() => {
                        if (next >= steps.length) onCompleteRef.current(currentLang);
                            else runStepRef.current(next, currentLang);
                    }, 1000),
                });
            }
        }, 100);
    };

    const onGestureDetected = (gestureType) => {
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

    const animateLangCard = (code) => {
        Animated.parallel([
            Animated.spring(code==='en' ? enScale : arScale, { toValue:1,    useNativeDriver:true, tension:260, friction:12 }),
            Animated.spring(code==='en' ? arScale : enScale, { toValue:0.96, useNativeDriver:true, tension:260, friction:12 }),
        ]).start();
    };

    const confirmLang = () => {
        const chosenLang = selectedLangRef.current;
        langRef.current  = chosenLang;
        phaseRef.current = 'tutorial';
        setLang(chosenLang);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        speakNow(chosenLang==='en' ? 'Got it.' : 'تم.', chosenLang==='en' ? 'en-US' : 'ar-SA');
        setTimeout(() => {
            Animated.timing(fadeAnim, { toValue:0, duration:220, useNativeDriver:true }).start(() => {
                setPhase('tutorial');
                setTutStep(0);
                tutStepRef.current = 0;
                waitingFor.current = null;
                stepFade.setValue(1); stepSlide.setValue(0);
                fadeAnim.setValue(0); slideAnim.setValue(16);
                Animated.parallel([
                    Animated.timing(fadeAnim,  { toValue:1, duration:320, useNativeDriver:true }),
                    Animated.timing(slideAnim, { toValue:0, duration:320, useNativeDriver:true }),
                ]).start(() => setTimeout(() => runStepRef.current(0, chosenLang), 100));
            });
        }, 500);
    };

    useEffect(() => {
        Speech.speak(' ', { language: initialLang==='ar' ? 'ar-SA' : 'en-US', volume: 0 });
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue:1, duration:500, useNativeDriver:true }),
            Animated.timing(slideAnim, { toValue:0, duration:500, useNativeDriver:true }),
        ]).start();
        if (initialPhase === 'tutorial') {
            setTimeout(() => runStepRef.current(0, initialLang), 600);
        } else {
            setTimeout(() => speakNow(
                'Welcome to Abserny. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',
                'en-US', 0.88
            ), 400);
        }
    }, []); // eslint-disable-line

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
                    speakNow('Swipe right for English. Swipe left for Arabic. Double tap to confirm.', 'en-US');
                } else { onGestureDetected('longPress'); }
            }, 700);
        },
        onPanResponderRelease: (e) => {
            clearTimeout(longTimer.current);
            if (longFired.current) return;
            const dx = e.nativeEvent.pageX - startPos.current.x;
            const dy = e.nativeEvent.pageY - startPos.current.y;
            if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                tapCount.current = 0; clearTimeout(tapTimer.current);
                if (phaseRef.current === 'language') {
                    const code = dx > 0 ? 'en' : 'ar';
                    selectedLangRef.current = code;
                    setSelectedLang(code);
                    animateLangCard(code);
                    speakNow(
                        code==='en' ? 'English selected. Double tap to confirm.' : 'تم اختيار العربية. انقر مرتين للتأكيد.',
                        code==='en' ? 'en-US' : 'ar-SA', code==='en' ? 0.88 : 0.82
                    );
                    Haptics.selectionAsync();
                } else { onGestureDetected('swipe'); }
                return;
            }
            if (Math.abs(dx) > 20 || Math.abs(dy) > 20) return;
            tapCount.current += 1;
            clearTimeout(tapTimer.current);
            if (tapCount.current >= 3) {
                tapCount.current = 0;
                if (phaseRef.current === 'tutorial') onGestureDetected('tripleTap');
                return;
            }
            tapTimer.current = setTimeout(() => {
                const count = tapCount.current; tapCount.current = 0;
                if (count === 2) {
                    if (phaseRef.current === 'language') confirmLang();
                        else onGestureDetected('doubleTap');
                } else if (count === 1 && phaseRef.current === 'language') {
                    const code = selectedLangRef.current;
                    speakNow(
                        code==='en' ? 'English selected. Double tap to confirm.' : 'تم اختيار العربية. انقر مرتين للتأكيد.',
                        code==='en' ? 'en-US' : 'ar-SA'
                    );
                }
            }, 320);
        },
        onPanResponderTerminate: () => { clearTimeout(longTimer.current); clearTimeout(tapTimer.current); },
    })).current;

    const steps       = TUTORIAL_STEPS[lang] ?? TUTORIAL_STEPS.en;
    const currentStep = steps[Math.min(tutStep, steps.length - 1)];
    const stepColor   = STEP_COLORS[currentStep?.id] ?? CYAN;
    const isWaiting   = !!currentStep?.waitFor;
    const isRTL       = lang === 'ar';
    const stepNum     = tutStep + 1;

    return (
        <View style={s.root} {...panResponder.panHandlers}>
            <StatusBar hidden />
            <Animated.View style={[s.content, { opacity:fadeAnim, transform:[{ translateY:slideAnim }] }]}>

                <Image source={require('./assets/logo.png')} style={s.logo} />

                {phase === 'language' ? (
                    /* ── Language picker ─────────────────────────────────── */
                    <View style={s.langWrap}>
                        <Text style={s.eyebrow}>SELECT LANGUAGE · اختر اللغة</Text>

                        <View style={s.langRow}>
                            {[
                                { code:'en', label:'English', sub:'swipe right', color:CYAN,  anim:enScale },
                                { code:'ar', label:'العربية', sub:'مرر يساراً',  color:GREEN, anim:arScale },
                            ].map(({ code, label, sub, color, anim }) => {
                                    const active = selectedLang === code;
                                    return (
                                        <Animated.View key={code} style={[
                                            s.langCard,
                                            { transform:[{ scale:anim }] },
                                            active && { borderColor: color },
                                        ]}>
                                            {/* Accent line top */}
                                            <View style={[s.langAccent, { backgroundColor: active ? color : 'transparent' }]} />
                                            <Text style={[s.langLabel, { color: active ? color : DIM }]}>{label}</Text>
                                            <Text style={[s.langSub,   { color: active ? color+'66' : DIMMER }]}>{sub}</Text>
                                        </Animated.View>
                                    );
                                })}
                        </View>

                        <Text style={[s.confirmHint, { color: selectedLang==='en' ? CYAN : GREEN }]}>
                            {selectedLang==='en' ? 'double tap to confirm' : 'انقر مرتين للتأكيد'}
                        </Text>
                    </View>

                ) : (
                        /* ── Tutorial ────────────────────────────────────────── */
                        <View style={s.tutWrap}>
                            {/* Step counter + progress */}
                            <View style={s.progressRow}>
                                <Text style={s.stepCounter}>
                                    <Text style={{ color: stepColor }}>{stepNum}</Text>
                                    <Text style={{ color: DIMMER }}>/{steps.length}</Text>
                                </Text>
                                <ProgressBar progress={progressAnim} color={stepColor} />
                            </View>

                            {/* Icon area */}
                            <View style={s.iconWrap}>
                                {isWaiting && (
                                    <View style={StyleSheet.absoluteFill}>
                                        <WaitingRipple color={stepColor} />
                                    </View>
                                )}
                                <Animated.View style={{ opacity:stepFade, transform:[{ translateY:stepSlide }] }}>
                                    <GestureIconAnimated stepId={currentStep?.id} color={stepColor} size={80} />
                                </Animated.View>
                            </View>

                            {/* Step text — large, no box */}
                            <Animated.View style={[s.textWrap, { opacity:stepFade, transform:[{ translateY:stepSlide }] }]}>
                                <Text style={[s.stepText, isRTL && s.rtl]}>{currentStep?.text ?? ''}</Text>
                            </Animated.View>

                            {/* Status line */}
                            <View style={s.statusRow}>
                                {isWaiting ? (
                                    <>
                                        <View style={[s.statusDot, { backgroundColor: stepColor }]} />
                                        <Text style={[s.statusText, { color: stepColor }]}>
                                            {isRTL ? 'جارٍ الانتظار...' : 'waiting...'}
                                        </Text>
                                    </>
                                ) : (
                                        <Text style={s.repeatHint}>
                                            {isRTL ? 'انقر مرة للإعادة' : 'tap once to repeat'}
                                        </Text>
                                    )}
                            </View>
                        </View>
                    )}
            </Animated.View>
        </View>
    );
}

const s = StyleSheet.create({
    root:    { flex:1, backgroundColor:BG, alignItems:'center', justifyContent:'center' },
    content: { alignItems:'center', paddingHorizontal:32, width:'100%' },
    logo:    { width:110, height:36, resizeMode:'contain', marginBottom:52 },

    // Language picker
    langWrap:    { alignItems:'center', width:'100%', gap:32 },
    eyebrow:     { color:DIMMER, fontSize:9, letterSpacing:5, fontWeight:'600' },
    langRow:     { flexDirection:'row', gap:10, width:'100%' },
    langCard:    {
        flex:1, paddingTop:0, paddingBottom:22, paddingHorizontal:16,
        borderRadius:12, alignItems:'center', gap:10,
        borderWidth:1, borderColor:'rgba(255,255,255,0.07)',
        overflow:'hidden',
    },
    langAccent:  { width:'100%', height:2, marginBottom:16 },
    langLabel:   { fontSize:20, fontWeight:'700', letterSpacing:-0.5 },
    langSub:     { fontSize:10, letterSpacing:1 },
    confirmHint: { fontSize:12, fontWeight:'500', letterSpacing:1 },

    // Tutorial
    tutWrap:      { alignItems:'center', width:'100%', gap:0 },
    progressRow:  { flexDirection:'row', alignItems:'center', gap:14, width:'100%', marginBottom:40 },
    stepCounter:  { fontSize:12, fontWeight:'700', letterSpacing:1, minWidth:28 },
    progressTrack:{ flex:1, height:1, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:1 },
    progressFill: { height:'100%', borderRadius:1 },

    iconWrap:  { width:160, height:160, alignItems:'center', justifyContent:'center', marginBottom:36 },

    textWrap:  { width:'100%', marginBottom:28 },
    stepText:  { color:'rgba(255,255,255,0.85)', fontSize:18, lineHeight:28, textAlign:'center', fontWeight:'400' },
    rtl:       { textAlign:'right' },

    statusRow: { flexDirection:'row', alignItems:'center', gap:8, height:24 },
    statusDot: { width:5, height:5, borderRadius:2.5 },
    statusText:{ fontSize:11, letterSpacing:2, fontWeight:'600' },
    repeatHint:{ color:'rgba(255,255,255,0.14)', fontSize:11, letterSpacing:1 },
});
