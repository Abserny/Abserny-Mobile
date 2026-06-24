/**
 * components/primitives/LiveDot.js  — Flat Minimal
 *
 * A small dot that gently blinks. No ripple, no ring.
 * Presence without noise.
 */

import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

export function LiveDot({ color }) {
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.2,
                    duration: 600,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1.0,
                    duration: 600,
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
            width: 5, height: 5, borderRadius: 2.5,
            backgroundColor: color,
            opacity,
        }} />
    );
}
