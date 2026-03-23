/**
 * screens/LanguagePicker/styles.js
 */

import { StyleSheet } from 'react-native';
import { BG } from '../../constants/colors';

export const s = StyleSheet.create({
    root:       { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    content:    { alignItems: 'center', paddingHorizontal: 32, width: '100%', gap: 32 },
    logo:       { width: 110, height: 36, resizeMode: 'contain' },
    eyebrow:    { color: 'rgba(255,255,255,0.12)', fontSize: 9, letterSpacing: 5, fontWeight: '600' },
    langRow:    { flexDirection: 'row', gap: 10, width: '100%' },
    langCard:   {
        flex: 1, paddingTop: 0, paddingBottom: 22, paddingHorizontal: 16,
        borderRadius: 12, alignItems: 'center', gap: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
    },
    langAccent:  { width: '100%', height: 2, marginBottom: 16 },
    langLabel:   { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
    langSub:     { fontSize: 10, letterSpacing: 1 },
    confirmHint: { fontSize: 12, fontWeight: '500', letterSpacing: 1 },
});
