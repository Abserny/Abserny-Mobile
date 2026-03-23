/**
 * components/icons/GestureIcons.js
 * Gesture tutorial icons: DoubleTap, LongPress, Swipe, TripleTap, SwipeUp, Wave, Check, Finish.
 * All drawn with View/border primitives.
 */

import React from 'react';
import { View } from 'react-native';

// ── Shared finger shape ───────────────────────────────────────────────────────
function GestureFinger({ s, color, tipX = 0.5, tipY = 0.38, rotate = '-20deg' }) {
    const W    = s * 0.18;
    const H    = s * 0.52;
    const R    = W / 2;
    const left = tipX * s - W / 2;
    const top  = tipY * s;
    return (
        <View style={{
            position: 'absolute', left, top,
            width: W, height: H, borderRadius: R,
            backgroundColor: color,
            transform: [{ rotate }],
            zIndex: 2,
        }} />
    );
}

export function IconDoubleTap({ size = 48, color = '#00BFFF' }) {
    const s = size;
    const ix = 0.5, iy = 0.32;
    return (
        <View style={{ width: s, height: s }}>
            <View style={{ position: 'absolute', left: s*(ix-0.32), top: s*(iy-0.32), width: s*0.64, height: s*0.64, borderRadius: s*0.32, borderWidth: s*0.03, borderColor: color, opacity: 0.2 }} />
            <View style={{ position: 'absolute', left: s*(ix-0.19), top: s*(iy-0.19), width: s*0.38, height: s*0.38, borderRadius: s*0.19, borderWidth: s*0.04, borderColor: color, opacity: 0.5 }} />
            <View style={{ position: 'absolute', left: s*(ix-0.07), top: s*(iy-0.07), width: s*0.14, height: s*0.14, borderRadius: s*0.07, backgroundColor: color }} />
            <View style={{ position: 'absolute', left: s*(ix+0.08), top: s*(iy-0.02), width: s*0.09, height: s*0.09, borderRadius: s*0.045, backgroundColor: color, opacity: 0.55 }} />
            <GestureFinger s={s} color={color} tipX={ix} tipY={iy+0.07} rotate="-15deg" />
        </View>
    );
}

export function IconLongPress({ size = 48, color = '#A78BFA' }) {
    const s = size;
    const ix = 0.5, iy = 0.30;
    return (
        <View style={{ width: s, height: s }}>
            <View style={{ position: 'absolute', left: s*(ix-0.28), top: s*(iy-0.28), width: s*0.56, height: s*0.56, borderRadius: s*0.28, borderWidth: s*0.055, borderColor: color, opacity: 0.25 }} />
            <View style={{ position: 'absolute', left: s*(ix-0.17), top: s*(iy-0.17), width: s*0.34, height: s*0.34, borderRadius: s*0.17, borderWidth: s*0.045, borderColor: color, opacity: 0.55 }} />
            <View style={{ position: 'absolute', left: s*(ix-0.1),  top: s*(iy-0.1),  width: s*0.2,  height: s*0.2,  borderRadius: s*0.1,  backgroundColor: color }} />
            <GestureFinger s={s} color={color} tipX={ix} tipY={iy+0.08} rotate="-15deg" />
        </View>
    );
}

export function IconSwipe({ size = 48, color = '#00E5A0' }) {
    const s = size, ty = 0.32;
    return (
        <View style={{ width: s, height: s }}>
            <View style={{ position: 'absolute', left: s*0.15, top: s*ty-s*0.025, width: s*0.7,  height: s*0.05, backgroundColor: color, opacity: 0.3, borderRadius: s*0.025 }} />
            <View style={{ position: 'absolute', left: s*0.13, top: s*ty-s*0.13,  width: s*0.18, height: s*0.18, borderBottomWidth: s*0.055, borderLeftWidth:  s*0.055, borderColor: color, opacity: 0.85, transform: [{ rotate: '45deg' }] }} />
            <View style={{ position: 'absolute', right:s*0.13, top: s*ty-s*0.13,  width: s*0.18, height: s*0.18, borderTopWidth:    s*0.055, borderRightWidth: s*0.055, borderColor: color, opacity: 0.85, transform: [{ rotate: '45deg' }] }} />
            <GestureFinger s={s} color={color} tipX={0.5} tipY={ty} rotate="-10deg" />
        </View>
    );
}

