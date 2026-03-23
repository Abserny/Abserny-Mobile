/**
 * screens/OnboardingScreen/TutorialPhase.js
 * Step-by-step gesture tutorial UI — pure display.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { GESTURE_ICONS } from '../../components/icons';
import { s } from './styles';

// Entrance-only animated icon
function GestureIconAnimated({ stepId, color, size = 80 }) {
    const IconComponent = GESTURE_ICONS[stepId];
    const scale   = useRef(new Animated.Value(0.7)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        scale.setValue(0.7); opacity.setValue(0);
        Animated.parallel([
            Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 160, friction: 9 }),
            Animated.timing(opacity, { toValue: 1, useNativeDriver: true, duration: 200 }),
        ]).start();
    }, [stepId]); // eslint-disable-line

    if (!IconComponent) return null;
    return (
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
            <IconComponent size={size} color={color} />
        </Animated.View>
    );
}

// Two clean expanding rings — waiting indicator
function WaitingRipple({ color }) {
    const r1 = useRef(new Animated.Value(0)).current;
    const r2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = (val, delay) => Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, { toValue: 1, duration: 1600, useNativeDriver: true }),
            Animated.timing(val, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ]));
        const a1 = loop(r1, 0); const a2 = loop(r2, 800);
        a1.start(); a2.start();
        return () => { a1.stop(); a2.stop(); };
    }, []); // eslint-disable-line

    const ring = (val) => ({
        position: 'absolute', width: 160, height: 160, borderRadius: 80,
        borderWidth: 1, borderColor: color,
        opacity:   val.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.35, 0] }),
        transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.4] }) }],
    });

    return (
        <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={ring(r1)} />
            <Animated.View style={ring(r2)} />
        </View>
    );
}

// Thin progress bar
function ProgressBar({ progress, color }) {
    const w = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    return (
        <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: w, backgroundColor: color }]} />
        </View>
    );
}

export function TutorialPhase({ currentStep, tutStep, stepsLength, stepColor, stepFade, stepSlide, progressAnim, isWaiting, isRTL, isRepeat }) {
    const stepNum = tutStep + 1;
    return (
        <View style={s.tutWrap}>
            <View style={s.progressRow}>
                <Text style={[s.stepCounter, { direction: 'ltr' }]}>
                    <Text style={{ color: stepColor }}>{stepNum}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.12)' }}>/{stepsLength}</Text>
                </Text>
                <ProgressBar progress={progressAnim} color={stepColor} />
            </View>

            <View style={s.iconWrap}>
                {isWaiting && (
                    <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
                        <WaitingRipple color={stepColor} />
                    </View>
                )}
                <Animated.View style={{ opacity: stepFade, transform: [{ translateY: stepSlide }] }}>
                    <GestureIconAnimated stepId={currentStep?.id} color={stepColor} size={80} />
                </Animated.View>
            </View>

            <Animated.View style={[s.textWrap, { opacity: stepFade, transform: [{ translateY: stepSlide }] }]}>
                <Text style={[s.stepText, isRTL && s.rtl]}>{currentStep?.text ?? ''}</Text>
            </Animated.View>

            <View style={s.statusRow}>
                {isWaiting ? (
                    <>
                        <View style={[s.statusDot, { backgroundColor: stepColor }]} />
                        <Text style={[s.statusText, { color: stepColor }]}>
                            {isRTL ? 'يجري الانتظار...' : 'waiting...'}
                        </Text>
                    </>
                ) : (
                    <Text style={s.repeatHint}>
                        {isRTL ? 'انقر مرة للإعادة' : 'tap once to repeat'}
                    </Text>
                )}
            </View>

            {/* Skip hint — only shown when repeating the tutorial, not first time */}
            {isRepeat && !isWaiting && (
                <Text style={[s.repeatHint, { marginTop: 6, opacity: 0.7 }]}>
                    {isRTL ? 'مرّر للأسفل للتخطّي' : 'swipe down to skip'}
                </Text>
            )}
        </View>
    );
}
