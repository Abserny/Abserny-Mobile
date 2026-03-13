/**
 * useNetwork.js
 * Reliable connectivity using expo-network.
 *
 * Enhancement: fires onConnectivityChange(isConnected) callback when the
 * connection state changes after the initial mount — so the app can speak
 * "Back online" / "Offline. Using basic mode." to the user.
 * The initial state does NOT trigger the callback (only real changes do).
 */

import { useState, useEffect, useRef } from 'react';
import * as Network from 'expo-network';

export function useNetwork({ onConnectivityChange } = {}) {
    const [isConnected, setIsConnected] = useState(true);

    // Track whether we've completed the initial check — we don't want to
    // announce connectivity state on first load, only on changes.
    const initializedRef    = useRef(false);
    const prevConnectedRef  = useRef(true);
    const callbackRef       = useRef(onConnectivityChange);
    callbackRef.current     = onConnectivityChange;

    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            try {
                const state = await Network.getNetworkStateAsync();
                if (cancelled) return;

                const connected =
                    state.isConnected === true &&
                        state.isInternetReachable !== false;

                setIsConnected(connected);

                // Only fire the callback after initial load, and only on change
                if (initializedRef.current && connected !== prevConnectedRef.current) {
                    callbackRef.current?.(connected);
                }

                prevConnectedRef.current = connected;
                initializedRef.current   = true;

            } catch {
                if (cancelled) return;
                setIsConnected(false);
                if (initializedRef.current && prevConnectedRef.current !== false) {
                    callbackRef.current?.(false);
                }
                prevConnectedRef.current = false;
                initializedRef.current   = true;
            }
        };

        check();
        const iv = setInterval(check, 15000);
        return () => { cancelled = true; clearInterval(iv); };
    }, []);

    return { isConnected };
}
