/**
 * AbsernyIcons.js
 * All custom vector-style icons for Abserny.
 * Drawn with React Native View/border primitives — no SVG dependency needed.
 * Each icon accepts { size, color } props.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

// ── Utility ───────────────────────────────────────────────────────────────────
const D = (size, style) => (
    <View style={[{ width: size, height: size }, style]} />
);

// ── Scene (eye) ───────────────────────────────────────────────────────────────
export function IconScene({ size = 24, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer eye shape — two arcs via border radius */}
            <View style={{
                width: s * 0.92, height: s * 0.5,
                borderRadius: s * 0.25,
                borderWidth: s * 0.07,
                borderColor: color,
                alignItems: 'center', justifyContent: 'center',
                overflow: 'visible',
            }}>
                {/* Pupil */}
                <View style={{
                    width: s * 0.28, height: s * 0.28,
                    borderRadius: s * 0.14,
                    backgroundColor: color,
                }} />
            </View>
            {/* Scan line through eye */}
            <View style={{
                position: 'absolute',
                width: s * 0.55, height: s * 0.06,
                backgroundColor: color,
                opacity: 0.35,
                borderRadius: s * 0.03,
                top: s * 0.47,
            }} />
        </View>
    );
}

// ── Object (hand) ─────────────────────────────────────────────────────────────
export function IconObject({ size = 24, color = '#A78BFA' }) {
    const s = size;
    const finger = (left, h, delay) => (
        <View key={left} style={{
            position: 'absolute', left,
            bottom: s * 0.18,
            width: s * 0.14, height: h,
            borderRadius: s * 0.07,
            backgroundColor: color,
            opacity: 0.9,
        }} />
    );
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Palm */}
            <View style={{
                width: s * 0.62, height: s * 0.44,
                borderRadius: s * 0.1,
                backgroundColor: color,
                position: 'absolute',
                bottom: s * 0.04,
            }} />
            {/* Fingers */}
            {finger(s * 0.07,  s * 0.38)}
            {finger(s * 0.23,  s * 0.44)}
            {finger(s * 0.39,  s * 0.44)}
            {finger(s * 0.55,  s * 0.44)}
            {/* Thumb */}
            <View style={{
                position: 'absolute',
                left: s * 0.01, bottom: s * 0.18,
                width: s * 0.18, height: s * 0.28,
                borderRadius: s * 0.09,
                backgroundColor: color,
                transform: [{ rotate: '-20deg' }],
                opacity: 0.9,
            }} />
        </View>
    );
}

// ── Read (lines) ──────────────────────────────────────────────────────────────
export function IconRead({ size = 24, color = '#00E5A0' }) {
    const s = size;
    const line = (y, w) => (
        <View key={y} style={{
            position: 'absolute',
            top: y, left: (s - w) / 2,
            width: w, height: s * 0.07,
            borderRadius: s * 0.035,
            backgroundColor: color,
        }} />
    );
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Page outline */}
            <View style={{
                width: s * 0.7, height: s * 0.84,
                borderRadius: s * 0.06,
                borderWidth: s * 0.065,
                borderColor: color,
                position: 'absolute',
            }} />
            {/* Text lines */}
            {line(s * 0.26, s * 0.42)}
            {line(s * 0.38, s * 0.5)}
            {line(s * 0.50, s * 0.38)}
            {line(s * 0.62, s * 0.46)}
        </View>
    );
}

// ── People (figure) ───────────────────────────────────────────────────────────
export function IconPeople({ size = 24, color = '#FFB020' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Head */}
            <View style={{
                width: s * 0.3, height: s * 0.3,
                borderRadius: s * 0.15,
                backgroundColor: color,
                position: 'absolute', top: s * 0.04,
            }} />
            {/* Body */}
            <View style={{
                width: s * 0.46, height: s * 0.34,
                borderRadius: s * 0.1,
                backgroundColor: color,
                position: 'absolute', top: s * 0.38,
            }} />
            {/* Legs */}
            <View style={{
                position: 'absolute', bottom: s * 0.04, left: s * 0.22,
                width: s * 0.14, height: s * 0.24,
                borderRadius: s * 0.07,
                backgroundColor: color,
            }} />
            <View style={{
                position: 'absolute', bottom: s * 0.04, right: s * 0.22,
                width: s * 0.14, height: s * 0.24,
                borderRadius: s * 0.07,
                backgroundColor: color,
            }} />
        </View>
    );
}

