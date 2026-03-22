/**
 * Abserny — Main App
 *
 * CHANGES in this version:
 *   1. Language change no longer calls I18nManager.forceRTL() or reloadApp().
 *      RTL is handled per-component (already was). The restart was a side-effect
 *      of the I18nManager call — removing it makes language switching instant.
 *   2. Animation overhaul — fewer concurrent loops, all use useNativeDriver: true.
 *      - overlayOpacity removed entirely (was useNativeDriver: false — JS thread).
 *        Replaced with a static semi-transparent overlay tinted per mode.
 *      - pulseAnim replaced with a single subtle opacity breath (not scale),
 *        reducing composite layer thrashing on the ready ring.
 *      - WaveBar unchanged (already native-driver scaleY).
 *      - watchRing simplified to a single opacity pulse — one loop, not two values.
 *      - ScanRing unchanged (rotation is native-driver).
 *   3. UI redesign aligned with DESIGN.md "Luminous Clarity" system:
 *      - Tonal depth via layered surfaces instead of thin lines/dots.
 *      - Mode pills replaced with a single wide active-mode banner (editorial).
 *      - Result text uses generous line-height and tracking (Lexend-style spacing).
 *      - Source badge and scan counter elevated with tonal backgrounds.
 *      - Bottom gesture hints consolidated into one clean row.
 *      - Corner brackets thickened and softened (rounded caps).
 *      - Status indicators use filled color blocks rather than outlines.
 */

import React, {
    useState, useRef, useEffect, useCallback,
} from 'react';
import {
    View, Text, StyleSheet, Animated, Image,
    StatusBar, AccessibilityInfo, Dimensions,
    TouchableOpacity,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics  from 'expo-haptics';
import * as Speech   from 'expo-speech';
import * as Updates  from 'expo-updates';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useVoice }                              from './hooks/useVoice';
import { useGestures }                           from './hooks/useGestures';
import { useDetection }                          from './hooks/useDetection';
import { useModes, MODES }                       from './hooks/useModes';
import { useLanguage, MODES_STRINGS }            from './hooks/useLanguage';
import { useNetwork }                            from './hooks/useNetwork';
import { useWatchMode }                          from './hooks/useWatchMode';
import OnboardingScreen                          from './OnboardingScreen';
import LanguagePicker                            from './LanguagePicker';
import SettingsOverlay                           from './SettingsOverlay';
import { MODE_ICONS }                            from './AbsernyIcons';

// ── Design tokens (aligned with DESIGN.md "Luminous Clarity") ─────────────────
// Primary action color family
const CYAN    = '#00BFFF';   // primary container / action
const TEAL    = '#006479';   // primary (deep)
// Mode accent colors
const GREEN   = '#00E5A0';
const AMBER   = '#FFB020';
const PURPLE  = '#A78BFA';
const RED     = '#FF4455';
// Surface hierarchy (dark variant of the tinted paper-white system)
const BG          = '#0F1112';   // base surface — slightly deeper than before
const SURFACE     = '#161A1C';   // component level
const SURFACE_HI  = '#1E2326';   // top level / cards
// Text
const ON_SURFACE      = 'rgba(255,255,255,0.90)';
const ON_SURFACE_MED  = 'rgba(255,255,255,0.45)';
const ON_SURFACE_LOW  = 'rgba(255,255,255,0.15)';

const SCREEN_H = Dimensions.get('window').height;
const SCREEN_W = Dimensions.get('window').width;

const STATE = {
    BOOT:     'boot',
    READY:    'ready',
    SCANNING: 'scanning',
    SPEAKING: 'speaking',
    ERROR:    'error',
};

const MODE_COLORS = {
    scene:  CYAN,
    object: PURPLE,
    read:   GREEN,
    people: AMBER,
};

