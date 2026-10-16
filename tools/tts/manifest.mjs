// Writes audio/manifest.json from the clips that exist, with the version from tools/tts/voices.json.
// Usage: node tools/tts/manifest.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const voices = JSON.parse(await readFile(new URL('tools/tts/voices.json', root), 'utf8'));
const manifest = { version: String(voices.version) };
for (const lang of ['en', 'nl']) {
  const files = await readdir(new URL(`audio/${lang}/`, root)).catch(() => []);
  manifest[lang] = files.filter((f) => /^[0-9a-z]+\.mp3$/.test(f)).map((f) => f.slice(0, -4)).sort();
}
await writeFile(new URL('audio/manifest.json', root), `${JSON.stringify(manifest)}\n`);
console.log(`audio/manifest.json: version ${manifest.version}, ${manifest.en.length} English and ${manifest.nl.length} Dutch clips`);
