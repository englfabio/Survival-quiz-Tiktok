import type {ThreeElements} from '@react-three/fiber';
import {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut} from '../lib/anim';
import {Smartphone, Spade} from './GardenProps';

/**
 * Crashtest-Dummy aus einfachen Körperformen. Kein Gesicht.
 * Gelb mit schwarz-gelben Kreismarkierungen. Blickt im eigenen Koordinatensystem nach +z.
 * Größe ca. 1,80 m.
 */

const YELLOW = '#f3bf12';
const JOINT = '#2a2a2c';
const BLACK = '#151515';

// ---------- Pose ----------
type Limb = {sx: number; sz: number; bend: number};
export type DummyPose = {
  hipY: number;
  pitch: number; // ganzer Körper nach vorn kippen
  torsoX: number;
  torsoY: number;
  torsoZ: number;
  headX: number;
  headY: number;
  armL: Limb; // linker Arm liegt auf +x
  armR: Limb;
  legL: Limb;
  legR: Limb;
  foreZ: number; // Unterarm rechts seitlich (Winken)
  /** Band am rechten Oberschenkel: 0 = keins, 1 = fertig gewickelt */
  band: number;
  /** Handy in der rechten Hand */
  phone: boolean;
  /** Sicherheitsgurt: 0 = keiner, 1 = angelegt (dazwischen: rollt sich auf) */
  belt: number;
  /** Pinzette in der rechten Hand */
  tweezers: boolean;
  /** Eisbeutel in der linken Hand */
  ice: boolean;
  /** Spaten in der rechten Hand (Garten) */
  spade: boolean;
  /** Neigung des Spatens in der Welt (Bogenmaß): 0 = senkrecht, negativ = Blatt zeigt nach vorn */
  spadeTilt: number;
  /** Smartphone in der rechten Hand (Garten, "call") */
  smartphone: boolean;
};

const base = (): DummyPose => ({
  hipY: 0.98,
  pitch: 0,
  torsoX: 0,
  torsoY: 0,
  torsoZ: 0,
  headX: 0,
  headY: 0,
  armL: {sx: 0, sz: 0.1, bend: -0.15},
  armR: {sx: 0, sz: -0.1, bend: -0.15},
  legL: {sx: 0, sz: 0.03, bend: 0},
  legR: {sx: 0, sz: -0.03, bend: 0},
  foreZ: 0,
  band: 0,
  phone: false,
  belt: 0,
  tweezers: false,
  ice: false,
  spade: false,
  spadeTilt: -0.25,
  smartphone: false,
});

/** Zwei Haltungen mischen (k = 0 → a, 1 → b) */
export const mixPose = (a: DummyPose, b: DummyPose, k: number) => mix(a, b, k);
const mix = (a: DummyPose, b: DummyPose, k: number): DummyPose => {
  const L = (x: number, y: number) => x + (y - x) * k;
  const limb = (x: Limb, y: Limb): Limb => ({sx: L(x.sx, y.sx), sz: L(x.sz, y.sz), bend: L(x.bend, y.bend)});
  return {
    hipY: L(a.hipY, b.hipY),
    pitch: L(a.pitch, b.pitch),
    torsoX: L(a.torsoX, b.torsoX),
    torsoY: L(a.torsoY, b.torsoY),
    torsoZ: L(a.torsoZ, b.torsoZ),
    headX: L(a.headX, b.headX),
    headY: L(a.headY, b.headY),
    armL: limb(a.armL, b.armL),
    armR: limb(a.armR, b.armR),
    legL: limb(a.legL, b.legL),
    legR: limb(a.legR, b.legR),
    foreZ: L(a.foreZ, b.foreZ),
    band: L(a.band, b.band),
    phone: k < 0.5 ? a.phone : b.phone,
    belt: L(a.belt, b.belt),
    tweezers: k < 0.5 ? a.tweezers : b.tweezers,
    ice: k < 0.5 ? a.ice : b.ice,
    spade: k < 0.5 ? a.spade : b.spade,
    spadeTilt: L(a.spadeTilt, b.spadeTilt),
    smartphone: k < 0.5 ? a.smartphone : b.smartphone,
  };
};

/**
 * Sitzen auf einem Autositz (Fahrer). Hüfte 0,56 m über dem Ursprung → mit "attach": "car"
 * bei x 0.3, z −0.2, y 0 sitzt er genau auf dem Fahrersitz. Hände am Lenkrad.
 */
const carSeat = (time = 0): DummyPose => {
  const p = base();
  const breathe = Math.sin(time * 2.2) * 0.01;
  p.hipY = 0.56;
  p.legL = {sx: -1.72, sz: 0.07, bend: 0.72};
  p.legR = {sx: -1.72, sz: -0.07, bend: 0.72};
  p.torsoX = -0.2 + breathe;
  p.headX = 0.14;
  p.armL = {sx: -1.15, sz: -0.14, bend: -0.3};
  p.armR = {sx: -1.15, sz: 0.14, bend: -0.3};
  p.belt = 1;
  return p;
};

/** Hände ruhig auf den Oberschenkeln */
const lapArms = (p: DummyPose) => {
  p.armL = {sx: -0.62, sz: 0.02, bend: -0.75};
  p.armR = {sx: -0.62, sz: -0.02, bend: -0.75};
  return p;
};

/** Sitzen auf dem Boden: Beine nach vorn gestreckt, Hände hinten aufgestützt */
const seated = (time = 0): DummyPose => {
  const p = base();
  const breathe = Math.sin(time * 2.2) * 0.012;
  p.hipY = 0.14;
  p.legL = {sx: -1.5, sz: 0.1, bend: 0.05};
  p.legR = {sx: -1.52, sz: -0.12, bend: 0.0};
  p.torsoX = -0.12 + breathe;
  p.armL = {sx: 0.55, sz: 0.25, bend: -0.1};
  p.armR = {sx: 0.55, sz: -0.25, bend: -0.1};
  return p;
};

/** In die Hocke (Zwischenschritt beim Hinsetzen) */
const squat = (): DummyPose => {
  const p = base();
  p.hipY = 0.5;
  p.legL = {sx: -1.35, sz: 0.12, bend: 2.2};
  p.legR = {sx: -1.35, sz: -0.12, bend: 2.2};
  p.torsoX = 0.45;
  p.headX = -0.2;
  p.armL = {sx: -0.7, sz: 0.2, bend: -0.6};
  p.armR = {sx: -0.7, sz: -0.2, bend: -0.6};
  return p;
};

/** Ruhig sitzen: gebissenes rechtes Bein gestreckt und still, linkes Knie angewinkelt */
const restSit = (time: number): DummyPose => {
  const p = seated(time);
  p.legL = {sx: -2.35, sz: 0.18, bend: 2.45};
  p.torsoX = -0.04 + Math.sin(time * 2.2) * 0.012;
  // linker Unterarm liegt locker auf dem Knie
  p.armL = {sx: -0.95, sz: 0.12, bend: -0.55};
  return p;
};

// ---------- Strand (Petermännchen) ----------
/** Sitzt am Strand und hat den rechten Fuß zu sich herangezogen (Hände am Fuß) */
const footHold = (time: number): DummyPose => {
  const p = seated(time);
  p.legR = {sx: -2.25, sz: -0.12, bend: 2.35};
  p.legL = {sx: -1.62, sz: 0.32, bend: 0.35};
  p.torsoX = 0.5;
  p.torsoY = -0.12;
  p.headX = 0.4;
  p.headY = -0.15;
  p.armR = {sx: -1.05, sz: 0.05, bend: -0.55};
  p.armL = {sx: -1.15, sz: -0.3, bend: -0.45};
  return p;
};

