/**
 * hooks/useVoice.js
 * Language-aware speech queue. Never overlaps utterances.
 * Priority 'high' cancels current speech and speaks immediately.
 */

import { useRef, useCallback } from 'react';
import * as Speech from 'expo-speech';

export function useVoice(lang = 'en') {
    const queue    = useRef([]);
    const speaking = useRef(false);
    const langRef  = useRef(lang);
    const genRef   = useRef(0);
    langRef.current = lang;

    const getConfig = useCallback(() => ({
        language: langRef.current === 'ar' ? 'ar-SA' : 'en-US',
        rate:     langRef.current === 'ar' ? 0.82 : 0.88,
        pitch:    1.0,
    }), []);

    const processQueue = useCallback((expectedGen) => {
        if (expectedGen !== undefined && expectedGen !== genRef.current) return;
        if (speaking.current || queue.current.length === 0) return;
        const text = queue.current.shift();
        const gen  = genRef.current;
        speaking.current = true;
        Speech.speak(text, {
            ...getConfig(),
            onDone:  () => { if (gen !== genRef.current) return; speaking.current = false; processQueue(gen); },
            onError: () => { if (gen !== genRef.current) return; speaking.current = false; processQueue(gen); },
        });
    }, [getConfig]);

    const speak = useCallback((text, priority = 'normal') => {
        if (!text) return;
        if (priority === 'high') {
            genRef.current += 1;
            Speech.stop();
            speaking.current = false;
            queue.current    = [text];
        } else {
            queue.current.push(text);
        }
        processQueue();
    }, [processQueue]);

    const stop = useCallback(() => {
        genRef.current += 1;
        Speech.stop();
        queue.current    = [];
        speaking.current = false;
    }, []);

    return { speak, stop };
}
