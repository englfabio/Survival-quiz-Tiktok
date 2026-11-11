// Erzeugt viele Standbilder auf einmal (Projekt wird nur einmal gebündelt → schneller als einzelne "remotion still").
// Aufruf: node scripts/stills.mjs <auftrag.json>
// auftrag.json: [{ "comp": "<id>", "frame": 120, "out": "review/x.png", "props": {...} }, ...]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

const jobs = JSON.parse(readFileSync(process.argv[2], 'utf-8'));
const CLOUD_BROWSER =
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = existsSync(CLOUD_BROWSER) ? CLOUD_BROWSER : null;
const chromiumOptions = {gl: 'swangle'};

const serveUrl = await bundle({entryPoint: resolve('src/index.ts')});
const cache = new Map();
for (const j of jobs) {
  const props = j.props ?? {};
  const key = j.comp + JSON.stringify(props);
  if (!cache.has(key)) {
    cache.set(
      key,
      await selectComposition({serveUrl, id: j.comp, inputProps: props, browserExecutable, chromiumOptions}),
    );
  }
  const composition = cache.get(key);
  mkdirSync(dirname(j.out), {recursive: true});
  await renderStill({
    serveUrl,
    composition,
    frame: j.frame,
    output: j.out,
    inputProps: props,
    browserExecutable,
    chromiumOptions,
    imageFormat: 'png',
    scale: j.scale ?? 1,
    overwrite: true,
  });
  console.log(`✔ ${j.out} (${j.comp}, Bild ${j.frame})`);
}
