/**
 * useDetection.js — Gemini online + ML Kit offline, bilingual
 * Supports 4 standard modes + __watch__ for continuous watch mode.
 *
 * HOW TO SET YOUR API KEYS:
 *   In app.json under "expo" → "extra":
 *     "geminiKeys": ["KEY_1", "KEY_2", "KEY_3"]
 *   Each key should be from a DIFFERENT Google account — keys from the
 *   same account share the same quota and rotation won't help.
 *   Get free keys at: https://aistudio.google.com
 *
 * HOW KEY ROTATION WORKS:
 *   - Keys are tried in order starting from the current active key.
 *   - On HTTP 429 (rate limited): rotate to next key immediately, retry once.
 *   - On RPM limit: the rotated key works right away.
 *   - On RPD limit: key is marked exhausted for the rest of the day
 *     (resets at midnight Pacific). Rotation skips exhausted keys.
 *   - On any other error (network, safety block, etc.): no rotation,
 *     fall through to ML Kit immediately.
 *   - If ALL keys are exhausted: fall through to ML Kit.
 *
 * OFFLINE ACCURACY IMPROVEMENTS (v2.1):
 *   - Noise label filtering: abstract/useless ML Kit categories (furniture,
 *     indoor, art, pattern, etc.) are stripped before building descriptions.
 *   - Confidence-weighted output: labels below 0.55 confidence dropped unless
 *     nothing better exists. Top label always leads the sentence.
 *   - Richer sentence templates: spatial prepositions, article usage, and
 *     natural phrasing instead of flat comma lists.
 *   - Massively expanded AR_LABEL_MAP: covers 350+ ML Kit categories so
 *     Arabic mode rarely falls back to "nothing identified".
 *   - Watch mode offline now detects hazard objects (steps, doors, cars),
 *     not just people.
 *
 * ARABIC PRONUNCIATION FIXES (v2.1):
 *   - All spoken Arabic strings use normalizeArabicForTTS() before being
 *     returned. This function fixes known Android ar-SA TTS mispronunciations:
 *     · "جارٍ" → "يجري" (engine reads "jarin" with wrong nunation)
 *     · Standalone "تم." → "تمّ." (engine clips ultra-short utterances)
 *     · Arabic numerals in strings replaced with spelled-out words
 *     · Tatweel (ـ) stripped — engines handle it unpredictably
 *     · Common loanwords respelled for consistent engine output
 */

import { useCallback, useRef } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { GEMINI_PROMPTS } from './useLanguage';
import { WATCH_PROMPTS }  from './useWatchMode';
import { normalizeArabicForTTS } from './ttsUtils';

// ── Key pool ──────────────────────────────────────────────────────────────────
const RAW_KEYS = (() => {
    const extra = Constants.expoConfig?.extra ?? {};
    if (Array.isArray(extra.geminiKeys) && extra.geminiKeys.length > 0) {
        return extra.geminiKeys.filter(k => k && k.length > 20 && !k.startsWith('PASTE') && !k.startsWith('YOUR'));
    }
    if (extra.geminiKey && extra.geminiKey.length > 20 && !extra.geminiKey.startsWith('PASTE') && !extra.geminiKey.startsWith('YOUR')) {
        return [extra.geminiKey];
    }
    return [];
})();

// ── Key rotation state ────────────────────────────────────────────────────────
function getPacificDateString() {
    const now = new Date();
    const pacificOffset = -8 * 60;
    const pacific = new Date(now.getTime() + pacificOffset * 60 * 1000);
    return pacific.toISOString().slice(0, 10);
}

const keyState = {
    currentIndex: 0,
    exhaustedOn: new Map(),
};

function isExhausted(key) {
    return keyState.exhaustedOn.get(key) === getPacificDateString();
}

function markExhausted(key) {
    keyState.exhaustedOn.set(key, getPacificDateString());
    console.warn(`[Abserny] Key ending ...${key.slice(-6)} RPD exhausted for today.`);
}

function getActiveKey() {
    if (RAW_KEYS.length === 0) return null;
    const start = keyState.currentIndex % RAW_KEYS.length;
    for (let i = 0; i < RAW_KEYS.length; i++) {
        const idx = (start + i) % RAW_KEYS.length;
        const key = RAW_KEYS[idx];
        if (!isExhausted(key)) {
            keyState.currentIndex = idx;
            return key;
        }
    }
    return null;
}

