# Taalmaatje Milestone 2 Implementation Plan (Week 1 Dutch at A2+, Weeks 2–4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the Dutch course to A2+ (the learner found week 1 too easy), rewrite week 1 Dutch at that level and publish it first, then write and publish weeks 2, 3 and 4 (Dutch + English).

**Architecture:** Content-only app changes plus two guard rails. `tools/schema.mjs` gets a Dutch level floor (`checkLevel`) and a repeat finder (`findRepeats`), used by `tools/validate.mjs` and the content tests, so every Dutch week is provably A2+ and no card is taught twice. The smoke test learns which weeks exist instead of assuming "week 2 is coming soon". Each week is its own JSON file pair, added to the service worker's offline list, then pushed to `main` (GitHub Pages).

**Tech Stack:** Plain ES modules, JSON content, Node 20+ (`node --test`), headless Chrome smoke test (`tools/smoke.mjs`), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-05-taalmaatje-course-design.md` (§4.3 themes, §4.4.4 sound order, §4.6 Limburg ear, §5.4 schema, §9 milestones). Milestone 1 plan for conventions: `docs/superpowers/plans/2026-10-05-taalmaatje-milestone-1.md`.

## Global Constraints

- Work in the worktree `.claude/worktrees/milestone-1` (branch `worktree-milestone-1`); deploy with `git push origin HEAD:main`.
- Checks before every commit: `npm test && npm run validate && npm run smoke` — all green.
- A new week = `content/nl/week-NN.json` + `content/en/week-NN.json` + both paths added to `SHELL` in `sw.js` (test `sw.test.mjs` enforces it).
- Minimum per Dutch week (spec §5.4): 25 chunks, 2 dialogues (8–12 lines each), 5 speaking prompts, 15 grammar items, 6 Limburg pairs, 1 role-play, 1 mission, 6 sound pairs. English: 15 chunks, 5 speaking prompts, 1 role-play, 1 mission, 6 sound pairs.
- Ids: chunks `nl-NN-001…`, `en-NN-001…`; dialogues `nl-NN-dA`, `nl-NN-dB`; speaking `nl-NN-s1…s5`, `en-NN-s1…s5`.
- `article` is required on every Dutch chunk (`"de"`, `"het"` or `null`); English chunks have no `article`.
- Speaking prompt 5 of every week is the diary recording; English prompt 5 is always "explain one idea from your own course" (spec §4.7).
- Belgian Standard Dutch for everything the learner says; informal chunks get `"register": "informal"`, polite `u` chunks get `"register": "formal"`.
- Limburg ear: `standard` is only the Dutch to say (no brackets); every `everyday` string appears verbatim in `content/SOURCES.md` with a source. Only forms listed in the **Sourced forms** table below. Not allowed until sourced: *efkes*, *seffens*, *salukes*.
- Public repo: no employer names, no real colleagues, no personal details. Fictional cast only: **Amir** (learner stand-in, from Iran, logistics department, also studies at the university), **Lien** and **Tom** (colleagues), **Sofie** (team lead), **Els Janssens** (contact at a supplier). Personal slots in chunks use `…` (at most 3 chunks per week).
- No text copied from CVO / *Zo Gezegd* (local folder `EN Learning/Dutch language course/`). Everything is self-written.
- English stays at B2 (no level floor for English).
- Ear-quiz pairs: two different spellings, both real everyday words, no rude words.
- Farsi hints (`fa`): Persian script, 1–2 short sentences, only where they help (non-literal chunks, Belgian-only words, word-order traps). Every Dutch week: `sound.fa`, `grammar.fa`, and 4–8 chunk hints.

### Authoring rules (all content tasks)

1. **Dutch level floor (A2+)** — enforced by `checkLevel` from Task 1: chunks ≤ 14 words and on average ≥ 6; at most 3 chunks of 1–2 words (noun cards for de/het); ≥ 6 chunks that join two ideas (*dus, maar, omdat, want, als, daarom, wanneer, terwijl, zodat, toen*); dialogue lines average ≥ 9 words; every Dutch speaking task `"seconds": 90` with a model answer ≥ 70 words; grammar answers average ≥ 6 words.
2. **Model answers** use the prompt's frames and at least two of the week's chunks; Amir's facts stay consistent (Iran, Hasselt, logistics, studies). English models are 90–130 words.
3. **Dialogues** use only words a learner at A2+ can follow, plus the week's chunks; at least 4 chunks of the week appear in each dialogue. Every line has a natural English `en`.
4. **Grammar explain** (English, 3–5 sentences, one example) + `fa` (Persian, the same rule with the Farsi contrast). Prompts follow the format given in each brief.
5. **Sound**: `explain` (English, what changes the meaning), `anchor` (the Farsi anchor from spec §4.4.4), `fa` (Persian).
6. **Role-play** prompts follow the week-1 shape: role, setting, "Speak Belgian Dutch (Flemish) at A2+ level: normal everyday sentences, a little slower than normal.", one question at a time, no corrections during the talk, then (1) three corrections quoting my sentence, (2) two things I said well, (3) one useful Flemish phrase; no pronunciation comments unless a word was not understood; a first line to start with. English role-plays keep "B2" and the he/she + a/the focus.
7. **Read-through before commit**: read every Dutch sentence aloud once; check verb position (V2 / verb at the end after *omdat, als, dat*), de/het, and that no Netherlands-only word slipped in where Belgium uses another (*gsm* not *mobieltje*, *tegen vrijdag* = by Friday, *voormiddag* = morning).

### Sourced forms (Limburg ear may use only these)

| Feature | Examples on the source page | Source |
|---|---|---|
| Dropped final consonant | altij', da', goe', iet', mè', wa' | VL = [Vlaanderen.be, Tussentaal – kenmerken](https://www.vlaanderen.be/taaladvies/taaladviezen/tussentaal-kenmerken) |
| Silent h | Ik 'eb mijn 'uis 'elemaal 'eringericht | VL |
| *ekik* | Da' weet ekik wel | VL |
| gij-system | Ge vraagt u zeker af…; 'Ebde (gij) tijd? | VL |
| *hem* as subject after the verb | 'Oe 'eeft hem da' gedaan? | VL |
| Inflected articles | ne jongen, e kind, zijnen auto, nen boek | VL |
| Double negation | Ik kan hem nie' goe' nie' meer volgen | VL |
| Fillers | allee, amai, awel, nè, sè, zulle | VL |
| Limburg words | hennig (vriendelijk, opgewekt), vies (erg, heel), sjiek, waggeffe, klommelen (klussen, prutsen), fijn (leuk), jong, gans (hele), enne (hoe gaat het / uitleg?), toen effe (daarnet), "Wat is't, mijne man?", haddich (hou je goed), kallen / plat kallen (spreken / dialect spreken), "Wa make?" (citétaal: hoe gaat het?) | GT = [Goesting in Taal, informele spreektaal in Limburg](https://www.goestingintaal.be/nl/lokale-accenten-en-dialecten-alles-wat-je-moet-weten-over-de-informele-spreektaal-in-limburg/) |
| goesting | goesting (zin) | [Canon van Vlaanderen, goesting](https://www.canonvanvlaanderen.be/en/events/goesting/) |
| Belgian words | koffiekoek (NL koffiebroodje), confituur (NL jam), ’s middags = around noon | BN = [Vlaanderen.be, verschillen België–Nederland](https://www.vlaanderen.be/taaladvies/standaardtaal-verschillen-tussen-belgië-en-nederland) |

## Review Focus

1. A noun card whose `article` disagrees with its text or with `content/words.json` would teach the wrong de/het colour forever — test in Task 1 (Step 4).
2. A Limburg pair whose `standard` and `everyday` are the same text (week 1 has "Mijn gsm ↔ Mijn gsm") shows nothing to learn and reads the same sentence twice — test in Task 1 (Step 4).
3. A Dutch role-play prompt that still asks the voice assistant for "simple A2" Dutch undoes the learner's level choice — test in Task 1 (Step 4).
4. The same sentence taught as a card in two weeks (or twice in one week) becomes two cards reviewed separately — `findRepeats` in Task 2.
5. Once week 2 exists, finishing week 1 must land on "Week 2 · Session 1" (the smoke test now expects "coming soon"), and every written week must open at session 1 and session 5 — smoke changes in Task 2.

## File map

| File | Change | Task |
|---|---|---|
| `tools/schema.mjs` | add `countWords`, `LEVEL`, `checkLevel`; later `findRepeats` | 1, 2 |
| `tools/validate.mjs` | run `checkLevel` per file; `findRepeats` over all weeks | 1, 2 |
| `test/fixtures.mjs` | add `levelNl()` (an A2+ Dutch week) | 1 |
| `test/schema.test.mjs` | tests for level floor and repeats | 1, 2 |
| `test/content-files.test.mjs` | level floor, articles, Limburg pairs, role-play level, repeats on real files | 1, 2 |
| `tools/smoke.mjs` | open every written week; "coming soon" only for the first unwritten one | 2 |
| `content/nl/week-01.json` | rewritten at A2+ (sound unchanged) | 1 |
| `content/nl/week-0{2,3,4}.json`, `content/en/week-0{2,3,4}.json` | new | 3, 4, 5 |
| `content/SOURCES.md` | one row per new `everyday` form | 1, 3, 4, 5 |
| `sw.js` | add new week files to `SHELL` | 3, 4, 5 |
| `docs/superpowers/specs/2026-10-05-taalmaatje-course-design.md` | level decision, level floor, decisions log | 1, 5 |

---

### Task 1: Dutch level floor (A2+) and week 1 Dutch rewritten — publish

**Files:**
- Modify: `tools/schema.mjs` (append after `validateWeek`)
- Modify: `tools/validate.mjs`
- Modify: `test/fixtures.mjs`, `test/schema.test.mjs`, `test/content-files.test.mjs`
- Modify: `content/nl/week-01.json` (full rewrite except `sound`)
- Modify: `content/SOURCES.md`
- Modify: `docs/superpowers/specs/2026-10-05-taalmaatje-course-design.md`

**Interfaces:**
- Produces: `countWords(text: string): number`, `LEVEL: { nl: {...} }`, `checkLevel(week: object): string[]` (empty for English weeks), all exported from `tools/schema.mjs`; `levelNl(): object` from `test/fixtures.mjs`.

- [ ] **Step 1: Baseline**

Run: `npm test && npm run validate && npm run smoke`
Expected: all pass ("All screens OK").

- [ ] **Step 2: Write the failing level tests**

In `test/fixtures.mjs`, append:

```js
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
```

In `test/schema.test.mjs`, change the imports to:

```js
import { validateWeek, validateWords, checkLevel, countWords } from '../tools/schema.mjs';
import { validNl, validEn, levelNl } from './fixtures.mjs';
```

and append:

```js
test('countWords ignores punctuation and the … slot', () => {
  assert.equal(countWords('Kan je dat nog eens herhalen?'), 6);
  assert.equal(countWords('Ik woon in …'), 3);
  assert.equal(countWords('Wat bedoel je met ‘opvolgen’?'), 5);
});

