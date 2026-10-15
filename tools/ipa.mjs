// ARPAbet (CMU Pronouncing Dictionary) → IPA for American English, with stress marks.
// IPA is generated, never typed by hand (spec §5).
const VOWELS = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ', EH: 'ɛ', ER: 'ɝ', EY: 'eɪ', IH: 'ɪ', IY: 'i',
  OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'u',
};
const CONSONANTS = {
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ',
  P: 'p', R: 'ɹ', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};
// Consonant clusters that can start an English syllable: the stress mark goes before the longest one.
const ONSET2 = new Set('pl pɹ pj bl bɹ bj tɹ tw tj dɹ dw dj kl kɹ kw kj ɡl ɡɹ ɡw fl fɹ fj vɹ vj θɹ θw ʃɹ sl sw sj sp st sk sm sn hj mj nj lj'.split(' '));
const ONSET3 = new Set('spl spɹ spj stɹ stj skl skɹ skw skj'.split(' '));
const isOnset = (units) => (units.length <= 1 ? units[0] !== 'ŋ' : units.length === 2 ? ONSET2.has(units.join('')) : units.length === 3 && ONSET3.has(units.join('')));

// Words that are not stressed when they come second in a phrase ("deal with").
const WEAK = new Set(['with', 'to', 'of', 'for', 'at', 'in', 'on', 'from', 'a', 'the', 'it', 'as', 'and']);

export function arpaToIpa(phones) {
  const units = phones.map((p) => {
    const m = /^([A-Z]+)([012])?$/.exec(p);
    if (!m) throw new Error(`bad phone "${p}"`);
    const [, base, stress] = m;
    if (base in VOWELS) {
      let ipa = VOWELS[base];
      if (base === 'AH' && stress === '0') ipa = 'ə';
      if (base === 'ER' && stress === '0') ipa = 'ɚ';
      return { vowel: true, ipa, stress: stress ?? '' };
    }
    if (base in CONSONANTS) return { vowel: false, ipa: CONSONANTS[base] };
    throw new Error(`unknown phone "${p}"`);
  });
  const marks = new Map(); // unit index → mark written before it
  let clusterStart = 0;
  let seenVowel = false;
  units.forEach((u, i) => {
    if (!u.vowel) return;
    if (u.stress === '1' || u.stress === '2') {
      const cluster = units.slice(clusterStart, i).map((c) => c.ipa);
      let take = seenVowel ? Math.min(3, cluster.length) : cluster.length;
      while (take > 0 && !isOnset(cluster.slice(cluster.length - take))) take--;
      marks.set(i - take, u.stress === '1' ? 'ˈ' : 'ˌ');
    }
    seenVowel = true;
    clusterStart = i + 1;
  });
  return units.map((u, i) => (marks.get(i) ?? '') + u.ipa).join('');
}

export function parseCmudict(text) {
  const dict = new Map();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith(';;;')) continue;
    const [head, ...phones] = line.trim().split(/\s+/);
    if (!phones.length) continue;
    const word = head.replace(/\(\d+\)$/, '');
    if (!dict.has(word)) dict.set(word, phones);
  }
  return dict;
}

export function ipaFor(phrase, dict) {
  return phrase.toLowerCase().split(/\s+/).map((w, i) => {
    const phones = dict.get(w);
    if (!phones) throw new Error(`not in the pronunciation dictionary: "${w}"`);
    const ipa = arpaToIpa(phones);
    return i > 0 && WEAK.has(w) ? ipa.replace(/[ˈˌ]/gu, '') : ipa;
  }).join(' ');
}

const NUCLEUS = 'eɪ|aɪ|ɔɪ|aʊ|oʊ|[iɪɛæɑɔʊuʌəɚɝ]';

export function ipaSyllableCount(ipa) {
  return [...ipa.matchAll(new RegExp(NUCLEUS, 'gu'))].length;
}

// Index (0-based, counted over the whole phrase) of every syllable that follows a primary-stress mark.
export function ipaStressedSyllables(ipa) {
  const out = [];
  let seen = 0;
  for (const m of ipa.matchAll(new RegExp(`ˈ|${NUCLEUS}`, 'gu'))) {
    if (m[0] === 'ˈ') out.push(seen);
    else seen++;
  }
  return out;
}
