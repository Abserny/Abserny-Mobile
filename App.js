import React, {
    useState, useRef, useEffect, useCallback,
} from 'react';
import {
    View, Text, StyleSheet, Animated,
    StatusBar, AccessibilityInfo,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { useVoice }     from './hooks/useVoice';
import { useGestures }  from './hooks/useGestures';
import { useDetection } from './hooks/useDetection';
import { useModes }     from './hooks/useModes';

const STATE = {
    BOOT:     'boot',
    READY:    'ready',
    SCANNING: 'scanning',
    SPEAKING: 'speaking',
    ERROR:    'error',
};

export default function App() {

    const [permission, requestPermission] = useCameraPermissions();

    const [appState,      setAppState]      = useState(STATE.BOOT);
    const [lastResult,    setLastResult]    = useState('');
    const [isConnected,   setIsConnected]   = useState(true);
    const [reducedMotion, setReducedMotion] = useState(false);

    const { speak, stop }  = useVoice();
    const { detect }       = useDetection();
    const { currentMode, nextMode, prevMode, cycleMode } = useModes();

    const cameraRef = useRef(null);
    const scanAnim  = useRef(new Animated.Value(0)).current;
    const scanLoop  = useRef(null);
    const isMounted = useRef(true);

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    }, []);

    // Network check — no native module needed
    useEffect(() => {
        const check = () => {
            fetch('https://dns.google', { method: 'HEAD' })
                .then(() => setIsConnected(true))
                .catch(() => setIsConnected(false));
        };
        check();
        const iv = setInterval(check, 15000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        if (!permission) return;

        if (!permission.granted) {
            requestPermission().then(result => {
                if (!result.granted) {
                    speak('Camera permission is required. Please allow camera access in your phone settings.', 'high');
                }
            });
            return;
        }

        const t = setTimeout(() => {
            if (!isMounted.current) return;
            setAppState(STATE.READY);
            speak(
                `Abserny ready. ${currentMode.label}. ` +
                    `${isConnected ? '' : 'Offline mode. '}` +
                    `${currentMode.instruction}`,
                'high'
            );
        }, 800);

        return () => clearTimeout(t);
    }, [permission?.granted]);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const startScanAnim = useCallback(() => {
        if (reducedMotion) return;
        scanAnim.setValue(0);
        scanLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
                Animated.timing(scanAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
            ])
        );
        scanLoop.current.start();
    }, [reducedMotion, scanAnim]);

    const stopScanAnim = useCallback(() => {
        scanLoop.current?.stop();
        scanAnim.setValue(0);
    }, [scanAnim]);

    const runScan = useCallback(async () => {
        if (appState !== STATE.READY) return;
        if (!cameraRef.current) return;

        setAppState(STATE.SCANNING);
        startScanAnim();
        speak('Scanning.', 'high');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.25,
                skipProcessing: true,
                shutterSound: false,
            });

            speak('Analyzing.');

            const { result, source } = await detect(photo.base64, currentMode.id, isConnected);

            if (!isMounted.current) return;

            setLastResult(result);
            setAppState(STATE.SPEAKING);
            stopScanAnim();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            const prefix = source === 'offline' ? 'Offline. ' : '';
            speak(prefix + result, 'high');

            setTimeout(() => {
                if (isMounted.current) setAppState(STATE.READY);
            }, (result.length / 10) * 1000 + 2500);

        } catch (err) {
            if (!isMounted.current) return;
            stopScanAnim();
            setAppState(STATE.ERROR);
            speak("Couldn't scan. Please try again.", 'high');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => { if (isMounted.current) setAppState(STATE.READY); }, 2000);
        }
    }, [appState, currentMode, isConnected, detect, speak, startScanAnim, stopScanAnim]);

    const handleRepeat = useCallback(() => {
        if (!lastResult) { speak('Nothing to repeat.', 'high'); return; }
        speak(lastResult, 'high');
        Haptics.selectionAsync();
    }, [lastResult, speak]);

    const handleNextMode = useCallback(() => {
        const mode = nextMode();
        speak(`${mode.label}. ${mode.instruction}`, 'high');
        Haptics.selectionAsync();
    }, [nextMode, speak]);

    const handlePrevMode = useCallback(() => {
        const mode = prevMode();
        speak(`${mode.label}. ${mode.instruction}`, 'high');
        Haptics.selectionAsync();
    }, [prevMode, speak]);

    const handleCycleMode = useCallback(() => {
        const mode = cycleMode();
        speak(`${mode.label}. ${mode.instruction}`, 'high');
        Haptics.selectionAsync();
    }, [cycleMode, speak]);

    const gestureHandlers = useGestures({
        onScan:      runScan,
        onRepeat:    handleRepeat,
        onCycleMode: handleCycleMode,
        onNextMode:  handleNextMode,
        onPrevMode:  handlePrevMode,
        enabled:     appState === STATE.READY || appState === STATE.SPEAKING,
    });

    const { height: SCREEN_H } = require('react-native').Dimensions.get('window');
    const scanLineY = scanAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: [SCREEN_H * 0.10, SCREEN_H * 0.88],
    });

    if (!permission) return <View style={styles.root} />;

    if (!permission.granted) {
        return (
            <View style={styles.root} accessibilityLabel="Camera permission required">
                <Text style={styles.permText}>
                    Camera permission required.{'\n'}
                    Please allow access in Settings.
                </Text>
            </View>
        );
    }

    const isScanning = appState === STATE.SCANNING;
    const isSpeaking = appState === STATE.SPEAKING;

    return (
        <View style={styles.root} {...gestureHandlers}>
            <StatusBar hidden />

            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="back"
                accessibilityLabel="Camera view"
            />

            <View style={styles.overlay} />

            <View style={styles.bracketTL} />
            <View style={styles.bracketTR} />
            <View style={styles.bracketBL} />
            <View style={styles.bracketBR} />

            {isScanning && (
                <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]} />
            )}

            <View style={styles.topBar}>
                <Text style={styles.appName} accessibilityRole="header">ABSERNY</Text>
                <View style={styles.statusRow}>
                    <View style={[
                        styles.statusDot,
                        isScanning && styles.dotScanning,
                        isSpeaking && styles.dotSpeaking,
                        appState === STATE.READY && styles.dotReady,
                    ]} />
                    <Text style={styles.modeLabel}>{currentMode.label.toUpperCase()}</Text>
                    {!isConnected && <Text style={styles.offlineBadge}>OFFLINE</Text>}
                </View>
            </View>

            <View style={styles.centerArea} pointerEvents="none">
                {isScanning && (
                    <Text style={styles.scanningLabel} accessibilityLiveRegion="polite">
                        SCANNING
                    </Text>
                )}
                {isSpeaking && (
                    <View style={styles.speakDots}>
                        <SpeakDot delay={0} />
                        <SpeakDot delay={150} />
                        <SpeakDot delay={300} />
                    </View>
                )}
                {appState === STATE.READY && (
                    <View style={styles.readyRing} />
                )}
            </View>

            <View style={styles.bottomBar}>
                {lastResult ? (
                    <Text
                        style={styles.resultText}
                        accessibilityLiveRegion="polite"
                        accessibilityLabel={`Last result: ${lastResult}`}
                        numberOfLines={3}
                    >
                        {lastResult}
                    </Text>
                ) : null}
                <Text style={styles.hintText}>
                    {appState === STATE.READY ? 'DOUBLE TAP TO SCAN' : ''}
                </Text>
            </View>
        </View>
    );
}

