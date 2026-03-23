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

export async function ensureModel() {
    if (_modelState === 'ready')   return _model;
    if (_modelState === 'loading') return _loadPromise;
    if (_modelState === 'error')   throw new Error('TFLite model failed to load');

    _modelState  = 'loading';
    _loadPromise = (async () => {
        try {
            console.log('[Abserny] Loading EfficientDet-Lite2...');
            const { loadTensorflowModel } = require('react-native-fast-tflite');
            // ── PATH: updated to assets/models/ after scaffold ──
            _model      = await loadTensorflowModel(require('../../../assets/models/efficientdet_lite2.tflite'));
            _modelState = 'ready';
            console.log('[Abserny] EfficientDet-Lite2 ready.');
            return _model;
        } catch (err) {
            _modelState = 'error';
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
const SCORE_THRESH   = 0.40;
const NMS_IOU_THRESH = 0.45;
const MAX_DETECTIONS = 5;
const MODEL_SIZE     = 448;

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

// ── Post-processed decoder (correct model — 4 tensors) ────────────────────────
function decodePostProcessed(tensors) {
    const boxes   = tensors[0];
    const classes = tensors[1];
    const scores  = tensors[2];
    const count   = Math.min(Math.round(tensors[3][0]), classes.length);
    const seen    = new Set();
    const detections = [];
    for (let i = 0; i < count; i++) {
        const score = scores[i];
        if (score < SCORE_THRESH) continue;
        const className = COCO_CLASSES_90[Math.round(classes[i])] ?? '';
        if (!className || seen.has(className)) continue;
        seen.add(className);
        detections.push({ className, score });
    }
    return detections;
}

// ── Raw SSD fallback decoder (wrong model — keep until replaced) ──────────────
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
        if (maxScore < SCORE_THRESH) continue;
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
        const group  = byClass[className];
        const kept   = nms(group.map(d => d.box), group.map(d => d.score), NMS_IOU_THRESH);
        for (const idx of kept.slice(0, 2)) results.push({ className: group[idx].className, score: group[idx].score });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, MAX_DETECTIONS);
}

// ── JPEG → Float32Array ───────────────────────────────────────────────────────
function jpegBase64ToFloat32(base64Jpeg) {
    const jpegJs = require('jpeg-js');
    const bytes  = Uint8Array.from(atob(base64Jpeg), c => c.charCodeAt(0));
    const { data, width, height } = jpegJs.decode(bytes.buffer, { useTArray: true, formatAsRGBA: true });
    const rgb = new Float32Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        rgb[i*3]   = data[i*4]   / 255;
        rgb[i*3+1] = data[i*4+1] / 255;
        rgb[i*3+2] = data[i*4+2] / 255;
    }
    return rgb;
}

// ── Description builder ───────────────────────────────────────────────────────
function getOfflineMsg(lang, mode) {
    if (mode === '__watch__') return lang === 'ar' ? 'واضح' : 'CLEAR';
    if (mode === 'people')    return lang === 'ar'
        ? normalizeArabicForTTS('لا يوجد أشخاص.')
        : 'No people detected.';
    return lang === 'ar'
        ? normalizeArabicForTTS('لم يُتعرَّف على شيء.')
        : 'Nothing detected.';
}

function buildDescription(detections, mode, lang) {
    const ar = lang === 'ar';
    const tr = (name) => ar ? (COCO_AR[name] ?? name) : name;

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

    if (mode === 'people') {
        const persons = detections.filter(d => d.className === PERSON_CLASS);
        if (!persons.length) return getOfflineMsg(lang, 'people');
        if (persons.length === 1) return ar ? normalizeArabicForTTS('شخص أمامك.') : 'One person ahead.';
        return ar
            ? normalizeArabicForTTS(`${persons.length} أشخاص أمامك.`)
            : `${persons.length} people ahead.`;
    }

    const ordered = [
        ...detections.filter(d => HAZARD_CLASSES.has(d.className)),
        ...detections.filter(d => d.className === PERSON_CLASS),
        ...detections.filter(d => !HAZARD_CLASSES.has(d.className) && d.className !== PERSON_CLASS),
    ];
    const n1  = tr(ordered[0].className);
    const n2  = ordered[1] ? tr(ordered[1].className) : null;
    if (ar) return normalizeArabicForTTS(n2 ? `${n1} و${n2} أمامك.` : `${n1} أمامك.`);
    const art = /^[aeiouAEIOU]/.test(n1) ? 'An' : 'A';
    return n2 ? `${art} ${n1} ahead, and a ${n2}.` : `${art} ${n1} ahead.`;
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

        const inputPixels = jpegBase64ToFloat32(resized.base64);
        console.log(`[Abserny] TFLite input: ${inputPixels.length} floats`);

        const outputs = await model.run([inputPixels]);
        const tensors = Object.values(outputs);
        console.log(`[Abserny] TFLite tensors: ${tensors.length}, sizes: ${tensors.map(t => t?.length ?? 0).join(',')}`);

        let detections;
        if (tensors.length >= 4) {
            detections = decodePostProcessed(tensors);
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
