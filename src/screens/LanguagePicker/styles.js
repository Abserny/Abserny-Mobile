/**
 * screens/LanguagePicker/styles.js
 * Enhanced — matches the upgraded OnboardingScreen card style.
 */

import { StyleSheet } from 'react-native';
import { BG } from '../../constants/colors';

export const s = StyleSheet.create({
    root:    { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    content: { alignItems: 'center', paddingHorizontal: 32, width: '100%', gap: 32 },
    logo:    { width: 110, height: 36, resizeMode: 'contain' },
    eyebrow: { color: 'rgba(255,255,255,0.10)', fontSize: 9, letterSpacing: 5, fontWeight: '600' },
    langRow: { flexDirection: 'row', gap: 12, width: '100%' },
    langCard: {
        flex: 1, paddingTop: 0, paddingBottom: 24, paddingHorizontal: 18,
        borderRadius: 16, alignItems: 'center', gap: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
    },
    langAccent:  { width: '100%', height: 2.5, marginBottom: 16 },
    langLabel:   { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
    langSub:     { fontSize: 10, letterSpacing: 1.5 },
    confirmHint: { fontSize: 12, fontWeight: '500', letterSpacing: 1.5 },
});