// ── Reload helper ─────────────────────────────────────────────────────────────
async function reloadApp() {
    try {
        await Updates.reloadAsync();
    } catch {
        try {
            const { DevSettings } = require('react-native');
            DevSettings.reload();
        } catch {
            console.warn('[Abserny] Could not reload app.');
        }
    }
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
    const {
        lang, loaded, onboarded,
        chooseLang, completeOnboarding, resetOnboarding, resetLanguage, t,
    } = useLanguage();

    if (!loaded) return <View style={{ flex: 1, backgroundColor: BG }} />;

    if (!lang || !onboarded) {
        return (
            <OnboardingScreen
                initialPhase={lang && !onboarded ? 'tutorial' : 'language'}
                initialLang={lang || 'en'}
                onComplete={async (chosenLang) => {
                    await chooseLang(chosenLang);
                    await completeOnboarding();
                    // No I18nManager or reload — RTL is per-component.
                }}
            />
        );
    }

    return (
        <MainApp
            lang={lang} t={t}
            onChooseLang={chooseLang}
            onResetLanguage={resetLanguage}
            onResetOnboarding={resetOnboarding}
        />
    );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function MainApp({ lang, t, onChooseLang, onResetLanguage, onResetOnboarding }) {

    const [permission, requestPermission] = useCameraPermissions();
    const [appState,       setAppState]       = useState(STATE.BOOT);
    const [lastResult,     setLastResult]     = useState('');
    const [lastSource,     setLastSource]     = useState('online');
    const [reducedMo,      setReducedMo]      = useState(false);
    const [autoScan,       setAutoScan]       = useState(false);
    const [scanCount,      setScanCount]      = useState(0);
    const [showSettings,   setShowSettings]   = useState(false);
    const [showLangPicker, setShowLangPicker] = useState(false);

    const { speak, stop }  = useVoice(lang);

    const speakQuotaRef = useRef(null);
    const { detect } = useDetection({
        onQuotaExhausted: () => {
            speakQuotaRef.current?.(
                lang === 'ar'
                    ? 'انتهت حصة الذكاء الاصطناعي اليوم. يجري الانتقال للوضع الأساسي.'
                    : 'AI quota reached for today. Switching to basic mode.',
                'high',
            );
        },
    });

    const speakRef = useRef(speak);
    useEffect(() => { speakRef.current = speak; }, [speak]);
    useEffect(() => { speakQuotaRef.current = speak; }, [speak]);
    const tRef = useRef(t);
    useEffect(() => { tRef.current = t; }, [t]);

    const { isConnected } = useNetwork({
        onConnectivityChange: (connected) => {
            speakRef.current(
                connected
                    ? (lang === 'ar' ? 'عاد الاتصال بالإنترنت.' : 'Back online.')
                    : (lang === 'ar' ? 'لا يوجد اتصال. وضع بدون إنترنت.' : 'Offline. Using basic mode.'),
                'high',
            );
        },
    });
    const { currentMode, modeIndex, nextMode, prevMode, cycleMode } = useModes();

    const cameraRef  = useRef(null);
    const isMounted  = useRef(true);
    const autoTimer  = useRef(null);
    const stateRef   = useRef(STATE.BOOT);
    const bootSpoken = useRef(false);

    // ── Watch mode ────────────────────────────────────────────────────────────
    const { watching, frameCount, toggleWatch, stopWatch } = useWatchMode({
        cameraRef, detect, speak, lang, isConnected,
    });
    const watchingRef = useRef(watching);
    useEffect(() => { watchingRef.current = watching; }, [watching]);

    // ── Animations ────────────────────────────────────────────────────────────
    const scanLineAnim  = useRef(new Animated.Value(0)).current;
    const scanLoop      = useRef(null);
    // Pulse: opacity breath instead of scale — cheaper, no composite layer change
    const pulseOpacity  = useRef(new Animated.Value(0.5)).current;
    const pulseLoop     = useRef(null);
    const resultOpacity = useRef(new Animated.Value(0)).current;
    const resultSlide   = useRef(new Animated.Value(20)).current;
    const modeAnim      = useRef(new Animated.Value(0)).current;
    // Watch ring: single opacity pulse, one value
    const watchOpacity  = useRef(new Animated.Value(0.3)).current;
    const watchLoop     = useRef(null);

    useEffect(() => { stateRef.current = appState; }, [appState]);
    useEffect(() => () => { isMounted.current = false; }, []);

    // Accessibility
    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReducedMo);
    }, []);

    const startPulseRef = useRef(null);
    useEffect(() => { startPulseRef.current = startPulse; }, [startPulse]);

    // Boot speech — fires once camera permission is confirmed
    useEffect(() => {
        if (bootSpoken.current) return;
        if (!permission?.granted) return;
        bootSpoken.current = true;
        const ms = MODES_STRINGS[lang]?.[currentMode.id] ?? MODES_STRINGS.en[currentMode.id];
        setAppState(STATE.READY);
        startPulseRef.current?.();
        setTimeout(() => {
            speakRef.current(tRef.current('ready', ms.label, ms.hint), 'high');
        }, 200);
    }, [permission?.granted]); // eslint-disable-line

    // Camera permission request
    useEffect(() => {
        if (!permission) return;
        if (!permission.granted) {
            requestPermission().then(r => {
                if (!r.granted) speak(t('no_permission'), 'high');
            });
        }
    }, [permission]); // eslint-disable-line

    // ── Watch ring ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (watching && !reducedMo) {
            watchLoop.current?.stop();
            watchLoop.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(watchOpacity, { toValue: 0.8, duration: 1800, useNativeDriver: true }),
                    Animated.timing(watchOpacity, { toValue: 0.2, duration: 1800, useNativeDriver: true }),
                ]),
            );
            watchLoop.current.start();
        } else {
            watchLoop.current?.stop();
            watchOpacity.setValue(0.3);
        }
        return () => watchLoop.current?.stop();
    }, [watching, reducedMo]); // eslint-disable-line

    // ── Pulse (ready state) — opacity only, native driver ─────────────────────
    const startPulse = useCallback(() => {
        if (reducedMo) return;
        pulseLoop.current?.stop();
        pulseLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseOpacity, { toValue: 1.0, duration: 1400, useNativeDriver: true }),
                Animated.timing(pulseOpacity, { toValue: 0.35, duration: 1400, useNativeDriver: true }),
            ]),
        );
        pulseLoop.current.start();
    }, [reducedMo, pulseOpacity]);

    const stopPulse = useCallback(() => {
        pulseLoop.current?.stop();
        pulseOpacity.setValue(0.5);
    }, [pulseOpacity]);

    // ── Scan animation ────────────────────────────────────────────────────────
    const startScanAnim = useCallback(() => {
        if (reducedMo) return;
        scanLineAnim.setValue(0);
        scanLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                Animated.timing(scanLineAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
            ]),
        );
        scanLoop.current.start();
    }, [reducedMo, scanLineAnim]);

    const stopScanAnim = useCallback(() => {
        scanLoop.current?.stop();
        scanLineAnim.setValue(0);
    }, [scanLineAnim]);

    const animateResult = useCallback(() => {
        resultOpacity.setValue(0);
        resultSlide.setValue(14);
        Animated.parallel([
            Animated.timing(resultOpacity, { toValue: 1, duration: 340, useNativeDriver: true }),
            Animated.timing(resultSlide,   { toValue: 0, duration: 340, useNativeDriver: true }),
        ]).start();
    }, [resultOpacity, resultSlide]);

    const animateMode = useCallback(() => {
        Animated.sequence([
            Animated.timing(modeAnim, { toValue: -5, duration: 80,  useNativeDriver: true }),
            Animated.timing(modeAnim, { toValue: 0,  duration: 160, useNativeDriver: true }),
        ]).start();
    }, [modeAnim]);

    // ── Core scan ─────────────────────────────────────────────────────────────
    const runScan = useCallback(async () => {
        if (stateRef.current !== STATE.READY) return;
        if (!cameraRef.current) return;
        if (watchingRef.current) return;

        setAppState(STATE.SCANNING);
        stopPulse();
        startScanAnim();
        speak(t('scanning'), 'high');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true, quality: 0.15,
                skipProcessing: true,   // faster — matches watch mode
                shutterSound: false,
            });
            if (!photo?.base64) throw new Error('capture failed');

            const { result, source } = await detect(photo.base64, currentMode.id, isConnected, lang);
            if (!isMounted.current) return;

            setLastResult(result);
            setLastSource(source);
            setAppState(STATE.SPEAKING);
            setScanCount(c => c + 1);
            stopScanAnim();
            animateResult();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            speak(result, 'high');

            const delay = Math.max(2500, (result.length / 14) * 1000);
            setTimeout(() => {
                if (!isMounted.current) return;
                setAppState(STATE.READY);
                startPulse();
            }, delay);

        } catch (err) {
            if (!isMounted.current) return;
            stopScanAnim();
            setAppState(STATE.ERROR);
            speak(t('cant_scan'), 'high');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => {
                if (isMounted.current) { setAppState(STATE.READY); startPulse(); }
            }, 1800);
        }
    }, [currentMode, isConnected, lang, detect, speak, t,
            startScanAnim, stopScanAnim, startPulse, stopPulse, animateResult]);

    // ── Auto-scan ─────────────────────────────────────────────────────────────
    const toggleAutoScan = useCallback(() => {
        setAutoScan(prev => {
            const next = !prev;
            speak(next ? t('auto_on') : t('auto_off'), 'high');
            Haptics.impactAsync(next ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
            return next;
        });
    }, [speak, t]);

    useEffect(() => {
        if (autoScan) {
            autoTimer.current = setInterval(() => {
                if (stateRef.current === STATE.READY && !watchingRef.current) runScan();
            }, 4000);
        } else {
            clearInterval(autoTimer.current);
        }
        return () => clearInterval(autoTimer.current);
    }, [autoScan, runScan]);

    // ── Watch toggle ──────────────────────────────────────────────────────────
    const handleWatchToggle = useCallback(() => {
        if (autoScan) setAutoScan(false);
        toggleWatch();
    }, [toggleWatch, autoScan]);

    // ── Settings ──────────────────────────────────────────────────────────────
    const openSettings  = useCallback(() => setShowSettings(true), []);
    const closeSettings = useCallback(() => {
        setShowSettings(false);
        speak(t('settings_closed'), 'high');
    }, [speak, t]);

    const handleRepeatTour = useCallback(() => {
        setShowSettings(false);
        if (watchingRef.current) stopWatch();
        setAutoScan(false);
        clearInterval(autoTimer.current);
        stop();
        setTimeout(() => {
            speak(t('tour_restarting'), 'high');
            setTimeout(() => onResetOnboarding(), 800);
        }, 100);
    }, [speak, stop, t, onResetOnboarding, stopWatch]);

    // ── Language change — now instant, no reload ──────────────────────────────
    const handleChangeLang = useCallback(() => {
        setShowSettings(false);
        setTimeout(() => setShowLangPicker(true), 400);
    }, []);

    const handleLangPickerComplete = useCallback(async (chosenLang) => {
        setShowLangPicker(false);
        stop();
        // Speak confirmation in the chosen language directly — no reload needed
        setTimeout(() => {
            Speech.speak(
                chosenLang === 'ar' ? 'تم تغيير اللغة.' : 'Language changed.',
                { language: chosenLang === 'ar' ? 'ar-SA' : 'en-US', rate: 0.88 },
            );
        }, 50);
        // chooseLang persists + updates lang state → components re-render with new lang
        await onChooseLang(chosenLang);
        // No I18nManager.forceRTL(), no reloadApp() — layout updates reactively
    }, [onChooseLang, stop]);

    // ── Gesture handlers ──────────────────────────────────────────────────────
    const handleRepeat = useCallback(() => {
        if (!lastResult) { speak(t('repeat_empty'), 'high'); return; }
        speak(lastResult, 'high');
        Haptics.selectionAsync();
    }, [lastResult, speak, t]);

    const modeAnnounce = useCallback((mode) => {
        const ms = (MODES_STRINGS[lang] ?? MODES_STRINGS.en)[mode.id];
        speak(`${ms.label}. ${ms.hint}`, 'high');
        animateMode();
        Haptics.selectionAsync();
    }, [lang, speak, animateMode]);

    const handleNextMode  = useCallback(() => modeAnnounce(nextMode()),  [nextMode,  modeAnnounce]);
    const handlePrevMode  = useCallback(() => modeAnnounce(prevMode()),  [prevMode,  modeAnnounce]);
    const handleCycleMode = useCallback(() => {
        if (stateRef.current === STATE.READY && !autoScan) openSettings();
        else modeAnnounce(cycleMode());
    }, [cycleMode, modeAnnounce, openSettings, autoScan]);

    const handleDoubleTap = useCallback(() => {
        if (watching) { stopWatch(); return; }
        if (autoScan) { toggleAutoScan(); return; }
        if (stateRef.current === STATE.SPEAKING && lastResult) {
            speak(lastResult, 'high');
            return;
        }
        runScan();
    }, [watching, stopWatch, autoScan, toggleAutoScan, lastResult, speak, runScan]);

    const gestureHandlers = useGestures({
        onScan:        handleDoubleTap,
        onRepeat:      handleRepeat,
        onCycleMode:   handleCycleMode,
        onNextMode:    handleNextMode,
        onPrevMode:    handlePrevMode,
        onWatchToggle: handleWatchToggle,
        enabled: (appState === STATE.READY || appState === STATE.SPEAKING || watching)
            && !showSettings && !showLangPicker,
    });

    const handleCameraReady = useCallback(() => {
        console.log('[Abserny] Camera ready.');
    }, []);

    const handleCameraError = useCallback((err) => {
        console.error('[Abserny] Camera mount error:', err);
        setAppState(STATE.ERROR);
        speak(
            lang === 'ar'
                ? 'تعذّر تشغيل الكاميرا. أعد تشغيل التطبيق.'
                : 'Camera failed to start. Please restart the app.',
            'high',
        );
    }, [lang, speak]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const modeColor   = MODE_COLORS[currentMode.id] || CYAN;
    const activeColor = watching ? GREEN : modeColor;
    const isRTL       = lang === 'ar';
    const isScanning  = appState === STATE.SCANNING;
    const isSpeaking  = appState === STATE.SPEAKING;
    const isReady     = appState === STATE.READY;
    const isError     = appState === STATE.ERROR;
    const modeStrings = MODES_STRINGS[lang] || MODES_STRINGS.en;

    const scanLineY = scanLineAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: [SCREEN_H * 0.1, SCREEN_H * 0.88],
    });

    // ── Permission screen ─────────────────────────────────────────────────────
    if (!permission) return <View style={s.root} />;

    if (!permission.granted) {
        return (
            <View style={[s.root, s.centerContent]}>
                <View style={s.permIconBox}>
                    <View style={s.permCameraBody}>
                        <View style={s.permCameraLens} />
                    </View>
                    <View style={s.permCameraBump} />
                </View>
                <Text style={s.permTitle}>{t('perm_title')}</Text>
                <Text style={s.permBody}>{t('perm_body')}</Text>
                <TouchableOpacity style={[s.permBtn, { backgroundColor: activeColor }]} onPress={requestPermission}>
                    <Text style={s.permBtnText}>{t('perm_button')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <View style={s.root} {...gestureHandlers}>
            <StatusBar hidden />

            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="back"
                onCameraReady={handleCameraReady}
                onMountError={handleCameraError}
            />

            {/* Static overlay — replaces animated opacity (was useNativeDriver:false) */}
            <View style={[s.overlay, { backgroundColor: activeColor + '08' }]} />

            {/* Bottom vignette */}
            <View style={s.vignetteBottom} />

            {/* Corner brackets — thicker, rounded ends */}
            {['TL','TR','BL','BR'].map(pos => (
                <View key={pos} style={[
                    s['bracket' + pos],
                    { borderColor: (watching ? GREEN : modeColor) + '60' },
                ]} />
            ))}

            {/* Scan line */}
            {isScanning && (
                <Animated.View style={[
                    s.scanLine,
                    { backgroundColor: modeColor, shadowColor: modeColor },
                    { transform: [{ translateY: scanLineY }] },
                ]} />
            )}

            {/* ── TOP BAR ───────────────────────────────────────────────── */}
            <View style={[s.topBar, isRTL && s.rowReverse]}>
                <Image
                    source={require('./assets/logorm.png')}
                    style={s.logo}
                    accessibilityLabel="Abserny"
                />
                <View style={[s.topRight, isRTL && s.rowReverse]}>
                    {/* Connectivity — tonal pill instead of dot */}
                    <View style={[s.connPill, {
                        backgroundColor: isConnected
                            ? 'rgba(0,229,160,0.12)'
                            : 'rgba(255,176,32,0.12)',
                    }]}>
                        <View style={[s.connDot, {
                            backgroundColor: isConnected ? GREEN : AMBER,
                        }]} />
                    </View>
                    {scanCount > 0 && (
                        <View style={s.countPill}>
                            <Text style={s.scanCount}>{scanCount}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ── ACTIVE MODE BANNER — editorial wide strip ─────────────── */}
            <Animated.View style={[
                s.modeBanner,
                { transform: [{ translateY: modeAnim }] },
                isRTL && s.rowReverse,
            ]}>
                {MODES.map((mode, i) => {
                    const ModeIcon = MODE_ICONS[mode.id];
                    const active   = i === modeIndex;
                    const color    = MODE_COLORS[mode.id];
                    if (!active) return null;
                    return (
                        <View key={mode.id} style={[s.activeModeChip, {
                            backgroundColor: color + '18',
                            borderColor: color + '40',
                        }]}>
                            {ModeIcon && <ModeIcon size={14} color={watching ? GREEN : color} />}
                            <Text style={[s.activeModeText, { color: watching ? GREEN : color }]}>
                                {watching
                                    ? (isRTL ? 'مراقبة' : 'WATCH')
                                    : modeStrings[mode.id]?.label?.toUpperCase()
                                }
                            </Text>
                        </View>
                    );
                })}
                {/* Inactive mode dots */}
                <View style={s.modeDots}>
                    {MODES.map((mode, i) => (
                        <View key={mode.id} style={[
                            s.modeDot,
                            i === modeIndex && {
                                backgroundColor: watching ? GREEN : MODE_COLORS[mode.id],
                                width: 14,
                            },
                        ]} />
                    ))}
                </View>
            </Animated.View>

            {/* ── CENTER STATE ──────────────────────────────────────────── */}
            <View style={s.center} pointerEvents="none">

                {/* Watch ring — single opacity animation */}
                {watching && (
                    <Animated.View style={[s.watchRing, {
                        borderColor: GREEN + '90',
                        opacity: watchOpacity,
                    }]} />
                )}

                {/* Ready ring — opacity breath, no scale composite */}
                {isReady && (
                    <View style={s.readyOuter}>
                        <Animated.View style={[
                            s.readyRing,
                            { borderColor: activeColor + '50', opacity: pulseOpacity },
                        ]}>
                            <View style={[s.readyDot, { backgroundColor: activeColor }]} />
                        </Animated.View>
                    </View>
                )}

                {isScanning && (
                    <View style={s.scanningBox}>
                        <ScanRing color={modeColor} />
                        <Text style={[s.scanLabel, { color: modeColor, letterSpacing: 6 }]}>
                            {isRTL ? 'مسح' : 'SCAN'}
                        </Text>
                    </View>
                )}

                {isSpeaking && (
                    <View style={s.waveRow}>
                        {[0, 110, 220, 110, 0].map((delay, i) => (
                            <WaveBar key={i} color={activeColor} delay={delay} />
                        ))}
                    </View>
                )}

                {isError && (
                    <View style={[s.errorRing, { borderColor: RED + '60' }]}>
                        <View style={[s.errorLine1, { backgroundColor: RED }]} />
                        <View style={[s.errorLine2, { backgroundColor: RED }]} />
                    </View>
                )}

                {/* State badge — AUTO or WATCH */}
                {(autoScan && isReady && !watching) && (
                    <View style={[s.stateBadge, {
                        borderColor: AMBER + '40',
                        backgroundColor: AMBER + '10',
                        top: -72,
                    }]}>
                        <View style={[s.stateDot, { backgroundColor: AMBER }]} />
                        <Text style={[s.stateBadgeText, { color: AMBER }]}>
                            {isRTL ? 'تلقائي' : 'AUTO'}
                        </Text>
                    </View>
                )}

                {watching && (
                    <View style={[s.stateBadge, {
                        borderColor: GREEN + '40',
                        backgroundColor: GREEN + '10',
                        top: -72,
                    }]}>
                        <LiveDot color={GREEN} />
                        <Text style={[s.stateBadgeText, { color: GREEN }]}>
                            {isRTL ? 'مراقبة نشطة' : 'WATCHING'}
                        </Text>
                    </View>
                )}
            </View>

            {/* ── BOTTOM ────────────────────────────────────────────────── */}
            <View style={s.bottom}>

                {/* Source badge — tonal surface, not outline */}
                {lastResult && lastSource !== 'gemini' && (
                    <View style={[s.sourceBadge, {
                        backgroundColor: lastSource === 'tflite'
                            ? 'rgba(0,229,160,0.10)'
                            : 'rgba(255,176,32,0.10)',
                    }]}>
                        <View style={[s.sourceDot, {
                            backgroundColor: lastSource === 'tflite' ? GREEN : AMBER,
                        }]} />
                        <Text style={[s.sourceTxt, {
                            color: lastSource === 'tflite' ? GREEN : AMBER,
                        }]}>
                            {lastSource === 'tflite' ? 'ON-DEVICE' : 'ML KIT'}
                        </Text>
                    </View>
                )}

                {/* Result text — generous tracking + line-height (DESIGN.md body) */}
                {lastResult ? (
                    <Animated.Text
                        style={[
                            s.resultText,
                            isRTL && s.rtlText,
                            { opacity: resultOpacity, transform: [{ translateY: resultSlide }] },
                        ]}
                        accessibilityLiveRegion="polite"
                        numberOfLines={5}
                    >
                        {lastResult}
                    </Animated.Text>
                ) : null}

                {/* Hint row */}
                <View style={[s.hintRow, isRTL && s.rowReverse]}>
                    <Text style={[s.hintText, isRTL && s.rtlText]}>
                        {watching
                            ? (isRTL ? 'انقر مرتين أو مرر لأعلى للإيقاف' : 'double tap or swipe up to stop')
                            : isReady
                                ? (autoScan ? t('hint_auto') : t('hint_ready'))
                                : isScanning ? t('hint_scanning')
                                    : isSpeaking ? t('hint_speaking')
                                        : ''
                        }
                    </Text>
                </View>

                {/* Gesture guide — clean single row, no icons */}
                <View style={[s.gestureRow, isRTL && s.rowReverse]}>
                    {[
                        { label: isRTL ? 'السابق ◀' : '◀ prev' },
                        { label: isRTL ? 'التالي ▶' : 'next ▶' },
                        { label: isRTL ? '↑ مراقبة' : '↑ watch' },
                        { label: isRTL ? '··· إعدادات' : '··· settings' },
                    ].map((g, i) => (
                        <Text key={i} style={s.gestureLabel}>{g.label}</Text>
                    ))}
                </View>
            </View>

            {/* ── OVERLAYS ──────────────────────────────────────────────── */}
            {showSettings && (
                <SettingsOverlay
                    lang={lang}
                    t={t}
                    speak={speak}
                    onRepeatTour={handleRepeatTour}
                    onChangeLang={handleChangeLang}
                    onClose={closeSettings}
                />
            )}

            {showLangPicker && (
                <LanguagePicker
                    onComplete={handleLangPickerComplete}
                />
            )}
        </View>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ScanRing({ color }) {
    const rot = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(rot, { toValue: 1, duration: 1000, useNativeDriver: true }),
        );
        loop.start();
        return () => loop.stop();
    }, []);
    const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
        <Animated.View style={[s.scanRing, { borderTopColor: color, transform: [{ rotate }] }]} />
    );
}

