/**
 * useDetection.js — Gemini online + EfficientDet-Lite2 offline
 *
 * MODEL FACTS (confirmed from model.inputs / model.outputs logs):
 *   Input:    float32, shape [1, 448, 448, 3], values 0.0–1.0
 *   Output 0: float32, shape [1, 37629, 90]  — raw class scores per anchor
 *   Output 1: float32, shape [1, 37629, 4]   — raw box deltas per anchor
 *
 * This is an SSD (Single Shot Detector) raw output — NOT post-processed.
 * We must decode boxes and apply greedy NMS ourselves.
 *
 * PIXEL PIPELINE:
 *   jpeg-js (pure JS, no native code) decodes the resized JPEG → RGBA Uint8Array
 *   We strip the alpha channel and normalize RGB to Float32 [0,1]
 *   Result: Float32Array of 448 * 448 * 3 = 602,112 values
 */

import { useCallback, useRef } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { GEMINI_PROMPTS } from './useLanguage';
import { WATCH_PROMPTS }  from './useWatchMode';
import { normalizeArabicForTTS } from './ttsUtils';

// ── Gemini key pool ───────────────────────────────────────────────────────────
const RAW_KEYS = (() => {
    const extra = Constants.expoConfig?.extra ?? {};
    if (Array.isArray(extra.geminiKeys) && extra.geminiKeys.length > 0) {
        return extra.geminiKeys.filter(
            k => k && k.length > 20 && !k.startsWith('PASTE') && !k.startsWith('YOUR')
        );
    }
    if (extra.geminiKey && extra.geminiKey.length > 20
        && !extra.geminiKey.startsWith('PASTE') && !extra.geminiKey.startsWith('YOUR')) {
        return [extra.geminiKey];
    }
    return [];
})();

function getPacificDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

const keyState = { idx: 0, exhausted: new Map() };
if (__DEV__) { keyState.exhausted.clear(); }

function isExhausted(k)   { return keyState.exhausted.get(k) === getPacificDate(); }
function markExhausted(k) { keyState.exhausted.set(k, getPacificDate()); console.warn(`[Abserny] Key ...${k.slice(-6)} RPD exhausted`); }
function rotateKey()      { keyState.idx = (keyState.idx + 1) % Math.max(1, RAW_KEYS.length); }
function getActiveKey()   {
    if (!RAW_KEYS.length) return null;
    for (let i = 0; i < RAW_KEYS.length; i++) {
        const k = RAW_KEYS[(keyState.idx + i) % RAW_KEYS.length];
        if (!isExhausted(k)) { keyState.idx = (keyState.idx + i) % RAW_KEYS.length; return k; }
    }
    return null;
}

// ── Gemini config ─────────────────────────────────────────────────────────────
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=';
const TIMEOUT_MS  = 20000;
const MAX_TOKENS  = { scene: 80, object: 60, read: 400, people: 80, __watch__: 40 };
const TEMPERATURE = { scene: 0.2, object: 0.15, read: 0.0, people: 0.2, __watch__: 0.1 };

// ── EfficientDet model singleton ──────────────────────────────────────────────
let _model       = null;
let _modelState  = 'idle';
let _loadPromise = null;

