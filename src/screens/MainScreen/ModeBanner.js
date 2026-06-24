/**
 * screens/MainScreen/ModeBanner.js
 *
 * Active mode chip + dot row. No icons, no spring morphing.
 * Mode switch: opacity cross-fade driven by modeAnim from parent.
 */

import React from 'react';
import { View, Text, Animated } from 'react-native';
import { MODES } from '../../constants/modes';
import { MODE_COLORS, GREEN, ON_SURFACE_LOW } from '../../constants/colors';
import { s } from './styles';

export function ModeBanner({ modeIndex, modeAnim, watching, modeStrings, isRTL }) {
    const activeColor = watching ? GREEN : MODE_COLORS[MODES[modeIndex].id];

    return (
        <Animated.View style={[
            s.modeBanner,
            { opacity: modeAnim.interpolate({ inputRange: [-8, 0], outputRange: [0.3, 1] }) },
            isRTL && s.rowReverse,
        ]}>
            {MODES.map((mode, i) => {
                if (i !== modeIndex) return null;
                const color = watching ? GREEN : MODE_COLORS[mode.id];
                return (
                    <View key={mode.id} style={[
                        s.activeModeChip,
                        { backgroundColor: 'transparent', borderColor: color + '35' },
                    ]}>
                        <Text style={[s.activeModeText, { color: color + 'CC' }]}>
                            {watching
                                ? (isRTL ? 'مراقبة' : 'WATCH')
                                : modeStrings[mode.id]?.label?.toUpperCase()}
                        </Text>
                    </View>
                );
            })}

            <View style={s.modeDots}>
                {MODES.map((mode, i) => {
                    const isActive = i === modeIndex;
                    const color    = watching ? GREEN : MODE_COLORS[mode.id];
                    return (
                        <View key={mode.id} style={[
                            s.modeDot,
                            {
                                backgroundColor: isActive ? color : ON_SURFACE_LOW,
                                // Fixed width on all dots — active/inactive via opacity only,
                                // so the flex row never reflows when switching modes.
                                width:   12,
                                opacity: isActive ? 0.8 : 0.25,
                            },
                        ]} />
                    );
                })}
            </View>
        </Animated.View>
    );
}
