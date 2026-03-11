/**
 * useVoice.js
 * Language-aware speech queue. Never overlaps utterances.
 * Priority 'high' cancels current speech and speaks immediately.
 */

import { useRef, useCallback } from 'react';
import * as Speech from 'expo-speech';

export function useVoice(lang = 'en') {
    const queue    = useRef([]);
    const speaking = useRef(false);
    const langRef  = useRef(lang);
    langRef.current = lang;

    const getConfig = useCallback(() => ({
        language: langRef.current === 'ar' ? 'ar-SA' : 'en-US',
        rate:     langRef.current === 'ar' ? 0.82 : 0.88,
        pitch:    1.0,
    }), []);

    const processQueue = useCallback(() => {
        if (speaking.current || queue.current.length === 0) return;
        const text = queue.current.shift();
        speaking.current = true;
        Speech.speak(text, {
            ...getConfig(),
            onDone:  () => { speaking.current = false; processQueue(); },
            onError: () => { speaking.current = false; processQueue(); },
        });
    }, [getConfig]);

    const speak = useCallback((text, priority = 'normal') => {
        if (!text) return;
        if (priority === 'high') {
            Speech.stop();
            speaking.current = false;
            queue.current    = [text];
        } else {
            queue.current.push(text);
        }
        processQueue();
    }, [processQueue]);

    const stop = useCallback(() => {
        Speech.stop();
        queue.current    = [];
        speaking.current = false;
    }, []);

    return { speak, stop };
}
