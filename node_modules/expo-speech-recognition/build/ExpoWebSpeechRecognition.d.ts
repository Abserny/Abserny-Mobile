import type { ExpoSpeechRecognitionOptions } from "./ExpoSpeechRecognitionModule.types";
type SpeechListener<K extends keyof SpeechRecognitionEventMap> = (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any;
/** A compatibility wrapper that implements the web SpeechRecognition API for React Native. */
export declare class ExpoWebSpeechRecognition implements SpeechRecognition {
    #private;
    lang: string;
    grammars: SpeechGrammarList;
    maxAlternatives: number;
    continuous: boolean;
    get interimResults(): boolean;
    set interimResults(interimResults: boolean);
    /** [EXTENDED, default: undefined] An array of strings that will be used to provide context to the speech recognition engine. */
    contextualStrings?: string[];
    /** [EXTENDED, default: false] Whether the speech recognition engine should require the device to be on when the recognition starts. */
    requiresOnDeviceRecognition: boolean;
    /** [EXTENDED, default: false] Whether the speech recognition engine should add punctuation to the transcription. */
    addsPunctuation: boolean;
    /** [EXTENDED, default: undefined] Android-specific options to pass to the recognizer. */
    androidIntentOptions: ExpoSpeechRecognitionOptions["androidIntentOptions"];
    /** [EXTENDED, default: undefined] Audio source options to pass to the recognizer. */
    audioSource?: ExpoSpeechRecognitionOptions["audioSource"];
    /** [EXTENDED, default: undefined] Audio recording options to pass to the recognizer. */
    recordingOptions?: ExpoSpeechRecognitionOptions["recordingOptions"];
    /** [EXTENDED, default: "android.speech.action.RECOGNIZE_SPEECH"] The kind of intent action */
    androidIntent?: ExpoSpeechRecognitionOptions["androidIntent"];
    /** [EXTENDED, default: undefined] The hint for the speech recognition task. */
    iosTaskHint?: ExpoSpeechRecognitionOptions["iosTaskHint"];
    /** [EXTENDED, default: undefined] The audio session category and options to use. */
    iosCategory?: ExpoSpeechRecognitionOptions["iosCategory"];
    /**
     * [EXTENDED, default: undefined]
     *
     * The package name of the speech recognition service to use.
     * If not provided, the default service will be used.
     *
     * Obtain the supported packages by running `ExpoSpeechRecognitionModule.getSpeechRecognitionServices()`
     *
     * e.g. com.samsung.android.bixby.agent"
     */
    androidRecognitionServicePackage: ExpoSpeechRecognitionOptions["androidRecognitionServicePackage"];
    start(): void;
    stop: () => void;
    abort: () => void;
    set onstart(listener: SpeechListener<"start"> | null);
    /** Fired when the speech recognition starts. */
    get onstart(): SpeechListener<"start"> | null;
    set onend(listener: SpeechListener<"end"> | null);
    /** Fired when the speech recognition service has disconnected. */
    get onend(): SpeechListener<"end"> | null;
    set onerror(listener: SpeechListener<"error"> | null);
    /** Fired when the speech recognition service encounters an error. */
    get onerror(): SpeechListener<"error"> | null;
    _setListeners<K extends keyof SpeechRecognitionEventMap>(key: K, listenerFn: SpeechListener<K> | null, existingListener: SpeechListener<K> | null): void;
    set onresult(listener: SpeechListener<"result"> | null);
    /** Fired when the speech recognition service returns a result —
     *  a word or phrase has been positively recognized and this has been communicated back to the app. */
    get onresult(): SpeechListener<"result"> | null;
    set onnomatch(listener: SpeechListener<"nomatch"> | null);
    /** Fired when the speech recognition service returns a final result with no significant recognition. */
    get onnomatch(): SpeechListener<"nomatch"> | null;
    set onspeechstart(listener: SpeechListener<"speechstart"> | null);
    /** Fired when the speech recognition service returns a final result with no significant recognition. */
    get onspeechstart(): SpeechListener<"speechstart"> | null;
    set onspeechend(listener: SpeechListener<"speechend"> | null);
    /** Fired when the speech recognition service returns a final result with no significant recognition. */
    get onspeechend(): SpeechListener<"speechend"> | null;
    set onaudiostart(listener: SpeechListener<"audiostart"> | null);
    /** Fired when the user agent has started to capture audio. */
    get onaudiostart(): SpeechListener<"audiostart"> | null;
    set onaudioend(listener: SpeechListener<"audioend"> | null);
    /** Fired when the user agent has finished capturing audio. */
    get onaudioend(): SpeechListener<"audioend"> | null;
    /** [TODO] */
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    /** [TODO] */
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    addEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: SpeechListener<K>, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | EventListenerOptions | undefined): void;
    dispatchEvent(event: Event): boolean;
}
/**
 * This class is just a polyfill and does nothing on Android/iOS
 */
export declare class ExpoWebSpeechGrammarList implements SpeechGrammarList {
    #private;
    get length(): number;
    [index: number]: SpeechGrammar;
    addFromURI(src: string, weight?: number | undefined): void;
    item(index: number): ExpoWebSpeechGrammar;
    addFromString: (grammar: string, weight?: number) => void;
}
export declare class ExpoWebSpeechGrammar implements SpeechGrammar {
    src: string;
    weight: number;
    constructor(src: string, weight?: number);
}
export {};
//# sourceMappingURL=ExpoWebSpeechRecognition.d.ts.map