/**
 * services/tts/normalize.js
 *
 * ── What is this file? ────────────────────────────────────────────────────────
 *
 * Arabic has a feature called "tashkeel" — small vowel marks written above or
 * below letters (like: كَتَبَ instead of كتب). In formal writing and Quran,
 * tashkeel is always present. In everyday digital text, it's almost always
 * omitted — people just know the correct pronunciation from context.
 *
 * TTS (Text-to-Speech) engines like Google TTS or Samsung TTS don't always
 * have that context. When they see an unvowelled word, they guess. Sometimes
 * they guess wrong — a word like "يصف" (ya-SIF, "describes") might be read as
 * "YU-sif" (a name) or stressed incorrectly. The result is an Arabic narrator
 * that sounds mechanical, mispronounces common words, or clips short utterances.
 *
 * This function is a pre-processing layer that runs on every Arabic string
 * BEFORE it is sent to expo-speech. It does five things:
 *
 *   1. Replaces known problem words with vowelled versions
 *      Example: يصف → يَصِف  (adds the correct vowels so TTS reads it right)
 *
 *   2. Replaces words that TTS engines consistently mispronounce with simpler
 *      synonyms that are more phonetically predictable
 *      Example: وصّل الشاحن → اشحن الهاتف  (same meaning, TTS reads correctly)
 *
 *   3. Converts digits (3, ٣) to their full Arabic word form
 *      because TTS engines often read "3" as "three" (English) mid-sentence
 *
 *   4. Fixes specific known bugs in ar-SA engines (Samsung, Google)
 *      Example: "تم" alone gets clipped — padded to "تمَّ الأمر"
 *
 *   5. Strips tatweel characters (ـ) which cause inconsistent speech rhythm
 *
 * Think of it like a pronunciation dictionary: you teach the engine the correct
 * reading of each tricky word once, here, and then every string in the app
 * benefits automatically — you never have to think about it again at the call site.
 *
 * ── How to add a new rule ─────────────────────────────────────────────────────
 * If you find a word the narrator mispronounces, add it to section 7 below:
 *   t = t.replace(/wrongword/g, 'correctword');
 * Use https://arabic.win/tashkeel to find the correct vowelled form.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function normalizeArabicForTTS(text) {
    if (!text) return text;

    let t = text;

    // ── 1. Known defective noun bug ───────────────────────────────────────────
    // "جارٍ" triggers "jarin" mispronunciation on Samsung TTS
    t = t.replace(/جارٍ/g,    'يجري');
    t = t.replace(/جاري\b/g,  'يجري');

    // ── 2. Ultra-short "تم" gets clipped by the engine ────────────────────────
    // Standalone "تم" is so short the TTS onset cuts it off entirely.
    // Padding it prevents the clipping, and "تمَّ" (with shadda) fixes stress.
    t = t.replace(/^تم\.?$/,       'تمَّ الأمر.');
    t = t.replace(/\bتم\b(?=\.)/g, 'تمَّ');
    t = t.replace(/\bتم\b/g,       'تمَّ');   // catch تم mid-sentence too

    // ── 3. ASCII digits before Arabic time/count words ────────────────────────
    // TTS reads "4 ثوانٍ" as "four ثوانٍ" (English number, Arabic word).
    // Spelling out the number keeps it fully Arabic.
    const digitWords = {
        '0':'صفر', '1':'واحد',   '2':'اثنان', '3':'ثلاثة',
        '4':'أربعة','5':'خمسة', '6':'ستة',   '7':'سبعة',
        '8':'ثمانية','9':'تسعة',
    };
    t = t.replace(/(\d)(?=\s*ثوانٍ)/g, (m) => digitWords[m] ?? m);
    t = t.replace(/(\d)(?=\s*ثانية)/g, (m) => digitWords[m] ?? m);
    t = t.replace(/(\d)(?=\s*دقيقة)/g, (m) => digitWords[m] ?? m);
    t = t.replace(/(\d)(?=\s*مرات)/g,  (m) => digitWords[m] ?? m);
    // Battery percentage — "15٪" → "خمسة عشر بالمئة"
    // Handled as full number replacement below after Arabic-Indic conversion

    // ── 4. Arabic-Indic digits → spelled words ────────────────────────────────
    // "٪" after digits is replaced with "بالمئة" for natural TTS reading
    t = t.replace(/(\d+)٪/g, (_, num) => {
        const words = {
            '5':'خمسة','6':'ستة','7':'سبعة','8':'ثمانية','9':'تسعة',
            '10':'عشرة','11':'أحد عشر','12':'اثنا عشر','13':'ثلاثة عشر',
            '14':'أربعة عشر','15':'خمسة عشر','16':'ستة عشر','17':'سبعة عشر',
            '18':'ثمانية عشر','19':'تسعة عشر','20':'عشرون',
        };
        return (words[num] ?? num) + ' بالمئة';
    });
    const arDigitWords = {
        '٠':'صفر', '١':'واحد',   '٢':'اثنان', '٣':'ثلاثة',
        '٤':'أربعة','٥':'خمسة', '٦':'ستة',   '٧':'سبعة',
        '٨':'ثمانية','٩':'تسعة',
    };
    t = t.replace(/[٠-٩]/g, (m) => arDigitWords[m] ?? m);

    // ── 5. Strip tatweel ──────────────────────────────────────────────────────
    // Tatweel (ـ) is a decorative stretch character. TTS engines handle it
    // inconsistently — some add a long pause, some ignore it, some crash.
    t = t.replace(/ـ/g, '');

    // ── 6. App name + imperative verbs ───────────────────────────────────────
    // These were in the original codebase and remain correct.
    t = t.replace(/أبصرني/g,   'أَبصِرني');  // stress on second syllable
    t = t.replace(/\bانقر\b/g,  'اِنقُر');    // imperative "tap"
    t = t.replace(/\bانقري\b/g, 'اِنقُري');   // feminine form
    t = t.replace(/وضع ال/g,    'وَضع ال');   // "mode" — prevents flat reading
    t = t.replace(/\bمرر\b/g,   'مَرِّر');    // imperative "swipe"
    t = t.replace(/\bمرّر\b/g,  'مَرِّر');    // with shadda already (normalize)
    t = t.replace(/أريكة/g,     'أَريكة');
    t = t.replace(/راوتر/g,     'روتر');

    // ── 7. New vowel rules — added to fix mispronounced app strings ───────────
    //
    // يصف / وتصف — "describes". Without fatha, Samsung reads as "yusif" (a name).
    t = t.replace(/\bيصف\b/g,   'يَصِف');
    t = t.replace(/\bوتصف\b/g,  'وتَصِف');

    // يحدد — "locates/identifies". Without vowels reads as "yuhaddid" (threatens).
    // Correct reading is "yuHaddid" with emphasis on second syllable.
    t = t.replace(/\bيحدد\b/g,  'يُحدِّد');

    // ويحذرك — "and warns you". Needs damma+kasra for correct stress.
    t = t.replace(/\bويحذرك\b/g, 'ويُحذِّرك');

    // المدمج — "built-in/embedded". Without vowels sounds like "al-mudmaj" (wrong).
    t = t.replace(/المدمج/g,    'المُدمَج');

    // تحذير — "warning". TTS sometimes stresses wrong syllable.
    t = t.replace(/\bتحذير\b/g,  'تَحذير');

    // ملاحظة — "note". Reads correctly but add stress mark to help Samsung.
    t = t.replace(/\bملاحظة\b/g, 'مُلاحَظة');

    // لنتعلّم — "let us learn". Add correct vowelling.
    t = t.replace(/لنتعلم/g,    'لِنتعلَّم');

    // بميزة — "with a feature". Without kasra sounds like "bumaiza".
    t = t.replace(/\bبميزة\b/g,  'بِميزة');

    // تتحكم — "controls". Add shadda hint for Samsung.
    t = t.replace(/\bتتحكم\b/g,  'تَتحكَّم');

    // يُعيد — already vowelled in strings, keep as catch for unvowelled variant
    t = t.replace(/\bيعيد\b/g,   'يُعيد');

    // مفعّل — "activated". Already correct in most strings but normalize variant.
    t = t.replace(/\bمفعل\b/g,   'مُفعَّل');

    return t;
}
