/**
 * LanguagePicker.js — Abserny
 * Standalone language selection screen.
 * Completely independent from OnboardingScreen.
 * Called only from Settings → Change Language.
 *
 * Gestures:
 *   swipe right  → select English
 *   swipe left   → select Arabic
 *   single tap   → re-announce current selection
 *   double tap   → confirm and return
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, Animated,
    Dimensions, StatusBar, Image, PanResponder,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const BG    = '#161717';
const CYAN  = '#00BFFF';
const GREEN = '#00E5A0';

function speakNow(text, lang = 'en-US', rate = 0.88) {
    Speech.stop();
    Speech.speak(text, { language: lang, rate });
}

export default function LanguagePicker({ onComplete }) {
    const [selected, setSelected] = useState('en');

    const selectedRef = useRef('en');
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    // Animations
    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;
    const enScale   = useRef(new Animated.Value(1)).current;
    const arScale   = useRef(new Animated.Value(0.95)).current;

    // Gesture timing
    const tapCount  = useRef(0);
    const tapTimer  = useRef(null);
    const longTimer = useRef(null);
    const longFired = useRef(false);
    const startPos  = useRef({ x: 0, y: 0 });

    // Boot
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();

        setTimeout(() => speakNow(
            'Change language. Swipe right for English. Swipe left for Arabic. Double tap to confirm.',
            'en-US', 0.88
        ), 350);
    }, []);

    const selectLang = (code) => {
        selectedRef.current = code;
        setSelected(code);
        Animated.parallel([
            Animated.spring(code === 'en' ? enScale : arScale,
                { toValue: 1,    useNativeDriver: true, tension: 220, friction: 10 }),
            Animated.spring(code === 'en' ? arScale : enScale,
                { toValue: 0.95, useNativeDriver: true, tension: 220, friction: 10 }),
        ]).start();
        speakNow(
            code === 'en'
                ? 'English selected. Double tap to confirm.'
                : 'تم اختيار العربية. انقر مرتين للتأكيد.',
            code === 'en' ? 'en-US' : 'ar-SA',
            code === 'en' ? 0.88 : 0.82
        );
        Haptics.selectionAsync();
    };

    const confirm = () => {
        const code = selectedRef.current;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        speakNow(code === 'en' ? 'Got it.' : 'تم.', code === 'en' ? 'en-US' : 'ar-SA');
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true })
            .start(() => setTimeout(() => onCompleteRef.current(code), 100));
    };

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder:        () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder:         () => false,

        onPanResponderGrant: (e) => {
            longFired.current = false;
            startPos.current  = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
            longTimer.current = setTimeout(() => {
                longFired.current = true;
                tapCount.current  = 0;
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

            // Swipe
            if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                tapCount.current = 0;
                clearTimeout(tapTimer.current);
                selectLang(dx > 0 ? 'en' : 'ar');
                return;
            }

            if (Math.abs(dx) > 20 || Math.abs(dy) > 20) return;

            tapCount.current += 1;
            clearTimeout(tapTimer.current);

            tapTimer.current = setTimeout(() => {
                const count      = tapCount.current;
                tapCount.current = 0;
                if (count >= 2) {
                    confirm();
                } else if (count === 1) {
                    const code = selectedRef.current;
                    speakNow(
                        code === 'en'
                            ? 'English selected. Double tap to confirm.'
                            : 'تم اختيار العربية. انقر مرتين للتأكيد.',
                        code === 'en' ? 'en-US' : 'ar-SA'
                    );
                }
            }, 320);
        },

        onPanResponderTerminate: () => {
            clearTimeout(longTimer.current);
            clearTimeout(tapTimer.current);
        },
    })).current;

    return (
        <View style={styles.root} {...panResponder.panHandlers}>
            <StatusBar hidden />

            {/* Grid */}
            <View style={styles.gridH1} /><View style={styles.gridH2} />
            <View style={styles.gridV1} /><View style={styles.gridV2} />

            {/* Brackets */}
            {(['TL','TR','BL','BR']).map(p => (
                <View key={p} style={[styles['b'+p], { borderColor: CYAN + '28' }]} />
            ))}

            <Animated.View style={[styles.content, {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }]}>
                <Image source={require('./assets/logo.png')} style={styles.logo} />

                <Text style={styles.title}>SELECT LANGUAGE · اختر اللغة</Text>

                <View style={styles.cards}>
                    {[
                        { code: 'en', label: 'English', sub: 'swipe right →', color: CYAN,  anim: enScale },
                        { code: 'ar', label: 'العربية', sub: '← مرر يساراً',  color: GREEN, anim: arScale },
                    ].map(({ code, label, sub, color, anim }) => (
                            <Animated.View key={code} style={[
                                styles.card,
                                selected === code && {
                                    borderColor: color,
                                    backgroundColor: color + '10',
                                },
                                { transform: [{ scale: anim }] },
                            ]}>
                                <View style={[styles.cardBar, { backgroundColor: color }]} />
                                <Text style={[styles.cardName, {
                                    color: selected === code ? color : 'rgba(255,255,255,0.6)',
                                }]}>
                                    {label}
                                </Text>
                                <Text style={[styles.cardHint, {
                                    color: selected === code ? color + '99' : 'rgba(255,255,255,0.2)',
                                }]}>
                                    {sub}
                                </Text>
                                {selected === code && (
                                    <View style={[styles.cardDot, { backgroundColor: color }]} />
                                )}
                            </Animated.View>
                        ))}
                </View>

                <View style={styles.confirmRow}>
                    <View style={[styles.confirmDot, {
                        backgroundColor: selected === 'en' ? CYAN : GREEN,
                    }]} />
                    <Text style={[styles.confirmText, {
                        color: selected === 'en' ? CYAN : GREEN,
                    }]}>
                        {selected === 'en' ? 'Double tap to confirm' : 'انقر مرتين للتأكيد'}
                    </Text>
                </View>
            </Animated.View>
        </View>
    );
}

