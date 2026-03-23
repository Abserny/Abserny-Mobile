/**
 * screens/MainScreen/styles.js
 * All styles for the main camera screen.
 * Edit layout and visual tokens here — zero logic in this file.
 */

import { StyleSheet } from 'react-native';
import {
    BG, SURFACE_HI, CYAN,
    ON_SURFACE, ON_SURFACE_MED, ON_SURFACE_LOW,
} from '../../constants/colors';
import { BRACKET_SIZE, BRACKET_WIDTH } from '../../constants/layout';

export const s = StyleSheet.create({
    root:          { flex: 1, backgroundColor: BG },
    centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

    overlay: { ...StyleSheet.absoluteFillObject },

    vignetteBottom: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 280,
        backgroundColor: 'rgba(15,17,18,0.92)',
    },

    // Corner brackets
    bracketTL: { position: 'absolute', top: 20,    left: 20,    width: BRACKET_SIZE, height: BRACKET_SIZE, borderTopWidth: BRACKET_WIDTH,    borderLeftWidth: BRACKET_WIDTH,   borderTopLeftRadius: 4     },
    bracketTR: { position: 'absolute', top: 20,    right: 20,   width: BRACKET_SIZE, height: BRACKET_SIZE, borderTopWidth: BRACKET_WIDTH,    borderRightWidth: BRACKET_WIDTH,  borderTopRightRadius: 4    },
    bracketBL: { position: 'absolute', bottom: 20, left: 20,    width: BRACKET_SIZE, height: BRACKET_SIZE, borderBottomWidth: BRACKET_WIDTH, borderLeftWidth: BRACKET_WIDTH,   borderBottomLeftRadius: 4  },
    bracketBR: { position: 'absolute', bottom: 20, right: 20,   width: BRACKET_SIZE, height: BRACKET_SIZE, borderBottomWidth: BRACKET_WIDTH, borderRightWidth: BRACKET_WIDTH,  borderBottomRightRadius: 4 },

    scanLine: {
        position: 'absolute', top: 0, left: 24, right: 24, height: 1.5,
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9,
        shadowRadius: 6, elevation: 6,
    },

    // ── Top bar
    topBar:     { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingHorizontal: 22, paddingBottom: 12 },
    rowReverse: { flexDirection: 'row-reverse' },
    logo:       { width: 96, height: 30, resizeMode: 'contain' },
    topRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
    connPill:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    connDot:    { width: 6, height: 6, borderRadius: 3 },
    countPill:  { backgroundColor: SURFACE_HI, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    scanCount:  { color: ON_SURFACE_MED, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

    // ── Mode banner
    modeBanner:      { position: 'absolute', top: 110, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
    activeModeChip:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    activeModeText:  { fontSize: 10, fontWeight: '800', letterSpacing: 3 },
    modeDots:        { flexDirection: 'row', gap: 5, alignItems: 'center' },
    modeDot:         { width: 4, height: 4, borderRadius: 2, backgroundColor: ON_SURFACE_LOW },

    // ── Center
    center:     { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    watchRing:  { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1 },
    readyOuter: { alignItems: 'center', justifyContent: 'center' },
    readyRing:  { width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    readyDot:   { width: 7, height: 7, borderRadius: 3.5 },
    scanningBox:{ alignItems: 'center', gap: 14 },
    scanLabel:  { fontSize: 9, fontWeight: '800' },
    waveRow:    { flexDirection: 'row', gap: 5, alignItems: 'center', height: 36 },
    errorRing:  { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,68,85,0.08)' },
    errorLine1: { position: 'absolute', width: 20, height: 2, borderRadius: 1, transform: [{ rotate: '45deg' }]  },
    errorLine2: { position: 'absolute', width: 20, height: 2, borderRadius: 1, transform: [{ rotate: '-45deg' }] },
    stateBadge: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
    stateDot:   { width: 5, height: 5, borderRadius: 2.5 },
    stateBadgeText: { fontSize: 9, letterSpacing: 3, fontWeight: '800' },

    // ── Bottom
    bottom:      { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 40, paddingHorizontal: 28, gap: 10 },
    sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    sourceDot:   { width: 4, height: 4, borderRadius: 2 },
    sourceTxt:   { fontSize: 8, letterSpacing: 3, fontWeight: '700' },
    resultText:  { color: ON_SURFACE, fontSize: 17, lineHeight: 28, textAlign: 'center', letterSpacing: 0.2 },
    rtlText:     { textAlign: 'right' },
    hintRow:     { flexDirection: 'row', alignItems: 'center' },
    hintText:    { color: ON_SURFACE_LOW, fontSize: 9, letterSpacing: 2, fontWeight: '600' },
    gestureRow:  { flexDirection: 'row', gap: 16, marginTop: 4 },
    gestureLabel:{ color: ON_SURFACE_LOW, fontSize: 8, letterSpacing: 1.5 },

    // ── Permission screen
    permIconBox:    { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    permCameraBody: { width: 54, height: 40, borderRadius: 8, borderWidth: 2.5, borderColor: CYAN, alignItems: 'center', justifyContent: 'center' },
    permCameraLens: { width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: CYAN },
    permCameraBump: { position: 'absolute', top: 10, width: 16, height: 8, borderRadius: 4, backgroundColor: CYAN },
    permTitle:      { color: ON_SURFACE, fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center', letterSpacing: -0.3 },
    permBody:       { color: ON_SURFACE_MED, fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 36 },
    permBtn:        { paddingHorizontal: 36, paddingVertical: 16, borderRadius: 14, minWidth: 180, alignItems: 'center' },
    permBtnText:    { color: '#000', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
