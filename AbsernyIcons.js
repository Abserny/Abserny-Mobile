/**
 * AbsernyIcons.js
 * All custom vector-style icons for Abserny.
 * Drawn with React Native View/border primitives — no SVG dependency needed.
 * Final Perfection Pass: Pinpoint alignments, symmetrical bi-directional arrows, and true geometric shapes.
 */

import React from 'react';
import { View } from 'react-native';

// ── Scene (Eye) ───────────────────────────────────────────────────────────────
export function IconScene({ size = 24, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Elegant Almond Eye Shape */}
            <View style={{
                width: s * 0.65, height: s * 0.65,
                borderTopLeftRadius: s * 0.5, borderBottomRightRadius: s * 0.5,
                borderTopRightRadius: s * 0.1, borderBottomLeftRadius: s * 0.1,
                borderWidth: s * 0.07, borderColor: color,
                transform: [{ rotate: '45deg' }],
                alignItems: 'center', justifyContent: 'center',
            }}>
                <View style={{ width: s * 0.24, height: s * 0.24, borderRadius: s * 0.12, backgroundColor: color }} />
            </View>
            {/* Scan line */}
            <View style={{
                position: 'absolute', width: s * 0.85, height: s * 0.05,
                backgroundColor: color, opacity: 0.4, borderRadius: s * 0.025,
                top: s * 0.47, shadowColor: color, shadowOpacity: 0.5, shadowRadius: 3,
            }} />
        </View>
    );
}

// ── Object (Hand) ─────────────────────────────────────────────────────────────
export function IconObject({ size = 24, color = '#A78BFA' }) {
    const s = size;
    const finger = (left, w, h, bottom) => (
        <View key={left} style={{
            position: 'absolute', left, bottom, width: w, height: h,
            borderRadius: w / 2, backgroundColor: color,
        }} />
    );
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                width: s * 0.54, height: s * 0.4,
                borderBottomLeftRadius: s * 0.2, borderBottomRightRadius: s * 0.2,
                borderTopLeftRadius: s * 0.08, borderTopRightRadius: s * 0.08,
                backgroundColor: color, position: 'absolute', bottom: s * 0.1,
            }} />
            {finger(s * 0.25, s * 0.12, s * 0.28, s * 0.35)}
            {finger(s * 0.38, s * 0.12, s * 0.38, s * 0.35)}
            {finger(s * 0.51, s * 0.12, s * 0.42, s * 0.35)}
            {finger(s * 0.64, s * 0.12, s * 0.35, s * 0.35)}
            <View style={{
                position: 'absolute', left: s * 0.14, bottom: s * 0.18,
                width: s * 0.14, height: s * 0.3, borderRadius: s * 0.07,
                backgroundColor: color, transform: [{ rotate: '-35deg' }],
            }} />
        </View>
    );
}

// ── Read (Document) ───────────────────────────────────────────────────────────
export function IconRead({ size = 24, color = '#00E5A0' }) {
    const s = size;
    const line = (y, w, op = 1) => (
        <View key={y} style={{
            position: 'absolute', top: y, left: s * 0.25,
            width: w, height: s * 0.06, borderRadius: s * 0.03,
            backgroundColor: color, opacity: op,
        }} />
    );
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s * 0.65, height: s * 0.8, borderRadius: s * 0.08, borderWidth: s * 0.06, borderColor: color }}>
                {line(s * 0.15, s * 0.4)}
                {line(s * 0.3, s * 0.3)}
                {line(s * 0.45, s * 0.4)}
                {line(s * 0.6, s * 0.2, 0.6)}
            </View>
        </View>
    );
}

// ── People (Bust Silhouette) ──────────────────────────────────────────────────
export function IconPeople({ size = 24, color = '#FFB020' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s * 0.32, height: s * 0.32, borderRadius: s * 0.16, backgroundColor: color, position: 'absolute', top: s * 0.1 }} />
            <View style={{ width: s * 0.7, height: s * 0.4, borderTopLeftRadius: s * 0.35, borderTopRightRadius: s * 0.35, backgroundColor: color, position: 'absolute', bottom: s * 0.08 }} />
        </View>
    );
}

