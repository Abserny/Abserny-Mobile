/**
 * screens/MainScreen/styles.js  — "Flat Minimal" revision
 *
 * Philosophy:
 *   - No shadows, no glows, no elevation tricks
 *   - Every element earns its place with space, not decoration
 *   - Type does the heavy lifting: weight + tracking
 *   - One accent color at a time, everything else is near-invisible
 */

import { StyleSheet } from 'react-native';
import {
    BG, SURFACE_HI, CYAN,
    ON_SURFACE, ON_SURFACE_MED, ON_SURFACE_LOW, ON_SURFACE_DIM,
} from '../../constants/colors';
import { BRACKET_SIZE, BRACKET_WIDTH } from '../../constants/layout';

export const s = StyleSheet.create({
    root:          { flex: 1, backgroundColor: BG },
    centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

    overlay: { ...StyleSheet.absoluteFillObject },

    // Vignettes — lighter, let the camera breathe
    vignetteBottom: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
        backgroundColor: 'rgba(10,12,14,0.72)',
    },
    vignetteTop: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 90,
        backgroundColor: 'rgba(10,12,14,0.40)',
    },

    // Corner brackets — hairline, no shadow, pure geometry
    // Top brackets pushed below TopBar + ModeBanner safe area (~130px)
    bracketTL: {
        position: 'absolute', top: 130, left: 24,
        width: BRACKET_SIZE, height: BRACKET_SIZE,
        borderTopWidth: BRACKET_WIDTH, borderLeftWidth: BRACKET_WIDTH,
        borderTopLeftRadius: 3,
    },
    bracketTR: {
        position: 'absolute', top: 130, right: 24,
        width: BRACKET_SIZE, height: BRACKET_SIZE,
        borderTopWidth: BRACKET_WIDTH, borderRightWidth: BRACKET_WIDTH,
        borderTopRightRadius: 3,
    },
    bracketBL: {
        position: 'absolute', bottom: 220, left: 24,
        width: BRACKET_SIZE, height: BRACKET_SIZE,
        borderBottomWidth: BRACKET_WIDTH, borderLeftWidth: BRACKET_WIDTH,
        borderBottomLeftRadius: 3,
    },
    bracketBR: {
        position: 'absolute', bottom: 220, right: 24,
        width: BRACKET_SIZE, height: BRACKET_SIZE,
        borderBottomWidth: BRACKET_WIDTH, borderRightWidth: BRACKET_WIDTH,
        borderBottomRightRadius: 3,
    },

    // Scan line — thin, just a light stroke
    scanLine: {
        position: 'absolute', top: 0, left: 32, right: 32, height: 1,
    },

    // ── Top bar ───────────────────────────────────────────────────────────────
    topBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 54, paddingHorizontal: 24, paddingBottom: 12,
    },
    rowReverse: { flexDirection: 'row-reverse' },
    logo:       { width: 90, height: 28, resizeMode: 'contain' },
    topRight:   { flexDirection: 'row', alignItems: 'center', gap: 10 },

    // Connection status — just a dot, no pill background
    connDotWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
    connDot:     { width: 5, height: 5, borderRadius: 2.5 },

    countPill: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6,
    },
    scanCount: { color: ON_SURFACE_LOW, fontSize: 10, fontWeight: '600', letterSpacing: 1.5 },

    // ── Mode banner ───────────────────────────────────────────────────────────
    // Pushed down to clear the TopBar (paddingTop:54 + logo:28 + paddingBottom:12 ≈ 94px)
    modeBanner: {
        position: 'absolute', top: 100, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 12, paddingHorizontal: 24,
    },

    // Chip: flat, just border + text, no background fill
    activeModeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 4, borderWidth: 0.5,
    },
    activeModeText: { fontSize: 9, fontWeight: '700', letterSpacing: 3.5 },

    // Dots: tiny, no spring morphing
    modeDots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    modeDot:  { width: 3, height: 3, borderRadius: 1.5 },

    // ── Center ────────────────────────────────────────────────────────────────
    center:    { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

    // Single dot — the entire idle/ready state
    readyDot: {
        width: 8, height: 8, borderRadius: 4,
    },

    // Scanning: thin ring only, no rotating arcs
    scanRing: {
        width: 56, height: 56, borderRadius: 28,
        borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    scanLabel: {
        marginTop: 18,
        fontSize: 8, fontWeight: '700', letterSpacing: 5,
    },

    // Speaking: just three static bars that fade-pulse
    waveRow:  { flexDirection: 'row', gap: 5, alignItems: 'center', height: 28 },

    // Error: plain X, no ring
    errorMark: { alignItems: 'center', justifyContent: 'center', width: 32, height: 32 },
    errorLine1:{ position: 'absolute', width: 18, height: 1.5, borderRadius: 1, transform: [{ rotate: '45deg'  }] },
    errorLine2:{ position: 'absolute', width: 18, height: 1.5, borderRadius: 1, transform: [{ rotate: '-45deg' }] },

    // State badge — watching / auto
    // Not absolute — lives in the indicatorColumn flow above the state icon
    stateBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 4, borderWidth: 0.5,
    },
    stateDot:       { width: 4, height: 4, borderRadius: 2 },
    stateBadgeText: { fontSize: 8, letterSpacing: 3.5, fontWeight: '700' },

    // Column that stacks badge (optional) above the state indicator
    indicatorColumn: {
        alignItems: 'center',
        gap: 16,
    },

    // Watch ring: very faint, no heavy border
    watchRing: {
        position: 'absolute', width: 100, height: 100, borderRadius: 50,
        borderWidth: 0.5,
    },

    // ── Bottom ────────────────────────────────────────────────────────────────
    bottom: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        alignItems: 'center', paddingBottom: 48, paddingHorizontal: 32, gap: 14,
    },

    // Source badge — offline/mlkit indicator
    sourceBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    sourceDot: { width: 3, height: 3, borderRadius: 1.5 },
    sourceTxt: { fontSize: 7, letterSpacing: 3, fontWeight: '700' },

    // Result text — slightly larger, comfortable reading
    resultText: {
        color: ON_SURFACE, fontSize: 18, lineHeight: 30,
        textAlign: 'center', fontWeight: '300', letterSpacing: 0.1,
    },
    rtlText:  { textAlign: 'right', writingDirection: 'rtl' },

    // Hint line
    hintRow:  { flexDirection: 'row', alignItems: 'center' },
    hintText: { color: ON_SURFACE_LOW, fontSize: 9, letterSpacing: 2, fontWeight: '500' },

    // ── Permission screen ─────────────────────────────────────────────────────
    permIconBox:    { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
    permCameraBody: { width: 48, height: 36, borderRadius: 7, borderWidth: 2, borderColor: CYAN, alignItems: 'center', justifyContent: 'center' },
    permCameraLens: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: CYAN },
    permCameraBump: { position: 'absolute', top: 8, width: 14, height: 7, borderRadius: 3.5, backgroundColor: CYAN },
    permTitle:      { color: ON_SURFACE, fontSize: 22, fontWeight: '600', marginBottom: 12, textAlign: 'center', letterSpacing: -0.3 },
    permBody:       { color: ON_SURFACE_MED, fontSize: 15, textAlign: 'center', lineHeight: 26, marginBottom: 40 },
    permBtn:        { paddingHorizontal: 36, paddingVertical: 15, borderRadius: 8, minWidth: 180, alignItems: 'center' },
    permBtnText:    { color: '#000', fontSize: 14, fontWeight: '700', letterSpacing: 1 },

    // ── Model loading pill ────────────────────────────────────────────────────
    // bottom: 200 keeps it clear of the BottomPanel result + hint row
    modelPill: {
        position: 'absolute',
        bottom: 200, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 5,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    modelDot: { width: 5, height: 5, borderRadius: 2.5 },
    modelTxt: { color: ON_SURFACE_LOW, fontSize: 10, letterSpacing: 1, fontWeight: '500' },
});
