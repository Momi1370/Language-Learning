const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const pad = (n) => String(n + 1).padStart(3, '0');

const sound = (lang) => ({
  id: `${lang}-test`, title: 'a or aa?', explain: 'Long and short.', anchor: 'Length is the key.',
  pairs: rep(6, (i) => [`man${i}`, `maan${i}`]),
});
const speaking = (lang) => rep(5, (i) => ({
  id: `${lang}-01-s${i + 1}`, prompt: 'Vertel iets.', frames: ['Ik ben …', 'Ik werk …'], model: 'Ik ben Amir.', seconds: 90,
}));
const roleplay = () => ({ title: 'Koffie', prompt: 'x'.repeat(120) });

export function validNl() {
  return {
    lang: 'nl', week: 1, theme: 'Thema', themeEn: 'Theme', mission: 'Doe iets.',
    sound: sound('nl'), roleplay: roleplay(), speaking: speaking('nl'),
    chunks: rep(25, (i) => ({ id: `nl-01-${pad(i)}`, text: `zin ${i}`, en: `sentence ${i}`, article: null })),
    dialogues: rep(2, (d) => ({
      id: `nl-01-d${d}`, title: `Dialoog ${d}`,
      lines: rep(8, (i) => ({ speaker: i % 2 ? 'B' : 'A', text: `regel ${d}-${i}`, en: `line ${d}-${i}` })),
    })),
    grammar: { id: 'v2', title: 'Verb second', explain: 'The verb is in place 2.', fa: 'فعل', items: rep(15, (i) => ({ prompt: `p${i}`, answer: `a${i}` })) },
    limburg: rep(6, (i) => ({ standard: `s${i}`, everyday: `e${i}`, note: 'n' })),
  };
}

export function validEn() {
  return {
    lang: 'en', week: 1, theme: 'Introducing yourself', themeEn: 'Introducing yourself', mission: 'Do it.',
    sound: sound('en'), roleplay: roleplay(), speaking: speaking('en'),
    chunks: rep(15, (i) => ({ id: `en-01-${pad(i)}`, text: `phrase ${i}`, en: `use ${i}` })),
  };
}

// A Dutch week that meets the A2+ level floor (LEVEL.nl in tools/schema.mjs).
export function levelNl() {
  const w = validNl();
  w.chunks = w.chunks.map((c, i) => ({
    ...c, text: i < 6 ? `Ik ben moe, maar ik werk nog even ${i}.` : `Ik werk vandaag thuis aan het project ${i}.`,
  }));
  for (const d of w.dialogues) d.lines = d.lines.map((l, i) => ({ ...l, text: `Ik heb vandaag een lange vergadering met het hele team ${i}.` }));
  w.speaking = w.speaking.map((p) => ({ ...p, seconds: 90, model: 'Ik werk hier sinds maandag. '.repeat(15).trim() }));
  w.grammar.items = w.grammar.items.map((it, i) => ({ ...it, answer: `Vandaag werk ik thuis aan het project ${i}.` }));
  return w;
}

// A vocabulary word that passes validateVocab (tools/vocab-schema.mjs).
export function validVocabWord(n = 1) {
  return {
    id: `v-${String(n).padStart(4, '0')}`,
    word: 'stuff',
    pos: 'noun',
    forms: ['stuff'],
    ipa: 'ˈstʌf',
    stress: ['STUFF'],
    fa: { meaning: 'چیزها؛ وسایل', note: 'اسم غیرقابل‌شمارش و غیررسمی.' },
    examples: [
      { text: 'I left all my stuff in the car.', fa: 'همه‌ی وسایلم را توی ماشین جا گذاشتم.' },
      { text: 'There is so much stuff to do before the trip.', fa: 'قبل از سفر کلی کار برای انجام دادن هست.' },
    ],
    register: 'informal',
  };
}

export function validVocabPack() {
  return { pack: 1, track: 'everyday', source: 'Test source', words: [validVocabWord(1)] };
}

// A format-2 word: word forms plus one example in each of the past, present and future with a Farsi grammar note.
export function validVocabWord2(n = 1) {
  return {
    ...validVocabWord(n),
    morph: [['Singular', 'stuff'], ['Plural', 'stuff (no plural)']],
    examples: [
      { tense: 'past', text: 'I left all my stuff in the car yesterday.', fa: 'دیروز همه‌ی وسایلم را توی ماشین جا گذاشتم.', grammar: 'گذشته‌ی ساده: برای کاری که تمام شده است.' },
      { tense: 'present', text: 'My stuff is still in the car.', fa: 'وسایلم هنوز توی ماشین است.', grammar: 'حال ساده‌ی be: am/is/are.' },
      { tense: 'future', text: 'I will move my stuff tomorrow.', fa: 'فردا وسایلم را جابه‌جا می‌کنم.', grammar: 'آینده با will: will + شکل ساده‌ی فعل.' },
    ],
  };
}

export function validVocabPack2() {
  return { pack: 2, track: 'everyday', format: 2, source: 'Test source', words: [validVocabWord2(1)] };
}