/** Sitzt mit Blick auf die Schüssel (Schüssel steht ca. 0,32 m vor der Hüfte) */
const basinSit = (time: number): DummyPose => {
  const p = seated(time);
  p.torsoX = 0.08 + Math.sin(time * 2.2) * 0.012;
  p.headX = 0.32;
  p.armL = {sx: 0.6, sz: 0.3, bend: -0.1};
  p.armR = {sx: 0.6, sz: -0.3, bend: -0.1};
  return p;
};

/** Bein angewinkelt, Fuß in der Schüssel (Fuß steht ca. 0,28 m vor der Hüfte) */
const IN_BASIN = (side: 1 | -1): Limb => ({sx: -2.3, sz: side * -0.08, bend: 2.4});
/** Bein angewinkelt und nach außen gestellt (neben der Schüssel) */
const BESIDE_BASIN = (side: 1 | -1): Limb => ({sx: -2.15, sz: side * 0.62, bend: 2.15});

const TAU = Math.PI * 2;
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------- Garten (Fliegerbombe) ----------
const L3 = (sx: number, sz: number, bend: number): Limb => ({sx, sz, bend});

/** Umgraben: Spaten anheben */
const digRaise = (): DummyPose => {
  const p = base();
  p.armR = L3(-1.05, -0.05, -0.55);
  p.armL = L3(-0.95, -0.12, -0.85);
  p.torsoX = 0.1;
  p.headX = 0.35;
  p.spade = true;
  p.spadeTilt = -0.3;
  return p;
};
/** Umgraben: Spaten in die Erde stoßen */
const digThrust = (): DummyPose => {
  const p = base();
  p.armR = L3(-0.5, -0.05, -0.15);
  p.armL = L3(-0.55, -0.12, -0.5);
  p.torsoX = 0.5;
  p.hipY = 0.9;
  p.legL = L3(-0.3, 0.05, 0.5);
  p.legR = L3(0.05, -0.05, 0.3);
  p.headX = 0.45;
  p.spade = true;
  p.spadeTilt = -0.3;
  return p;
};
/** Umgraben: Erde aushebeln */
const digLever = (): DummyPose => {
  const p = base();
  p.armR = L3(-0.85, -0.05, -0.95);
  p.armL = L3(-0.75, -0.12, -1.0);
  p.torsoX = 0.3;
  p.hipY = 0.95;
  p.legL = L3(-0.15, 0.05, 0.25);
  p.headX = 0.4;
  p.spade = true;
  p.spadeTilt = -0.75;
  return p;
};
/** Umgraben: Erde zur Seite werfen */
const digToss = (): DummyPose => {
  const p = digLever();
  p.torsoY = -0.55;
  p.armR = L3(-0.95, -0.3, -0.85);
  p.headY = -0.3;
  p.spadeTilt = -1.0;
  return p;
};
/** Erstarrt: aufrecht, Spaten steckt vor ihm in der Erde, Blick nach unten */
const stiffPose = (time: number): DummyPose => {
  const p = base();
  p.armR = L3(-0.7, -0.05, -0.35);
  p.armL = L3(-0.65, -0.12, -0.6);
  p.torsoX = -0.06 + Math.sin(time * 1.6) * 0.006;
  p.headX = 0.55;
  p.legL = L3(0, 0.07, 0);
  p.legR = L3(0, -0.07, 0);
  p.spade = true;
  p.spadeTilt = -0.38;
  return p;
};
/** Kniet auf beiden Knien, Oberkörper weit nach vorn */
const kneelPose = (): DummyPose => {
  const p = base();
  p.hipY = 0.53;
  p.legL = L3(-0.18, 0.1, 1.6);
  p.legR = L3(-0.18, -0.1, 1.6);
  p.torsoX = 0.85;
  p.headX = 0.35;
  p.armL = L3(-1.1, 0.15, -0.3);
  p.armR = L3(-1.1, -0.15, -0.3);
  return p;
};
/** Hocke, Hände unten am Gegenstand */
const squatReach = (): DummyPose => {
  const p = base();
  p.hipY = 0.56;
  p.legL = L3(-1.3, 0.2, 2.1);
  p.legR = L3(-1.3, -0.2, 2.1);
  p.torsoX = 0.8;
  p.headX = 0.1;
  p.armL = L3(-0.8, 0.12, -0.15);
  p.armR = L3(-0.8, -0.12, -0.15);
  return p;
};
/** Hält etwas Schweres vor dem Bauch (Arme angewinkelt, leicht nach hinten gelehnt) */
const carryPose = (time: number): DummyPose => {
  const p = base();
  const strain = Math.sin(time * 21) * 0.015;
  p.hipY = 0.95;
  p.legL = L3(-0.12, 0.08, 0.22);
  p.legR = L3(-0.05, -0.08, 0.18);
  p.torsoX = -0.14 + strain;
  p.headX = 0.15;
  p.armL = L3(-0.5, 0.0, -1.05 + strain);
  p.armR = L3(-0.5, 0.0, -1.05 - strain);
  return p;
};
/** Nach vorn gebeugt, Arme ausgestreckt (Ablegen) */
const lowerPose = (): DummyPose => {
  const p = base();
  p.hipY = 0.86;
  p.legL = L3(-0.4, 0.08, 0.6);
  p.legR = L3(-0.25, -0.08, 0.45);
  p.torsoX = 0.62;
  p.headX = 0.2;
  p.armL = L3(-0.95, 0.0, -0.4);
  p.armR = L3(-0.95, 0.0, -0.4);
  return p;
};
/** Warnstab mit beiden Händen oben greifen */
const markHigh = (): DummyPose => {
  const p = base();
  p.armL = L3(-1.0, -0.22, -0.95);
  p.armR = L3(-1.0, 0.22, -0.95);
  p.torsoX = 0.08;
  p.headX = 0.3;
  return p;
};
/** Warnstab in die Erde drücken */
const markLow = (): DummyPose => {
  const p = base();
  p.armL = L3(-0.8, -0.2, -0.35);
  p.armR = L3(-0.8, 0.2, -0.35);
  p.torsoX = 0.5;
  p.hipY = 0.88;
  p.legL = L3(-0.3, 0.06, 0.45);
  p.legR = L3(-0.05, -0.06, 0.3);
  p.headX = 0.4;
  return p;
};

