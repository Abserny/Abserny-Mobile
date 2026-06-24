/**
 * hooks/useVoice.js
 * Language-aware speech queue. Never overlaps utterances.
 * Priority 'high' cancels current speech and speaks immediately.
 *
 * QUEUE CAP:
 * Normal-priority items are capped at MAX_QUEUE_LENGTH. Without a cap, a
 * burst of watch-mode results (hazard clears quickly, scene changes fast)
 * can pile up 6-8 items — the user hears descriptions from 30 seconds ago
 * while the world has already moved on. When the cap is reached, the oldest
 * queued item is dropped to make room for the newest, keeping audio current.
 * High-priority items bypass the cap entirely (they clear the queue anyway).
 */

import { useRef, useCallback } from 'react';
import * as Speech from 'expo-speech';

const MAX_QUEUE_LENGTH = 3;

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
            // High priority: cancel everything, speak immediately
            genRef.current += 1;
            Speech.stop();
            speaking.current = false;
            queue.current    = [text];
        } else {
            // Normal priority: drop oldest item if queue is full
            if (queue.current.length >= MAX_QUEUE_LENGTH) {
                queue.current.shift();
            }
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
