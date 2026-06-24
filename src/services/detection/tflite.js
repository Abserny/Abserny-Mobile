/**
 * services/detection/tflite.js
 * EfficientDet-Lite2 offline inference.
 * Edit this file when: swapping the model, fixing the decoder, tuning thresholds.
 *
 * MODEL FACTS (post-processed / metadata variant — 4 output tensors):
 *   Input:    float32 [1, 448, 448, 3]  values 0.0–1.0
 *   Output 0: float32 [N×4]  — boxes   ymin, xmin, ymax, xmax (0–1)
 *   Output 1: float32 [N]    — classes  0-indexed COCO
 *   Output 2: float32 [N]    — scores   0–1
 *   Output 3: float32 [1]    — count    valid detections
 *
 * If you still see "Raw SSD output detected" in logs: wrong model file.
 * Replace assets/models/efficientdet_lite2.tflite with the metadata variant
 * from https://tfhub.dev/tensorflow/lite-model/efficientdet/lite2/detection/metadata/1
 */

import * as FileSystem   from 'expo-file-system/legacy';
import { normalizeArabicForTTS } from '../tts/normalize';

// ── Model singleton ───────────────────────────────────────────────────────────
let _model      = null;
let _modelState = 'idle';   // 'idle' | 'loading' | 'ready' | 'error'
let _loadPromise = null;
let _subscribers = [];

export function getModelState() { return _modelState; }

export function subscribeModelState(cb) {
    _subscribers.push(cb);
    return () => { _subscribers = _subscribers.filter(s => s !== cb); };
}

function _notifySubscribers() {
    _subscribers.forEach(cb => { try { cb(_modelState); } catch (_) {} });
}

export async function ensureModel() {
    if (_modelState === 'ready')   return _model;
    if (_modelState === 'loading') return _loadPromise;
    if (_modelState === 'error')   throw new Error('TFLite model failed to load');

    _modelState  = 'loading';
    _notifySubscribers();
    _loadPromise = (async () => {
        try {
            console.log('[Abserny] Loading EfficientDet-Lite2...');
            const { loadTensorflowModel } = require('react-native-fast-tflite');
            // ── PATH: updated to assets/models/ after scaffold ──
            _model      = await loadTensorflowModel(require('../../../assets/models/efficientdet_lite2.tflite'));
            _modelState = 'ready';
            _notifySubscribers();
            console.log('[Abserny] EfficientDet-Lite2 ready.');
            return _model;
        } catch (err) {
            _modelState = 'error';
            _notifySubscribers();
            console.error('[Abserny] TFLite load error:', err.message);
            throw err;
        }
    })();
    return _loadPromise;
}

// ── COCO 90-class names ───────────────────────────────────────────────────────
const COCO_CLASSES_90 = [
    'person','bicycle','car','motorcycle','airplane','bus','train','truck','boat',
    'traffic light','fire hydrant','stop sign','parking meter','bench','bird','cat',
    'dog','horse','sheep','cow','elephant','bear','zebra','giraffe','backpack',
    'umbrella','handbag','tie','suitcase','frisbee','skis','snowboard','sports ball',
    'kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket',
    'bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple',
    'sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair',
    'couch','potted plant','bed','dining table','toilet','tv','laptop','mouse',
    'remote','keyboard','cell phone','microwave','oven','toaster','sink',
    'refrigerator','book','clock','vase','scissors','teddy bear','hair drier',
    'toothbrush',
];

const COCO_AR = {
    'person':'شخص','bicycle':'دراجة','car':'سيارة','motorcycle':'دراجة نارية',
    'airplane':'طائرة','bus':'حافلة','train':'قطار','truck':'شاحنة',
    'boat':'قارب','traffic light':'إشارة مرور','fire hydrant':'صنبور إطفاء',
    'stop sign':'لافتة توقف','bench':'مقعد','bird':'طائر','cat':'قطة',
    'dog':'كلب','horse':'حصان','sheep':'خروف','cow':'بقرة','elephant':'فيل',
    'bear':'دب','zebra':'حمار وحشي','giraffe':'زرافة','backpack':'حقيبة ظهر',
    'umbrella':'مظلة','handbag':'حقيبة يد','tie':'ربطة عنق','suitcase':'حقيبة سفر',
    'sports ball':'كرة','bottle':'زجاجة','wine glass':'كأس','cup':'كوب',
    'fork':'شوكة','knife':'سكين','spoon':'ملعقة','bowl':'وعاء','banana':'موزة',
    'apple':'تفاحة','sandwich':'ساندويش','orange':'برتقالة','broccoli':'بروكلي',
    'carrot':'جزرة','hot dog':'هوت دوج','pizza':'بيتزا','cake':'كعكة',
    'chair':'كرسي','couch':'أريكة','potted plant':'نبتة','bed':'سرير',
    'dining table':'طاولة طعام','toilet':'مرحاض','tv':'تلفاز','laptop':'حاسوب محمول',
    'mouse':'فأرة','remote':'جهاز تحكم','keyboard':'لوحة مفاتيح',
    'cell phone':'هاتف محمول','microwave':'ميكرويف','oven':'فرن',
    'sink':'حوض','refrigerator':'ثلاجة','book':'كتاب','clock':'ساعة حائط',
    'vase':'مزهرية','scissors':'مقص','teddy bear':'دمية دب','toothbrush':'فرشاة أسنان',
};

