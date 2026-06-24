/**
 * components/primitives/WaveBar.js  — Flat Minimal
 *
 * Three bars that fade in sequence — no scaleY, no height changes.
 * Clean, fast, unobtrusive.
 */

import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

export function WaveBar({ color, delay = 0 }) {
    const opacity = useRef(new Animated.Value(0.15)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(opacity, {
                    toValue: 0.85,
                    duration: 380,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.15,
                    duration: 380,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []); // eslint-disable-line

    return (
        <Animated.View style={{
            width: 2, height: 18, borderRadius: 1,
            backgroundColor: color,
            opacity,
        }} />
    );
}
