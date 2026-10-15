import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arpaToIpa, parseCmudict, ipaFor, ipaSyllableCount, ipaStressedSyllables } from '../tools/ipa.mjs';
import { fillIpa } from '../tools/vocab-ipa.mjs';

const P = (s) => s.split(' ');

test('a stressed first syllable gets the mark at the very start', () => {
  assert.equal(arpaToIpa(P('F IH1 G Y ER0')), 'ˈfɪɡjɚ');
  assert.equal(arpaToIpa(P('AA1 N AH0 S T L IY0')), 'ˈɑnəstli');
  assert.equal(arpaToIpa(P('S T AH1 F')), 'ˈstʌf');
});

test('the mark goes before the whole onset of the stressed syllable', () => {
  assert.equal(arpaToIpa(P('AH0 F AO1 R D')), 'əˈfɔɹd');
  assert.equal(arpaToIpa(P('R IH0 L AY1 AH0 B AH0 L')), 'ɹɪˈlaɪəbəl');
  assert.equal(arpaToIpa(P('IH0 K S P EH1 N S IH0 V')), 'ɪkˈspɛnsɪv');
  assert.equal(arpaToIpa(P('IH0 M P AO1 R T AH0 N T')), 'ɪmˈpɔɹtənt');
  assert.equal(arpaToIpa(P('S T R AH1 G AH0 L')), 'ˈstɹʌɡəl');
});

test('secondary stress gets its own mark', () => {
  assert.equal(arpaToIpa(P('AH2 N D ER0 S T AE1 N D')), 'ˌʌndɚˈstænd');
});

test('an unknown phone is an error, not a silent gap', () => {
  assert.throws(() => arpaToIpa(P('S Q AH1')), /Q/);
});

test('the dictionary parser keeps the first pronunciation and skips comments', () => {
  const dict = parseCmudict(';;; a comment\nhonestly AA1 N AH0 S T L IY0\nhonestly(2) AA1 N AH0 S L IY0\n');
  assert.deepEqual(dict.get('honestly'), ['AA1', 'N', 'AH0', 'S', 'T', 'L', 'IY0']);
  assert.equal(dict.size, 1);
});

test('a phrase is looked up word by word; a weak second word carries no stress mark', () => {
  const dict = parseCmudict('deal D IY1 L\nwith W IH1 DH\nfigure F IH1 G Y ER0\nout AW1 T\n');
  assert.equal(ipaFor('deal with', dict), 'ˈdil wɪð');
  assert.equal(ipaFor('figure out', dict), 'ˈfɪɡjɚ ˈaʊt');
});

test('a word that is not in the dictionary is reported by name', () => {
  assert.throws(() => ipaFor('blorptastic', new Map()), /blorptastic/);
});

test('syllables and stressed syllables are counted from the IPA', () => {
  assert.equal(ipaSyllableCount('ɹɪˈlaɪəbəl'), 4);
  assert.deepEqual(ipaStressedSyllables('ɹɪˈlaɪəbəl'), [1]);
  assert.equal(ipaSyllableCount('ˈfɪɡjɚ ˈaʊt'), 3);
  assert.deepEqual(ipaStressedSyllables('ˈfɪɡjɚ ˈaʊt'), [0, 2]);
  assert.deepEqual(ipaStressedSyllables('ˌʌndɚˈstænd'), [2]);
});

test('fillIpa adds IPA, leaves existing IPA alone and lists words the dictionary does not have', () => {
  const dict = parseCmudict('stuff S T AH1 F\n');
  const { pack, missing } = fillIpa({ pack: 1, words: [{ word: 'stuff' }, { word: 'zzz' }, { word: 'kept', ipa: 'x' }] }, dict);
  assert.equal(pack.words[0].ipa, 'ˈstʌf');
  assert.deepEqual(missing, ['zzz']);
  assert.equal(pack.words[2].ipa, 'x');
});
