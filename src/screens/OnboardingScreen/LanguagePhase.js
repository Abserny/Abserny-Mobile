/**
 * screens/OnboardingScreen/LanguagePhase.js
 * Language card picker UI — pure display, animations driven by parent.
 */

import React from 'react';
import { View, Text, Animated } from 'react-native';
import { CYAN, GREEN } from '../../constants/colors';
import { s } from './styles';

const DIM    = 'rgba(255,255,255,0.28)';
const DIMMER = 'rgba(255,255,255,0.12)';

export function LanguagePhase({ selectedLang, enScale, arScale }) {
    return (
        <View style={s.langWrap}>
            <Text style={s.eyebrow}>SELECT LANGUAGE · اختر اللغة</Text>
            <View style={s.langRow}>
                {[
                    { code: 'en', label: 'English', sub: 'swipe right', color: CYAN,  anim: enScale },
                    { code: 'ar', label: 'العربية', sub: 'مرر يساراً', color: GREEN, anim: arScale },
                ].map(({ code, label, sub, color, anim }) => {
                    const active = selectedLang === code;
                    return (
                        <Animated.View key={code} style={[
                            s.langCard,
                            { transform: [{ scale: anim }] },
                            active && { borderColor: color },
                        ]}>
                            <View style={[s.langAccent, { backgroundColor: active ? color : 'transparent' }]} />
                            <Text style={[s.langLabel, { color: active ? color : DIM }]}>{label}</Text>
                            <Text style={[s.langSub,   { color: active ? color + '66' : DIMMER }]}>{sub}</Text>
                        </Animated.View>
                    );
                })}
            </View>
            <Text style={[s.confirmHint, { color: selectedLang === 'en' ? CYAN : GREEN }]}>
                {selectedLang === 'en' ? 'double tap to confirm' : 'انقر مرتين للتأكيد'}
            </Text>
        </View>
    );
}
