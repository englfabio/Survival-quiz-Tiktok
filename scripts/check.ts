// Prüft alle Szenario-Dateien: Aufbau korrekt? Video mindestens 61 s lang?
// Aufruf: npm run check
import {readdirSync, readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {buildTimeline, MIN_SECONDS, type ClipId} from '../src/data/timeline.ts';
import {validateScenario} from '../src/data/validate.ts';
import type {Scenario} from '../src/data/types.ts';

const dir = 'scenarios';
let problems = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const s = JSON.parse(readFileSync(join(dir, file), 'utf-8')) as Scenario;
  const errors = validateScenario(s, file);
  // Sprachlängen (sobald es in Schritt 2 eine Stimme gibt) aus public/voice/<id>/durations.json
  const durFile = join('public', 'voice', s.id, 'durations.json');
  const audio = existsSync(durFile)
    ? (JSON.parse(readFileSync(durFile, 'utf-8')) as Partial<Record<ClipId, number>>)
    : undefined;
  const tl = buildTimeline(s, audio);
  const ok = tl.totalSeconds >= MIN_SECONDS && errors.length === 0;
  console.log(
    `${ok ? '✅' : '❌'} ${s.id}: ${tl.totalSeconds.toFixed(1)} s ` +
      `(${tl.usesAudio ? 'nach Sprachaufnahmen' : 'Richtwerte, noch keine Stimme'})`,
  );
  for (const sec of tl.sections) {
    const name = sec.kind + (sec.option ? ` ${sec.option}` : '');
    console.log(`     ${name.padEnd(12)} ${(sec.duration / 30).toFixed(1).padStart(5)} s`);
  }
  errors.forEach((e) => console.log('   ⚠️  ' + e));
  if (tl.totalSeconds < MIN_SECONDS) {
    console.log(`   ⛔ Zu kurz! Mindestens ${MIN_SECONDS} s nötig. NICHT rendern – Inhaber informieren.`);
  }
  if (!ok) problems++;
}
process.exit(problems ? 1 : 0);
