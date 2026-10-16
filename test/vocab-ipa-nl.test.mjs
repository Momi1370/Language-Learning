import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanEspeakIpa, moveStressMarks, fillIpaNl } from '../tools/vocab-ipa-nl.mjs';

test('cleanEspeakIpa drops line breaks, syllable dots, joiners and double spaces', () => {
  assert.equal(cleanEspeakIpa('ˈɑf.spraːk\n'), 'ˈɑfspraːk');
  assert.equal(cleanEspeakIpa(' ɦɛt‍  ˈhuːs \n'), 'ɦɛt ˈhuːs');
});

test('fillIpaNl asks for the word without its article and never overwrites a hand-set ipa', () => {
  const asked = [];
  const speak = (text) => { asked.push(text); return `/${text}/\n`; };
  const pack = { words: [{ word: 'de afspraak' }, { word: 'het huis' }, { word: 'bellen' }, { word: 'de fiets', ipa: 'fits' }] };
  const { pack: out, missing } = fillIpaNl(pack, speak);
  assert.deepEqual(asked, ['afspraak', 'huis', 'bellen']);
  assert.deepEqual(out.words.map((w) => w.ipa), ['/afspraak/', '/huis/', '/bellen/', 'fits']);
  assert.deepEqual(missing, []);
});

test('fillIpaNl reports a word espeak gives nothing for', () => {
  const { missing } = fillIpaNl({ words: [{ word: 'xx' }] }, () => '\n');
  assert.deepEqual(missing, ['xx']);
});

test('moveStressMarks puts each stress mark before its syllable, not inside it', () => {
  assert.equal(moveStressMarks('hˈœyzɑrts'), 'ˈhœyzɑrts');
  assert.equal(moveStressMarks('zˈikɛnhˌœys'), 'ˈzikɛnˌhœys');
  assert.equal(moveStressMarks('bəstˈɛlən'), 'bəˈstɛlən');
  assert.equal(moveStressMarks('vərhˈœyzən'), 'vərˈhœyzən');
  assert.equal(moveStressMarks('ɑdrˈɛs'), 'ɑˈdrɛs');
  assert.equal(moveStressMarks('ˈɑfspraːk'), 'ˈɑfspraːk');
  assert.equal(moveStressMarks('ɪnstˈɑnt'), 'ɪnˈstɑnt');
});
