// Writes audio/manifest.json from the clips that exist, with the voices and version from tools/tts/voices.json.
// Usage: node tools/tts/manifest.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const config = JSON.parse(await readFile(new URL('tools/tts/voices.json', root), 'utf8'));
const manifest = { version: String(config.version), voices: {}, en: {}, nl: {} };
const counts = [];
for (const lang of ['en', 'nl']) {
  manifest.voices[lang] = config[lang].voices.map((v) => v.id);
  for (const id of manifest.voices[lang]) {
    const files = await readdir(new URL(`audio/${lang}/${id}/`, root)).catch(() => []);
    manifest[lang][id] = files.filter((f) => /^[0-9a-z]+\.mp3$/.test(f)).map((f) => f.slice(0, -4)).sort();
    counts.push(`${lang}/${id} ${manifest[lang][id].length}`);
  }
}
await writeFile(new URL('audio/manifest.json', root), `${JSON.stringify(manifest)}\n`);
console.log(`audio/manifest.json: version ${manifest.version}; ${counts.join(', ')}`);
