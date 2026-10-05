const NUMBERS = {
  nl: ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf'],
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'],
};

export function words(text) {
  return String(text ?? '').split(/\s+/).filter(Boolean);
}

export function normaliseWord(word, lang) {
  const w = word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}']/gu, '')
    .replace(/^'+|'+$/g, '');
  if (/^\d+$/.test(w)) return NUMBERS[lang]?.[Number(w)] ?? w;
  return w;
}

function lcsFlags(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const flags = new Array(a.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { flags[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return flags;
}

export function compareWords(target, heard, lang) {
  const tokens = words(target).map((text) => ({ text, norm: normaliseWord(text, lang), ok: null }));
  const checked = tokens.filter((t) => t.norm);
  const said = words(heard).map((w) => normaliseWord(w, lang)).filter(Boolean);
  const flags = lcsFlags(checked.map((t) => t.norm), said);
  checked.forEach((t, i) => { t.ok = flags[i]; });
  const score = checked.length ? checked.filter((t) => t.ok).length / checked.length : 0;
  return { words: tokens.map(({ text, ok }) => ({ text, ok })), score };
}

export function bestMatch(target, alternatives, lang) {
  let best = compareWords(target, '', lang);
  for (const alt of alternatives) {
    const r = compareWords(target, alt, lang);
    if (r.score > best.score) best = r;
  }
  return best;
}
