/**
 * SettingsOverlay.js
 * Spoken settings menu — swipe to navigate, double tap to select, long press to close.
 *
 * Fix: all PanResponder callbacks read from refs only (no stale closures).
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, Animated,
    Dimensions, PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const CYAN  = '#00BFFF';
const AMBER = '#FFB020';
const ITEM_COLORS = [CYAN, AMBER, 'rgba(255,255,255,0.5)'];

export default function SettingsOverlay({ lang, t, speak, onRepeatTour, onChangeLang, onClose }) {

    const [activeIndex, setActiveIndex] = useState(0);

    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const itemAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

    // ── Refs so PanResponder never has stale values ───────────────────────────
    const activeRef      = useRef(0);
    const tRef           = useRef(t);
    const speakRef       = useRef(speak);
    const onCloseRef     = useRef(onClose);
    const onRepeatRef    = useRef(onRepeatTour);
    const onChangeLangRef= useRef(onChangeLang);
    const langRef        = useRef(lang);

    // Keep refs current on every render
    tRef.current            = t;
    speakRef.current        = speak;
    onCloseRef.current      = onClose;
    onRepeatRef.current     = onRepeatTour;
    onChangeLangRef.current = onChangeLang;
    langRef.current         = lang;

    const getItems = () => [
        { label: tRef.current('settings_repeat_tour'), icon: '🎓', action: () => onRepeatRef.current?.() },
        { label: tRef.current('settings_change_lang'), icon: '🌐', action: () => onChangeLangRef.current?.() },
        { label: tRef.current('settings_close'),       icon: '✕',  action: () => onCloseRef.current?.() },
    ];

    // ── Entrance animation ────────────────────────────────────────────────────
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ...itemAnims.map((a, i) =>
                Animated.timing(a, { toValue: 1, duration: 300, delay: i * 80, useNativeDriver: true })
            ),
        ]).start();

        setTimeout(() => speakRef.current(tRef.current('settings_open'), 'high'), 300);
        setTimeout(() => {
            const items = getItems();
            speakRef.current(tRef.current('settings_selected', items[0].label), 'normal');
        }, 1800);
    }, []);

    // ── Gesture timing refs ───────────────────────────────────────────────────
    const tapCount  = useRef(0);
    const tapTimer  = useRef(null);
    const longTimer = useRef(null);
    const longFired = useRef(false);
    const startPos  = useRef({ x: 0, y: 0 });

    // ── PanResponder — reads ONLY refs ────────────────────────────────────────
    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder:        () => true,
        onStartShouldSetPanResponderCapture: () => true,

        onPanResponderGrant: (e) => {
            longFired.current = false;
            startPos.current  = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };

            longTimer.current = setTimeout(() => {
                longFired.current = true;
                tapCount.current  = 0;
                clearTimeout(tapTimer.current);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                onCloseRef.current?.();
            }, 700);
        },

        onPanResponderRelease: (e) => {
            clearTimeout(longTimer.current);
            if (longFired.current) return;

            const dx = e.nativeEvent.pageX - startPos.current.x;
            const dy = e.nativeEvent.pageY - startPos.current.y;

            // Swipe — navigate
            if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                tapCount.current = 0;
                clearTimeout(tapTimer.current);

                const items   = getItems();
                const next    = Math.max(0, Math.min(items.length - 1, activeRef.current + (dx > 0 ? 1 : -1)));
                activeRef.current = next;
                setActiveIndex(next);
                speakRef.current(tRef.current('settings_selected', items[next].label), 'high');
                Haptics.selectionAsync();
                return;
            }

            if (Math.abs(dx) > 20 || Math.abs(dy) > 20) return;

            tapCount.current += 1;
            clearTimeout(tapTimer.current);

            tapTimer.current = setTimeout(() => {
                const count      = tapCount.current;
                tapCount.current = 0;

                const items = getItems();

                if (count >= 2) {
                    // Double tap — select
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    items[activeRef.current]?.action?.();
                } else if (count === 1) {
                    // Single tap — re-announce
                    speakRef.current(tRef.current('settings_selected', items[activeRef.current].label), 'high');
                }
            }, 320);
        },

        onPanResponderTerminate: () => {
            clearTimeout(longTimer.current);
            clearTimeout(tapTimer.current);
        },
    })).current;

    // ── Render ────────────────────────────────────────────────────────────────
    const items = getItems();
    const isRTL = lang === 'ar';

    return (
        <Animated.View style={[styles.root, { opacity: fadeAnim }]} {...panResponder.panHandlers}>
            <View style={styles.backdrop} />
            <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>

                <View style={styles.header}>
                    <View style={styles.headerLine} />
                    <Text style={styles.headerTitle}>{lang === 'ar' ? 'الإعدادات' : 'SETTINGS'}</Text>
                    <View style={styles.headerLine} />
                </View>

                {items.map((item, i) => (
                    <Animated.View key={i} style={[
                        styles.item,
                        i === activeIndex && { backgroundColor: ITEM_COLORS[i] + '18', borderColor: ITEM_COLORS[i] },
                        { opacity: itemAnims[i], transform: [{ translateY: itemAnims[i].interpolate({ inputRange:[0,1], outputRange:[10,0] }) }] },
                    ]}>
                        <Text style={styles.itemIcon}>{item.icon}</Text>
                        <Text style={[styles.itemLabel, isRTL && styles.rtlText, i === activeIndex && { color: ITEM_COLORS[i] }]}>
                            {item.label}
                        </Text>
                        {i === activeIndex && <View style={[styles.activeDot, { backgroundColor: ITEM_COLORS[i] }]} />}
                    </Animated.View>
                ))}

                <View style={[styles.hints, isRTL && styles.rowReverse]}>
                    <Text style={styles.hintText}>{lang === 'ar' ? '← مرر للتنقل →' : '← swipe to navigate →'}</Text>
                    <Text style={styles.hintSep}>·</Text>
                    <Text style={styles.hintText}>{lang === 'ar' ? 'انقر مرتين للاختيار' : 'double tap to select'}</Text>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    root:        { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 100 },
    backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(22,23,23,0.75)' },
    panel:       { backgroundColor: '#0A0A0A', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: 'rgba(0,191,255,0.2)', paddingTop: 20, paddingBottom: 40, paddingHorizontal: 24, gap: 12 },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 },
    headerLine:  { width: 20, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
    headerTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 4 },
    item:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.03)' },
    itemIcon:    { fontSize: 22 },
    itemLabel:   { color: 'rgba(255,255,255,0.65)', fontSize: 16, flex: 1 },
    activeDot:   { width: 6, height: 6, borderRadius: 3 },
    rtlText:     { textAlign: 'right' },
    hints:       { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
    rowReverse:  { flexDirection: 'row-reverse' },
    hintText:    { color: 'rgba(255,255,255,0.18)', fontSize: 10 },
    hintSep:     { color: 'rgba(255,255,255,0.1)', fontSize: 10 },
});
