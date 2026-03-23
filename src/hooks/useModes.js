/**
 * hooks/useModes.js
 * Mode index state + next/prev/cycle. MODES array lives in constants/modes.js.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MODES } from '../constants/modes';

export { MODES };

const KEY_MODE = 'abserny_mode_index';

export function useModes() {
    const [modeIndex, setModeIndex] = useState(0);

    useEffect(() => {
        AsyncStorage.getItem(KEY_MODE)
            .then(val => {
                if (val !== null) {
                    const idx = parseInt(val, 10);
                    if (!isNaN(idx) && idx >= 0 && idx < MODES.length) setModeIndex(idx);
                }
            })
            .catch(() => {});
    }, []);

    const currentMode = MODES[modeIndex];

    const nextMode = useCallback(() => {
        const next = (modeIndex + 1) % MODES.length;
        setModeIndex(next);
        AsyncStorage.setItem(KEY_MODE, String(next)).catch(() => {});
        return MODES[next];
    }, [modeIndex]);

    const prevMode = useCallback(() => {
        const prev = (modeIndex - 1 + MODES.length) % MODES.length;
        setModeIndex(prev);
        AsyncStorage.setItem(KEY_MODE, String(prev)).catch(() => {});
        return MODES[prev];
    }, [modeIndex]);

    const cycleMode = useCallback(() => nextMode(), [nextMode]);

    return { currentMode, modeIndex, nextMode, prevMode, cycleMode };
}
