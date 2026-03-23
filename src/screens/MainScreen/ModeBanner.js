/**
 * screens/MainScreen/ModeBanner.js
 * Active mode chip + indicator dots row.
 * Pure display — props in, JSX out.
 */

import React from 'react';
import { View, Text, Animated } from 'react-native';
import { MODES } from '../../constants/modes';
import { MODE_COLORS, GREEN, ON_SURFACE_LOW } from '../../constants/colors';
import { MODE_ICONS } from '../../components/icons';
import { s } from './styles';

export function ModeBanner({ modeIndex, modeAnim, watching, modeStrings, isRTL }) {
    const activeColor = watching ? GREEN : MODE_COLORS[MODES[modeIndex].id];

    return (
        <Animated.View style={[s.modeBanner, { transform: [{ translateY: modeAnim }] }, isRTL && s.rowReverse]}>
            {MODES.map((mode, i) => {
                if (i !== modeIndex) return null;
                const ModeIcon = MODE_ICONS[mode.id];
                const color    = watching ? GREEN : MODE_COLORS[mode.id];
                return (
                    <View key={mode.id} style={[s.activeModeChip, {
                        backgroundColor: color + '18',
                        borderColor:     color + '40',
                    }]}>
                        {ModeIcon && <ModeIcon size={14} color={color} />}
                        <Text style={[s.activeModeText, { color }]}>
                            {watching
                                ? (isRTL ? 'مراقبة' : 'WATCH')
                                : modeStrings[mode.id]?.label?.toUpperCase()
                            }
                        </Text>
                    </View>
                );
            })}
            <View style={s.modeDots}>
                {MODES.map((mode, i) => (
                    <View key={mode.id} style={[
                        s.modeDot,
                        i === modeIndex && {
                            backgroundColor: watching ? GREEN : MODE_COLORS[mode.id],
                            width: 14,
                        },
                    ]} />
                ))}
            </View>
        </Animated.View>
    );
}
