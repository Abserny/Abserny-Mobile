/**
 * screens/OnboardingScreen/styles.js
 * Enhanced — larger icon area, refined card-style lang cards, smoother text sizing.
 */

import { StyleSheet } from 'react-native';
import { BG } from '../../constants/colors';

export const s = StyleSheet.create({
    root:    { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    content: { alignItems: 'center', paddingHorizontal: 32, width: '100%' },
    logo:    { width: 110, height: 36, resizeMode: 'contain', marginBottom: 52 },

    // ── Language picker ────────────────────────────────────────────────────────
    langWrap:    { alignItems: 'center', width: '100%', gap: 32 },
    eyebrow:     { color: 'rgba(255,255,255,0.10)', fontSize: 9, letterSpacing: 5, fontWeight: '600' },
    langRow:     { flexDirection: 'row', gap: 12, width: '100%' },
    langCard: {
        flex: 1, paddingTop: 0, paddingBottom: 24, paddingHorizontal: 18,
        borderRadius: 16, alignItems: 'center', gap: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
        // Subtle depth
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
    },
    langAccent:  { width: '100%', height: 2.5, marginBottom: 16 },
    langLabel:   { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
    langSub:     { fontSize: 10, letterSpacing: 1.5 },
    confirmHint: { fontSize: 12, fontWeight: '500', letterSpacing: 1.5 },

    // ── Tutorial ───────────────────────────────────────────────────────────────
    tutWrap:       { alignItems: 'center', width: '100%', gap: 0 },
    progressRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', marginBottom: 44 },
    stepCounter:   { fontSize: 12, fontWeight: '700', letterSpacing: 1, minWidth: 28 },
    progressTrack: { flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 1 },
    progressFill:  { height: '100%', borderRadius: 1 },

    // Icon area — slightly larger for more presence
    iconWrap:  { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 40, direction: 'ltr' },

    textWrap:  { width: '100%', marginBottom: 28, paddingHorizontal: 4 },
    stepText:  { color: 'rgba(255,255,255,0.88)', fontSize: 19, lineHeight: 30, textAlign: 'center', fontWeight: '400', letterSpacing: 0.1 },
    rtl:       { writingDirection: 'rtl' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 24 },
    statusDot: { width: 5, height: 5, borderRadius: 2.5 },
    statusText:{ fontSize: 11, letterSpacing: 2, fontWeight: '600' },
    repeatHint:{ color: 'rgba(255,255,255,0.12)', fontSize: 11, letterSpacing: 1 },
});
