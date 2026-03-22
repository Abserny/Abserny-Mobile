/**
 * useNetwork.js
 * Reliable connectivity using expo-network.
 *
 * FIXES in this version:
 *   1. Poll interval now includes random jitter (±1 s) to prevent multiple
 *      instances (if any) from thundering at the same wall-clock second.
 *   2. Polling pauses when the app is backgrounded (AppState inactive/background)
 *      and resumes on foreground. This saves battery and avoids pointless checks
 *      while the user isn't looking at the screen.
 *   3. A connectivity check is run immediately on foreground resume so the state
 *      is fresh the moment the user returns to the app.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';

const BASE_INTERVAL_MS  = 15000;
const JITTER_MS         = 2000; // random 0–2 s added to each interval

export function useNetwork({ onConnectivityChange } = {}) {
    const [isConnected, setIsConnected] = useState(true);

    const initializedRef   = useRef(false);
    const prevConnectedRef = useRef(true);
    const callbackRef      = useRef(onConnectivityChange);
    const intervalRef      = useRef(null);
    const cancelledRef     = useRef(false);
    callbackRef.current    = onConnectivityChange;

    const check = useCallback(async () => {
        if (cancelledRef.current) return;
        try {
            const state = await Network.getNetworkStateAsync();
            if (cancelledRef.current) return;

            const connected =
                state.isConnected === true &&
                    state.isInternetReachable !== false;

            setIsConnected(connected);

            if (initializedRef.current && connected !== prevConnectedRef.current) {
                callbackRef.current?.(connected);
            }

            prevConnectedRef.current = connected;
            initializedRef.current   = true;

        } catch {
            if (cancelledRef.current) return;
            setIsConnected(false);
            if (initializedRef.current && prevConnectedRef.current !== false) {
                callbackRef.current?.(false);
            }
            prevConnectedRef.current = false;
            initializedRef.current   = true;
        }
    }, []);

    // FIX 1 + 2: Schedule the next poll with jitter; stop/start around AppState.
    const startPolling = useCallback(() => {
        stopPolling();
        const tick = () => {
            check();
            // Schedule next tick with fresh jitter each time
            intervalRef.current = setTimeout(tick, BASE_INTERVAL_MS + Math.random() * JITTER_MS);
        };
        intervalRef.current = setTimeout(tick, BASE_INTERVAL_MS + Math.random() * JITTER_MS);
    }, [check]);

    const stopPolling = useCallback(() => {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
    }, []);

    useEffect(() => {
        cancelledRef.current = false;

        // Initial check
        check();
        startPolling();

        // FIX 2: Pause polling when backgrounded, resume on foreground
        const handleAppState = (nextState) => {
            if (nextState === 'active') {
                check(); // immediate check on resume
                startPolling();
            } else {
                stopPolling();
            }
        };

        const sub = AppState.addEventListener('change', handleAppState);

        return () => {
            cancelledRef.current = true;
            stopPolling();
            sub.remove();
        };
    }, [check, startPolling, stopPolling]);

    return { isConnected };
}
