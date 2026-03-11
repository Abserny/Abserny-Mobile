/**
 * OnboardingScreen.js — Abserny v3.5 FINAL
 *
 * KEY FIXES:
 * 1. Accepts initialPhase + initialLang props → "change lang" works correctly
 * 2. runStep as ref (not useCallback) → Arabic onDone never calls stale closure
 * 3. finish step requires doubleTap → no auto-complete
 * 4. Lang cards: per-card spring, no shared looping pulseAnim
 * 5. Icons: entrance spring only, no loop, no box bg, no glow
 * 6. Step transition: hide before setState via rAF → zero flash
 * 7. TTS pre-warm on mount → no delay on first speech
 * 8. Background: #161717
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, Animated,
    Dimensions, StatusBar, Image, PanResponder,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { GESTURE_ICONS } from './AbsernyIcons';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const BG     = '#161717';
const CYAN   = '#00BFFF';
const GREEN  = '#00E5A0';
const AMBER  = '#FFB020';
const PURPLE = '#A78BFA';

const STEP_COLORS = {
    intro:       CYAN,
    double_tap:  CYAN,
    double_done: GREEN,
    long_press:  PURPLE,
    long_done:   GREEN,
    swipe:       GREEN,
    swipe_done:  GREEN,
    triple_tap:  AMBER,
    finish:      AMBER,
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
        { id: 'swipe',       text: 'Swipe right or left to change modes. Try swiping now.',      waitFor: 'swipe'      },
        { id: 'swipe_done',  text: 'Good. Four modes: Scene, Object, Read, People.',             waitFor: null         },
        { id: 'triple_tap',  text: 'Triple tap to open settings. Tap three times now.',          waitFor: 'tripleTap'  },
        { id: 'finish',      text: 'You know all the gestures. Double tap now to start Abserny.', waitFor: 'doubleTap' },
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
        { id: 'finish',      text: 'تعلمت كل الإيماءات. انقر مرتين الآن لبدء أبصرني.',            waitFor: 'doubleTap'  },
    ],
};

// Icon: entrance spring only, no loop, no box background, no glow
function GestureIconAnimated({ stepId, color, size = 72 }) {
    const IconComponent = GESTURE_ICONS[stepId];
    const scale   = useRef(new Animated.Value(0.65)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        scale.setValue(0.65);
        opacity.setValue(0);
        Animated.parallel([
            Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 150, friction: 8 }),
            Animated.timing(opacity, { toValue: 1, useNativeDriver: true, duration: 180 }),
        ]).start();
    }, [stepId]);
    if (!IconComponent) return null;
    return (
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
            <IconComponent size={size} color={color} />
        </Animated.View>
    );
}

function WaitingRipple({ color }) {
    const r1 = useRef(new Animated.Value(0)).current;
    const r2 = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = (val, delay) => Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, { toValue: 1, duration: 1400, useNativeDriver: true }),
            Animated.timing(val, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ]));
        const a1 = loop(r1, 0); const a2 = loop(r2, 700);
        a1.start(); a2.start();
        return () => { a1.stop(); a2.stop(); };
    }, []);
    const ring = (val) => ({
        position: 'absolute', width: 150, height: 150, borderRadius: 75,
        borderWidth: 1, borderColor: color,
        opacity:   val.interpolate({ inputRange:[0,0.3,1], outputRange:[0.5,0.2,0] }),
        transform: [{ scale: val.interpolate({ inputRange:[0,1], outputRange:[0.7,1.5] }) }],
    });
    return (
        <View style={{ width:150, height:150, alignItems:'center', justifyContent:'center' }}>
            <Animated.View style={ring(r1)} />
            <Animated.View style={ring(r2)} />
        </View>
    );
}

function ProgressDots({ total, current, color }) {
    return (
        <View style={{ flexDirection:'row', gap:6, alignItems:'center' }}>
            {Array.from({ length: total }).map((_, i) => (
                <View key={i} style={{
                    width: i === current ? 20 : 6, height: 6, borderRadius: 3,
                    backgroundColor: i <= current ? color : 'rgba(255,255,255,0.12)',
                }} />
            ))}
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingScreen({
    onComplete,
    initialPhase = 'language',
    initialLang  = 'en',
}) {
    // ── State — seeded from props so "change language" lands on right phase ──
    const [phase,        setPhase]        = useState(initialPhase);
    const [selectedLang, setSelectedLang] = useState(initialLang);
    const [lang,         setLang]         = useState(initialLang);
    const [tutStep,      setTutStep]      = useState(0);

    // Refs
    const phaseRef        = useRef(initialPhase);
    const langRef         = useRef(initialLang);
    const selectedLangRef = useRef(initialLang);
    const tutStepRef      = useRef(0);
    const waitingFor      = useRef(null);
    const onCompleteRef   = useRef(onComplete);
    onCompleteRef.current = onComplete;

    // Animated
    const fadeAnim     = useRef(new Animated.Value(0)).current;
    const slideAnim    = useRef(new Animated.Value(30)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const stepFade     = useRef(new Animated.Value(1)).current;
    const stepSlide    = useRef(new Animated.Value(0)).current;
    // Per-card scale — spring once on select, never loops
    const enScale = useRef(new Animated.Value(initialLang === 'en' ? 1 : 0.95)).current;
    const arScale = useRef(new Animated.Value(initialLang === 'ar' ? 1 : 0.95)).current;

    // Gesture timing
    const tapCount  = useRef(0);
    const tapTimer  = useRef(null);
    const longTimer = useRef(null);
    const longFired = useRef(false);
    const startPos  = useRef({ x: 0, y: 0 });

    // ── runStep as a ref — NEVER stale inside onDone callbacks ───────────────
    const runStepRef = useRef(null);
    runStepRef.current = (stepIndex, currentLang) => {
        const steps = TUTORIAL_STEPS[currentLang] ?? TUTORIAL_STEPS.en;
        if (stepIndex >= steps.length) return;
        const step  = steps[stepIndex];
        const sLang = currentLang === 'ar' ? 'ar-SA' : 'en-US';
        const sRate = currentLang === 'ar' ? 0.82 : 0.88;

        waitingFor.current = step.waitFor;
        tutStepRef.current = stepIndex;

        // Zero-flash transition: hide first, setState, then rAF reveals
        stepFade.setValue(0);
        stepSlide.setValue(18);
        setTutStep(stepIndex);
        requestAnimationFrame(() => {
            Animated.parallel([
                Animated.timing(stepFade,  { toValue:1, duration:260, useNativeDriver:true }),
                Animated.timing(stepSlide, { toValue:0, duration:260, useNativeDriver:true }),
            ]).start();
        });

        Animated.timing(progressAnim, {
            toValue: steps.length > 1 ? stepIndex / (steps.length - 1) : 1,
            duration: 400, useNativeDriver: false,
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
        }, 120);
    };

    const onGestureDetected = (gestureType) => {
        if (waitingFor.current !== gestureType) return;
        waitingFor.current = null;
        const currentLang = langRef.current;
        const steps       = TUTORIAL_STEPS[currentLang] ?? TUTORIAL_STEPS.en;
        const step        = steps[tutStepRef.current];
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
            Animated.spring(code === 'en' ? enScale : arScale, { toValue:1,    useNativeDriver:true, tension:220, friction:10 }),
            Animated.spring(code === 'en' ? arScale : enScale, { toValue:0.95, useNativeDriver:true, tension:220, friction:10 }),
        ]).start();
    };

    const confirmLang = () => {
        const chosenLang = selectedLangRef.current;
        langRef.current  = chosenLang;
        phaseRef.current = 'tutorial';
        setLang(chosenLang);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        speakNow(chosenLang === 'en' ? 'Got it.' : 'تم.', chosenLang === 'en' ? 'en-US' : 'ar-SA');
        setTimeout(() => {
            Animated.timing(fadeAnim, { toValue:0, duration:260, useNativeDriver:true }).start(() => {
                setPhase('tutorial');
                setTutStep(0);
                tutStepRef.current = 0;
                waitingFor.current = null;
                stepFade.setValue(1);
                stepSlide.setValue(0);
                fadeAnim.setValue(0);
                slideAnim.setValue(20);
                Animated.parallel([
                    Animated.timing(fadeAnim,  { toValue:1, duration:360, useNativeDriver:true }),
                    Animated.timing(slideAnim, { toValue:0, duration:360, useNativeDriver:true }),
                ]).start(() => setTimeout(() => runStepRef.current(0, chosenLang), 150));
            });
        }, 550);
    };

    // Boot
    useEffect(() => {
        // Pre-warm TTS so first speech fires instantly (fixes Android delay)
        Speech.speak(' ', { language: initialLang === 'ar' ? 'ar-SA' : 'en-US', volume: 0 });

        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue:1, duration:600, useNativeDriver:true }),
            Animated.timing(slideAnim, { toValue:0, duration:600, useNativeDriver:true }),
        ]).start();

        if (initialPhase === 'tutorial') {
            setTimeout(() => runStepRef.current(0, initialLang), 700);
        } else {
            setTimeout(() => speakNow(
                'Welcome to Abserny. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',
                'en-US', 0.88
            ), 450);
        }
    }, []); // eslint-disable-line

    // PanResponder
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

            if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                tapCount.current = 0;
                clearTimeout(tapTimer.current);
                if (phaseRef.current === 'language') {
                    const code = dx > 0 ? 'en' : 'ar';
                    selectedLangRef.current = code;
                    setSelectedLang(code);
                    animateLangCard(code);
                    speakNow(
                        code === 'en' ? 'English selected. Double tap to confirm.' : 'تم اختيار العربية. انقر مرتين للتأكيد.',
                        code === 'en' ? 'en-US' : 'ar-SA',
                        code === 'en' ? 0.88 : 0.82
                    );
                    Haptics.selectionAsync();
                } else {
                    onGestureDetected('swipe');
                }
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
                const count      = tapCount.current;
                tapCount.current = 0;
                if (count === 2) {
                    if (phaseRef.current === 'language') confirmLang();
                    else onGestureDetected('doubleTap');
                } else if (count === 1 && phaseRef.current === 'language') {
                    const code = selectedLangRef.current;
                    speakNow(
                        code === 'en' ? 'English selected. Double tap to confirm.' : 'تم اختيار العربية. انقر مرتين للتأكيد.',
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

    // Render
    const steps       = TUTORIAL_STEPS[lang] ?? TUTORIAL_STEPS.en;
    const currentStep = steps[Math.min(tutStep, steps.length - 1)];
    const stepColor   = STEP_COLORS[currentStep?.id] ?? CYAN;
    const isWaiting   = !!currentStep?.waitFor;
    const isRTL       = lang === 'ar';
    const progressW   = progressAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] });

    return (
        <View style={styles.root} {...panResponder.panHandlers}>
            <StatusBar hidden />
            <View style={styles.gridH1} /><View style={styles.gridH2} />
            <View style={styles.gridV1} /><View style={styles.gridV2} />
            {(['TL','TR','BL','BR']).map(p => (
                <View key={p} style={[styles['b'+p], { borderColor: CYAN + '28' }]} />
            ))}

            <Animated.View style={[styles.content, { opacity:fadeAnim, transform:[{ translateY:slideAnim }] }]}>
                <Image source={require('./assets/logorm.png')} style={styles.logo} />

                {phase === 'language' ? (
                    <View style={styles.langPhase}>
                        <Text style={styles.phaseLabel}>SELECT LANGUAGE · اختر اللغة</Text>
                        <View style={styles.langCards}>
                            {[
                                { code:'en', label:'English', sub:'swipe right →', color:CYAN,  anim:enScale },
                                { code:'ar', label:'العربية', sub:'← مرر يساراً',  color:GREEN, anim:arScale },
                            ].map(({ code, label, sub, color, anim }) => (
                                <Animated.View key={code} style={[
                                    styles.langCard,
                                    selectedLang === code && { borderColor:color, backgroundColor:color+'10' },
                                    { transform:[{ scale:anim }] },
                                ]}>
                                    <View style={[styles.langBar, { backgroundColor:color }]} />
                                    <Text style={[styles.langName, { color: selectedLang===code ? color : 'rgba(255,255,255,0.6)' }]}>
                                        {label}
                                    </Text>
                                    <Text style={[styles.langHint, { color: selectedLang===code ? color+'99' : 'rgba(255,255,255,0.2)' }]}>
                                        {sub}
                                    </Text>
                                    {selectedLang === code && <View style={[styles.langDot, { backgroundColor:color }]} />}
                                </Animated.View>
                            ))}
                        </View>
                        <View style={styles.confirmRow}>
                            <View style={[styles.confirmDot, { backgroundColor: selectedLang==='en' ? CYAN : GREEN }]} />
                            <Text style={[styles.confirmText, { color: selectedLang==='en' ? CYAN : GREEN }]}>
                                {selectedLang === 'en' ? 'Double tap to confirm' : 'انقر مرتين للتأكيد'}
                            </Text>
                        </View>
                    </View>

                ) : (
                    <View style={styles.tutPhase}>
                        <View style={styles.progressTrack}>
                            <Animated.View style={[styles.progressFill, { width:progressW, backgroundColor:stepColor }]} />
                        </View>
                        <ProgressDots total={steps.length} current={tutStep} color={stepColor} />
                        <View style={styles.iconArea}>
                            {isWaiting && (
                                <View style={StyleSheet.absoluteFill}>
                                    <WaitingRipple color={stepColor} />
                                </View>
                            )}
                            <Animated.View style={{ opacity:stepFade, transform:[{ translateY:stepSlide }] }}>
                                <GestureIconAnimated stepId={currentStep?.id} color={stepColor} size={72} />
                            </Animated.View>
                        </View>
                        <Animated.View style={[styles.textBox, { opacity:stepFade, transform:[{ translateY:stepSlide }], borderColor:stepColor+'28' }]}>
                            <Text style={[styles.tutText, isRTL && styles.rtlText]}>
                                {currentStep?.text ?? ''}
                            </Text>
                        </Animated.View>
                        {isWaiting ? (
                            <View style={[styles.waitPill, { borderColor:stepColor+'55', backgroundColor:stepColor+'0D' }]}>
                                <View style={[styles.waitDot, { backgroundColor:stepColor }]} />
                                <Text style={[styles.waitText, { color:stepColor }]}>
                                    {isRTL ? 'جارٍ الانتظار...' : 'waiting for gesture...'}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.pillPlaceholder} />
                        )}
                        <Text style={styles.repeatHint}>
                            {isRTL ? 'انقر مرة للإعادة' : 'single tap to repeat'}
                        </Text>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const B = 20, BW = 2;
const styles = StyleSheet.create({
    root:        { flex:1, backgroundColor:BG, alignItems:'center', justifyContent:'center' },
    gridH1:      { position:'absolute', top:SCREEN_H*0.28, left:0, right:0, height:1, backgroundColor:'rgba(0,191,255,0.05)' },
    gridH2:      { position:'absolute', top:SCREEN_H*0.72, left:0, right:0, height:1, backgroundColor:'rgba(0,191,255,0.05)' },
    gridV1:      { position:'absolute', left:SCREEN_W*0.28, top:0, bottom:0, width:1, backgroundColor:'rgba(0,191,255,0.05)' },
    gridV2:      { position:'absolute', left:SCREEN_W*0.72, top:0, bottom:0, width:1, backgroundColor:'rgba(0,191,255,0.05)' },
    bTL: { position:'absolute', top:16, left:16,     width:B, height:B, borderTopWidth:BW,    borderLeftWidth:BW  },
    bTR: { position:'absolute', top:16, right:16,    width:B, height:B, borderTopWidth:BW,    borderRightWidth:BW },
    bBL: { position:'absolute', bottom:16, left:16,  width:B, height:B, borderBottomWidth:BW, borderLeftWidth:BW  },
    bBR: { position:'absolute', bottom:16, right:16, width:B, height:B, borderBottomWidth:BW, borderRightWidth:BW },
    content:        { alignItems:'center', paddingHorizontal:28, width:'100%' },
    logo:           { width:130, height:42, resizeMode:'contain', marginBottom:40 },
    langPhase:      { alignItems:'center', width:'100%', gap:24 },
    phaseLabel:     { color:'rgba(255,255,255,0.22)', fontSize:10, letterSpacing:4 },
    langCards:      { flexDirection:'row', gap:12, width:'100%' },
    langCard:       { flex:1, paddingVertical:28, paddingHorizontal:14, borderRadius:16, alignItems:'center', gap:10, borderWidth:1.5, borderColor:'rgba(255,255,255,0.07)', backgroundColor:'rgba(255,255,255,0.02)' },
    langBar:        { width:32, height:3, borderRadius:1.5, marginBottom:2 },
    langName:       { fontSize:18, fontWeight:'700' },
    langHint:       { fontSize:10, letterSpacing:1 },
    langDot:        { width:5, height:5, borderRadius:2.5, marginTop:2 },
    confirmRow:     { flexDirection:'row', alignItems:'center', gap:8 },
    confirmDot:     { width:5, height:5, borderRadius:2.5 },
    confirmText:    { fontSize:13, fontWeight:'600' },
    tutPhase:       { alignItems:'center', width:'100%', gap:16 },
    progressTrack:  { width:'100%', height:2, backgroundColor:'rgba(255,255,255,0.06)', borderRadius:1 },
    progressFill:   { height:'100%', borderRadius:1 },
    iconArea:       { width:150, height:150, alignItems:'center', justifyContent:'center', marginVertical:6 },
    textBox:        { width:'100%', paddingVertical:18, paddingHorizontal:22, borderRadius:14, borderWidth:1, backgroundColor:'rgba(255,255,255,0.025)' },
    tutText:        { color:'rgba(255,255,255,0.88)', fontSize:16, textAlign:'center', lineHeight:26 },
    rtlText:        { textAlign:'right' },
    waitPill:       { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:16, paddingVertical:8, borderRadius:20, borderWidth:1 },
    waitDot:        { width:5, height:5, borderRadius:2.5 },
    waitText:       { fontSize:11, letterSpacing:2, fontWeight:'600' },
    pillPlaceholder:{ height:34 },
    repeatHint:     { color:'rgba(255,255,255,0.13)', fontSize:10, letterSpacing:2 },
});