const B = 20, BW = 2;
const styles = StyleSheet.create({
    root:    { flex:1, backgroundColor:BG, alignItems:'center', justifyContent:'center' },
    gridH1:  { position:'absolute', top:SCREEN_H*0.28, left:0, right:0, height:1, backgroundColor:'rgba(0,191,255,0.05)' },
    gridH2:  { position:'absolute', top:SCREEN_H*0.72, left:0, right:0, height:1, backgroundColor:'rgba(0,191,255,0.05)' },
    gridV1:  { position:'absolute', left:SCREEN_W*0.28, top:0, bottom:0, width:1, backgroundColor:'rgba(0,191,255,0.05)' },
    gridV2:  { position:'absolute', left:SCREEN_W*0.72, top:0, bottom:0, width:1, backgroundColor:'rgba(0,191,255,0.05)' },
    bTL:     { position:'absolute', top:16, left:16,     width:B, height:B, borderTopWidth:BW,    borderLeftWidth:BW  },
    bTR:     { position:'absolute', top:16, right:16,    width:B, height:B, borderTopWidth:BW,    borderRightWidth:BW },
    bBL:     { position:'absolute', bottom:16, left:16,  width:B, height:B, borderBottomWidth:BW, borderLeftWidth:BW  },
    bBR:     { position:'absolute', bottom:16, right:16, width:B, height:B, borderBottomWidth:BW, borderRightWidth:BW },
    content:     { alignItems:'center', paddingHorizontal:28, width:'100%', gap:28 },
    logo:        { width:130, height:42, resizeMode:'contain' },
    title:       { color:'rgba(255,255,255,0.22)', fontSize:10, letterSpacing:4 },
    cards:       { flexDirection:'row', gap:12, width:'100%' },
    card:        { flex:1, paddingVertical:28, paddingHorizontal:14, borderRadius:16, alignItems:'center', gap:10, borderWidth:1.5, borderColor:'rgba(255,255,255,0.07)', backgroundColor:'rgba(255,255,255,0.02)' },
    cardBar:     { width:32, height:3, borderRadius:1.5, marginBottom:2 },
    cardName:    { fontSize:18, fontWeight:'700' },
    cardHint:    { fontSize:10, letterSpacing:1 },
    cardDot:     { width:5, height:5, borderRadius:2.5, marginTop:2 },
    confirmRow:  { flexDirection:'row', alignItems:'center', gap:8 },
    confirmDot:  { width:5, height:5, borderRadius:2.5 },
    confirmText: { fontSize:13, fontWeight:'600' },
});
