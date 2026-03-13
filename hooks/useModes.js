/**
 * useModes.js
 * Manages the 4 detection modes. Returns current mode,
 * next/prev/cycle functions, and mode label for voice announcement.
 *
 * Fix: nextMode/prevMode now compute index once and use it consistently,
 * eliminating the stale-closure mismatch between setModeIndex and the
 * returned MODES entry.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_MODE = 'abserny_mode_index';

export const MODES = [
    {
        id: 'scene',
        label: 'Scene mode',
        instruction: 'Double tap to describe surroundings.',
        icon: 'scene',
    },
    {
        id: 'object',
        label: 'Object mode',
        instruction: 'Hold an object close and double tap.',
        icon: 'object',
    },
    {
        id: 'read',
        label: 'Read mode',
        instruction: 'Point at text and double tap to read it.',
        icon: 'read',
    },
    {
        id: 'people',
        label: 'People mode',
        instruction: 'Double tap to detect people nearby.',
        icon: 'people',
    },
];

export function useModes() {
    const [modeIndex, setModeIndex] = useState(0);

    // Load persisted mode on mount — useEffect (not useState) for async work
    useEffect(() => {
        AsyncStorage.getItem(KEY_MODE)
            .then(val => {
                if (val !== null) {
                    const idx = parseInt(val, 10);
                    if (!isNaN(idx) && idx >= 0 && idx < MODES.length) {
                        setModeIndex(idx);
                    }
                }
            })
            .catch(() => {});
    }, []);

    const currentMode = MODES[modeIndex];

    // FIX: compute next index once and use it for both setModeIndex and return,
    // so the spoken announcement always matches the mode that was actually set.
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

    const cycleMode = useCallback(() => {
        return nextMode();
    }, [nextMode]);

    return { currentMode, modeIndex, nextMode, prevMode, cycleMode };
}