function WaveBar({ color, delay }) {
    const scaleY = useRef(new Animated.Value(0.15)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(scaleY, { toValue: 1,    duration: 260, useNativeDriver: true }),
                Animated.timing(scaleY, { toValue: 0.15, duration: 260, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <Animated.View style={[s.waveBar, { backgroundColor: color, transform: [{ scaleY }] }]} />
    );
}

function LiveDot({ color }) {
    const op = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(op, { toValue: 0.15, duration: 700, useNativeDriver: true }),
                Animated.timing(op, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return <Animated.View style={[s.liveDot, { backgroundColor: color, opacity: op }]} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const B  = 20;
const BW = 2;

const s = StyleSheet.create({
    root:          { flex: 1, backgroundColor: BG },
    centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

    // Static tinted overlay — no animation needed
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent', // overridden inline per mode
    },

    vignetteBottom: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 280,
        backgroundColor: 'rgba(15,17,18,0.92)',
    },

    // Corner brackets — rounded line caps via borderRadius on the corner views
    bracketTL: { position: 'absolute', top: 20,    left: 20,    width: B, height: B, borderTopWidth: BW,    borderLeftWidth: BW,   borderTopLeftRadius: 4     },
    bracketTR: { position: 'absolute', top: 20,    right: 20,   width: B, height: B, borderTopWidth: BW,    borderRightWidth: BW,  borderTopRightRadius: 4    },
    bracketBL: { position: 'absolute', bottom: 20, left: 20,    width: B, height: B, borderBottomWidth: BW, borderLeftWidth: BW,   borderBottomLeftRadius: 4  },
    bracketBR: { position: 'absolute', bottom: 20, right: 20,   width: B, height: B, borderBottomWidth: BW, borderRightWidth: BW,  borderBottomRightRadius: 4 },

    scanLine: {
        position: 'absolute', top: 0, left: 24, right: 24, height: 1.5,
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6, elevation: 6,
    },

    // ── Top bar
    topBar:   {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 52, paddingHorizontal: 22, paddingBottom: 12,
    },
    rowReverse: { flexDirection: 'row-reverse' },
    logo:       { width: 96, height: 30, resizeMode: 'contain' },
    topRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },

    // Tonal pill for connectivity (DESIGN.md: no bare dots)
    connPill: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 20,
    },
    connDot:  { width: 6, height: 6, borderRadius: 3 },

    // Scan count — tonal surface-container
    countPill: {
        backgroundColor: SURFACE_HI,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 10,
    },
    scanCount: { color: ON_SURFACE_MED, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

    // ── Mode banner — editorial strip (DESIGN.md: typography-first hierarchy)
    modeBanner: {
        position: 'absolute', top: 110, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 10, paddingHorizontal: 24,
    },
    activeModeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1,
    },
    activeModeText: { fontSize: 10, fontWeight: '800', letterSpacing: 3 },
    modeDots:       { flexDirection: 'row', gap: 5, alignItems: 'center' },
    modeDot:        {
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: ON_SURFACE_LOW,
        // width overridden to 14 for active
    },

    // ── Center
    center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

    watchRing: {
        position: 'absolute', width: 120, height: 120,
        borderRadius: 60, borderWidth: 1,
    },

    readyOuter: { alignItems: 'center', justifyContent: 'center' },
    readyRing:  {
        width: 68, height: 68, borderRadius: 34,
        borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    },
    readyDot:   { width: 7, height: 7, borderRadius: 3.5 },

    scanningBox: { alignItems: 'center', gap: 14 },
    scanRing:    {
        width: 56, height: 56, borderRadius: 28, borderWidth: 2,
        borderColor: 'transparent',
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    scanLabel:  { fontSize: 9, fontWeight: '800' },

    waveRow:    { flexDirection: 'row', gap: 5, alignItems: 'center', height: 36 },
    waveBar:    { width: 3.5, height: 28, borderRadius: 2 },

    errorRing:  {
        width: 54, height: 54, borderRadius: 27, borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,68,85,0.08)',
    },
    errorLine1: { position: 'absolute', width: 20, height: 2, borderRadius: 1, transform: [{ rotate: '45deg' }] },
    errorLine2: { position: 'absolute', width: 20, height: 2, borderRadius: 1, transform: [{ rotate: '-45deg' }] },

    // State badge — filled tonal (DESIGN.md: tonal depth over outlines)
    stateBadge: {
        position: 'absolute',
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 5,
        borderRadius: 6, borderWidth: 1,
    },
    stateDot:       { width: 5, height: 5, borderRadius: 2.5 },
    stateBadgeText: { fontSize: 9, letterSpacing: 3, fontWeight: '800' },
    liveDot:        { width: 5, height: 5, borderRadius: 2.5 },

    // ── Bottom
    bottom: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        alignItems: 'center', paddingBottom: 40,
        paddingHorizontal: 28, gap: 10,
    },

    // Source badge — tonal, no border (DESIGN.md: no-line rule)
    sourceBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 6,
    },
    sourceDot: { width: 4, height: 4, borderRadius: 2 },
    sourceTxt: { fontSize: 8, letterSpacing: 3, fontWeight: '700' },

    // Result text — generous tracking (DESIGN.md: label-md for legibility)
    resultText: {
        color: ON_SURFACE,
        fontSize: 17, lineHeight: 28,
        textAlign: 'center',
        letterSpacing: 0.2,
    },
    rtlText: { textAlign: 'right' },

    hintRow:   { flexDirection: 'row', alignItems: 'center' },
    hintText:  {
        color: ON_SURFACE_LOW,
        fontSize: 9, letterSpacing: 2, fontWeight: '600',
    },

    // Gesture row — flat text labels, no icons, no boxes
    gestureRow:    { flexDirection: 'row', gap: 16, marginTop: 4 },
    gestureLabel:  { color: ON_SURFACE_LOW, fontSize: 8, letterSpacing: 1.5 },

    // Permission screen
    permIconBox:    { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    permCameraBody: { width: 54, height: 40, borderRadius: 8, borderWidth: 2.5, borderColor: CYAN, alignItems: 'center', justifyContent: 'center' },
    permCameraLens: { width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: CYAN },
    permCameraBump: { position: 'absolute', top: 10, width: 16, height: 8, borderRadius: 4, backgroundColor: CYAN },
    permTitle:      { color: ON_SURFACE, fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center', letterSpacing: -0.3 },
    permBody:       { color: ON_SURFACE_MED, fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 36 },
    permBtn:        { paddingHorizontal: 36, paddingVertical: 16, borderRadius: 14, minWidth: 180, alignItems: 'center' },
    permBtnText:    { color: '#000', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