const gardenPose = (motion: Motion, time: number, speed: number): DummyPose | null => {
  const breathe = Math.sin(time * 2.2) * 0.012;
  switch (motion) {
    case 'dig': {
      const u = (time / 1.8) % 1;
      if (u < 0.3) return mix(digRaise(), digThrust(), easeInOut(u / 0.3) ** 1.6);
      if (u < 0.45) return digThrust();
      if (u < 0.65) return mix(digThrust(), digLever(), easeInOut((u - 0.45) / 0.2));
      if (u < 0.8) return mix(digLever(), digToss(), easeInOut((u - 0.65) / 0.15));
      return mix(digToss(), digRaise(), easeInOut((u - 0.8) / 0.2));
    }
    case 'hithard': {
      // Stoß nach unten (0–0,4 s), abrupt gestoppt + Vibration, dann erstarren (bis 1,6 s)
      if (time < 0.4) return mix(digRaise(), digThrust(), easeInOut(time / 0.4) ** 1.6);
      const tt = time - 0.4;
      const hit = digThrust();
      const kick = Math.exp(-tt * 7);
      const shake = Math.sin(tt * 48) * 0.09 * Math.exp(-tt * 4.5);
      hit.armR.bend += -0.25 * kick + shake;
      hit.armL.bend += -0.25 * kick - shake;
      hit.torsoX += -0.12 * kick + shake * 0.4;
      hit.headX += shake * 0.5;
      if (tt < 0.5) return hit;
      return mix(hit, stiffPose(time), easeInOut((tt - 0.5) / 0.7));
    }
    case 'stiff':
      return stiffPose(time);
    case 'uncover': {
      // hinknien (0–1 s), dann abwechselnd mit beiden Händen Erde zur Seite schieben
      const kneel = kneelPose();
      if (time < 1.0) {
        const st = base();
        if (time < 0.5) return mix(st, squatReach(), easeInOut(time / 0.5));
        return mix(squatReach(), kneel, easeInOut((time - 0.5) / 0.5));
      }
      const ph = (time - 1.0) * TAU * 0.85;
      const s = Math.sin(ph);
      const c = Math.cos(ph);
      kneel.armL = L3(-1.2 + 0.18 * c, 0.15 + 0.35 * Math.max(0, s), -0.25 - 0.2 * Math.max(0, -s));
      kneel.armR = L3(-1.2 - 0.18 * c, -0.15 - 0.35 * Math.max(0, -s), -0.25 - 0.2 * Math.max(0, s));
      kneel.torsoY = 0.12 * s;
      kneel.torsoX = 0.85 + 0.05 * c;
      kneel.headX = 0.35 + 0.05 * s;
      return kneel;
    }
    case 'lift': {
      const st = base();
      if (time < 0.8) return mix(st, squatReach(), easeInOut(time / 0.8));
      if (time < 1.2) return squatReach();
      if (time < 2.2) {
        const q = mix(squatReach(), carryPose(time), easeInOut((time - 1.2) / 1.0));
        q.torsoX += Math.sin(time * 23) * 0.02;
        return q;
      }
      return carryPose(time);
    }
    case 'carry':
      return carryPose(time);
    case 'lower': {
      if (time < 0.9) return mix(carryPose(time), lowerPose(), easeInOut(time / 0.9));
      if (time < 1.15) return lowerPose();
      const rel = lowerPose();
      rel.armL = L3(-0.75, 0.15, -0.25);
      rel.armR = L3(-0.75, -0.15, -0.25);
      return mix(lowerPose(), rel, easeInOut((time - 1.15) / 0.4));
    }
    case 'push': {
      const p = base();
      const ph = time * TAU * Math.max(0.7, speed * 0.62);
      const s = speed > 0.05 ? Math.sin(ph) : 0;
      p.legL = L3(-0.38 * s - 0.1, 0.05, 0.45 * Math.max(0, Math.sin(ph + 1.2)) * (speed > 0.05 ? 1 : 0));
      p.legR = L3(0.38 * s - 0.1, -0.05, 0.45 * Math.max(0, Math.sin(ph + 1.2 + Math.PI)) * (speed > 0.05 ? 1 : 0));
      p.hipY = 0.96 - 0.025 * Math.abs(Math.cos(ph));
      p.torsoX = 0.3;
      p.headX = -0.05;
      p.armL = L3(-0.55, 0.06, -0.08);
      p.armR = L3(-0.55, -0.06, -0.08);
      return p;
    }
    case 'retreat': {
      const p = base();
      const ph = time * TAU * 0.42;
      const s = Math.sin(ph);
      p.legL = L3(0.22 * s, 0.05, 0.3 * Math.max(0, s));
      p.legR = L3(-0.22 * s, -0.05, 0.3 * Math.max(0, -s));
      p.hipY = 0.94 - 0.02 * Math.abs(s);
      p.torsoX = 0.12;
      p.headX = 0.35;
      p.armL = L3(-0.45, 0.45, -0.5 + Math.sin(time * 1.3) * 0.05);
      p.armR = L3(-0.3, -0.1, -0.55);
      return p;
    }
    case 'mark': {
      const from = gardenPose('retreat', 0, 0)!;
      if (time < 0.3) return mix(from, markHigh(), easeInOut(time / 0.3));
      if (time < 0.9) return mix(markHigh(), markLow(), easeInOut((time - 0.3) / 0.6));
      if (time < 1.1) return markLow();
      const end = base();
      end.headX = 0.3;
      end.torsoX = 0.05 + breathe;
      return mix(markLow(), end, easeInOut((time - 1.1) / 0.5));
    }
    case 'warn': {
      const p = base();
      const k = easeInOut(clamp(time / 0.45));
      p.armR = L3(-0.25 * k, -0.1 - 2.55 * k + Math.sin(time * 7) * 0.32 * k, -0.15);
      p.foreZ = Math.sin(time * 7 + 0.6) * 0.35 * k;
      p.armL = L3(-1.25 * k, 0.1 + 0.35 * k, -0.05);
      p.torsoX = -0.04;
      p.torsoZ = 0.05 * k;
      p.headX = -0.08;
      return p;
    }
    case 'call': {
      const p = base();
      const k = easeInOut(clamp(time / 0.6));
      p.armR = L3(-2.0 * k, -0.1 + 0.4 * k, -0.15 - 2.15 * k);
      p.armL = L3(-0.45 * k + Math.sin(time * 1.9) * 0.12 * k, 0.12, -0.15 - 1.0 * k);
      p.headY = 0.12 * k;
      p.headX = 0.1 * k + Math.sin(time * 1.7) * 0.03;
      p.torsoZ = -0.03 * k;
      p.torsoX = breathe;
      p.hipY = 0.98 + Math.sin(time * 0.9) * 0.004;
      p.smartphone = k > 0.15;
      return p;
    }
  }
  return null;
};