function SpeakDot({ delay }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: -10, duration: 350, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0,   duration: 350, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <Animated.View style={[styles.speakDot, { transform: [{ translateY: anim }] }]} />
    );
}

const CYAN    = '#00BFFF';
const BRACKET = 28;
const BW      = 2.5;

const styles = StyleSheet.create({
    root:    { flex: 1, backgroundColor: '#000' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
    permText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 120, paddingHorizontal: 40, lineHeight: 28 },

    bracketTL: { position:'absolute', top:22, left:22,    width:BRACKET, height:BRACKET, borderTopWidth:BW,    borderLeftWidth:BW,  borderColor:CYAN },
    bracketTR: { position:'absolute', top:22, right:22,   width:BRACKET, height:BRACKET, borderTopWidth:BW,    borderRightWidth:BW, borderColor:CYAN },
    bracketBL: { position:'absolute', bottom:22, left:22,  width:BRACKET, height:BRACKET, borderBottomWidth:BW, borderLeftWidth:BW,  borderColor:CYAN },
    bracketBR: { position:'absolute', bottom:22, right:22, width:BRACKET, height:BRACKET, borderBottomWidth:BW, borderRightWidth:BW, borderColor:CYAN },

    scanLine: {
        position:'absolute', top:0, left:22, right:22, height:1.5,
        backgroundColor:CYAN, shadowColor:CYAN,
        shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:6, elevation:6,
    },

    topBar:      { position:'absolute', top:52, left:0, right:0, alignItems:'center', gap:6 },
    appName:     { color:'#fff', fontSize:13, letterSpacing:8, fontWeight:'800' },
    statusRow:   { flexDirection:'row', alignItems:'center', gap:8 },
    statusDot:   { width:6, height:6, borderRadius:3, backgroundColor:'rgba(255,255,255,0.3)' },
    dotReady:    { backgroundColor:'#00C896' },
    dotScanning: { backgroundColor:CYAN },
    dotSpeaking: { backgroundColor:'#fff' },
    modeLabel:   { color:CYAN, fontSize:9, letterSpacing:4 },
    offlineBadge:{ color:'#FF9F1C', fontSize:9, letterSpacing:3, borderWidth:1, borderColor:'#FF9F1C', paddingHorizontal:6, paddingVertical:1 },

    centerArea:    { ...StyleSheet.absoluteFillObject, alignItems:'center', justifyContent:'center' },
    readyRing:     { width:56, height:56, borderRadius:28, borderWidth:1, borderColor:'rgba(0,191,255,0.3)' },
    scanningLabel: { color:CYAN, fontSize:11, letterSpacing:8, fontWeight:'700' },
    speakDots:     { flexDirection:'row', gap:10, alignItems:'center' },
    speakDot:      { width:10, height:10, borderRadius:5, backgroundColor:CYAN },

    bottomBar:  { position:'absolute', bottom:52, left:32, right:32, alignItems:'center', gap:12 },
    resultText: { color:'rgba(255,255,255,0.85)', fontSize:16, textAlign:'center', lineHeight:24 },
    hintText:   { color:'rgba(255,255,255,0.18)', fontSize:10, letterSpacing:4 },
});