export function IconTripleTap({ size = 48, color = '#FFB020' }) {
    const s = size, ix = 0.5, iy = 0.30;
    return (
        <View style={{ width: s, height: s }}>
            {[{ r:0.34, bw:0.025, op:0.18 }, { r:0.23, bw:0.032, op:0.40 }, { r:0.13, bw:0.04, op:0.70 }].map(({ r, bw, op }, i) => (
                <View key={i} style={{ position: 'absolute', left: s*(ix-r), top: s*(iy-r), width: s*r*2, height: s*r*2, borderRadius: s*r, borderWidth: s*bw, borderColor: color, opacity: op }} />
            ))}
            <View style={{ position: 'absolute', left: s*(ix-0.065), top: s*(iy-0.065), width: s*0.13, height: s*0.13, borderRadius: s*0.065, backgroundColor: color }} />
            <GestureFinger s={s} color={color} tipX={ix} tipY={iy+0.07} rotate="-15deg" />
        </View>
    );
}

export function IconSwipeUp({ size = 48, color = '#00BFFF' }) {
    const s = size, ax = 0.5, ay = 0.2;
    return (
        <View style={{ width: s, height: s }}>
            <View style={{ position: 'absolute', left: s*ax-s*0.03, top: s*ay, width: s*0.06, height: s*0.36, backgroundColor: color, borderRadius: s*0.03, opacity: 0.9 }} />
            <View style={{ position: 'absolute', left: s*(ax-0.165), top: s*(ay-0.01), width: s*0.23, height: s*0.06, backgroundColor: color, borderRadius: s*0.03, opacity: 0.9, transform: [{ rotate: '-45deg' }] }} />
            <View style={{ position: 'absolute', left: s*(ax-0.065), top: s*(ay-0.01), width: s*0.23, height: s*0.06, backgroundColor: color, borderRadius: s*0.03, opacity: 0.9, transform: [{ rotate: '45deg' }] }} />
            <GestureFinger s={s} color={color} tipX={ax} tipY={0.56} rotate="-15deg" />
        </View>
    );
}

export function IconWave({ size = 48, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s*0.7, height: s*0.8, transform: [{ rotate: '15deg' }], position: 'absolute', left: s*0.1, top: s*0.1 }}>
                <View style={{ width: s*0.45, height: s*0.35, borderRadius: s*0.1, backgroundColor: color, position: 'absolute', bottom: s*0.05, left: s*0.1 }} />
                <View style={{ position: 'absolute', bottom: s*0.35, left: s*0.1,  width: s*0.1, height: s*0.25, borderRadius: s*0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s*0.35, left: s*0.22, width: s*0.1, height: s*0.35, borderRadius: s*0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s*0.35, left: s*0.34, width: s*0.1, height: s*0.30, borderRadius: s*0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s*0.35, left: s*0.46, width: s*0.1, height: s*0.20, borderRadius: s*0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s*0.15, left: 0, width: s*0.1, height: s*0.25, borderRadius: s*0.05, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
            </View>
            <View style={{ position: 'absolute', right: s*0.05, top: s*0.2,  width: s*0.2,  height: s*0.3,  borderRightWidth: s*0.06, borderColor: color, borderRadius: s*0.15, opacity: 0.5 }} />
            <View style={{ position: 'absolute', right: 0,       top: s*0.1,  width: s*0.35, height: s*0.5,  borderRightWidth: s*0.06, borderColor: color, borderRadius: s*0.25, opacity: 0.3 }} />
        </View>
    );
}

export function IconCheck({ size = 48, color = '#00E5A0' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s*0.85, height: s*0.85, borderRadius: s*0.425, borderWidth: s*0.07, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: s*0.25, height: s*0.45, borderBottomWidth: s*0.08, borderRightWidth: s*0.08, borderColor: color, transform: [{ rotate: '45deg' }, { translateY: s*-0.05 }, { translateX: s*-0.05 }] }} />
            </View>
        </View>
    );
}

export function IconFinish({ size = 48, color = '#FFB020' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s*0.3, height: s*0.3, borderRadius: s*0.15, backgroundColor: color }} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
                <View key={deg} style={{
                    position: 'absolute',
                    width: s * (i % 2 === 0 ? 0.2 : 0.12), height: s*0.06,
                    borderRadius: s*0.03,
                    backgroundColor: i % 2 === 0 ? color : '#00BFFF',
                    transform: [{ rotate: `${deg}deg` }, { translateX: s*0.35 }],
                }} />
            ))}
        </View>
    );
}