/** Berechnet die Körperhaltung für eine Bewegung. time = Sekunden seit Bewegungsbeginn. */
export const dummyPose = (motion: Motion, time: number, speed: number): DummyPose => {
  const g = gardenPose(motion, time, speed);
  if (g) return g;
  const p = base();
  const breathe = Math.sin(time * 2.2) * 0.012;
  switch (motion) {
    case 'stand':
    case 'alert':
    case 'sniff': {
      p.torsoX = 0.02 + breathe;
      p.headX = breathe * 2;
      break;
    }
    case 'walk': {
      const ph = time * TAU * Math.max(0.8, speed * 0.62);
      const s = Math.sin(ph);
      p.legL.sx = -0.42 * s;
      p.legR.sx = 0.42 * s;
      p.legL.bend = 0.5 * Math.max(0, Math.sin(ph + 1.2));
      p.legR.bend = 0.5 * Math.max(0, Math.sin(ph + 1.2 + Math.PI));
      p.armL.sx = 0.35 * s;
      p.armR.sx = -0.35 * s;
      p.armL.bend = p.armR.bend = -0.3;
      p.hipY = 0.98 - 0.03 * Math.abs(Math.cos(ph));
      p.torsoX = 0.05;
      p.torsoY = 0.06 * s;
      break;
    }
    case 'run': {
      const ph = time * TAU * Math.max(1.2, Math.min(1.7, speed * 0.42));
      const s = Math.sin(ph);
      p.legL.sx = -0.95 * s;
      p.legR.sx = 0.95 * s;
      p.legL.bend = 0.3 + 1.2 * Math.max(0, Math.sin(ph + 1.0));
      p.legR.bend = 0.3 + 1.2 * Math.max(0, Math.sin(ph + 1.0 + Math.PI));
      p.armL.sx = 0.85 * s;
      p.armR.sx = -0.85 * s;
      p.armL.bend = p.armR.bend = -1.45;
      p.armL.sz = 0.15;
      p.armR.sz = -0.15;
      p.hipY = 0.93 + 0.07 * Math.abs(Math.sin(ph));
      p.torsoX = 0.3;
      p.torsoY = 0.12 * s;
      p.headX = -0.15;
      break;
    }
    case 'climb': {
      const ph = time * TAU * 0.7;
      const s = Math.sin(ph);
      p.armL.sx = -2.7 + 0.45 * s;
      p.armR.sx = -2.7 - 0.45 * s;
      p.armL.sz = 0.25;
      p.armR.sz = -0.25;
      p.armL.bend = -0.5 - 0.4 * Math.max(0, s);
      p.armR.bend = -0.5 - 0.4 * Math.max(0, -s);
      p.legL.sx = -0.75 - 0.45 * s;
      p.legR.sx = -0.75 + 0.45 * s;
      p.legL.bend = 1.1 + 0.4 * s;
      p.legR.bend = 1.1 - 0.4 * s;
      p.legL.sz = 0.25;
      p.legR.sz = -0.25;
      p.torsoX = 0.12;
      p.headX = -0.45;
      break;
    }
    case 'backstep':
    case 'sidestep': {
      const ph = time * TAU * 0.55;
      const s = Math.sin(ph);
      const side = motion === 'sidestep';
      p.legL.sx = side ? 0.08 * s : 0.25 * s;
      p.legR.sx = side ? -0.08 * s : -0.25 * s;
      p.legL.sz = side ? 0.03 + 0.2 * Math.max(0, s) : 0.03;
      p.legR.sz = side ? -0.03 - 0.2 * Math.max(0, -s) : -0.03;
      p.legL.bend = 0.25 * Math.max(0, s);
      p.legR.bend = 0.25 * Math.max(0, -s);
      p.hipY = 0.97 - 0.02 * Math.abs(s);
      // Hände beschwichtigend vor dem Körper
      p.armL.sx = p.armR.sx = -0.75;
      p.armL.sz = 0.25;
      p.armR.sz = -0.25;
      p.armL.bend = p.armR.bend = -0.85;
      p.torsoX = -0.03;
      break;
    }
    case 'calm': {
      const k = easeInOut(clamp(time / 0.6));
      p.armL.sx = p.armR.sx = -0.8 * k;
      p.armL.sz = 0.1 + 0.18 * k;
      p.armR.sz = -0.1 - 0.18 * k;
      p.armL.bend = p.armR.bend = -0.15 - 0.75 * k;
      p.armL.sx += Math.sin(time * 3) * 0.05 * k;
      p.armR.sx -= Math.sin(time * 3) * 0.05 * k;
      p.torsoX = -0.03 + breathe;
      p.headX = Math.sin(time * 2.4) * 0.05;
      break;
    }
    case 'stumble': {
      const k = easeInOut(clamp(time / 0.7));
      const ph = time * TAU * 1.6;
      p.pitch = 0.55 * k;
      p.hipY = 0.95 - 0.35 * k;
      p.torsoX = 0.25 + 0.2 * k;
      p.legL.sx = -0.9 * k;
      p.legL.bend = 1.5 * k;
      p.legR.sx = 0.7 * k;
      p.legR.bend = 0.6 * k;
      p.armL.sx = -1.4 * k + Math.sin(ph) * 0.4 * (1 - k * 0.6);
      p.armR.sx = -1.2 * k - Math.sin(ph) * 0.4 * (1 - k * 0.6);
      p.armL.sz = 0.5 * k;
      p.armR.sz = -0.5 * k;
      p.armL.bend = p.armR.bend = -0.3;
      p.headX = -0.4 * k;
      break;
    }
    case 'flinch': {
      // gebissen: kurz hochzucken, rechtes Bein hochreißen, dann Blick zur Wade
      const jolt = time < 0.12 ? easeInOut(time / 0.12) : 1 - easeInOut(clamp((time - 0.12) / 0.45));
      const look = easeInOut(clamp((time - 0.35) / 0.6));
      const shake = Math.sin(time * 38) * 0.04 * Math.max(0, 1 - time / 0.6);
      p.hipY = 0.98 + 0.05 * jolt;
      p.torsoX = -0.18 * jolt + 0.42 * look + shake;
      p.torsoY = -0.45 * look;
      p.headX = -0.3 * jolt + 0.55 * look;
      p.headY = -0.35 * look;
      p.legR = {sx: -0.75 * jolt + 0.35 * look, sz: -0.05 - 0.1 * look, bend: 1.4 * jolt + 0.9 * look};
      p.legL = {sx: 0.1 * jolt - 0.12 * look, sz: 0.06, bend: 0.15 * jolt + 0.2 * look};
      p.armL = {sx: -0.6 * jolt - 0.3 * look, sz: 0.1 + 0.8 * jolt + 0.15 * look, bend: -0.6 * jolt - 0.4 * look};
      p.armR = {sx: -0.6 * jolt + 0.35 * look, sz: -0.1 - 0.8 * jolt - 0.15 * look, bend: -0.6 * jolt - 0.3 * look};
      break;
    }
    case 'hurt':
      // steht, schaut besorgt zur Wade (Haltung nach dem Zusammenzucken, ohne Zucken)
      return dummyPose('flinch', 3 + time, speed);
    case 'sitdown': {
      // stehen → Hocke → sitzen (ca. 1,2 s), danach ruhig sitzen
      if (time < 0.55) return mix(p, squat(), easeInOut(time / 0.55));
      if (time < 1.2) return mix(squat(), restSit(time), easeInOut((time - 0.55) / 0.65));
      return restSit(time);
    }
    case 'sit':
      return restSit(time);
    case 'phone': {
      // ruhig sitzen, Handy mit rechts am Ohr
      const q = restSit(time);
      const k = easeInOut(clamp(time / 0.6));
      const target: Limb = {sx: -2.0, sz: 0.3, bend: -2.3};
      q.armR = {
        sx: lerpN(q.armR.sx, target.sx, k),
        sz: lerpN(q.armR.sz, target.sz, k),
        bend: lerpN(q.armR.bend, target.bend, k),
      };
      q.headY = 0.12 * k;
      q.headX = 0.08 * k + Math.sin(time * 1.7) * 0.02;
      q.torsoZ = -0.04 * k;
      q.phone = k > 0.15;
      return q;
    }
    case 'suck': {
      // sitzt, zieht das rechte Bein heran und beugt sich zur Wade
      const q = seated(time);
      const k = easeInOut(clamp(time / 0.8));
      const bob = Math.sin(time * 5) * 0.06 * clamp((time - 0.8) / 0.3);
      const target = seated(time);
      target.legR = {sx: -2.25, sz: -0.4, bend: 2.3};
      target.torsoX = 1.0 + bob;
      target.torsoY = -0.3;
      target.torsoZ = -0.15;
      target.headX = 0.75 + bob * 0.8;
      target.headY = -0.25;
      target.armR = {sx: -0.9, sz: -0.25, bend: -0.9};
      target.armL = {sx: -1.15, sz: -0.45, bend: -0.7};
      return mix(q, target, k);
    }
    case 'tourniquet': {
      // sitzt, wickelt ein Band um den rechten Oberschenkel und zieht es fest
      const q = seated(time);
      const k = easeInOut(clamp(time / 0.6));
      const wrap = clamp((time - 0.6) / 2.2); // Wickeln
      const pull = easeInOut(clamp((time - 2.9) / 0.4)); // Festziehen
      const ph = time * TAU * 1.3;
      const circ = wrap > 0 && wrap < 1 ? 1 : 0;
      const target = seated(time);
      target.torsoX = 0.62;
      target.torsoY = -0.22;
      target.headX = 0.45;
      target.headY = -0.15;
      target.armR = {sx: -1.0 + 0.25 * Math.sin(ph) * circ, sz: -0.05 - 0.15 * pull, bend: -0.6 - 0.35 * Math.cos(ph) * circ};
      target.armL = {
        sx: -1.0 - 0.25 * Math.sin(ph) * circ,
        sz: -0.28 + 0.4 * pull,
        bend: -0.6 + 0.35 * Math.cos(ph) * circ - 0.3 * pull,
      };
      target.band = wrap;
      const out = mix(q, target, k);
      out.band = wrap;
      return out;
    }
    case 'buckled': {
      // angeschnallt sitzen, Hände am Lenkrad (kleine Lenkbewegung)
      const q = carSeat(time);
      const steer = Math.sin(time * 0.8) * 0.04;
      q.armL.sx += steer;
      q.armR.sx -= steer;
      q.headY = Math.sin(time * 0.6) * 0.1;
      return q;
    }
    case 'wait': {
      // angeschnallt, ganz ruhig sitzen und warten
      const q = lapArms(carSeat(time));
      q.headX = 0.22;
      q.headY = Math.sin(time * 0.45) * 0.12;
      return q;
    }
    case 'unbuckle': {
      // rechte Hand zum Gurtschloss (rechte Hüfte), drücken, Gurt rollt sich auf, Hand zurück
      const start = carSeat(time);
      const reach = carSeat(time);
      reach.armR = {sx: -0.3, sz: 0.16, bend: -1.05 + Math.sin(clamp((time - 0.45) / 0.2) * Math.PI) * 0.12};
      reach.torsoY = -0.18;
      reach.torsoX = -0.05;
      reach.headX = 0.5;
      reach.headY = -0.35;
      const end = lapArms(carSeat(time));
      end.belt = 0;
      let q: DummyPose;
      if (time < 0.45) q = mix(start, reach, easeInOut(time / 0.45));
      else if (time < 1.1) q = reach;
      else q = mix(reach, end, easeInOut(clamp((time - 1.1) / 0.5)));
      q.belt = 1 - easeInOut(clamp((time - 0.6) / 0.5));
      return q;
    }
    case 'button': {
      // linke Hand zum Fensterheber an der Tür, Knopf gedrückt halten, Blick zum Fenster
      const q = lapArms(carSeat(time));
      q.belt = 0;
      const k = easeInOut(clamp(time / 0.5));
      const press = Math.sin(time * 9) * 0.04 * clamp((time - 0.5) / 0.2);
      const target: Limb = {sx: -0.45, sz: -0.02, bend: -1.15 + press};
      q.armL = {sx: lerpN(q.armL.sx, target.sx, k), sz: lerpN(q.armL.sz, target.sz, k), bend: lerpN(q.armL.bend, target.bend, k)};
      q.torsoY = 0.18 * k;
      q.torsoZ = -0.05 * k;
      q.headY = 0.65 * k;
      q.headX = 0.1;
      return q;
    }
    case 'pushdoor': {
      // angeschnallt, stemmt sich mit aller Kraft gegen die Fahrertür (links, +x)
      const q = carSeat(time);
      const k = easeInOut(clamp(time / 0.5));
      const push = 0.5 + 0.5 * Math.sin(time * 3.4);
      const shake = Math.sin(time * 31) * 0.025 * k;
      const target = carSeat(time);
      target.torsoZ = -0.1 - 0.04 * push + shake;
      target.torsoY = 0.42;
      target.torsoX = -0.05;
      target.headY = 0.5;
      target.headX = 0.2 + shake;
      // Hände oben an der Tür (Fensterkante), damit man das Drücken durchs Fenster sieht
      target.armL = {sx: -0.95, sz: -0.04, bend: -1.15 + 0.15 * push};
      target.armR = {sx: -1.5, sz: 0.5 + 0.05 * push, bend: -0.45 + 0.15 * push};
      target.legL = {sx: -1.6, sz: 0.2, bend: 0.5};
      return mix(q, target, k);
    }
    case 'climbout': {
      // durchs Fenster klettern: auf den Sitz knien, Oberkörper flach hinaus, Arme greifen nach vorn,
      // Beine strecken sich nach hinten. Ca. 2,2 s, Weg über die Zeitpunkte (attach "car").
      const u = clamp(time / 2.6);
      const q = base();
      const ph = time * TAU * 0.9;
      const s = Math.sin(ph);
      const kneel = easeInOut(clamp(u / 0.3));
      const out = easeInOut(clamp((u - 0.3) / 0.7));
      q.hipY = lerpN(0.56, 0.62, kneel) + 0.3 * out;
      q.torsoX = lerpN(0.4, 1.05, kneel) + 0.4 * out;
      q.headX = -0.6;
      q.armL = {sx: -2.7 + 0.3 * s, sz: 0.12, bend: -0.3 - 0.3 * Math.max(0, s)};
      q.armR = {sx: -2.7 - 0.3 * s, sz: -0.12, bend: -0.3 - 0.3 * Math.max(0, -s)};
      const legSx = lerpN(lerpN(-1.7, 0.2, kneel), 1.15, out);
      const legBend = lerpN(lerpN(0.7, 1.7, kneel), 0.35, out);
      q.legL = {sx: legSx + 0.15 * s * out, sz: 0.08, bend: legBend};
      q.legR = {sx: legSx - 0.15 * s * out, sz: -0.08, bend: legBend};
      return q;
    }
    case 'swim': {
      // Brustschwimmen an der Oberfläche: Körper liegt flach, Kopf über Wasser
      const q = base();
      const ph = (time / 1.3) % 1;
      const pull = Math.sin(ph * Math.PI * 2);
      const open = Math.max(0, Math.sin(ph * Math.PI * 2));
      q.pitch = 1.38;
      q.hipY = 0.98;
      q.torsoX = -0.28;
      q.headX = -0.85;
      q.armL = {sx: -2.75 + 0.75 * open, sz: 0.25 + 0.9 * open, bend: -0.2 - 0.9 * Math.max(0, -pull)};
      q.armR = {sx: -2.75 + 0.75 * open, sz: -0.25 - 0.9 * open, bend: -0.2 - 0.9 * Math.max(0, -pull)};
      const kick = Math.max(0, Math.sin(ph * Math.PI * 2 + 2.2));
      q.legL = {sx: -0.35 * kick, sz: 0.08 + 0.35 * kick, bend: 1.5 * kick};
      q.legR = {sx: -0.35 * kick, sz: -0.08 - 0.35 * kick, bend: 1.5 * kick};
      return q;
    }
    case 'wade': {
      // barfuß durchs flache Wasser waten: langsame, hohe Schritte, Arme leicht zur Seite (Gleichgewicht)
      const ph = time * TAU * Math.max(0.6, speed * 0.75);
      const s = Math.sin(ph);
      p.legL.sx = -0.38 * s - 0.08;
      p.legR.sx = 0.38 * s - 0.08;
      p.legL.bend = 0.85 * Math.max(0, Math.sin(ph + 1.3));
      p.legR.bend = 0.85 * Math.max(0, Math.sin(ph + 1.3 + Math.PI));
      p.armL = {sx: 0.25 * s, sz: 0.38, bend: -0.35};
      p.armR = {sx: -0.25 * s, sz: -0.38, bend: -0.35};
      p.hipY = 0.97 - 0.03 * Math.abs(Math.cos(ph));
      p.torsoX = 0.1;
      p.torsoY = 0.05 * s;
      p.headX = 0.15;
      break;
    }
    case 'stepflinch': {
      // Schritt nach vorn (rechter Fuß setzt bei ca. 0,35 s auf), dann Zusammenzucken: Fuß hochreißen
      const u = clamp(time / 0.35);
      const step = {...p};
      step.legR = {sx: -0.36 * easeInOut(u), sz: -0.03, bend: 0.55 * Math.sin(Math.PI * u)};
      step.legL = {sx: 0.18 * easeInOut(u), sz: 0.03, bend: 0.1 * u};
      step.armL = {sx: -0.15 * u, sz: 0.3, bend: -0.3};
      step.armR = {sx: 0.15 * u, sz: -0.3, bend: -0.3};
      step.torsoX = 0.1;
      step.headX = 0.2;
      if (time < 0.38) return step;
      const tt = time - 0.38;
      const jolt = tt < 0.1 ? easeInOut(tt / 0.1) : 1 - 0.35 * easeInOut(clamp((tt - 0.1) / 0.5));
      const look = easeInOut(clamp((tt - 0.25) / 0.6));
      const shake = Math.sin(tt * 40) * 0.05 * Math.max(0, 1 - tt / 0.7);
      const q = base();
      q.hipY = 0.98 + 0.04 * jolt;
      q.legR = {sx: -0.55 * jolt + 0.35 * look, sz: -0.12, bend: 1.9 * jolt};
      q.legL = {sx: 0.05, sz: 0.06, bend: 0.12};
      q.torsoX = -0.2 * jolt * (1 - look) + 0.38 * look + shake;
      q.torsoY = -0.3 * look;
      q.headX = -0.3 * jolt * (1 - look) + 0.65 * look;
      q.headY = -0.3 * look;
      q.armL = {sx: -0.5 * jolt, sz: 0.25 + 1.0 * jolt - 0.3 * look, bend: -0.5};
      q.armR = {sx: -0.5 * jolt + 0.2 * look, sz: -0.25 - 1.0 * jolt + 0.3 * look, bend: -0.5};
      return mix(step, q, easeInOut(clamp(tt / 0.06)));
    }
    case 'hop': {
      // auf dem linken Bein hüpfen, rechter Fuß angezogen, Arme balancieren
      const ph = time * TAU * 1.9;
      const up = Math.max(0, Math.sin(ph));
      p.hipY = 0.93 + 0.12 * up;
      p.legL = {sx: -0.15 + 0.1 * up, sz: 0.03, bend: 0.35 * (1 - up)};
      p.legR = {sx: -0.35, sz: -0.1, bend: 1.75};
      p.armL = {sx: -0.3 + 0.2 * Math.sin(ph), sz: 0.75, bend: -0.4};
      p.armR = {sx: -0.3 - 0.2 * Math.sin(ph), sz: -0.75, bend: -0.4};
      p.torsoX = 0.18;
      p.torsoZ = 0.04 * Math.sin(ph * 0.5);
      p.headX = 0.25;
      break;
    }
    case 'holdfoot': {
      // sitzt, hält den Fuß und schaukelt vor Schmerz leicht vor und zurück
      const q = footHold(time);
      const rock = Math.sin(time * 3.2) * 0.07;
      q.torsoX += rock;
      q.headX += rock * 0.6;
      return q;
    }
    case 'ice': {
      // sitzt, drückt einen Eisbeutel auf den Fuß
      const q = footHold(time);
      const k = easeInOut(clamp(time / 0.6));
      q.armL = {sx: lerpN(-1.15, -1.0, k), sz: lerpN(-0.3, -0.42, k), bend: lerpN(-0.45, -0.75, k)};
      q.armR = {sx: -1.0, sz: 0.0, bend: -0.6};
      q.ice = true;
      q.torsoX += Math.sin(time * 2.6) * 0.04;
      return q;
    }
    case 'tweeze': {
      // sitzt, beugt sich zum Fuß, zupft mit der Pinzette (rechte Hand) vorsichtig Stachelreste heraus
      const q = footHold(time);
      const pull = Math.max(0, Math.sin(time * TAU * 0.9));
      q.torsoX = 0.62;
      q.headX = 0.55;
      q.armR = {sx: -1.0 + 0.18 * pull, sz: 0.12, bend: -0.75 + 0.35 * pull};
      q.armL = {sx: -1.1, sz: -0.38, bend: -0.5};
      q.tweezers = true;
      return q;
    }
    case 'testtemp': {
      // sitzt vor der Schüssel; rechter (gestochener) Fuß bleibt draußen,
      // linker Fuß tippt vorsichtig ins Wasser, zuckt kurz zurück, dann hinein
      const q = basinSit(time);
      q.legR = BESIDE_BASIN(-1);
      const hover: Limb = {sx: -2.05, sz: -0.14, bend: 1.75};
      const dip: Limb = {sx: -2.3, sz: -0.1, bend: 2.35};
      const mixL = (a: Limb, b: Limb, k: number): Limb => ({sx: lerpN(a.sx, b.sx, k), sz: lerpN(a.sz, b.sz, k), bend: lerpN(a.bend, b.bend, k)});
      let leg: Limb;
      if (time < 0.6) leg = mixL({sx: -1.5, sz: 0.1, bend: 0.05}, hover, easeInOut(time / 0.6));
      else if (time < 1.0) leg = mixL(hover, dip, easeInOut((time - 0.6) / 0.4));
      else if (time < 1.25) leg = mixL(dip, hover, easeInOut((time - 1.0) / 0.25));
      else leg = mixL(hover, dip, easeInOut(clamp((time - 1.6) / 0.6)));
      q.legL = leg;
      q.torsoX = 0.3;
      q.headX = 0.5;
      return q;
    }
    case 'footbath': {
      // sitzt, rechter Fuß im heißen Wasser; Schmerz lässt nach, Haltung entspannt sich
      const q = basinSit(time);
      const k = easeInOut(clamp(time / 0.8));
      const hover: Limb = {sx: -2.05, sz: -0.04, bend: 1.75};
      const inn = IN_BASIN(-1);
      q.legR = {sx: lerpN(hover.sx, inn.sx, k), sz: lerpN(hover.sz, inn.sz, k), bend: lerpN(hover.bend, inn.bend, k)};
      q.legL = BESIDE_BASIN(1);
      q.torsoX = lerpN(0.25, 0.0, clamp((time - 1) / 2)) + Math.sin(time * 1.8) * 0.012;
      q.headX = lerpN(0.45, 0.2, clamp((time - 1) / 2));
      return q;
    }
    case 'struggle': {
      // aufrecht im tiefen Wasser, paddelt mühsam, Kopf kaum über Wasser
      const ph = time * TAU * 0.9;
      const s = Math.sin(ph);
      p.hipY = 0.98 + 0.05 * Math.sin(ph + 0.6);
      p.armL = {sx: -1.2 + 0.35 * s, sz: 1.1 + 0.25 * Math.cos(ph), bend: -0.5 - 0.3 * Math.max(0, s)};
      p.armR = {sx: -1.2 - 0.35 * s, sz: -1.1 - 0.25 * Math.cos(ph), bend: -0.5 - 0.3 * Math.max(0, -s)};
      p.legL = {sx: -0.85 + 0.25 * s, sz: 0.15, bend: 1.5 + 0.3 * s};
      p.legR = {sx: -0.85 - 0.25 * s, sz: -0.15, bend: 1.5 - 0.3 * s};
      p.torsoX = 0.12;
      p.headX = -0.42 + 0.06 * s;
      break;
    }
    case 'wave': {
      const k = easeInOut(clamp(time / 0.5));
      p.armR.sz = -0.1 - 2.5 * k;
      p.armR.bend = -0.2;
      p.foreZ = (-0.4 + Math.sin(time * 9) * 0.45) * k;
      p.torsoZ = 0.04 * k;
      p.torsoX = breathe;
      break;
    }
  }
  return p;
};

