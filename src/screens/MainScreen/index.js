/**
 * screens/MainScreen/index.js  — Flat Minimal
 *
 * Animation philosophy:
 *   - Screen fades in on mount (opacity, 400ms)
 *   - Result fades in on arrival (opacity only, 200ms) — no translate
 *   - Ready dot pulses opacity only — no scale
 *   - Watch ring pulses opacity only
 *   - Brackets appear instantly at opacity 1 — no stagger entrance
 *   - Mode chip: instantaneous swap — no translateY bounce
 *   - Scan line: simple opacity flash during scanning
 *   - Everything else is structural, not animated
 *
 * No logic changes from the v2 "Smooth" version.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, StyleSheet, Animated, TouchableOpacity, Text,
    StatusBar, AccessibilityInfo, Easing,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { useVoice }       from '../../hooks/useVoice';
import { useGestures }    from '../../hooks/useGestures';
import { useDetection }   from '../../hooks/useDetection';
import { useModes }       from '../../hooks/useModes';
import { useNetwork }     from '../../hooks/useNetwork';
import { useWatchMode }   from '../../hooks/useWatchMode';
import { useSettings }    from '../../hooks/useSettings';
import { useModelState }  from '../../hooks/useModelState';
import { classifyResult, playPriorityHaptic } from '../../services/haptics/priority';
import { normalizeArabicForTTS } from '../../services/tts/normalize';
import { MODES_STRINGS } from '../../i18n/prompts';
import { MODE_COLORS, GREEN, CYAN, BG } from '../../constants/colors';

import { TopBar }      from './TopBar';
import { ModeBanner }  from './ModeBanner';
import { CenterState } from './CenterState';
import { BottomPanel } from './BottomPanel';
import SettingsOverlay from '../../components/overlays/SettingsOverlay';
import LanguagePicker  from '../LanguagePicker';
import { s }           from './styles';

const STATE   = { BOOT: 'boot', READY: 'ready', SCANNING: 'scanning', SPEAKING: 'speaking', ERROR: 'error' };
const BRACKETS = ['TL', 'TR', 'BL', 'BR'];

// Single easing used throughout — smooth, fast
const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

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

    const modelState = useModelState({ speak, lang });

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
    const speakTimer = useRef(null);
    const stateRef   = useRef(STATE.BOOT);
    const bootSpoken = useRef(false);

    useEffect(() => { stateRef.current = appState; }, [appState]);
    useEffect(() => () => { isMounted.current = false; }, []);

    const { watching, toggleWatch, stopWatch } = useWatchMode({ cameraRef, detect, speak, lang, isConnected });
    const watchingRef = useRef(watching);
    useEffect(() => { watchingRef.current = watching; }, [watching]);

    const { priorityHapticsEnabled, togglePriorityHaptics } = useSettings();

    // ── Animations ────────────────────────────────────────────────────────────
    // Kept: screen fade-in, result fade-in, pulse opacity, watch opacity, model pill
    // Removed: scan line sweep, bracket stagger, modeAnim translateY, pulseScale,
    //          scanLineOp, resultSlide — all simplified to opacity only

    const pulseOpacity  = useRef(new Animated.Value(0.35)).current;
    const pulseLoop     = useRef(null);

    const watchOpacity  = useRef(new Animated.Value(0.25)).current;
    const watchLoop     = useRef(null);

    const resultOpacity = useRef(new Animated.Value(0)).current;

    const screenOp      = useRef(new Animated.Value(0)).current;
    const modelPillOp   = useRef(new Animated.Value(0)).current;

    // modeAnim: kept for ModeBanner API compat, but driven as opacity 0→-8→0
    // We just reset it to 0 instantly — no translateY in new ModeBanner
    const modeAnim      = useRef(new Animated.Value(0)).current;

    // Scan line opacity flash — replace sweep with simple pulse
    const scanLineOp    = useRef(new Animated.Value(0)).current;
    const scanLineAnim  = useRef(new Animated.Value(0)).current; // kept for API compat, static

    useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReducedMo); }, []);

    // Screen fade-in
    useEffect(() => {
        Animated.timing(screenOp, {
            toValue: 1, duration: 400,
            easing: EASE_OUT, useNativeDriver: true,
        }).start();
    }, []); // eslint-disable-line

    // Model pill
    useEffect(() => {
        if (modelState === 'loading') {
            Animated.timing(modelPillOp, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        } else if (modelState === 'ready' || modelState === 'error') {
            Animated.timing(modelPillOp, { toValue: 0, duration: 500, delay: 1200, useNativeDriver: true }).start();
        }
    }, [modelState]); // eslint-disable-line

    // Watch ring — gentle opacity pulse
    useEffect(() => {
        if (watching && !reducedMo) {
            watchLoop.current?.stop();
            watchLoop.current = Animated.loop(Animated.sequence([
                Animated.timing(watchOpacity, { toValue: 0.7, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(watchOpacity, { toValue: 0.1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ]));
            watchLoop.current.start();
        } else {
            watchLoop.current?.stop();
            Animated.timing(watchOpacity, { toValue: 0.25, duration: 300, useNativeDriver: true }).start();
        }
        return () => watchLoop.current?.stop();
    }, [watching, reducedMo]); // eslint-disable-line

    // Ready dot — opacity only pulse
    const startPulse = useCallback(() => {
        if (reducedMo) { pulseOpacity.setValue(0.6); return; }
        pulseLoop.current?.stop();
        pulseLoop.current = Animated.loop(Animated.sequence([
            Animated.timing(pulseOpacity, { toValue: 0.9, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.2, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]));
        pulseLoop.current.start();
    }, [reducedMo, pulseOpacity]);

    const stopPulse = useCallback(() => {
        pulseLoop.current?.stop();
        pulseOpacity.setValue(0);
    }, [pulseOpacity]);

    // Scan "animation" — just flash the line opacity once then keep it faint
    const startScanAnim = useCallback(() => {
        scanLineAnim.setValue(0.5); // static midpoint — no sweep
        if (reducedMo) { scanLineOp.setValue(0.6); return; }
        Animated.timing(scanLineOp, { toValue: 0.5, duration: 200, useNativeDriver: true }).start();
    }, [reducedMo, scanLineOp, scanLineAnim]);

    const stopScanAnim = useCallback(() => {
        scanLineOp.setValue(0);
        scanLineAnim.setValue(0);
    }, [scanLineOp, scanLineAnim]);

    // Result — fade only
    const animateResult = useCallback(() => {
        resultOpacity.setValue(0);
        Animated.timing(resultOpacity, {
            toValue: 1, duration: 240,
            easing: EASE_OUT, useNativeDriver: true,
        }).start();
    }, [resultOpacity]);

    // Mode change — no bounce, just a subtle opacity dip handled by ModeBanner
    const animateMode = useCallback(() => {
        // Brief dip then restore — ModeBanner reads this as opacity
        modeAnim.setValue(-8);
        Animated.timing(modeAnim, {
            toValue: 0, duration: 180,
            easing: EASE_OUT, useNativeDriver: true,
        }).start();
    }, [modeAnim]);

    // Boot
    const startPulseRef = useRef(startPulse);
    useEffect(() => { startPulseRef.current = startPulse; }, [startPulse]);
    useEffect(() => {
        if (bootSpoken.current) return;
        bootSpoken.current = true;
        const ms = MODES_STRINGS[lang]?.[currentMode.id] ?? MODES_STRINGS.en[currentMode.id];
        setAppState(STATE.READY);
        startPulseRef.current?.();
        setTimeout(() => speakRef.current(tRef.current('ready', ms.label, ms.hint), 'high'), 200);
    }, []); // eslint-disable-line

    useEffect(() => {
        if (!permission) return;
        if (!permission.granted) requestPermission().then(r => { if (!r.granted) speak(t('no_permission'), 'high'); });
    }, [permission]); // eslint-disable-line

    // ── Core scan ─────────────────────────────────────────────────────────────
    const runScan = useCallback(async () => {
        if ((stateRef.current !== STATE.READY && stateRef.current !== STATE.SPEAKING) || !cameraRef.current || watchingRef.current) return;
        clearTimeout(speakTimer.current);
        setAppState(STATE.SCANNING);
        stopPulse(); startScanAnim();
        speak(t('scanning'), 'high');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true, quality: 0.15, skipProcessing: true, shutterSound: false,
            });
            if (!photo?.base64) throw new Error('capture failed');

            let base64ForDetection = photo.base64;
            try {
                const ImageManipulator = require('expo-image-manipulator');
                const resized = await ImageManipulator.manipulateAsync(
                    photo.uri,
                    [{ resize: { width: 1024 } }],
                    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.25, base64: true },
                );
                base64ForDetection = resized.base64;
            } catch (_) {}

            const { result, source } = await detect(base64ForDetection, currentMode.id, isConnected, lang);
            if (!isMounted.current) return;
            setLastResult(result); setLastSource(source);
            setAppState(STATE.SPEAKING); setScanCount(c => c + 1);
            stopScanAnim(); animateResult();

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            if (priorityHapticsEnabled) {
                const priority = classifyResult(result);
                await playPriorityHaptic(priority);
            }
            speak(result, 'high');
            speakTimer.current = setTimeout(() => { if (isMounted.current) { setAppState(STATE.READY); startPulse(); } },
                Math.max(2500, (result.length / 14) * 1000));
        } catch {
            if (!isMounted.current) return;
            stopScanAnim(); setAppState(STATE.ERROR);
            speak(t('cant_scan'), 'high');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            speakTimer.current = setTimeout(() => { if (isMounted.current) { setAppState(STATE.READY); startPulse(); } }, 1800);
        }
    }, [currentMode, isConnected, lang, detect, speak, t, startScanAnim, stopScanAnim, startPulse, stopPulse, animateResult, priorityHapticsEnabled]);

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

    const handleWatchToggle = useCallback(() => { if (autoScan) setAutoScan(false); toggleWatch(); }, [toggleWatch, autoScan]);
    const openSettings  = useCallback(() => setShowSettings(true), []);
    const closeSettings = useCallback(() => { setShowSettings(false); speak(t('settings_closed'), 'high'); }, [speak, t]);

    const handleRepeatTour = useCallback(() => {
        setShowSettings(false);
        if (watchingRef.current) stopWatch();
        setAutoScan(false); clearInterval(autoTimer.current);
        clearTimeout(speakTimer.current);
        stop();
        setTimeout(() => { speak(t('tour_restarting'), 'high'); setTimeout(() => onResetOnboarding(), 800); }, 100);
    }, [speak, stop, t, onResetOnboarding, stopWatch]);

    const handleChangeLang = useCallback(() => { setShowSettings(false); setTimeout(() => setShowLangPicker(true), 400); }, []);

    const handleLangPickerComplete = useCallback(async (chosenLang) => {
        setShowLangPicker(false);
        // null = user cancelled via triple tap in LanguagePicker
        if (!chosenLang) return;
        stop();
        await onChooseLang(chosenLang);
        const msg = chosenLang === 'ar' ? normalizeArabicForTTS('تمَّ تغيير اللغة.') : 'Language changed.';
        setTimeout(() => speak(msg, 'high'), 80);
    }, [onChooseLang, stop, speak]);

    const handleRepeat = useCallback(() => {
        if (!lastResult) { speak(t('repeat_empty'), 'high'); return; }
        speak(lastResult, 'high'); Haptics.selectionAsync();
    }, [lastResult, speak, t]);

    const modeAnnounce = useCallback((mode) => {
        const ms = (MODES_STRINGS[lang] ?? MODES_STRINGS.en)[mode.id];
        speak(`${ms.label}. ${ms.hint}`, 'high'); animateMode(); Haptics.selectionAsync();
    }, [lang, speak, animateMode]);

    const handleNextMode  = useCallback(() => modeAnnounce(nextMode()), [nextMode, modeAnnounce]);
    const handlePrevMode  = useCallback(() => modeAnnounce(prevMode()), [prevMode, modeAnnounce]);
    const handleCycleMode = useCallback(() => {
        if (stateRef.current === STATE.READY && !autoScan) openSettings();
            else modeAnnounce(cycleMode());
    }, [cycleMode, modeAnnounce, openSettings, autoScan]);

    const handleDoubleTap = useCallback(() => {
        if (watching) { stopWatch(); return; }
        if (autoScan) { toggleAutoScan(); return; }
        runScan();
    }, [watching, stopWatch, autoScan, toggleAutoScan, runScan]);

    const gestureHandlers = useGestures({
        onScan: handleDoubleTap, onRepeat: handleRepeat, onCycleMode: handleCycleMode,
        onNextMode: handleNextMode, onPrevMode: handlePrevMode, onWatchToggle: handleWatchToggle,
        enabled: (appState === STATE.READY || appState === STATE.SPEAKING || watching) && !showSettings && !showLangPicker,
        isRTL,
    });

    // ── Derived ───────────────────────────────────────────────────────────────
    const modeColor   = MODE_COLORS[currentMode.id] || CYAN;
    const activeColor = watching ? GREEN : modeColor;
    const isRTL       = lang === 'ar';
    const modeStrings = MODES_STRINGS[lang] || MODES_STRINGS.en;

    // Static midpoint for scan line (no sweep)
    const scanLineY = scanLineAnim.interpolate({
        inputRange: [0, 1], outputRange: ['45%', '55%'],
    });

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
                <TouchableOpacity
                    style={[s.permBtn, { backgroundColor: activeColor }]}
                    onPress={requestPermission}
                >
                    <Text style={s.permBtnText}>{t('perm_button')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <Animated.View style={[s.root, { opacity: screenOp }]} {...gestureHandlers}>
            <StatusBar hidden />

            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="back"
                onCameraReady={() => {}}
                onMountError={() => {
                    speak(lang === 'ar' ? 'تعذّر تشغيل الكاميرا.' : 'Camera failed.', 'high');
                }}
            />

            {/* Mode tint — very subtle */}
            <View style={[s.overlay, { backgroundColor: activeColor + '06' }]} />

            {/* Vignettes */}
            <View style={s.vignetteTop} />
            <View style={s.vignetteBottom} />

            {/* Corner brackets — static, no stagger, no shadow */}
            {BRACKETS.map((pos) => (
                <View key={pos} style={[
                    s['bracket' + pos],
                    { borderColor: (watching ? GREEN : modeColor) + '45' },
                ]} />
            ))}

            {/* Scan line — static position, just an opacity flash */}
            {appState === STATE.SCANNING && (
                <Animated.View style={[
                    s.scanLine,
                    {
                        backgroundColor: modeColor + '90',
                        opacity: scanLineOp,
                        top: '48%',
                    },
                ]} />
            )}

            <TopBar isConnected={isConnected} scanCount={scanCount} isRTL={isRTL} />
            <ModeBanner
                modeIndex={modeIndex}
                modeAnim={modeAnim}
                watching={watching}
                modeStrings={modeStrings}
                isRTL={isRTL}
            />
            <CenterState
                appState={appState}
                activeColor={activeColor}
                modeColor={modeColor}
                pulseOpacity={pulseOpacity}
                pulseScale={pulseOpacity} // pass same value — CenterState doesn't use scale now
                watchOpacity={watchOpacity}
                watching={watching}
                autoScan={autoScan}
                isRTL={isRTL}
            />
            <BottomPanel
                lastResult={lastResult}
                lastSource={lastSource}
                appState={appState}
                activeColor={activeColor}
                watching={watching}
                autoScan={autoScan}
                isRTL={isRTL}
                resultOpacity={resultOpacity}
                resultSlide={resultOpacity} // unused in new BottomPanel
                t={t}
            />

            {/* Model loading pill */}
            <Animated.View style={[s.modelPill, { opacity: modelPillOp }]}>
                <View style={[s.modelDot, {
                    backgroundColor:
                        modelState === 'error' ? '#FF4455'
                        : modelState === 'ready' ? '#4EDBA0'
                        : '#F0A830',
                }]} />
                <Text style={s.modelTxt}>
                    {modelState === 'loading'
                        ? (isRTL ? 'تحميل النموذج…' : 'Loading model…')
                        : modelState === 'ready'
                            ? (isRTL ? 'النموذج جاهز' : 'Model ready')
                            : (isRTL ? 'النموذج غير متاح' : 'Model unavailable')}
                </Text>
            </Animated.View>

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

            {showLangPicker && <LanguagePicker onComplete={handleLangPickerComplete} />}
        </Animated.View>
    );
}
