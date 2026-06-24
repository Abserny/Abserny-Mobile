/**
 * components/overlays/SettingsOverlay.js
 *
 * Design: centered frosted-glass card over a dark blurred backdrop.
 * - BlurView backdrop (intensity 28, dark tint)
 * - Bordered card, centered, no bottom-sheet behavior
 * - Items stagger-fade in at 40ms intervals, fast and clean
 * - No translateY on entrance — opacity only
 * - All solid colors, no alpha string hacks
 *
 * Gestures (unchanged):
 *   swipe left/right → navigate items (wraps)
 *   single tap       → re-announce current item
 *   double tap       → execute current item
 *   triple tap       → close
 *   long press       → re-announce current item
 *
 * Tap window: 380ms (matches main app fix)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, Animated, PanResponder, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { CYAN, AMBER, GREEN } from '../../constants/colors';

const { width: W } = Dimensions.get('window');

// ── Palette ───────────────────────────────────────────────────────────────────
const CARD_BG     = '#0D1016';
const CARD_BORDER = '#1E2330';
const TEXT_HI     = '#EEEEF0';
const TEXT_MID    = '#5A5E6E';
const TEXT_LO     = '#2A2D38';
const ROW_LINE    = '#181B24';

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
    const [activeIndex, setActiveIndex] = useState(0);

    const backdropOp  = useRef(new Animated.Value(0)).current;
    const cardOp      = useRef(new Animated.Value(0)).current;
    const cardScale   = useRef(new Animated.Value(0.96)).current;

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

    const getItems = () => {
        const ar = isRTLRef.current;
        return [
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
                    const msg  = next === true
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

    const getActionItems = () => getItems().filter(i => i.type === ITEM_TYPE_ACTION);

    // One anim per item for sequential stagger
    const allItems = getItems();
    const rowAnims = useRef(allItems.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        // Backdrop + card entrance
        Animated.parallel([
            Animated.timing(backdropOp, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.timing(cardOp,     { toValue: 1, duration: 260, useNativeDriver: true }),
            Animated.timing(cardScale,  { toValue: 1, duration: 280,
                easing: require('react-native').Easing?.out?.(require('react-native').Easing?.cubic) ?? undefined,
                useNativeDriver: true }),
        ]).start();

        // Stagger rows: 30ms base + 40ms per item
        rowAnims.forEach((a, i) => {
            Animated.timing(a, {
                toValue: 1, duration: 180,
                delay: 80 + i * 40,
                useNativeDriver: true,
            }).start();
        });

        setTimeout(() => speakRef.current(tRef.current('settings_open'), 'high'), 300);
        setTimeout(() => {
            const actions = getActionItems();
            speakRef.current(tRef.current('settings_selected', actions[0].label), 'normal');
        }, 1500);
    }, []); // eslint-disable-line

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

    const pan = useRef(PanResponder.create({
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
                const actions = getActionItems();
                speakRef.current(
                    tRef.current('settings_selected', actions[activeRef.current].label), 'high');
            }, 700);
        },

        onPanResponderRelease: (e) => {
            clearTimeout(longTimer.current);
            if (longFired.current) return;

            const dx  = e.nativeEvent.pageX - startPos.current.x;
            const dy  = e.nativeEvent.pageY - startPos.current.y;
            const adx = Math.abs(dx), ady = Math.abs(dy);

            if (adx >= 50 && adx > ady * 1.2) {
                tapCount.current = 0; clearTimeout(tapTimer.current);
                navigateBy(dx > 0 ? 1 : -1);
                return;
            }

            if (adx > 20 || ady > 20) return;

            tapCount.current += 1;

            if (tapCount.current === 3) {
                tapCount.current = 0;
                clearTimeout(tapTimer.current);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onCloseRef.current?.();
                return;
            }

            if (tapCount.current > 3) {
                tapCount.current = 0;
                clearTimeout(tapTimer.current);
                return;
            }

            clearTimeout(tapTimer.current);
            tapTimer.current = setTimeout(() => {
                const count = tapCount.current; tapCount.current = 0;
                const actions = getActionItems();
                if (count === 2) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    actions[activeRef.current]?.action?.();
                } else if (count === 1) {
                    speakRef.current(
                        tRef.current('settings_selected', actions[activeRef.current].label), 'high');
                }
            }, 380);
        },

        onPanResponderTerminate: () => {
            clearTimeout(longTimer.current);
            clearTimeout(tapTimer.current);
            longFired.current = false;
            tapCount.current  = 0;
        },
    })).current;

    // ── Render ────────────────────────────────────────────────────────────────
    const items   = getItems();
    const isRTL   = lang === 'ar';
    let actionCounter = -1;

    return (
        <Animated.View style={[s.root, { opacity: backdropOp }]} {...pan.panHandlers}>

            {/* Blurred backdrop */}
            <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={s.scrim} />

            {/* Centered card */}
            <Animated.View style={[
                s.card,
                { opacity: cardOp, transform: [{ scale: cardScale }] },
            ]}>
                {/* Header */}
                <View style={s.cardHeader}>
                    <Text style={[s.cardTitle, isRTL && s.rtl]}>
                        {isRTL ? 'الإعدادات' : 'Settings'}
                    </Text>
                    <View style={s.titleLine} />
                </View>

                {/* Items */}
                {items.map((item, i) => {
                    if (item.type === ITEM_TYPE_HEADER) {
                        return (
                            <Animated.View key={`h-${i}`} style={[s.sectionHeader, { opacity: rowAnims[i] }]}>
                                <Text style={[s.sectionText, isRTL && s.rtl]}>
                                    {item.label.toUpperCase()}
                                </Text>
                            </Animated.View>
                        );
                    }

                    actionCounter += 1;
                    const myIdx  = actionCounter;
                    const active = myIdx === activeIndex;
                    const color  = item.color ?? CYAN;

                    return (
                        <Animated.View key={`a-${i}`} style={[
                            s.row,
                            i < items.length - 1 && s.rowLine,
                            { opacity: rowAnims[i] },
                            isRTL && s.rowRTL,
                        ]}>
                            {/* Active indicator bar */}
                            <View style={[
                                s.rowBar,
                                { backgroundColor: active ? color : 'transparent' },
                                isRTL ? s.rowBarRTL : s.rowBarLTR,
                            ]} />

                            <Text style={[
                                s.rowLabel,
                                { color: active ? color : TEXT_MID },
                                isRTL && s.rtl,
                            ]}>
                                {item.label}
                            </Text>

                            {/* Active dot */}
                            {active && (
                                <View style={[s.activeDot, { backgroundColor: color }]} />
                            )}
                        </Animated.View>
                    );
                })}

                {/* Footer hints */}
                <View style={[s.footer, isRTL && s.rowRTL]}>
                    <Text style={[s.footerText, isRTL && s.rtl]}>
                        {isRTL ? 'مرر · انقر مرتين · ثلاث مرات للإغلاق'
                               : 'swipe · double tap · triple tap to close'}
                    </Text>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    scrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(4,5,8,0.55)',
    },

    // Centered frosted card
    card: {
        width: W - 48,
        backgroundColor: CARD_BG,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        overflow: 'hidden',
    },

    // Card header
    cardHeader: {
        paddingTop: 24,
        paddingHorizontal: 24,
        paddingBottom: 0,
        gap: 12,
    },
    cardTitle: {
        color: TEXT_HI,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 3,
        textAlign: 'center',
    },
    titleLine: {
        height: 1,
        backgroundColor: CARD_BORDER,
        marginTop: 12,
    },

    // Section header
    sectionHeader: {
        paddingTop: 16,
        paddingBottom: 4,
        paddingHorizontal: 24,
    },
    sectionText: {
        color: TEXT_LO,
        fontSize: 8,
        letterSpacing: 3,
        fontWeight: '700',
    },

    // Action row
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 0,
        paddingRight: 20,
    },
    rowRTL:    { flexDirection: 'row-reverse', paddingRight: 0, paddingLeft: 20 },
    rowLine:   { borderBottomWidth: 1, borderBottomColor: ROW_LINE },
    rowBar:    { width: 2, height: 16, borderRadius: 1 },
    rowBarLTR: { marginLeft: 20, marginRight: 14 },
    rowBarRTL: { marginRight: 20, marginLeft: 14 },
    rowLabel:  { flex: 1, fontSize: 15, fontWeight: '500', letterSpacing: 0.1 },
    activeDot: { width: 4, height: 4, borderRadius: 2 },

    // Footer
    footer: {
        paddingHorizontal: 24,
        paddingTop: 14,
        paddingBottom: 20,
        alignItems: 'center',
    },
    footerText: {
        color: TEXT_LO,
        fontSize: 9,
        letterSpacing: 1.5,
        fontWeight: '500',
        textAlign: 'center',
    },

    rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
