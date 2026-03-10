/**
 * useModes.js
 * Manages the 4 detection modes. Returns current mode,
 * next/prev/cycle functions, and mode label for voice announcement.
 */

import { useState, useCallback } from 'react';

export const MODES = [
    {
        id: 'scene',
        label: 'Scene mode',
        instruction: 'Double tap to describe surroundings.',
        icon: '👁',
    },
    {
        id: 'object',
        label: 'Object mode',
        instruction: 'Hold an object close and double tap.',
        icon: '✋',
    },
    {
        id: 'read',
        label: 'Read mode',
        instruction: 'Point at text and double tap to read it.',
        icon: '📖',
    },
    {
        id: 'people',
        label: 'People mode',
        instruction: 'Double tap to detect people nearby.',
        icon: '🧑',
    },
];

export function useModes() {
    const [modeIndex, setModeIndex] = useState(0);

    const currentMode = MODES[modeIndex];

    const nextMode = useCallback(() => {
        setModeIndex(i => (i + 1) % MODES.length);
        return MODES[(modeIndex + 1) % MODES.length];
    }, [modeIndex]);

    const prevMode = useCallback(() => {
        const idx = (modeIndex - 1 + MODES.length) % MODES.length;
        setModeIndex(idx);
        return MODES[idx];
    }, [modeIndex]);

    const cycleMode = useCallback(() => {
        return nextMode();
    }, [nextMode]);

    return { currentMode, modeIndex, nextMode, prevMode, cycleMode };
}
