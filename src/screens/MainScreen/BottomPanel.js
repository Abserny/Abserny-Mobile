/**
 * screens/MainScreen/BottomPanel.js
 * Result text + hint + gesture guide row.
 * Pure display — props in, JSX out.
 */

import React from 'react';
import { View, Text, Animated } from 'react-native';
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
    resultSlide,
    t,
}) {
    const isReady    = appState === 'ready';
    const isScanning = appState === 'scanning';
    const isSpeaking = appState === 'speaking';

    const hintText = watching
        ? (isRTL ? 'انقر مرتين أو مرر لأعلى للإيقاف' : 'double tap or swipe up to stop')
        : isReady
            ? (autoScan ? t('hint_auto') : t('hint_ready'))
            : isScanning ? t('hint_scanning')
                : isSpeaking ? t('hint_speaking')
                    : '';

    return (
        <View style={s.bottom}>

            {/* Source badge */}
            {lastResult && lastSource !== 'gemini' && (
                <View style={[s.sourceBadge, {
                    backgroundColor: lastSource === 'tflite'
                        ? 'rgba(0,229,160,0.10)'
                        : 'rgba(255,176,32,0.10)',
                }]}>
                    <View style={[s.sourceDot, {
                        backgroundColor: lastSource === 'tflite' ? GREEN : AMBER,
                    }]} />
                    <Text style={[s.sourceTxt, {
                        color: lastSource === 'tflite' ? GREEN : AMBER,
                    }]}>
                        {lastSource === 'tflite' ? 'ON-DEVICE' : 'ML KIT'}
                    </Text>
                </View>
            )}

            {/* Result text */}
            {lastResult ? (
                <Animated.Text
                    style={[
                        s.resultText,
                        isRTL && s.rtlText,
                        { opacity: resultOpacity, transform: [{ translateY: resultSlide }] },
                    ]}
                    accessibilityLiveRegion="polite"
                    numberOfLines={5}
                >
                    {lastResult}
                </Animated.Text>
            ) : null}

            {/* Hint */}
            <View style={[s.hintRow, isRTL && s.rowReverse]}>
                <Text style={[s.hintText, isRTL && s.rtlText]}>{hintText}</Text>
            </View>

            {/* Gesture guide */}
            <View style={[s.gestureRow, isRTL && s.rowReverse]}>
                {[
                    { label: isRTL ? 'السابق ◀' : '◀ prev'       },
                    { label: isRTL ? 'التالي ▶' : 'next ▶'       },
                    { label: isRTL ? '↑ مراقبة' : '↑ watch'      },
                    { label: isRTL ? '··· إعدادات' : '··· settings' },
                ].map((g, i) => (
                    <Text key={i} style={s.gestureLabel}>{g.label}</Text>
                ))}
            </View>
        </View>
    );
}
