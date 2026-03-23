/**
 * components/icons/ModeIcons.js
 * Mode icons: Scene, Object, Read, People.
 * Pure View/border primitives — no SVG dependency.
 */

import React from 'react';
import { View } from 'react-native';

export function IconScene({ size = 24, color = '#00BFFF' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <View style={{
                width: s * 0.88, height: s * 0.56,
                borderRadius: s * 0.28,
                borderWidth: Math.max(1.5, s * 0.1),
                borderColor: color,
                alignItems: 'center', justifyContent: 'center',
            }}>
                <View style={{ width: s * 0.26, height: s * 0.26, borderRadius: s * 0.13, backgroundColor: color }} />
            </View>
        </View>
    );
}

export function IconObject({ size = 24, color = '#A78BFA' }) {
    const s = size;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                position: 'absolute',
                top: s * 0.1, left: s * 0.22,
                width: s * 0.6, height: s * 0.6,
                borderRadius: s * 0.08,
                borderWidth: Math.max(1.5, s * 0.1),
                borderColor: color, opacity: 0.4,
            }} />
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
    const s  = size;
    const bw = Math.max(1.5, s * 0.1);
    const lh = Math.max(1.5, s * 0.11);
    const lw = s * 0.44;
    const lx = s * 0.22;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                width: s * 0.72, height: s * 0.84,
                borderRadius: s * 0.08,
                borderWidth: bw, borderColor: color,
            }} />
            <View style={{ position: 'absolute', top: s * 0.26, left: lx, width: lw,       height: lh, borderRadius: lh/2, backgroundColor: color }} />
            <View style={{ position: 'absolute', top: s * 0.44, left: lx, width: lw * 0.7, height: lh, borderRadius: lh/2, backgroundColor: color }} />
            <View style={{ position: 'absolute', top: s * 0.62, left: lx, width: lw,       height: lh, borderRadius: lh/2, backgroundColor: color }} />
        </View>
    );
}

export function IconPeople({ size = 24, color = '#FFB020' }) {
    const s  = size;
    const hd = s * 0.36;
    return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                width: hd, height: hd, borderRadius: hd / 2,
                backgroundColor: color,
                position: 'absolute', top: s * 0.06, alignSelf: 'center',
            }} />
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
