/**
 * App.js — Abserny v3
 * Full rebuild: new UI, auto-scan mode, continuous navigation mode,
 * better animations, proper source handling, no "offline" speech prefix.
 */

import React, {
    useState, useRef, useEffect, useCallback,
} from 'react';
import {
    View, Text, StyleSheet, Animated, Image,
    StatusBar, AccessibilityInfo, Dimensions, TouchableOpacity,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { useVoice }     from './hooks/useVoice';
import { useGestures }  from './hooks/useGestures';
import { useDetection } from './hooks/useDetection';
import { useModes, MODES } from './hooks/useModes';

// ── Constants ─────────────────────────────────────────────────────────────────
const CYAN       = '#00BFFF';
const CYAN_DIM   = 'rgba(0,191,255,0.18)';
const CYAN_MED   = 'rgba(0,191,255,0.45)';
const GREEN      = '#00E5A0';
const AMBER      = '#FFB020';
const RED        = '#FF4455';
const SCREEN_W   = Dimensions.get('window').width;
const SCREEN_H   = Dimensions.get('window').height;

const STATE = {
    BOOT:     'boot',
    READY:    'ready',
    SCANNING: 'scanning',
    SPEAKING: 'speaking',
    ERROR:    'error',
};

const MODE_COLORS = {
    scene:  CYAN,
    object: '#A78BFA',
    read:   GREEN,
    people: AMBER,
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {

    const [permission, requestPermission] = useCameraPermissions();
    const [appState,      setAppState]      = useState(STATE.BOOT);
    const [lastResult,    setLastResult]    = useState('');
    const [lastSource,    setLastSource]    = useState('online');
    const [isConnected,   setIsConnected]   = useState(true);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [autoScan,      setAutoScan]      = useState(false);
    const [scanCount,     setScanCount]     = useState(0);

    const { speak, stop }  = useVoice();
    const { detect }       = useDetection();
    const { currentMode, modeIndex, nextMode, prevMode, cycleMode } = useModes();

    const cameraRef      = useRef(null);
    const isMounted      = useRef(true);
    const autoScanTimer  = useRef(null);
    const appStateRef    = useRef(STATE.BOOT);

    // Animations
    const scanLineAnim   = useRef(new Animated.Value(0)).current;
    const scanLoop       = useRef(null);
    const pulseAnim      = useRef(new Animated.Value(1)).current;
    const pulseLoop      = useRef(null);
    const resultOpacity  = useRef(new Animated.Value(0)).current;
    const resultSlide    = useRef(new Animated.Value(20)).current;
    const modeSlide      = useRef(new Animated.Value(0)).current;
    const overlayOpacity = useRef(new Animated.Value(0.18)).current;

    // Keep appStateRef in sync
    useEffect(() => { appStateRef.current = appState; }, [appState]);

    // ── Accessibility ─────────────────────────────────────────────────────────
    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    }, []);

    // ── Network check ─────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        const check = async () => {
            try {
                const res = await Promise.race([
                    fetch('https://www.google.com/generate_204'),
                    new Promise((_, r) => setTimeout(() => r(new Error()), 5000)),
                ]);
                if (!cancelled) setIsConnected(res.status === 204 || res.ok);
            } catch {
                if (!cancelled) setIsConnected(false);
            }
        };
        check();
        const iv = setInterval(check, 20000);
        return () => { cancelled = true; clearInterval(iv); };
    }, []);

    // ── Boot ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!permission) return;
        if (!permission.granted) {
            requestPermission().then(r => {
                if (!r.granted) speak('Camera permission required. Please allow in settings.', 'high');
            });
            return;
        }
        const t = setTimeout(() => {
            if (!isMounted.current) return;
            setAppState(STATE.READY);
            speak(`Abserny ready. ${currentMode.label}. ${currentMode.instruction}`, 'high');
            startPulse();
        }, 800);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permission?.granted]);

    useEffect(() => () => { isMounted.current = false; }, []);

    // ── Pulse animation (ready state ring) ───────────────────────────────────
    const startPulse = useCallback(() => {
        if (reducedMotion) return;
        pulseLoop.current?.stop();
        pulseLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0,  duration: 1200, useNativeDriver: true }),
            ])
        );
        pulseLoop.current.start();
    }, [reducedMotion, pulseAnim]);

    const stopPulse = useCallback(() => {
        pulseLoop.current?.stop();
        pulseAnim.setValue(1);
    }, [pulseAnim]);

    // ── Scan line animation ───────────────────────────────────────────────────
    const startScanAnim = useCallback(() => {
        if (reducedMotion) return;
        scanLineAnim.setValue(0);
        scanLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
                Animated.timing(scanLineAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
            ])
        );
        scanLoop.current.start();
        // Darken overlay during scan
        Animated.timing(overlayOpacity, { toValue: 0.35, duration: 300, useNativeDriver: false }).start();
    }, [reducedMotion, scanLineAnim, overlayOpacity]);

    const stopScanAnim = useCallback(() => {
        scanLoop.current?.stop();
        scanLineAnim.setValue(0);
        Animated.timing(overlayOpacity, { toValue: 0.18, duration: 400, useNativeDriver: false }).start();
    }, [scanLineAnim, overlayOpacity]);

    // ── Result fade-in animation ──────────────────────────────────────────────
    const animateResult = useCallback(() => {
        resultOpacity.setValue(0);
        resultSlide.setValue(16);
        Animated.parallel([
            Animated.timing(resultOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(resultSlide,   { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
    }, [resultOpacity, resultSlide]);

    // ── Mode change animation ─────────────────────────────────────────────────
    const animateModeChange = useCallback(() => {
        Animated.sequence([
            Animated.timing(modeSlide, { toValue: -8, duration: 100, useNativeDriver: true }),
            Animated.timing(modeSlide, { toValue: 0,  duration: 200, useNativeDriver: true }),
        ]).start();
    }, [modeSlide]);

    // ── Core scan ─────────────────────────────────────────────────────────────
    const runScan = useCallback(async () => {
        if (appStateRef.current !== STATE.READY) return;
        if (!cameraRef.current) return;

        setAppState(STATE.SCANNING);
        stopPulse();
        startScanAnim();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64:         true,
                quality:        0.35,
                skipProcessing: true,
                shutterSound:   false,
            });

            if (!photo?.base64) throw new Error('Camera capture failed');

            const { result, source } = await detect(photo.base64, currentMode.id, isConnected);

            if (!isMounted.current) return;

            setLastResult(result);
            setLastSource(source);
            setAppState(STATE.SPEAKING);
            setScanCount(c => c + 1);
            stopScanAnim();
            animateResult();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            speak(result, 'high');

            const readyDelay = Math.max(2500, (result.length / 14) * 1000);
            setTimeout(() => {
                if (!isMounted.current) return;
                setAppState(STATE.READY);
                startPulse();
            }, readyDelay);

        } catch (err) {
            if (!isMounted.current) return;
            stopScanAnim();
            setAppState(STATE.ERROR);
            speak("Couldn't scan. Try again.", 'high');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => {
                if (isMounted.current) { setAppState(STATE.READY); startPulse(); }
            }, 1800);
        }
    }, [currentMode, isConnected, detect, speak, startScanAnim, stopScanAnim, startPulse, stopPulse, animateResult]);

    // ── Auto-scan (continuous navigation mode) ────────────────────────────────
    const toggleAutoScan = useCallback(() => {
        setAutoScan(prev => {
            const next = !prev;
            if (next) {
                speak('Auto scan on. I will scan every 4 seconds. Double tap to stop.', 'high');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            } else {
                speak('Auto scan off.', 'high');
                Haptics.selectionAsync();
                clearInterval(autoScanTimer.current);
            }
            return next;
        });
    }, [speak]);

    useEffect(() => {
        if (autoScan) {
            autoScanTimer.current = setInterval(() => {
                if (appStateRef.current === STATE.READY) runScan();
            }, 4000);
        } else {
            clearInterval(autoScanTimer.current);
        }
        return () => clearInterval(autoScanTimer.current);
    }, [autoScan, runScan]);

    // ── Gesture handlers ──────────────────────────────────────────────────────
    const handleRepeat = useCallback(() => {
        if (!lastResult) { speak('Nothing to repeat.', 'high'); return; }
        speak(lastResult, 'high');
        Haptics.selectionAsync();
    }, [lastResult, speak]);

    const handleNextMode = useCallback(() => {
        const mode = nextMode();
        animateModeChange();
        speak(`${mode.label}. ${mode.instruction}`, 'high');
        Haptics.selectionAsync();
    }, [nextMode, speak, animateModeChange]);

    const handlePrevMode = useCallback(() => {
        const mode = prevMode();
        animateModeChange();
        speak(`${mode.label}. ${mode.instruction}`, 'high');
        Haptics.selectionAsync();
    }, [prevMode, speak, animateModeChange]);

    const handleCycleMode = useCallback(() => {
        const mode = cycleMode();
        animateModeChange();
        speak(`${mode.label}. ${mode.instruction}`, 'high');
        Haptics.selectionAsync();
    }, [cycleMode, speak, animateModeChange]);

    const gestureHandlers = useGestures({
        onScan:      autoScan ? toggleAutoScan : runScan,
        onRepeat:    handleRepeat,
        onCycleMode: handleCycleMode,
        onNextMode:  handleNextMode,
        onPrevMode:  handlePrevMode,
        enabled:     appState === STATE.READY || appState === STATE.SPEAKING,
    });

    // ── Derived values ────────────────────────────────────────────────────────
    const modeColor  = MODE_COLORS[currentMode.id] || CYAN;
    const isScanning = appState === STATE.SCANNING;
    const isSpeaking = appState === STATE.SPEAKING;
    const isReady    = appState === STATE.READY;
    const isError    = appState === STATE.ERROR;

    const scanLineY = scanLineAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: [SCREEN_H * 0.08, SCREEN_H * 0.90],
    });

    // ── Permission screens ────────────────────────────────────────────────────
    if (!permission) return <View style={styles.root} />;

    if (!permission.granted) {
        return (
            <View style={[styles.root, styles.centerContent]}>
                <Text style={styles.permIcon}>📷</Text>
                <Text style={styles.permTitle}>Camera Access Required</Text>
                <Text style={styles.permText}>
                    Abserny needs your camera to describe your surroundings.
                </Text>
                <TouchableOpacity
                    style={styles.permButton}
                    onPress={requestPermission}
                    accessibilityRole="button"
                >
                    <Text style={styles.permButtonText}>Allow Camera</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Main UI ───────────────────────────────────────────────────────────────
    return (
        <View style={styles.root} {...gestureHandlers}>
            <StatusBar hidden />

            {/* Camera */}
            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="back"
            />

            {/* Dynamic overlay */}
            <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />

            {/* Vignette edges */}
            <View style={styles.vignetteTop} />
            <View style={styles.vignetteBottom} />

            {/* Corner brackets — color matches mode */}
            <View style={[styles.bracketTL, { borderColor: modeColor }]} />
            <View style={[styles.bracketTR, { borderColor: modeColor }]} />
            <View style={[styles.bracketBL, { borderColor: modeColor }]} />
            <View style={[styles.bracketBR, { borderColor: modeColor }]} />

            {/* Scan line */}
            {isScanning && (
                <Animated.View style={[
                    styles.scanLine,
                    { backgroundColor: modeColor, shadowColor: modeColor },
                    { transform: [{ translateY: scanLineY }] },
                ]} />
            )}

            {/* ── TOP BAR ── */}
            <View style={styles.topBar}>
                <Image
                    source={require('./assets/logorm.png')}
                    style={styles.logo}
                    accessibilityLabel="Abserny"
                    accessibilityRole="header"
                />
                <View style={styles.topRight}>
                    {/* Connection indicator */}
                    <View style={[styles.connDot, { backgroundColor: isConnected ? GREEN : AMBER }]} />
                    {/* Scan counter */}
                    {scanCount > 0 && (
                        <Text style={styles.scanCounter}>{scanCount}</Text>
                    )}
                </View>
            </View>

            {/* ── MODE BAR ── */}
            <Animated.View style={[styles.modeBar, { transform: [{ translateY: modeSlide }] }]}>
                {MODES.map((mode, i) => (
                    <View
                        key={mode.id}
                        style={[
                            styles.modePill,
                            i === modeIndex && { backgroundColor: modeColor + '33', borderColor: modeColor },
                        ]}
                    >
                        <Text style={[
                            styles.modePillText,
                            i === modeIndex && { color: modeColor },
                        ]}>
                            {mode.icon}
                        </Text>
                    </View>
                ))}
            </Animated.View>

            {/* ── CENTER INDICATOR ── */}
            <View style={styles.centerArea} pointerEvents="none">
                {isReady && (
                    <Animated.View style={[
                        styles.readyRing,
                        { borderColor: modeColor + '55', transform: [{ scale: pulseAnim }] },
                    ]}>
                        <View style={[styles.readyDot, { backgroundColor: modeColor }]} />
                    </Animated.View>
                )}

                {isScanning && (
                    <View style={styles.scanningContainer}>
                        <ScanRing color={modeColor} />
                        <Text style={[styles.scanningLabel, { color: modeColor }]}>
                            SCANNING
                        </Text>
                    </View>
                )}

                {isSpeaking && (
                    <View style={styles.speakContainer}>
                        <WaveBar color={modeColor} delay={0}   />
                        <WaveBar color={modeColor} delay={120} />
                        <WaveBar color={modeColor} delay={240} />
                        <WaveBar color={modeColor} delay={120} />
                        <WaveBar color={modeColor} delay={0}   />
                    </View>
                )}

                {isError && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorX}>✕</Text>
                    </View>
                )}

                {autoScan && isReady && (
                    <View style={styles.autoScanBadge}>
                        <Text style={styles.autoScanText}>AUTO</Text>
                    </View>
                )}
            </View>

            {/* ── BOTTOM BAR ── */}
            <View style={styles.bottomBar}>
                {/* Source badge */}
                {lastResult && lastSource === 'offline' && (
                    <View style={styles.sourceBadge}>
                        <View style={[styles.sourceDot, { backgroundColor: AMBER }]} />
                        <Text style={[styles.sourceBadgeText, { color: AMBER }]}>ML KIT</Text>
                    </View>
                )}

                {/* Result text */}
                {lastResult ? (
                    <Animated.Text
                        style={[
                            styles.resultText,
                            {
                                opacity:   resultOpacity,
                                transform: [{ translateY: resultSlide }],
                            },
                        ]}
                        accessibilityLiveRegion="polite"
                        numberOfLines={5}
                    >
                        {lastResult}
                    </Animated.Text>
                ) : null}

                {/* Mode label + hint */}
                <View style={styles.hintRow}>
                    <Text style={[styles.modeNameText, { color: modeColor }]}>
                        {currentMode.label.toUpperCase()}
                    </Text>
                    <Text style={styles.hintDivider}>·</Text>
                    <Text style={styles.hintText}>
                        {isReady
                            ? autoScan ? 'DOUBLE TAP TO STOP' : 'DOUBLE TAP TO SCAN'
                            : isScanning ? 'ANALYZING...'
                                : isSpeaking ? 'LONG PRESS TO REPEAT'
                                    : ''
                        }
                    </Text>
                </View>

                {/* Gesture legend */}
                <View style={styles.gestureLegend}>
                    <GestureHint icon="◀" label="prev" />
                    <GestureHint icon="▶" label="next" />
                    <GestureHint icon="···" label="cycle" />
                </View>
            </View>
        </View>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScanRing({ color }) {
    const rot = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(rot, { toValue: 1, duration: 1200, useNativeDriver: true })
        );
        loop.start();
        return () => loop.stop();
    }, []);
    const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
        <Animated.View style={[styles.scanRing, { borderTopColor: color, transform: [{ rotate }] }]} />
    );
}

