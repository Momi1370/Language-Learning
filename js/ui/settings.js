import { clear, mount, h, button } from './dom.js';
import { voicesFor, speak } from '../speech.js';
import { buildExport, parseImport, defaultState, PER_DAY } from '../store.js';
import { localDate } from '../session.js';
import { audioCheck } from './audiocheck.js';
import { voicesOf } from '../clips.js';

// A label on the left and its control on the right, one line each; cards group the lines.
const line = (label, control) => h('label', { class: 'set-row' }, h('span', { class: 'set-label' }, label), control);
const card = (...rows) => h('div', { class: 'set-card' }, rows);
const group = (title, ...children) => [h('h2', { class: 'group-title' }, title), children];
const choose = (options, current, onPick) =>
  h('select', { onChange: (e) => onPick(e.target.value) }, options.map(([value, text]) => h('option', { value, selected: String(value) === String(current) }, text)));

export function render(ctx, root) {
  const s = ctx.state.settings;
  const set = (patch) => {
    ctx.update((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
    ctx.pickVoices();
  };
  const perDay = PER_DAY.map((n) => [n, String(n)]);
  mount(root,
    h('h1', {}, 'Settings'),
    card(line(['Show Farsi hints ', h('span', { dir: 'rtl', lang: 'fa' }, '(راهنمای فارسی)')],
      h('input', { type: 'checkbox', class: 'switch', checked: s.farsi, onChange: (e) => set({ farsi: e.target.checked }) }))),
    group('Daily words',
      card(
        line('New English words per day', choose(perDay, s.vocabPerDay, (v) => set({ vocabPerDay: Number(v) }))),
        line('New Dutch words per day', choose(perDay, s.vocabPerDayNl, (v) => set({ vocabPerDayNl: Number(v) }))),
        line('Extra Dutch words per session', choose([0, 3, 5, 10].map((n) => [n, String(n)]), s.extraWords, (v) => set({ extraWords: Number(v) })))),
      h('p', { class: 'hint' }, 'The Words tab gives you this many new words each day. Extra words come from a list of 1,946 common Dutch words (from the open-source app “woorden”); 0 = only the course chunks.')),
    group('Voices',
      card(clipVoiceRow(ctx, 'nl', 'Dutch voice', s, set), clipVoiceRow(ctx, 'en', 'English voice', s, set)),
      h('p', { class: 'hint' }, 'Mixed uses both recorded voices (Dutch: Nathalie and Ronnie; English: Heart and Emma). Recordings are used wherever there is one; the phone voices under Advanced speak anything else.')),
    group('Backup',
      h('p', { class: 'hint' }, 'Your progress and recordings stay on this device; nothing is sent to a server. Use a backup to move to another device.'),
      backup(ctx)),
    h('details', { class: 'set-card advanced' },
      h('summary', {}, 'Advanced'),
      h('p', { class: 'hint' }, 'Phone voices, the sound check and starting over.'),
      voiceRow(ctx, 'nl', 'Dutch phone voice', s.voiceNl, 'Hallo, dit is mijn stem.', (v) => set({ voiceNl: v })),
      voiceRow(ctx, 'en', 'English phone voice', s.voiceEn, 'Hello, this is my voice.', (v) => set({ voiceEn: v })),
      audioCheck(ctx),
      h('h3', {}, 'Start over'),
      button('Reset all progress', async () => {
        if (!confirm('Delete all progress and recordings?') || !confirm('Are you sure? This cannot be undone.')) return;
        ctx.update(() => defaultState());
        await ctx.diary.clear();
        ctx.pickVoices();
        await ctx.reload();
      })));
}

function clipVoiceRow(ctx, lang, label, s, set) {
  const ids = voicesOf(lang);
  if (!ids.length) return null;
  const name = (id) => id.charAt(0).toUpperCase() + id.slice(1);
  return line(label, choose([['mixed', 'Mixed'], ...ids.map((id) => [id, name(id)])], s.clipVoice[lang],
    (v) => set({ clipVoice: { ...ctx.state.settings.clipVoice, [lang]: v } })));
}

function voiceRow(ctx, lang, label, current, sample, onPick) {
  const voices = voicesFor(ctx.allVoices, lang);
  return h('label', { class: 'row' }, label,
    h('select', { onChange: (e) => onPick(e.target.value) },
      h('option', { value: '' }, 'Automatic (best available)'),
      voices.map((v) => h('option', { value: v.name, selected: v.name === current }, `${v.name} (${v.lang})`))),
    button('🔊 Test', () => speak(sample, { voice: ctx.voices[lang], lang: lang === 'nl' ? 'nl-BE' : 'en-GB' }), { class: 'chip' }),
    voices.length ? null : h('span', { class: 'hint' }, 'No voice installed for this language.'));
}

function backup(ctx) {
  const msg = h('p', { class: 'hint' });
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onChange: async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = parseImport(await f.text());
      if (!confirm('Replace your current progress with this backup?')) return;
      ctx.update(() => data.state);
      await ctx.diary.clear();
      for (const entry of data.diary) await ctx.diary.put(entry);
      ctx.pickVoices();
      await ctx.reload();
    } catch (err) {
      msg.textContent = err.message;
    }
  } });
  return h('div', {},
    button('⬇ Download backup', async () => {
      const text = await buildExport(ctx.state, await ctx.diary.all());
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = h('a', { href: url, download: `taalmaatje-backup-${localDate(new Date())}.json` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      msg.textContent = 'Backup downloaded ✓';
    }, { class: 'primary' }),
    button('⬆ Restore from backup', () => file.click()),
    file, msg);
}
