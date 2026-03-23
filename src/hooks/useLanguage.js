/**
 * hooks/useLanguage.js
 * Language state + persistence. No string literals — all copy lives in i18n/.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STRINGS } from '../i18n';

const KEY_LANG      = 'abserny_language';
const KEY_ONBOARDED = 'abserny_onboarded';
const KEY_MODE      = 'abserny_mode_index';

export function useLanguage() {
    const [lang,      setLang]      = useState(null);
    const [onboarded, setOnboarded] = useState(false);
    const [loaded,    setLoaded]    = useState(false);

    useEffect(() => {
        Promise.all([
            AsyncStorage.getItem(KEY_LANG),
            AsyncStorage.getItem(KEY_ONBOARDED),
        ])
            .then(([savedLang, savedOnboarded]) => {
                setLang(savedLang || null);
                setOnboarded(savedOnboarded === 'true');
            })
            .catch(() => { setLang('en'); setOnboarded(false); })
            .finally(() => setLoaded(true));
    }, []);

    const chooseLang = useCallback(async (code) => {
        await AsyncStorage.setItem(KEY_LANG, code);
        setLang(code);
        // RTL handled per-component — no I18nManager or reloadApp needed.
    }, []);

    const completeOnboarding = useCallback(async () => {
        await AsyncStorage.setItem(KEY_ONBOARDED, 'true');
        setOnboarded(true);
    }, []);

    const resetOnboarding = useCallback(async () => {
        await AsyncStorage.removeItem(KEY_ONBOARDED);
        setOnboarded(false);
    }, []);

    const resetLanguage = useCallback(async () => {
        await AsyncStorage.multiRemove([KEY_LANG, KEY_ONBOARDED, KEY_MODE]);
        setLang(null);
        setOnboarded(false);
    }, []);

    const t = useCallback((key, ...args) => {
        const strings = STRINGS[lang ?? 'en'] ?? STRINGS.en;
        const val = strings[key];
        if (typeof val === 'function') return val(...args);
        return val ?? key;
    }, [lang]);

    return {
        lang, loaded, onboarded,
        chooseLang, completeOnboarding, resetOnboarding, resetLanguage, t,
        strings: STRINGS[lang] ?? STRINGS.en,
    };
}
