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
