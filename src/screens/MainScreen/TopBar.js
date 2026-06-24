/**
 * screens/MainScreen/TopBar.js  — Flat Minimal
 *
 * Logo left, status right. No pills, no backgrounds.
 * A dot tells connectivity. A number tells scan count.
 */

import React from 'react';
import { View, Text, Image } from 'react-native';
import { GREEN, AMBER } from '../../constants/colors';
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
                <View style={s.connDotWrap}>
                    <View style={[s.connDot, {
                        backgroundColor: isConnected ? GREEN : AMBER,
                        opacity: isConnected ? 0.9 : 0.7,
                    }]} />
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
