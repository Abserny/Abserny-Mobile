/**
 * AbsernyIcons.js
 * All custom vector-style icons for Abserny.
 * Drawn with React Native View/border primitives — no SVG dependency needed.
 *
 * v2.1 gesture icon redesign:
 *   - Finger tip now mathematically aligned to the impact point of every gesture
 *   - Icons are two-layer: background gesture indicator (rings/arrows) at 40%
 *     opacity + foreground finger at 100% — clear visual hierarchy
 *   - Finger is slimmer and proportionally smaller so the gesture indicator
 *     reads first, finger reads second
 *   - All icons use the same finger geometry for visual consistency
 */

import React from 'react';
import { View } from 'react-native';

// ── Mode icons ────────────────────────────────────────────────────────────────

export function IconScene({ size = 24, color = '#00BFFF' }) {
    const s = size;
    // Eye: two overlapping circles make an almond — solid, zero rotation, reads at 17px
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {/* Outer oval */}
            <View style={{
                width: s * 0.88, height: s * 0.56,
                borderRadius: s * 0.28,
                borderWidth: Math.max(1.5, s * 0.1),
                borderColor: color,
                alignItems: 'center', justifyContent: 'center',
            }}>
                {/* Pupil */}
                <View style={{ width: s * 0.26, height: s * 0.26, borderRadius: s * 0.13, backgroundColor: color }} />
            </View>
        </View>
    );
}

export function IconObject({ size = 24, color = '#A78BFA' }) {
    const s = size;
    // Cube: two solid rects offset — unmistakable object/thing icon at any size
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Back face (lighter) */}
            <View style={{
                position: 'absolute',
                top: s * 0.1, left: s * 0.22,
                width: s * 0.6, height: s * 0.6,
                borderRadius: s * 0.08,
                borderWidth: Math.max(1.5, s * 0.1),
                borderColor: color,
                opacity: 0.4,
            }} />
            {/* Front face (solid) */}
            <View style={{
                position: 'absolute',
                top: s * 0.28, left: s * 0.1,
                width: s * 0.6, height: s * 0.6,
                borderRadius: s * 0.08,
                backgroundColor: color,
            }} />
        </View>
    );
}

export function IconRead({ size = 24, color = '#00E5A0' }) {
    const s = size;
    // Document: border rect + 3 solid line bars. Clean at 17px.
    const bw = Math.max(1.5, s * 0.1);
    const lh = Math.max(1.5, s * 0.11);
    const lw = s * 0.44;
    const lx = s * 0.22;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Page outline */}
            <View style={{
                width: s * 0.72, height: s * 0.84,
                borderRadius: s * 0.08,
                borderWidth: bw, borderColor: color,
            }} />
            {/* Line 1 */}
            <View style={{ position: 'absolute', top: s * 0.26, left: lx, width: lw,        height: lh, borderRadius: lh/2, backgroundColor: color }} />
            {/* Line 2 */}
            <View style={{ position: 'absolute', top: s * 0.44, left: lx, width: lw * 0.7,  height: lh, borderRadius: lh/2, backgroundColor: color }} />
            {/* Line 3 */}
            <View style={{ position: 'absolute', top: s * 0.62, left: lx, width: lw,        height: lh, borderRadius: lh/2, backgroundColor: color }} />
        </View>
    );
}

export function IconPeople({ size = 24, color = '#FFB020' }) {
    const s = size;
    // Person: solid circle head + solid dome shoulders. Unmistakable at 17px.
    const hd = s * 0.36;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {/* Head — big enough to see at small size */}
            <View style={{
                width: hd, height: hd, borderRadius: hd / 2,
                backgroundColor: color,
                position: 'absolute', top: s * 0.06,
                alignSelf: 'center',
            }} />
            {/* Shoulders — wide dome */}
            <View style={{
                width: s * 0.72, height: s * 0.4,
                borderTopLeftRadius: s * 0.36, borderTopRightRadius: s * 0.36,
                borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05,
                backgroundColor: color,
                position: 'absolute', bottom: s * 0.05,
            }} />
        </View>
    );
}

export function IconSettings({ size = 24, color = 'rgba(255,255,255,0.5)' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            {[0, 60, 120].map(deg => (
                <View key={deg} style={{
                    position: 'absolute', width: s * 0.85, height: s * 0.24,
                    backgroundColor: color, borderRadius: s * 0.06,
                    transform: [{ rotate: `${deg}deg` }],
                }} />
            ))}
            <View style={{ position: 'absolute', width: s * 0.6, height: s * 0.6, borderRadius: s * 0.3, backgroundColor: color }} />
            <View style={{ position: 'absolute', width: s * 0.26, height: s * 0.26, borderRadius: s * 0.13, backgroundColor: '#1E1E1E' }} />
        </View>
    );
}

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

