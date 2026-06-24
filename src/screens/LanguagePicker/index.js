/**
 * screens/LanguagePicker/index.js
 *
 * Shown from Settings → Change Language while the main app is running.
 * Design matches the onboarding language phase exactly:
 *   - Two stacked solid cards, left accent bar, active card highlighted
 *   - Dark solid backgrounds, no alpha tricks
 *   - Full-screen overlay with BlurView backdrop
 *   - Uses playVoice (falls back to expo-speech automatically)
 *
 * Gestures: swipe to toggle, double tap to confirm,
 *           single tap / long press to re-announce, triple tap to cancel.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, Image, Animated, StatusBar,
    PanResponder, StyleSheet, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { normalizeArabicForTTS as n } from '../../services/tts/normalize';
import { playVoice, stopVoice } from '../../services/audio/voiceover';

const { width: W } = Dimensions.get('window');

// ── Palette — matches OnboardingScreen exactly ────────────────────────────────
const BG          = '#08090D';
const BG_CARD     = '#0F1118';
const BG_ACTIVE   = '#131720';
const TEXT_HI     = '#F0F0F2';
const TEXT_MID    = '#7A7D8A';
const TEXT_LO     = '#353840';
const BORDER_IDLE = '#1C1E26';
const ACCENT_BLUE = '#5AC8E8';
const ACCENT_TEAL = '#4EDBA0';

function LangCard({ label, sublabel, color, active }) {
    return (
        <View style={[
            s.langCard,
            active
                ? { backgroundColor: BG_ACTIVE, borderColor: color }
                : { backgroundColor: BG_CARD,   borderColor: BORDER_IDLE },
        ]}>
            <View style={[s.langCardBar, { backgroundColor: active ? color : BG_CARD }]} />
            <View style={s.langCardContent}>
                <Text style={[s.langLabel, { color: active ? TEXT_HI : TEXT_MID }]}>{label}</Text>
                {active && <Text style={[s.langSublabel, { color }]}>{sublabel}</Text>}
            </View>
        </View>
    );
}

export default function LanguagePicker({ onComplete }) {
    const [selected, setSelected] = useState('en');

    const selectedRef   = useRef('en');
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    const backdropOp = useRef(new Animated.Value(0)).current;
    const contentOp  = useRef(new Animated.Value(0)).current;
    const contentSc  = useRef(new Animated.Value(0.97)).current;

    const tapCount  = useRef(0);
    const tapTimer  = useRef(null);
    const longTimer = useRef(null);
    const longFired = useRef(false);
    const startPos  = useRef({ x: 0, y: 0 });

    useEffect(() => {
        Animated.parallel([
            Animated.timing(backdropOp, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.timing(contentOp,  { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.timing(contentSc,  { toValue: 1, duration: 300,
                easing: require('react-native').Easing?.out?.(require('react-native').Easing?.cubic),
                useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
            playVoice('lang_reannounce', 'en', null,
                'Change language. Swipe to toggle. Double tap to confirm.');
        }, 150);

        return () => stopVoice();
    }, []); // eslint-disable-line

    const selectLang = (code) => {
        selectedRef.current = code;
        setSelected(code);
        Haptics.selectionAsync();
        if (code === 'en') {
            playVoice('lang_selected_en', 'en', null, 'English selected. Double tap to confirm.');
        } else {
            playVoice('lang_selected_ar', 'ar', null, n('تم اختيار العربية. اِنقُر مرتين للتأكيد.'));
        }
    };

    const announceSelected = () => {
        const code = selectedRef.current;
        if (code === 'en') {
            playVoice('lang_selected_en', 'en', null, 'English selected. Double tap to confirm.');
        } else {
            playVoice('lang_selected_ar', 'ar', null, n('تم اختيار العربية. اِنقُر مرتين للتأكيد.'));
        }
    };

    const confirm = () => {
        const code = selectedRef.current;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        playVoice('lang_confirm', code, null,
            code === 'en' ? 'Got it.' : n('تمَّ الأمر.'));
        Animated.parallel([
            Animated.timing(backdropOp, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(contentOp,  { toValue: 0, duration: 160, useNativeDriver: true }),
        ]).start(() => setTimeout(() => onCompleteRef.current(code), 60));
    };

    const cancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.parallel([
            Animated.timing(backdropOp, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(contentOp,  { toValue: 0, duration: 140, useNativeDriver: true }),
        ]).start(() => onCompleteRef.current(null)); // null = cancelled
    };

    const pan = useRef(PanResponder.create({
        onStartShouldSetPanResponder:        () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder:         () => false,

        onPanResponderGrant: (e) => {
            longFired.current = false;
            startPos.current  = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
            longTimer.current = setTimeout(() => {
                longFired.current = true; tapCount.current = 0;
                clearTimeout(tapTimer.current);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                announceSelected();
            }, 700);
        },

        onPanResponderRelease: (e) => {
            clearTimeout(longTimer.current);
            if (longFired.current) return;
            const dx  = e.nativeEvent.pageX - startPos.current.x;
            const dy  = e.nativeEvent.pageY - startPos.current.y;
            const adx = Math.abs(dx), ady = Math.abs(dy);

            if (adx >= 55 && adx > ady * 1.2) {
                tapCount.current = 0; clearTimeout(tapTimer.current);
                selectLang(selectedRef.current === 'en' ? 'ar' : 'en');
                return;
            }

            if (adx > 20 || ady > 20) return;

            tapCount.current += 1;

            if (tapCount.current === 3) {
                tapCount.current = 0; clearTimeout(tapTimer.current);
                cancel();
                return;
            }

            if (tapCount.current > 3) {
                tapCount.current = 0; clearTimeout(tapTimer.current);
                return;
            }

            clearTimeout(tapTimer.current);
            tapTimer.current = setTimeout(() => {
                const count = tapCount.current; tapCount.current = 0;
                if (count === 2) confirm();
                else if (count === 1) announceSelected();
            }, 380);
        },

        onPanResponderTerminate: () => {
            clearTimeout(longTimer.current);
            clearTimeout(tapTimer.current);
            longFired.current = false;
            tapCount.current  = 0;
        },
    })).current;

    return (
        <View style={s.root} {...pan.panHandlers}>
            <StatusBar hidden />

            {/* Blurred backdrop */}
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOp }]}>
                <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={s.scrim} />
            </Animated.View>

            {/* Centered content */}
            <Animated.View style={[s.content, {
                opacity: contentOp,
                transform: [{ scale: contentSc }],
            }]}>
                <Image
                    source={require('../../../assets/images/logorm.png')}
                    style={s.logo}
                    resizeMode="contain"
                />
                <Text style={s.eyebrow}>SELECT LANGUAGE · اختر اللغة</Text>

                <View style={s.langList}>
                    <LangCard
                        label="English"
                        sublabel="double tap to confirm"
                        color={ACCENT_BLUE}
                        active={selected === 'en'}
                    />
                    <View style={s.langDivider} />
                    <LangCard
                        label="العربية"
                        sublabel="اِنقُر مرتين للتأكيد"
                        color={ACCENT_TEAL}
                        active={selected === 'ar'}
                    />
                </View>

                <Text style={s.hint}>
                    {selected === 'en'
                        ? 'swipe to switch · double tap to confirm'
                        : 'مرّر للتبديل · اِنقُر مرتين للتأكيد'}
                </Text>
            </Animated.View>
        </View>
    );
}

const s = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 90,
    },
    scrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(4,5,8,0.5)',
    },
    content: {
        width: W - 48,
        alignItems: 'center',
        gap: 24,
    },
    logo: { width: 96, height: 30 },
    eyebrow: {
        color: TEXT_MID,
        fontSize: 9,
        letterSpacing: 3,
        fontWeight: '600',
        textAlign: 'center',
    },
    langList: {
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: BORDER_IDLE,
    },
    langCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 28,
    },
    langCardBar: {
        width: 3,
        height: 32,
        marginRight: 22,
    },
    langCardContent: { flex: 1, paddingRight: 20 },
    langLabel:   { fontSize: 28, fontWeight: '500', letterSpacing: -0.4 },
    langSublabel:{ fontSize: 11, letterSpacing: 0.8, marginTop: 5 },
    langDivider: { height: 1, backgroundColor: BORDER_IDLE },
    hint: {
        color: TEXT_LO,
        fontSize: 10,
        letterSpacing: 1.5,
        textAlign: 'center',
        fontWeight: '500',
    },
});
