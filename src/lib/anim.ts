import {ACTOR_VALUES, type ActorKey, type ActorValue, type CameraKey, type Motion, type Vec3} from '../data/types';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
export const deg = (d: number) => (d * Math.PI) / 180;

/** Winkel (Grad) auf dem kürzesten Weg mischen */
export const lerpAngle = (a: number, b: number, t: number) => {
  let d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};

/** Reproduzierbarer Zufall (gleiches Ergebnis bei jedem Rendern) */
export const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const MOVING: Motion[] = ['walk', 'run', 'sidestep', 'backstep', 'climb', 'stumble', 'slither', 'drive', 'swim', 'wade', 'hop', 'swimaway',
  'push', 'retreat', 'cross', 'crawl', 'backswim', 'shamble', 'confused'];

/**
 * Bewegungen, die über mehrere Zeitpunkte hinweg weiterlaufen (Zeit startet nicht bei jedem Zeitpunkt neu,
 * solange die gleiche Bewegung folgt). Nur für die neuen Bewegungen – ältere Videos bleiben unverändert.
 */
const CONTINUOUS: Motion[] = ['drive', 'roll', 'float', 'sink', 'buckled', 'unbuckle', 'button', 'climbout', 'swim', 'pushdoor', 'wait', 'splash',
  'wade', 'stepflinch', 'hop', 'holdfoot', 'ice', 'tweeze', 'testtemp', 'footbath', 'struggle',
  'buried', 'finup', 'swimaway', 'steam', 'show',
  'dig', 'hithard', 'stiff', 'uncover', 'lift', 'carry', 'lower', 'push', 'retreat', 'mark', 'warn', 'call', 'plant',
  'cross', 'slip', 'gasp', 'crawl', 'tug', 'backfloat', 'backswim', 'edgehold', 'edgewave',
  'armflinch', 'armhold', 'armlook', 'applyplaster', 'couchsit', 'chairsit', 'couchwait', 'showpass', 'chairnod', 'rinse', 'disinfect', 'compress',
  'shamble', 'reach', 'chomp', 'confused', 'flow', 'flip', 'spin', 'open'];

/** Neue Bewegungen (Strand), bei denen der Wechsel von der vorigen Bewegung weich überblendet wird */
export const BLEND_MOTIONS: Motion[] = [
  'wade', 'stepflinch', 'hop', 'holdfoot', 'ice', 'tweeze', 'testtemp', 'footbath', 'struggle',
  'dig', 'hithard', 'stiff', 'uncover', 'lift', 'carry', 'lower', 'push', 'retreat', 'mark', 'warn', 'call',
  'cross', 'slip', 'gasp', 'crawl', 'tug', 'backfloat', 'backswim', 'edgehold', 'edgewave',
  'armflinch', 'armhold', 'armlook', 'applyplaster', 'couchsit', 'chairsit', 'couchwait', 'showpass', 'chairnod', 'rinse', 'disinfect', 'compress',
  'shamble', 'reach', 'chomp', 'confused',
];

/** Ab welchem Zeitpunkt läuft die Bewegung von Zeitpunkt i schon? */
const runStart = (keys: ActorKey[], i: number) => {
  if (!CONTINUOUS.includes(keys[i].motion)) return keys[i].t;
  let j = i;
  while (j > 0 && keys[j - 1].motion === keys[i].motion) j--;
  return keys[j].t;
};

/** Vorige Bewegung vor dem Lauf, zu dem Zeitpunkt i gehört (nur für Überblenden der Strand-Bewegungen) */
const prevOf = (keys: ActorKey[], i: number, sectionSeconds: number) => {
  let j = i;
  while (j > 0 && keys[j - 1].motion === keys[i].motion) j--;
  if (j === 0) return undefined;
  const pm = keys[j - 1].motion;
  if (!BLEND_MOTIONS.includes(keys[i].motion) && !BLEND_MOTIONS.includes(pm)) return undefined;
  return {motion: pm, time: (keys[j].t - runStart(keys, j - 1)) * sectionSeconds};
};

export type ActorValues = Record<ActorValue, number>;

export type ActorState = {
  x: number;
  y: number;
  z: number;
  face: number; // Grad
  motion: Motion;
  /** Sekunden seit Beginn der aktuellen Bewegung */
  motionTime: number;
  /** Bodengeschwindigkeit (m/s), für Schrittfrequenz */
  speed: number;
  /** Bissspuren zeigen (Dummy) */
  bite: boolean;
  /** Stich-Punkt am Fuß zeigen (Dummy) */
  sting: boolean;
  /** Vorige Bewegung (für weiches Überblenden): Name + ihre Zeit beim Wechsel */
  prev?: {motion: Motion; time: number};
  /** Weiche Zahlenwerte (Auto: tilt, window, door, water, pressure) */
  values: ActorValues;
  /** Atemwolken: aufsummierte Atemzüge seit Abschnittsbeginn (damit sich das Tempo weich ändert) */
  breathPhase: number;
};

/** Pro Zeitpunkt die "geerbten" Werte (face, bite, tilt …) – gelten weiter, bis sie sich ändern */
export const inheritedKeys = (keys: ActorKey[]) => {
  let face = 0;
  let bite = false;
  let sting = false;
  const vals = Object.fromEntries(ACTOR_VALUES.map((k) => [k, 0])) as ActorValues;
  return keys.map((k) => {
    if (k.face !== undefined) face = k.face;
    if (k.bite !== undefined) bite = k.bite;
    if (k.sting !== undefined) sting = k.sting;
    for (const v of ACTOR_VALUES) if (k[v] !== undefined) vals[v] = k[v] as number;
    return {face, bite, sting, values: {...vals}};
  });
};