/** Wie dummyPose, aber mit weichem Übergang von der vorigen Bewegung (nur Strand-Bewegungen, 0,45 s) */
export const dummyPoseBlended = (
  motion: Motion,
  time: number,
  speed: number,
  prev?: {motion: Motion; time: number},
): DummyPose => {
  const cur = dummyPose(motion, time, speed);
  const BLEND = 0.45;
  if (!prev || time >= BLEND) return cur;
  return mix(dummyPose(prev.motion, prev.time + time, 0), cur, easeInOut(time / BLEND));
};

// ---------- Bauteile ----------
const useMats = (color = YELLOW) =>
  useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({color, roughness: 0.45, metalness: 0.05, flatShading: true}),
      joint: new THREE.MeshStandardMaterial({color: JOINT, roughness: 0.6, flatShading: true}),
      black: new THREE.MeshBasicMaterial({color: BLACK, side: THREE.DoubleSide}),
      yellow: new THREE.MeshBasicMaterial({color: '#ffd21a', side: THREE.DoubleSide}),
      bite: new THREE.MeshBasicMaterial({color: '#5a1a14', side: THREE.DoubleSide}),
      band: new THREE.MeshStandardMaterial({color: '#e9eef2', roughness: 0.8, flatShading: true}),
      belt: new THREE.MeshStandardMaterial({color: '#30353b', roughness: 0.85, flatShading: true}),
      sting: new THREE.MeshBasicMaterial({color: '#d0261c', side: THREE.DoubleSide}),
      ice: new THREE.MeshStandardMaterial({color: '#bfe9ff', roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.85, flatShading: true}),
      iceCube: new THREE.MeshStandardMaterial({color: '#f2fbff', roughness: 0.1, emissive: '#9fdcff', emissiveIntensity: 0.25, flatShading: true}),
      steel: new THREE.MeshStandardMaterial({color: '#d9dde2', roughness: 0.25, metalness: 0.8, flatShading: true}),
      painRed: new THREE.MeshBasicMaterial({color: '#ff2416', depthTest: false, transparent: true}),
      painCore: new THREE.MeshBasicMaterial({color: '#ffd23a', depthTest: false, transparent: true}),
      painGlow: new THREE.MeshBasicMaterial({color: '#ff2a1a', transparent: true, opacity: 0.4, depthWrite: false}),
    }),
    [color],
  );

