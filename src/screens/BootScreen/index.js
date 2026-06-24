/**
 * screens/BootScreen/index.js
 *
 * Logo + tagline fade in on a clean dark background.
 * No semicircle, no glow shapes — just the mark and the tagline.
 * Audio drives the exit via playVoice. Hang guard guarantees exit.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
    View, Animated, Easing, Image,
    StyleSheet, StatusBar,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { playVoice, stopVoice } from '../../services/audio/voiceover';

const BG = '#08090D';
const MAX_WAIT_MS  = 7000;
const FALLBACK_TXT = 'Welcome to Abserny, your vision assistant.';

export default function BootScreen({ onDone }) {
    const mounted   = useRef(true);
    const exitFired = useRef(false);

    const logoOp   = useRef(new Animated.Value(0)).current;
    const tagOp    = useRef(new Animated.Value(0)).current;
    const screenOp = useRef(new Animated.Value(1)).current;

    const EASE = Easing.bezier(0.22, 1, 0.36, 1);

    const fadeOutAndDone = useCallback(() => {
        if (!mounted.current || exitFired.current) return;
        exitFired.current = true;
        setTimeout(() => {
            if (!mounted.current) return;
            Animated.timing(screenOp, {
                toValue: 0, duration: 700,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                useNativeDriver: true,
            }).start(() => onDone?.());
        }, 600);
    }, [onDone, screenOp]);

    useEffect(() => {
        mounted.current   = true;
        exitFired.current = false;
        SplashScreen.hideAsync();

        Animated.sequence([
            Animated.delay(300),
            Animated.timing(logoOp, { toValue: 1, duration: 550, easing: EASE, useNativeDriver: true }),
            Animated.delay(180),
            Animated.timing(tagOp,  { toValue: 1, duration: 450, easing: EASE, useNativeDriver: true }),
        ]).start();

        const hangGuard = setTimeout(() => {
            if (!exitFired.current) {
                console.warn('[Abserny] BootScreen hang guard fired.');
                fadeOutAndDone();
            }
        }, MAX_WAIT_MS);

        const tid = setTimeout(() => {
            if (!mounted.current) return;
            playVoice('boot', 'en', fadeOutAndDone, FALLBACK_TXT);
        }, 1400);

        return () => {
            mounted.current = false;
            clearTimeout(tid);
            clearTimeout(hangGuard);
            stopVoice();
        };
    }, []); // eslint-disable-line

    return (
        <Animated.View style={[s.root, { opacity: screenOp }]}>
            <StatusBar hidden />
            <View style={s.center}>
                <Animated.View style={{ opacity: logoOp, marginBottom: 16 }}>
                    <Image
                        source={require('../../../assets/images/logorm.png')}
                        style={s.logo}
                        resizeMode="contain"
                        accessibilityLabel="Abserny"
                    />
                </Animated.View>
                <Animated.Text style={[s.tagline, { opacity: tagOp }]}>
                    see beyond
                </Animated.Text>
            </View>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    root:    { flex: 1, backgroundColor: BG },
    center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
    logo:    { width: 160, height: 50 },
    tagline: {
        fontSize: 10, letterSpacing: 6,
        color: '#353840',
        fontWeight: '300',
    },
});
