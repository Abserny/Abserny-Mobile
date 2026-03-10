/**
 * useVoice.js
 * Speech queue — guarantees utterances never overlap.
 * Exposes: speak(text, priority), stop()
 * Priority 'high' cancels anything playing and speaks immediately.
 * Priority 'normal' queues behind current speech.
 */

import { useRef, useCallback } from 'react';
import * as Speech from 'expo-speech';

export function useVoice() {
  const queue = useRef([]);
  const speaking = useRef(false);

  const processQueue = useCallback(() => {
    if (speaking.current || queue.current.length === 0) return;
    const text = queue.current.shift();
    speaking.current = true;

    Speech.speak(text, {
      language: 'en-US',
      rate: 0.88,
      pitch: 1.0,
      onDone: () => {
        speaking.current = false;
        processQueue();
      },
      onError: () => {
        speaking.current = false;
        processQueue();
      },
    });
  }, []);

  const speak = useCallback((text, priority = 'normal') => {
    if (!text) return;
    if (priority === 'high') {
      Speech.stop();
      speaking.current = false;
      queue.current = [text];
    } else {
      queue.current.push(text);
    }
    processQueue();
  }, [processQueue]);

  const stop = useCallback(() => {
    Speech.stop();
    queue.current = [];
    speaking.current = false;
  }, []);

  return { speak, stop };
}
