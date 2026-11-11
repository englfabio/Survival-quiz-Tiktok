// Zeigt die Startbilder aller Abschnitte eines Szenarios (für gezielte Standbilder).
// Aufruf: node --experimental-strip-types --no-warnings scripts/frames.ts <id>
import {existsSync, readFileSync} from 'node:fs';
import {buildTimeline} from '../src/data/timeline.ts';
import type {Scenario} from '../src/data/types.ts';
const id = process.argv[2];
const s = JSON.parse(readFileSync(`scenarios/${id}.json`, 'utf-8')) as Scenario;
const d = `public/voice/${id}/durations.json`;
const tl = buildTimeline(s, existsSync(d) ? JSON.parse(readFileSync(d, 'utf-8')) : undefined);
console.log(JSON.stringify(tl.sections.map((x) => ({kind: x.kind + (x.option ?? ''), from: x.from, duration: x.duration}))));
