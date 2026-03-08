let browserSpeechRecognition = null;
let browserSpeechGrammarList = null;
let browserSpeechRecognitionEvent = null;
if (typeof webkitSpeechRecognition !== "undefined") {
    browserSpeechRecognition = webkitSpeechRecognition;
    browserSpeechGrammarList =
        typeof webkitSpeechGrammarList !== "undefined"
            ? webkitSpeechGrammarList
            : null;
    browserSpeechRecognitionEvent =
        typeof webkitSpeechRecognitionEvent !== "undefined"
            ? webkitSpeechRecognitionEvent
            : null;
}
else if (typeof SpeechRecognition !== "undefined") {
    browserSpeechRecognition = SpeechRecognition;
    browserSpeechGrammarList =
        typeof SpeechGrammarList !== "undefined" ? SpeechGrammarList : null;
    browserSpeechRecognitionEvent =
        typeof SpeechRecognitionEvent !== "undefined"
            ? SpeechRecognitionEvent
            : null;
}
export const ExpoWebSpeechRecognition = browserSpeechRecognition;
export const ExpoWebSpeechGrammarList = browserSpeechGrammarList;
export const ExpoWebSpeechRecognitionEvent = browserSpeechRecognitionEvent;
//# sourceMappingURL=ExpoWebSpeechRecognition.web.js.map