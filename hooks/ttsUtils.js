/**
 * ttsUtils.js — Shared TTS utilities
 *
 * Lives in its own file so both useDetection.js and useLanguage.js can import
 * from here without creating a circular dependency.
 *
 * Nothing in this file imports from useDetection or useLanguage.
 */

// ── Arabic pronunciation normaliser ──────────────────────────────────────────
// Fixes known mispronunciations in Android ar-SA TTS engines
// (Google TTS, Samsung TTS). Applied to all Arabic strings before speech.
//
// Rules:
//   1. "جارٍ" → "يجري"   — nunation on defective noun triggers "jarin" bug
//   2. Standalone "تم"   → "تمَّ الأمر"  — ultra-short utterance gets clipped
//   3. Digit + time word → spelled-out Arabic word
//   4. Arabic-Indic digits → spelled-out Arabic words
//   5. Tatweel (ـ) stripped — causes inconsistent prosody
//   6. Loanword / vowel fixes for consistent engine output
export function normalizeArabicForTTS(text) {
    if (!text) return text;

    let t = text;

    // 1. جارٍ / جاري — defective noun nunation mispronunciation
    t = t.replace(/جارٍ/g, 'يجري');
    t = t.replace(/جاري\b/g, 'يجري');

    // 2. Standalone تم — pad so engine doesn't clip
    t = t.replace(/^تم\.?$/, 'تمَّ الأمر.');
    t = t.replace(/\bتم\b(?=\.)/g, 'تمَّ');

    // 3. ASCII digit before Arabic time/count words
    const digitWords = {
        '0': 'صفر',   '1': 'واحد',   '2': 'اثنان',  '3': 'ثلاثة',
        '4': 'أربعة', '5': 'خمسة',   '6': 'ستة',    '7': 'سبعة',
        '8': 'ثمانية','9': 'تسعة',
    };
    t = t.replace(/(\d)(?=\s*ثوانٍ)/g,  (m) => digitWords[m] ?? m);
    t = t.replace(/(\d)(?=\s*ثانية)/g,  (m) => digitWords[m] ?? m);
    t = t.replace(/(\d)(?=\s*دقيقة)/g,  (m) => digitWords[m] ?? m);
    t = t.replace(/(\d)(?=\s*مرات)/g,   (m) => digitWords[m] ?? m);

    // 4. Arabic-Indic digits → spelled words (unconditional)
    const arDigitWords = {
        '٠': 'صفر',   '١': 'واحد',   '٢': 'اثنان',  '٣': 'ثلاثة',
        '٤': 'أربعة', '٥': 'خمسة',   '٦': 'ستة',    '٧': 'سبعة',
        '٨': 'ثمانية','٩': 'تسعة',
    };
    t = t.replace(/[٠-٩]/g, (m) => arDigitWords[m] ?? m);

    // 5. Strip tatweel
    t = t.replace(/ـ/g, '');

    // 6. Vowel / stress fixes
    t = t.replace(/أبصرني/g,  'أَبصِرني');   // wrong stress on some engines
    t = t.replace(/\bانقر\b/g,  'اِنقُر');   // unvowelled imperative
    t = t.replace(/\bانقري\b/g, 'اِنقُري');
    t = t.replace(/وضع ال/g,    'وَضع ال');   // fatha prevents flat reading
    t = t.replace(/\bمرر\b/g,   'مَرِّر');   // shadda sometimes dropped
    t = t.replace(/أريكة/g,     'أَريكة');   // engine rushes without fatha
    t = t.replace(/راوتر/g,     'روتر');      // loanword respelling

    return t;
}