// ── Settings (True 6-Tooth Gear) ──────────────────────────────────────────────
export function IconSettings({ size = 24, color = 'rgba(255,255,255,0.5)' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Gear Teeth via 3 crossing rectangles */}
            {[0, 60, 120].map(deg => (
                <View key={deg} style={{
                    position: 'absolute', width: s * 0.85, height: s * 0.24,
                    backgroundColor: color, borderRadius: s * 0.06,
                    transform: [{ rotate: `${deg}deg` }],
                }} />
            ))}
            {/* Gear Body */}
            <View style={{ position: 'absolute', width: s * 0.6, height: s * 0.6, borderRadius: s * 0.3, backgroundColor: color }} />
            {/* Center Cutout */}
            <View style={{ position: 'absolute', width: s * 0.26, height: s * 0.26, borderRadius: s * 0.13, backgroundColor: '#1E1E1E' }} />
        </View>
    );
}

// ── Camera (Scan trigger) ─────────────────────────────────────────────────────
export function IconCamera({ size = 24, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                width: s * 0.85, height: s * 0.6, borderRadius: s * 0.12,
                borderWidth: s * 0.07, borderColor: color,
                alignItems: 'center', justifyContent: 'center', marginTop: s * 0.1,
            }}>
                <View style={{ width: s * 0.3, height: s * 0.3, borderRadius: s * 0.15, borderWidth: s * 0.07, borderColor: color }} />
                <View style={{ position: 'absolute', top: s * 0.08, right: s * 0.1, width: s * 0.08, height: s * 0.08, borderRadius: s * 0.04, backgroundColor: color }} />
            </View>
            <View style={{ position: 'absolute', top: s * 0.08, width: s * 0.3, height: s * 0.15, borderTopLeftRadius: s * 0.06, borderTopRightRadius: s * 0.06, backgroundColor: color }} />
        </View>
    );
}

// ── Mic (Speaking) ────────────────────────────────────────────────────────────
export function IconMic({ size = 24, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s * 0.3, height: s * 0.5, borderRadius: s * 0.15, backgroundColor: color, position: 'absolute', top: s * 0.1 }} />
            <View style={{
                width: s * 0.55, height: s * 0.3,
                borderBottomLeftRadius: s * 0.275, borderBottomRightRadius: s * 0.275,
                borderWidth: s * 0.07, borderColor: color, borderTopWidth: 0,
                position: 'absolute', top: s * 0.35,
            }} />
            <View style={{ position: 'absolute', bottom: s * 0.1, width: s * 0.07, height: s * 0.15, backgroundColor: color }} />
            <View style={{ position: 'absolute', bottom: s * 0.1, width: s * 0.35, height: s * 0.07, backgroundColor: color, borderRadius: s * 0.035 }} />
        </View>
    );
}

// ── Reusable Angled Finger for Gestures ───────────────────────────────────────
const GestureFinger = ({ s, color }) => (
    <View style={{
        position: 'absolute', bottom: s * -0.05, right: s * 0.18,
        width: s * 0.26, height: s * 0.65, borderRadius: s * 0.13,
        backgroundColor: color, transform: [{ rotate: '-25deg' }],
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 5, shadowOffset: { width: -3, height: 3 },
    }} />
);

// ── Double tap gesture ────────────────────────────────────────────────────────
export function IconDoubleTap({ size = 48, color = '#00BFFF' }) {
    const s = size;
    const cx = 0.4; // Perfectly align ripple center to finger tip
    const cy = 0.3;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', top: s * (cy - 0.075), left: s * (cx - 0.075), width: s * 0.15, height: s * 0.15, borderRadius: s * 0.075, backgroundColor: color }} />
            {[0.4, 0.65].map((w, i) => (
                <View key={i} style={{
                    position: 'absolute', top: s * (cy - w / 2), left: s * (cx - w / 2),
                    width: s * w, height: s * w, borderRadius: s * (w / 2),
                    borderWidth: s * 0.04, borderColor: color, opacity: 0.6 - i * 0.3,
                }} />
            ))}
            <GestureFinger s={s} color={color} />
        </View>
    );
}

