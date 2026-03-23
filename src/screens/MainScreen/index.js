/**
 * screens/MainScreen/index.js
 * All state, hooks, and gesture wiring for the main camera screen.
 * Layout is delegated to TopBar, ModeBanner, CenterState, BottomPanel.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, StyleSheet, Animated, TouchableOpacity, Text,
    StatusBar, AccessibilityInfo,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Speech  from 'expo-speech';

import { useVoice }      from '../../hooks/useVoice';
import { useGestures }   from '../../hooks/useGestures';
import { useDetection }  from '../../hooks/useDetection';
import { useModes }      from '../../hooks/useModes';
import { useNetwork }    from '../../hooks/useNetwork';
import { useWatchMode }  from '../../hooks/useWatchMode';
import { useSettings }   from '../../hooks/useSettings';
import { classifyResult, playPriorityHaptic } from '../../services/haptics/priority';
import { MODES_STRINGS } from '../../i18n/prompts';
import { MODE_COLORS, GREEN, CYAN, BG } from '../../constants/colors';
import { SCREEN_H }      from '../../constants/layout';

import { TopBar }      from './TopBar';
import { ModeBanner }  from './ModeBanner';
import { CenterState } from './CenterState';
import { BottomPanel } from './BottomPanel';
import SettingsOverlay from '../../components/overlays/SettingsOverlay';
import LanguagePicker  from '../LanguagePicker';
import { s }           from './styles';

const STATE = {
    BOOT:     'boot',
    READY:    'ready',
    SCANNING: 'scanning',
    SPEAKING: 'speaking',
    ERROR:    'error',
};

export default function MainScreen({ lang, t, onChooseLang, onResetOnboarding }) {

    const [permission, requestPermission] = useCameraPermissions();
    const [appState,       setAppState]       = useState(STATE.BOOT);
    const [lastResult,     setLastResult]     = useState('');
    const [lastSource,     setLastSource]     = useState('online');
    const [reducedMo,      setReducedMo]      = useState(false);
    const [autoScan,       setAutoScan]       = useState(false);
    const [scanCount,      setScanCount]      = useState(0);
    const [showSettings,   setShowSettings]   = useState(false);
    const [showLangPicker, setShowLangPicker] = useState(false);

    const { speak, stop } = useVoice(lang);
    const speakRef        = useRef(speak);
    useEffect(() => { speakRef.current = speak; }, [speak]);

    const speakQuotaRef = useRef(null);
    useEffect(() => { speakQuotaRef.current = speak; }, [speak]);

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

    useEffect(() => { stateRef.current = appState; }, [appState]);
    useEffect(() => () => { isMounted.current = false; }, []);

    const { watching, toggleWatch, stopWatch } = useWatchMode({
        cameraRef, detect, speak, lang, isConnected,
    });
    const watchingRef = useRef(watching);
    useEffect(() => { watchingRef.current = watching; }, [watching]);

    const { priorityHapticsEnabled, togglePriorityHaptics } = useSettings();

    // ── Animations ────────────────────────────────────────────────────────────
    const scanLineAnim  = useRef(new Animated.Value(0)).current;
    const scanLoop      = useRef(null);
    const pulseOpacity  = useRef(new Animated.Value(0.5)).current;
    const pulseLoop     = useRef(null);
    const resultOpacity = useRef(new Animated.Value(0)).current;
    const resultSlide   = useRef(new Animated.Value(20)).current;
    const modeAnim      = useRef(new Animated.Value(0)).current;
    const watchOpacity  = useRef(new Animated.Value(0.3)).current;
    const watchLoop     = useRef(null);

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReducedMo);
    }, []);

    // Watch ring
    useEffect(() => {
        if (watching && !reducedMo) {
            watchLoop.current?.stop();
            watchLoop.current = Animated.loop(Animated.sequence([
                Animated.timing(watchOpacity, { toValue: 0.8, duration: 1800, useNativeDriver: true }),
                Animated.timing(watchOpacity, { toValue: 0.2, duration: 1800, useNativeDriver: true }),
            ]));
            watchLoop.current.start();
        } else {
            watchLoop.current?.stop();
            watchOpacity.setValue(0.3);
        }
        return () => watchLoop.current?.stop();
    }, [watching, reducedMo]); // eslint-disable-line

    const startPulse = useCallback(() => {
        if (reducedMo) return;
        pulseLoop.current?.stop();
        pulseLoop.current = Animated.loop(Animated.sequence([
            Animated.timing(pulseOpacity, { toValue: 1.0,  duration: 1400, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.35, duration: 1400, useNativeDriver: true }),
        ]));
        pulseLoop.current.start();
    }, [reducedMo, pulseOpacity]);

    const stopPulse = useCallback(() => {
        pulseLoop.current?.stop();
        pulseOpacity.setValue(0.5);
    }, [pulseOpacity]);

    const startScanAnim = useCallback(() => {
        if (reducedMo) return;
        scanLineAnim.setValue(0);
        scanLoop.current = Animated.loop(Animated.sequence([
            Animated.timing(scanLineAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            Animated.timing(scanLineAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]));
        scanLoop.current.start();
    }, [reducedMo, scanLineAnim]);

    const stopScanAnim = useCallback(() => {
        scanLoop.current?.stop();
        scanLineAnim.setValue(0);
    }, [scanLineAnim]);

    const animateResult = useCallback(() => {
        resultOpacity.setValue(0); resultSlide.setValue(14);
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

    // Boot speech
    const startPulseRef = useRef(null);
    useEffect(() => { startPulseRef.current = startPulse; }, [startPulse]);
    useEffect(() => {
        if (bootSpoken.current || !permission?.granted) return;
        bootSpoken.current = true;
        const ms = MODES_STRINGS[lang]?.[currentMode.id] ?? MODES_STRINGS.en[currentMode.id];
        setAppState(STATE.READY);
        startPulseRef.current?.();
        setTimeout(() => speakRef.current(tRef.current('ready', ms.label, ms.hint), 'high'), 200);
    }, [permission?.granted]); // eslint-disable-line

    // Camera permission
    useEffect(() => {
        if (!permission) return;
        if (!permission.granted) requestPermission().then(r => { if (!r.granted) speak(t('no_permission'), 'high'); });
    }, [permission]); // eslint-disable-line

    // ── Core scan ─────────────────────────────────────────────────────────────
    const runScan = useCallback(async () => {
        if (stateRef.current !== STATE.READY || !cameraRef.current || watchingRef.current) return;
        setAppState(STATE.SCANNING);
        stopPulse(); startScanAnim();
        speak(t('scanning'), 'high');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true, quality: 0.15, skipProcessing: true, shutterSound: false,
            });
            if (!photo?.base64) throw new Error('capture failed');
            const { result, source } = await detect(photo.base64, currentMode.id, isConnected, lang);
            if (!isMounted.current) return;
            setLastResult(result); setLastSource(source);
            setAppState(STATE.SPEAKING); setScanCount(c => c + 1);
            stopScanAnim(); animateResult();

            // Priority haptics pipeline:
            //   Heavy tap  → "result is incoming" (user's existing expectation)
            //   Pattern    → priority signal (danger / notable / neutral)
            //   80ms gap   → pattern ends
            //   Voice      → result spoken
            // When priority haptics is disabled, just the Heavy tap fires.
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            if (priorityHapticsEnabled) {
                const priority = classifyResult(result);
                await playPriorityHaptic(priority);
            }
            speak(result, 'high');
            setTimeout(() => { if (isMounted.current) { setAppState(STATE.READY); startPulse(); } },
                Math.max(2500, (result.length / 14) * 1000));
        } catch {
            if (!isMounted.current) return;
            stopScanAnim(); setAppState(STATE.ERROR);
            speak(t('cant_scan'), 'high');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => { if (isMounted.current) { setAppState(STATE.READY); startPulse(); } }, 1800);
        }
    }, [currentMode, isConnected, lang, detect, speak, t, startScanAnim, stopScanAnim, startPulse, stopPulse, animateResult, priorityHapticsEnabled]);

    // Auto-scan
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
        } else { clearInterval(autoTimer.current); }
        return () => clearInterval(autoTimer.current);
    }, [autoScan, runScan]);

    // Watch toggle
    const handleWatchToggle = useCallback(() => {
        if (autoScan) setAutoScan(false);
        toggleWatch();
    }, [toggleWatch, autoScan]);

    // Settings
    const openSettings  = useCallback(() => setShowSettings(true), []);
    const closeSettings = useCallback(() => { setShowSettings(false); speak(t('settings_closed'), 'high'); }, [speak, t]);

    const handleRepeatTour = useCallback(() => {
        setShowSettings(false);
        if (watchingRef.current) stopWatch();
        setAutoScan(false); clearInterval(autoTimer.current);
        stop();
        setTimeout(() => { speak(t('tour_restarting'), 'high'); setTimeout(() => onResetOnboarding(), 800); }, 100);
    }, [speak, stop, t, onResetOnboarding, stopWatch]);

    const handleChangeLang = useCallback(() => {
        setShowSettings(false);
        setTimeout(() => setShowLangPicker(true), 400);
    }, []);

    const handleLangPickerComplete = useCallback(async (chosenLang) => {
        setShowLangPicker(false);
        stop();
        setTimeout(() => Speech.speak(
            chosenLang === 'ar' ? 'تم تغيير اللغة.' : 'Language changed.',
            { language: chosenLang === 'ar' ? 'ar-SA' : 'en-US', rate: 0.88 },
        ), 50);
        await onChooseLang(chosenLang);
    }, [onChooseLang, stop]);

    // Gestures
    const handleRepeat = useCallback(() => {
        if (!lastResult) { speak(t('repeat_empty'), 'high'); return; }
        speak(lastResult, 'high'); Haptics.selectionAsync();
    }, [lastResult, speak, t]);

    const modeAnnounce = useCallback((mode) => {
        const ms = (MODES_STRINGS[lang] ?? MODES_STRINGS.en)[mode.id];
        speak(`${ms.label}. ${ms.hint}`, 'high'); animateMode(); Haptics.selectionAsync();
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
        if (stateRef.current === STATE.SPEAKING && lastResult) { speak(lastResult, 'high'); return; }
        runScan();
    }, [watching, stopWatch, autoScan, toggleAutoScan, lastResult, speak, runScan]);

    const gestureHandlers = useGestures({
        onScan: handleDoubleTap, onRepeat: handleRepeat, onCycleMode: handleCycleMode,
        onNextMode: handleNextMode, onPrevMode: handlePrevMode, onWatchToggle: handleWatchToggle,
        enabled: (appState === STATE.READY || appState === STATE.SPEAKING || watching)
            && !showSettings && !showLangPicker,
    });

    // ── Derived ───────────────────────────────────────────────────────────────
    const modeColor   = MODE_COLORS[currentMode.id] || CYAN;
    const activeColor = watching ? GREEN : modeColor;
    const isRTL       = lang === 'ar';
    const modeStrings = MODES_STRINGS[lang] || MODES_STRINGS.en;

    const scanLineY = scanLineAnim.interpolate({
        inputRange: [0, 1], outputRange: [SCREEN_H * 0.10, SCREEN_H * 0.88],
    });

    // ── Permission screen ─────────────────────────────────────────────────────
    if (!permission) return <View style={s.root} />;

    if (!permission.granted) {
        return (
            <View style={[s.root, s.centerContent]}>
                <View style={s.permIconBox}>
                    <View style={s.permCameraBody}><View style={s.permCameraLens} /></View>
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
                onCameraReady={() => console.log('[Abserny] Camera ready.')}
                onMountError={(err) => {
                    console.error('[Abserny] Camera error:', err);
                    speak(lang === 'ar' ? 'تعذّر تشغيل الكاميرا.' : 'Camera failed.', 'high');
                }}
            />

            {/* Mode-tinted static overlay */}
            <View style={[s.overlay, { backgroundColor: activeColor + '08' }]} />
            <View style={s.vignetteBottom} />

            {/* Corner brackets */}
            {['TL','TR','BL','BR'].map(pos => (
                <View key={pos} style={[s['bracket' + pos], { borderColor: (watching ? GREEN : modeColor) + '60' }]} />
            ))}

            {/* Scan line */}
            {appState === STATE.SCANNING && (
                <Animated.View style={[s.scanLine, { backgroundColor: modeColor, shadowColor: modeColor, transform: [{ translateY: scanLineY }] }]} />
            )}

            <TopBar isConnected={isConnected} scanCount={scanCount} isRTL={isRTL} />

            <ModeBanner
                modeIndex={modeIndex} modeAnim={modeAnim}
                watching={watching} modeStrings={modeStrings} isRTL={isRTL}
            />

            <CenterState
                appState={appState} activeColor={activeColor} modeColor={modeColor}
                pulseOpacity={pulseOpacity} watchOpacity={watchOpacity}
                watching={watching} autoScan={autoScan} isRTL={isRTL}
            />

            <BottomPanel
                lastResult={lastResult} lastSource={lastSource}
                appState={appState} activeColor={activeColor}
                watching={watching} autoScan={autoScan} isRTL={isRTL}
                resultOpacity={resultOpacity} resultSlide={resultSlide}
                t={t}
            />

            {showSettings && (
                <SettingsOverlay
                    lang={lang} t={t} speak={speak}
                    onRepeatTour={handleRepeatTour}
                    onChangeLang={handleChangeLang}
                    onToggleHaptics={togglePriorityHaptics}
                    priorityHapticsEnabled={priorityHapticsEnabled}
                    onClose={closeSettings}
                />
            )}

            {showLangPicker && (
                <LanguagePicker onComplete={handleLangPickerComplete} />
            )}
        </View>
    );
}
