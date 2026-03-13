/**
 *
 * What's new:
 *   + Continuous Watch Mode  (swipe up — useWatchMode)
 *   + expo-network           (reliable connectivity — useNetwork)
 *   + Watch mode UI          (breathing outer ring, GREEN state, badge, hints)
 *   + Swipe-up gesture hint in bottom bar
 *   + All existing features preserved exactly
 */

import React, {
    useState, useRef, useEffect, useCallback,
} from 'react';
import {
    View, Text, StyleSheet, Animated, Image,
    StatusBar, AccessibilityInfo, Dimensions,
    TouchableOpacity, I18nManager,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Speech  from 'expo-speech';

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

// ── Colors ────────────────────────────────────────────────────────────────────
const CYAN   = '#00BFFF';
const GREEN  = '#00E5A0';
const AMBER  = '#FFB020';
const RED    = '#FF4455';
const PURPLE = '#A78BFA';
const BG     = '#161717';

const SCREEN_H = Dimensions.get('window').height;

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

// ── Root — decides which screen to show ───────────────────────────────────────
export default function App() {
    const {
        lang, loading, onboarded,
        chooseLang, completeOnboarding, resetOnboarding, resetLanguage, t,
    } = useLanguage();

    if (loading) return <View style={{ flex: 1, backgroundColor: BG }} />;

    if (!lang || !onboarded) {
        return (
            <OnboardingScreen
                initialPhase={lang && !onboarded ? 'tutorial' : 'language'}
                initialLang={lang || 'en'}
                onComplete={(chosenLang) => {
                    chooseLang(chosenLang);
                    completeOnboarding();
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
    const { detect }       = useDetection();

    // Enhancement: speak connectivity changes so blind users know when
    // the app switches between Gemini (online) and ML Kit (offline) mode.
    const speakRef = useRef(speak);
    useEffect(() => { speakRef.current = speak; }, [speak]);
    const tRef = useRef(t);
    useEffect(() => { tRef.current = t; }, [t]);

    const { isConnected }  = useNetwork({
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

    // TTS prewarm
    useEffect(() => {
        Speech.speak(' ', { language: lang === 'ar' ? 'ar-SA' : 'en-US', volume: 0 });
    }, []); // eslint-disable-line

    // ── Animations ────────────────────────────────────────────────────────────
    const scanLineAnim   = useRef(new Animated.Value(0)).current;
    const scanLoop       = useRef(null);
    const pulseAnim      = useRef(new Animated.Value(1)).current;
    const pulseLoop      = useRef(null);
    const resultOpacity  = useRef(new Animated.Value(0)).current;
    const resultSlide    = useRef(new Animated.Value(20)).current;
    const modeAnim       = useRef(new Animated.Value(0)).current;
    const overlayOpacity = useRef(new Animated.Value(0.18)).current;
    const watchRingAnim  = useRef(new Animated.Value(0)).current;
    const watchRingLoop  = useRef(null);

    useEffect(() => { stateRef.current = appState; }, [appState]);
    useEffect(() => () => { isMounted.current = false; }, []);

    // RTL
    useEffect(() => {
        const shouldRTL = lang === 'ar';
        if (I18nManager.isRTL !== shouldRTL) I18nManager.forceRTL(shouldRTL);
    }, [lang]);

    // Accessibility
    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReducedMo);
    }, []);

    // Boot
    useEffect(() => {
        if (!permission?.granted || bootSpoken.current) return;
        bootSpoken.current = true;
        const ms = MODES_STRINGS[lang]?.[currentMode.id] ?? MODES_STRINGS.en[currentMode.id];
        setAppState(STATE.READY);
        startPulse();
        speak(t('ready', ms.label, ms.hint), 'high');
    }, [permission?.granted, lang]); // eslint-disable-line

    useEffect(() => {
        if (!permission) return;
        if (!permission.granted) {
            requestPermission().then(r => {
                if (!r.granted) speak(t('no_permission'), 'high');
            });
        }
    }, [permission]); // eslint-disable-line

    // ── Watch ring animation ──────────────────────────────────────────────────
    useEffect(() => {
        if (watching) {
            watchRingLoop.current?.stop();
            watchRingLoop.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(watchRingAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                    Animated.timing(watchRingAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
                ]),
            );
            watchRingLoop.current.start();
        } else {
            watchRingLoop.current?.stop();
            watchRingAnim.setValue(0);
        }
        return () => watchRingLoop.current?.stop();
    }, [watching]); // eslint-disable-line

    // ── Pulse ─────────────────────────────────────────────────────────────────
    const startPulse = useCallback(() => {
        if (reducedMo) return;
        pulseLoop.current?.stop();
        pulseLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.18, duration: 1300, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0,  duration: 1300, useNativeDriver: true }),
            ]),
        );
        pulseLoop.current.start();
    }, [reducedMo, pulseAnim]);

    const stopPulse = useCallback(() => {
        pulseLoop.current?.stop();
        pulseAnim.setValue(1);
    }, [pulseAnim]);

    // ── Scan animation ────────────────────────────────────────────────────────
    const startScanAnim = useCallback(() => {
        if (reducedMo) return;
        scanLineAnim.setValue(0);
        scanLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
                Animated.timing(scanLineAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
            ]),
        );
        scanLoop.current.start();
        Animated.timing(overlayOpacity, { toValue: 0.38, duration: 300, useNativeDriver: false }).start();
    }, [reducedMo, scanLineAnim, overlayOpacity]);

    const stopScanAnim = useCallback(() => {
        scanLoop.current?.stop();
        scanLineAnim.setValue(0);
        Animated.timing(overlayOpacity, { toValue: 0.18, duration: 400, useNativeDriver: false }).start();
    }, [scanLineAnim, overlayOpacity]);

    const animateResult = useCallback(() => {
        resultOpacity.setValue(0);
        resultSlide.setValue(16);
        Animated.parallel([
            Animated.timing(resultOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.timing(resultSlide,   { toValue: 0, duration: 380, useNativeDriver: true }),
        ]).start();
    }, [resultOpacity, resultSlide]);

    const animateMode = useCallback(() => {
        Animated.sequence([
            Animated.timing(modeAnim, { toValue: -6, duration: 90,  useNativeDriver: true }),
            Animated.timing(modeAnim, { toValue: 0,  duration: 180, useNativeDriver: true }),
        ]).start();
    }, [modeAnim]);

    // ── Core scan ─────────────────────────────────────────────────────────────
    const runScan = useCallback(async () => {
        if (stateRef.current !== STATE.READY) return;
        if (!cameraRef.current) return;

        setAppState(STATE.SCANNING);
        stopPulse();
        startScanAnim();
        speak(t('scanning'), 'high');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true, quality: 0.35,
                skipProcessing: true, shutterSound: false,
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
        // Stop auto-scan if running — they're mutually exclusive
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
        speak(t('tour_restarting'), 'high');
        setTimeout(() => onResetOnboarding(), 800);
    }, [speak, t, onResetOnboarding]);

    const handleChangeLang = useCallback(() => {
        setShowSettings(false);
        setTimeout(() => setShowLangPicker(true), 400);
    }, []);

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

    // Double tap: if watching → stop watch. If speaking → replay result
    // (gives blind users confirmation the app is responsive, not frozen).
    // Otherwise scan or toggle auto.
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
        outputRange: [SCREEN_H * 0.08, SCREEN_H * 0.90],
    });

    const watchRingOpacity = watchRingAnim.interpolate({
        inputRange: [0, 1], outputRange: [0.25, 0.75],
    });
    const watchRingScale = watchRingAnim.interpolate({
        inputRange: [0, 1], outputRange: [1.0, 1.15],
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
                <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
                    <Text style={s.permBtnText}>{t('perm_button')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <View style={s.root} {...gestureHandlers}>
            <StatusBar hidden />

            {/* Camera */}
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

            {/* Overlay dim */}
            <Animated.View style={[s.overlay, { opacity: overlayOpacity }]} />

            {/* Bottom vignette */}
            <View style={s.vignetteBottom} />

            {/* Corner brackets — shift to GREEN in watch mode */}
            {['TL','TR','BL','BR'].map(pos => (
                <View key={pos} style={[
                    s['bracket' + pos],
                    { borderColor: watching ? GREEN + '70' : modeColor + '80' },
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

            {/* ── TOP BAR ─────────────────────────────────────────────────── */}
            <View style={[s.topBar, isRTL && s.rowReverse]}>
                <Image
                    source={require('./assets/logorm.png')}
                    style={s.logo}
                    accessibilityLabel="Abserny"
                />
                <View style={[s.topRight, isRTL && s.rowReverse]}>
                    <View style={[s.connDot, { backgroundColor: isConnected ? GREEN : AMBER }]} />
                    {scanCount > 0 && <Text style={s.scanCount}>{scanCount}</Text>}
                    <Text style={s.settingsHint}>···</Text>
                </View>
            </View>

            {/* ── MODE PILLS ──────────────────────────────────────────────── */}
            <Animated.View style={[s.modeBar, { transform: [{ translateY: modeAnim }] }]}>
                {MODES.map((mode, i) => {
                    const ModeIcon = MODE_ICONS[mode.id];
                    const active   = i === modeIndex;
                    return (
                        <View key={mode.id} style={[
                            s.modePill,
                            active && {
                                backgroundColor: MODE_COLORS[mode.id] + '22',
                                borderColor:     MODE_COLORS[mode.id],
                            },
                            // Dim pills during watch mode
                            watching && !active && { opacity: 0.35 },
                        ]}>
                            {ModeIcon && (
                                <ModeIcon
                                    size={17}
                                    color={active
                                        ? (watching ? GREEN : MODE_COLORS[mode.id])
                                        : 'rgba(255,255,255,0.35)'
                                    }
                                />
                            )}
                        </View>
                    );
                })}
            </Animated.View>

            {/* ── CENTER STATE ────────────────────────────────────────────── */}
            <View style={s.center} pointerEvents="none">

                {/* Breathing watch ring — outermost */}
                {watching && (
                    <Animated.View style={[s.watchRing, {
                        borderColor: GREEN,
                        opacity:     watchRingOpacity,
                        transform:   [{ scale: watchRingScale }],
                    }]} />
                )}

                {/* Ready pulse ring */}
                {isReady && (
                    <Animated.View style={[
                        s.readyRing,
                        {
                            borderColor: activeColor + '55',
                            transform:   [{ scale: pulseAnim }],
                        },
                    ]}>
                        <View style={[s.readyDot, { backgroundColor: activeColor }]} />
                    </Animated.View>
                )}

                {/* Scanning ring */}
                {isScanning && (
                    <View style={s.scanningBox}>
                        <ScanRing color={modeColor} />
                        <Text style={[s.scanLabel, { color: modeColor }]}>
                            {isRTL ? 'مسح' : 'SCANNING'}
                        </Text>
                    </View>
                )}

                {/* Speaking waveform */}
                {isSpeaking && (
                    <View style={s.waveRow}>
                        {[0, 120, 240, 120, 0].map((delay, i) => (
                            <WaveBar key={i} color={activeColor} delay={delay} />
                        ))}
                    </View>
                )}

                {/* Error */}
                {isError && (
                    <View style={[s.errorRing, { borderColor: RED }]}>
                        <View style={[s.errorLine1, { backgroundColor: RED }]} />
                        <View style={[s.errorLine2, { backgroundColor: RED }]} />
                    </View>
                )}

                {/* AUTO badge */}
                {autoScan && isReady && !watching && (
                    <View style={[s.stateBadge, {
                        borderColor:     AMBER,
                        backgroundColor: AMBER + '12',
                        top: -62,
                    }]}>
                        <Text style={[s.stateBadgeText, { color: AMBER }]}>
                            {isRTL ? 'تلقائي' : 'AUTO'}
                        </Text>
                    </View>
                )}

                {/* WATCH badge with live dot */}
                {watching && (
                    <View style={[s.stateBadge, {
                        borderColor:     GREEN,
                        backgroundColor: GREEN + '12',
                        top: -62,
                        flexDirection: 'row',
                        gap: 6,
                    }]}>
                        <LiveDot color={GREEN} />
                        <Text style={[s.stateBadgeText, { color: GREEN }]}>
                            {isRTL ? 'مراقبة' : 'WATCH'}
                        </Text>
                    </View>
                )}
            </View>

            {/* ── BOTTOM ──────────────────────────────────────────────────── */}
            <View style={s.bottom}>

                {/* Offline source badge */}
                {lastResult && lastSource === 'offline' && (
                    <View style={s.sourceBadge}>
                        <View style={[s.sourceDot, { backgroundColor: AMBER }]} />
                        <Text style={[s.sourceTxt, { color: AMBER }]}>ML KIT</Text>
                    </View>
                )}

                {/* Result text */}
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

                {/* Mode label + hint */}
                <View style={[s.hintRow, isRTL && s.rowReverse]}>
                    <Text style={[s.modeName, { color: activeColor }]}>
                        {watching
                            ? (isRTL ? 'مراقبة نشطة' : 'WATCHING')
                            : modeStrings[currentMode.id]?.label?.toUpperCase()
                        }
                    </Text>
                    <Text style={s.hintDot}>·</Text>
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

                {/* Gesture hint row */}
                <View style={[s.gestureRow, isRTL && s.rowReverse]}>
                    <GHint icon="◀" label={t('gesture_prev')} />
                    <GHint icon="▶" label={t('gesture_next')} />
                    <GHint icon="↑"  label={isRTL ? 'مراقبة' : 'watch'} />
                    <GHint icon="···" label={isRTL ? 'الإعدادات' : 'settings'} />
                </View>
            </View>

            {/* ── OVERLAYS ────────────────────────────────────────────────── */}
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
                    onComplete={(chosenLang) => {
                        setShowLangPicker(false);
                        onChooseLang(chosenLang);
                    }}
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
            Animated.timing(rot, { toValue: 1, duration: 1100, useNativeDriver: true }),
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
    const h = useRef(new Animated.Value(5)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(h, { toValue: 30, duration: 280, useNativeDriver: false }),
                Animated.timing(h, { toValue: 5,  duration: 280, useNativeDriver: false }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return <Animated.View style={[s.waveBar, { backgroundColor: color, height: h }]} />;
}

// Pulsing live dot for watch badge
function LiveDot({ color }) {
    const op = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(op, { toValue: 0.2, duration: 600, useNativeDriver: true }),
                Animated.timing(op, { toValue: 1.0, duration: 600, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return <Animated.View style={[s.liveDot, { backgroundColor: color, opacity: op }]} />;
}

function GHint({ icon, label }) {
    return (
        <View style={s.ghint}>
            <Text style={s.ghintIcon}>{icon}</Text>
            <Text style={s.ghintLabel}>{label}</Text>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const B  = 24;
const BW = 2.5;

const s = StyleSheet.create({
    root:          { flex: 1, backgroundColor: BG },
    centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    overlay:       { ...StyleSheet.absoluteFillObject, backgroundColor: BG },
    vignetteBottom:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 250,
        backgroundColor: 'rgba(22,23,23,0.88)' },

    // Brackets
    bracketTL: { position: 'absolute', top: 18, left: 18,    width: B, height: B, borderTopWidth: BW,    borderLeftWidth: BW   },
    bracketTR: { position: 'absolute', top: 18, right: 18,   width: B, height: B, borderTopWidth: BW,    borderRightWidth: BW  },
    bracketBL: { position: 'absolute', bottom: 18, left: 18,  width: B, height: B, borderBottomWidth: BW, borderLeftWidth: BW  },
    bracketBR: { position: 'absolute', bottom: 18, right: 18, width: B, height: B, borderBottomWidth: BW, borderRightWidth: BW },

    scanLine: {
        position: 'absolute', top: 0, left: 18, right: 18, height: 2,
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1,
        shadowRadius: 8, elevation: 8,
    },

    // Top bar
    topBar:      { position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10 },
    rowReverse:  { flexDirection: 'row-reverse' },
    logo:        { width: 100, height: 32, resizeMode: 'contain' },
    topRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
    connDot:     { width: 7, height: 7, borderRadius: 3.5 },
    scanCount:   { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700' },
    settingsHint:{ color: 'rgba(255,255,255,0.15)', fontSize: 14, letterSpacing: 2 },

    // Mode pills
    modeBar:  { position: 'absolute', top: 106, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center', gap: 8 },
    modePill: { width: 38, height: 38, borderRadius: 19,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.04)' },

    // Center
    center:     { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

    watchRing:  { position: 'absolute', width: 128, height: 128,
        borderRadius: 64, borderWidth: 1.5 },

    readyRing:  { width: 72, height: 72, borderRadius: 36,
        borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    readyDot:   { width: 8, height: 8, borderRadius: 4 },

    scanningBox:{ alignItems: 'center', gap: 16 },
    scanRing:   { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5,
        borderColor: 'transparent',
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: 'transparent' },
    scanLabel:  { fontSize: 10, letterSpacing: 6, fontWeight: '700' },

    waveRow:    { flexDirection: 'row', gap: 5, alignItems: 'center', height: 40 },
    waveBar:    { width: 4, borderRadius: 2 },

    errorRing:  { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,68,85,0.1)' },
    errorLine1: { position: 'absolute', width: 22, height: 2.5,
        borderRadius: 1.25, transform: [{ rotate: '45deg' }] },
    errorLine2: { position: 'absolute', width: 22, height: 2.5,
        borderRadius: 1.25, transform: [{ rotate: '-45deg' }] },

    stateBadge:     { position: 'absolute', flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 4, borderWidth: 1 },
    stateBadgeText: { fontSize: 9, letterSpacing: 4, fontWeight: '700' },
    liveDot:        { width: 5, height: 5, borderRadius: 2.5 },

    // Bottom
    bottom:      { position: 'absolute', bottom: 0, left: 0, right: 0,
        alignItems: 'center', paddingBottom: 38,
        paddingHorizontal: 24, gap: 9 },
    sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 3, borderWidth: 1,
        borderColor: 'rgba(255,176,32,0.25)',
        backgroundColor: 'rgba(255,176,32,0.06)' },
    sourceDot:   { width: 5, height: 5, borderRadius: 2.5 },
    sourceTxt:   { fontSize: 8, letterSpacing: 3, fontWeight: '700' },
    resultText:  { color: 'rgba(255,255,255,0.92)', fontSize: 17,
        textAlign: 'center', lineHeight: 26 },
    rtlText:     { textAlign: 'right' },
    hintRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
    modeName:    { fontSize: 9, letterSpacing: 4, fontWeight: '800' },
    hintDot:     { color: 'rgba(255,255,255,0.2)', fontSize: 10 },
    hintText:    { color: 'rgba(255,255,255,0.2)', fontSize: 9, letterSpacing: 2 },
    gestureRow:  { flexDirection: 'row', gap: 18, marginTop: 2 },
    ghint:       { alignItems: 'center', gap: 2 },
    ghintIcon:   { color: 'rgba(255,255,255,0.22)', fontSize: 10 },
    ghintLabel:  { color: 'rgba(255,255,255,0.14)', fontSize: 8, letterSpacing: 2 },

    // Permission
    permIconBox:    { width: 72, height: 72, alignItems: 'center',
        justifyContent: 'center', marginBottom: 20 },
    permCameraBody: { width: 56, height: 42, borderRadius: 8,
        borderWidth: 3, borderColor: CYAN,
        alignItems: 'center', justifyContent: 'center' },
    permCameraLens: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: CYAN },
    permCameraBump: { position: 'absolute', top: 10, width: 18, height: 9,
        borderRadius: 4, backgroundColor: CYAN },
    permTitle:      { color: '#fff', fontSize: 22, fontWeight: '700',
        marginBottom: 12, textAlign: 'center' },
    permBody:       { color: 'rgba(255,255,255,0.55)', fontSize: 16,
        textAlign: 'center', lineHeight: 24, marginBottom: 32 },
    permBtn:        { backgroundColor: CYAN, paddingHorizontal: 32, paddingVertical: 14,
        borderRadius: 8, minWidth: 180, alignItems: 'center' },
    permBtnText:    { color: '#000', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
});
