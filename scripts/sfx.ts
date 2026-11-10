// Erzeugt die Soundeffekte (für alle Videos gemeinsam) – mit Cache.
// Aufruf:  npm run sfx [-- --dry]
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {API, audioSeconds, authHeaders, cacheKey, cachePaths, isCached, writeCache} from './elevenlabs.ts';

type Effect = {id: string; prompt: string; duration: number; loop: boolean; promptInfluence: number};
const cfg = JSON.parse(readFileSync('sfx.config.json', 'utf-8')) as {modelId: string; effects: Effect[]};
const dry = process.argv.includes('--dry');
const outDir = join('public', 'sfx');
mkdirSync(outDir, {recursive: true});
const durations: Record<string, number> = {};

for (const e of cfg.effects) {
  const req = {endpoint: 'sound-generation', modelId: cfg.modelId, prompt: e.prompt, duration: e.duration, loop: e.loop, promptInfluence: e.promptInfluence};
  const key = cacheKey('sfx', req);
  if (isCached(key)) {
    console.log(`   ✔ ${e.id.padEnd(16)} aus Zwischenspeicher (kostenlos)`);
  } else if (dry) {
    console.log(`   ✚ ${e.id.padEnd(16)} würde erzeugt (${e.duration} s)`);
    continue;
  } else {
    const res = await fetch(`${API}/v1/sound-generation?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...authHeaders()},
      body: JSON.stringify({
        text: e.prompt,
        model_id: cfg.modelId,
        duration_seconds: e.duration,
        loop: e.loop,
        prompt_influence: e.promptInfluence,
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs-Fehler ${res.status} bei ${e.id}: ${await res.text()}`);
    writeCache(key, Buffer.from(await res.arrayBuffer()), {...req, createdAt: new Date().toISOString()});
    console.log(`   ✚ ${e.id.padEnd(16)} neu erzeugt`);
  }
  if (dry) continue;
  const target = join(outDir, `${e.id}.mp3`);
  copyFileSync(cachePaths(key).mp3, target);
  durations[e.id] = Math.round(audioSeconds(target) * 1000) / 1000;
}
if (!dry) writeFileSync(join(outDir, 'durations.json'), JSON.stringify(durations, null, 2) + '\n');
