/**
 * screens/OnboardingScreen/styles.js
 */

import { StyleSheet } from 'react-native';
import { BG } from '../../constants/colors';

export const s = StyleSheet.create({
    root:    { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    content: { alignItems: 'center', paddingHorizontal: 32, width: '100%' },
    logo:    { width: 110, height: 36, resizeMode: 'contain', marginBottom: 52 },

    // Language picker
    langWrap:    { alignItems: 'center', width: '100%', gap: 32 },
    eyebrow:     { color: 'rgba(255,255,255,0.12)', fontSize: 9, letterSpacing: 5, fontWeight: '600' },
    langRow:     { flexDirection: 'row', gap: 10, width: '100%' },
    langCard:    { flex: 1, paddingTop: 0, paddingBottom: 22, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
    langAccent:  { width: '100%', height: 2, marginBottom: 16 },
    langLabel:   { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
    langSub:     { fontSize: 10, letterSpacing: 1 },
    confirmHint: { fontSize: 12, fontWeight: '500', letterSpacing: 1 },

    // Tutorial
    tutWrap:       { alignItems: 'center', width: '100%', gap: 0 },
    progressRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', marginBottom: 40 },
    stepCounter:   { fontSize: 12, fontWeight: '700', letterSpacing: 1, minWidth: 28 },
    progressTrack: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
    progressFill:  { height: '100%', borderRadius: 1 },
    iconWrap:      { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 36, direction: 'ltr' },
    textWrap:      { width: '100%', marginBottom: 28, paddingHorizontal: 4 },
    stepText:      { color: 'rgba(255,255,255,0.85)', fontSize: 18, lineHeight: 28, textAlign: 'center', fontWeight: '400' },
    rtl:           { writingDirection: 'rtl' },
    statusRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, height: 24 },
    statusDot:     { width: 5, height: 5, borderRadius: 2.5 },
    statusText:    { fontSize: 11, letterSpacing: 2, fontWeight: '600' },
    repeatHint:    { color: 'rgba(255,255,255,0.14)', fontSize: 11, letterSpacing: 1 },
});