// ── Long press gesture ────────────────────────────────────────────────────────
export function IconLongPress({ size = 48, color = '#A78BFA' }) {
    const s = size;
    const cx = 0.4;
    const cy = 0.3;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                position: 'absolute', top: s * (cy - 0.25), left: s * (cx - 0.25),
                width: s * 0.5, height: s * 0.5, borderRadius: s * 0.25,
                borderWidth: s * 0.08, borderColor: color, opacity: 0.3,
            }} />
            <View style={{ position: 'absolute', top: s * (cy - 0.1), left: s * (cx - 0.1), width: s * 0.2, height: s * 0.2, borderRadius: s * 0.1, backgroundColor: color }} />
            <GestureFinger s={s} color={color} />
        </View>
    );
}

// ── Swipe gesture (Bi-Directional) ────────────────────────────────────────────
export function IconSwipe({ size = 48, color = '#00E5A0' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Straight Horizontal Track */}
            <View style={{
                position: 'absolute', top: s * 0.27, left: s * 0.2,
                width: s * 0.6, height: s * 0.06, borderRadius: s * 0.03,
                backgroundColor: color, opacity: 0.4
            }} />
            {/* Left Arrowhead (perfect geometric shape) */}
            <View style={{
                position: 'absolute', top: s * 0.16, left: s * 0.16,
                width: s * 0.28, height: s * 0.28,
                borderBottomWidth: s * 0.06, borderLeftWidth: s * 0.06,
                borderColor: color, opacity: 0.8,
                transform: [{ rotate: '45deg' }]
            }} />
            {/* Right Arrowhead */}
            <View style={{
                position: 'absolute', top: s * 0.16, right: s * 0.16,
                width: s * 0.28, height: s * 0.28,
                borderTopWidth: s * 0.06, borderRightWidth: s * 0.06,
                borderColor: color, opacity: 0.8,
                transform: [{ rotate: '45deg' }]
            }} />
            <GestureFinger s={s} color={color} />
        </View>
    );
}

// ── Triple tap gesture ────────────────────────────────────────────────────────
export function IconTripleTap({ size = 48, color = '#FFB020' }) {
    const s = size;
    const cx = 0.4;
    const cy = 0.3;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', top: s * (cy - 0.05), left: s * (cx - 0.05), width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: color }} />
            {[0.3, 0.5, 0.7].map((w, i) => (
                <View key={i} style={{
                    position: 'absolute', top: s * (cy - w / 2), left: s * (cx - w / 2),
                    width: s * w, height: s * w, borderRadius: s * (w / 2),
                    borderWidth: s * 0.03, borderColor: color, opacity: 0.8 - i * 0.25,
                }} />
            ))}
            <GestureFinger s={s} color={color} />
        </View>
    );
}

// ── Welcome / Intro (Wave) ────────────────────────────────────────────────────
export function IconWave({ size = 48, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s * 0.7, height: s * 0.8, transform: [{ rotate: '15deg' }], position: 'absolute', left: s * 0.1, top: s * 0.1 }}>
                <View style={{ width: s * 0.45, height: s * 0.35, borderRadius: s * 0.1, backgroundColor: color, position: 'absolute', bottom: s * 0.05, left: s * 0.1 }} />
                <View style={{ position: 'absolute', bottom: s * 0.35, left: s * 0.1, width: s * 0.1, height: s * 0.25, borderRadius: s * 0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s * 0.35, left: s * 0.22, width: s * 0.1, height: s * 0.35, borderRadius: s * 0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s * 0.35, left: s * 0.34, width: s * 0.1, height: s * 0.3, borderRadius: s * 0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s * 0.35, left: s * 0.46, width: s * 0.1, height: s * 0.2, borderRadius: s * 0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s * 0.15, left: s * 0.0, width: s * 0.1, height: s * 0.25, borderRadius: s * 0.05, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
            </View>
            <View style={{ position: 'absolute', right: s * 0.05, top: s * 0.2, width: s * 0.2, height: s * 0.3, borderRightWidth: s * 0.06, borderColor: color, borderRadius: s * 0.15, opacity: 0.5 }} />
            <View style={{ position: 'absolute', right: 0, top: s * 0.1, width: s * 0.35, height: s * 0.5, borderRightWidth: s * 0.06, borderColor: color, borderRadius: s * 0.25, opacity: 0.3 }} />
        </View>
    );
}