const HAZARD_CLASSES = new Set([
    'car','motorcycle','bus','truck','train','bicycle',
    'traffic light','stop sign','fire hydrant','bear','dog',
]);
const PERSON_CLASS   = 'person';
// DIAGNOSTIC: lowered to 0.01 to see if ANY detection passes at all.
// If we still get 0 detections with threshold=0.01, the scores tensor is wrong.
// Once working, raise back to 0.50 for high accuracy.
const SCORE_THRESH   = 0.50;  // High threshold to prevent random hallucinations
const NMS_IOU_THRESH = 0.45;
const MAX_DETECTIONS = 5;
const MODEL_SIZE     = 448;   // EfficientDet-Lite2 STRICTLY requires 448x448 input

// ── Helpers ───────────────────────────────────────────────────────────────────
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

function iou(a, b) {
    const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]);
    const x2 = Math.min(a[2], b[2]), y2 = Math.min(a[3], b[3]);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (inter === 0) return 0;
    return inter / ((a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - inter);
}

function nms(boxes, scores, iouThresh) {
    const order      = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
    const keep       = [];
    const suppressed = new Set();
    for (const i of order) {
        if (suppressed.has(i)) continue;
        keep.push(i);
        for (const j of order) {
            if (j === i || suppressed.has(j)) continue;
            if (iou(boxes[i], boxes[j]) > iouThresh) suppressed.add(j);
        }
    }
    return keep;
}

// ── Post-processed decoder (MediaPipe EfficientDet-Lite2 int8) ───────────────
// Tensor layout confirmed for MediaPipe int8 variant:
//   tensors[0]: boxes      float32[N×4]  ymin,xmin,ymax,xmax  (0–1)
//   tensors[1]: classes    float32[N]    0-indexed COCO class IDs (0=person etc)
//   tensors[2]: scores     float32[N]    dequantized 0–1 (NO sigmoid needed)
//   tensors[3]: count      float32[1]    valid detection count
//
// Scores are already dequantized by the TFLite runtime — do NOT apply sigmoid.
// Applying sigmoid to already-sigmoid'd values squashes them toward 0.5 and
// makes genuine high-confidence detections look mediocre.
function decodePostProcessed(tensors) {
    const classesTensor = tensors[1];
    const scoresTensor  = tensors[2];
    const N             = classesTensor.length;

    console.log(`[Abserny] PostProc: N=${N} top5scores=${
        Array.from(scoresTensor).slice(0, 5).map(s => s.toFixed(3)).join(',')
    }`);

    const seen       = new Set();
    const detections = [];

    for (let i = 0; i < N; i++) {
        const score = scoresTensor[i];
        if (score < SCORE_THRESH) continue;
        const classIdx  = Math.round(classesTensor[i]);
        // COCO_CLASSES_90 is 0-indexed but TFLite metadata models use 1-indexed COCO
        // MediaPipe uses 0-indexed (0=person, 1=bicycle, ...) — match directly
        const className = COCO_CLASSES_90[classIdx] ?? '';
        if (!className || seen.has(className)) continue;
        seen.add(className);
        detections.push({ className, score });
    }
    return detections;
}

// ── Raw SSD fallback decoder (wrong model — keep until replaced) ──────────────
// This fires when the model has 2 output tensors instead of 4.
// Raw SSD logits are much noisier than post-processed scores — raise the
// threshold and deduplicate strictly (1 detection per class, not 2).
const RAW_SSD_THRESH = 0.55;  // higher than SCORE_THRESH (0.40) — raw logits are noisy

