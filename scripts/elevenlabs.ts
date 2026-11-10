// Gemeinsame Helfer für ElevenLabs: Zwischenspeicher (Cache) + Audiolänge messen.
// Regel: Was einmal erzeugt wurde, wird NIE wieder bei ElevenLabs angefragt.
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';

export const CACHE_DIR = 'audio-cache';
mkdirSync(CACHE_DIR, {recursive: true});

/** Hash aus allen Angaben, die das Ergebnis beeinflussen (Text, Stimme, Modell, Einstellungen …) */
export const cacheKey = (prefix: string, request: unknown) =>
  prefix + '-' + createHash('sha256').update(JSON.stringify(request)).digest('hex').slice(0, 24);

export const cachePaths = (key: string) => ({
  mp3: join(CACHE_DIR, `${key}.mp3`),
  meta: join(CACHE_DIR, `${key}.json`),
});

export const isCached = (key: string) => existsSync(cachePaths(key).mp3) && existsSync(cachePaths(key).meta);

export const readMeta = <T>(key: string): T => JSON.parse(readFileSync(cachePaths(key).meta, 'utf-8'));

export const writeCache = (key: string, mp3: Buffer, meta: unknown) => {
  const p = cachePaths(key);
  writeFileSync(p.mp3, mp3);
  writeFileSync(p.meta, JSON.stringify(meta, null, 2) + '\n');
};

/** Länge einer Audiodatei in Sekunden (über das ffprobe, das Remotion mitbringt) */
export const audioSeconds = (file: string): number => {
  const r = spawnSync('npx', ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
    encoding: 'utf-8',
  });
  const v = parseFloat(r.stdout.trim());
  if (!Number.isFinite(v)) throw new Error(`Konnte Länge nicht messen: ${file}\n${r.stderr}`);
  return v;
};

export const API = 'https://api.elevenlabs.io';
/** In der Claude-Cloud ergänzt der Proxy den Schlüssel; lokal kommt er aus .env / Umgebung. */
export const authHeaders = (): Record<string, string> =>
  process.env.ELEVENLABS_API_KEY ? {'xi-api-key': process.env.ELEVENLABS_API_KEY} : {};
