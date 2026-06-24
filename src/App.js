/**
 * src/App.js
 * Root router — decides which screen to show.
 *
 * BOOT FLOW:
 *   1. App mounts → showBoot = true → <BootScreen> plays (~2.8s)
 *   2. BootScreen calls onDone() → showBoot = false
 *   3. Normal routing resumes (onboarding or main screen)
 *
 *   BootScreen is only shown on cold start (component mount).
 *   Navigating between onboarding ↔ main does NOT re-show it.
 *
 * isRepeatTour: set to true when the user triggers "Repeat tutorial" from
 * Settings. Resets to false after onboarding completes.
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import { useLanguage }    from './hooks/useLanguage';
import OnboardingScreen   from './screens/OnboardingScreen';
import MainScreen         from './screens/MainScreen';
import BootScreen         from './screens/BootScreen';
import { BG }             from './constants/colors';

export default function App() {
    const {
        lang, loaded, onboarded,
        chooseLang, completeOnboarding, resetOnboarding, t,
    } = useLanguage();

    const [showBoot,     setShowBoot]     = useState(true);
    const [isRepeatTour, setIsRepeatTour] = useState(false);

    const handleResetOnboarding = async () => {
        setIsRepeatTour(true);
        await resetOnboarding();
    };

    // ── Boot animation plays first, always ───────────────────────────────────
    // It runs in parallel with AsyncStorage loading (useLanguage).
    // By the time it finishes (~2.8s), `loaded` is almost certainly true.
    if (showBoot) {
        return <BootScreen onDone={() => setShowBoot(false)} />;
    }

    // ── Blank screen while AsyncStorage loads (usually < 30ms) ──────────────
    if (!loaded) return <View style={{ flex: 1, backgroundColor: BG }} />;

    // ── Onboarding ───────────────────────────────────────────────────────────
    if (!lang || !onboarded) {
        return (
            <OnboardingScreen
                initialPhase={lang && !onboarded ? 'tutorial' : 'language'}
                initialLang={lang || 'en'}
                isRepeat={isRepeatTour}
                onComplete={async (chosenLang) => {
                    setIsRepeatTour(false);
                    await chooseLang(chosenLang);
                    await completeOnboarding();
                }}
            />
        );
    }

    // ── Main app ─────────────────────────────────────────────────────────────
    return (
        <MainScreen
            lang={lang}
            t={t}
            onChooseLang={chooseLang}
            onResetOnboarding={handleResetOnboarding}
        />
    );
}
