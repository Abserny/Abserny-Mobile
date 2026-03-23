/**
 * screens/MainScreen/TopBar.js
 * Logo + connectivity pill + scan counter.
 * Pure display — props in, JSX out.
 */

import React from 'react';
import { View, Text, Image } from 'react-native';
import { GREEN, AMBER, SURFACE_HI, ON_SURFACE_MED } from '../../constants/colors';
import { s } from './styles';

export function TopBar({ isConnected, scanCount, isRTL }) {
    return (
        <View style={[s.topBar, isRTL && s.rowReverse]}>
            <Image
                source={require('../../../assets/images/logorm.png')}
                style={s.logo}
                accessibilityLabel="Abserny"
            />
            <View style={[s.topRight, isRTL && s.rowReverse]}>
                <View style={[s.connPill, {
                    backgroundColor: isConnected
                        ? 'rgba(0,229,160,0.12)'
                        : 'rgba(255,176,32,0.12)',
                }]}>
                    <View style={[s.connDot, { backgroundColor: isConnected ? GREEN : AMBER }]} />
                </View>
                {scanCount > 0 && (
                    <View style={s.countPill}>
                        <Text style={s.scanCount}>{scanCount}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}
