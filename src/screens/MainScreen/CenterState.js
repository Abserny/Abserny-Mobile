/**
 * screens/MainScreen/CenterState.js  — Flat Minimal
 *
 * One dot. One ring. Three bars. A cross.
 * State communicated through opacity fades only — no scale, no rotation.
 */

import React from 'react';
import { View, Text, Animated } from 'react-native';
import { GREEN, AMBER, RED } from '../../constants/colors';
import { ScanRing }  from '../../components/primitives/ScanRing';
import { WaveBar }   from '../../components/primitives/WaveBar';
import { LiveDot }   from '../../components/primitives/LiveDot';
import { s } from './styles';

export function CenterState({
    appState,
    activeColor,
    modeColor,
    pulseOpacity,
    pulseScale,   // kept in signature for compatibility — not used
    watchOpacity,
    watching,
    autoScan,
    isRTL,
}) {
    const isReady    = appState === 'ready';
    const isScanning = appState === 'scanning';
    const isSpeaking = appState === 'speaking';
    const isError    = appState === 'error';

    return (
        <View style={s.center} pointerEvents="none">

            {/* Watch ring — hairline, barely there, always absolute behind everything */}
            {watching && (
                <Animated.View style={[s.watchRing, {
                    borderColor: GREEN + '50',
                    opacity: watchOpacity,
                }]} />
            )}

            {/* Column: optional badge above → state indicator */}
            <View style={s.indicatorColumn}>

                {/* AUTO badge — above the ready dot */}
                {autoScan && isReady && !watching && (
                    <View style={[s.stateBadge, {
                        borderColor: AMBER + '30',
                        backgroundColor: 'rgba(240,168,48,0.06)',
                    }]}>
                        <View style={[s.stateDot, { backgroundColor: AMBER }]} />
                        <Text style={[s.stateBadgeText, { color: AMBER }]}>
                            {isRTL ? 'تلقائي' : 'AUTO'}
                        </Text>
                    </View>
                )}

                {/* WATCH badge — above the watch ring */}
                {watching && (
                    <View style={[s.stateBadge, {
                        borderColor: GREEN + '30',
                        backgroundColor: 'rgba(78,219,160,0.06)',
                    }]}>
                        <LiveDot color={GREEN} />
                        <Text style={[s.stateBadgeText, { color: GREEN }]}>
                            {isRTL ? 'مراقبة' : 'WATCH'}
                        </Text>
                    </View>
                )}

                {/* Ready — single fading dot */}
                {isReady && (
                    <Animated.View style={[s.readyDot, {
                        backgroundColor: activeColor,
                        opacity: pulseOpacity,
                    }]} />
                )}

                {/* Scanning — thin ring + label */}
                {isScanning && (
                    <View style={{ alignItems: 'center' }}>
                        <ScanRing color={modeColor} />
                        <Text style={[s.scanLabel, { color: modeColor }]}>
                            {isRTL ? 'مسح' : 'SCAN'}
                        </Text>
                    </View>
                )}

                {/* Speaking — three quiet bars */}
                {isSpeaking && (
                    <View style={s.waveRow}>
                        {[0, 180, 360].map((delay, i) => (
                            <WaveBar key={i} color={activeColor} delay={delay} />
                        ))}
                    </View>
                )}

                {/* Error — plain X */}
                {isError && (
                    <View style={s.errorMark}>
                        <View style={[s.errorLine1, { backgroundColor: RED }]} />
                        <View style={[s.errorLine2, { backgroundColor: RED }]} />
                    </View>
                )}

            </View>
        </View>
    );
}
