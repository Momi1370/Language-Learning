import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const sw = await readFile(new URL('sw.js', root), 'utf8');
const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));

test('every file in the offline list exists', async () => {
  for (const f of shell.filter((x) => x !== './')) await access(new URL(f, root));
});

test('every JS module is in the offline list', async () => {
  const js = (await readdir(new URL('js/', root))).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`);
  const ui = (await readdir(new URL('js/ui/', root))).filter((f) => f.endsWith('.js')).map((f) => `js/ui/${f}`);
  for (const f of [...js, ...ui]) assert.ok(shell.includes(f), `${f} is missing from SHELL in sw.js`);
});
