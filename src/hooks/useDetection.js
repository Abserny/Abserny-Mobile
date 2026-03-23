/**
 * hooks/useDetection.js
 * Thin React hook wrapper around services/detection/index.js.
 * All logic lives in the service — this hook only handles the quota
 * announcement callback and exposes detect() to components.
 */

import { useRef, useCallback } from 'react';
import { detect, getActiveKey } from '../services/detection';

export function useDetection({ onQuotaExhausted } = {}) {
    const quotaAnnouncedRef   = useRef(false);
    const onQuotaExhaustedRef = useRef(onQuotaExhausted);
    onQuotaExhaustedRef.current = onQuotaExhausted;

    const detectWrapped = useCallback(async (base64, mode, isConnected, lang = 'en', context = '') => {
        const keysAvailable = getActiveKey() !== null;

        if (!keysAvailable && !quotaAnnouncedRef.current) {
            quotaAnnouncedRef.current = true;
            onQuotaExhaustedRef.current?.();
        }
        if (keysAvailable) {
            quotaAnnouncedRef.current = false;
        }

        return detect(base64, mode, isConnected, lang, context);
    }, []);

    return { detect: detectWrapped };
}