// ── Settings (gear) ───────────────────────────────────────────────────────────
export function IconSettings({ size = 24, color = 'rgba(255,255,255,0.5)' }) {
    const s = size;
    // Gear via overlapping squares rotated
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                width: s * 0.44, height: s * 0.44,
                borderRadius: s * 0.22,
                borderWidth: s * 0.1,
                borderColor: color,
                position: 'absolute',
            }} />
            {/* Teeth — 4 small rectangles around the circle */}
            {[0, 45, 90, 135].map(deg => (
                <View key={deg} style={{
                    position: 'absolute',
                    width: s * 0.18, height: s * 0.16,
                    borderRadius: s * 0.03,
                    backgroundColor: color,
                    transform: [
                        { rotate: `${deg}deg` },
                        { translateX: s * 0.36 },
                    ],
                    opacity: 0.9,
                }} />
            ))}
        </View>
    );
}

// ── Camera / Scan trigger ─────────────────────────────────────────────────────
export function IconCamera({ size = 24, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Body */}
            <View style={{
                width: s * 0.82, height: s * 0.62,
                borderRadius: s * 0.1,
                borderWidth: s * 0.07,
                borderColor: color,
                position: 'absolute', bottom: s * 0.04,
                alignItems: 'center', justifyContent: 'center',
            }}>
                {/* Lens */}
                <View style={{
                    width: s * 0.32, height: s * 0.32,
                    borderRadius: s * 0.16,
                    borderWidth: s * 0.07,
                    borderColor: color,
                }} />
            </View>
            {/* Viewfinder bump */}
            <View style={{
                position: 'absolute', top: s * 0.08,
                width: s * 0.28, height: s * 0.14,
                borderRadius: s * 0.05,
                backgroundColor: color,
            }} />
        </View>
    );
}

// ── Mic / Speaking ────────────────────────────────────────────────────────────
export function IconMic({ size = 24, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Capsule */}
            <View style={{
                width: s * 0.36, height: s * 0.54,
                borderRadius: s * 0.18,
                backgroundColor: color,
                position: 'absolute', top: s * 0.04,
            }} />
            {/* Arc */}
            <View style={{
                width: s * 0.58, height: s * 0.34,
                borderRadius: s * 0.29,
                borderWidth: s * 0.07,
                borderColor: color,
                borderBottomWidth: 0,
                position: 'absolute', top: s * 0.3,
            }} />
            {/* Stand */}
            <View style={{ position: 'absolute', bottom: s * 0.04, width: s * 0.07, height: s * 0.16, backgroundColor: color, borderRadius: s * 0.035 }} />
            <View style={{ position: 'absolute', bottom: s * 0.04, width: s * 0.4, height: s * 0.07, backgroundColor: color, borderRadius: s * 0.035 }} />
        </View>
    );
}

// ── Double tap gesture ────────────────────────────────────────────────────────
export function IconDoubleTap({ size = 48, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Finger */}
            <View style={{
                width: s * 0.28, height: s * 0.52,
                borderRadius: s * 0.14,
                backgroundColor: color,
                position: 'absolute', bottom: s * 0.06,
            }} />
            {/* Two tap ripple rings */}
            <View style={{
                position: 'absolute', top: s * 0.04,
                width: s * 0.5, height: s * 0.5,
                borderRadius: s * 0.25,
                borderWidth: s * 0.04,
                borderColor: color,
                opacity: 0.5,
            }} />
            <View style={{
                position: 'absolute', top: s * 0.12,
                width: s * 0.34, height: s * 0.34,
                borderRadius: s * 0.17,
                borderWidth: s * 0.04,
                borderColor: color,
                opacity: 0.8,
            }} />
        </View>
    );
}

// ── Long press gesture ────────────────────────────────────────────────────────
export function IconLongPress({ size = 48, color = '#A78BFA' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Finger */}
            <View style={{
                width: s * 0.28, height: s * 0.52,
                borderRadius: s * 0.14,
                backgroundColor: color,
                position: 'absolute', bottom: s * 0.06,
            }} />
            {/* Hold indicator — filled circle */}
            <View style={{
                position: 'absolute', top: s * 0.06,
                width: s * 0.46, height: s * 0.46,
                borderRadius: s * 0.23,
                borderWidth: s * 0.04,
                borderColor: color,
                opacity: 0.6,
            }} />
            {/* Fill arc — solid dot */}
            <View style={{
                position: 'absolute', top: s * 0.18,
                width: s * 0.22, height: s * 0.22,
                borderRadius: s * 0.11,
                backgroundColor: color,
                opacity: 0.9,
            }} />
        </View>
    );
}

