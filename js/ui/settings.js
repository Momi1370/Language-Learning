import { clear, mount, h, button } from './dom.js';
import { voicesFor, speak } from '../speech.js';
import { buildExport, parseImport, defaultState, PER_DAY } from '../store.js';
import { localDate } from '../session.js';
import { audioCheck } from './audiocheck.js';
import { voicesOf } from '../clips.js';

export function render(ctx, root) {
  const s = ctx.state.settings;
  const set = (patch) => {
    ctx.update((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
    ctx.pickVoices();
  };
  mount(root,
    h('h1', {}, 'Settings'),
    h('label', { class: 'row' },
      h('input', { type: 'checkbox', checked: s.farsi, onChange: (e) => set({ farsi: e.target.checked }) }),
      'Show Farsi hints ', h('span', { dir: 'rtl', lang: 'fa' }, '(راهنمای فارسی)')),
    clipVoiceRow(ctx, 'nl', 'Dutch recorded voice', s, set),
    clipVoiceRow(ctx, 'en', 'English recorded voice', s, set),
    h('p', { class: 'hint' }, 'The recorded voices are used wherever there is a recording. The phone voices below are used for anything else.'),
    voiceRow(ctx, 'nl', 'Dutch phone voice', s.voiceNl, 'Hallo, dit is mijn stem.', (v) => set({ voiceNl: v })),
    voiceRow(ctx, 'en', 'English phone voice', s.voiceEn, 'Hello, this is my voice.', (v) => set({ voiceEn: v })),
    h('label', { class: 'row' }, 'Extra Dutch words per session',
      h('select', { onChange: (e) => set({ extraWords: Number(e.target.value) }) },
        [0, 3, 5, 10].map((n) => h('option', { value: n, selected: n === s.extraWords }, String(n))))),
    h('p', { class: 'hint' }, 'Extra words come from a list of 1,946 common Dutch words (from the open-source app “woorden”). 0 = only the course chunks.'),
    h('label', { class: 'row' }, 'New English words per day',
      h('select', { onChange: (e) => set({ vocabPerDay: Number(e.target.value) }) },
        PER_DAY.map((n) => h('option', { value: n, selected: n === s.vocabPerDay }, String(n))))),
    h('p', { class: 'hint' }, 'The Words tab gives you this many new English words each day.'),
    audioCheck(ctx),
    h('h2', {}, 'Backup'),
    h('p', { class: 'hint' }, 'Your progress and recordings stay on this device; nothing is sent to a server. Use a backup to move to another device.'),
    backup(ctx),
    h('h2', {}, 'Start over'),
    button('Reset all progress', async () => {
      if (!confirm('Delete all progress and recordings?') || !confirm('Are you sure? This cannot be undone.')) return;
      ctx.update(() => defaultState());
      await ctx.diary.clear();
      ctx.pickVoices();
      await ctx.reload();
    }));
}

function clipVoiceRow(ctx, lang, label, s, set) {
  const ids = voicesOf(lang);
  if (!ids.length) return null;
  const name = (id) => id.charAt(0).toUpperCase() + id.slice(1);
  return h('label', { class: 'row' }, label,
    h('select', { onChange: (e) => set({ clipVoice: { ...ctx.state.settings.clipVoice, [lang]: e.target.value } }) },
      h('option', { value: 'mixed', selected: s.clipVoice[lang] === 'mixed' }, `Mixed (${ids.map(name).join(' and ')})`),
      ids.map((id) => h('option', { value: id, selected: s.clipVoice[lang] === id }, name(id)))));
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