test('a Dutch week at A2+ passes the level check', () => assert.deepEqual(checkLevel(levelNl()), []));

test('a Dutch week of two-word chunks is below A2+', () => {
  const errors = checkLevel(validNl());
  assert.ok(has(errors, 'chunks average'));
  assert.ok(has(errors, 'join two ideas'));
});

test('a chunk too long to say from memory is reported', () => {
  const w = levelNl();
  w.chunks[3].text = 'Ik werk vandaag thuis aan het project omdat de trein niet rijdt en het ook regent buiten.';
  assert.ok(has(checkLevel(w), 'chunks[3] has 17 words'));
});

test('more than three one- or two-word chunks is reported', () => {
  const w = levelNl();
  for (const i of [10, 11, 12, 13]) w.chunks[i].text = 'de vergadering';
  assert.ok(has(checkLevel(w), '4 chunks have 1–2 words'));
});

test('a 60-second speaking task or a short model answer is reported', () => {
  const w = levelNl();
  w.speaking[0].seconds = 60;
  w.speaking[1].model = 'Ik ben Amir.';
  const errors = checkLevel(w);
  assert.ok(has(errors, 'speaking[0].seconds is 60'));
  assert.ok(has(errors, 'speaking[1].model has 3 words'));
});

test('short dialogue lines and short grammar answers are reported', () => {
  const w = levelNl();
  for (const d of w.dialogues) for (const l of d.lines) l.text = 'Ja, goed.';
  for (const it of w.grammar.items) it.answer = 'Ik werk.';
  const errors = checkLevel(w);
  assert.ok(has(errors, 'dialogue lines average 2.0'));
  assert.ok(has(errors, 'grammar answers average 2.0'));
});

