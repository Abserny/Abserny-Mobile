/**
 * screens/MainScreen/CenterState.js
 * Center of screen: ready ring, scan ring, wave bars, error, state badges.
 * Pure display — props in, JSX out.
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

            {/* Watch ring */}
            {watching && (
                <Animated.View style={[s.watchRing, {
                    borderColor: GREEN + '90',
                    opacity: watchOpacity,
                }]} />
            )}

            {/* Ready ring — opacity breath */}
            {isReady && (
                <View style={s.readyOuter}>
                    <Animated.View style={[s.readyRing, {
                        borderColor: activeColor + '50',
                        opacity: pulseOpacity,
                    }]}>
                        <View style={[s.readyDot, { backgroundColor: activeColor }]} />
                    </Animated.View>
                </View>
            )}

            {/* Scanning */}
            {isScanning && (
                <View style={s.scanningBox}>
                    <ScanRing color={modeColor} />
                    <Text style={[s.scanLabel, { color: modeColor, letterSpacing: 6 }]}>
                        {isRTL ? 'مسح' : 'SCAN'}
                    </Text>
                </View>
            )}

            {/* Speaking wave */}
            {isSpeaking && (
                <View style={s.waveRow}>
                    {[0, 110, 220, 110, 0].map((delay, i) => (
                        <WaveBar key={i} color={activeColor} delay={delay} />
                    ))}
                </View>
            )}

            {/* Error */}
            {isError && (
                <View style={[s.errorRing, { borderColor: RED + '60' }]}>
                    <View style={[s.errorLine1, { backgroundColor: RED }]} />
                    <View style={[s.errorLine2, { backgroundColor: RED }]} />
                </View>
            )}

            {/* AUTO badge */}
            {autoScan && isReady && !watching && (
                <View style={[s.stateBadge, {
                    borderColor: AMBER + '40', backgroundColor: AMBER + '10', top: -72,
                }]}>
                    <View style={[s.stateDot, { backgroundColor: AMBER }]} />
                    <Text style={[s.stateBadgeText, { color: AMBER }]}>
                        {isRTL ? 'تلقائي' : 'AUTO'}
                    </Text>
                </View>
            )}

            {/* WATCH badge */}
            {watching && (
                <View style={[s.stateBadge, {
                    borderColor: GREEN + '40', backgroundColor: GREEN + '10', top: -72,
                }]}>
                    <LiveDot color={GREEN} />
                    <Text style={[s.stateBadgeText, { color: GREEN }]}>
                        {isRTL ? 'مراقبة نشطة' : 'WATCHING'}
                    </Text>
                </View>
            )}
        </View>
    );
}
