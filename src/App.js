/**
 * src/App.js
 * Root router — decides which screen to show.
 *
 * isRepeatTour: set to true when the user triggers "Repeat tutorial" from
 * Settings. This flag is passed to OnboardingScreen so it can:
 *   - Announce the skip option at the start
 *   - Show "double tap to skip" hint on non-waiting steps
 * It resets to false after onboarding completes so a subsequent repeat
 * from Settings always starts fresh.
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import { useLanguage }    from './hooks/useLanguage';
import OnboardingScreen   from './screens/OnboardingScreen';
import MainScreen         from './screens/MainScreen';
import { BG }             from './constants/colors';

export default function App() {
    const {
        lang, loaded, onboarded,
        chooseLang, completeOnboarding, resetOnboarding, t,
    } = useLanguage();

    // True only when repeat was triggered from Settings — not on first-time run
    const [isRepeatTour, setIsRepeatTour] = useState(false);

    const handleResetOnboarding = async () => {
        setIsRepeatTour(true);
        await resetOnboarding();
    };

    // Blank screen while AsyncStorage loads (usually < 30ms)
    if (!loaded) return <View style={{ flex: 1, backgroundColor: BG }} />;

    // Show onboarding if language not chosen or tutorial not completed
    if (!lang || !onboarded) {
        return (
            <OnboardingScreen
                initialPhase={lang && !onboarded ? 'tutorial' : 'language'}
                initialLang={lang || 'en'}
                isRepeat={isRepeatTour}
                onComplete={async (chosenLang) => {
                    setIsRepeatTour(false);   // reset for next time
                    await chooseLang(chosenLang);
                    await completeOnboarding();
                    // No I18nManager or reload — RTL is per-component.
                }}
            />
        );
    }

    return (
        <MainScreen
            lang={lang}
            t={t}
            onChooseLang={chooseLang}
            onResetOnboarding={handleResetOnboarding}
        />
    );
}