test('English weeks have no Dutch level floor', () => assert.deepEqual(checkLevel(validEn()), []));
```

- [ ] **Step 3: Run to see them fail**

Run: `node --test test/schema.test.mjs`
Expected: FAIL — `checkLevel` / `countWords` are not exported (SyntaxError on import).

- [ ] **Step 4: Implement the level floor**

Append to `tools/schema.mjs`:

```js
// Words in a text, for level checks: punctuation and the "…" slot do not count.
export function countWords(text) {
  return String(text ?? '').replace(/[…?!.,:;"“”‘’()]/g, ' ').split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;
}

// Dutch level floor (A2+), chosen by the learner on 2026-10-06 after week 1 felt too easy.
// Only real lesson files are checked (validate.mjs and the content tests), not test fixtures.
export const LEVEL = {
  nl: {
    maxChunkWords: 14, minAvgChunkWords: 6, maxShortChunks: 3, minLinkedChunks: 6,
    minAvgLineWords: 9, minSeconds: 90, minModelWords: 70, minAvgAnswerWords: 6,
  },
};
const LINK_WORDS = /\b(dus|maar|omdat|want|als|daarom|wanneer|terwijl|zodat|toen)\b/i;
const average = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

export function checkLevel(data) {
  const rules = LEVEL[data?.lang];
  if (!rules) return [];
  const errors = [];
  const chunks = data.chunks ?? [];
  const sizes = chunks.map((c) => countWords(c.text));
  sizes.forEach((n, i) => {
    if (n > rules.maxChunkWords) errors.push(`chunks[${i}] has ${n} words; at most ${rules.maxChunkWords}, so it can be said from memory`);
  });
  if (average(sizes) < rules.minAvgChunkWords) errors.push(`chunks average ${average(sizes).toFixed(1)} words; A2+ needs at least ${rules.minAvgChunkWords}`);
  const short = sizes.filter((n) => n <= 2).length;
  if (short > rules.maxShortChunks) errors.push(`${short} chunks have 1–2 words; at most ${rules.maxShortChunks} (keep only nouns whose de/het matters)`);
  const linked = chunks.filter((c) => LINK_WORDS.test(c.text)).length;
  if (linked < rules.minLinkedChunks) errors.push(`${linked} chunks join two ideas (dus, maar, omdat, want, als …); A2+ needs at least ${rules.minLinkedChunks}`);
  const lines = (data.dialogues ?? []).flatMap((d) => d.lines ?? []).map((l) => countWords(l.text));
  if (average(lines) < rules.minAvgLineWords) errors.push(`dialogue lines average ${average(lines).toFixed(1)} words; A2+ needs at least ${rules.minAvgLineWords}`);
  for (const [i, p] of (data.speaking ?? []).entries()) {
    if (p.seconds < rules.minSeconds) errors.push(`speaking[${i}].seconds is ${p.seconds}; A2+ answers last at least ${rules.minSeconds}`);
    const n = countWords(p.model);
    if (n < rules.minModelWords) errors.push(`speaking[${i}].model has ${n} words; a ${rules.minSeconds}-second model needs at least ${rules.minModelWords}`);
  }
  const answers = (data.grammar?.items ?? []).map((it) => countWords(it.answer));
  if (average(answers) < rules.minAvgAnswerWords) errors.push(`grammar answers average ${average(answers).toFixed(1)} words; A2+ needs at least ${rules.minAvgAnswerWords}`);
  return errors;
}
```

Run: `node --test test/schema.test.mjs`
Expected: PASS (all old and new schema tests).

- [ ] **Step 5: Check real files — the failing content tests**

In `test/content-files.test.mjs`, change the schema import to `import { validateWeek, validateWords, checkLevel } from '../tools/schema.mjs';`, add a helper under `read`:

```js
const weekFiles = async (lang) =>
  (await readdir(new URL(`../content/${lang}/`, import.meta.url))).filter((f) => /^week-\d\d\.json$/.test(f)).sort();
```

and append:

```js
test('every Dutch week meets the A2+ level floor', async () => {
  for (const f of await weekFiles('nl')) assert.deepEqual(checkLevel(await read(`nl/${f}`)), [], f);
});

test('a noun card has the article it shows, matching the word list', async () => {
  const words = Object.fromEntries((await read('words.json')).map((w) => [w.text, w.article]));
  for (const f of await weekFiles('nl')) {
    for (const c of (await read(`nl/${f}`)).chunks) {
      const noun = c.text.match(/^(de|het) [\p{L}-]+$/u);
      if (!noun) continue;
      assert.equal(c.article, noun[1], `${c.id} "${c.text}" needs article "${noun[1]}"`);
      if (c.text in words) assert.equal(words[c.text], c.article, `${c.id}: the word list says "${words[c.text]}"`);
    }
  }
});

test('every Limburg pair shows two different forms', async () => {
  for (const f of await weekFiles('nl')) {
    for (const l of (await read(`nl/${f}`)).limburg) assert.notEqual(l.standard.trim(), l.everyday.trim(), `${f}: "${l.standard}" is the same on both sides`);
  }
});

test('Dutch role-play prompts ask for A2+ Dutch, the level the learner chose', async () => {
  for (const f of await weekFiles('nl')) assert.match((await read(`nl/${f}`)).roleplay.prompt, /A2\+/, f);
});
```

In `tools/validate.mjs`, import `checkLevel` and add it to each file's errors, right after `const errors = validateWeek(...)`:

```js
import { validateWeek, validateWords, checkLevel } from './schema.mjs';
```
```js
    const errors = validateWeek(data, { lang, week: Number(file.slice(5, 7)) });
    errors.push(...checkLevel(data));
```

Run: `npm test` and `npm run validate`
Expected: FAIL only on `nl/week-01.json`: level errors (chunks average 3.8, 0 chunks join two ideas, 9 short chunks, 60-second tasks, short models), the "Mijn gsm" pair, and the role-play "A2" prompt. Everything else passes.

- [ ] **Step 6: Rewrite `content/nl/week-01.json` at A2+**

Keep `lang`, `week`, `theme`, `themeEn` and the whole `sound` object unchanged. Rewrite everything else as below, following the Authoring rules.

**Chunks** (ids `nl-01-001` … `nl-01-026`, in this order; `article: null` unless shown):

| # | text | en | extra |
|---|---|---|---|
| 1 | Goeiemorgen! Ik ben de nieuwe collega van de afdeling … | Good morning! I'm the new colleague from the … department. | |
| 2 | Ik ben hier pas begonnen, dus ik ken nog niet iedereen. | I've only just started here, so I don't know everyone yet. | fa: *pas* = «تازه» |
| 3 | Aangenaam! Hoelang werk jij hier al? | Nice to meet you! How long have you been working here? | fa: present tense + *al* = «چند وقته که…»; stress `aan-ge-NAAM` |
| 4 | Hoe heet je ook alweer? Ik ben slecht in namen. | What was your name again? I'm bad with names. | informal |
| 5 | Op welke afdeling werk jij eigenlijk? | Which department do you actually work in? | |
| 6 | Wat doe je hier precies, als ik vragen mag? | What exactly do you do here, if I may ask? | fa: fixed phrase *als ik vragen mag* |
| 7 | Ik spreek nog niet zo goed Nederlands, maar ik leer elke dag bij. | My Dutch isn't very good yet, but I learn something new every day. | |
| 8 | Spreek gerust Nederlands met mij, want ik wil oefenen. | Feel free to speak Dutch with me, because I want to practise. | |
| 9 | Sorry, kan je dat nog eens herhalen? Ik heb het niet goed verstaan. | Sorry, can you repeat that? I didn't hear it properly. | |
| 10 | Kan je wat trager spreken? Dan kan ik je beter volgen. | Could you speak a bit more slowly? Then I can follow you better. | |
| 11 | Wat bedoel je precies met …? | What exactly do you mean by …? | |
| 12 | Hoe was je weekend? Heb je iets leuks gedaan? | How was your weekend? Did you do anything fun? | |
| 13 | Niet veel, ik heb vooral gerust, want ik was moe. | Not much, I mostly rested, because I was tired. | |
| 14 | Zaterdag ben ik met vrienden naar het centrum geweest. | On Saturday I went to the town centre with friends. | |
| 15 | Het weer is weer slecht, hè? Het regent al de hele week. | The weather's bad again, isn't it? It's been raining all week. | fa: *weer* = هوا and «دوباره» |
| 16 | Zin in een koffie? Ik trakteer. | Fancy a coffee? My treat. | informal |
| 17 | Smakelijk! Heb je zelf eten meegebracht? | Enjoy your meal! Did you bring your own food? | |
| 18 | Ik woon nu in Hasselt, maar ik kom oorspronkelijk uit … | I live in Hasselt now, but I'm originally from … | |
| 19 | Naast mijn werk studeer ik ook aan de universiteit. | Besides my job, I also study at the university. | fa: verb in place 2 after *Naast mijn werk* |
| 20 | Dat is soms druk, maar het lukt wel. | That's busy sometimes, but I manage. | |
| 21 | Als ik iets niet begrijp, vraag ik het gewoon. | If I don't understand something, I just ask. | fa: after an *als*-part the verb comes first: *vraag ik* |
| 22 | Bedankt voor je hulp, dat is echt fijn. | Thanks for your help, that's really nice. | |
| 23 | de collega | the colleague | article `de` |
| 24 | de afdeling | the department | article `de`; stress `af-DE-ling` |
| 25 | het overleg | the meeting (team meeting) | article `het` |
| 26 | Fijne avond nog, en tot morgen! | Have a nice evening, and see you tomorrow! | |

**Dialogue A** `nl-01-dA` "Eerste dag op het werk" (Lien, Amir), 10 lines, one beat per line:
1. Lien greets him and asks if he is the new colleague from logistics.
2. Amir: yes, he has only just started, so he doesn't know everyone yet; says his name.
3. Lien says her name, says she has worked in planning for five years, asks how his first days are going.
4. Amir: it's going well, but everything is new; his Dutch isn't very good yet, but he learns every day.
5. Lien: he speaks well already; colleagues here talk fast and sometimes use Limburg words.
6. Amir asks her to speak a bit more slowly, then he can follow; and to speak Dutch with him, because he wants to practise.
7. Lien: of course; if he doesn't understand something, he should just ask.
8. Amir asks what exactly she does, if he may ask.
9. Lien: she makes the planning for the trucks; invites him for coffee at ten.
10. Amir thanks her: nice, see you at ten.

**Dialogue B** `nl-01-dB` "Maandagochtend bij de koffie" (Tom, Amir), 10 lines:
1. Tom: all good? How was the weekend, did he do anything fun?
2. Amir: on Saturday he went to the centre with friends; on Sunday he mostly rested, because he was tired.
3. Tom: he cycled along the Albertkanaal with his children, but the weather was bad again.
4. Amir: yes, it has been raining all week; in his country it is warmer, but he likes Hasselt.
5. Tom asks: you also study, right?
6. Amir: yes, besides his job he studies at the university; that is busy sometimes, but he manages.
7. Tom: respect; fancy a coffee? His treat.
8. Amir: gladly, with milk and without sugar; asks when the team meeting starts.
9. Tom: at half past nine, in room two.
10. Amir: thanks, see you at the meeting.

**Speaking** (all `"seconds": 90`; prompt = Dutch + English in brackets, like week 1):
- `nl-01-s1` "Stel jezelf voor in het teamoverleg: wie je bent, sinds wanneer je hier werkt, wat je doet en één ding over jezelf buiten het werk." (Introduce yourself in the team meeting…) Frames: "Goeiemorgen allemaal, ik ben … en ik ben de nieuwe collega van …" / "Ik werk hier sinds …, dus ik ken nog niet iedereen." / "Ik doe vooral …" / "Buiten het werk …"
- `nl-01-s2` "Een collega vraagt: ‘Hoe gaan je eerste weken?’ Vertel wat goed gaat, wat nog moeilijk is en wat je eraan doet. Gebruik ‘maar’ en ‘dus’." Frames: "Het gaat goed, maar …" / "Wat nog moeilijk is, is …" / "…, dus ik …" / "Als ik iets niet begrijp, …"
- `nl-01-s3` "Vertel over je weekend. Begin je zinnen met een tijdwoord (zaterdag, zondagmiddag, ’s avonds) en geef één reden met ‘want’. Werkwoord op plaats 2!" Frames: "Zaterdag ben ik …" / "Zondagmiddag heb ik …" / "’s Avonds …" / "…, want …"
- `nl-01-s4` "In het overleg begrijp je een collega niet. Vraag om te herhalen, vraag wat een woord betekent en check of je het goed begrepen hebt." Frames: "Sorry, kan je dat nog eens herhalen?" / "Wat bedoel je precies met …?" / "Dus als ik het goed begrijp, …?"
- `nl-01-s5` (diary) "Jouw eerste anderhalve minuut in het Nederlands: wie je bent, waar je werkt en studeert, waarom je Nederlands leert en wat je over twaalf weken beter wilt kunnen zeggen. (This recording is saved in your speaking diary.)" Frames: "Ik ben … en ik kom uit …" / "Ik werk … en naast mijn werk …" / "Ik leer Nederlands omdat …" / "Over twaalf weken wil ik …"

**Grammar** — keep `id: "v2"`, title "The verb in place 2"; rewrite `explain`/`fa` to mention longer starters (*Na de vergadering*, *Sinds vorige maand*, *Naast mijn werk*). Items (prompt → answer):
1. Vandaag … (ik / thuis aan het project werken) → Vandaag werk ik thuis aan het project.
2. Morgen … (wij / om negen uur een overleg hebben) → Morgen hebben wij om negen uur een overleg.
3. Na de vergadering … (ik / mijn mails lezen) → Na de vergadering lees ik mijn mails.
4. Sinds vorige maand … (ik / op de afdeling logistiek werken) → Sinds vorige maand werk ik op de afdeling logistiek.
5. In het weekend … (mijn collega / graag met zijn kinderen fietsen) → In het weekend fietst mijn collega graag met zijn kinderen.
6. Elke ochtend … (ik / met de bus naar het werk komen) → Elke ochtend kom ik met de bus naar het werk.
7. Soms … (mijn collega's / te snel voor mij spreken) → Soms spreken mijn collega's te snel voor mij.
8. Naast mijn werk … (ik / aan de universiteit studeren) → Naast mijn werk studeer ik aan de universiteit.
9. Daarom … (ik / elke dag een beetje oefenen) → Daarom oefen ik elke dag een beetje.
10. Gelukkig … (mijn collega's / heel geduldig zijn) → Gelukkig zijn mijn collega's heel geduldig.
11. Om half tien … (het overleg / in zaal twee beginnen) → Om half tien begint het overleg in zaal twee.
12. Volgende week … (Lien / een paar dagen op vakantie gaan) → Volgende week gaat Lien een paar dagen op vakantie.
13. Eigenlijk … (ik / liever in het Nederlands antwoorden) → Eigenlijk antwoord ik liever in het Nederlands.
14. ’s Middags … (wij / meestal samen aan een grote tafel eten) → ’s Middags eten wij meestal samen aan een grote tafel.
15. Tot vrijdag … (wij / nog veel werk hebben) → Tot vrijdag hebben wij nog veel werk.

**Limburg**: keep the first seven pairs as they are ('Ebde gij tijd? … Amai!). Replace the "Mijn gsm ↔ Mijn gsm" pair with: standard "Dat is altijd goed." ↔ everyday "Da's altij goe." note "Final consonants drop: altijd → altij, goed → goe, dat → da." Move the gsm fact into chunk notes in week 3 (Task 4).

**Role-play**: same scene (Lien at the coffee machine), level sentence from Authoring rule 6, and add: "Ask follow-up questions about my weekend and my studies."
**Mission**: "At lunch, ask one colleague about their weekend and ask two follow-up questions. Then tell them about yours in at least three sentences."

- [ ] **Step 7: Source row**

Append to the table in `content/SOURCES.md`:

```markdown
| Da's altij goe. (dropped final d/t: altij, goe, da) | [Vlaanderen.be, Tussentaal – kenmerken](https://www.vlaanderen.be/taaladvies/taaladviezen/tussentaal-kenmerken) |
```

- [ ] **Step 8: Run all checks**

Run: `npm test && npm run validate && npm run smoke`
Expected: all pass. If `checkLevel` reports a number, fix the content (lengthen lines/models), never the rule.

- [ ] **Step 9: Update the spec**

In `docs/superpowers/specs/2026-10-05-taalmaatje-course-design.md`:
- §2 table, Dutch level row → `About **A2** (CVO course *Zo Gezegd* 2.1 → 2.2). Course Dutch is written at **A2+** (week 1 at A2 felt too easy, 2026-10-06)`.
- §5.4, after the English minimum line, add: `**Dutch level floor (A2+)**, checked by \`checkLevel\` in \`tools/schema.mjs\`: chunks at most 14 words and on average at least 6; at most 3 chunks of 1–2 words (nouns for de/het); at least 6 chunks that join two ideas (dus, maar, omdat, want, als, daarom, wanneer, terwijl, zodat, toen); dialogue lines on average at least 9 words; every speaking task 90 s with a model answer of at least 70 words; grammar answers on average at least 6 words. Dutch role-play prompts ask for A2+.`
- §9 item 2 → `**Week 1 Dutch rewritten at A2+**, then weeks 2–4 + Limburg ear content checked against sources.`
- §10, add rows:
  - `| 2026-10-06 | iPhone Silent mode mutes the browser voice; Audio check tests 4–5 found no web workaround. Accepted: the learner turns Silent off while studying. Possible later fix: pre-made audio files from an open voice |`
  - `| 2026-10-06 | The learner found week 1 Dutch too easy: Dutch moves to A2+ (level floor in §5.4); week 1 Dutch is rewritten before weeks 2–4. English stays at B2 |`
  - `| 2026-10-06 | A Limburg pair must show two different forms; Belgian-vs-Netherlands words go in chunk notes, not identical pairs |`

- [ ] **Step 10: Read-through**

Apply Authoring rule 7 to the whole file; confirm the Farsi hints read naturally; confirm the dialogue uses ≥ 4 week chunks each.

- [ ] **Step 11: Commit**

```bash
git add tools/schema.mjs tools/validate.mjs test/fixtures.mjs test/schema.test.mjs test/content-files.test.mjs content/nl/week-01.json content/SOURCES.md docs/superpowers/specs/2026-10-05-taalmaatje-course-design.md docs/superpowers/plans/2026-10-06-taalmaatje-milestone-2.md
git commit -m "feat: Dutch level floor (A2+) and week 1 Dutch rewritten at that level"
```

- [ ] **Step 12: Publish and verify**

Run: `git push origin HEAD:main`
Then poll (in the background, about 1–2 minutes) until the live file is the new one:
`curl -s https://momi1370.github.io/Language-Learning/content/nl/week-01.json | grep -c "Ik ben hier pas begonnen"`
Expected: `1`.

---

### Task 2: Smoke test follows the written weeks; no card taught twice

**Files:**
- Modify: `tools/schema.mjs` (add `findRepeats`)
- Modify: `tools/validate.mjs`
- Modify: `test/schema.test.mjs`, `test/content-files.test.mjs`
- Modify: `tools/smoke.mjs`

**Interfaces:**
- Consumes: `validNl()`, `validEn()` from `test/fixtures.mjs`; `weekFiles(lang)` helper in `test/content-files.test.mjs` (Task 1).
- Produces: `findRepeats(weeks: object[]): string[]` — one message per repeated card text within the same language, `"<id> repeats <first id>: \"<text>\""`.

- [ ] **Step 1: Write the failing tests**

In `test/schema.test.mjs`, add `findRepeats` to the schema import and append:

```js
test('the same card text in two weeks is reported, ignoring case and punctuation', () => {
  const a = validNl();
  const b = validNl();
  b.week = 2;
  b.chunks = b.chunks.map((c, i) => ({ ...c, id: `nl-02-${String(i + 1).padStart(3, '0')}`, text: `andere zin ${i}` }));
  b.chunks[4].text = 'Zin 3!';
  assert.deepEqual(findRepeats([a, b]), ['nl-02-005 repeats nl-01-004: "Zin 3!"']);
});

test('the same text in a Dutch and an English week is not a repeat', () => {
  const a = validNl();
  const e = validEn();
  e.chunks[0].text = a.chunks[0].text;
  assert.deepEqual(findRepeats([a, e]), []);
});
```

Run: `node --test test/schema.test.mjs`
Expected: FAIL — `findRepeats` is not exported.

- [ ] **Step 2: Implement `findRepeats`**

Append to `tools/schema.mjs`:

```js
// A card text used twice (any week, same language) would become two cards reviewed separately.
export function findRepeats(weeks) {
  const seen = new Map();
  const errors = [];
  for (const w of weeks) {
    for (const c of w.chunks ?? []) {
      const key = `${w.lang}:${String(c.text).toLowerCase().replace(/[^\p{L}\d…]+/gu, ' ').trim()}`;
      if (seen.has(key)) errors.push(`${c.id} repeats ${seen.get(key)}: "${c.text}"`);
      else seen.set(key, c.id);
    }
  }
  return errors;
}
```

Run: `node --test test/schema.test.mjs`
Expected: PASS.

- [ ] **Step 3: Use it on the real files**

In `test/content-files.test.mjs`, add `findRepeats` to the import and append:

```js
test('no sentence is taught as a card twice', async () => {
  const weeks = [];
  for (const lang of ['nl', 'en']) for (const f of await weekFiles(lang)) weeks.push(await read(`${lang}/${f}`));
  assert.deepEqual(findRepeats(weeks), []);
});
```

In `tools/validate.mjs`, import `findRepeats`, collect every parsed week in `const all = [];` (push `data` right after a successful parse), and after the language loop add:

```js
report('all weeks (repeated cards)', findRepeats(all));
```

Run: `npm test && npm run validate`
Expected: PASS, and validate prints `✓ all weeks (repeated cards)`.

- [ ] **Step 4: Smoke test opens every written week**

In `tools/smoke.mjs`, add at the top `import { readdir } from 'node:fs/promises';` and, before `const server = …`:

```js
// The weeks that exist now; the first missing one must say "coming soon".
const written = (await readdir(new URL('../content/nl/', import.meta.url)))
  .filter((f) => /^week-\d\d\.json$/.test(f)).map((f) => Number(f.slice(5, 7))).sort((a, b) => a - b);
```

Replace the two lines

```js
  // Week 2 is not written yet: its 404s are expected, and Today must say so.
  await check('tools/set-position.html?week=2&session=1&to=today', 'today', 'coming soon', ['week-02.json']);
```

with

```js
  // Every written week opens (session 1) and has its Limburg ear (session 5).
  for (const w of written) {
    await check(`tools/set-position.html?week=${w}&session=1&to=today`, 'today', `Week ${w} · Session 1`);
    await check(`tools/set-position.html?week=${w}&session=5&to=block/listen`, 'block/listen', 'Limburg ear');
  }
  // The first week that is not written yet: its 404s are expected, and Today must say so.
  const next = written.at(-1) + 1;
  if (next <= 12) {
    const file = `week-${String(next).padStart(2, '0')}.json`;
    await check(`tools/set-position.html?week=${next}&session=1&to=today`, 'today', 'coming soon', [file]);
  }
```

In the "double tap on Finish" check, change the wait so it works whether week 2 exists or not:

```js
  await b.waitFor(`/coming soon|Week 2 · Session 1/.test(document.querySelector('main').innerText)`, 5000);
```

Run: `npm run smoke`
Expected: "All screens OK", with new lines `✓ /tools/set-position.html?week=1&session=1&to=today` and `…week=2&session=1&to=today` (coming soon).

- [ ] **Step 5: Commit**

```bash
git add tools/schema.mjs tools/validate.mjs test/schema.test.mjs test/content-files.test.mjs tools/smoke.mjs
git commit -m "test: smoke test opens every written week; no card is taught twice"
```

(No deploy needed: test-only change.)

---

### Task 3: Week 2 — meetings and questions (Dutch) + asking questions in class (English) — publish

**Files:**
- Create: `content/nl/week-02.json`, `content/en/week-02.json`
- Modify: `sw.js` (`SHELL`), `content/SOURCES.md`

**Interfaces:**
- Consumes: `checkLevel`, `findRepeats` (via `npm test` / `npm run validate`); smoke from Task 2.

- [ ] **Step 1: Register the files first (red)**

Add `'content/nl/week-02.json',` and `'content/en/week-02.json',` to `SHELL` in `sw.js`, after the week-01 lines.
Run: `node --test test/sw.test.mjs`
Expected: FAIL — "every file in the offline list exists" (the files are not written yet).

- [ ] **Step 2: Write `content/nl/week-02.json`**

`theme` "Vergaderingen volgen en vragen stellen", `themeEn` "Following meetings, asking to repeat or clarify".

**Sound** `id` "nl-ui-oe", `title` "ui or oe? (huis – hoes)". Anchor: "oe is Farsi «او». ui has no Farsi sound: start with round lips on «اِ» and glide towards a rounded «ای»." Pairs: huis–hoes, buik–boek, muis–moes, tuin–toen, duin–doen, kuil–koel, buil–boel.

**Chunks** (`nl-02-001` … `026`):

| # | text | en | extra |
|---|---|---|---|
| 1 | Sorry, ik heb dat laatste niet goed verstaan. | Sorry, I didn't catch that last bit. | |
| 2 | Kan je dat nog eens uitleggen, maar dan wat trager? | Can you explain that again, but a bit more slowly? | |
| 3 | Wat bedoel je precies met dat woord? | What exactly do you mean by that word? | |
| 4 | Als ik het goed begrijp, moeten we dat tegen vrijdag afwerken? | If I understand correctly, we have to finish that by Friday? | fa: *tegen vrijdag* (Belgium) = «تا جمعه», not «علیه» |
| 5 | Dus de vergadering is verschoven naar donderdag? | So the meeting has been moved to Thursday? | |
| 6 | Wie maakt vandaag het verslag van het overleg? | Who is taking the minutes of the meeting today? | fa: *verslag maken* = «صورت‌جلسه نوشتن» |
| 7 | Mag ik even iets vragen voor we verdergaan? | May I ask something before we go on? | fa: *voor* here = «قبل از اینکه» |
| 8 | Ik volg het niet helemaal. Kan je een voorbeeld geven? | I'm not quite following. Can you give an example? | |
| 9 | Kan je dat even opschrijven? Dan vergeet ik het niet. | Could you write that down? Then I won't forget it. | |
| 10 | Wat is het volgende punt op de agenda? | What's the next item on the agenda? | |
| 11 | Wanneer is de deadline voor dat project? | When is the deadline for that project? | |
| 12 | We hebben weinig tijd, dus wat is het belangrijkste? | We don't have much time, so what's most important? | |
| 13 | Waarom hebben we dat plan veranderd? | Why did we change that plan? | |
| 14 | Wie is er verantwoordelijk voor dat deel? | Who is responsible for that part? | stress `ver-ant-WOOR-de-lijk` |
| 15 | Ik heb nog een vraag over het tweede punt. | I have another question about the second point. | |
| 16 | Kunnen we daar na de vergadering even over praten? | Can we talk about that briefly after the meeting? | fa: *daar … over* = «درباره‌ی آن»، دو تکه می‌شود |
| 17 | Sorry, ik kon het niet volgen, want het ging te snel. | Sorry, I couldn't follow, because it went too fast. | |
| 18 | Klopt het dat we volgende week een nieuwe planning krijgen? | Is it right that we're getting a new schedule next week? | |
| 19 | Mag ik even samenvatten wat we afgesproken hebben? | May I quickly sum up what we agreed? | |
| 20 | Goed idee, maar hoe pakken we dat praktisch aan? | Good idea, but how do we tackle that in practice? | |
| 21 | Als je wilt, kan ik het verslag vandaag maken. | If you like, I can take the minutes today. | |
| 22 | Het spijt me, ik was even afgeleid. Waar zijn we gebleven? | I'm sorry, I was distracted for a moment. Where were we? | |
| 23 | de vergadering | the meeting | article `de` |
| 24 | het verslag | the minutes / the report | article `het` |
| 25 | de agenda | the agenda / the diary | article `de` |
| 26 | Bedankt voor de uitleg, nu is het duidelijk. | Thanks for the explanation, now it's clear. | |

**Dialogue A** `nl-02-dA` "Het teamoverleg" (Sofie, Amir, Lien), 12 lines:
1. Sofie opens: three points today — the new planning, the new client, the holidays.
2. Sofie explains fast: the new planning starts next month and everyone must "opvolgen" their own files.
3. Amir: sorry, he didn't catch that last bit; what exactly does she mean by "opvolgen"?
4. Sofie: "opvolgen" means checking regularly that something gets done.
5. Amir: thanks — so if he understands correctly, he checks his files every week?
6. Sofie: exactly, and the report has to be finished by Friday.
7. Lien asks who is taking the minutes today.
8. Sofie asks Amir if he wants to try.
9. Amir: okay, but can someone read it before he sends it, because his Dutch isn't perfect yet.
10. Lien: of course, she'll read it, no problem.
11. Sofie: next item on the agenda, the new client.
12. Amir: may he ask something before they go on — when is the deadline for that project?

**Dialogue B** `nl-02-dB` "Na de vergadering" (Tom, Amir), 10 lines:
1. Amir: does Tom have a minute? He didn't follow everything in the meeting.
2. Tom: of course, what wasn't clear?
3. Amir: the team meeting has been moved to Thursday?
4. Tom: yes, from now on the team meeting is on Thursday morning, not Monday.
5. Amir: and is it right that they're getting a new schedule next week?
6. Tom: yes, Sofie sends it by email on Monday.
7. Amir: can Tom give an example of what changes for him?
8. Tom: for example, Amir now does the client calls on Tuesday instead of Wednesday.
9. Amir: may he sum up — meeting on Thursday, new schedule on Monday, calls on Tuesday?
10. Tom: perfect, he understood it well.

**Speaking** (all 90 s):
- `nl-02-s1` "Je hebt een deel van het overleg gemist. Stel een collega drie vragen over wat er beslist is: wie, wat en wanneer." Frames: "Sorry, ik was er niet bij toen …" / "Wie …?" / "Wat hebben jullie …?" / "Wanneer …?"
- `nl-02-s2` "Je teamleider legt een nieuwe taak te snel uit. Vraag om te herhalen, vraag een voorbeeld en check of je het goed begrepen hebt." Frames: "Sorry, kan je dat nog eens uitleggen, maar dan wat trager?" / "Kan je een voorbeeld geven?" / "Als ik het goed begrijp, …?"
- `nl-02-s3` "Een collega was ziek tijdens het overleg. Vat het overleg voor hem samen: het onderwerp, wat er beslist is, wie wat doet en tegen wanneer." Frames: "Het overleg ging over …" / "We hebben afgesproken dat …" / "… doet …, en ik …" / "Dat moet klaar zijn tegen …"
- `nl-02-s4` "Bereid vijf vragen voor over een nieuw project. Gebruik wie, wat, wanneer, waarom en hoeveel, en stel ze hardop." Frames: "Wie is er verantwoordelijk voor …?" / "Wat is het doel van …?" / "Wanneer …?" / "Waarom …?" / "Hoeveel …?"
- `nl-02-s5` (diary) "Vertel over een vergadering of een les van deze week: waarover ging het, wat begreep je goed, wat was moeilijk en welke vraag stel je de volgende keer? (This recording is saved in your speaking diary.)" Frames: "Deze week had ik een vergadering over …" / "Ik begreep goed dat …" / "Moeilijk was …, want …" / "De volgende keer vraag ik: …?"

**Grammar** `id` "questions", title "Questions: verb first, or question word + verb". Explain: yes/no question → verb first; with a question word → question word, then verb, then subject. Farsi contrast: Farsi keeps the normal order and adds «آیا» or intonation; Dutch moves the verb. Prompt format "Vraag … (cue)". Items:
1. Vraag wanneer het overleg morgen begint. (wanneer / beginnen) → Wanneer begint het overleg morgen?
2. Vraag wie vandaag het verslag van het overleg maakt. (wie / maken) → Wie maakt vandaag het verslag van het overleg?
3. Ja/nee: (jij / tijd hebben / na de vergadering) → Heb jij tijd na de vergadering?
4. Ja/nee: (de klant / donderdag ook naar het overleg komen) → Komt de klant donderdag ook naar het overleg?
5. Vraag waarom jullie het plan nu nog veranderen. (waarom / veranderen) → Waarom veranderen wij het plan nu nog?
6. Vraag hoeveel tijd jullie nog hebben voor die taak. (hoeveel tijd / hebben) → Hoeveel tijd hebben wij nog voor die taak?
7. Vraag waar het overleg vandaag is. (waar / zijn) → Waar is het overleg vandaag?
8. Ja/nee: (jij / het verslag naar iedereen sturen) → Stuur jij het verslag naar iedereen?
9. Vraag wat het volgende punt op de agenda is. (wat / zijn) → Wat is het volgende punt op de agenda?
10. Vraag wat je collega van de nieuwe planning vindt. (hoe / vinden) → Hoe vind jij de nieuwe planning?
11. Vraag welke collega die taak doet. (welke collega / doen) → Welke collega doet die taak?
12. Vraag om hoe laat de trein naar Brussel vertrekt. (om hoe laat / vertrekken) → Om hoe laat vertrekt de trein naar Brussel?
13. Ja/nee: (jullie / de presentatie al klaar hebben) → Hebben jullie de presentatie al klaar?
14. Vraag wie verantwoordelijk is voor de planning. (wie / zijn) → Wie is verantwoordelijk voor de planning?
15. Vraag wat je collega precies bedoelt met dat woord. (wat / bedoelen) → Wat bedoel jij precies met dat woord?

**Limburg** (7 pairs; note = which feature, in English):
1. Ik heb dat niet goed verstaan. ↔ Ik 'eb da nie goe verstaan. (silent h; dropped final t/d — VL)
2. Kan je dat nog eens zeggen? ↔ Kunt ge da nog ne keer zeggen? (gij-system; *ne* — VL)
3. Ik kan hem niet goed meer volgen. ↔ Ik kan hem nie goe nie meer volgen. (double negation — VL)
4. Wat heeft hij gezegd? ↔ Wa 'eeft hem gezegd? (*hem* as subject after the verb; silent h — VL)
5. Dat weet ik wel. ↔ Da weet ekik wel. (*ekik* — VL)
6. En, hoe gaat het? ↔ Enne? (also "and? explain!" — GT)
7. Kom, we beginnen eraan. ↔ Allee, we beginnen eraan. (filler *allee* — VL)

**Role-play**: Sofie leads a team meeting about the new planning; she uses 2–3 work words the learner may not know (*opvolgen*, *verslag*, *tegen vrijdag*) so that he has to ask; if he asks, she explains simply; at the end she asks him to sum up the decisions. Level sentence and feedback shape from Authoring rule 6. First line: "Goeiemorgen allemaal! We hebben vandaag drie punten. Amir, kan jij straks het verslag maken?"
**Mission**: "In a real meeting at work, ask one question to check that you understood, for example: ‘Als ik het goed begrijp, …?’"

- [ ] **Step 3: Write `content/en/week-02.json`**

`theme`/`themeEn` "Asking questions in class (embedded questions)".
**Sound** `id` "en-s-cluster", `title` "state, not e-state (s + consonant)". Explain: Farsi adds «اِ» before s + consonant; in English that turns *state* into *estate*. Anchor: start the s immediately, hiss «سسس» and go straight into the t. Pairs: state–estate, steam–esteem, sleep–asleep, stray–astray, spire–aspire, spouse–espouse, squire–esquire.
**Chunks** (`en-02-001` … `016`; `en` = when to use it):
1. Could you explain what you mean by …?
2. I was wondering whether you could go over the last slide again.
3. Do you know when the assignment is due? (stress `as-SIGN-ment`)
4. Could you tell me how the final grade is calculated? (stress `CAL-cu-lat-ed`)
5. I'm not sure I understand why this method works.
6. Would you mind repeating the last point?
7. Just to clarify, are we supposed to work in groups?
8. Sorry, I didn't quite catch that.
9. I have a quick question about the reading.
10. Can I ask how this relates to last week's topic?
11. What I don't understand is how …
12. Could you give an example of …?
13. Could you say a bit more about …?
14. So what you're saying is that …?
15. Do you happen to know where the slides are posted?
16. That makes sense now, thanks.

**Speaking** (90 s unless noted):
- `en-02-s1` (60 s) "Turn these direct questions into polite embedded questions and say them: Where is the room? When is the exam? What does this word mean? How many pages do we need? Why is the deadline earlier?" Frames: "Could you tell me where …?" / "Do you know when …?" / "I was wondering what …" / "I'm not sure how many …"
- `en-02-s2` "You missed the first ten minutes of a lecture. Ask a classmate three embedded questions about what you missed." Frames: "Do you know what …?" / "Could you tell me whether …?" / "I was wondering if …"
- `en-02-s3` "In office hours, ask your professor about an assignment: the deadline, the format and how it is graded." Frames: "I have a quick question about …" / "Could you tell me when …?" / "I was wondering whether …" / "Do you know how …?"
- `en-02-s4` "During a lecture, interrupt politely, ask for clarification, then check your understanding." Frames: "Sorry, could I ask a quick question?" / "Could you explain what you mean by …?" / "So what you're saying is that …?"
- `en-02-s5` (diary) "Explain one idea from your own course this week in about 90 seconds, then ask one question you still have about it as an embedded question. (This recording is saved in your speaking diary.)" Frames: "This week we studied …" / "The main idea is …" / "For example, …" / "What I still don't understand is how …"

**Role-play**: a lecturer explains a general topic (supply and demand) at natural speed, pauses to invite questions, answers them; feedback checks embedded-question word order ("Could you tell me where it is?", not "where is it?"), plus he/she and a/the.
**Mission**: "In class or in an email, ask your teacher one question that starts with ‘Could you tell me …’ or ‘I was wondering whether …’."

- [ ] **Step 4: Sources**

Append one row per new everyday form to `content/SOURCES.md` (feature in brackets, source link from the Sourced forms table): `Ik 'eb da nie goe verstaan.`, `Kunt ge da nog ne keer zeggen?`, `Ik kan hem nie goe nie meer volgen.`, `Wa 'eeft hem gezegd?`, `Da weet ekik wel.` (all VL), `Enne?` (GT), `Allee, we beginnen eraan.` (VL).

- [ ] **Step 5: Run all checks**

Run: `npm test && npm run validate && npm run smoke`
Expected: all pass; smoke shows week 1 and week 2 opening, Limburg ear for both, and "coming soon" for week 3.

- [ ] **Step 6: Read-through** (Authoring rule 7), then commit

```bash
git add content/nl/week-02.json content/en/week-02.json content/SOURCES.md sw.js
git commit -m "feat: add week 2 (meetings and questions; asking questions in class)"
```

- [ ] **Step 7: Publish and verify**

Run: `git push origin HEAD:main`, then poll until
`curl -s https://momi1370.github.io/Language-Learning/content/nl/week-02.json | grep -c '"week": 2'` prints `1`.

---

### Task 4: Week 3 — phone, Teams and appointments (Dutch) + seminar discussion (English) — publish

**Files:**
- Create: `content/nl/week-03.json`, `content/en/week-03.json`
- Modify: `sw.js` (`SHELL`), `content/SOURCES.md`

**Interfaces:**
- Consumes: `checkLevel`, `findRepeats`, smoke from Task 2.

- [ ] **Step 1: Register the files first (red)**

Add `'content/nl/week-03.json',` and `'content/en/week-03.json',` to `SHELL` in `sw.js`.
Run: `node --test test/sw.test.mjs` — Expected: FAIL ("every file in the offline list exists").

- [ ] **Step 2: Write `content/nl/week-03.json`**

`theme` "Telefoneren, Teams en afspraken maken", `themeEn` "Phone and Teams calls, making appointments".

**Sound** `id` "nl-uu-oe", `title` "uu or oe? (muur – moer)". Anchor: "oe is Farsi «او». uu: say «ای» and round your lips as for «او». The short u (rust, dun) is the short version." Pairs: muur–moer, buur–boer, vuur–voer, stuur–stoer, rust–roest, dun–doen, mus–moes.

**Chunks** (`nl-03-001` … `026`):

| # | text | en | extra |
|---|---|---|---|
| 1 | Goeiemiddag, u spreekt met … van de afdeling … | Good afternoon, you're speaking to … from the … department. | formal |
| 2 | Ik bel u terug, want ik zit nu in een vergadering. | I'll call you back, because I'm in a meeting now. | formal |
| 3 | Met wie spreek ik, alstublieft? | Who am I speaking to, please? | formal |
| 4 | Kan ik u straks terugbellen? Ik ben nu even bezig. | Can I call you back later? I'm busy right now. | formal |
| 5 | Past het voor u beter in de voormiddag of in de namiddag? | Is the morning or the afternoon better for you? | formal; en note: in Belgium *voormiddag* ≈ 9–12 h, *namiddag* ≈ 12–18 h (in the Netherlands they mean other times); fa hint |
| 6 | Kunnen we een afspraak maken voor volgende week? | Can we make an appointment for next week? | |
| 7 | Donderdag kan ik niet, maar vrijdag past wel. | Thursday I can't, but Friday works. | |
| 8 | Ik moet de afspraak helaas verplaatsen, want er is iets tussengekomen. | Unfortunately I have to move the appointment, because something came up. | fa: *er is iets tussengekomen* = «یک کاری پیش آمده» |
| 9 | Zullen we om tien uur afspreken? | Shall we meet at ten? | |
| 10 | Ik stuur je straks een uitnodiging voor Teams. | I'll send you a Teams invitation later. | |
| 11 | Hoor je me goed? De verbinding is niet zo goed. | Can you hear me well? The connection isn't very good. | |
| 12 | Sorry, je viel even weg. Kan je dat herhalen? | Sorry, you cut out for a moment. Can you repeat that? | |
| 13 | Je micro staat nog uit, we horen je niet. | Your mic is still off, we can't hear you. | informal |
| 14 | Ik deel even mijn scherm, dan kunnen jullie meekijken. | I'll share my screen, then you can all follow along. | |
| 15 | Kan je de link nog eens in de chat zetten? | Can you put the link in the chat again? | |
| 16 | Mag ik een boodschap achterlaten voor mevrouw Janssens? | May I leave a message for Ms Janssens? | formal |
| 17 | Kan zij mij terugbellen als ze weer op kantoor is? | Can she call me back when she's back in the office? | fa: he/she — *zij/ze* = she, *hij* = he |
| 18 | Dat moet ik even in mijn agenda nakijken. | I need to check that in my diary. | |
| 19 | Als het voor jou past, bellen we morgen om negen uur. | If it suits you, we'll call tomorrow at nine. | |
| 20 | Ik heb maar een halfuur, dus laten we beginnen. | I only have half an hour, so let's start. | |
| 21 | Mijn gsm stond op stil, dus ik heb je oproep gemist. | My phone was on silent, so I missed your call. | en note: *gsm* = mobile phone in Belgium (Netherlands: *mobieltje*) |
| 22 | Mag ik u even doorverbinden met mijn collega? | May I put you through to my colleague? | formal |
| 23 | Bedankt voor het telefoontje, tot donderdag! | Thanks for the call, see you Thursday! | |
| 24 | de afspraak | the appointment | article `de` |
| 25 | de uitnodiging | the invitation | article `de` |
| 26 | de verbinding | the connection | article `de` |

**Dialogue A** `nl-03-dA` "Een afspraak maken" (Els Janssens, Amir) — phone call, 12 lines:
1. Els answers: good afternoon, Els Janssens speaking.
2. Amir: good afternoon, this is Amir from logistics; he's calling about the new order.
3. Els: ah yes; she would like to discuss it in person.
4. Amir: can they make an appointment for next week?
5. Els: of course — is the morning or the afternoon better for him?
6. Amir: the morning; Tuesday he can't, but Wednesday works.
7. Els: Wednesday at ten? She needs to check her diary… yes, that works.
8. Amir: fine; shall he send a Teams invitation, or does she prefer to come by?
9. Els: she prefers to come to the office; can he send her the address?
10. Amir: of course, he'll send it by email today.
11. Els: thanks for the call, see you Wednesday.
12. Amir: see you Wednesday, goodbye Ms Janssens.

**Dialogue B** `nl-03-dB` "Problemen met Teams" (Sofie, Amir, Tom), 12 lines:
1. Sofie: good morning everyone, can everyone hear her well?
2. Amir: he hears her well, but her picture keeps freezing.
3. Sofie: Tom, his mic is still off, they can't hear him.
4. Tom: sorry! Can they hear him now? He cut out for a moment.
5. Sofie: yes; she'll share her screen, then they can follow along.
6. Amir: he can't see anything yet — can she put the link in the chat again?
7. Sofie: done; can they see the planning now?
8. Amir: yes; he only has half an hour, because he has an appointment at eleven.
9. Sofie: no problem, they'll be quick.
10. Tom: sorry, she cut out — can she repeat that?
11. Sofie: she said they must finish the planning by Friday.
12. Amir: okay, then he'll call her on Thursday if he has questions.

**Speaking** (all 90 s):
- `nl-03-s1` "Bel een collega om een afspraak te maken voor volgende week: stel twee momenten voor, reageer op het antwoord en bevestig." Frames: "Dag …, met … . Heb je even tijd?" / "Kunnen we volgende week afspreken?" / "Past het voor jou in de voormiddag of in de namiddag?" / "Goed, dan zien we elkaar op … om …"
- `nl-03-s2` "Je moet een afspraak verplaatsen. Verontschuldig je, geef een reden met ‘want’ en stel een nieuw moment voor." Frames: "Het spijt me, maar ik moet onze afspraak verplaatsen." / "…, want …" / "Kan je misschien op … om …?" / "Laat je me iets weten?"
- `nl-03-s3` "Spreek een voicemail in: wie je bent, waarom je belt, wanneer ze je kunnen terugbellen en hoe." Frames: "Goeiedag, u spreekt met …" / "Ik bel over …" / "U kan mij terugbellen tussen … en …" / "Mijn nummer is …"
- `nl-03-s4` "Start een Teams-overleg: check of iedereen je hoort, deel je scherm en leg uit wat jullie vandaag gaan doen." Frames: "Goeiemorgen allemaal, horen jullie me goed?" / "Ik deel even mijn scherm." / "Vandaag moeten we …" / "Eerst …, daarna …"
- `nl-03-s5` (diary) "Vertel wat je deze week moet, kan, wil en mag doen op het werk of aan de universiteit. Gebruik elk werkwoord minstens één keer. (This recording is saved in your speaking diary.)" Frames: "Deze week moet ik …" / "Ik kan …, maar …" / "Ik wil graag …" / "Op het werk mag ik …"

**Grammar** `id` "modals", title "Modal verbs: kunnen, moeten, willen, mogen". Explain: the modal is the verb in place 2 (or first in a yes/no question); the other verb goes to the very end as an infinitive. Farsi contrast: Farsi «باید بروم» keeps the verbs together; Dutch splits them: *Ik moet morgen naar Brussel gaan.* Prompt format "(subject / middle part / modal / infinitive)". Items:
1. (ik / morgen niet naar het overleg / kunnen / komen) → Ik kan morgen niet naar het overleg komen.
2. (jij / de klant voor drie uur / moeten / terugbellen) → Jij moet de klant voor drie uur terugbellen.
3. (wij / de afspraak naar donderdag / willen / verplaatsen) → Wij willen de afspraak naar donderdag verplaatsen.
4. Vraag: (ik / u straks / mogen / terugbellen) → Mag ik u straks terugbellen?
5. Vraag: (jij / je scherm even / kunnen / delen) → Kan jij je scherm even delen?
6. (zij / vandaag thuis / moeten / werken) → Zij moet vandaag thuis werken.
7. Vraag: (wij / het overleg online / mogen / doen) → Mogen wij het overleg online doen?
8. (ik / eerst in mijn agenda / moeten / kijken) → Ik moet eerst in mijn agenda kijken.
9. Na de middag … (ik / de klant / kunnen / bellen) → Na de middag kan ik de klant bellen.
10. Volgende week … (wij / een nieuwe planning / moeten / maken) → Volgende week moeten wij een nieuwe planning maken.
11. Vraag: (u / een boodschap / willen / achterlaten) → Wilt u een boodschap achterlaten?
12. (je / hier niet / mogen / parkeren) → Je mag hier niet parkeren.
13. Morgen … (Tom / de vergadering / willen / leiden) → Morgen wil Tom de vergadering leiden.
14. Vraag: (wij / om tien uur / kunnen / afspreken) → Kunnen wij om tien uur afspreken?
15. Daarom … (ik / de afspraak / moeten / verplaatsen) → Daarom moet ik de afspraak verplaatsen.

**Limburg** (7 pairs):
1. Kan je me horen? ↔ Kunt ge mij horen? (gij-system — VL)
2. Wacht even, ik zoek dat op. ↔ Waggeffe, ik zoek da op. (*waggeffe* — GT; *da* — VL)
3. Heb je mijn mail gekregen? ↔ 'Ebde mijn mail gekregen? (gij-system, silent h — VL)
4. Straks belt hij je terug. ↔ Straks belt hem u terug. (*hem* as subject after the verb; *u* for "you" — VL)
5. Hou je goed! ↔ Haddich! (Limburg dialect, mostly older speakers — GT)
6. Hoe gaat het? ↔ Wa make? (citétaal from Genk — GT)
7. Hij hangt altijd aan de telefoon. ↔ Hij hangt altij aan de telefoon. (dropped final d — VL)

**Role-play**: Els Janssens, a contact at a supplier; the learner phones to make an appointment; she offers times with *voormiddag/namiddag*; halfway through she has to move the appointment and the learner proposes a new time; she ends by asking him to confirm day and hour. Level sentence and feedback from Authoring rule 6. First line: "Goeiemiddag, met Els Janssens."
**Mission**: "Make one real phone or Teams call in Dutch (an appointment, a question at work, the doctor's assistant), or leave one voicemail in Dutch."

- [ ] **Step 3: Write `content/en/week-03.json`**

`theme`/`themeEn` "Seminar: agreeing, disagreeing, building on others".
**Sound** `id` "en-w-v", `title` "west or vest? (/w/ – /v/)". Anchor: Farsi «و» is the English v (top teeth on the lip). For w, no teeth: round the lips as for «او» and open quickly. Pairs: west–vest, wine–vine, wet–vet, wiper–viper, worse–verse, wail–veil, while–vile.
**Chunks** (`en-03-001` … `016`):
1. I'd like to build on what … said.
2. That's a good point, but I see it a bit differently.
3. I partly agree, but I'm not sure that …
4. I see where you're coming from; however, …
5. To add to that, …
6. Could I come in here for a second?
7. Going back to what … mentioned earlier, …
8. I'm not entirely convinced, because … (stress `con-VINCED`)
9. That's exactly what I was thinking.
10. Can I just finish my point?
11. What do the rest of you think?
12. Let me play devil's advocate for a moment. (stress `AD-vo-cate`)
13. On the other hand, …
14. I think we're basically saying the same thing.
15. That's an interesting way of looking at it.
16. Correct me if I'm wrong, but …

**Speaking** (all 90 s):
- `en-03-s1` "Agree with this statement and add one reason and one example: ‘Group work prepares students for real jobs.’" Frames: "I completely agree, because …" / "To add to that, …" / "For example, …"
- `en-03-s2` "Disagree politely with this statement and give two reasons: ‘Online lectures are just as good as classes on campus.’" Frames: "I see where you're coming from; however, …" / "I'm not entirely convinced, because …" / "On the other hand, …"
- `en-03-s3` "A classmate said: ‘Data is more important than experience in modern companies.’ Build on her point and connect it to your field. Use she/her for her every time." Frames: "I'd like to build on what she said." / "Going back to her point about …" / "In my field, …"
- `en-03-s4` "In a seminar discussion, ask to come in, make your point, finish it when someone interrupts, and invite the others to speak." Frames: "Could I come in here for a second?" / "Can I just finish my point?" / "What do the rest of you think?"
- `en-03-s5` (diary) "Explain one idea from your own course this week in about 90 seconds, and say one point in the readings you partly disagree with, and why. (This recording is saved in your speaking diary.)" Frames: "This week we studied …" / "The main idea is …" / "I partly agree, but …" / "That's why I think …"

**Role-play**: a seminar with two other students, Sara and Tom (the assistant plays both and names who speaks); topic "Should universities replace exams with projects?"; one agrees, one disagrees; they sometimes interrupt; the learner must build on, disagree politely and finish his point. Feedback: he/she for Sara and Tom, a/the, and one phrase for next time.
**Mission**: "In one class or group meeting, use one phrase to build on someone's point or to disagree politely."

- [ ] **Step 4: Sources**

Append rows to `content/SOURCES.md`: `Kunt ge mij horen?`, `'Ebde mijn mail gekregen?`, `Straks belt hem u terug.`, `Hij hangt altij aan de telefoon.` (VL); `Waggeffe, ik zoek da op.` (GT + VL); `Haddich!`, `Wa make?` (GT).

- [ ] **Step 5: Run all checks**

Run: `npm test && npm run validate && npm run smoke`
Expected: all pass; smoke opens weeks 1–3 and shows "coming soon" for week 4.

- [ ] **Step 6: Read-through** (Authoring rule 7), then commit

```bash
git add content/nl/week-03.json content/en/week-03.json content/SOURCES.md sw.js
git commit -m "feat: add week 3 (phone, Teams and appointments; seminar discussion)"
```

- [ ] **Step 7: Publish and verify**

Run: `git push origin HEAD:main`, then poll until
`curl -s https://momi1370.github.io/Language-Learning/content/nl/week-03.json | grep -c '"week": 3'` prints `1`.

---

### Task 5: Week 4 — lunch, weather, opinions and Limburg words (Dutch) + opinions with reasons (English) — publish and close the milestone

**Files:**
- Create: `content/nl/week-04.json`, `content/en/week-04.json`
- Modify: `sw.js` (`SHELL`), `content/SOURCES.md`, `docs/superpowers/specs/2026-10-05-taalmaatje-course-design.md`

**Interfaces:**
- Consumes: `checkLevel`, `findRepeats`, smoke from Task 2.

- [ ] **Step 1: Register the files first (red)**

Add `'content/nl/week-04.json',` and `'content/en/week-04.json',` to `SHELL` in `sw.js`.
Run: `node --test test/sw.test.mjs` — Expected: FAIL ("every file in the offline list exists").

- [ ] **Step 2: Write `content/nl/week-04.json`**

`theme` "Lunchpauze: het weer, je mening en Limburgse woorden", `themeEn` "Lunch talk: weather, opinions and Limburg words".

**Sound** `id` "nl-eu-oo", `title` "eu or oo? (deur – door)". Anchor: "oo is a long «او» that starts a little open. eu has no Farsi sound: say «اِ» (as in «دِل») and round your lips." Pairs: deur–door, reuk–rook, heup–hoop, leuk–look, deuk–dook, keus–koos, reus–roos.

**Chunks** (`nl-04-001` … `026`):

| # | text | en | extra |
|---|---|---|---|
| 1 | Zullen we samen gaan lunchen? Ik heb honger. | Shall we have lunch together? I'm hungry. | |
| 2 | Ik neem een broodje kaas, want ik heb niet veel tijd. | I'll have a cheese roll, because I don't have much time. | |
| 3 | Eten we binnen of buiten? Het is mooi weer. | Shall we eat inside or outside? The weather's nice. | |
| 4 | Het is lekker, maar het is een beetje duur. | It's tasty, but it's a bit expensive. | |
| 5 | Ik eet vandaag niet veel, omdat ik straks nog ga sporten. | I'm not eating much today, because I'm going to do sport later. | fa: after *omdat* the verb goes to the end, like Farsi |
| 6 | Volgens mij gaat het vanmiddag regenen. | I think it's going to rain this afternoon. | |
| 7 | Het is veel te warm voor de tijd van het jaar. | It's far too warm for the time of year. | |
| 8 | Ik hou niet van dit weer, omdat het zo grijs is. | I don't like this weather, because it's so grey. | |
| 9 | Wat vind jij daarvan? Ik ben benieuwd. | What do you think of that? I'm curious. | |
| 10 | Ik ben het helemaal met je eens. | I completely agree with you. | fa: *het eens zijn met* = «موافق بودن با» |
| 11 | Daar ben ik het niet mee eens, want … | I don't agree with that, because … | |
| 12 | Ik vind dat een goed idee, omdat het tijd bespaart. | I think that's a good idea, because it saves time. | |
| 13 | Dat hangt ervan af hoeveel tijd we hebben. | That depends on how much time we have. | |
| 14 | Heb je al plannen voor het weekend? | Do you have plans for the weekend yet? | |
| 15 | Als het niet regent, ga ik naar de markt. | If it doesn't rain, I'll go to the market. | |
| 16 | In mijn land eten we ’s middags warm, maar hier eten veel mensen boterhammen. | In my country we eat a hot meal at lunchtime, but here many people eat sandwiches. | en note: in Belgium *’s middags* = around noon (in the Netherlands: the afternoon) |
| 17 | Smakelijk! Wil je een stukje proeven? | Enjoy! Do you want to taste a bit? | |
| 18 | Hoe zeg je dat in het Limburgs? | How do you say that in Limburgish? | |
| 19 | Ik versta het Limburgs nog niet goed, maar ik leer het wel. | I don't understand Limburgish well yet, but I'm learning it. | |
| 20 | Wat betekent dat woord? Dat heb ik nog nooit gehoord. | What does that word mean? I've never heard it. | |
| 21 | Ik heb geen tijd voor een lange pauze, dus ik eet aan mijn bureau. | I don't have time for a long break, so I'm eating at my desk. | |
| 22 | Ik heb zin in een koffiekoek. Jij ook? | I feel like a pastry. You too? | en note: *koffiekoek* (Belgium) = Netherlands *koffiebroodje* |
| 23 | Het was gezellig! Tot straks. | That was nice! See you later. | fa: *gezellig* = «صمیمی و خوش» |
| 24 | de boterham | the slice of bread / sandwich | article `de` |
| 25 | het weer | the weather | article `het` |
| 26 | de mening | the opinion | article `de` |

**Dialogue A** `nl-04-dA` "Lunchpauze" (Lien, Tom, Amir), 12 lines:
1. Lien: shall we have lunch together? She's hungry.
2. Amir: good idea — inside or outside? The weather is finally nice.
3. Tom: outside! It's far too warm for the time of year, but he's not complaining.
4. Lien: what is Amir eating? It smells good.
5. Amir: rice with chicken from home; in his country people eat hot at lunchtime, but here many people eat sandwiches.
6. Tom: true; he eats sandwiches every day, because it's quick.
7. Lien: she finds that boring; she prefers soup, especially when it's cold.
8. Amir: does Tom want to taste a bit? Enjoy!
9. Tom: "Amai, that's tasty!"
10. Amir: "Amai"? He has never heard that word — what does it mean?
11. Lien: it means "wow"; you hear it everywhere here.
12. Amir: then he'll say it too: amai, it's nice here!

**Dialogue B** `nl-04-dB` "Plannen voor het weekend" (Tom, Amir), 10 lines:
1. Tom: does Amir have plans for the weekend yet?
2. Amir: if it doesn't rain, he'll go to the market, because he wants to buy fresh fruit.
3. Tom: good idea, but he thinks it will rain on Saturday.
4. Amir: again? He doesn't like this weather, because it's so grey.
5. Tom: you get used to it; he's going to Bokrijk with his children, because they love it.
6. Amir: what is Bokrijk?
7. Tom: a big park with an open-air museum near Genk; Amir should go there some time.
8. Amir: that depends on how much time he has; he still has to study.
9. Tom: study the whole weekend? He doesn't agree — Amir needs rest too.
10. Amir: Tom is right; maybe he'll go on Sunday, if the weather is good.

**Speaking** (all 90 s):
- `nl-04-s1` "Aan de lunch: vertel wat je eet en waarom (omdat/want), en vraag je collega's wat zij eten." Frames: "Ik eet vandaag …, want …" / "Ik neem meestal …, omdat …" / "En jij, wat eet jij?" / "Smakelijk!"
- `nl-04-s2` "Vergelijk het weer in België met het weer in jouw land. Geef twee redenen waarom je het ene of het andere liever hebt." Frames: "In België is het vaak …, maar in mijn land …" / "Ik hou meer van …, omdat …" / "Ik vind … ook beter, want …"
- `nl-04-s3` "Is lunchen aan je bureau een goed idee? Geef je mening met minstens één keer ‘omdat’ en één keer ‘want’." Frames: "Volgens mij …" / "Ik vind het (geen) goed idee, omdat …" / "Aan de andere kant …, want …" / "Het hangt ervan af …"
- `nl-04-s4` "Vertel over een woord of zin die je op het werk hoorde en niet begreep: wat dacht je eerst, wat betekent het echt, en vind je het een mooi woord?" Frames: "Op het werk hoorde ik …" / "Eerst dacht ik dat …" / "Maar het betekent eigenlijk …" / "Ik vind het een mooi woord, omdat …"
- `nl-04-s5` (diary) "Wat vind je tot nu toe van Hasselt en van je werk? Gebruik minstens twee keer ‘omdat’ en twee keer ‘want’. (This recording is saved in your speaking diary.)" Frames: "Ik woon nu … in Hasselt." / "Ik vind Hasselt …, omdat …" / "Op het werk …, want …" / "Wat ik nog moeilijk vind, is …"

**Grammar** `id` "omdat-want", title "omdat or want? (where the verb goes)". Explain: both mean "because"; after *want* the order stays normal (verb in place 2); after *omdat* the verb goes to the end. Farsi contrast: the *omdat*-part has Farsi order (verb last) — a strength. Prompt format "Sentence. + reason. (omdat|want)". Items:
1. Ik blijf vandaag binnen. + Het regent heel hard. (omdat) → Ik blijf vandaag binnen, omdat het heel hard regent.
2. Ik blijf vandaag binnen. + Het regent heel hard. (want) → Ik blijf vandaag binnen, want het regent heel hard.
3. Ik neem een soep. + Ik heb het koud. (omdat) → Ik neem een soep, omdat ik het koud heb.
4. Ik eet aan mijn bureau. + Ik heb een deadline. (want) → Ik eet aan mijn bureau, want ik heb een deadline.
5. Ik vind Hasselt fijn. + De mensen zijn vriendelijk. (omdat) → Ik vind Hasselt fijn, omdat de mensen vriendelijk zijn.
6. We eten buiten. + Het is eindelijk mooi weer. (want) → We eten buiten, want het is eindelijk mooi weer.
7. Ik draag een dikke jas. + Het vriest vannacht. (omdat) → Ik draag een dikke jas, omdat het vannacht vriest.
8. Tom is moe. + Hij heeft slecht geslapen. (want) → Tom is moe, want hij heeft slecht geslapen.
9. Ik kom later. + De trein heeft vertraging. (omdat) → Ik kom later, omdat de trein vertraging heeft.
10. Ik ben het niet eens met Tom. + Ik vind thuiswerken beter. (want) → Ik ben het niet eens met Tom, want ik vind thuiswerken beter.
11. Amir leert Limburgse woorden. + Zijn collega's spreken dialect. (omdat) → Amir leert Limburgse woorden, omdat zijn collega's dialect spreken.
12. Ik neem de fiets. + Het is niet ver. (want) → Ik neem de fiets, want het is niet ver.
13. Ik vind dat een goed idee. + Het bespaart tijd. (omdat) → Ik vind dat een goed idee, omdat het tijd bespaart.
14. Ik ga vroeg naar huis. + Ik moet nog studeren. (want) → Ik ga vroeg naar huis, want ik moet nog studeren.
15. Ik drink geen koffie meer. + Ik slaap anders slecht. (omdat) → Ik drink geen koffie meer, omdat ik anders slecht slaap.

**Limburg** (8 pairs):
1. Het is heel koud vandaag. ↔ 't Is vies koud vandaag. (*vies* = very — GT)
2. Ik heb zin in een koffiekoek. ↔ Ik 'eb goesting in ne koffiekoek. (silent h, *ne* — VL; *goesting* — Canon; *koffiekoek* — BN)
3. Hij is heel vriendelijk. ↔ Hij is hennig. (*hennig* = friendly, cheerful — GT)
4. Ik was het hele weekend aan het klussen. ↔ Ik was gans 't weekend aan 't klommelen. (*gans*, *klommelen* — GT)
5. Ik heb daarnet met hem gebeld. ↔ Ik 'eb toen effe met hem gebeld. (*toen effe* — GT; silent h — VL)
6. Wat is er? ↔ Wat is't, mijne man? (GT)
7. Hij spreekt dialect. ↔ Hij kalt plat. (*plat kallen* — GT)
8. Een boterham met confituur, alstublieft. ↔ Ne boterham mè confituur, alstublieft. (*ne*, *mè* — VL; *confituur* — BN)

**Role-play**: lunch with two Limburg colleagues, Lien and Tom (the assistant plays both and names who speaks); they talk about the weather, food and the weekend; they may use only these Limburg words: *amai, goesting, sjiek, vies* (= very), *allee* — and explain one if asked; they ask the learner's opinion and then "Waarom?" so he answers with *omdat*/*want*. Level sentence and feedback from Authoring rule 6, plus: check the verb position after *omdat*. First line: "Amai, wat een weer! Eten we buiten?"
**Mission**: "At lunch, give your opinion about something (the food, the weather, a plan) with ‘omdat’, and ask a colleague for one Limburg word they use a lot."

- [ ] **Step 3: Write `content/en/week-04.json`**

`theme`/`themeEn` "Opinion and reasons (topic sentence, support)".
**Sound** `id` "en-ae-e", `title` "bad or bed? (/æ/ – /e/)". Anchor: /e/ (bed) is Farsi «اِ»; /æ/ (bad) is more open — drop your jaw, between «اِ» and «آ». Pairs: bad–bed, man–men, pan–pen, sat–set, had–head, bag–beg, land–lend.
**Chunks** (`en-04-001` … `016`):
1. In my opinion, …
2. The main reason is that …
3. For example, …
4. Another reason why I think so is that …
5. This is supported by …
6. I'd argue that …
7. It's true that …, but …
8. As a result, …
9. That's why I believe …
10. From my point of view, …
11. One clear example of this is …
12. Overall, I think …
13. There are two main reasons for this.
14. I used to think …, but now I believe …
15. To sum up, …
16. I can see both sides, but on balance …

**Speaking** (all 90 s):
- `en-04-s1` "Should attendance at lectures be compulsory? Give your opinion with a topic sentence, two reasons and one example." Frames: "In my opinion, …" / "The main reason is that …" / "Another reason why I think so is that …" / "For example, …"
- `en-04-s2` "Give your opinion on open-book exams, then answer the opposite view." Frames: "I'd argue that …" / "It's true that …, but …" / "That's why I believe …"
- `en-04-s3` "Talk about something in your field that you changed your mind about." Frames: "I used to think …, but now I believe …" / "What changed my mind was …" / "As a result, …"
- `en-04-s4` "Should AI tools be allowed in university assignments? Give a 90-second opinion and end with a short summary." Frames: "From my point of view, …" / "There are two main reasons for this." / "On balance, …" / "To sum up, …"
- `en-04-s5` (diary) "Explain one idea from your own course this week in about 90 seconds, and give your opinion of it with two reasons. (This recording is saved in your speaking diary.)" Frames: "This week we studied …" / "The main idea is …" / "In my opinion, …, because …" / "Overall, I think …"

**Role-play**: a classmate in a friendly debate takes the opposite view on "Should AI tools be allowed in assignments?"; asks "Why?" and "Do you have an example?" after each claim. Feedback: articles a/the, he/she, and whether each opinion had a reason and an example.
**Mission**: "In class or in a group meeting, give your opinion with ‘In my opinion …, because …’ and one example."

- [ ] **Step 4: Sources**

Append rows to `content/SOURCES.md`: `'t Is vies koud vandaag.`, `Hij is hennig.`, `Ik was gans 't weekend aan 't klommelen.`, `Wat is't, mijne man?`, `Hij kalt plat.` (GT); `Ik 'eb toen effe met hem gebeld.` (GT + VL); `Ik 'eb goesting in ne koffiekoek.` (VL + Canon + BN); `Ne boterham mè confituur, alstublieft.` (VL + BN).

- [ ] **Step 5: Run all checks**

Run: `npm test && npm run validate && npm run smoke`
Expected: all pass; smoke opens weeks 1–4 and shows "coming soon" for week 5.

- [ ] **Step 6: Close the milestone in the spec**

In §10 add a row dated with today's date (`date +%F`): `| <today> | Milestone 2 published: week 1 Dutch at A2+, weeks 2–4. Next: learner feedback on weeks 1–4, then milestone 3 (weeks 5–12) |`.

- [ ] **Step 7: Read-through** (Authoring rule 7), then commit

```bash
git add content/nl/week-04.json content/en/week-04.json content/SOURCES.md sw.js docs/superpowers/specs/2026-10-05-taalmaatje-course-design.md
git commit -m "feat: add week 4 (lunch, weather, opinions, Limburg words; opinions with reasons)"
```

- [ ] **Step 8: Publish and verify**

Run: `git push origin HEAD:main`, then poll until
`curl -s https://momi1370.github.io/Language-Learning/content/nl/week-04.json | grep -c '"week": 4'` prints `1`.
