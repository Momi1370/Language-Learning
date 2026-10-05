export const SESSIONS_PER_WEEK = 5;
export const TOTAL_WEEKS = 12;
export const BLOCKS = ['cards', 'sound', 'listen', 'speak', 'grammar', 'english'];

export function part(list, index, parts) {
  const n = list.length;
  return list.slice(Math.round((index * n) / parts), Math.round(((index + 1) * n) / parts));
}

export function diaryId(lang, week) {
  return `${lang}-${String(week).padStart(2, '0')}`;
}

function soundFor(sound, session) {
  return { ...sound, intro: session === 1, sayPairs: part(sound.pairs, session - 1, SESSIONS_PER_WEEK) };
}

export function buildSession({ week, session }, nl, en) {
  const i = session - 1;
  const last = session === SESSIONS_PER_WEEK;
  const dialogue = session <= 2 ? nl.dialogues[0] : nl.dialogues[1];
  const half = Math.ceil(dialogue.lines.length / 2);
  const g = nl.grammar;
  return {
    week,
    session,
    last,
    nl: {
      theme: nl.theme,
      themeEn: nl.themeEn,
      newCards: part(nl.chunks, i, SESSIONS_PER_WEEK).map((c) => c.id),
      sound: soundFor(nl.sound, session),
      shadow: last ? null : {
        id: dialogue.id,
        title: dialogue.title,
        lines: session % 2 === 1 ? dialogue.lines.slice(0, half) : dialogue.lines,
      },
      limburg: last ? nl.limburg : null,
      speak: last ? null : nl.speaking[i],
      diary: last ? { ...nl.speaking[4], diaryId: diaryId('nl', week) } : null,
      grammar: {
        id: g.id,
        title: g.title,
        explain: g.explain,
        fa: g.fa ?? '',
        intro: session === 1,
        review: last,
        items: last ? g.items.filter((_, k) => k % 3 === 0) : part(g.items, i, 4),
      },
      mission: { text: nl.mission, show: session === 1, check: last },
      roleplay: last ? nl.roleplay : null,
    },
    en: {
      theme: en.theme,
      newCards: part(en.chunks, i, SESSIONS_PER_WEEK).map((c) => c.id),
      sound: soundFor(en.sound, session),
      speak: last ? null : en.speaking[i],
      diary: last ? { ...en.speaking[4], diaryId: diaryId('en', week) } : null,
      mission: { text: en.mission, show: session === 1, check: last },
      roleplay: last ? en.roleplay : null,
    },
  };
}

export function nextPosition({ week, session }) {
  if (session < SESSIONS_PER_WEEK) return { week, session: session + 1 };
  if (week < TOTAL_WEEKS) return { week: week + 1, session: 1 };
  return null;
}

export function blockLabel(block, s) {
  switch (block) {
    case 'cards': return { title: 'Cards', flag: '🇧🇪', minutes: 5 };
    case 'sound': return { title: `Sound: ${s.nl.sound.title}`, flag: '🇧🇪', minutes: 3 };
    case 'listen': return s.nl.shadow
      ? { title: `Listen & shadow: ${s.nl.shadow.title}`, flag: '🇧🇪', minutes: 6 }
      : { title: 'Limburg ear', flag: '🇧🇪', minutes: 6 };
    case 'speak': return { title: s.nl.diary ? 'Speaking diary' : 'Speak', flag: '🇧🇪', minutes: 7 };
    case 'grammar': return { title: `Grammar: ${s.nl.grammar.title}`, flag: '🇧🇪', minutes: 4 };
    case 'english': return { title: `English: ${s.en.theme}`, flag: '🇬🇧', minutes: 12 };
    default: throw new Error(`unknown block ${block}`);
  }
}

export function localDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function streak(history, now = new Date()) {
  const days = new Set(history.map((x) => x.date));
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let count = 0;
  for (let step = 0; step < 400; step++) {
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    if (days.has(localDate(d))) count++;
    else if (!weekend && step > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
