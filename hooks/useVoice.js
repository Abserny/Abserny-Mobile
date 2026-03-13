/**
 * useVoice.js
 * Language-aware speech queue. Never overlaps utterances.
 * Priority 'high' cancels current speech and speaks immediately.
 *
 * Fix: generation counter (genRef) invalidates any in-flight onDone/onError
 * callbacks that belong to an utterance that was interrupted by Speech.stop().
 * Without this, the stale callback would fire after the stop, set speaking=false,
 * and call processQueue() a second time — causing double-speak.
 */

import { useRef, useCallback } from 'react';
import * as Speech from 'expo-speech';

export function useVoice(lang = 'en') {
    const queue    = useRef([]);
    const speaking = useRef(false);
    const langRef  = useRef(lang);
    const genRef   = useRef(0); // incremented on every Speech.stop() call
    langRef.current = lang;

    const getConfig = useCallback(() => ({
        language: langRef.current === 'ar' ? 'ar-SA' : 'en-US',
        rate:     langRef.current === 'ar' ? 0.82 : 0.88,
        pitch:    1.0,
    }), []);

    const processQueue = useCallback((expectedGen) => {
        // If a generation is provided, bail if it's no longer current.
        if (expectedGen !== undefined && expectedGen !== genRef.current) return;
        if (speaking.current || queue.current.length === 0) return;

        const text = queue.current.shift();
        const gen  = genRef.current; // capture at speak-time
        speaking.current = true;

        Speech.speak(text, {
            ...getConfig(),
            onDone:  () => {
                // Only process queue if this utterance is still from the current generation
                if (gen !== genRef.current) return;
                speaking.current = false;
                processQueue(gen);
            },
            onError: () => {
                if (gen !== genRef.current) return;
                speaking.current = false;
                processQueue(gen);
            },
        });
    }, [getConfig]);

    const speak = useCallback((text, priority = 'normal') => {
        if (!text) return;
        if (priority === 'high') {
            // Bump generation — any pending onDone/onError from the previous
            // utterance will see a mismatched gen and do nothing.
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
