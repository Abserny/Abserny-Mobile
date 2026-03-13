/**
 * useGestures.js
 * Full-screen gesture handler using PanResponder.
 * All callbacks stored in refs — always reflects current state.
 *
 * Gestures:
 *   double tap       → onScan()
 *   long press 700ms → onRepeat()
 *   triple tap       → onCycleMode()   (opens settings when READY)
 *   swipe right      → onNextMode()
 *   swipe left       → onPrevMode()
 *   swipe up         → onWatchToggle() (toggle continuous watch mode)
 */

import { useRef, useEffect } from 'react';
import { PanResponder } from 'react-native';

const DOUBLE_TAP_MS  = 320;
const LONG_PRESS_MS  = 700;
const SWIPE_H_PX     = 60;   // horizontal swipe threshold
const SWIPE_UP_PX    = 80;   // vertical swipe threshold (slightly higher — avoid accidents)

export function useGestures({
    onScan, onRepeat, onCycleMode,
    onNextMode, onPrevMode, onWatchToggle,
    enabled,
}) {
    const onScanRef        = useRef(onScan);
    const onRepeatRef      = useRef(onRepeat);
    const onCycleModeRef   = useRef(onCycleMode);
    const onNextModeRef    = useRef(onNextMode);
    const onPrevModeRef    = useRef(onPrevMode);
    const onWatchToggleRef = useRef(onWatchToggle);
    const enabledRef       = useRef(enabled);

    useEffect(() => { onScanRef.current        = onScan;        }, [onScan]);
    useEffect(() => { onRepeatRef.current       = onRepeat;      }, [onRepeat]);
    useEffect(() => { onCycleModeRef.current    = onCycleMode;   }, [onCycleMode]);
    useEffect(() => { onNextModeRef.current     = onNextMode;    }, [onNextMode]);
    useEffect(() => { onPrevModeRef.current     = onPrevMode;    }, [onPrevMode]);
    useEffect(() => { onWatchToggleRef.current  = onWatchToggle; }, [onWatchToggle]);
    useEffect(() => { enabledRef.current        = enabled;       }, [enabled]);

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

                // ── Swipe UP (watch mode) ─────────────────────────────────
                if (dy < -SWIPE_UP_PX && ady > adx * 1.3) {
                    tapCount.current = 0;
                    clearTimeout(tapTimer.current);
                    onWatchToggleRef.current?.();
                    return;
                }

                // ── Swipe LEFT / RIGHT (mode change) ──────────────────────
                if (adx >= SWIPE_H_PX && adx > ady * 1.2) {
                    tapCount.current = 0;
                    clearTimeout(tapTimer.current);
                    if (dx > 0) onNextModeRef.current?.();
                        else        onPrevModeRef.current?.();
                    return;
                }

                // ── Ignore drifted taps ───────────────────────────────────
                if (adx > 20 || ady > 20) return;

                // ── Tap counting ──────────────────────────────────────────
                tapCount.current += 1;
                clearTimeout(tapTimer.current);

                if (tapCount.current >= 3) {
                    tapCount.current = 0;
                    onCycleModeRef.current?.();
                    return;
                }

                tapTimer.current = setTimeout(() => {
                    const count = tapCount.current;
                    tapCount.current = 0;
                    if (count === 2) onScanRef.current?.();
                    // single tap — intentional no-op (prevents accidental scans)
                }, DOUBLE_TAP_MS);
            },

            onPanResponderTerminate: () => {
                clearTimeout(longTimer.current);
                clearTimeout(tapTimer.current);
                longFired.current = false;
            },
        }),
    ).current;

    return panResponder.panHandlers;
}
