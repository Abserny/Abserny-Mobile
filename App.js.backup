import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet, View, Text, Animated,
    Platform, StatusBar, Vibration,
    PanResponder,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as Speech from 'expo-speech';

const GEMINI_KEY = 'AIzaSyBEh0twjrJ1zRbB4QZ73wFb0uBFRU1_uD8';

const STATES = { IDLE: 'IDLE', SCANNING: 'SCANNING', SPEAKING: 'SPEAKING' };

const speak = (text) => new Promise((resolve) => {
    Speech.stop();
    Speech.speak(text, { language: 'en-US', rate: 0.88, pitch: 1.0, onDone: resolve, onError: resolve });
});

export default function App() {
    const [state, setState]       = useState(STATES.IDLE);
    const [feedback, setFeedback] = useState('double tap anywhere to scan');
    const stateRef    = useRef(STATES.IDLE);
    const lastTap     = useRef(0);
    const cameraRef   = useRef(null);
    const reminderRef = useRef(null);
    const scanAnim    = useRef(new Animated.Value(0)).current;

    useEffect(() => { stateRef.current = state; }, [state]);

    // ── Reminder loop ─────────────────────────────────────────────────────────
    const startReminder = useCallback(() => {
        stopReminder();
        reminderRef.current = setInterval(() => {
            if (stateRef.current === STATES.IDLE) {
                Speech.speak('Double tap anywhere to scan your surroundings.', {
                    language: 'en-US', rate: 0.88,
                });
            }
        }, 35000);
    }, []);

    const stopReminder = useCallback(() => {
        if (reminderRef.current) {
            clearInterval(reminderRef.current);
            reminderRef.current = null;
        }
    }, []);

    // ── Boot ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try { await Camera.requestCameraPermissionsAsync(); } catch (_) {}
            setTimeout(async () => {
                await speak('Abserny ready. Double tap anywhere to scan your surroundings.');
                startReminder();
            }, 800);
        })();
        return () => stopReminder();
    }, []);

    // ── Scan animation ────────────────────────────────────────────────────────
    useEffect(() => {
        if (state === STATES.SCANNING) {
            Animated.loop(Animated.sequence([
                Animated.timing(scanAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(scanAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
            ])).start();
        } else {
            scanAnim.stopAnimation();
            scanAnim.setValue(0);
        }
    }, [state]);

    // ── Gemini vision ─────────────────────────────────────────────────────────
    const detectObjects = useCallback(async () => {
        if (!cameraRef.current) {
            console.log('No camera ref');
            return '';
        }
        console.log('Taking photo...');
        const photo = await cameraRef.current.takePictureAsync({
            base64: true, quality: 0.15, skipProcessing: true,
        });
        console.log('Photo taken, size:', photo.base64.length);

        console.log('Calling Gemini...');
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { inline_data: { mime_type: 'image/jpeg', data: photo.base64 } },
                            { text: 'List the main objects you see. Reply with ONLY a short comma-separated list, max 5 items, nothing else.' },
                        ]
                    }]
                }),
            }
        );
        const data = await response.json();
        console.log('Gemini raw:', JSON.stringify(data).slice(0, 200));
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return text.trim();
    }, []);

    // ── Main scan flow ────────────────────────────────────────────────────────
    const runScan = useCallback(async () => {
        if (stateRef.current !== STATES.IDLE) return;

        stopReminder();
        setState(STATES.SCANNING);
        setFeedback('opening camera...');
        Vibration.vibrate([0, 60, 40, 60]);

        await speak('Scanning. Please hold still.');
        await new Promise(r => setTimeout(r, 1500));

        setFeedback('analyzing image...');
        await speak('Analyzing what I see.');

        let result = '';
        try {
            result = await Promise.race([
                detectObjects(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
            ]);
        } catch (e) {
            console.log('Detection error:', e.message);
        }

        if (!result) {
            setFeedback('could not detect anything');
            await speak('Sorry, I could not detect anything. Please try again.');
            setState(STATES.IDLE);
            setFeedback('double tap anywhere to scan');
            startReminder();
            return;
        }

        setState(STATES.SPEAKING);
        setFeedback(result);
        await speak(`I can see ${result}`);

        setState(STATES.IDLE);
        setFeedback('double tap anywhere to scan');
        startReminder();
    }, [detectObjects, startReminder, stopReminder]);

    // ── Gesture ───────────────────────────────────────────────────────────────
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                const now = Date.now();
                if (now - lastTap.current < 300) runScan();
                lastTap.current = now;
            },
        })
    ).current;

    const scanOpacity = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
    const isScanning  = state === STATES.SCANNING;
    const isSpeaking  = state === STATES.SPEAKING;

    return (
        <View style={s.root} {...panResponder.panHandlers}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {(isScanning || isSpeaking) && (
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
            )}

            <View style={[s.overlay, { backgroundColor: isScanning ? 'rgba(0,0,0,0.55)' : '#000' }]} />

            {isScanning && (
                <>
                    <Animated.View style={[s.scanLine, { opacity: scanOpacity }]} />
                    <View style={[s.corner, s.cornerTL]} />
                    <View style={[s.corner, s.cornerTR]} />
                    <View style={[s.corner, s.cornerBL]} />
                    <View style={[s.corner, s.cornerBR]} />
                </>
            )}

            <View style={s.content}>
                <View style={s.topArea}>
                    <Text style={s.appName}>ABSERNY</Text>
                    <Text style={s.tagline}>vision assistant</Text>
                </View>

                <View style={s.centerArea}>
                    {state === STATES.IDLE && (
                        <View style={s.idleRing}>
                            <View style={s.idleDot} />
                        </View>
                    )}
                    {isScanning && (
                        <Animated.Text style={[s.scanningText, { opacity: scanOpacity }]}>
                            SCANNING
                        </Animated.Text>
                    )}
                    {isSpeaking && (
                        <View style={s.speakingDots}>
                            {[0, 1, 2].map(i => <View key={i} style={s.speakDot} />)}
                        </View>
                    )}
                </View>

                <View style={s.bottomArea}>
                    <Text style={[s.feedback, isSpeaking && s.feedbackActive]}>
                        {feedback}
                    </Text>
                    {state === STATES.IDLE && (
                        <Text style={s.hint}>↑ double tap screen</Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root:          { flex: 1, backgroundColor: '#000' },
    overlay:       { ...StyleSheet.absoluteFillObject },
    content:       { flex: 1, justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 52, paddingHorizontal: 32, zIndex: 10 },
    scanLine:      { position: 'absolute', left: 40, right: 40, top: '50%', height: 1, backgroundColor: '#00BFFF', zIndex: 5 },
    corner:        { position: 'absolute', width: 28, height: 28, zIndex: 5 },
    cornerTL:      { top: 80, left: 32, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#00BFFF' },
    cornerTR:      { top: 80, right: 32, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#00BFFF' },
    cornerBL:      { bottom: 120, left: 32, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#00BFFF' },
    cornerBR:      { bottom: 120, right: 32, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#00BFFF' },
    topArea:       { alignItems: 'flex-start' },
    appName:       { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 6 },
    tagline:       { color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: 3, marginTop: 2 },
    centerArea:    { alignItems: 'center', justifyContent: 'center', flex: 1 },
    idleRing:      { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    idleDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
    scanningText:  { color: '#00BFFF', fontSize: 12, fontWeight: '700', letterSpacing: 8 },
    speakingDots:  { flexDirection: 'row', gap: 8 },
    speakDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00BFFF' },
    bottomArea:    { alignItems: 'center' },
    feedback:      { color: 'rgba(255,255,255,0.55)', fontSize: 15, textAlign: 'center', lineHeight: 22 },
    feedbackActive:{ color: '#fff', fontSize: 17 },
    hint:          { color: 'rgba(255,255,255,0.2)', fontSize: 11, letterSpacing: 2, marginTop: 12 },
});
