/**
 * hooks/useGestures.js
 * Full-screen gesture handler using PanResponder.
 *
 * Gestures:
 *   double tap  → onScan()
 *   long press  → onRepeat()
 *   triple tap  → onCycleMode()
 *   swipe right → onNextMode()
 *   swipe left  → onPrevMode()
 *   swipe up    → onWatchToggle()
 */

import { useRef, useEffect } from 'react';
import { PanResponder } from 'react-native';

// 380ms gives blind/moving users more time between taps without making
// triple-tap feel sluggish. iOS system double-tap accessibility uses 400ms;
// 380ms sits just below that so we don't collide with system gestures.
const DOUBLE_TAP_MS = 380;
const LONG_PRESS_MS = 700;
const SWIPE_H_PX    = 60;
const SWIPE_UP_PX   = 80;

export function useGestures({
    onScan, onRepeat, onCycleMode,
    onNextMode, onPrevMode, onWatchToggle,
    enabled,
    isRTL,
}) {
    const onScanRef        = useRef(onScan);
    const onRepeatRef      = useRef(onRepeat);
    const onCycleModeRef   = useRef(onCycleMode);
    const onNextModeRef    = useRef(onNextMode);
    const onPrevModeRef    = useRef(onPrevMode);
    const onWatchToggleRef = useRef(onWatchToggle);
    const enabledRef       = useRef(enabled);
    const isRTLRef         = useRef(isRTL);

    useEffect(() => { onScanRef.current        = onScan;        }, [onScan]);
    useEffect(() => { onRepeatRef.current       = onRepeat;      }, [onRepeat]);
    useEffect(() => { onCycleModeRef.current    = onCycleMode;   }, [onCycleMode]);
    useEffect(() => { onNextModeRef.current     = onNextMode;    }, [onNextMode]);
    useEffect(() => { onPrevModeRef.current     = onPrevMode;    }, [onPrevMode]);
    useEffect(() => { onWatchToggleRef.current  = onWatchToggle; }, [onWatchToggle]);
    useEffect(() => { enabledRef.current        = enabled;       }, [enabled]);
    useEffect(() => { isRTLRef.current          = isRTL;         }, [isRTL]);

    const tapCount  = useRef(0);
    const tapTimer  = useRef(null);
    const longTimer = useRef(null);
    const startPos  = useRef({ x: 0, y: 0 });
    const longFired = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder:        () => enabledRef.current,
            onStartShouldSetPanResponderCapture: () => enabledRef.current,
            onMoveShouldSetPanResponder:         () => false,

            onPanResponderGrant: (e) => {
                if (!enabledRef.current) return;
                longFired.current = false;
                startPos.current  = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
                longTimer.current = setTimeout(() => {
                    longFired.current = true;
                    tapCount.current  = 0;
                    clearTimeout(tapTimer.current);
                    onRepeatRef.current?.();
                }, LONG_PRESS_MS);
            },

            onPanResponderRelease: (e) => {
                clearTimeout(longTimer.current);
                if (!enabledRef.current) return;
                if (longFired.current)   return;

                const dx  = e.nativeEvent.pageX - startPos.current.x;
                const dy  = e.nativeEvent.pageY - startPos.current.y;
                const adx = Math.abs(dx);
                const ady = Math.abs(dy);

                if (dy < -SWIPE_UP_PX && ady > adx * 1.3) {
                    tapCount.current = 0;
                    clearTimeout(tapTimer.current);
                    onWatchToggleRef.current?.();
                    return;
                }

                if (adx >= SWIPE_H_PX && adx > ady * 1.2) {
                    tapCount.current = 0;
                    clearTimeout(tapTimer.current);
                    // In RTL (Arabic) the natural direction is reversed:
                    // swiping right = go to previous mode, swiping left = next mode.
                    if (isRTLRef.current) {
                        if (dx > 0) onPrevModeRef.current?.();
                        else        onNextModeRef.current?.();
                    } else {
                        if (dx > 0) onNextModeRef.current?.();
                        else        onPrevModeRef.current?.();
                    }
                    return;
                }

                if (adx > 20 || ady > 20) return;

                tapCount.current += 1;
                clearTimeout(tapTimer.current);

                // Exactly 3 taps — fire immediately, don't wait for the timer.
                // Reset count so a 4th tap starts fresh rather than being orphaned.
                // Previously used >= 3, which meant 4 or 5 fast taps also triggered
                // onCycleMode — and left a stale count of 1 in the timer afterward.
                if (tapCount.current === 3) {
                    tapCount.current = 0;
                    onCycleModeRef.current?.();
                    return;
                }

                // More than 3 taps in the window (e.g. 4th tap arrives before timer fires).
                // Discard — reset cleanly and don't trigger anything.
                if (tapCount.current > 3) {
                    tapCount.current = 0;
                    clearTimeout(tapTimer.current);
                    return;
                }

                // 1 or 2 taps — wait to see if more arrive
                tapTimer.current = setTimeout(() => {
                    const count = tapCount.current;
                    tapCount.current = 0;
                    if (count === 2) onScanRef.current?.();
                    // count === 1: single tap — no action (reserved / ignored)
                }, DOUBLE_TAP_MS);
            },

            onPanResponderTerminate: () => {
                clearTimeout(longTimer.current);
                clearTimeout(tapTimer.current);
                longFired.current = false;
                tapCount.current  = 0;
            },
        }),
    ).current;

    return panResponder.panHandlers;
}