async function ensureModel() {
    if (_modelState === 'ready')   return _model;
    if (_modelState === 'loading') return _loadPromise;
    if (_modelState === 'error')   throw new Error('TFLite model failed to load');

    _modelState  = 'loading';
    _loadPromise = (async () => {
        try {
            console.log('[Abserny] Loading EfficientDet-Lite2...');
            const { loadTensorflowModel } = require('react-native-fast-tflite');
            _model      = await loadTensorflowModel(require('../assets/efficientdet_lite2.tflite'));
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

// ── COCO class names — 90 classes, 0-indexed ──────────────────────────────────
// The output tensor has shape [1, 37629, 90] — index 0 = person, etc.
// This matches the standard COCO 90-class ordering used by SSD models.
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

const HAZARD_CLASSES = new Set(['car','motorcycle','bus','truck','train','bicycle',
    'traffic light','stop sign','fire hydrant','bear','dog']);
const PERSON_CLASS = 'person';
const SCORE_THRESH   = 0.40;
const NMS_IOU_THRESH = 0.45;
const MAX_DETECTIONS = 5;
const MODEL_SIZE = 448;  // EfficientDet-Lite2 input: 448×448

// ── Sigmoid ───────────────────────────────────────────────────────────────────
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

// ── IoU for NMS ───────────────────────────────────────────────────────────────
function iou(a, b) {
    const x1 = Math.max(a[0], b[0]);
    const y1 = Math.max(a[1], b[1]);
    const x2 = Math.min(a[2], b[2]);
    const y2 = Math.min(a[3], b[3]);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (inter === 0) return 0;
    const aArea = (a[2] - a[0]) * (a[3] - a[1]);
    const bArea = (b[2] - b[0]) * (b[3] - b[1]);
    return inter / (aArea + bArea - inter);
}

// ── Greedy NMS ────────────────────────────────────────────────────────────────
function nms(boxes, scores, iouThresh) {
    // boxes: [[x1,y1,x2,y2], ...], scores: [float, ...]
    const order = scores.map((s, i) => i).sort((a, b) => scores[b] - scores[a]);
    const keep = [];
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

// ── Post-processed output decoder (correct model) ────────────────────────────
// SSD MobileNet V1 output:
//   tensors[0] = boxes   Float32[N×4]  — ymin, xmin, ymax, xmax (values 0-1 or 0-300)
//   tensors[1] = classes Float32[N]    — class ID (1-indexed COCO 90-class in this model)
//   tensors[2] = scores  Float32[N]    — confidence 0-1 (already post-processed, no sigmoid)
//   tensors[3] = count   Float32[1]    — number of valid detections
// N = total slots (usually 10 for this model)
// Results are already sorted by score descending — just filter and deduplicate.
function decodePostProcessed(tensors) {
    const boxes   = tensors[0]; // Float32[N*4]
    const classes = tensors[1]; // Float32[N]
    const scores  = tensors[2]; // Float32[N]
    const count   = Math.min(Math.round(tensors[3][0]), classes.length);

    const seen = new Set(); // deduplicate — keep only top score per class
    const detections = [];

    for (let i = 0; i < count; i++) {
        const score = scores[i];
        if (score < SCORE_THRESH) continue;

        // EfficientDet-Lite2 (MediaPipe) uses 0-indexed COCO classes
        const classId   = Math.round(classes[i]);
        const className = COCO_CLASSES_90[classId] ?? '';
        if (!className) continue;

        // Skip duplicate classes — model already sorted by score,
        // so the first occurrence is the highest confidence one
        if (seen.has(className)) continue;
        seen.add(className);

        detections.push({ className, score });
    }

    return detections;
}

// ── Raw SSD output decoder (fallback — wrong model, results inaccurate) ───────
//
// Output 0: scores  float32 [1, 37629, 90] — raw logits per anchor per class
// Output 1: boxes   float32 [1, 37629, 4]  — box deltas [cx, cy, w, h] normalized
//
// Steps:
//   1. Apply sigmoid to scores to get probabilities
//   2. Find the max class score per anchor
//   3. Keep anchors above SCORE_THRESH
//   4. Decode box deltas to [x1, y1, x2, y2]
//   5. Apply NMS per class
//
function decodeSSDOutputs(scoresTensor, boxesTensor) {
    const numAnchors = 37629;
    const numClasses = 90;
    const detections = [];

    // First pass: find all anchors with a class score above threshold
    for (let a = 0; a < numAnchors; a++) {
        const scoreOffset = a * numClasses;
        let maxScore = -Infinity;
        let maxClass = -1;

        for (let c = 0; c < numClasses; c++) {
            const rawScore = scoresTensor[scoreOffset + c];
            const score = sigmoid(rawScore);
            if (score > maxScore) {
                maxScore = score;
                maxClass = c;
            }
        }

        if (maxScore < SCORE_THRESH) continue;

        const className = COCO_CLASSES_90[maxClass] ?? '';
        if (!className) continue;

        // Decode box: EfficientDet outputs [ymin, xmin, ymax, xmax] normalized 0-1
        const boxOffset = a * 4;
        const ymin = Math.max(0, boxesTensor[boxOffset]);
        const xmin = Math.max(0, boxesTensor[boxOffset + 1]);
        const ymax = Math.min(1, boxesTensor[boxOffset + 2]);
        const xmax = Math.min(1, boxesTensor[boxOffset + 3]);

        // Skip degenerate boxes
        if (xmax <= xmin || ymax <= ymin) continue;
        // Skip boxes that cover nearly the entire image — usually background noise
        const area = (xmax - xmin) * (ymax - ymin);
        if (area > 0.9) continue;

        detections.push({ className, score: maxScore, box: [xmin, ymin, xmax, ymax] });
    }

    if (!detections.length) return [];

    // Group by class for NMS
    const byClass = {};
    for (const d of detections) {
        if (!byClass[d.className]) byClass[d.className] = [];
        byClass[d.className].push(d);
    }

    const results = [];
    for (const className of Object.keys(byClass)) {
        const group = byClass[className];
        const boxes  = group.map(d => d.box);
        const scores = group.map(d => d.score);
        const kept   = nms(boxes, scores, NMS_IOU_THRESH);
        for (const idx of kept.slice(0, 2)) { // max 2 per class
            results.push({ className: group[idx].className, score: group[idx].score });
        }
    }

    // Sort by score descending, cap at MAX_DETECTIONS
    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_DETECTIONS);
}

// ── JPEG → Float32Array ───────────────────────────────────────────────────────
// EfficientDet-Lite2 (MediaPipe float32 model) input: float32 [1, 448, 448, 3]
// Values normalized 0.0–1.0. jpeg-js: npm install jpeg-js
function jpegBase64ToFloat32(base64Jpeg) {
    const jpegJs = require('jpeg-js');
    const binaryStr = atob(base64Jpeg);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    const { data, width, height } = jpegJs.decode(bytes.buffer, {
        useTArray: true,
        formatAsRGBA: true,
    });
    // RGBA → RGB Float32 normalized to [0, 1]
    const rgb = new Float32Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        rgb[i * 3]     = data[i * 4]     / 255.0; // R
        rgb[i * 3 + 1] = data[i * 4 + 1] / 255.0; // G
        rgb[i * 3 + 2] = data[i * 4 + 2] / 255.0; // B
    }
    return rgb;
}

// ── EfficientDet inference ────────────────────────────────────────────────────
async function detectWithTFLite(base64, mode, lang) {
    const model = await ensureModel();
    const ImageManipulator = require('expo-image-manipulator');

    const inPath = `${FileSystem.cacheDirectory}abserny_in_${Date.now()}.jpg`;
    let resizedUri = null;

    try {
        await FileSystem.writeAsStringAsync(inPath, base64, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Resize to model input size
        const resized = await ImageManipulator.manipulateAsync(
            inPath,
            [{ resize: { width: MODEL_SIZE, height: MODEL_SIZE } }],
            { format: ImageManipulator.SaveFormat.JPEG, compress: 0.95, base64: true },
        );
        resizedUri = resized.uri;

        // Decode JPEG → Float32Array normalized 0-1
        const inputPixels = jpegBase64ToFloat32(resized.base64);
        console.log(`[Abserny] TFLite input: ${inputPixels.length} floats (expected: ${MODEL_SIZE * MODEL_SIZE * 3})`);

        // Run inference
        const outputs  = await model.run([inputPixels]);
        const tensors  = Object.values(outputs);
        console.log(`[Abserny] TFLite raw output tensors: ${tensors.length}, sizes: ${tensors.map(t => t?.length ?? 0).join(',')}`);

        // Route based on output shape — handles both model variants:
        //   Post-processed (correct model): 4 tensors [boxes, classes, scores, count]
        //   Raw SSD (wrong model):          2 tensors [scores[N×90], boxes[N×4]]
        if (tensors.length < 2) {
            console.warn('[Abserny] TFLite unexpected output — fewer than 2 tensors');
            return getOfflineMsg(lang, mode);
        }

        const isPostProcessed = tensors.length >= 4;

        let detections;
        if (isPostProcessed) {
            // ── Post-processed model (correct): 4 tensors ────────────────────
            // tensors[0] = boxes   Float32[N×4]  ymin,xmin,ymax,xmax normalized
            // tensors[1] = classes Float32[N]    class IDs 0-indexed
            // tensors[2] = scores  Float32[N]    confidence 0–1
            // tensors[3] = count   Float32[1]    valid detection count
            detections = decodePostProcessed(tensors);
        } else {
            // ── Raw SSD model (wrong file — replace it): 2 tensors ───────────
            // This path is kept as a fallback but results will be inaccurate
            // without anchor priors. Replace the .tflite file to fix.
            console.warn('[Abserny] Raw SSD output detected — replace model file for accurate results');
            detections = decodeSSDOutputs(tensors[0], tensors[1]);
        }
        console.log(`[Abserny] TFLite detections after NMS: ${detections.length}`,
            detections.slice(0, 3).map(d => `${d.className}:${d.score.toFixed(2)}`).join(', '));

        if (!detections.length) return getOfflineMsg(lang, mode);
        return buildDescription(detections, mode, lang);

    } finally {
        FileSystem.deleteAsync(inPath, { idempotent: true }).catch(() => {});
        if (resizedUri) FileSystem.deleteAsync(resizedUri, { idempotent: true }).catch(() => {});
    }
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
        if (detections.find(d => d.className === PERSON_CLASS)) {
            return ar ? normalizeArabicForTTS('شخص بالقرب.') : 'Person nearby.';
        }
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

    // scene / object — prioritise hazards → people → everything else
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

// ── ML Kit Text Recognition (read mode only) ──────────────────────────────────
let TextRecognizer = null;
try { TextRecognizer = require('@react-native-ml-kit/text-recognition').default; } catch (_) {}

async function withTempFile(base64, fn) {
    const path = `${FileSystem.cacheDirectory}abserny_tmp_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    try    { return await fn(path); }
    finally { FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {}); }
}

async function detectWithText(base64, lang) {
    if (!TextRecognizer) throw new Error('ML Kit text recognition not available');
    return withTempFile(base64, async (path) => {
        const result = await TextRecognizer.recognize(path);
        const text   = result?.text?.trim();
        if (!text) return lang === 'ar' ? normalizeArabicForTTS('لا يوجد نص.') : 'No text found.';
        return lang === 'ar' ? normalizeArabicForTTS(text) : text;
    });
}

// ── Gemini ────────────────────────────────────────────────────────────────────
async function detectWithGemini(base64, mode, lang) {
    const prompt = mode === '__watch__'
        ? (WATCH_PROMPTS[lang] ?? WATCH_PROMPTS.en)
        : ((GEMINI_PROMPTS[lang] ?? GEMINI_PROMPTS.en)[mode] ?? (GEMINI_PROMPTS.en)[mode]);

    const body = JSON.stringify({
        contents: [{ parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
            { text: prompt },
        ]}],
        generationConfig: { maxOutputTokens: MAX_TOKENS[mode] ?? 80, temperature: TEMPERATURE[mode] ?? 0.2 },
    });

    const tryKey = async (key) => {
        const ctrl   = new AbortController();
        const tid    = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        const t0     = Date.now();
        const sizeKB = Math.round(base64.length * 0.75 / 1024);
        try {
            console.log(`[Abserny] Gemini → key ...${key.slice(-6)} payload~${sizeKB}KB`);
            const res = await fetch(GEMINI_BASE + key, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                signal: ctrl.signal, body,
            });
            const elapsed = Date.now() - t0;
            console.log(`[Abserny] Gemini ← HTTP ${res.status} in ${elapsed}ms`);
            return { status: res.status, data: await res.json() };
        } catch (err) {
            const elapsed = Date.now() - t0;
            if (err.name === 'AbortError') throw new Error(`Gemini timed out after ${elapsed}ms`);
            throw new Error(`Gemini network error after ${elapsed}ms: ${err.message}`);
        } finally { clearTimeout(tid); }
    };

    const extract = (data) => {
        if (data.error) throw new Error(data.error.message);
        const c = data.candidates?.[0];
        if (!c) throw new Error('no candidates');
        if (c.finishReason === 'SAFETY') throw new Error('safety block');
        const t = c?.content?.parts?.[0]?.text?.trim();
        if (!t) throw new Error('empty response');
        return t;
    };

    let lastError = 'all keys exhausted';
    for (let attempt = 0; attempt < RAW_KEYS.length; attempt++) {
        const key = getActiveKey();
        if (!key) break;

        let status, data;
        try {
            ({ status, data } = await tryKey(key));
        } catch (networkErr) {
            throw networkErr;
        }

        if (status === 200) return extract(data);

        if (status === 429) {
            const msg = (data?.error?.message ?? '').toLowerCase();
            if (msg.includes('daily') || msg.includes('quota exceeded')) markExhausted(key);
            rotateKey();
            lastError = `rate limited on key ...${key.slice(-6)}`;
            continue;
        }

        throw new Error(`Gemini HTTP ${status}: ${data?.error?.message ?? 'unknown'}`);
    }

    throw new Error(lastError);
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useDetection({ onQuotaExhausted } = {}) {
    const quotaAnnouncedRef   = useRef(false);
    const onQuotaExhaustedRef = useRef(onQuotaExhausted);
    onQuotaExhaustedRef.current = onQuotaExhausted;

    const modelPreloaded = useRef(false);
    if (!modelPreloaded.current) {
        modelPreloaded.current = true;
        ensureModel().catch(() => {});
    }

    const detect = useCallback(async (base64, mode, isConnected, lang = 'en') => {
        const hasKeys = getActiveKey() !== null;
        console.log(`[Abserny] detect() — mode:${mode} connected:${isConnected} hasKeys:${hasKeys} lang:${lang}`);

        if (!hasKeys && !quotaAnnouncedRef.current && RAW_KEYS.length > 0) {
            quotaAnnouncedRef.current = true;
            onQuotaExhaustedRef.current?.();
        }

        // Tier 1: Gemini (online)
        if (isConnected && hasKeys) {
            quotaAnnouncedRef.current = false;
            try {
                const result = await detectWithGemini(base64, mode, lang);
                return { result: lang === 'ar' ? normalizeArabicForTTS(result) : result, source: 'gemini' };
            } catch (err) {
                console.warn(`[Abserny] Gemini FAILED: ${err.message}`);
            }
        }

        // Tier 2a: ML Kit (read mode offline)
        if (mode === 'read') {
            try {
                return { result: await detectWithText(base64, lang), source: 'mlkit_text' };
            } catch (err) {
                console.warn(`[Abserny] Text recognition failed: ${err.message}`);
                return { result: lang === 'ar' ? normalizeArabicForTTS('لا يوجد نص.') : 'No text found.', source: 'error' };
            }
        }

        // Tier 2b: TFLite (all other modes offline)
        try {
            const result = await detectWithTFLite(base64, mode, lang);
            return { result, source: 'tflite' };
        } catch (err) {
            console.warn(`[Abserny] TFLite FAILED: ${err.message}`);
            return {
                result: mode === '__watch__'
                    ? (lang === 'ar' ? 'واضح' : 'CLEAR')
                    : (lang === 'ar'
                        ? normalizeArabicForTTS('لم يُتعرَّف على شيء.')
                        : 'Detection unavailable.'),
                source: 'error',
            };
        }
    }, []);

    return { detect };
}