// ── Shared finger shape ───────────────────────────────────────────────────────
// The finger tip sits at coordinates (tipX, tipY) in the parent's coordinate
// space. tipX / tipY are expressed as fractions of s (icon size).
// The finger body extends down-right from the tip.
//
//   tipX / tipY : where the fingertip visually touches (fraction of s)
//   rotate      : tilt of the finger (default -20deg = slight left lean)
function GestureFinger({ s, color, tipX = 0.5, tipY = 0.38, rotate = '-20deg' }) {
    const W  = s * 0.18;   // finger width
    const H  = s * 0.52;   // finger height
    const R  = W / 2;      // border radius
    // The tip of the rounded rect is at its top-center.
    // Position the rect so its top-center sits at (tipX*s, tipY*s).
    const left = tipX * s - W / 2;
    const top  = tipY * s;
    return (
        <View style={{
            position: 'absolute',
            left, top,
            width: W, height: H,
            borderRadius: R,
            backgroundColor: color,
            transform: [{ rotate }],
            // Finger sits on top of the gesture indicator
            zIndex: 2,
        }} />
    );
}

// ── Double tap ────────────────────────────────────────────────────────────────
// Two concentric rings + solid dot at impact point. Finger tip meets dot.
export function IconDoubleTap({ size = 48, color = '#00BFFF' }) {
    const s = size;
    // Impact point: upper-center of canvas
    const ix = 0.5;
    const iy = 0.32;
    return (
        <View style={{ width: s, height: s }}>
            {/* Outer ring — faint */}
            <View style={{
                position: 'absolute',
                left: s * (ix - 0.32), top: s * (iy - 0.32),
                width: s * 0.64, height: s * 0.64, borderRadius: s * 0.32,
                borderWidth: s * 0.03, borderColor: color, opacity: 0.2,
            }} />
            {/* Inner ring */}
            <View style={{
                position: 'absolute',
                left: s * (ix - 0.19), top: s * (iy - 0.19),
                width: s * 0.38, height: s * 0.38, borderRadius: s * 0.19,
                borderWidth: s * 0.04, borderColor: color, opacity: 0.5,
            }} />
            {/* Impact dot */}
            <View style={{
                position: 'absolute',
                left: s * (ix - 0.07), top: s * (iy - 0.07),
                width: s * 0.14, height: s * 0.14, borderRadius: s * 0.07,
                backgroundColor: color,
            }} />
            {/* Second tap dot offset slightly */}
            <View style={{
                position: 'absolute',
                left: s * (ix + 0.08), top: s * (iy - 0.02),
                width: s * 0.09, height: s * 0.09, borderRadius: s * 0.045,
                backgroundColor: color, opacity: 0.55,
            }} />
            <GestureFinger s={s} color={color} tipX={ix} tipY={iy + 0.07} rotate="-15deg" />
        </View>
    );
}

// ── Long press ────────────────────────────────────────────────────────────────
// Solid filled circle (held contact) + one outer pulsing ring indicator.
export function IconLongPress({ size = 48, color = '#A78BFA' }) {
    const s = size;
    const ix = 0.5;
    const iy = 0.30;
    return (
        <View style={{ width: s, height: s }}>
            {/* Hold ring — thick, to convey "pressing down" */}
            <View style={{
                position: 'absolute',
                left: s * (ix - 0.28), top: s * (iy - 0.28),
                width: s * 0.56, height: s * 0.56, borderRadius: s * 0.28,
                borderWidth: s * 0.055, borderColor: color, opacity: 0.25,
            }} />
            {/* Inner hold ring */}
            <View style={{
                position: 'absolute',
                left: s * (ix - 0.17), top: s * (iy - 0.17),
                width: s * 0.34, height: s * 0.34, borderRadius: s * 0.17,
                borderWidth: s * 0.045, borderColor: color, opacity: 0.55,
            }} />
            {/* Pressed dot — larger and solid, shows contact */}
            <View style={{
                position: 'absolute',
                left: s * (ix - 0.1), top: s * (iy - 0.1),
                width: s * 0.2, height: s * 0.2, borderRadius: s * 0.1,
                backgroundColor: color,
            }} />
            <GestureFinger s={s} color={color} tipX={ix} tipY={iy + 0.08} rotate="-15deg" />
        </View>
    );
}

// ── Swipe (bi-directional horizontal) ────────────────────────────────────────
// Clean horizontal track + two arrow chevrons pointing left and right.
export function IconSwipe({ size = 48, color = '#00E5A0' }) {
    const s  = size;
    const ty = 0.32;   // vertical center of the whole indicator
    // Finger sits below center, pointing up at the track
    return (
        <View style={{ width: s, height: s }}>
            {/* Track */}
            <View style={{
                position: 'absolute',
                left: s * 0.15, top: s * ty - s * 0.025,
                width: s * 0.7, height: s * 0.05,
                backgroundColor: color, opacity: 0.3, borderRadius: s * 0.025,
            }} />
            {/* Left chevron */}
            <View style={{
                position: 'absolute',
                left: s * 0.13, top: s * ty - s * 0.13,
                width: s * 0.18, height: s * 0.18,
                borderBottomWidth: s * 0.055, borderLeftWidth: s * 0.055,
                borderColor: color, opacity: 0.85,
                transform: [{ rotate: '45deg' }],
            }} />
            {/* Right chevron */}
            <View style={{
                position: 'absolute',
                right: s * 0.13, top: s * ty - s * 0.13,
                width: s * 0.18, height: s * 0.18,
                borderTopWidth: s * 0.055, borderRightWidth: s * 0.055,
                borderColor: color, opacity: 0.85,
                transform: [{ rotate: '45deg' }],
            }} />
            {/* Finger — tip touches the track center */}
            <GestureFinger s={s} color={color} tipX={0.5} tipY={ty} rotate="-10deg" />
        </View>
    );
}

