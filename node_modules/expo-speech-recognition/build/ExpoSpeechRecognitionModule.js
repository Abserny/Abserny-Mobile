import { requireNativeModule } from "expo";
// It loads the native module object from the JSI or falls back to
// the bridge module (from NativeModulesProxy) if the remote debugger is on.
export const ExpoSpeechRecognitionModule = requireNativeModule("ExpoSpeechRecognition");
const stop = ExpoSpeechRecognitionModule.stop;
const abort = ExpoSpeechRecognitionModule.abort;
ExpoSpeechRecognitionModule.abort = () => abort();
ExpoSpeechRecognitionModule.stop = () => stop();
//# sourceMappingURL=ExpoSpeechRecognitionModule.js.map