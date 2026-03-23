/**
 * components/overlays/SettingsOverlay.js
 *
 * Gesture model:
 *   swipe left/right  → navigate items (wraps around — no dead ends)
 *   single tap        → re-announce current item
 *   double tap        → execute current item
 *   triple tap        → close
 *   long press        → re-announce current item
 *
 * Structure (flat list with spoken section headers):
 *
 *   ── Tutorial ──────────────────────
 *   [H] Tutorial         ← section header (swipe past, spoken not selectable)
 *   [ ] Repeat tutorial
 *   [ ] Change language
 *
 *   ── Experience ────────────────────
 *   [H] Experience       ← section header
 *   [ ] Priority vibration: on / off
 *
 * Section headers are announced when reached so the user has orientation,
 * but they cannot be double-tapped to execute — swipe moves past them.
 * This gives the "categories" feel without requiring a separate UI model.
 *
 * WRAP: swiping left from item 0 → wraps to last item.
 *       swiping right from last item → wraps to item 0.
 *       Same as mode navigation in the main screen.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
    SURFACE, ON_SURFACE, ON_SURFACE_LOW, ON_SURFACE_MED,
    CYAN, AMBER, GREEN,
} from '../../constants/colors';

const LINE        = 'rgba(255,255,255,0.06)';
const ITEM_COLORS = [CYAN, AMBER, GREEN];

// Item type: 'action' = selectable, 'header' = section label (spoken, not selectable)
const ITEM_TYPE_ACTION = 'action';
const ITEM_TYPE_HEADER = 'header';

export default function SettingsOverlay({
    lang, t, speak,
    onRepeatTour,
    onChangeLang,
    onToggleHaptics,
    priorityHapticsEnabled,
    onClose,
}) {
    const [activeIndex, setActiveIndex] = useState(0);  // index within ACTION items only

    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const panelSlide      = useRef(new Animated.Value(60)).current;
    const panelOpacity    = useRef(new Animated.Value(0)).current;

    const activeRef            = useRef(0);
    const tRef                 = useRef(t);
    const speakRef             = useRef(speak);
    const onCloseRef           = useRef(onClose);
    const onRepeatRef          = useRef(onRepeatTour);
    const onChangeLangRef      = useRef(onChangeLang);
    const onToggleHapticsRef   = useRef(onToggleHaptics);
    const hapticsEnabledRef    = useRef(priorityHapticsEnabled);
    const isRTLRef             = useRef(lang === 'ar');

    tRef.current               = t;
    speakRef.current           = speak;
    onCloseRef.current         = onClose;
    onRepeatRef.current        = onRepeatTour;
    onChangeLangRef.current    = onChangeLang;
    onToggleHapticsRef.current = onToggleHaptics;
    hapticsEnabledRef.current  = priorityHapticsEnabled;
    isRTLRef.current           = lang === 'ar';

    // ── Item list ─────────────────────────────────────────────────────────────
    // Built fresh on every read so toggle label always reflects current state.
    // Headers are spoken when navigated to but cannot be executed.
    const getItems = () => {
        const ar = isRTLRef.current;
        return [
            // ── Tutorial section ──────────────────────────────────────────
            {
                type:  ITEM_TYPE_HEADER,
                label: ar ? 'الشرح' : 'Tutorial',
            },
            {
                type:   ITEM_TYPE_ACTION,
                label:  tRef.current('settings_repeat_tour'),
                action: () => onRepeatRef.current?.(),
                color:  CYAN,
            },
            {
                type:   ITEM_TYPE_ACTION,
                label:  tRef.current('settings_change_lang'),
                action: () => onChangeLangRef.current?.(),
                color:  AMBER,
            },
            // ── Experience section ────────────────────────────────────────
            {
                type:  ITEM_TYPE_HEADER,
                label: ar ? 'التجربة' : 'Experience',
            },
            {
                type:   ITEM_TYPE_ACTION,
                label:  hapticsEnabledRef.current
                    ? tRef.current('settings_haptics_on')
                    : tRef.current('settings_haptics_off'),
                action: async () => {
                    const next = await onToggleHapticsRef.current?.();
                    const msg  = (next === true)
                        ? tRef.current('settings_haptics_on')
                        : tRef.current('settings_haptics_off');
                    speakRef.current(msg, 'high');
                    if (next) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    else      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                },
                color: GREEN,
            },
        ];
    };

    // Action items only — these are what activeIndex points into
    const getActionItems = () => getItems().filter(i => i.type === ITEM_TYPE_ACTION);

    // Animate entrance + announce opening
    const rowAnims = useRef(getItems().map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
            Animated.timing(panelOpacity,    { toValue: 1, duration: 260, useNativeDriver: true }),
            Animated.timing(panelSlide,      { toValue: 0, duration: 300, useNativeDriver: true }),
            ...rowAnims.map((a, i) =>
                Animated.timing(a, { toValue: 1, duration: 220, delay: 60 + i * 50, useNativeDriver: true })
            ),
        ]).start();
        setTimeout(() => speakRef.current(tRef.current('settings_open'), 'high'), 300);
        setTimeout(() => {
            const actions = getActionItems();
            speakRef.current(tRef.current('settings_selected', actions[0].label), 'normal');
        }, 1600);
    }, []); // eslint-disable-line

    // ── Navigate with wrap ────────────────────────────────────────────────────
    // Moves through ACTION items only (skips headers in the count).
    // Wraps: left from 0 → last action, right from last → 0.
    const navigateBy = (delta) => {
        const actions = getActionItems();
        const next    = (activeRef.current + delta + actions.length) % actions.length;
        activeRef.current = next;
        setActiveIndex(next);
        speakRef.current(tRef.current('settings_selected', actions[next].label), 'high');
        Haptics.selectionAsync();
    };

    // ── PanResponder ──────────────────────────────────────────────────────────
    const tapCount  = useRef(0);
    const tapTimer  = useRef(null);
    const longTimer = useRef(null);
    const longFired = useRef(false);
    const startPos  = useRef({ x: 0, y: 0 });

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
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // Long press = re-announce current item
                const actions = getActionItems();
                speakRef.current(
                    tRef.current('settings_selected', actions[activeRef.current].label),
                    'high',
                );
            }, 700);
        },

        onPanResponderRelease: (e) => {
            clearTimeout(longTimer.current);
            if (longFired.current) return;

            const dx  = e.nativeEvent.pageX - startPos.current.x;
            const dy  = e.nativeEvent.pageY - startPos.current.y;

            // Swipe left/right → navigate with wrap
            if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                tapCount.current = 0;
                clearTimeout(tapTimer.current);
                // RTL: swipe right = previous item, swipe left = next item
                // LTR: swipe right = next item, swipe left = previous item
                // But since items are ordered for LTR and we just navigate linearly,
                // keep the same direction for both — user learns it once.
                navigateBy(dx > 0 ? 1 : -1);
                return;
            }

            if (Math.abs(dx) > 20 || Math.abs(dy) > 20) return;

            tapCount.current += 1;

            // Triple tap → close
            if (tapCount.current >= 3) {
                tapCount.current = 0;
                clearTimeout(tapTimer.current);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onCloseRef.current?.();
                return;
            }

            clearTimeout(tapTimer.current);
            tapTimer.current = setTimeout(() => {
                const count = tapCount.current;
                tapCount.current = 0;
                const actions = getActionItems();
                if (count === 2) {
                    // Double tap → execute
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    actions[activeRef.current]?.action?.();
                } else if (count === 1) {
                    // Single tap → re-announce
                    speakRef.current(
                        tRef.current('settings_selected', actions[activeRef.current].label),
                        'high',
                    );
                }
            }, 320);
        },

        onPanResponderTerminate: () => {
            clearTimeout(longTimer.current);
            clearTimeout(tapTimer.current);
        },
    })).current;

    // ── Render ────────────────────────────────────────────────────────────────
    const items   = getItems();
    const actions = getActionItems();
    const isRTL   = lang === 'ar';

    // Map action index back to overall list index for the active marker
    let actionCounter = -1;

    return (
        <Animated.View style={[s.root, { opacity: backdropOpacity }]} {...panResponder.panHandlers}>
            <View style={s.backdrop} />

            <Animated.View style={[
                s.sheet,
                { opacity: panelOpacity, transform: [{ translateY: panelSlide }] },
            ]}>
                <View style={s.handle} />

                <Text style={[s.title, isRTL && s.titleRTL]}>
                    {isRTL ? 'الإعدادات' : 'Settings'}
                </Text>

                <View style={s.divider} />

                {items.map((item, i) => {
                    if (item.type === ITEM_TYPE_HEADER) {
                        // Section header row — visual only, not interactive
                        return (
                            <Animated.View key={`h-${i}`} style={[s.headerRow, { opacity: rowAnims[i] }]}>
                                <Text style={[s.headerText, isRTL && { textAlign: 'right' }]}>
                                    {item.label.toUpperCase()}
                                </Text>
                            </Animated.View>
                        );
                    }

                    // Action item
                    actionCounter += 1;
                    const myActionIdx = actionCounter;
                    const active      = myActionIdx === activeIndex;
                    const color       = item.color ?? CYAN;

                    return (
                        <Animated.View key={`a-${i}`} style={[
                            s.row,
                            i < items.length - 1 && s.rowBorder,
                            { opacity: rowAnims[i], flexDirection: isRTL ? 'row-reverse' : 'row' },
                        ]}>
                            <View style={[
                                s.rowBar,
                                {
                                    backgroundColor: active ? color : 'transparent',
                                    marginRight: isRTL ? 0  : 16,
                                    marginLeft:  isRTL ? 16 : 0,
                                },
                            ]} />
                            <Text style={[
                                s.rowLabel,
                                {
                                    color:            active ? color : ON_SURFACE,
                                    textAlign:        isRTL ? 'right' : 'left',
                                    writingDirection: isRTL ? 'rtl'   : 'ltr',
                                },
                            ]}>
                                {item.label}
                            </Text>
                            {active && <View style={[s.rowDot, { backgroundColor: color }]} />}
                        </Animated.View>
                    );
                })}

                {/* Footer */}
                <View style={[s.footer, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={[s.footerText, isRTL && s.footerTextRTL]}>
                        {isRTL ? 'مرر للتنقل' : 'swipe to navigate'}
                    </Text>
                    <View style={s.footerSep} />
                    <Text style={[s.footerText, isRTL && s.footerTextRTL]}>
                        {isRTL ? 'انقر مرتين للاختيار' : 'double tap to select'}
                    </Text>
                    <View style={s.footerSep} />
                    <Text style={[s.footerText, isRTL && s.footerTextRTL]}>
                        {isRTL ? 'انقر ثلاثاً للإغلاق' : 'triple tap to close'}
                    </Text>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    root:     { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 100 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
    sheet: {
        backgroundColor: SURFACE,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingBottom: 44, overflow: 'hidden',
    },
    handle:   { width: 36, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    title:    { color: ON_SURFACE_LOW, fontSize: 11, letterSpacing: 4, fontWeight: '600', textAlign: 'center', paddingVertical: 16 },
    titleRTL: { letterSpacing: 1, fontSize: 13 },
    divider:  { height: 1, backgroundColor: LINE },

    // Section header row
    headerRow:  { paddingTop: 18, paddingBottom: 6, paddingHorizontal: 24 },
    headerText: { color: ON_SURFACE_MED, fontSize: 9, letterSpacing: 3, fontWeight: '700' },

    // Action row
    row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 24 },
    rowBorder:  { borderBottomWidth: 1, borderBottomColor: LINE },
    rowBar:     { width: 2, height: 18, borderRadius: 1 },
    rowLabel:   { flex: 1, color: ON_SURFACE, fontSize: 16, fontWeight: '500' },
    rowDot:     { width: 5, height: 5, borderRadius: 2.5 },

    footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 16, paddingHorizontal: 24 },
    footerSep:    { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.1)' },
    footerText:   { color: 'rgba(255,255,255,0.15)', fontSize: 10, letterSpacing: 1 },
    footerTextRTL:{ letterSpacing: 0, fontSize: 11 },
});
