/**
 * useGestures.js
 * Handles all touch gestures on the full-screen tap zone.
 *
 * Gestures:
 *   double tap  → onScan()
 *   long press  → onRepeat()
 *   triple tap  → onCycleMode()
 *   swipe right → onNextMode()
 *   swipe left  → onPrevMode()
 */

/**
 * useGestures.js
 * Reliable gesture detection using PanResponder.
 * Uses refs for all callbacks so they always reflect current state.
 *
 * Gestures:
 *   double tap       → onScan()
 *   long press 700ms → onRepeat()
 *   triple tap       → onCycleMode()
 *   swipe right      → onNextMode()
 *   swipe left       → onPrevMode()
 */

import { useRef, useEffect } from 'react';
import { PanResponder } from 'react-native';

const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 700;
const SWIPE_PX      = 60;

export function useGestures({ onScan, onRepeat, onCycleMode, onNextMode, onPrevMode, enabled }) {

    // Keep callbacks in refs so PanResponder always calls the latest version
    const onScanRef      = useRef(onScan);
    const onRepeatRef    = useRef(onRepeat);
    const onCycleModeRef = useRef(onCycleMode);
    const onNextModeRef  = useRef(onNextMode);
    const onPrevModeRef  = useRef(onPrevMode);
    const enabledRef     = useRef(enabled);

    useEffect(() => { onScanRef.current      = onScan;      }, [onScan]);
    useEffect(() => { onRepeatRef.current    = onRepeat;    }, [onRepeat]);
    useEffect(() => { onCycleModeRef.current = onCycleMode; }, [onCycleMode]);
    useEffect(() => { onNextModeRef.current  = onNextMode;  }, [onNextMode]);
    useEffect(() => { onPrevModeRef.current  = onPrevMode;  }, [onPrevMode]);
    useEffect(() => { enabledRef.current     = enabled;     }, [enabled]);

    const tapCount   = useRef(0);
    const tapTimer   = useRef(null);
    const longTimer  = useRef(null);
    const startPos   = useRef({ x: 0, y: 0 });
    const longFired  = useRef(false);

    const panResponder = useRef(
        PanResponder.create({

            onStartShouldSetPanResponder:        () => enabledRef.current,
            onStartShouldSetPanResponderCapture: () => enabledRef.current,
            onMoveShouldSetPanResponder:         () => false,

            onPanResponderGrant: (e) => {
                if (!enabledRef.current) return;

                longFired.current = false;
                const { pageX, pageY } = e.nativeEvent;
                startPos.current = { x: pageX, y: pageY };

                // Start long press timer
                longTimer.current = setTimeout(() => {
                    longFired.current = true;
                    tapCount.current  = 0;
                    clearTimeout(tapTimer.current);
                    onRepeatRef.current && onRepeatRef.current();
                }, LONG_PRESS_MS);
            },

            onPanResponderRelease: (e) => {
                clearTimeout(longTimer.current);
                if (!enabledRef.current) return;
                if (longFired.current)   return;

                const { pageX, pageY } = e.nativeEvent;
                const dx = pageX - startPos.current.x;
                const dy = pageY - startPos.current.y;

                // Swipe
                if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
                    tapCount.current = 0;
                    clearTimeout(tapTimer.current);
                    if (dx > 0) onNextModeRef.current && onNextModeRef.current();
                        else        onPrevModeRef.current && onPrevModeRef.current();
                    return;
                }

                // Ignore if finger moved too much (scrolling attempt)
                if (Math.abs(dx) > 20 || Math.abs(dy) > 20) return;

                tapCount.current += 1;

                clearTimeout(tapTimer.current);

                if (tapCount.current >= 3) {
                    tapCount.current = 0;
                    onCycleModeRef.current && onCycleModeRef.current();
                    return;
                }

                tapTimer.current = setTimeout(() => {
                    const count = tapCount.current;
                    tapCount.current = 0;
                    if (count === 2) {
                        onScanRef.current && onScanRef.current();
                    }
                    // single tap does nothing — prevents accidental scans
                }, DOUBLE_TAP_MS);
            },

            onPanResponderTerminate: () => {
                clearTimeout(longTimer.current);
                clearTimeout(tapTimer.current);
                longFired.current = false;
            },
        })
    ).current;

    return panResponder.panHandlers;
}
