/**
 * components/primitives/ScanRing.js  — Flat Minimal
 *
 * A single thin ring that slowly fades in and out.
 * No rotation, no dual arcs, no center dot pulse.
 * The simplicity communicates "working" without visual noise.
 */

import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

export function ScanRing({ color }) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.9,
                    duration: 700,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.25,
                    duration: 700,
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
            width: 52, height: 52, borderRadius: 26,
            borderWidth: 1,
            borderColor: color,
            opacity,
        }} />
    );
}
