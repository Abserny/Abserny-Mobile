/**
 * components/primitives/WaveBar.js
 * Single animated bar in the speaking wave indicator.
 * Uses scaleY (useNativeDriver: true) — stays smooth during API calls.
 */

import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export function WaveBar({ color, delay = 0 }) {
    const scaleY = useRef(new Animated.Value(0.15)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(scaleY, { toValue: 1,    duration: 260, useNativeDriver: true }),
                Animated.timing(scaleY, { toValue: 0.15, duration: 260, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []); // eslint-disable-line

    return (
        <Animated.View style={{
            width: 3.5, height: 28, borderRadius: 2,
            backgroundColor: color,
            transform: [{ scaleY }],
        }} />
    );
}
