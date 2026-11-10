// Erzeugt die Sprachaufnahmen für ein Szenario (oder alle) – mit Cache.
// Aufruf:  npm run voice -- <szenario-id> [--dry]
//   --dry  = nur anzeigen, was erzeugt würde und wie viele Zeichen das kostet (kein API-Aufruf)
import {copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {Scenario} from '../src/data/types.ts';
import {API, audioSeconds, authHeaders, cacheKey, cachePaths, isCached, readMeta, writeCache} from './elevenlabs.ts';

type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

const cfg = JSON.parse(readFileSync('voice.config.json', 'utf-8'));
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const only = args.find((a) => !a.startsWith('--'));

/** Die Sprech-Clips eines Videos – Texte 1:1 aus der Szenario-Datei */
export const clipsOf = (s: Scenario): Record<string, string> => ({
  situation: s.situation.speech,
  option1: s.options[0].speech,
  option2: s.options[1].speech,
  option3: s.options[2].speech,
  countdown: s.countdown.speech,
  reveal: s.reveal.speech,
  explain1: s.options[0].explanation,
  explain2: s.options[1].explanation,
  explain3: s.options[2].explanation,
  outro: s.outro.speech,
});

const requestFor = (text: string) => ({
  endpoint: 'text-to-speech/with-timestamps',
  text,
  voiceId: cfg.voiceId,
  modelId: cfg.modelId,
  settings: cfg.settings,
  outputFormat: cfg.outputFormat,
});

const generate = async (text: string) => {
  const res = await fetch(
    `${API}/v1/text-to-speech/${cfg.voiceId}/with-timestamps?output_format=${cfg.outputFormat}`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...authHeaders()},
      body: JSON.stringify({text, model_id: cfg.modelId, voice_settings: cfg.settings}),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs-Fehler ${res.status}: ${await res.text()}`);
  const cost = res.headers.get('character-cost');
  const data = (await res.json()) as {audio_base64: string; alignment: Alignment};
  return {mp3: Buffer.from(data.audio_base64, 'base64'), alignment: data.alignment, cost};
};

const files = readdirSync('scenarios').filter((f) => f.endsWith('.json'));
let newChars = 0;
for (const f of files) {
  const s = JSON.parse(readFileSync(join('scenarios', f), 'utf-8')) as Scenario;
  if (only && s.id !== only) continue;
  console.log(`\n🎙  ${s.id}`);
  const outDir = join('public', 'voice', s.id);
  if (!dry) mkdirSync(outDir, {recursive: true});
  const durations: Record<string, number> = {};
  const alignments: Record<string, Alignment> = {};
  for (const [clip, text] of Object.entries(clipsOf(s))) {
    const key = cacheKey('tts', requestFor(text));
    if (isCached(key)) {
      console.log(`   ✔ ${clip.padEnd(10)} aus Zwischenspeicher (kostenlos)`);
    } else if (dry) {
      console.log(`   ✚ ${clip.padEnd(10)} würde erzeugt: ${text.length} Zeichen`);
      newChars += text.length;
      continue;
    } else {
      const r = await generate(text);
      writeCache(key, r.mp3, {...requestFor(text), alignment: r.alignment, characterCost: r.cost, createdAt: new Date().toISOString()});
      newChars += text.length;
      console.log(`   ✚ ${clip.padEnd(10)} neu erzeugt (${text.length} Zeichen, Kosten laut ElevenLabs: ${r.cost})`);
    }
    if (dry) continue;
    const meta = readMeta<{alignment: Alignment}>(key);
    const target = join(outDir, `${clip}.mp3`);
    copyFileSync(cachePaths(key).mp3, target);
    durations[clip] = Math.round(audioSeconds(target) * 1000) / 1000;
    alignments[clip] = meta.alignment;
  }
  if (!dry) {
    writeFileSync(join(outDir, 'durations.json'), JSON.stringify(durations, null, 2) + '\n');
    writeFileSync(join(outDir, 'alignment.json'), JSON.stringify(alignments) + '\n');
    const total = Object.values(durations).reduce((a, b) => a + b, 0);
    console.log(`   Gesamte Sprechzeit: ${total.toFixed(1)} s`);
  }
}
console.log(`\n${dry ? 'Würde neu erzeugen' : 'Neu erzeugt'}: ${newChars} Zeichen.`);