function WaveBar({ color, delay }) {
    const h = useRef(new Animated.Value(6)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(h, { toValue: 28, duration: 300, useNativeDriver: false }),
                Animated.timing(h, { toValue: 6,  duration: 300, useNativeDriver: false }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return <Animated.View style={[styles.waveBar, { backgroundColor: color, height: h }]} />;
}

function GestureHint({ icon, label }) {
    return (
        <View style={styles.gestureHint}>
            <Text style={styles.gestureIcon}>{icon}</Text>
            <Text style={styles.gestureLabel}>{label}</Text>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const BRACKET_SIZE = 24;
const BRACKET_W    = 2.5;

const styles = StyleSheet.create({
    root:         { flex: 1, backgroundColor: '#000' },
    centerContent:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

    overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },

    vignetteTop: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 180,
        backgroundColor: 'transparent',
        // gradient effect via border
        borderBottomWidth: 0,
        // We simulate vignette with a semi-transparent overlay at top
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
    },
    vignetteBottom: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },

    // Corner brackets
    bracketTL: { position:'absolute', top:18, left:18,   width:BRACKET_SIZE, height:BRACKET_SIZE, borderTopWidth:BRACKET_W,    borderLeftWidth:BRACKET_W  },
    bracketTR: { position:'absolute', top:18, right:18,  width:BRACKET_SIZE, height:BRACKET_SIZE, borderTopWidth:BRACKET_W,    borderRightWidth:BRACKET_W },
    bracketBL: { position:'absolute', bottom:18, left:18,  width:BRACKET_SIZE, height:BRACKET_SIZE, borderBottomWidth:BRACKET_W, borderLeftWidth:BRACKET_W  },
    bracketBR: { position:'absolute', bottom:18, right:18, width:BRACKET_SIZE, height:BRACKET_SIZE, borderBottomWidth:BRACKET_W, borderRightWidth:BRACKET_W },

    scanLine: {
        position: 'absolute', top: 0, left: 18, right: 18, height: 2,
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 8,
    },

    // Top bar
    topBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 52, paddingHorizontal: 22, paddingBottom: 12,
    },
    logo:    { width: 100, height: 32, resizeMode: 'contain' },
    topRight:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
    connDot: { width: 7, height: 7, borderRadius: 3.5 },
    scanCounter: {
        color: 'rgba(255,255,255,0.4)', fontSize: 11,
        fontWeight: '700', letterSpacing: 1,
    },

    // Mode bar
    modeBar: {
        position: 'absolute', top: 108, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    modePill: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    modePillText: { fontSize: 16 },

    // Center
    centerArea: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center',
    },
    readyRing: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center',
    },
    readyDot: { width: 8, height: 8, borderRadius: 4 },

    scanningContainer: { alignItems: 'center', gap: 18 },
    scanRing: {
        width: 64, height: 64, borderRadius: 32,
        borderWidth: 2.5, borderColor: 'transparent',
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent',
    },
    scanningLabel: { fontSize: 10, letterSpacing: 6, fontWeight: '700' },

    speakContainer: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 40 },
    waveBar:        { width: 4, borderRadius: 2 },

    errorContainer: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: 'rgba(255,68,85,0.15)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: RED,
    },
    errorX: { color: RED, fontSize: 22, fontWeight: '700' },

    autoScanBadge: {
        position: 'absolute', top: -60,
        paddingHorizontal: 12, paddingVertical: 4,
        backgroundColor: 'rgba(255,176,32,0.15)',
        borderRadius: 4, borderWidth: 1, borderColor: AMBER,
    },
    autoScanText: { color: AMBER, fontSize: 9, letterSpacing: 4, fontWeight: '700' },

    // Bottom bar
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        alignItems: 'center', paddingBottom: 40, paddingHorizontal: 24, gap: 10,
    },
    sourceBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 8, paddingVertical: 3,
        backgroundColor: 'rgba(255,176,32,0.08)',
        borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,176,32,0.3)',
    },
    sourceDot:       { width: 5, height: 5, borderRadius: 2.5 },
    sourceBadgeText: { fontSize: 8, letterSpacing: 3, fontWeight: '700' },

    resultText: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 17, textAlign: 'center', lineHeight: 26,
        fontWeight: '400',
    },

    hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    modeNameText: { fontSize: 9, letterSpacing: 4, fontWeight: '800' },
    hintDivider:  { color: 'rgba(255,255,255,0.2)', fontSize: 10 },
    hintText:     { color: 'rgba(255,255,255,0.2)', fontSize: 9, letterSpacing: 3 },

    gestureLegend: { flexDirection: 'row', gap: 20, marginTop: 2 },
    gestureHint:   { alignItems: 'center', gap: 2 },
    gestureIcon:   { color: 'rgba(255,255,255,0.25)', fontSize: 10 },
    gestureLabel:  { color: 'rgba(255,255,255,0.15)', fontSize: 8, letterSpacing: 2 },

    // Permission screen
    permIcon:       { fontSize: 48, marginBottom: 20 },
    permTitle:      { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    permText:       { color: 'rgba(255,255,255,0.6)', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
    permButton:     {
        backgroundColor: CYAN, paddingHorizontal: 32, paddingVertical: 14,
        borderRadius: 8, minWidth: 180, alignItems: 'center',
    },
    permButtonText: { color: '#000', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
});