// ── Done / Check ──────────────────────────────────────────────────────────────
export function IconCheck({ size = 48, color = '#00E5A0' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                width: s * 0.85, height: s * 0.85, borderRadius: s * 0.425,
                borderWidth: s * 0.07, borderColor: color,
                alignItems: 'center', justifyContent: 'center',
            }}>
                <View style={{
                    width: s * 0.25, height: s * 0.45,
                    borderBottomWidth: s * 0.08, borderRightWidth: s * 0.08, borderColor: color,
                    transform: [{ rotate: '45deg' }, { translateY: s * -0.05 }, { translateX: s * -0.05 }],
                }} />
            </View>
        </View>
    );
}

// ── Finish / Party (Confetti Burst) ───────────────────────────────────────────
export function IconFinish({ size = 48, color = '#FFB020' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s * 0.3, height: s * 0.3, borderRadius: s * 0.15, backgroundColor: color }} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
                <View key={deg} style={{
                    position: 'absolute',
                    width: s * (i % 2 === 0 ? 0.2 : 0.12), height: s * 0.06,
                    borderRadius: s * 0.03, backgroundColor: i % 2 === 0 ? color : '#00BFFF',
                    transform: [{ rotate: `${deg}deg` }, { translateX: s * 0.35 }],
                }} />
            ))}
        </View>
    );
}


// ── SwipeUp (Upward arrow with finger) ───────────────────────────────────────
export function IconSwipeUp({ size = 24, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Arrow shaft */}
            <View style={{
                position: 'absolute',
                width: s * 0.1, height: s * 0.5,
                backgroundColor: color, borderRadius: s * 0.05,
                top: s * 0.1,
            }} />
            {/* Arrow head left */}
            <View style={{
                position: 'absolute',
                width: s * 0.26, height: s * 0.1,
                backgroundColor: color, borderRadius: s * 0.05,
                top: s * 0.1,
                transform: [{ rotate: '-45deg' }, { translateX: -s * 0.09 }],
            }} />
            {/* Arrow head right */}
            <View style={{
                position: 'absolute',
                width: s * 0.26, height: s * 0.1,
                backgroundColor: color, borderRadius: s * 0.05,
                top: s * 0.1,
                transform: [{ rotate: '45deg' }, { translateX: s * 0.09 }],
            }} />
            {/* Finger base */}
            <View style={{
                position: 'absolute',
                bottom: s * 0.08,
                width: s * 0.4, height: s * 0.22,
                borderRadius: s * 0.11,
                backgroundColor: color, opacity: 0.7,
            }} />
        </View>
    );
}

// ── Map of icon ID → component ────────────────────────────────────────────────
export const GESTURE_ICONS = {
    intro:       IconWave,
    double_tap:  IconDoubleTap,
    double_done: IconCheck,
    long_press:  IconLongPress,
    long_done:   IconCheck,
    swipe:       IconSwipe,
    swipe_done:  IconCheck,
    triple_tap:  IconTripleTap,
    finish:      IconFinish,
    swipe_up:    IconSwipeUp,
};

export const MODE_ICONS = {
    scene:  IconScene,
    object: IconObject,
    read:   IconRead,
    people: IconPeople,
};
