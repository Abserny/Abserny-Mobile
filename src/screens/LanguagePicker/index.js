/**
 * screens/LanguagePicker/index.js
 * Standalone language picker — shown from Settings → Change Language.
 * Identical gesture behaviour to the onboarding language phase,
 * but self-contained so it can be overlaid on the running app.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, Image, Animated, StatusBar, PanResponder,
} from 'react-native';
import * as Speech  from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { CYAN, GREEN } from '../../constants/colors';
import { s } from './styles';

const DIM    = 'rgba(255,255,255,0.28)';
const DIMMER = 'rgba(255,255,255,0.12)';

function speakNow(text, lang = 'en-US', rate = 0.88) {
    Speech.stop();
    Speech.speak(text, { language: lang, rate });
}

export default function LanguagePicker({ onComplete }) {
    const [selected, setSelected] = useState('en');

    const selectedRef   = useRef('en');
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const enScale  = useRef(new Animated.Value(1)).current;
    const arScale  = useRef(new Animated.Value(0.96)).current;

    const tapCount  = useRef(0);
    const tapTimer  = useRef(null);
    const longTimer = useRef(null);
    const longFired = useRef(false);
    const startPos  = useRef({ x: 0, y: 0 });

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
        setTimeout(() => speakNow(
            'Change language. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',
            'en-US', 0.88,
        ), 350);
    }, []); // eslint-disable-line

    const selectLang = (code) => {
        selectedRef.current = code;
        setSelected(code);
        Animated.parallel([
            Animated.spring(code === 'en' ? enScale : arScale, { toValue: 1,    useNativeDriver: true, tension: 260, friction: 12 }),
            Animated.spring(code === 'en' ? arScale : enScale, { toValue: 0.96, useNativeDriver: true, tension: 260, friction: 12 }),
        ]).start();
        speakNow(
            code === 'en' ? 'English selected. Double tap to confirm.' : 'تم اختيار العربية. انقر مرتين للتأكيد.',
            code === 'en' ? 'en-US' : 'ar-SA',
            code === 'en' ? 0.88 : 0.82,
        );
        Haptics.selectionAsync();
    };

    const confirm = () => {
        const code = selectedRef.current;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        speakNow(code === 'en' ? 'Got it.' : 'تم.', code === 'en' ? 'en-US' : 'ar-SA');
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
            .start(() => setTimeout(() => onCompleteRef.current(code), 80));
    };

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder:        () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder:         () => false,
        onPanResponderGrant: (e) => {
            longFired.current = false;
            startPos.current  = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
            longTimer.current = setTimeout(() => {
                longFired.current = true; tapCount.current = 0;
                clearTimeout(tapTimer.current);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                speakNow('Swipe right for English. Swipe left for Arabic. Double tap to confirm.', 'en-US');
            }, 700);
        },
        onPanResponderRelease: (e) => {
            clearTimeout(longTimer.current);
            if (longFired.current) return;
            const dx = e.nativeEvent.pageX - startPos.current.x;
            const dy = e.nativeEvent.pageY - startPos.current.y;
            if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                tapCount.current = 0; clearTimeout(tapTimer.current);
                selectLang(dx > 0 ? 'en' : 'ar');
                return;
            }
            if (Math.abs(dx) > 20 || Math.abs(dy) > 20) return;
            tapCount.current += 1;
            clearTimeout(tapTimer.current);
            tapTimer.current = setTimeout(() => {
                const count = tapCount.current; tapCount.current = 0;
                if (count >= 2) {
                    confirm();
                } else if (count === 1) {
                    const code = selectedRef.current;
                    speakNow(
                        code === 'en' ? 'English selected. Double tap to confirm.' : 'تم اختيار العربية. انقر مرتين للتأكيد.',
                        code === 'en' ? 'en-US' : 'ar-SA',
                    );
                }
            }, 320);
        },
        onPanResponderTerminate: () => { clearTimeout(longTimer.current); clearTimeout(tapTimer.current); },
    })).current;

    return (
        <View style={s.root} {...panResponder.panHandlers}>
            <StatusBar hidden />
            <Animated.View style={[s.content, { opacity: fadeAnim }]}>
                <Image source={require('../../../assets/images/logorm.png')} style={s.logo} />
                <Text style={s.eyebrow}>SELECT LANGUAGE · اختر اللغة</Text>

                <View style={s.langRow}>
                    {[
                        { code: 'en', label: 'English', sub: 'swipe right', color: CYAN,  anim: enScale },
                        { code: 'ar', label: 'العربية', sub: 'مرر يساراً', color: GREEN, anim: arScale },
                    ].map(({ code, label, sub, color, anim }) => {
                        const active = selected === code;
                        return (
                            <Animated.View key={code} style={[
                                s.langCard,
                                { transform: [{ scale: anim }] },
                                active && { borderColor: color },
                            ]}>
                                <View style={[s.langAccent, { backgroundColor: active ? color : 'transparent' }]} />
                                <Text style={[s.langLabel, { color: active ? color : DIM }]}>{label}</Text>
                                <Text style={[s.langSub,   { color: active ? color + '66' : DIMMER }]}>{sub}</Text>
                            </Animated.View>
                        );
                    })}
                </View>

                <Text style={[s.confirmHint, { color: selected === 'en' ? CYAN : GREEN }]}>
                    {selected === 'en' ? 'double tap to confirm' : 'انقر مرتين للتأكيد'}
                </Text>
            </Animated.View>
        </View>
    );
}