function decodeSSDOutputs(scoresTensor, boxesTensor) {
    const numAnchors = 37629;
    const numClasses = 90;
    const detections = [];
    for (let a = 0; a < numAnchors; a++) {
        const off = a * numClasses;
        let maxScore = -Infinity, maxClass = -1;
        for (let c = 0; c < numClasses; c++) {
            const s = sigmoid(scoresTensor[off + c]);
            if (s > maxScore) { maxScore = s; maxClass = c; }
        }
        if (maxScore < RAW_SSD_THRESH) continue;
        const className = COCO_CLASSES_90[maxClass] ?? '';
        if (!className) continue;
        const b = a * 4;
        const ymin = Math.max(0, boxesTensor[b]);
        const xmin = Math.max(0, boxesTensor[b+1]);
        const ymax = Math.min(1, boxesTensor[b+2]);
        const xmax = Math.min(1, boxesTensor[b+3]);
        if (xmax <= xmin || ymax <= ymin) continue;
        if ((xmax-xmin)*(ymax-ymin) > 0.9) continue;
        detections.push({ className, score: maxScore, box: [xmin, ymin, xmax, ymax] });
    }
    if (!detections.length) return [];
    const byClass = {};
    for (const d of detections) {
        if (!byClass[d.className]) byClass[d.className] = [];
        byClass[d.className].push(d);
    }
    const results = [];
    for (const className of Object.keys(byClass)) {
        const group = byClass[className];
        const kept  = nms(group.map(d => d.box), group.map(d => d.score), NMS_IOU_THRESH);
        // FIX: slice(0, 1) — only the top detection per class.
        // Previously slice(0, 2) allowed duplicates like "vase:0.65, vase:0.63".
        if (kept.length > 0) results.push({ className: group[kept[0]].className, score: group[kept[0]].score });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, MAX_DETECTIONS);
}

// ── JPEG → Uint8Array ─────────────────────────────────────────────────────────
// MediaPipe EfficientDet-Lite2 int8 model expects UINT8 input (0-255), not float.
// The TFLite runtime handles int8 quantization internally — we just pass raw pixels.
function jpegBase64ToUint8(base64Jpeg) {
    const jpegJs = require('jpeg-js');
    const bytes  = Uint8Array.from(atob(base64Jpeg), c => c.charCodeAt(0));
    const { data, width, height } = jpegJs.decode(bytes.buffer, { useTArray: true, formatAsRGBA: true });
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        rgb[i*3]   = data[i*4];    // R 0-255
        rgb[i*3+1] = data[i*4+1]; // G 0-255
        rgb[i*3+2] = data[i*4+2]; // B 0-255
    }
    console.log(`[Abserny] First pixel RGB: ${rgb[0]}, ${rgb[1]}, ${rgb[2]} (uint8)`);
    return rgb;
}

// ── Description builder ───────────────────────────────────────────────────────
function getOfflineMsg(lang, mode) {
    if (mode === '__watch__') return lang === 'ar' ? 'واضح' : 'CLEAR';
    if (mode === 'people')    return lang === 'ar'
        ? normalizeArabicForTTS('لا يوجد أشخاص.')
        : 'No people detected.';
    if (mode === 'object')    return lang === 'ar'
        ? normalizeArabicForTTS('لم يُتعرَّف على الشيء.')
        : 'Object not recognized.';
    return lang === 'ar'
        ? normalizeArabicForTTS('لم يُتعرَّف على شيء.')
        : 'Nothing detected.';
}

