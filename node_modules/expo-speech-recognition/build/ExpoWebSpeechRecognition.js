import { ExpoSpeechRecognitionModule } from "./ExpoSpeechRecognitionModule";
const noop = () => { };
const createEventData = (target) => ({
    AT_TARGET: 2,
    bubbles: false,
    BUBBLING_PHASE: 3,
    cancelable: false,
    CAPTURING_PHASE: 1,
    composed: false,
    composedPath: () => [],
    currentTarget: target,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: true,
    NONE: 0,
    preventDefault: noop,
    resultIndex: 0,
    stopImmediatePropagation: noop,
    stopPropagation: noop,
    target,
    timeStamp: 0,
    type: "",
    cancelBubble: false,
    returnValue: false,
    srcElement: null,
    initEvent: noop,
});
function stubEvent(eventName, instance, listener) {
    return {
        eventName,
        nativeListener: (nativeEvent) => listener.call(instance, createEventData(instance)),
    };
}
/**
 * Transforms the native listener payloads to web-compatible shapes
 */
const WebListenerTransformers = {
    audiostart: (instance, listener) => {
        return {
            eventName: "audiostart",
            nativeListener(nativeEvent) {
                listener.call(instance, {
                    ...createEventData(instance),
                    uri: nativeEvent.uri,
                });
            },
        };
    },
    audioend: (instance, listener) => {
        return {
            eventName: "audioend",
            nativeListener(nativeEvent) {
                listener.call(instance, {
                    ...createEventData(instance),
                    uri: nativeEvent.uri,
                });
            },
        };
    },
    nomatch: (instance, listener) => {
        // @ts-ignore
        return stubEvent("nomatch", instance, listener);
    },
    end: (instance, listener) => {
        return stubEvent("end", instance, listener);
    },
    start: (instance, listener) => {
        return {
            eventName: "start",
            nativeListener() {
                listener.call(instance, createEventData(instance));
            },
        };
    },
    error: (instance, listener) => {
        return {
            eventName: "error",
            nativeListener: (nativeEvent) => {
                const clientEvent = {
                    ...createEventData(instance),
                    // TODO: handle custom ios error codes
                    error: nativeEvent.error,
                    message: nativeEvent.message,
                };
                listener.call(instance, clientEvent);
            },
        };
    },
    result: (instance, listener) => {
        return {
            eventName: "result",
            nativeListener: (nativeEvent) => {
                if (!instance.interimResults && !nativeEvent.isFinal) {
                    return;
                }
                const alternatives = nativeEvent.results.map((result) => new ExpoSpeechRecognitionAlternative(result.confidence, result.transcript));
                const clientEvent = {
                    ...createEventData(instance),
                    results: new ExpoSpeechRecognitionResultList([
                        new ExpoSpeechRecognitionResult(nativeEvent.isFinal, alternatives),
                    ]),
                };
                listener.call(instance, clientEvent);
            },
        };
    },
};
/** A compatibility wrapper that implements the web SpeechRecognition API for React Native. */
export class ExpoWebSpeechRecognition {
    lang = "en-US";
    grammars = new ExpoWebSpeechGrammarList();
    maxAlternatives = 1;
    continuous = false;
    #interimResults = false;
    get interimResults() {
        return this.#interimResults;
    }
    set interimResults(interimResults) {
        this.#interimResults = interimResults;
        // Subscribe to native
    }
    // Extended properties
    /** [EXTENDED, default: undefined] An array of strings that will be used to provide context to the speech recognition engine. */
    contextualStrings = undefined;
    /** [EXTENDED, default: false] Whether the speech recognition engine should require the device to be on when the recognition starts. */
    requiresOnDeviceRecognition = false;
    /** [EXTENDED, default: false] Whether the speech recognition engine should add punctuation to the transcription. */
    addsPunctuation = false;
    /** [EXTENDED, default: undefined] Android-specific options to pass to the recognizer. */
    androidIntentOptions;
    /** [EXTENDED, default: undefined] Audio source options to pass to the recognizer. */
    audioSource;
    /** [EXTENDED, default: undefined] Audio recording options to pass to the recognizer. */
    recordingOptions;
    /** [EXTENDED, default: "android.speech.action.RECOGNIZE_SPEECH"] The kind of intent action */
    androidIntent = undefined;
    /** [EXTENDED, default: undefined] The hint for the speech recognition task. */
    iosTaskHint = undefined;
    /** [EXTENDED, default: undefined] The audio session category and options to use. */
    iosCategory = undefined;
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
    androidRecognitionServicePackage;
    // keyed by listener function
    #subscriptionMap = new Map();
    start() {
        ExpoSpeechRecognitionModule.requestPermissionsAsync().then(() => {
            // A result doesn't matter,
            // the module will emit an error if permissions are not granted
            ExpoSpeechRecognitionModule.start({
                lang: this.lang,
                interimResults: this.interimResults,
                maxAlternatives: this.maxAlternatives,
                contextualStrings: this.contextualStrings,
                requiresOnDeviceRecognition: this.requiresOnDeviceRecognition,
                addsPunctuation: this.addsPunctuation,
                continuous: this.continuous,
                recordingOptions: this.recordingOptions,
                androidIntentOptions: this.androidIntentOptions,
                androidRecognitionServicePackage: this.androidRecognitionServicePackage,
                audioSource: this.audioSource,
                androidIntent: this.androidIntent,
                iosTaskHint: this.iosTaskHint,
                iosCategory: this.iosCategory,
            });
        });
    }
    stop = ExpoSpeechRecognitionModule.stop;
    abort = ExpoSpeechRecognitionModule.abort;
    #onstart = null;
    set onstart(listener) {
        this._setListeners("start", listener, this.#onstart);
        this.#onstart = listener;
    }
    /** Fired when the speech recognition starts. */
    get onstart() {
        return this.#onstart;
    }
    #onend = null;
    set onend(listener) {
        this._setListeners("end", (ev) => {
            listener?.call(this, ev);
        }, this.#onend);
        this.#onend = listener;
    }
    /** Fired when the speech recognition service has disconnected. */
    get onend() {
        return this.#onend;
    }
    #onerror = null;
    set onerror(listener) {
        this._setListeners("error", listener, this.#onerror);
        this.#onerror = listener;
    }
    /** Fired when the speech recognition service encounters an error. */
    get onerror() {
        return this.#onerror;
    }
    _setListeners(key, listenerFn, existingListener) {
        if (existingListener) {
            this.removeEventListener(key, existingListener);
        }
        if (listenerFn) {
            this.addEventListener(key, listenerFn);
        }
    }
    #onresult = null;
    set onresult(listener) {
        this._setListeners("result", listener, this.#onresult);
        this.#onresult = listener;
    }
    /** Fired when the speech recognition service returns a result —
     *  a word or phrase has been positively recognized and this has been communicated back to the app. */
    get onresult() {
        return this.#onresult;
    }
    #onnomatch = null;
    set onnomatch(listener) {
        this._setListeners("nomatch", listener, this.#onnomatch);
        this.#onnomatch = listener;
    }
    /** Fired when the speech recognition service returns a final result with no significant recognition. */
    get onnomatch() {
        return this.#onnomatch;
    }
    #onspeechstart = null;
    set onspeechstart(listener) {
        this._setListeners("speechstart", listener, this.#onspeechstart);
        this.#onspeechstart = listener;
    }
    /** Fired when the speech recognition service returns a final result with no significant recognition. */
    get onspeechstart() {
        return this.#onspeechstart;
    }
    #onspeechend = null;
    set onspeechend(listener) {
        this._setListeners("speechend", listener, this.#onspeechend);
        this.#onspeechend = listener;
    }
    /** Fired when the speech recognition service returns a final result with no significant recognition. */
    get onspeechend() {
        return this.#onspeechend;
    }
    #onaudiostart = null;
    set onaudiostart(listener) {
        this._setListeners("audiostart", listener, this.#onaudiostart);
        this.#onaudiostart = listener;
    }
    /** Fired when the user agent has started to capture audio. */
    get onaudiostart() {
        return this.#onaudiostart;
    }
    #onaudioend = null;
    set onaudioend(listener) {
        this._setListeners("audioend", listener, this.#onaudioend);
        this.#onaudioend = listener;
    }
    /** Fired when the user agent has finished capturing audio. */
    get onaudioend() {
        return this.#onaudioend;
    }
    /** [TODO] */
    onsoundend = null;
    /** [TODO] */
    onsoundstart = null;
    addEventListener(type, listener, options) {
        const once = typeof options === "object" && options.once;
        // If the user opts in to only listening once,
        // wrap the listener in a function that removes the listener
        const wrappedListener = once
            ? ((ev) => {
                listener.call(this, ev);
                // remove the listeners from the map
                for (const sub of this.#subscriptionMap.get(listener) ?? []) {
                    sub.remove();
                }
                this.#subscriptionMap.delete(listener);
            })
            : listener;
        // Enhance the native listener with any necessary polyfills
        const enhancedEvent = WebListenerTransformers[type]?.(this, wrappedListener) ??
            stubEvent(type, this, wrappedListener);
        const subscription = ExpoSpeechRecognitionModule.addListener(enhancedEvent.eventName, 
        // @ts-expect-error
        enhancedEvent.nativeListener);
        // Store the subscriptions so we can remove them later
        // This is keyed by the listener function so we can remove all subscriptions for a given listener
        this.#subscriptionMap.set(listener, [subscription]);
    }
    removeEventListener(type, listener, options) {
        const subscriptions = this.#subscriptionMap.get(listener);
        if (subscriptions) {
            for (const subscription of subscriptions) {
                subscription.remove();
            }
            this.#subscriptionMap.delete(listener);
        }
    }
    dispatchEvent(event) {
        throw new Error("Method not implemented.");
    }
}
/**
 * This class is just a polyfill and does nothing on Android/iOS
 */
export class ExpoWebSpeechGrammarList {
    get length() {
        return this.#grammars.length;
    }
    #grammars = [];
    addFromURI(src, weight) {
        // todo
    }
    item(index) {
        return this.#grammars[index];
    }
    addFromString = (grammar, weight) => {
        // TODO: parse grammar to html entities (data:application/xml,....)
        this.#grammars.push(new ExpoWebSpeechGrammar(grammar, weight));
        // Set key on this object for compatibility with web SpeechGrammarList API
        this[this.length - 1] = this.#grammars[this.length - 1];
    };
}
export class ExpoWebSpeechGrammar {
    src = "";
    weight = 1;
    constructor(src, weight) {
        this.src = src;
        this.weight = weight ?? 1;
    }
}
class ExpoSpeechRecognitionResultList {
    #results = [];
    [Symbol.iterator]() {
        return this.#results[Symbol.iterator]();
    }
    length;
    item(index) {
        return this.#results[index];
    }
    constructor(results) {
        this.#results = results;
        this.length = results.length;
        for (let i = 0; i < this.#results.length; i++) {
            this[i] = this.#results[i];
        }
    }
}
class ExpoSpeechRecognitionResult {
    #alternatives = [];
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/SpeechRecognitionResult/isFinal) */
    isFinal;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/SpeechRecognitionResult/length) */
    length;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/SpeechRecognitionResult/item) */
    item(index) {
        return this.#alternatives[index];
    }
    [Symbol.iterator]() {
        return this.#alternatives[Symbol.iterator]();
    }
    constructor(isFinal, alternatives) {
        this.isFinal = isFinal;
        this.length = alternatives.length;
        this.#alternatives = alternatives;
        for (let i = 0; i < alternatives.length; i++) {
            this[i] = alternatives[i];
        }
    }
}
class ExpoSpeechRecognitionAlternative {
    confidence;
    transcript;
    constructor(confidence, transcript) {
        this.confidence = confidence;
        this.transcript = transcript;
    }
}
//# sourceMappingURL=ExpoWebSpeechRecognition.js.map