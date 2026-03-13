/**
 * Full-screen sheet. Clean rows. No emoji. No transparent boxes.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';

const BG    = '#161717';
const CYAN  = '#00BFFF';
const AMBER = '#FFB020';
const WHITE = 'rgba(255,255,255,0.82)';
const DIM   = 'rgba(255,255,255,0.22)';
const LINE  = 'rgba(255,255,255,0.06)';

const ITEM_COLORS = [CYAN, AMBER, DIM];

export default function SettingsOverlay({ lang, t, speak, onRepeatTour, onChangeLang, onClose }) {
    const [activeIndex, setActiveIndex] = useState(0);

    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const panelSlide      = useRef(new Animated.Value(60)).current;
    const panelOpacity    = useRef(new Animated.Value(0)).current;
    const rowAnims        = useRef([0,1,2].map(() => new Animated.Value(0))).current;

    const activeRef       = useRef(0);
    const tRef            = useRef(t);
    const speakRef        = useRef(speak);
    const onCloseRef      = useRef(onClose);
    const onRepeatRef     = useRef(onRepeatTour);
    const onChangeLangRef = useRef(onChangeLang);

    tRef.current            = t;
    speakRef.current        = speak;
    onCloseRef.current      = onClose;
    onRepeatRef.current     = onRepeatTour;
    onChangeLangRef.current = onChangeLang;

    const getItems = () => [
        { label: tRef.current('settings_repeat_tour'), action: () => onRepeatRef.current?.() },
        { label: tRef.current('settings_change_lang'), action: () => onChangeLangRef.current?.() },
        { label: tRef.current('settings_close'),       action: () => onCloseRef.current?.() },
    ];

    useEffect(() => {
        Animated.parallel([
            Animated.timing(backdropOpacity, { toValue:1, duration:260, useNativeDriver:true }),
            Animated.timing(panelOpacity,    { toValue:1, duration:260, useNativeDriver:true }),
            Animated.timing(panelSlide,      { toValue:0, duration:300, useNativeDriver:true }),
            ...rowAnims.map((a, i) =>
                Animated.timing(a, { toValue:1, duration:220, delay:60+i*60, useNativeDriver:true })
            ),
        ]).start();
        setTimeout(() => speakRef.current(tRef.current('settings_open'), 'high'), 300);
        setTimeout(() => {
            const items = getItems();
            speakRef.current(tRef.current('settings_selected', items[0].label), 'normal');
        }, 1600);
    }, []);

    const tapCount  = useRef(0);
    const tapTimer  = useRef(null);
    const longTimer = useRef(null);
    const longFired = useRef(false);
    const startPos  = useRef({ x:0, y:0 });

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder:        () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (e) => {
            longFired.current = false;
            startPos.current  = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
            longTimer.current = setTimeout(() => {
                longFired.current = true; tapCount.current = 0;
                clearTimeout(tapTimer.current);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // Re-announce the currently selected item instead of closing —
                // accidental long-press was silently dismissing the overlay.
                const items = getItems();
                speakRef.current(
                    tRef.current('settings_selected', items[activeRef.current].label),
                    'high',
                );
            }, 700);
        },
        onPanResponderRelease: (e) => {
            clearTimeout(longTimer.current);
            if (longFired.current) return;
            const dx = e.nativeEvent.pageX - startPos.current.x;
            const dy = e.nativeEvent.pageY - startPos.current.y;
            if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                tapCount.current = 0; clearTimeout(tapTimer.current);
                const items = getItems();
                const next  = Math.max(0, Math.min(items.length-1, activeRef.current + (dx > 0 ? 1 : -1)));
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
                const count = tapCount.current; tapCount.current = 0;
                const items = getItems();
                if (count >= 2) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    items[activeRef.current]?.action?.();
                } else if (count === 1) {
                    speakRef.current(tRef.current('settings_selected', items[activeRef.current].label), 'high');
                }
            }, 320);
        },
        onPanResponderTerminate: () => { clearTimeout(longTimer.current); clearTimeout(tapTimer.current); },
    })).current;

    const items = getItems();
    const isRTL = lang === 'ar';

    return (
        <Animated.View style={[s.root, { opacity: backdropOpacity }]} {...panResponder.panHandlers}>
            {/* Backdrop */}
            <View style={s.backdrop} />

            {/* Sheet */}
            <Animated.View style={[s.sheet, { opacity: panelOpacity, transform:[{ translateY: panelSlide }] }]}>
                {/* Handle */}
                <View style={s.handle} />

                {/* Title */}
                <Text style={s.title}>{lang === 'ar' ? 'الإعدادات' : 'Settings'}</Text>

                {/* Divider */}
                <View style={s.divider} />

                {/* Rows */}
                {items.map((item, i) => {
                    const active = i === activeIndex;
                    const color  = ITEM_COLORS[i];
                    return (
                        <Animated.View key={i} style={[
                            s.row,
                            i < items.length - 1 && s.rowBorder,
                            { opacity: rowAnims[i] },
                        ]}>
                            {/* Active indicator — left bar */}
                            <View style={[s.rowBar, { backgroundColor: active ? color : 'transparent' }]} />
                            <Text style={[
                                s.rowLabel,
                                isRTL && s.rtl,
                                { color: active ? color : WHITE },
                            ]}>
                                {item.label}
                            </Text>
                            {active && <View style={[s.rowDot, { backgroundColor: color }]} />}
                        </Animated.View>
                    );
                })}

                {/* Footer hint */}
                <View style={[s.footer, isRTL && s.rowReverse]}>
                    <Text style={s.footerText}>
                        {lang === 'ar' ? 'مرر للتنقل' : 'swipe to navigate'}
                    </Text>
                    <View style={s.footerSep} />
                    <Text style={s.footerText}>
                        {lang === 'ar' ? 'انقر مرتين للاختيار' : 'double tap to select'}
                    </Text>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    root:       { ...StyleSheet.absoluteFillObject, justifyContent:'flex-end', zIndex:100 },
    backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.72)' },
    sheet:      {
        backgroundColor: '#1C1D1D',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingBottom: 44, overflow: 'hidden',
    },
    handle:     { width:36, height:3, borderRadius:1.5, backgroundColor:'rgba(255,255,255,0.12)', alignSelf:'center', marginTop:12, marginBottom:4 },
    title:      { color:DIM, fontSize:11, letterSpacing:4, fontWeight:'600', textAlign:'center', paddingVertical:16 },
    divider:    { height:1, backgroundColor:LINE, marginHorizontal:0 },
    row:        { flexDirection:'row', alignItems:'center', paddingVertical:20, paddingHorizontal:24 },
    rowBorder:  { borderBottomWidth:1, borderBottomColor:LINE },
    rowBar:     { width:2, height:18, borderRadius:1, marginRight:16 },
    rowLabel:   { flex:1, color:WHITE, fontSize:16, fontWeight:'500' },
    rowDot:     { width:5, height:5, borderRadius:2.5 },
    rtl:        { textAlign:'right' },
    rowReverse: { flexDirection:'row-reverse' },
    footer:     { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, paddingTop:16, paddingHorizontal:24 },
    footerSep:  { width:3, height:3, borderRadius:1.5, backgroundColor:'rgba(255,255,255,0.1)' },
    footerText: { color:'rgba(255,255,255,0.15)', fontSize:10, letterSpacing:1 },
});
