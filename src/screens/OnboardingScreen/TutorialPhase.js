/**
 * screens/OnboardingScreen/TutorialPhase.js
 * Enhanced — icon bounces in per step with spring overshoot.
 * Waiting ripple uses 3 staggered rings instead of 2.
 * Progress fill has a spring-driven width.
 * Pure display component — no logic changes.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { GESTURE_ICONS } from '../../components/icons';
import { s } from './styles';

// Entrance-only animated icon — spring bounce per step change
function GestureIconAnimated({ stepId, color, size = 88 }) {
    const IconComponent = GESTURE_ICONS[stepId];
    const scale   = useRef(new Animated.Value(0.5)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const rotate  = useRef(new Animated.Value(-0.04)).current;

    useEffect(() => {
        scale.setValue(0.5); opacity.setValue(0); rotate.setValue(-0.04);
        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1, tension: 200, friction: 9, useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1, duration: 180, useNativeDriver: true,
            }),
            Animated.spring(rotate, {
                toValue: 0, tension: 180, friction: 10, useNativeDriver: true,
            }),
        ]).start();
    }, [stepId]); // eslint-disable-line

    if (!IconComponent) return null;
    return (
        <Animated.View style={{
            opacity,
            transform: [
                { scale },
                { rotate: rotate.interpolate({ inputRange: [-0.1, 0.1], outputRange: ['-6deg', '6deg'] }) },
            ],
        }}>
            <IconComponent size={size} color={color} />
        </Animated.View>
    );
}

// Three staggered expanding rings — richer "waiting" feel
function WaitingRipple({ color }) {
    const rings = [
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
    ];

    useEffect(() => {
        const anims = rings.map((val, i) => {
            const loop = Animated.loop(Animated.sequence([
                Animated.delay(i * 600),
                Animated.timing(val, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]));
            loop.start();
            return loop;
        });
        return () => anims.forEach(a => a.stop());
    }, []); // eslint-disable-line

    return (
        <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
            {rings.map((val, i) => (
                <Animated.View key={i} style={{
                    position: 'absolute',
                    width: 160, height: 160, borderRadius: 80,
                    borderWidth: 1, borderColor: color,
                    opacity: val.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.3, 0] }),
                    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] }) }],
                }} />
            ))}
        </View>
    );
}

// Progress bar — animated width via interpolation
function ProgressBar({ progress, color }) {
    const w = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    return (
        <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: w, backgroundColor: color }]}>
                {/* Shimmer tip */}
                <Animated.View style={{
                    position: 'absolute', right: 0, top: -1,
                    width: 4, height: 3.5, borderRadius: 2,
                    backgroundColor: color,
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1, shadowRadius: 4,
                }} />
            </Animated.View>
        </View>
    );
}

export function TutorialPhase({
    currentStep, tutStep, stepsLength, stepColor,
    stepFade, stepSlide, progressAnim,
    isWaiting, isRTL, isRepeat,
}) {
    const stepNum = tutStep + 1;
    return (
        <View style={s.tutWrap}>
            <View style={s.progressRow}>
                <Text style={[s.stepCounter, { direction: 'ltr' }]}>
                    <Text style={{ color: stepColor }}>{stepNum}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.10)' }}>/{stepsLength}</Text>
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
                    <GestureIconAnimated stepId={currentStep?.id} color={stepColor} size={88} />
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

            {isRepeat && !isWaiting && (
                <Text style={[s.repeatHint, { marginTop: 6, opacity: 0.7 }]}>
                    {isRTL ? 'مرّر للأسفل للتخطّي' : 'swipe down to skip'}
                </Text>
            )}
        </View>
    );
}
