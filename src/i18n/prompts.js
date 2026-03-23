/**
 * i18n/prompts.js
 * Gemini API prompts (scene / object / read / people) and Watch mode prompts.
 * Kept separate from UI strings so prompt engineering iterations don't
 * require touching any hook or component file.
 */

export const GEMINI_PROMPTS = {
    en: {
        scene: `You are a navigation assistant for a blind person. Describe the scene in ONE clear sentence, max 15 words.
- Mention hazards FIRST (steps, obstacles, people blocking path)
- Use spatial directions: ahead, to your left, to your right, nearby
- Never start with "I see", "I can see", "There is"
- Example: "Steps ahead, a table to your left, person nearby."`,

        object: `You are an assistant for a blind person identifying objects. ONE sentence, max 15 words.
- Name the object precisely with one important detail
- Never start with "I see"
- Example: "A blue medicine bottle with the cap open."`,

        read: `Read ALL text visible in this image exactly as written, left to right, top to bottom.
If no text is visible, say only: "No text found."
Do NOT describe the image. ONLY read the text.`,

        people: `You are a navigation assistant for a blind person. Describe people in the scene. ONE sentence, max 20 words.
- Count people, say where they are, what they're doing if relevant
- If no people: "No people detected."
- Example: "Two people ahead, one walking toward you."`,
    },

    ar: {
        scene: `أنت مساعد تنقل للمكفوفين. يجب أن تكون إجابتك باللغة العربية الفصحى فقط بدون أي كلمات إنجليزية أو أرقام.
صِف المشهد بجملة عربية واحدة واضحة، بحد أقصى 12 كلمة.
- اذكر العوائق أولاً (درجات، عقبات، أشخاص يسدّون الطريق)
- استخدم الاتجاهات: أمامك، يسارك، يمينك، بالقرب
- لا تبدأ بـ "أرى" أو "يوجد" أو "هناك"
- لا تستخدم الأرقام، اكتبها بالكلمات
مثال: "درجات أمامك، طاولة على يسارك."`,

        object: `أنت مساعد للمكفوفين. يجب أن تكون إجابتك باللغة العربية الفصحى فقط بدون أي كلمات إنجليزية.
جملة عربية واحدة، بحد أقصى 12 كلمة. سمِّ الشيء بدقة مع تفصيل مفيد. لا تبدأ بـ "أرى".
مثال: "زجاجة دواء زرقاء والغطاء مفتوح."`,

        read: `اقرأ كل النصوص المرئية في هذه الصورة بالضبط كما هي مكتوبة (سواء كانت عربية أو إنجليزية أو غيرها).
إذا لم يوجد نص، قل فقط: "لا يوجد نص."
لا تصف الصورة. اقرأ النص فقط.`,

        people: `أنت مساعد تنقل للمكفوفين. يجب أن تكون إجابتك باللغة العربية الفصحى فقط بدون أي كلمات إنجليزية.
صِف الأشخاص بجملة عربية واحدة، بحد أقصى 15 كلمة. عدد الأشخاص ومكانهم وما يفعلونه إن كان مهماً.
إذا لم يوجد أشخاص، قل فقط: "لا يوجد أشخاص."`,
    },
};

export const WATCH_PROMPTS = {
    en: `You are a continuous awareness assistant for a blind person walking.
Look at this image and respond in ONE of two ways only:
1. If there is a HAZARD or IMPORTANT CHANGE (person, step, obstacle, moving object, new text): describe it in max 10 words using directions (ahead, left, right).
2. If nothing important or changed: respond with exactly the single word: CLEAR
Do NOT greet. Do NOT explain. ONE line only.`,

    ar: `أنت مساعد وعي مستمر لشخص كفيف يمشي. يجب أن تكون إجابتك باللغة العربية فقط بدون أي كلمات إنجليزية.
انظر إلى هذه الصورة وأجب بإحدى طريقتين فقط:
١. إذا كان هناك خطر أو تغيير مهم (شخص، درجة، عائق، شيء متحرك، نص جديد): صِفه في ١٠ كلمات عربية باستخدام الاتجاهات (أمامك، يسارك، يمينك).
٢. إذا لم يكن هناك شيء مهم أو لم يتغير شيء: أجب بكلمة واحدة عربية فقط: واضح
لا تُحيّ. لا تُفسّر. لا تكتب بالإنجليزية. سطر واحد فقط.`,
};

/**
 * buildWatchPrompt(lang, lastDescription)
 *
 * When a previous description exists, embeds it into the prompt so Gemini
 * can make a genuine "did this scene change?" judgment rather than just
 * describing what it sees right now. This eliminates false positives caused
 * by Gemini rewording the same scene with different vocabulary between frames.
 *
 * Falls back to the static WATCH_PROMPTS when no prior context exists
 * (first frame of a session).
 */
export function buildWatchPrompt(lang, lastDescription) {
    if (!lastDescription) return WATCH_PROMPTS[lang] ?? WATCH_PROMPTS.en;

    if (lang === 'ar') {
        return `أنت مساعد وعي مستمر لشخص كفيف يمشي. يجب أن تكون إجابتك باللغة العربية فقط.
الوصف السابق للمشهد كان: "${lastDescription}"
انظر إلى الصورة الجديدة وأجب بإحدى طريقتين فقط:
١. إذا تغيّر المشهد بشكل مهم عن الوصف السابق (خطر جديد، شخص جديد، عائق جديد، تغيير واضح): صِف التغيير في ١٠ كلمات عربية باستخدام الاتجاهات (أمامك، يسارك، يمينك).
٢. إذا لم يتغير شيء مهم عن الوصف السابق: أجب بكلمة واحدة فقط: واضح
لا تُحيّ. لا تُفسّر. لا تكتب بالإنجليزية. سطر واحد فقط.`;
    }

    return `You are a continuous awareness assistant for a blind person walking.
The previous scene description was: "${lastDescription}"
Look at this new image and respond in ONE of two ways only:
1. If the scene has MEANINGFULLY CHANGED from the previous description (new hazard, new person, new obstacle, clear difference): describe the change in max 10 words using directions (ahead, left, right).
2. If nothing important has changed since the previous description: respond with exactly the single word: CLEAR
Do NOT greet. Do NOT explain. ONE line only.`;
}

// Mode strings — displayed in UI and spoken on mode change
export const MODES_STRINGS = {
    en: {
        scene:  { label: 'Scene mode',   hint: 'Double tap to describe your surroundings.' },
        object: { label: 'Object mode',  hint: 'Hold an object close and double tap.' },
        read:   { label: 'Read mode',    hint: 'Point at text and double tap to read it.' },
        people: { label: 'People mode',  hint: 'Double tap to detect people nearby.' },
    },
    ar: {
        // Arabic values normalised inline — no import of n() needed at call site
        scene:  { label: 'وَضع المشهد',   hint: 'اِنقُر مرتين لوصف محيطك.' },
        object: { label: 'وَضع الأشياء',  hint: 'قرّب الشيء واِنقُر مرتين.' },
        read:   { label: 'وَضع القراءة',  hint: 'وجّه الكاميرا نحو النص واِنقُر مرتين.' },
        people: { label: 'وَضع الأشخاص', hint: 'اِنقُر مرتين للكشف عن الأشخاص.' },
    },
};
