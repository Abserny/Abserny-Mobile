/**
 * hooks/useModelState.js
 * Subscribes to TFLite model load state and emits a spoken announcement
 * when loading begins and when it completes (or fails).
 *
 * Returns: 'idle' | 'loading' | 'ready' | 'error'
 */

import { useState, useEffect, useRef } from 'react';
import { getModelState, subscribeModelState } from '../services/detection/tflite';

export function useModelState({ speak, lang } = {}) {
    const [modelState, setModelState] = useState(getModelState);
    const spokenLoading = useRef(false);
    const spokenReady   = useRef(false);
    const speakRef      = useRef(speak);
    const langRef       = useRef(lang);

    useEffect(() => { speakRef.current = speak; }, [speak]);
    useEffect(() => { langRef.current  = lang;  }, [lang]);

    useEffect(() => {
        // Subscribe to future changes
        const unsub = subscribeModelState((s) => {
            setModelState(s);

            if (s === 'loading' && !spokenLoading.current) {
                spokenLoading.current = true;
                const msg = langRef.current === 'ar'
                    ? 'جاري تحميل نموذج الكشف.'
                    : 'Loading offline model.';
                // Small delay so boot speech doesn't collide
                setTimeout(() => speakRef.current?.(msg, 'normal'), 600);
            }

            if (s === 'ready' && spokenLoading.current && !spokenReady.current) {
                spokenReady.current = true;
                const msg = langRef.current === 'ar'
                    ? 'النموذج جاهز.'
                    : 'Offline model ready.';
                setTimeout(() => speakRef.current?.(msg, 'normal'), 200);
            }

            if (s === 'error') {
                const msg = langRef.current === 'ar'
                    ? 'تعذّر تحميل النموذج المحلي.'
                    : 'Offline model failed. Using online mode only.';
                setTimeout(() => speakRef.current?.(msg, 'normal'), 200);
            }
        });

        // Check if it's already loading (started before hook mounted)
        const current = getModelState();
        setModelState(current);
        if (current === 'loading' && !spokenLoading.current) {
            spokenLoading.current = true;
            const msg = langRef.current === 'ar' ? 'جاري تحميل نموذج الكشف.' : 'Loading offline model.';
            setTimeout(() => speakRef.current?.(msg, 'normal'), 600);
        }

        return unsub;
    }, []); // eslint-disable-line

    return modelState;
}
