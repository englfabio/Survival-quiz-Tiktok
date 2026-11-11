import type {ActorKey, CameraKey, Motion, Vec3} from '../data/types';

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

const MOVING: Motion[] = ['walk', 'run', 'sidestep', 'backstep', 'climb', 'stumble', 'slither'];

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
};

/**
 * Liefert Position/Blickrichtung/Bewegung einer Figur zum Zeitpunkt t (0…1).
 * sectionSeconds = Länge des Abschnitts in Sekunden (für Tempo-Berechnung).
 */
export const sampleActor = (keys: ActorKey[], t: number, sectionSeconds: number): ActorState => {
  // Blickrichtung "vererbt" sich von Key zu Key
  const faces: number[] = [];
  const bites: boolean[] = [];
  let last = 0;
  let bit = false;
  for (const k of keys) {
    if (k.face !== undefined) last = k.face;
    if (k.bite !== undefined) bit = k.bite;
    faces.push(last);
    bites.push(bit);
  }
  if (t <= keys[0].t || keys.length === 1) {
    const k = keys[0];
    return {x: k.x, y: k.y ?? 0, z: k.z, face: faces[0], motion: k.motion, motionTime: t * sectionSeconds, speed: 0, bite: bites[0]};
  }
  let i = keys.length - 1;
  for (let j = 0; j < keys.length - 1; j++) {
    if (t < keys[j + 1].t) {
      i = j;
      break;
    }
  }
  const a = keys[i];
  const b = keys[i + 1];
  if (!b) {
    return {
      x: a.x,
      y: a.y ?? 0,
      z: a.z,
      face: faces[i],
      motion: a.motion,
      motionTime: (t - a.t) * sectionSeconds,
      speed: 0,
      bite: bites[i],
    };
  }
  const raw = clamp((t - a.t) / (b.t - a.t));
  const linear = MOVING.includes(a.motion);
  const p = linear ? raw : easeInOut(raw);
  const segSec = Math.max(0.001, (b.t - a.t) * sectionSeconds);
  const dist = Math.hypot(b.x - a.x, b.z - a.z, (b.y ?? 0) - (a.y ?? 0));
  // Drehung passiert im ersten Teil des Abschnitts (schneller als die Bewegung)
  const turnP = easeInOut(clamp(raw * 4));
  return {
    x: lerp(a.x, b.x, p),
    y: lerp(a.y ?? 0, b.y ?? 0, p),
    z: lerp(a.z, b.z, p),
    face: lerpAngle(faces[i], faces[i + 1], turnP),
    motion: a.motion,
    motionTime: (t - a.t) * sectionSeconds,
    speed: dist / segSec,
    bite: bites[i],
  };
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
