/**
 * components/primitives/LiveDot.js
 * Blinking dot used in the WATCH active badge.
 */

import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export function LiveDot({ color }) {
    const op = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(op, { toValue: 0.15, duration: 700, useNativeDriver: true }),
                Animated.timing(op, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []); // eslint-disable-line

    return (
        <Animated.View style={{
            width: 5, height: 5, borderRadius: 2.5,
            backgroundColor: color,
            opacity: op,
        }} />
    );
}
