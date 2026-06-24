/**
 * screens/MainScreen/BottomPanel.js  — Flat Minimal
 *
 * Result text fades in cleanly (no slide). Source badge is very subtle.
 * Hint text is small and quiet. No visual clutter.
 */

import React from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { GREEN, AMBER } from '../../constants/colors';
import { s } from './styles';

export function BottomPanel({
    lastResult,
    lastSource,
    appState,
    activeColor,
    watching,
    autoScan,
    isRTL,
    resultOpacity,
    resultSlide,   // kept for API compat — we only use opacity below
    t,
}) {
    // Android gesture-nav bar is typically 28-34px below the content area.
    // Without safe-area-context we add a fixed extra pad on Android only.
    const extraBottom = Platform.OS === 'android' ? 34 : 0;
    const isReady    = appState === 'ready';
    const isScanning = appState === 'scanning';
    const isSpeaking = appState === 'speaking';

    const hintText = watching
        ? (isRTL ? 'انقر مرتين للإيقاف' : 'double tap to stop')
        : isReady
            ? (autoScan ? t('hint_auto') : t('hint_ready'))
            : isScanning ? t('hint_scanning')
                : isSpeaking ? t('hint_speaking')
                    : '';

    return (
        <View style={[s.bottom, { paddingBottom: 48 + extraBottom }]}>

            {/* Source badge — offline indicator, very quiet */}
            {lastResult && lastSource !== 'gemini' && (
                <View style={s.sourceBadge}>
                    <View style={[s.sourceDot, {
                        backgroundColor: lastSource === 'tflite' ? GREEN : AMBER,
                    }]} />
                    <Text style={[s.sourceTxt, {
                        color: lastSource === 'tflite' ? GREEN : AMBER,
                        opacity: 0.7,
                    }]}>
                        {lastSource === 'tflite' ? 'OFFLINE' : 'ML KIT'}
                    </Text>
                </View>
            )}

            {/* Result text — fade only, no translate */}
            {lastResult ? (
                <Animated.Text
                    style={[
                        s.resultText,
                        isRTL && s.rtlText,
                        { opacity: resultOpacity },
                    ]}
                    accessibilityLiveRegion="polite"
                    numberOfLines={8}
                >
                    {lastResult}
                </Animated.Text>
            ) : null}

            {/* Hint */}
            <View style={[s.hintRow, isRTL && s.rowReverse]}>
                <Text style={[s.hintText, isRTL && s.rtlText]}>{hintText}</Text>
            </View>
        </View>
    );
}