function rotateKey() {
    if (RAW_KEYS.length <= 1) return;
    keyState.currentIndex = (keyState.currentIndex + 1) % RAW_KEYS.length;
    console.log(`[Abserny] Rotated to key index ${keyState.currentIndex}`);
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=';
const TIMEOUT_MS  = 12000;

const MAX_TOKENS = {
    scene: 80, object: 60, read: 400, people: 80,
    __watch__: 40,
};
const TEMPERATURE = {
    scene: 0.2, object: 0.15, read: 0.0, people: 0.2,
    __watch__: 0.1,
};

// ── ML Kit ────────────────────────────────────────────────────────────────────
let ImageLabeler   = null;
let TextRecognizer = null;
try { ImageLabeler   = require('@react-native-ml-kit/image-labeling').default;  } catch (_) {}
try { TextRecognizer = require('@react-native-ml-kit/text-recognition').default; } catch (_) {}

// ── Noise labels ──────────────────────────────────────────────────────────────
// ML Kit frequently returns these as top hits. They are abstract category
// labels that carry zero useful information for a blind user — filtering them
// out dramatically improves output quality.
const NOISE_LABELS = new Set([
    'furniture', 'indoor', 'outdoor', 'pattern', 'art', 'design',
    'decorative', 'decor', 'interior design', 'room', 'architecture',
    'still life', 'product', 'material', 'texture', 'object',
    'technology', 'electronic device', 'gadget', 'flooring', 'floor',
    'ceiling', 'wall', 'surface', 'wood', 'metal', 'plastic', 'fabric',
    'clothing', 'fashion', 'sportswear', 'recreation', 'sport',
    'nature', 'landscape', 'sky', 'light', 'darkness', 'shadow',
    'black and white', 'color', 'shape', 'line', 'circle',
    'font', 'text', 'number', 'symbol',
    'monochrome photography', 'photography', 'stock photography',
    'snapshot', 'image', 'photo',
]);

// ── Hazard labels for offline watch mode ─────────────────────────────────────
// When offline, watch mode can only detect what ML Kit labels. This set covers
// labels that represent genuine navigation hazards worth announcing.
const HAZARD_LABELS = new Set([
    'stairs', 'staircase', 'step', 'steps', 'ladder', 'escalator',
    'car', 'vehicle', 'motorcycle', 'bicycle', 'bus', 'truck',
    'door', 'gate', 'barrier', 'fence',
    'curb', 'edge', 'cliff',
    'fire', 'flame', 'smoke',
    'water', 'pool', 'puddle',
    'dog', 'animal',
]);


// ── Arabic translation map ────────────────────────────────────────────────────
// Covers 350+ ML Kit image labeling categories.
// Rules:
//   - Unknown labels return null → caller drops them (never inserts English)
//   - Translations are optimised for natural TTS output, not just dictionary
//     accuracy. Some use simpler synonyms that TTS engines pronounce better.
const AR_LABEL_MAP = {
    // ── People ────────────────────────────────────────────────────────────────
    'person': 'شخص', 'human': 'شخص', 'face': 'وجه', 'man': 'رجل',
    'woman': 'امرأة', 'boy': 'ولد', 'girl': 'فتاة', 'child': 'طفل',
    'baby': 'رضيع', 'people': 'أشخاص', 'crowd': 'حشد', 'group': 'مجموعة',
    'adult': 'شخص بالغ', 'senior': 'شخص مسن', 'teenager': 'مراهق',
    'pedestrian': 'مشاة', 'passenger': 'راكب', 'customer': 'زبون',
    'student': 'طالب', 'athlete': 'رياضي', 'worker': 'عامل',
    // ── Body ─────────────────────────────────────────────────────────────────
    'hand': 'يد', 'finger': 'إصبع', 'arm': 'ذراع', 'leg': 'ساق',
    'eye': 'عين', 'head': 'رأس', 'hair': 'شعر', 'nose': 'أنف',
    'mouth': 'فم', 'ear': 'أذن', 'foot': 'قدم', 'shoulder': 'كتف',
    // ── Furniture ─────────────────────────────────────────────────────────────
    'chair': 'كرسي', 'armchair': 'كرسي مع مسندين', 'table': 'طاولة',
    'desk': 'مكتب', 'sofa': 'أريكة', 'couch': 'أريكة', 'bed': 'سرير',
    'pillow': 'وسادة', 'blanket': 'بطانية', 'mattress': 'مرتبة',
    'door': 'باب', 'window': 'نافذة', 'wall': 'حائط',
    'shelf': 'رف', 'bookcase': 'مكتبة', 'bookshelf': 'مكتبة',
    'wardrobe': 'خزانة ملابس', 'cabinet': 'خزانة', 'drawer': 'درج',
    'lamp': 'مصباح', 'chandelier': 'ثريا', 'light fixture': 'إنارة',
    'mirror': 'مرآة', 'curtain': 'ستارة', 'blinds': 'ستائر',
    'carpet': 'سجادة', 'rug': 'سجادة',
    'stairs': 'درج', 'step': 'درجة', 'staircase': 'سلم', 'stair': 'درجة',
    'ladder': 'سلم', 'elevator': 'مصعد', 'escalator': 'سلم كهربائي',
    'corridor': 'ممر', 'hallway': 'ممر', 'entrance': 'مدخل', 'exit': 'مخرج',
    'bedroom': 'غرفة نوم', 'bathroom': 'حمام', 'kitchen': 'مطبخ',
    'dining room': 'غرفة طعام', 'living room': 'غرفة جلوس',
    'toilet': 'مرحاض', 'sink': 'حوض', 'bathtub': 'حوض استحمام',
    'shower': 'دش', 'faucet': 'صنبور', 'tap': 'صنبور',
    'stove': 'موقد', 'oven': 'فرن', 'microwave': 'ميكرويف',
    'refrigerator': 'ثلاجة', 'fridge': 'ثلاجة', 'freezer': 'مجمّد',
    'dishwasher': 'غسالة صحون', 'washing machine': 'غسالة',
    'fan': 'مروحة', 'air conditioner': 'مكيف', 'heater': 'مدفأة',
    'fireplace': 'مدفأة', 'radiator': 'مشعاع',
    // ── Electronics ───────────────────────────────────────────────────────────
    'phone': 'هاتف', 'mobile phone': 'هاتف محمول', 'smartphone': 'هاتف ذكي',
    'telephone': 'هاتف', 'landline phone': 'هاتف أرضي',
    'laptop': 'حاسوب محمول', 'computer': 'حاسوب', 'desktop computer': 'حاسوب مكتبي',
    'monitor': 'شاشة', 'screen': 'شاشة', 'display': 'شاشة',
    'keyboard': 'لوحة مفاتيح', 'mouse': 'فأرة', 'trackpad': 'لوحة تتبع',
    'tablet': 'لوح إلكتروني', 'ipad': 'جهاز لوحي', 'e-reader': 'قارئ إلكتروني',
    'television': 'تلفاز', 'tv': 'تلفاز', 'smart tv': 'تلفاز ذكي',
    'camera': 'كاميرا', 'digital camera': 'كاميرا رقمية', 'webcam': 'كاميرا ويب',
    'headphones': 'سماعات', 'earphones': 'سماعات أذن', 'earbuds': 'سماعات صغيرة',
    'speaker': 'مكبر صوت', 'microphone': 'ميكروفون',
    'remote control': 'جهاز تحكم', 'charger': 'شاحن', 'cable': 'كابل',
    'power strip': 'وصلة كهربائية', 'outlet': 'مقبس كهربائي',
    'printer': 'طابعة', 'scanner': 'ماسح ضوئي',
    'router': 'جهاز راوتر', 'modem': 'مودم',
    'projector': 'جهاز عرض', 'remote': 'ريموت',
    'battery': 'بطارية', 'power bank': 'شاحن محمول',
    'smartwatch': 'ساعة ذكية', 'fitness tracker': 'جهاز لياقة',
    // ── Musical instruments ────────────────────────────────────────────────────
    'guitar': 'غيتار', 'piano': 'بيانو', 'violin': 'كمان',
    'drum': 'طبل', 'drums': 'طبول', 'flute': 'ناي',
    'trumpet': 'بوق', 'saxophone': 'ساكسوفون',
    'musical instrument': 'آلة موسيقية',
    // ── Clothing ──────────────────────────────────────────────────────────────
    'shirt': 'قميص', 't-shirt': 'تيشيرت', 'blouse': 'بلوزة',
    'dress': 'فستان', 'skirt': 'تنورة',
    'pants': 'بنطلون', 'trousers': 'بنطلون', 'jeans': 'جينز', 'shorts': 'شورت',
    'jacket': 'جاكيت', 'coat': 'معطف', 'hoodie': 'هودي', 'sweater': 'سترة',
    'suit': 'بدلة', 'tie': 'ربطة عنق',
    'shoes': 'حذاء', 'shoe': 'حذاء', 'sneakers': 'حذاء رياضي',
    'boots': 'حذاء طويل', 'sandals': 'صندل', 'slippers': 'شبشب',
    'hat': 'قبعة', 'cap': 'كاب', 'glasses': 'نظارة',
    'sunglasses': 'نظارة شمسية',
    'bag': 'حقيبة', 'backpack': 'حقيبة ظهر', 'handbag': 'حقيبة يد',
    'suitcase': 'حقيبة سفر', 'luggage': 'أمتعة',
    'wallet': 'محفظة', 'watch': 'ساعة يد', 'belt': 'حزام',
    'scarf': 'وشاح', 'gloves': 'قفازات', 'socks': 'جوارب',
    'umbrella': 'مظلة',
    // ── Food & drink ──────────────────────────────────────────────────────────
    'food': 'طعام', 'meal': 'وجبة', 'dish': 'طبق طعام',
    'drink': 'مشروب', 'beverage': 'مشروب',
    'water': 'ماء', 'coffee': 'قهوة', 'tea': 'شاي',
    'juice': 'عصير', 'milk': 'حليب', 'soda': 'مشروب غازي',
    'bottle': 'زجاجة', 'cup': 'كوب', 'glass': 'كأس', 'mug': 'كوب',
    'can': 'علبة', 'jar': 'جرة',
    'plate': 'طبق', 'bowl': 'وعاء', 'tray': 'صينية',
    'spoon': 'ملعقة', 'fork': 'شوكة', 'knife': 'سكين', 'chopsticks': 'عيدان',
    'fruit': 'فاكهة', 'vegetable': 'خضروات',
    'apple': 'تفاحة', 'banana': 'موزة', 'orange': 'برتقالة',
    'bread': 'خبز', 'cake': 'كعكة', 'cookie': 'بسكويت',
    'pizza': 'بيتزا', 'sandwich': 'ساندويش', 'burger': 'برغر',
    'rice': 'أرز', 'pasta': 'مكرونة', 'soup': 'شوربة',
    'meat': 'لحم', 'chicken': 'دجاج', 'fish': 'سمك',
    'egg': 'بيضة', 'cheese': 'جبن',
    // ── Vehicles ──────────────────────────────────────────────────────────────
    'car': 'سيارة', 'vehicle': 'مركبة', 'automobile': 'سيارة',
    'bus': 'حافلة', 'minibus': 'ميكروباص', 'van': 'فان',
    'truck': 'شاحنة', 'pickup truck': 'بيك أب',
    'motorcycle': 'دراجة نارية', 'scooter': 'سكوتر',
    'bicycle': 'دراجة', 'bike': 'دراجة', 'tricycle': 'دراجة ثلاثية',
    'taxi': 'تاكسي', 'ambulance': 'إسعاف', 'police car': 'سيارة شرطة',
    'fire truck': 'سيارة إطفاء',
    'train': 'قطار', 'subway': 'مترو', 'tram': 'ترام',
    'airplane': 'طائرة', 'helicopter': 'طائرة هليكوبتر',
    'boat': 'قارب', 'ship': 'سفينة',
    'wheel': 'عجلة', 'tire': 'إطار',
    'traffic light': 'إشارة مرور', 'traffic sign': 'لافتة طريق',
    // ── Outdoor / urban ───────────────────────────────────────────────────────
    'road': 'طريق', 'street': 'شارع', 'sidewalk': 'رصيف',
    'pavement': 'رصيف', 'crosswalk': 'ممر مشاة', 'pedestrian crossing': 'ممر مشاة',
    'intersection': 'تقاطع', 'highway': 'طريق سريع',
    'bridge': 'جسر', 'tunnel': 'نفق', 'overpass': 'جسر علوي',
    'parking lot': 'موقف سيارات', 'parking': 'موقف',
    'building': 'مبنى', 'house': 'منزل', 'apartment': 'شقة',
    'office building': 'مبنى مكاتب', 'store': 'متجر', 'shop': 'محل',
    'supermarket': 'سوبرماركت', 'mall': 'مول', 'restaurant': 'مطعم',
    'hospital': 'مستشفى', 'school': 'مدرسة', 'mosque': 'مسجد',
    'church': 'كنيسة', 'bank': 'بنك', 'hotel': 'فندق',
    'gas station': 'محطة وقود', 'pharmacy': 'صيدلية',
    'tree': 'شجرة', 'bush': 'شجيرة', 'plant': 'نبتة',
    'flower': 'زهرة', 'grass': 'عشب', 'garden': 'حديقة', 'park': 'حديقة عامة',
    'sky': 'سماء', 'cloud': 'سحابة', 'sun': 'شمس', 'moon': 'قمر',
    'rain': 'مطر', 'snow': 'ثلج',
    'ground': 'أرض', 'rock': 'صخرة', 'sand': 'رمل',
    'lake': 'بحيرة', 'river': 'نهر', 'sea': 'بحر', 'beach': 'شاطئ',
    'mountain': 'جبل', 'hill': 'تل', 'valley': 'وادٍ',
    'fence': 'سياج', 'gate': 'بوابة', 'wall': 'جدار',
    'curb': 'حافة رصيف', 'pole': 'عمود', 'sign': 'لافتة',
    'bench': 'مقعد', 'trash can': 'سلة مهملات', 'bin': 'سلة مهملات',
    'fire hydrant': 'صنبور إطفاء',
    // ── Animals ───────────────────────────────────────────────────────────────
    'dog': 'كلب', 'cat': 'قطة', 'bird': 'طائر', 'fish': 'سمكة',
    'cow': 'بقرة', 'horse': 'حصان', 'sheep': 'خروف', 'goat': 'ماعز',
    'chicken': 'دجاجة', 'duck': 'بطة',
    'butterfly': 'فراشة', 'insect': 'حشرة',
    'animal': 'حيوان',
    // ── Objects / stationery ──────────────────────────────────────────────────
    'book': 'كتاب', 'notebook': 'دفتر', 'magazine': 'مجلة', 'newspaper': 'جريدة',
    'paper': 'ورقة', 'document': 'وثيقة', 'envelope': 'ظرف',
    'pen': 'قلم', 'pencil': 'قلم رصاص', 'marker': 'ماركر', 'highlighter': 'قلم تظليل',
    'scissors': 'مقص', 'ruler': 'مسطرة', 'tape': 'شريط لاصق',
    'box': 'صندوق', 'container': 'حاوية', 'basket': 'سلة', 'bucket': 'دلو',
    'bag': 'كيس', 'plastic bag': 'كيس بلاستيك',
    'ball': 'كرة', 'toy': 'لعبة', 'doll': 'دمية',
    'painting': 'لوحة', 'picture': 'صورة', 'photo': 'صورة', 'frame': 'إطار',
    'clock': 'ساعة حائط', 'alarm clock': 'منبه', 'key': 'مفتاح', 'lock': 'قفل',
    'tool': 'أداة', 'hammer': 'مطرقة', 'screwdriver': 'مفك', 'wrench': 'ربط',
    'drill': 'حفّارة', 'saw': 'منشار',
    'candle': 'شمعة', 'vase': 'مزهرية', 'pot': 'إناء',
    'bottle opener': 'فتاحة', 'can opener': 'فتاحة علب',
    'knife block': 'حامل سكاكين',
    // ── Hazard / navigation critical ─────────────────────────────────────────
    'obstacle': 'عائق', 'barrier': 'حاجز', 'construction': 'بناء',
    'scaffolding': 'سقالة', 'hole': 'حفرة', 'pothole': 'حفرة في الطريق',
    'puddle': 'بركة ماء', 'ice': 'جليد', 'snow': 'ثلج',
    'fire': 'نار', 'flame': 'لهب', 'smoke': 'دخان',
    'broken glass': 'زجاج مكسور', 'debris': 'حطام',
};

// ── Translate label to Arabic ─────────────────────────────────────────────────
function translateLabel(label, lang) {
    if (lang !== 'ar') return label;
    const key = label.toLowerCase().trim();
    return AR_LABEL_MAP[key] ?? null;
}

// ── Filter and rank ML Kit labels ────────────────────────────────────────────
// Returns cleaned, ranked array of {raw, translated, confidence} objects.
// Removes noise labels and low-confidence hits.
function processLabels(labels, lang, minConfidence = 0.55) {
    if (!labels || labels.length === 0) return [];

    const sorted = [...labels].sort((a, b) => b.confidence - a.confidence);

    const results = [];
    for (const label of sorted) {
        const raw = (label.text || label.label || '').trim().toLowerCase();
        if (!raw) continue;
        if (NOISE_LABELS.has(raw)) continue;

        // Accept if confidence is good enough, OR if we have nothing yet
        // (always keep at least one result rather than returning nothing)
        if (label.confidence < minConfidence && results.length >= 1) continue;

        const translated = translateLabel(raw, lang);
        // In Arabic mode, drop untranslatable labels entirely
        if (lang === 'ar' && translated === null) continue;

        results.push({ raw, translated: translated ?? raw, confidence: label.confidence });
        if (results.length >= 4) break;
    }

    return results;
}

// ── Build natural English offline descriptions ────────────────────────────────
function buildEnglishDescription(labels, mode) {
    if (labels.length === 0) return null;

    const top    = labels[0].translated;
    const second = labels[1]?.translated;
    const third  = labels[2]?.translated;

    // Determine article for top label
    const vowels  = /^[aeiou]/i;
    const article = vowels.test(top) ? 'An' : 'A';

    switch (mode) {
        case 'scene':
            if (labels.length === 1) return `${top} ahead.`;
            if (labels.length === 2) return `${top} and ${second} ahead.`;
            return `${top} ahead, ${second} and ${third ? third + ' ' : ''}nearby.`;

        case 'object':
            if (labels.length === 1) return `${article} ${top}.`;
            return `${article} ${top}${second ? ', with ' + second + ' nearby' : ''}.`;

        case 'people': {
            const personTerms = /person|human|face|man|woman|boy|girl|child|people|crowd|pedestrian|passenger/i;
            const hasPerson   = labels.some(l => personTerms.test(l.raw));
            if (!hasPerson) return null; // caller will use no_people message
            const others = labels
            .filter(l => !personTerms.test(l.raw))
            .map(l => l.translated)
            .slice(0, 2);
            if (others.length === 0) return 'A person detected nearby.';
            return `A person nearby. Also: ${others.join(', ')}.`;
        }

        case '__watch__': {
            const hazardFound = labels.find(l => HAZARD_LABELS.has(l.raw));
            if (hazardFound) return `${hazardFound.translated} detected ahead.`;
            const personTerms = /person|human|face|man|woman|boy|girl|child|people|crowd/i;
            const person      = labels.find(l => personTerms.test(l.raw));
            if (person) return 'Person nearby.';
            return null; // CLEAR
        }

        default:
            return `${top} ahead.`;
    }
}

// ── Build natural Arabic offline descriptions ─────────────────────────────────
function buildArabicDescription(labels, mode) {
    if (labels.length === 0) return null;

    const top    = labels[0].translated;
    const second = labels[1]?.translated;
    const third  = labels[2]?.translated;

    switch (mode) {
        case 'scene':
            if (labels.length === 1) return normalizeArabicForTTS(`${top} أمامك.`);
            if (labels.length === 2) return normalizeArabicForTTS(`${top} و${second} أمامك.`);
            return normalizeArabicForTTS(`${top} أمامك، و${second}${third ? ' و' + third : ''} بالقرب.`);

        case 'object':
            if (labels.length === 1) return normalizeArabicForTTS(`${top} أمامك.`);
            return normalizeArabicForTTS(`${top}، و${second} بالقرب.`);

        case 'people': {
            const personTerms = /person|human|face|man|woman|boy|girl|child|people|crowd|pedestrian/i;
            const hasPerson   = labels.some(l => personTerms.test(l.raw));
            if (!hasPerson) return null;
            const others = labels
            .filter(l => !personTerms.test(l.raw))
            .map(l => l.translated)
            .slice(0, 2);
            if (others.length === 0) return normalizeArabicForTTS('شخص بالقرب.');
            return normalizeArabicForTTS(`شخص بالقرب. ${others.join('، ')} أيضاً.`);
        }

        case '__watch__': {
            const hazardFound = labels.find(l => HAZARD_LABELS.has(l.raw));
            if (hazardFound) {
                const arHazard = translateLabel(hazardFound.raw, 'ar') ?? hazardFound.translated;
                return normalizeArabicForTTS(`${arHazard} أمامك.`);
            }
            const personTerms = /person|human|face|man|woman|boy|girl|child|people|crowd/i;
            if (labels.some(l => personTerms.test(l.raw))) {
                return normalizeArabicForTTS('شخص بالقرب.');
            }
            return null; // واضح
        }

        default:
            return normalizeArabicForTTS(`${top} أمامك.`);
    }
}

// ── Offline messages ──────────────────────────────────────────────────────────
const OFFLINE_MSGS = {
    en: {
        no_labels:   'Nothing clearly identified. Try pointing the camera more directly.',
        no_people:   'No people detected.',
        no_text:     'No text found.',
        watch_clear: 'CLEAR',
        offline_prefix: 'Offline. ',
    },
    ar: {
        no_labels:   normalizeArabicForTTS('لم يُتعرَّف على شيء. حاول توجيه الكاميرا مباشرةً.'),
        no_people:   normalizeArabicForTTS('لا يوجد أشخاص.'),
        no_text:     normalizeArabicForTTS('لا يوجد نص.'),
        watch_clear: 'واضح',
        offline_prefix: normalizeArabicForTTS('وضع بلا إنترنت. '),
    },
};

// ── Temp file helper ──────────────────────────────────────────────────────────
async function withTempFile(base64, fn) {
    const path = `${FileSystem.cacheDirectory}abserny_tmp_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
    });
    try {
        return await fn(path);
    } finally {
        FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    }
}

// ── Gemini (with key rotation) ────────────────────────────────────────────────
async function detectWithGemini(base64, mode, lang) {
    let prompt;
    if (mode === '__watch__') {
        prompt = WATCH_PROMPTS[lang] ?? WATCH_PROMPTS.en;
    } else {
        const prompts = GEMINI_PROMPTS[lang] ?? GEMINI_PROMPTS.en;
        prompt = prompts[mode] ?? prompts.scene;
    }

    const body = JSON.stringify({
        contents: [{ parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
            { text: prompt },
        ]}],
        generationConfig: {
            maxOutputTokens: MAX_TOKENS[mode]  ?? 80,
            temperature:     TEMPERATURE[mode] ?? 0.2,
        },
    });

    const tryKey = async (key) => {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const response = await fetch(GEMINI_BASE + key, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body,
            });
            const data = await response.json();
            return { status: response.status, data };
        } finally {
            clearTimeout(timeoutId);
        }
    };

    const extractText = (data) => {
        if (data.error) throw new Error(data.error.message);
        const candidate = data.candidates?.[0];
        if (!candidate) throw new Error('no candidates');
        if (candidate.finishReason === 'SAFETY') throw new Error('safety block');
        const text = candidate?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error('empty response');
        return text;
    };

    const key1 = getActiveKey();
    if (!key1) throw new Error('all keys exhausted');

    const { status: s1, data: d1 } = await tryKey(key1);
    if (s1 === 200) return extractText(d1);

    if (s1 === 429) {
        const errMsg = (d1?.error?.message ?? '').toLowerCase();
        const isRPD  = errMsg.includes('daily') || errMsg.includes('quota exceeded');
        if (isRPD) markExhausted(key1);
        rotateKey();
        const key2 = getActiveKey();
        if (!key2) throw new Error('all keys exhausted');
        console.log(`[Abserny] 429 on key1 (${isRPD ? 'RPD' : 'RPM'}), retrying with key2...`);
        const { status: s2, data: d2 } = await tryKey(key2);
        if (s2 === 200) return extractText(d2);
        if (s2 === 429) {
            const errMsg2 = (d2?.error?.message ?? '').toLowerCase();
            if (errMsg2.includes('daily') || errMsg2.includes('quota exceeded')) markExhausted(key2);
        }
        throw new Error(`429 on both keys: ${d2?.error?.message ?? 'rate limited'}`);
    }

    throw new Error(`Gemini HTTP ${s1}: ${d1?.error?.message ?? 'unknown'}`);
}

// ── ML Kit label-based detection ──────────────────────────────────────────────
async function detectWithLabels(base64, mode, lang) {
    if (!ImageLabeler) throw new Error('ML Kit not installed');
    const msgs = OFFLINE_MSGS[lang] ?? OFFLINE_MSGS.en;

    return withTempFile(base64, async (path) => {
        const rawLabels = await ImageLabeler.label(path);

        if (!rawLabels || rawLabels.length === 0) {
            if (mode === '__watch__') return msgs.watch_clear;
            return mode === 'people' ? msgs.no_people : msgs.no_labels;
        }

        const labels = processLabels(rawLabels, lang);

        if (labels.length === 0) {
            if (mode === '__watch__') return msgs.watch_clear;
            return mode === 'people' ? msgs.no_people : msgs.no_labels;
        }

        const description = lang === 'ar'
            ? buildArabicDescription(labels, mode)
            : buildEnglishDescription(labels, mode);

        if (description === null) {
            // null means "nothing meaningful found for this mode"
            if (mode === '__watch__') return msgs.watch_clear;
            if (mode === 'people')    return msgs.no_people;
            return msgs.no_labels;
        }

        return description;
    });
}

// ── ML Kit text recognition ───────────────────────────────────────────────────
async function detectWithText(base64, lang) {
    if (!TextRecognizer) throw new Error('ML Kit text recognition not installed');
    const msgs = OFFLINE_MSGS[lang] ?? OFFLINE_MSGS.en;
    return withTempFile(base64, async (path) => {
        const result = await TextRecognizer.recognize(path);
        const text   = result?.text?.trim();
        if (!text) return msgs.no_text;
        // If Arabic mode, normalise any Arabic text that comes back through TTS
        return lang === 'ar' ? normalizeArabicForTTS(text) : text;
    });
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useDetection({ onQuotaExhausted } = {}) {
    // Fires onQuotaExhausted() once per session the first time all keys are
    // found exhausted so App.js can announce "Switching to basic mode."
    // Resets at midnight Pacific when exhaustion clears automatically.
    const quotaAnnouncedRef    = useRef(false);
    const onQuotaExhaustedRef  = useRef(onQuotaExhausted);
    onQuotaExhaustedRef.current = onQuotaExhausted;

    const detect = useCallback(async (base64, mode, isConnected, lang = 'en') => {
        const hasKeys = getActiveKey() !== null;

        // If keys just became exhausted, fire the callback once
        if (!hasKeys && !quotaAnnouncedRef.current && RAW_KEYS.length > 0) {
            quotaAnnouncedRef.current = true;
            onQuotaExhaustedRef.current?.();
        }

        // Online — Gemini (with key rotation)
        if (isConnected && hasKeys) {
            // Keys are active again (e.g. new day) — reset announcement flag
            quotaAnnouncedRef.current = false;
            try {
                const result = await detectWithGemini(base64, mode, lang);
                // Apply Arabic TTS normalisation to Gemini output too —
                // Gemini sometimes returns numbers or problematic forms
                const finalResult = lang === 'ar' ? normalizeArabicForTTS(result) : result;
                return { result: finalResult, source: 'online' };
            } catch (err) {
                console.warn('[Abserny] Gemini failed, falling back to ML Kit:', err.message);
            }
        }

        // Offline — ML Kit
        try {
            const result = mode === 'read'
                ? await detectWithText(base64, lang)
                : await detectWithLabels(base64, mode, lang);
            return { result, source: 'offline' };
        } catch (err) {
            console.warn('[Abserny] ML Kit error:', err.message);
            const result = mode === '__watch__'
                ? (lang === 'ar' ? 'واضح' : 'CLEAR')
                : (lang === 'ar'
                    ? normalizeArabicForTTS('فشل الكشف. تحقق من الاتصال.')
                    : 'Detection failed. Check your connection.');
            return { result, source: 'error' };
        }
    }, []);

    return { detect };
}
