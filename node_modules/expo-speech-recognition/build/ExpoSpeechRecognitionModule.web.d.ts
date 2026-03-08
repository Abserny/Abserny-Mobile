import type { EventSubscription, PermissionResponse } from "expo-modules-core";
import { NativeModule } from "expo";
import type { ExpoSpeechRecognitionNativeEventMap, ExpoSpeechRecognitionNativeEvents, ExpoSpeechRecognitionOptions } from "./ExpoSpeechRecognitionModule.types";
type NativeEventListener = (event: SpeechRecognitionEventMap[keyof SpeechRecognitionEventMap]) => void;
declare class ExpoSpeechRecognitionModuleWeb extends NativeModule<ExpoSpeechRecognitionNativeEvents> {
    _clientListeners: Map<ExpoSpeechRecognitionNativeEvents[keyof ExpoSpeechRecognitionNativeEvents], NativeEventListener>;
    _nativeListeners: Map<string, Set<NativeEventListener>>;
    bindEventListener: <T extends keyof SpeechRecognitionEventMap>(eventName: T, ev: SpeechRecognitionEventMap[T]) => void;
    addListener<EventName extends keyof ExpoSpeechRecognitionNativeEventMap>(eventName: EventName, listener: ExpoSpeechRecognitionNativeEvents[EventName]): EventSubscription;
    removeAllListeners(eventName: keyof ExpoSpeechRecognitionNativeEventMap): void;
    start(options: ExpoSpeechRecognitionOptions): void;
    getStateAsync(): Promise<string>;
    stop(): void;
    abort(): void;
    requestPermissionsAsync(): Promise<PermissionResponse>;
    getPermissionsAsync(): Promise<PermissionResponse>;
    getMicrophonePermissionsAsync(): Promise<PermissionResponse>;
    requestMicrophonePermissionsAsync(): Promise<PermissionResponse>;
    getSpeechRecognizerPermissionsAsync(): Promise<PermissionResponse>;
    requestSpeechRecognizerPermissionsAsync(): Promise<PermissionResponse>;
    getSupportedLocales(): Promise<{
        locales: string[];
        installedLocales: string[];
    }>;
    getSpeechRecognitionServices(): string[];
    getDefaultRecognitionService(): {
        packageName: string;
    };
    getAssistantService(): {
        packageName: string;
    };
    supportsOnDeviceRecognition(): boolean;
    supportsRecording(): boolean;
    androidTriggerOfflineModelDownload(): Promise<{
        status: string;
        message: string;
    }>;
    setCategoryIOS(): void;
    getAudioSessionCategoryAndOptionsIOS(): {
        category: string;
        categoryOptions: string[];
        mode: string;
    };
    setAudioSessionActiveIOS(): void;
    isRecognitionAvailable(): boolean;
}
export declare const ExpoSpeechRecognitionModule: typeof ExpoSpeechRecognitionModuleWeb;
export {};
//# sourceMappingURL=ExpoSpeechRecognitionModule.web.d.ts.map