/** In welchem Abschnitt (zwischen Zeitpunkt i und i+1) steht t, und wie weit (p = mit Ease) */
export const segmentAt = (keys: ActorKey[], t: number) => {
  if (t <= keys[0].t || keys.length === 1) return {i: 0, raw: 0, p: 0, last: keys.length === 1};
  let i = keys.length - 1;
  for (let j = 0; j < keys.length - 1; j++) {
    if (t < keys[j + 1].t) {
      i = j;
      break;
    }
  }
  if (i === keys.length - 1) return {i, raw: 0, p: 0, last: true};
  const a = keys[i];
  const b = keys[i + 1];
  const raw = clamp((t - a.t) / (b.t - a.t));
  const p = MOVING.includes(a.motion) ? raw : easeInOut(raw);
  return {i, raw, p, last: false};
};

/**
 * Liefert Position/Blickrichtung/Bewegung einer Figur zum Zeitpunkt t (0…1).
 * sectionSeconds = Länge des Abschnitts in Sekunden (für Tempo-Berechnung).
 */
export const sampleActor = (keys: ActorKey[], t: number, sectionSeconds: number): ActorState => {
  const inh = inheritedKeys(keys);
  if (t <= keys[0].t || keys.length === 1) {
    const k = keys[0];
    return {
      x: k.x,
      y: k.y ?? 0,
      z: k.z,
      face: inh[0].face,
      motion: k.motion,
      motionTime: t * sectionSeconds,
      speed: 0,
      bite: inh[0].bite,
      sting: inh[0].sting,
      values: inh[0].values,
      breathPhase: 0,
    };
  }
  const {i, raw, p, last} = segmentAt(keys, t);
  const a = keys[i];
  if (last) {
    return {
      x: a.x,
      y: a.y ?? 0,
      z: a.z,
      face: inh[i].face,
      motion: a.motion,
      motionTime: (t - runStart(keys, i)) * sectionSeconds,
      speed: 0,
      bite: inh[i].bite,
      sting: inh[i].sting,
      values: inh[i].values,
      prev: prevOf(keys, i, sectionSeconds),
      breathPhase: 0,
    };
  }
  const b = keys[i + 1];
  const segSec = Math.max(0.001, (b.t - a.t) * sectionSeconds);
  const dist = Math.hypot(b.x - a.x, b.z - a.z, (b.y ?? 0) - (a.y ?? 0));
  // Drehung passiert im ersten Teil des Abschnitts (schneller als die Bewegung)
  const turnP = easeInOut(clamp(raw * 4));
  const vp = easeInOut(raw);
  const values = Object.fromEntries(
    ACTOR_VALUES.map((v) => [v, lerp(inh[i].values[v], inh[i + 1].values[v], vp)]),
  ) as ActorValues;
  return {
    x: lerp(a.x, b.x, p),
    y: lerp(a.y ?? 0, b.y ?? 0, p),
    z: lerp(a.z, b.z, p),
    face: lerpAngle(inh[i].face, inh[i + 1].face, turnP),
    motion: a.motion,
    motionTime: (t - runStart(keys, i)) * sectionSeconds,
    speed: dist / segSec,
    bite: inh[i].bite,
    sting: inh[i].sting,
    values,
    prev: prevOf(keys, i, sectionSeconds),
    breathPhase: 0,
  };
};

/** Atemzüge seit Abschnittsbeginn (Summe über das Atemtempo "breath") – nur wenn ein Zeitpunkt "breath" hat */
export const breathPhaseAt = (keys: ActorKey[], t: number, sectionSeconds: number) => {
  if (!keys.some((k) => k.breath !== undefined)) return 0;
  const N = 90;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const tt = ((i + 0.5) / N) * t;
    sum += sampleActor(keys, tt, sectionSeconds).values.breath * (t / N) * sectionSeconds;
  }
  return sum;
};

// ---------- Kamera ----------

const catmull = (p0: number, p1: number, p2: number, p3: number, t: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

/** Weicher Weg durch alle Punkte (Catmull-Rom) */
export const splineVec = (pts: Vec3[], times: number[], t: number): Vec3 => {
  if (pts.length === 1 || t <= times[0]) return pts[0];
  if (t >= times[times.length - 1]) return pts[pts.length - 1];
  let i = 0;
  while (i < times.length - 2 && t > times[i + 1]) i++;
  const u = (t - times[i]) / (times[i + 1] - times[i]);
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(pts.length - 1, i + 2)];
  return [0, 1, 2].map((c) => catmull(p0[c], p1[c], p2[c], p3[c], u)) as Vec3;
};

export const sampleCamera = (
  keys: CameraKey[],
  t: number,
  resolveLook: (name: string) => Vec3,
): {pos: Vec3; look: Vec3; fov: number} => {
  const te = easeInOut(t) * 0.35 + t * 0.65; // sanftes An- und Auslaufen
  const times = keys.map((k) => k.t);
  const pos = splineVec(
    keys.map((k) => k.pos),
    times,
    te,
  );
  const looks = keys.map((k) => (typeof k.look === 'string' ? resolveLook(k.look) : k.look));
  const look = splineVec(looks, times, te);
  const fovs = keys.map((k) => k.fov ?? 38);
  const fov = splineVec(
    fovs.map((f) => [f, 0, 0] as Vec3),
    times,
    te,
  )[0];
  return {pos, look, fov};
};
