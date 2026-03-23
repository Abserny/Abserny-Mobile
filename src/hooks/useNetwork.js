/**
 * hooks/useNetwork.js
 * Reliable connectivity using expo-network.
 * Polling with jitter. Pauses when app is backgrounded.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';

const BASE_INTERVAL_MS = 15000;
const JITTER_MS        = 2000;

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
            const connected = state.isConnected === true && state.isInternetReachable !== false;
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

    const stopPolling = useCallback(() => {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
    }, []);

    const startPolling = useCallback(() => {
        stopPolling();
        const tick = () => {
            check();
            intervalRef.current = setTimeout(tick, BASE_INTERVAL_MS + Math.random() * JITTER_MS);
        };
        intervalRef.current = setTimeout(tick, BASE_INTERVAL_MS + Math.random() * JITTER_MS);
    }, [check, stopPolling]);

    useEffect(() => {
        cancelledRef.current = false;
        check();
        startPolling();

        const handleAppState = (nextState) => {
            if (nextState === 'active') { check(); startPolling(); }
            else stopPolling();
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
