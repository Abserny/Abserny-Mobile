import { ExpoSpeechRecognitionModule } from "./ExpoSpeechRecognitionModule";
import { useEventListener } from "expo";
/**
 * This hook allows you to listen to native events emitted by the `ExpoSpeechRecognitionModule`.
 *
 * Note: this is not the same as the `SpeechRecognition` event listener on the web speech API.
 *
 * @param eventName The name of the event to listen to
 * @param listener The listener function to call when the event is emitted
 */
export function useSpeechRecognitionEvent(eventName, listener) {
    return useEventListener(ExpoSpeechRecognitionModule, eventName, 
    // @ts-expect-error
    listener);
}
//# sourceMappingURL=useSpeechRecognitionEvent.js.map