// ── Triple tap ────────────────────────────────────────────────────────────────
// Three concentric rings — clearly "more" than double tap's two.
export function IconTripleTap({ size = 48, color = '#FFB020' }) {
    const s  = size;
    const ix = 0.5;
    const iy = 0.30;
    return (
        <View style={{ width: s, height: s }}>
            {/* Three rings, decreasing opacity outward */}
            {[
                { r: 0.34, bw: 0.025, op: 0.18 },
                { r: 0.23, bw: 0.032, op: 0.40 },
                { r: 0.13, bw: 0.04,  op: 0.70 },
            ].map(({ r, bw, op }, i) => (
                    <View key={i} style={{
                        position: 'absolute',
                        left: s * (ix - r), top: s * (iy - r),
                        width: s * r * 2, height: s * r * 2, borderRadius: s * r,
                        borderWidth: s * bw, borderColor: color, opacity: op,
                    }} />
                ))}
            {/* Center dot */}
            <View style={{
                position: 'absolute',
                left: s * (ix - 0.065), top: s * (iy - 0.065),
                width: s * 0.13, height: s * 0.13, borderRadius: s * 0.065,
                backgroundColor: color,
            }} />
            <GestureFinger s={s} color={color} tipX={ix} tipY={iy + 0.07} rotate="-15deg" />
        </View>
    );
}

// ── Swipe up ──────────────────────────────────────────────────────────────────
// Clean upward arrow (chevron style) + finger below pointing up.
export function IconSwipeUp({ size = 48, color = '#00BFFF' }) {
    const s  = size;
    const ax = 0.5;   // horizontal center
    const ay = 0.2;   // arrowhead tip Y
    return (
        <View style={{ width: s, height: s }}>
            {/* Arrow shaft */}
            <View style={{
                position: 'absolute',
                left: s * ax - s * 0.03,
                top:  s * ay,
                width: s * 0.06, height: s * 0.36,
                backgroundColor: color, borderRadius: s * 0.03, opacity: 0.9,
            }} />
            {/* Left arm of chevron */}
            <View style={{
                position: 'absolute',
                left: s * (ax - 0.165), top: s * (ay - 0.01),
                width: s * 0.23, height: s * 0.06,
                backgroundColor: color, borderRadius: s * 0.03, opacity: 0.9,
                transform: [{ rotate: '-45deg' }],
            }} />
            {/* Right arm of chevron */}
            <View style={{
                position: 'absolute',
                left: s * (ax - 0.065), top: s * (ay - 0.01),
                width: s * 0.23, height: s * 0.06,
                backgroundColor: color, borderRadius: s * 0.03, opacity: 0.9,
                transform: [{ rotate: '45deg' }],
            }} />
            {/* Finger — tip at base of shaft */}
            <GestureFinger s={s} color={color} tipX={ax} tipY={0.56} rotate="-15deg" />
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
                <View style={{ position: 'absolute', bottom: s * 0.35, left: s * 0.1,  width: s * 0.1, height: s * 0.25, borderRadius: s * 0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s * 0.35, left: s * 0.22, width: s * 0.1, height: s * 0.35, borderRadius: s * 0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s * 0.35, left: s * 0.34, width: s * 0.1, height: s * 0.30, borderRadius: s * 0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s * 0.35, left: s * 0.46, width: s * 0.1, height: s * 0.20, borderRadius: s * 0.05, backgroundColor: color }} />
                <View style={{ position: 'absolute', bottom: s * 0.15, left: 0, width: s * 0.1, height: s * 0.25, borderRadius: s * 0.05, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
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

// ── Finish / Burst ────────────────────────────────────────────────────────────
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

// ── Icon maps ─────────────────────────────────────────────────────────────────
export const GESTURE_ICONS = {
    intro:       IconWave,
    double_tap:  IconDoubleTap,
    double_done: IconCheck,
    long_press:  IconLongPress,
    long_done:   IconCheck,
    swipe:       IconSwipe,
    swipe_done:  IconCheck,
    triple_tap:  IconTripleTap,
    swipe_up:    IconSwipeUp,
    finish:      IconFinish,
};

export const MODE_ICONS = {
    scene:  IconScene,
    object: IconObject,
    read:   IconRead,
    people: IconPeople,
};
