/**
 * components/primitives/ScanRing.js
 * Rotating ring shown during the SCANNING state.
 */

import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export function ScanRing({ color }) {
    const rot = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(rot, { toValue: 1, duration: 1000, useNativeDriver: true }),
        );
        loop.start();
        return () => loop.stop();
    }, []); // eslint-disable-line

    const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <Animated.View style={{
            width: 56, height: 56, borderRadius: 28,
            borderWidth: 2, borderColor: 'transparent',
            borderTopColor: color,
            transform: [{ rotate }],
        }} />
    );
}