function buildDescription(detections, mode, lang) {
    const ar = lang === 'ar';
    const tr = (name) => ar ? (COCO_AR[name] ?? name) : name;

    // ── Watch mode: hazard or person → brief alert, else CLEAR ───────────────
    if (mode === '__watch__') {
        const hazard = detections.find(d => HAZARD_CLASSES.has(d.className));
        if (hazard) {
            const n = tr(hazard.className);
            return ar ? normalizeArabicForTTS(`${n} أمامك.`) : `${n} ahead.`;
        }
        if (detections.find(d => d.className === PERSON_CLASS))
            return ar ? normalizeArabicForTTS('شخص بالقرب.') : 'Person nearby.';
        return ar ? 'واضح' : 'CLEAR';
    }

    // ── People mode: count persons only ──────────────────────────────────────
    if (mode === 'people') {
        const persons = detections.filter(d => d.className === PERSON_CLASS);
        if (!persons.length) return getOfflineMsg(lang, 'people');
        if (persons.length === 1) return ar ? normalizeArabicForTTS('شخص أمامك.') : 'One person ahead.';
        return ar
            ? normalizeArabicForTTS(`${persons.length} أشخاص أمامك.`)
            : `${persons.length} people ahead.`;
    }

    // ── Object mode: top-1 detection only ────────────────────────────────────
    // The user holds something close to the camera. We require a higher
    // confidence (0.55+) to prevent the model from wildly guessing unknown items.
    if (mode === 'object') {
        const top = detections[0];
        if (!top || top.score < 0.55) return getOfflineMsg(lang, 'object');
        const name = tr(top.className);
        return ar
            ? normalizeArabicForTTS(`${name}.`)
            : `A ${name}.`;
    }

    // ── Scene mode: spatial summary, up to 3 items ───────────────────────────
    // Take the absolute top 3 highest-confidence items in the scene.
    // We no longer force low-confidence persons/hazards to the front.
    const ordered = detections.slice(0, 3);

    if (!ordered.length) return getOfflineMsg(lang, mode);

    if (ar) {
        const n0 = tr(ordered[0].className);
        const n1 = ordered[1] ? tr(ordered[1].className) : null;
        const n2 = ordered[2] ? tr(ordered[2].className) : null;
        if (!n1) return normalizeArabicForTTS(`هذا المشهد يحتوي على ${n0}.`);
        if (!n2) return normalizeArabicForTTS(`هذا المشهد يحتوي على ${n0} و${n1}.`);
        return normalizeArabicForTTS(`هذا المشهد يحتوي على ${n0}، ${n1}، و${n2}.`);
    }

    const art = (w) => (/^[aeiouAEIOU]/.test(w) ? 'an' : 'a');
    const w0 = ordered[0].className;
    const w1 = ordered[1]?.className;
    const w2 = ordered[2]?.className;
    if (!w1) return `This scene contains ${art(w0)} ${w0}.`;
    if (!w2) return `This scene contains ${art(w0)} ${w0} and ${art(w1)} ${w1}.`;
    return `This scene contains ${art(w0)} ${w0}, ${art(w1)} ${w1}, and ${art(w2)} ${w2}.`;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function detectWithTFLite(base64, mode, lang) {
    const model = await ensureModel();
    const ImageManipulator = require('expo-image-manipulator');

    const inPath = `${FileSystem.cacheDirectory}abserny_in_${Date.now()}.jpg`;
    let resizedUri = null;

    try {
        await FileSystem.writeAsStringAsync(inPath, base64, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const resized = await ImageManipulator.manipulateAsync(
            inPath,
            [{ resize: { width: MODEL_SIZE, height: MODEL_SIZE } }],
            { format: ImageManipulator.SaveFormat.JPEG, compress: 0.95, base64: true },
        );
        resizedUri = resized.uri;

        const inputPixels = jpegBase64ToUint8(resized.base64);
        console.log(`[Abserny] TFLite input: ${inputPixels.length} bytes (uint8 ${MODEL_SIZE}×${MODEL_SIZE}×3)`);

        const outputs = await model.run([inputPixels]);



        const tensors = Object.values(outputs);
        console.log(`[Abserny] TFLite tensors: ${tensors.length}, sizes: ${tensors.map(t => t?.length ?? 0).join(',')}`);

        let detections;
        if (tensors.length >= 4) {
            // Log the count tensor value — tells us if model thinks 0 objects found
            console.log(`[Abserny] count tensor value: ${tensors[3][0]}`);

            // Try the standard ordering first: [boxes(4N), classes(N), scores(N), count(1)]
            detections = decodePostProcessed(tensors);

            // If still zero, try swapped ordering: [boxes(4N), scores(N), classes(N), count(1)]
            // Some EfficientDet variants swap classes and scores.
            if (!detections.length) {
                console.log('[Abserny] Standard order gave 0 — trying swapped scores/classes');
                const swapped = [tensors[0], tensors[2], tensors[1], tensors[3]];
                detections = decodePostProcessed(swapped);
                if (detections.length) console.log('[Abserny] Swapped order worked!');
            }
        } else {
            console.warn('[Abserny] Raw SSD output — replace model file for accurate results');
            detections = decodeSSDOutputs(tensors[0], tensors[1]);
        }
        console.log(`[Abserny] Detections: ${detections.length}`,
            detections.slice(0,3).map(d => `${d.className}:${d.score.toFixed(2)}`).join(', '));

        if (!detections.length) return getOfflineMsg(lang, mode);
        return buildDescription(detections, mode, lang);

    } finally {
        FileSystem.deleteAsync(inPath,       { idempotent: true }).catch(() => {});
        if (resizedUri) FileSystem.deleteAsync(resizedUri, { idempotent: true }).catch(() => {});
    }
}
