/**
 * hooks/useSettings.js
 * Persists user preferences to AsyncStorage.
 * Currently manages: priority haptics on/off.
 * Easy to extend: add new keys following the same pattern.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_HAPTICS = 'abserny_priority_haptics';

// Default: ON — new users get the full experience immediately.
// They can turn it off if they find it distracting.
const DEFAULT_HAPTICS = true;

export function useSettings() {
    const [priorityHapticsEnabled, setPriorityHapticsEnabled] = useState(DEFAULT_HAPTICS);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(KEY_HAPTICS)
            .then(val => {
                // null = never set → use default
                if (val !== null) setPriorityHapticsEnabled(val === 'true');
            })
            .catch(() => {})
            .finally(() => setLoaded(true));
    }, []);

    const togglePriorityHaptics = useCallback(async () => {
        const next = !priorityHapticsEnabled;
        setPriorityHapticsEnabled(next);
        await AsyncStorage.setItem(KEY_HAPTICS, String(next)).catch(() => {});
        return next;
    }, [priorityHapticsEnabled]);

    return {
        loaded,
        priorityHapticsEnabled,
        togglePriorityHaptics,
    };
}