type Mats = ReturnType<typeof useMats>;

/** Typische Crashtest-Markierung: Kreis in vier Viertel, schwarz/gelb im Wechsel */
const Marker = ({m, r, ...props}: {m: Mats; r: number} & ThreeElements['group']) => (
  <group {...props}>
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} material={i % 2 === 0 ? m.black : m.yellow}>
        <circleGeometry args={[r, 6, (i * Math.PI) / 2, Math.PI / 2]} />
      </mesh>
    ))}
    <mesh material={m.black} position={[0, 0, -0.001]}>
      <ringGeometry args={[r, r * 1.12, 20]} />
    </mesh>
  </group>
);

const Seg = ({
  m,
  len,
  r,
  r2,
}: {
  m: Mats;
  len: number;
  r: number;
  r2?: number;
}) => (
  <mesh material={m.body} position={[0, -len / 2, 0]} castShadow>
    <cylinderGeometry args={[r, r2 ?? r * 0.85, len, 8]} />
  </mesh>
);

const Joint = ({m, r}: {m: Mats; r: number}) => (
  <mesh material={m.joint} castShadow>
    <icosahedronGeometry args={[r, 1]} />
  </mesh>
);

const Arm = ({
  m,
  limb,
  side,
  foreZ = 0,
  phone = false,
  tweezers = false,
  ice = false,
  spade = false,
  smartphone = false,
}: {
  m: Mats;
  limb: Limb;
  side: 1 | -1;
  foreZ?: number;
  phone?: boolean;
  tweezers?: boolean;
  ice?: boolean;
  spade?: boolean;
  smartphone?: boolean;
}) => (
  <group position={[0.27 * side, 0.44, 0]} rotation={[limb.sx, 0, limb.sz]}>
    <Joint m={m} r={0.09} />
    <Seg m={m} len={0.3} r={0.08} />
    <group position={[0, -0.31, 0]} rotation={[limb.bend, 0, foreZ]}>
      <Joint m={m} r={0.07} />
      <Seg m={m} len={0.27} r={0.07} r2={0.058} />
      <mesh material={m.body} position={[0, -0.32, 0.0]} scale={[0.8, 1.1, 0.6]} castShadow>
        <icosahedronGeometry args={[0.08, 0]} />
      </mesh>
      {phone && (
        <group position={[0.045 * side, -0.33, 0.03]} rotation={[0.2, 0, 0]}>
          <mesh material={m.joint} castShadow>
            <boxGeometry args={[0.025, 0.16, 0.08]} />
          </mesh>
          <mesh position={[0.0135 * side, 0, 0]}>
            <boxGeometry args={[0.002, 0.13, 0.065]} />
            <meshBasicMaterial color="#7fd0ff" />
          </mesh>
        </group>
      )}
      {smartphone && (
        <group position={[0.04 * side, -0.33, 0.035]} rotation={[0.2, (side * Math.PI) / 2, 0]}>
          <Smartphone />
        </group>
      )}
      {tweezers && (
        <group position={[0, -0.38, 0.03]} rotation={[0.5, 0, 0]}>
          {[1, -1].map((k) => (
            <mesh key={k} material={m.steel} position={[k * 0.008, -0.05, 0]} rotation={[0, 0, k * 0.09]}>
              <boxGeometry args={[0.006, 0.12, 0.012]} />
            </mesh>
          ))}
        </group>
      )}
      {ice && (
        <group position={[0, -0.39, 0.02]}>
          <mesh material={m.ice} castShadow>
            <boxGeometry args={[0.15, 0.06, 0.11]} />
          </mesh>
          {[
            [-0.035, 0.0, -0.02],
            [0.03, 0.005, 0.025],
            [0.0, 0.01, 0.0],
          ].map((q, i) => (
            <mesh key={i} material={m.iceCube} position={q as [number, number, number]} rotation={[i, i * 0.7, 0]}>
              <boxGeometry args={[0.035, 0.035, 0.035]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  </group>
);

/** Schmerz-Symbol: roter, gezackter Stern am Fuß, pulsiert. Bei pain > 1 leuchtet auch das Bein rot (Schmerz breitet sich aus). */
const PAIN_DIRS = (() => {
  const g = new THREE.IcosahedronGeometry(1, 0);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const seen: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
    if (!seen.some((o) => o.distanceTo(v) < 0.01)) seen.push(v);
  }
  return seen;
})();
const PainBurst = ({m, pain, time}: {m: Mats; pain: number; time: number}) => {
  const vis = clamp(pain * 3);
  const size = (0.07 + 0.05 * Math.min(pain, 2)) * vis * (1 + 0.14 * Math.sin(time * 9));
  const spin = time * 0.6;
  return (
    <group scale={size} rotation={[spin * 0.5, spin, 0]} renderOrder={20}>
      <mesh material={m.painCore} renderOrder={21}>
        <icosahedronGeometry args={[0.55, 0]} />
      </mesh>
      {PAIN_DIRS.map((d, i) => {
        const len = i % 2 ? 1.25 : 1.75;
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
        return (
          <mesh key={i} material={m.painRed} position={d.clone().multiplyScalar(0.35 + len / 2)} quaternion={q} renderOrder={20}>
            <coneGeometry args={[0.28, len, 4]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Rotes Leuchten am Bein, wenn sich der Schmerz ausbreitet (pain 1 → 2) */
const PainGlow = ({m, amount, len, r, time, phase}: {m: Mats; amount: number; len: number; r: number; time: number; phase: number}) => {
  if (amount <= 0.01) return null;
  const pulse = 0.75 + 0.25 * Math.sin(time * 6 + phase);
  return (
    <mesh material={m.painGlow} position={[0, -len / 2, 0]} scale={[1, amount, 1]} renderOrder={19}>
      <cylinderGeometry args={[r * 1.35 * pulse + r * 0.1, r * 1.35 * pulse, len, 8]} />
    </mesh>
  );
};

/** Zwei kleine Bisspunkte an der Wade (außen hinten) – kein Blut, keine Wunde */
const BiteMarks = ({m, side}: {m: Mats; side: 1 | -1}) => {
  const ang = Math.atan2(0.75 * side, -0.66); // Richtung außen-hinten
  const r = 0.082;
  return (
    <group position={[Math.sin(ang) * r, -0.15, Math.cos(ang) * r]} rotation={[0, ang, 0]}>
      {[-1, 1].map((k) => (
        <mesh key={k} material={m.bite} position={[k * 0.022, 0, 0]}>
          <circleGeometry args={[0.011, 8]} />
        </mesh>
      ))}
    </group>
  );
};

/** Band um den Oberschenkel (wächst beim Wickeln von 0 auf 1) */
const Band = ({m, amount}: {m: Mats; amount: number}) => {
  const turns = [0, 1, 2].filter((i) => amount > i / 3);
  return (
    <group position={[0, -0.13, 0]}>
      {turns.map((i) => {
        const part = clamp(amount * 3 - i);
        return (
          <mesh key={i} material={m.band} position={[0, -i * 0.035, 0]} rotation={[Math.PI / 2, 0, i * 1.3]}>
            <torusGeometry args={[0.112 - i * 0.002, 0.018, 5, 14, Math.PI * 2 * Math.max(0.05, part)]} />
          </mesh>
        );
      })}
      {amount >= 1 && (
        <mesh material={m.band} position={[0.06, -0.06, 0.1]} rotation={[0.3, 0, 0.5]}>
          <boxGeometry args={[0.04, 0.13, 0.012]} />
        </mesh>
      )}
    </group>
  );
};

/** Sicherheitsgurt: Schultergurt (linke Schulter → rechte Hüfte), rollt sich zur Schulter hin auf */
const ShoulderBelt = ({m, amount}: {m: Mats; amount: number}) => {
  if (amount <= 0.01) return null;
  const len = 0.62;
  return (
    <group position={[0.2, 0.56, 0.1]} rotation={[0.28, 0, -0.62]}>
      <mesh material={m.belt} position={[0, (-len * amount) / 2, 0.02]}>
        <boxGeometry args={[0.075, len * amount, 0.025]} />
      </mesh>
    </group>
  );
};

const Leg = ({
  m,
  limb,
  side,
  bite = false,
  band = 0,
  sting = false,
  pain = 0,
  barefoot = false,
  time = 0,
}: {
  m: Mats;
  limb: Limb;
  side: 1 | -1;
  bite?: boolean;
  band?: number;
  sting?: boolean;
  pain?: number;
  barefoot?: boolean;
  time?: number;
}) => (
  <group position={[0.105 * side, -0.06, 0]} rotation={[limb.sx, 0, limb.sz]}>
    <Joint m={m} r={0.1} />
    <Seg m={m} len={0.43} r={0.11} r2={0.088} />
    <PainGlow m={m} amount={clamp((pain - 1.45) * 2)} len={0.43} r={0.11} time={time} phase={1.2} />
    <Marker m={m} r={0.055} position={[0.108 * side, -0.2, 0]} rotation={[0, (Math.PI / 2) * side, 0]} />
    {band > 0 && <Band m={m} amount={band} />}
    <group position={[0, -0.44, 0]} rotation={[limb.bend, 0, 0]}>
      <Joint m={m} r={0.08} />
      <Seg m={m} len={0.42} r={0.085} r2={0.065} />
      {bite && <BiteMarks m={m} side={side} />}
      <PainGlow m={m} amount={clamp((pain - 1) * 2.2)} len={0.42} r={0.085} time={time} phase={0} />
      {barefoot ? (
        <group position={[0, -0.46, 0.06]}>
          <mesh material={m.body} scale={[0.065, 0.042, 0.135]} castShadow>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          {sting && (
            <mesh material={m.sting} position={[0.012 * side, 0.043, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.013, 10]} />
            </mesh>
          )}
        </group>
      ) : (
        <mesh material={m.joint} position={[0, -0.46, 0.06]} castShadow>
          <boxGeometry args={[0.13, 0.08, 0.27]} />
        </mesh>
      )}
      {pain > 0.01 && (
        <group position={[0, -0.47, 0.07]}>
          <PainBurst m={m} pain={pain} time={time} />
        </group>
      )}
    </group>
  </group>
);

/** Spaten in der rechten Hand: Griff an der Hand (Vorwärtskinematik), Neigung unabhängig vom Unterarm */
const HeldSpade = ({pose}: {pose: DummyPose}) => {
  const L = pose.armR;
  const hand = new THREE.Vector3(0, -0.32, 0)
    .applyEuler(new THREE.Euler(L.bend, 0, pose.foreZ))
    .add(new THREE.Vector3(0, -0.31, 0))
    .applyEuler(new THREE.Euler(L.sx, 0, L.sz))
    .add(new THREE.Vector3(-0.27, 0.44, 0));
  return (
    <group position={[hand.x + 0.02, hand.y + 0.02, hand.z]} rotation={[pose.spadeTilt - pose.torsoX, -pose.torsoY, -pose.torsoZ]}>
      <Spade />
    </group>
  );
};

export const Dummy = ({
  pose,
  bite = false,
  sting = false,
  pain = 0,
  barefoot = false,
  color,
}: {
  pose: DummyPose;
  bite?: boolean;
  sting?: boolean;
  pain?: number;
  barefoot?: boolean;
  /** andere Körperfarbe (z. B. Nachbar) – sonst Gelb */
  color?: string;
}) => {
  const m = useMats(color);
  const time = useCurrentFrame() / 30;
  return (
    <group rotation={[pose.pitch, 0, 0]}>
      <group position={[0, pose.hipY, 0]}>
        {/* Becken */}
        <mesh material={m.body} scale={[1.25, 0.75, 0.85]} castShadow>
          <icosahedronGeometry args={[0.15, 1]} />
        </mesh>
        <Marker m={m} r={0.05} position={[0.19, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <Marker m={m} r={0.05} position={[-0.19, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        {pose.belt > 0.6 && (
          <mesh material={m.belt} position={[0, 0.02, 0.145]}>
            <boxGeometry args={[0.4, 0.075, 0.025]} />
          </mesh>
        )}
        <Leg m={m} limb={pose.legL} side={1} barefoot={barefoot} />
        <Leg m={m} limb={pose.legR} side={-1} bite={bite} band={pose.band} sting={sting} pain={pain} barefoot={barefoot} time={time} />
        {/* Oberkörper */}
        <group position={[0, 0.06, 0]} rotation={[pose.torsoX, pose.torsoY, pose.torsoZ]}>
          <mesh material={m.joint} position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.16, 8]} />
          </mesh>
          <mesh material={m.body} position={[0, 0.33, 0]} scale={[1.3, 1.25, 0.8]} castShadow>
            <icosahedronGeometry args={[0.18, 1]} />
          </mesh>
          <Marker m={m} r={0.06} position={[0, 0.36, 0.147]} />
          <ShoulderBelt m={m} amount={pose.belt} />
          <Arm m={m} limb={pose.armL} side={1} ice={pose.ice} />
          <Arm m={m} limb={pose.armR} side={-1} foreZ={pose.foreZ} phone={pose.phone} tweezers={pose.tweezers} smartphone={pose.smartphone} />
          {pose.spade && <HeldSpade pose={pose} />}
          {/* Hals + Kopf (ohne Gesicht) */}
          <mesh material={m.joint} position={[0, 0.58, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.055, 0.1, 6]} />
          </mesh>
          <group position={[0, 0.74, 0]} rotation={[pose.headX, pose.headY, 0]}>
            <mesh material={m.body} scale={[0.9, 1.1, 0.95]} castShadow>
              <icosahedronGeometry args={[0.13, 1]} />
            </mesh>
            <Marker m={m} r={0.05} position={[0.118, 0.01, 0]} rotation={[0, Math.PI / 2, 0]} />
            <Marker m={m} r={0.05} position={[-0.118, 0.01, 0]} rotation={[0, -Math.PI / 2, 0]} />
          </group>
        </group>
      </group>
    </group>
  );
};