// ── Swipe gesture ─────────────────────────────────────────────────────────────
export function IconSwipe({ size = 48, color = '#00E5A0' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Finger */}
            <View style={{
                width: s * 0.24, height: s * 0.46,
                borderRadius: s * 0.12,
                backgroundColor: color,
                position: 'absolute',
                bottom: s * 0.1,
                left: s * 0.12,
            }} />
            {/* Arrow shaft */}
            <View style={{
                position: 'absolute',
                top: s * 0.44,
                left: s * 0.3,
                width: s * 0.52, height: s * 0.07,
                borderRadius: s * 0.035,
                backgroundColor: color,
            }} />
            {/* Arrowhead */}
            <View style={{
                position: 'absolute',
                top: s * 0.35,
                right: s * 0.08,
                width: 0, height: 0,
                borderLeftWidth: s * 0.12,
                borderTopWidth: s * 0.12,
                borderBottomWidth: s * 0.12,
                borderLeftColor: color,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
            }} />
        </View>
    );
}

// ── Triple tap gesture ────────────────────────────────────────────────────────
export function IconTripleTap({ size = 48, color = '#FFB020' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Finger */}
            <View style={{
                width: s * 0.22, height: s * 0.44,
                borderRadius: s * 0.11,
                backgroundColor: color,
                position: 'absolute', bottom: s * 0.06,
            }} />
            {/* Three rings */}
            {[0.04, 0.14, 0.25].map((top, i) => (
                <View key={i} style={{
                    position: 'absolute', top: s * top,
                    width: s * (0.42 + i * 0.04), height: s * (0.42 + i * 0.04),
                    borderRadius: s * (0.21 + i * 0.02),
                    borderWidth: s * 0.035,
                    borderColor: color,
                    opacity: 0.3 + i * 0.3,
                }} />
            ))}
        </View>
    );
}

// ── Welcome / Intro ───────────────────────────────────────────────────────────
export function IconWave({ size = 48, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Hand body */}
            <View style={{
                width: s * 0.5, height: s * 0.58,
                borderRadius: s * 0.1,
                backgroundColor: color,
                position: 'absolute', bottom: s * 0.04,
            }} />
            {/* Fingers */}
            {[0.08, 0.22, 0.36].map((left, i) => (
                <View key={i} style={{
                    position: 'absolute',
                    left: s * left, top: s * 0.04,
                    width: s * 0.12, height: s * (0.36 + i * 0.04),
                    borderRadius: s * 0.06,
                    backgroundColor: color,
                }} />
            ))}
            {/* Radiating lines */}
            {[-25, 0, 25].map((deg, i) => (
                <View key={i} style={{
                    position: 'absolute',
                    right: s * 0.02, top: s * 0.15,
                    width: s * 0.22, height: s * 0.04,
                    borderRadius: s * 0.02,
                    backgroundColor: color,
                    opacity: 0.4,
                    transform: [{ rotate: `${deg}deg` }],
                }} />
            ))}
        </View>
    );
}

// ── Done / Check ──────────────────────────────────────────────────────────────
export function IconCheck({ size = 48, color = '#00E5A0' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Circle */}
            <View style={{
                width: s * 0.88, height: s * 0.88,
                borderRadius: s * 0.44,
                borderWidth: s * 0.07,
                borderColor: color,
                alignItems: 'center', justifyContent: 'center',
            }}>
                {/* Short arm */}
                <View style={{
                    position: 'absolute',
                    bottom: s * 0.27, left: s * 0.16,
                    width: s * 0.22, height: s * 0.07,
                    borderRadius: s * 0.035,
                    backgroundColor: color,
                    transform: [{ rotate: '45deg' }],
                }} />
                {/* Long arm */}
                <View style={{
                    position: 'absolute',
                    bottom: s * 0.28, right: s * 0.14,
                    width: s * 0.38, height: s * 0.07,
                    borderRadius: s * 0.035,
                    backgroundColor: color,
                    transform: [{ rotate: '-50deg' }],
                }} />
            </View>
        </View>
    );
}

// ── Finish / Party ────────────────────────────────────────────────────────────
export function IconFinish({ size = 48, color = '#FFB020' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Star */}
            {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg, i) => (
                <View key={i} style={{
                    position: 'absolute',
                    width: i % 2 === 0 ? s * 0.12 : s * 0.07,
                    height: i % 2 === 0 ? s * 0.12 : s * 0.07,
                    borderRadius: s * 0.06,
                    backgroundColor: i % 2 === 0 ? color : '#00BFFF',
                    transform: [
                        { rotate: `${deg}deg` },
                        { translateX: s * (i % 2 === 0 ? 0.32 : 0.22) },
                    ],
                    opacity: 0.8 + (i % 2) * 0.2,
                }} />
            ))}
            {/* Center circle */}
            <View style={{
                width: s * 0.3, height: s * 0.3,
                borderRadius: s * 0.15,
                backgroundColor: color,
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
};

export const MODE_ICONS = {
    scene:  IconScene,
    object: IconObject,
    read:   IconRead,
    people: IconPeople,
};
