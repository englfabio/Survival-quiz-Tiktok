import type {ThreeElements} from '@react-three/fiber';
import {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut} from '../lib/anim';
import {CompressPad, PlasterStrip, SprayBottle, SprayMist, VaccinationPass} from './FirstAidProps';
import {Smartphone, Spade} from './GardenProps';
import {Bucket, Gift} from './ChristmasProps';
import {Broom, towelPoints, WetTowel} from './ShockProps';
import {ZapAura} from '../effects/Zap';
import {BoxingGlove, RescueBox, Tissue, Tooth} from './ToothProps';
import {DishTab, MilkGlass, PaperSheet, TabPack} from './TabProps';
import {Foam} from '../effects/Foam';
import {ColdWaterGlass, CoolPack} from './PanicProps';
import {BodyHint} from '../effects/BodyHint';
import {rng} from '../lib/anim';

/**
 * Crashtest-Dummy aus einfachen Körperformen. Kein Gesicht.
 * Gelb mit schwarz-gelben Kreismarkierungen. Blickt im eigenen Koordinatensystem nach +z.
 * Größe ca. 1,80 m.
 */

const YELLOW = '#f3bf12';
const JOINT = '#2a2a2c';
const BLACK = '#151515';
/** Kleidung: Winterjacke (rot) und lange Hose (dunkelblau) */
const JACKET = '#c63b2c';
const PANTS = '#34405a';

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
  /** Unterarm links seitlich (für genaues Greifen) */
  foreZL: number;
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
  /** Brustkorb hebt sich (schnelles Atmen): 0 = normal … 1 = ganz eingeatmet */
  chest: number;
  /** Gegenstand in der rechten Hand (Erste Hilfe): Pflaster, Desinfektionsspray, Kompresse, Impfpass */
  item: '' | 'plaster' | 'spray' | 'compress' | 'pass' | 'towel' | 'tooth' | 'tissue' | 'box' | 'tab' | 'milk' | 'paper' | 'tabpack' | 'finger' | 'coolpack' | 'water';
  /** Glas in der Hand kippen (Trinken): 0 = aufrecht … 1 = stark gekippt */
  cup: number;
  /** Füllstand des Glases in der Hand: 1 = voll … 0 = leer */
  fill: number;
  /** Gegenstand in beiden Händen (Feuer): Eimer mit Wasser, Geschenkpaket */
  both: '' | 'bucket' | 'gift' | 'broom';
  /** Sprühnebel aus dem Desinfektionsspray: 0 = aus … 1 = voll */
  mist: number;
  /** Bauchatmung: Bauch zeigen (Panik-Video) + wie weit er sich hebt 0 … 1 */
  bellyOn?: boolean;
  belly?: number;
  /** Fäuste ballen (Hände runder, Knöchel) */
  fists?: boolean;
  /** ruhige Atemwolken im Takt der Bauchatmung: Atemzüge (Phase, Wolke beim Ausatmen) – sonst über "breath" */
  puffPhase?: number;
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
  foreZL: 0,
  band: 0,
  phone: false,
  belt: 0,
  tweezers: false,
  ice: false,
  spade: false,
  spadeTilt: -0.25,
  smartphone: false,
  chest: 0,
  item: '',
  both: '',
  mist: 0,
  cup: 0,
  fill: 1,
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
    foreZL: L(a.foreZL ?? 0, b.foreZL ?? 0),
    band: L(a.band, b.band),
    phone: k < 0.5 ? a.phone : b.phone,
    belt: L(a.belt, b.belt),
    tweezers: k < 0.5 ? a.tweezers : b.tweezers,
    ice: k < 0.5 ? a.ice : b.ice,
    spade: k < 0.5 ? a.spade : b.spade,
    spadeTilt: L(a.spadeTilt, b.spadeTilt),
    smartphone: k < 0.5 ? a.smartphone : b.smartphone,
    chest: L(a.chest, b.chest),
    item: k < 0.5 ? a.item : b.item,
    both: k < 0.5 ? a.both : b.both,
    mist: L(a.mist, b.mist),
    cup: L(a.cup ?? 0, b.cup ?? 0),
    fill: L(a.fill ?? 1, b.fill ?? 1),
    bellyOn: k < 0.5 ? a.bellyOn : b.bellyOn,
    belly: L(a.belly ?? 0, b.belly ?? 0),
    fists: k < 0.5 ? a.fists : b.fists,
    puffPhase: k < 0.5 ? a.puffPhase : b.puffPhase,
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


// ---------- Burggraben (Kälteschock) ----------
/** Aufrecht im tiefen Wasser "Wasser treten": Beine kreisen, Hände paddeln an der Oberfläche */
const treadPose = (time: number, effort = 1): DummyPose => {
  const p = base();
  const ph = time * TAU * (0.75 + 0.35 * effort);
  const s = Math.sin(ph);
  p.legL = L3(-0.55 + 0.22 * s, 0.14, 1.25 + 0.35 * s);
  p.legR = L3(-0.55 - 0.22 * s, -0.14, 1.25 - 0.35 * s);
  p.armL = L3(-0.45 + 0.18 * s * effort, 0.95 + 0.12 * Math.cos(ph), -0.45);
  p.armR = L3(-0.45 - 0.18 * s * effort, -0.95 - 0.12 * Math.cos(ph), -0.45);
  p.torsoX = 0.04;
  p.headX = -0.15;
  return p;
};
/** Flach auf dem Rücken, Arme und Beine ausgestreckt, Kinn hoch */
const backFlat = (time: number): DummyPose => {
  const p = base();
  const scull = Math.sin(time * 1.5);
  p.pitch = -1.47 + Math.sin(time * 0.9) * 0.025;
  p.armL = L3(0.05, 1.42 + 0.07 * scull, -0.12);
  p.armR = L3(0.05, -1.42 - 0.07 * scull, -0.12);
  p.legL = L3(0.02, 0.3, 0.05);
  p.legR = L3(0.02, -0.3, 0.05);
  p.torsoX = 0.02;
  p.headX = -0.42;
  p.chest = 0.25 + 0.25 * Math.sin(time * 1.2);
  return p;
};
/** Aufrecht am Rand: beide Hände liegen oben auf der Mauerkante */
const edgeGrip = (time: number): DummyPose => {
  const p = treadPose(time, 0.4);
  p.armL = L3(-2.5, 0.22, -0.32);
  p.armR = L3(-2.5, -0.22, -0.32);
  p.torsoX = 0.12;
  p.headX = 0.05;
  return p;
};

const moatPose = (motion: Motion, time: number, speed: number): DummyPose | null => {
  switch (motion) {
    case 'cross': {
      // vorsichtig gehen, Arme leicht zur Seite (Gleichgewicht auf der Brücke)
      const p = base();
      const ph = time * TAU * Math.max(0.7, speed * 0.62);
      const s = Math.sin(ph);
      p.legL = L3(-0.36 * s, 0.04, 0.45 * Math.max(0, Math.sin(ph + 1.2)));
      p.legR = L3(0.36 * s, -0.04, 0.45 * Math.max(0, Math.sin(ph + 1.2 + Math.PI)));
      p.armL = L3(0.2 * s, 0.42, -0.35);
      p.armR = L3(-0.2 * s, -0.42, -0.35);
      p.hipY = 0.97 - 0.025 * Math.abs(Math.cos(ph));
      p.torsoX = 0.08;
      p.torsoY = 0.05 * s;
      p.headX = 0.2;
      return p;
    }
    case 'slip': {
      // Fuß rutscht weg (0–0,35 s), dann fällt er mit rudernden Armen
      const k = easeInOut(clamp(time / 0.35));
      const p = base();
      p.legR = L3(-0.95 * k, -0.08, 0.15);
      p.legL = L3(0.15 * k, 0.1, 0.55 * k);
      p.torsoX = -0.4 * k;
      p.headX = -0.35 * k;
      p.hipY = 0.98 - 0.1 * k;
      const w = time * 15;
      p.armL = L3(-0.6 * k + 0.5 * Math.sin(w) * k, 0.2 + 1.9 * k + 0.35 * Math.cos(w) * k, -0.3);
      p.armR = L3(-0.6 * k - 0.5 * Math.sin(w + 1) * k, -0.2 - 1.9 * k - 0.35 * Math.cos(w + 1) * k, -0.3);
      if (time > 0.35) {
        const f = easeInOut(clamp((time - 0.35) / 0.3));
        const b = Math.sin(time * 11);
        p.legL = L3(-0.6 - 0.4 * b * f, 0.12, 0.9 + 0.4 * b);
        p.legR = L3(-0.9 + 0.4 * b * f, -0.12, 0.6 - 0.3 * b);
        p.torsoZ = 0.12 * f;
      }
      return p;
    }
    case 'gasp': {
      // aufrecht im Wasser, schnappt schnell nach Luft: Brustkorb hebt sich, Kopf nach hinten, Schultern zucken hoch
      const p = treadPose(time, 1.2);
      const br = Math.pow((Math.sin(time * TAU * 1.5) + 1) / 2, 1.6);
      p.chest = br;
      p.torsoX = -0.1 - 0.12 * br;
      p.headX = -0.38 - 0.16 * br;
      const fl = Math.sin(time * 9.5);
      p.armL.sz += 0.25 * fl;
      p.armR.sz -= 0.25 * fl;
      p.armL.sx -= 0.25 * br;
      p.armR.sx -= 0.25 * br;
      return p;
    }
    case 'crawl': {
      // hektisch kraulen: Bauchlage, Arme kreisen schnell abwechselnd über Wasser, Kopf wirft hin und her
      const q = base();
      const cyc = 0.62;
      const th = (time / cyc) * TAU;
      q.pitch = 1.32;
      q.hipY = 0.98;
      q.torsoX = -0.18;
      q.torsoY = 0.32 * Math.sin(th);
      q.headX = -0.75;
      q.headY = 0.55 * Math.sin(th + 0.4);
      const arm = (off: number, side: 1 | -1): Limb => {
        const a = th + off;
        const sx = -Math.PI + (a % TAU);
        const rec = Math.max(0, Math.sin(a - Math.PI));
        return L3(sx, side * (0.18 + 0.35 * rec), -0.15 - 0.7 * rec);
      };
      q.armL = arm(0, 1);
      q.armR = arm(Math.PI, -1);
      const kick = Math.sin(time * TAU * 3.2);
      q.legL = L3(0.3 * kick, 0.1, 0.35 + 0.3 * Math.max(0, kick));
      q.legR = L3(-0.3 * kick, -0.1, 0.35 + 0.3 * Math.max(0, -kick));
      return q;
    }
    case 'tug': {
      // im Wasser an der Jacke zerren: rechte Hand reißt am linken Ärmel, Oberkörper dreht ruckartig
      const p = treadPose(time, 0.7);
      const j = Math.sin(time * TAU * 1.3);
      const jerk = Math.sign(j) * Math.pow(Math.abs(j), 0.4);
      p.armL = L3(-0.55 + 0.15 * jerk, 0.55 + 0.25 * jerk, -0.5);
      p.armR = L3(-1.2 - 0.1 * jerk, 0.45 - 0.3 * jerk, -1.15 + 0.25 * jerk);
      p.torsoY = 0.28 * jerk;
      p.torsoX = 0.18;
      p.headX = 0.42;
      p.headY = 0.25 * jerk;
      p.legL.bend += 0.25 * jerk;
      p.legR.bend -= 0.25 * jerk;
      return p;
    }
    case 'backfloat': {
      // legt sich in ca. 1,2 s zurück, dann ruhig treiben
      const flat = backFlat(time);
      if (time >= 1.2) return flat;
      return mix(treadPose(time, 0.6), flat, easeInOut(time / 1.2));
    }
    case 'backswim': {
      // ruhig in Rückenlage schwimmen: Arme gleiten an den Seiten hoch, strecken sich aus, ziehen zum Körper (Kopf voraus)
      const p = backFlat(time);
      const u = (time / 2.2) % 1;
      let sz: number;
      let bend: number;
      if (u < 0.45) {
        const k = easeInOut(u / 0.45);
        sz = 0.25 + 1.0 * k;
        bend = -1.2 * Math.sin(Math.PI * k);
      } else if (u < 0.55) {
        sz = 1.25 + 0.4 * easeInOut((u - 0.45) / 0.1);
        bend = 0;
      } else {
        sz = 1.65 - 1.4 * easeInOut((u - 0.55) / 0.45);
        bend = -0.1;
      }
      p.armL = L3(0.05, sz, bend);
      p.armR = L3(0.05, -sz, bend);
      const kick = Math.sin(u * TAU - 1.0);
      const kk = Math.max(0, kick);
      p.legL = L3(-0.35 * kk, 0.15 + 0.35 * kk, 1.3 * kk);
      p.legR = L3(-0.35 * kk, -0.15 - 0.35 * kk, 1.3 * kk);
      return p;
    }
    case 'edgehold':
    case 'edgewave': {
      // aus der Rückenlage aufrichten (ca. 1 s) und am Rand festhalten; "edgewave": rechts um Hilfe winken
      const hold = edgeGrip(time);
      if (motion === 'edgewave') {
        const k = easeInOut(clamp((time - 1.0) / 0.5));
        const w = Math.sin(time * 8.5);
        hold.armR = L3(-0.35 * k - 2.5 * (1 - k), -0.22 - 2.35 * k + 0.25 * w * k, -0.25);
        hold.foreZ = (-0.35 + 0.45 * w) * k;
        hold.torsoZ = 0.05 * k;
        hold.headX = 0.05 - 0.15 * k;
      }
      if (time >= 1.0) return hold;
      return mix(backFlat(time), hold, easeInOut(time / 1.0));
    }
  }
  return null;
};

// ---------- Erste Hilfe (Zombie-Biss) ----------
// Bissstelle: linker Unterarm, Oberseite. Haltungen mit Python-Vorwärtsrechnung abgestimmt:
// PRESENT_L = linker Unterarm waagerecht vor dem Körper (Mitte ca. 0,25 m vor, 1,2 m hoch), Oberseite zeigt nach oben.
const PRESENT_L = (): Limb => L3(-0.35, -0.25, -1.2);
/** rechte Hand liegt auf der Bissstelle */
const HOLD_R = (): Limb => L3(-0.4, 0.95, -0.65);
/** rechte Hand ca. 20 cm über der Bissstelle (Sprühen, Pflaster/Kompresse bereithalten) */
const ABOVE_R = (): Limb => L3(-0.3, 1.25, -1.05);
/** Unterarm unter dem Wasserhahn (Oberkörper 0,3 nach vorn gebeugt) */
const SINK_L = (): Limb => L3(-0.5, -0.2, -1.35);
const mixLimb = (a: Limb, b: Limb, k: number): Limb => ({sx: lerpN(a.sx, b.sx, k), sz: lerpN(a.sz, b.sz, k), bend: lerpN(a.bend, b.bend, k)});

/** Steht und hält den gebissenen linken Unterarm mit der rechten Hand, Blick zur Bissstelle */
const armHoldPose = (time: number): DummyPose => {
  const p = base();
  const breathe = Math.sin(time * 2.2) * 0.012;
  p.armL = PRESENT_L();
  p.armR = HOLD_R();
  p.torsoX = 0.12 + breathe;
  p.torsoY = 0.1;
  p.headX = 0.5;
  p.headY = 0.28 + Math.sin(time * 0.9) * 0.04;
  p.legL = L3(0, 0.07, 0.04);
  p.legR = L3(0, -0.07, 0.04);
  return p;
};

/** Sitzen auf Stuhl/Sofa: Sitzfläche 0,45 m hoch, Füße auf dem Boden, Hände auf den Oberschenkeln */
const chairSit = (time: number): DummyPose => {
  const p = base();
  p.hipY = 0.56;
  p.legL = L3(-1.57, 0.08, 1.5);
  p.legR = L3(-1.57, -0.08, 1.5);
  p.torsoX = -0.1 + Math.sin(time * 2.2) * 0.01;
  p.headX = 0.08;
  p.armL = L3(-0.62, 0.04, -0.75);
  p.armR = L3(-0.62, -0.04, -0.75);
  return p;
};

/** Sprühstöße: 0 … 1 (drei kurze Stöße ab 0,5 s) */
const sprayPulses = (time: number) => {
  let m = 0;
  for (const s of [0.5, 1.15, 1.8]) {
    const u = (time - s) / 0.4;
    if (u > 0 && u < 1) m = Math.max(m, Math.sin(Math.PI * u));
  }
  return m;
};

const firstAidPose = (motion: Motion, time: number, _speed: number): DummyPose | null => {
  switch (motion) {
    case 'armflinch': {
      // gebissen: Arm zurückreißen (0–0,15 s), Zittern, dann Unterarm halten und hinschauen
      const yank = base();
      yank.hipY = 1.02;
      yank.armL = L3(-1.1, 0.55, -1.9);
      yank.armR = L3(-0.3, -0.45, -0.5);
      yank.torsoX = -0.18;
      yank.torsoY = 0.25;
      yank.headX = -0.15;
      yank.headY = 0.3;
      if (time < 0.15) return mix(base(), yank, easeInOut(time / 0.15));
      const shake = Math.sin(time * 40) * 0.05 * Math.max(0, 1 - (time - 0.15) / 0.5);
      if (time < 0.3) {
        yank.torsoX += shake;
        return yank;
      }
      const q = mix(yank, armHoldPose(time), easeInOut(clamp((time - 0.3) / 0.55)));
      q.torsoX += shake;
      return q;
    }
    case 'armhold':
      return armHoldPose(time);
    case 'armlook': {
      // steht, hält den linken Unterarm vor sich und schaut auf die Bissstelle (rechte Hand locker unten)
      const q = armHoldPose(time);
      q.armR = L3(-0.15, -0.12, -0.3);
      q.torsoY = 0.05;
      return q;
    }
    case 'applyplaster': {
      // Pflaster über die Bissstelle (bis 0,45 s), aufdrücken (bis 0,85 s), glattstreichen, Arm sinken lassen (ab 1,5 s)
      const hold = armHoldPose(time);
      const above = armHoldPose(time);
      above.armR = ABOVE_R();
      let q: DummyPose;
      if (time < 0.45) q = mix(hold, above, easeInOut(time / 0.45));
      else if (time < 0.85) q = mix(above, hold, easeInOut((time - 0.45) / 0.4));
      else if (time < 1.5) {
        q = hold;
        const st = Math.sin((time - 0.85) * TAU * 2.3);
        q.armR = L3(-0.4 - 0.08 * st, 0.95, -0.65 + 0.12 * st);
      } else {
        const end = base();
        end.torsoX = -0.03;
        end.headX = 0.05;
        end.armL = L3(-0.2, 0.12, -0.5);
        q = mix(hold, end, easeInOut(clamp((time - 1.5) / 0.5)));
      }
      q.item = time < 0.85 ? 'plaster' : '';
      return q;
    }
    case 'couchsit':
    case 'chairsit':
      return chairSit(time);
    case 'couchwait': {
      // sitzt zurückgelehnt auf dem Sofa, wartet: trommelt mit den Fingern, schaut abwechselnd zur Uhr und zum Arm
      const q = chairSit(time);
      q.torsoX = -0.24 + Math.sin(time * 1.6) * 0.012;
      q.armL = L3(-0.95, -0.05, -0.75);
      q.armR = L3(-0.55, -0.06, -0.78 + 0.07 * Math.max(0, Math.sin(time * 15)));
      const look = (Math.sin(time * 0.75) + 1) / 2;
      q.headY = lerpN(-0.45, 0.3, look);
      q.headX = lerpN(-0.05, 0.45, look);
      q.chest = 0.3 * Math.max(0, Math.sin(time * 0.5));
      return q;
    }
    case 'showpass': {
      // sitzt und hält mit rechts den Impfpass nach vorn (zeigt ihn dem Arzt)
      const q = chairSit(time);
      const k = easeInOut(clamp(time / 0.6));
      q.armR = mixLimb(q.armR, L3(-1.05, 0.25, -0.55), k);
      q.armL = L3(-0.75, 0.0, -0.9);
      q.torsoX = -0.05 + 0.08 * k;
      q.headX = 0.12 + Math.sin(time * 1.4) * 0.03;
      q.item = 'pass';
      return q;
    }
    case 'chairnod': {
      // sitzt, nickt zustimmend und erklärt mit der rechten Hand (z. B. Arzt)
      const q = chairSit(time);
      q.torsoX = 0.05;
      q.headX = 0.1 + 0.13 * Math.max(0, Math.sin(time * 5.2)) * (Math.sin(time * 0.9) > -0.3 ? 1 : 0);
      q.armR = L3(-0.9 + 0.12 * Math.sin(time * 2.1), -0.15, -1.1 + 0.15 * Math.sin(time * 2.6));
      q.foreZ = 0.2 * Math.sin(time * 2.1);
      return q;
    }
    case 'rinse': {
      // vorgebeugt am Waschbecken, linker Unterarm unter dem Wasserstrahl, rechte Hand spült/reibt sanft
      const q = base();
      const k = easeInOut(clamp(time / 0.6));
      q.torsoX = 0.3 * k;
      q.hipY = 0.97;
      q.legL = L3(-0.08, 0.08, 0.1);
      q.legR = L3(0.04, -0.08, 0.06);
      q.armL = mixLimb(base().armL, SINK_L(), k);
      const r = (Math.sin(time * 5.5) + 1) / 2;
      q.armR = mixLimb(base().armR, L3(lerpN(-0.6, -0.3, r), lerpN(1.0, 1.1, r), -0.6), k);
      q.headX = 0.55 * k;
      q.headY = 0.15 * k;
      return q;
    }
    case 'disinfect': {
      // hält den Unterarm vor sich, sprüht mit rechts drei Stöße Desinfektionsspray auf die Bissstelle
      const q = armHoldPose(time);
      const k = easeInOut(clamp(time / 0.4));
      q.armR = mixLimb(HOLD_R(), ABOVE_R(), k);
      q.armR.bend += 0.05 * sprayPulses(time);
      q.item = 'spray';
      q.mist = sprayPulses(time);
      return q;
    }
    case 'compress': {
      // Kompresse auflegen (bis 0,9 s), mit Mullbinde umwickeln (bis 2,4 s), andrücken
      const q = armHoldPose(time);
      if (time < 0.45) q.armR = mixLimb(HOLD_R(), ABOVE_R(), easeInOut(time / 0.45));
      else if (time < 0.9) q.armR = mixLimb(ABOVE_R(), HOLD_R(), easeInOut((time - 0.45) / 0.45));
      else if (time < 2.4) {
        const ph = (time - 0.9) * TAU * 1.4;
        q.armR = L3(-0.42, 0.95 + 0.22 * Math.cos(ph), -0.7 - 0.3 * Math.sin(ph));
      } else q.armR = HOLD_R();
      q.item = time < 0.9 ? 'compress' : '';
      return q;
    }
  }
  return null;
};

/** Berechnet die Körperhaltung für eine Bewegung. time = Sekunden seit Bewegungsbeginn. */
// ---------- Feuer (Weihnachtsbaum-Brand) ----------
/** Arme abwehrend/erschrocken vor Brust und Gesicht */
const shieldArms = (p: DummyPose, k: number, jit = 0) => {
  p.armL = L3(-1.35 * k + jit, 0.1 + 0.35 * k, -0.15 - 1.25 * k);
  p.armR = L3(-1.35 * k - jit, -0.1 - 0.35 * k, -0.15 - 1.25 * k);
};

const firePose = (motion: Motion, time: number, speed: number): DummyPose | null => {
  const breathe = Math.sin(time * 2.2) * 0.012;
  switch (motion) {
    case 'recoil': {
      // Zusammenzucken (0–0,25 s), dann mit abwehrenden Armen rückwärts weichen (Weg über Zeitpunkte)
      const p = base();
      const jolt = time < 0.18 ? easeInOut(time / 0.18) : 1 - 0.5 * easeInOut(clamp((time - 0.18) / 0.5));
      const k = easeInOut(clamp(time / 0.3));
      const moving = speed > 0.05 ? 1 : 0;
      const ph = time * TAU * 0.9;
      const s = Math.sin(ph) * moving;
      p.legL = L3(0.3 * s, 0.06, 0.35 * Math.max(0, s));
      p.legR = L3(-0.3 * s, -0.06, 0.35 * Math.max(0, -s));
      p.hipY = 0.97 - 0.02 * Math.abs(s) + 0.03 * jolt * (time < 0.4 ? 1 : 0);
      p.torsoX = -0.22 * jolt - 0.08 * k;
      p.headX = -0.25 * jolt - 0.05 * k;
      shieldArms(p, k, Math.sin(time * 17) * 0.05 * Math.max(0, 1 - time / 1.2));
      return p;
    }
    case 'runbucket': {
      // rennen, Eimer mit beiden Händen vor dem Bauch
      const p = dummyPose('run', time, speed);
      p.armL = L3(-0.55 + 0.06 * Math.sin(time * 9), -0.18, -1.05);
      p.armR = L3(-0.55 + 0.06 * Math.sin(time * 9), 0.18, -1.05);
      p.torsoX = 0.22;
      p.headX = -0.05;
      p.both = 'bucket';
      return p;
    }
    case 'pullgift': {
      // kniet, greift unter den Baum, zieht ein Geschenk heraus, legt es zur Seite – wiederholt sich (1,8 s)
      const kneel = kneelPose();
      kneel.torsoX = 0.6;
      kneel.headX = -0.15;
      if (time < 0.7) {
        const st = base();
        return mix(st, kneel, easeInOut(time / 0.7));
      }
      const u = ((time - 0.7) % 1.8) / 1.8;
      const reach = L3(-1.45, 0.12, -0.1);
      const reachR = L3(-1.45, -0.12, -0.1);
      const pull = L3(-0.75, 0.15, -0.85);
      const pullR = L3(-0.75, -0.15, -0.85);
      const side = L3(-0.6, 0.55, -0.6);
      const sideR = L3(-0.75, 0.1, -0.7);
      let a: [Limb, Limb];
      let torso = 0.6;
      if (u < 0.3) {
        const k = easeInOut(u / 0.3);
        a = [mixLimb(pull, reach, k), mixLimb(pullR, reachR, k)];
        torso = 0.6 + 0.35 * k;
        kneel.both = '';
      } else if (u < 0.65) {
        const k = easeInOut((u - 0.3) / 0.35);
        a = [mixLimb(reach, pull, k), mixLimb(reachR, pullR, k)];
        torso = 0.95 - 0.45 * k;
        kneel.both = 'gift';
      } else if (u < 0.85) {
        const k = easeInOut((u - 0.65) / 0.2);
        a = [mixLimb(pull, side, k), mixLimb(pullR, sideR, k)];
        torso = 0.5;
        kneel.torsoY = 0.45 * k;
        kneel.both = 'gift';
      } else {
        const k = easeInOut((u - 0.85) / 0.15);
        a = [mixLimb(side, pull, k), mixLimb(sideR, pullR, k)];
        kneel.torsoY = 0.45 * (1 - k);
        kneel.both = '';
      }
      kneel.armL = a[0];
      kneel.armR = a[1];
      kneel.torsoX = torso;
      kneel.headX = -0.2 + Math.sin(time * 5) * 0.04;
      return kneel;
    }
    case 'closedoor': {
      // rechte Hand greift den Griff vorne rechts (0–0,4 s), zieht die Tür zu (bis 1,2 s), lässt los
      const p = base();
      const reach = L3(-1.45, -0.25, -0.15);
      const pulled = L3(-0.9, -0.05, -0.95);
      let r: Limb;
      if (time < 0.4) r = mixLimb(p.armR, reach, easeInOut(time / 0.4));
      else if (time < 1.2) r = mixLimb(reach, pulled, easeInOut((time - 0.4) / 0.8));
      else r = mixLimb(pulled, base().armR, easeInOut(clamp((time - 1.2) / 0.5)));
      p.armR = r;
      const lean = time < 0.4 ? easeInOut(time / 0.4) : time < 1.2 ? 1 - 0.6 * easeInOut((time - 0.4) / 0.8) : 0.4 * (1 - easeInOut(clamp((time - 1.2) / 0.5)));
      p.torsoX = 0.15 * lean + breathe;
      p.torsoY = -0.15 * lean;
      p.headX = 0.1 * lean;
      p.legR = L3(-0.25 * lean, -0.05, 0.1 * lean);
      return p;
    }
    case 'callwave': {
      // Handy rechts am Ohr, links groß winken
      const p = gardenPose('call', time, speed)!;
      const k = easeInOut(clamp((time - 0.2) / 0.5));
      p.armL = L3(-0.3 * k, 0.1 + 2.4 * k + Math.sin(time * 8) * 0.35 * k, -0.25 - 0.2 * Math.sin(time * 8 + 0.8) * k);
      p.torsoZ = -0.06 * k;
      return p;
    }
  }
  return null;
};

// ---------- Strom (Zitteraal) ----------
/**
 * Bewegungen für Strom-Szenen:
 *  - stuck:      hängt mit der rechten Hand fest (Arm gestreckt nach vorn, ca. 1,15 m hoch), linker Arm zappelt,
 *                lehnt sich leicht zurück. Zittern + Blitze kommen über den Wert "zap".
 *  - grabarms:   greift von hinten mit beiden Händen nach vorn (Oberarme der Person vor ihm, 0–0,45 s), zieht dann
 *  - towelswing: nasses Handtuch rechts: ausholen (0–0,45 s), Schlag nach vorn (bis 0,7 s, Treffer ca. 1,2 m hoch)
 *  - switchoff:  rechte Hand zum Schalter vorn (0–0,45 s, ca. 1,39 m hoch, 0,67 m vor ihm, 0,28 m rechts), nach unten
 *                drücken (bis 0,7 s, auf ca. 1,30 m), loslassen ab 1,0 s
 *  - broompush:  Besen mit beiden Händen waagrecht nach vorn, schiebt (Stoß alle 1,4 s)
 *  - kneelcall:  kniet (in 0,7 s), Handy rechts am Ohr, linke Hand vorn unten (z. B. auf der Schulter der Person)
 */
const stromPose = (motion: Motion, time: number): DummyPose | null => {
  const breathe = Math.sin(time * 2.2) * 0.012;
  switch (motion) {
    case 'stuck': {
      const p = base();
      p.armR = L3(-1.05 + Math.sin(time * 5) * 0.02, -0.06, -0.05);
      p.armL = L3(-0.5 + Math.sin(time * 6.3) * 0.35, 0.75 + Math.sin(time * 4.1) * 0.35, -0.7 + Math.sin(time * 5.2) * 0.3);
      p.torsoX = -0.06;
      p.torsoY = -0.12;
      p.headX = -0.22 + Math.sin(time * 3.3) * 0.06;
      p.headY = 0.1;
      p.hipY = 0.95;
      p.legL = L3(0.12, 0.08, 0.15);
      p.legR = L3(-0.08, -0.08, 0.12);
      return p;
    }
    case 'grabarms': {
      const p = base();
      const k = easeInOut(clamp(time / 0.45));
      const pull = easeInOut(clamp((time - 0.45) / 0.5));
      p.armL = mixLimb(p.armL, L3(-1.1 + 0.1 * pull, -0.1, -0.4 - 0.25 * pull), k);
      p.armR = mixLimb(p.armR, L3(-1.1 + 0.1 * pull, 0.1, -0.4 - 0.25 * pull), k);
      p.torsoX = 0.12 * k - 0.22 * pull + breathe;
      p.headX = -0.05 * k;
      p.legL = L3(-0.25 * k + 0.1 * pull, 0.06, 0.1);
      p.legR = L3(0.3 * pull, -0.06, 0.2 * pull);
      p.hipY = 0.98 - 0.04 * pull;
      return p;
    }
    case 'towelswing': {
      const p = base();
      p.item = 'towel';
      const rest = L3(-0.35, -0.1, -0.6);
      const wind = L3(-3.35, -0.12, -0.55);
      const hit = L3(-1.6, -0.02, -0.08);
      let r: Limb;
      let twist = 0;
      let lean = 0;
      if (time < 0.45) {
        const k = easeInOut(time / 0.45);
        r = mixLimb(rest, wind, k);
        twist = -0.35 * k;
        lean = -0.1 * k;
      } else if (time < 0.7) {
        const k = easeInOut((time - 0.45) / 0.25);
        r = mixLimb(wind, hit, k);
        twist = -0.35 + 0.5 * k;
        lean = -0.1 + 0.32 * k;
      } else {
        r = hit;
        twist = 0.15;
        lean = 0.22;
      }
      p.armR = r;
      p.armL = L3(-0.7, 0.25, -0.5);
      p.torsoY = twist;
      p.torsoX = lean;
      p.headX = 0.1;
      const step = easeInOut(clamp((time - 0.4) / 0.3));
      p.legR = L3(-0.35 * step, -0.05, 0.1 * step);
      p.legL = L3(0.2 * step, 0.05, 0.05);
      p.hipY = 0.98 - 0.03 * step;
      return p;
    }
    case 'switchoff': {
      const p = base();
      const reach = L3(-1.45, -0.02, -0.12);
      const down = L3(-1.33, -0.02, -0.12);
      let r: Limb;
      if (time < 0.45) r = mixLimb(p.armR, reach, easeInOut(time / 0.45));
      else if (time < 0.7) r = mixLimb(reach, down, easeInOut((time - 0.45) / 0.25));
      else if (time < 1.0) r = down;
      else r = mixLimb(down, base().armR, easeInOut(clamp((time - 1.0) / 0.4)));
      p.armR = r;
      const lean = time < 1.0 ? easeInOut(clamp(time / 0.45)) : 1 - easeInOut(clamp((time - 1.0) / 0.4));
      p.torsoX = 0.08 * lean + breathe;
      p.headX = -0.18 * lean;
      return p;
    }
    case 'broompush': {
      const p = base();
      p.both = 'broom';
      const k = easeInOut(clamp(time / 0.4));
      const ph = Math.max(0, time - 0.4);
      const push = 0.5 - 0.5 * Math.cos((ph / 1.4) * TAU);
      p.armL = mixLimb(p.armL, L3(-1.15 - 0.25 * push, -0.05, -0.35 + 0.25 * push), k);
      p.armR = mixLimb(p.armR, L3(-0.55 - 0.25 * push, 0.2, -1.05 + 0.3 * push), k);
      p.torsoX = (0.12 + 0.1 * push) * k;
      p.legL = L3(-0.3 * k, 0.06, 0.12 * k);
      p.legR = L3(0.25 * k, -0.06, 0.05);
      p.hipY = 0.98 - 0.04 * k;
      return p;
    }
    case 'kneelcall': {
      const kneel = kneelPose();
      kneel.torsoX = 0.18;
      kneel.headX = 0.05;
      const st = base();
      const k = easeInOut(clamp(time / 0.7));
      const p = mix(st, kneel, k);
      const c = easeInOut(clamp((time - 0.6) / 0.6));
      p.armR = L3(-2.0 * c - 0.3 * (1 - c), -0.1 + 0.4 * c, -0.15 - 2.15 * c);
      p.smartphone = c > 0.15;
      p.armL = L3(-1.0 * k + Math.sin(time * 1.7) * 0.04, 0.12, -0.35 * k);
      p.headY = 0.12 * c;
      p.headX = 0.1 * c + Math.sin(time * 1.6) * 0.03 + 0.05;
      return p;
    }
  }
  return null;
};

// ---------- Zahnunfall (Känguru) ----------
/** Punkt (im Dummy-System: Ursprung am Boden, +z = vorn) → Oberkörper-System der Haltung */
const torsoLocal = (p: DummyPose, v: THREE.Vector3) =>
  v
    .clone()
    .applyEuler(new THREE.Euler(-p.pitch, 0, 0))
    .sub(new THREE.Vector3(0, p.hipY + 0.06, 0))
    .applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(p.torsoX, p.torsoY, p.torsoZ)).invert());

/**
 * Arm so ausrichten, dass die Hand (along = Abstand ab Ellbogen, 0,33 = Handmitte) den Punkt target trifft.
 * target im Dummy-System (Ursprung am Boden zwischen den Füßen, +z = vorn, rechte Hand liegt bei −x).
 * Zwei-Gelenk-Rechnung: Ellbogen zeigt in Richtung "pole" (Oberkörper-System, Standard: unten, leicht außen + hinten).
 * Ergebnis: Oberarm (sx, sz), Ellbogen (bend) und seitliche Unterarm-Drehung (foreZ).
 */
const reach = (p: DummyPose, side: 1 | -1, target: [number, number, number], along = 0.33, pole: [number, number, number] = [0.45, -1, -0.35]): {limb: Limb; fz: number} => {
  const T = torsoLocal(p, new THREE.Vector3(...target));
  const S = new THREE.Vector3(0.27 * side, 0.44, 0);
  const a = 0.31;
  const b = along;
  const d0 = T.clone().sub(S);
  const d = Math.min(Math.max(d0.length(), Math.abs(a - b) + 0.01), (a + b) * 0.999);
  const n = d0.normalize();
  const pv = new THREE.Vector3(pole[0] * side, pole[1], pole[2]);
  const perp = pv.sub(n.clone().multiplyScalar(pv.dot(n))).normalize();
  const ca = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const al = Math.acos(ca);
  const E = S.clone().add(n.clone().multiplyScalar(a * Math.cos(al))).add(perp.clone().multiplyScalar(a * Math.sin(al)));
  const H = S.clone().add(n.clone().multiplyScalar(d));
  const u = E.clone().sub(S).normalize();
  const sz = Math.asin(clamp(u.x, -1, 1));
  const sx = Math.atan2(-u.z, -u.y);
  const f = H.clone().sub(E).normalize();
  // Unterarm-Richtung ins Oberarm-System (R = Rx(sx)·Rz(sz) → R⁻¹ = Rz(−sz)·Rx(−sx))
  const fl = f.applyEuler(new THREE.Euler(-sx, 0, 0)).applyEuler(new THREE.Euler(0, 0, -sz));
  const fz = Math.asin(clamp(fl.x, -1, 1));
  const bend = Math.atan2(-fl.z, -fl.y);
  return {limb: {sx, sz, bend}, fz};
};
/** Rechte Hand an einen Punkt (setzt armR + foreZ) */
const reachR = (p: DummyPose, target: [number, number, number], along = 0.33, pole?: [number, number, number]) => {
  const r = reach(p, -1, target, along, pole);
  p.armR = r.limb;
  p.foreZ = r.fz;
};
/** Linke Hand an einen Punkt (setzt armL + foreZL) */
const reachL = (p: DummyPose, target: [number, number, number], along = 0.33, pole?: [number, number, number]) => {
  const r = reach(p, 1, target, along, pole);
  p.armL = r.limb;
  p.foreZL = r.fz;
};

/**
 *  - boxguard:    Boxhaltung, Fäuste vor dem Gesicht, wippt
 *  - hitstagger:  getroffen: Kopf fliegt zurück (0–0,25 s), Arme fliegen auseinander, taumelt (Weg über Zeitpunkte),
 *                 ab ca. 1,4 s benommen wie "dazed"
 *  - dazed:       benommen stehen, schwankt, linke Hand am Mund
 *  - searchkneel: hinknien (0,7 s), mit beiden Händen im Gras suchen, Kopf schaut hin und her
 *  - pickcrown:   kniet; rechte Hand greift den Zahn ca. 0,5 m vor ihm am Boden an der Krone (bis 0,9 s),
 *                 hebt ihn vor die Augen (bis 1,7 s, Zahn ca. 0,35 m vor ihm auf 1,05 m Höhe)
 *  - holdtooth:   steht und hält den Zahn mit spitzen Fingern vor sich (ca. 0,35 m vor ihm, 1,3 m hoch)
 *  - rinsetooth:  vorgebeugt, beide Hände unter dem Wasserhahn (Hände ca. 0,45 m vor ihm auf 0,85 m Höhe), reibt den Zahn
 *  - wraptooth:   linke Hand hält das Taschentuch (0,33 m vor ihm, 1,0 m hoch), rechte Hand faltet (Wert "wrap" am Dummy)
 *  - placetooth:  legt den Zahn ab: Ablagestelle 0,42 m vor ihm, 0,1 m rechts, 0,72 m hoch (Hand dort bei 0,7 s,
 *                 loslassen bei 0,8 s, zurück bis 1,3 s)
 *  - dentalsit:   halb liegend im Behandlungsstuhl (Sitz 0,5 m hoch, Lehne nach hinten), Hände auf dem Bauch
 */
export const PLACE_SPOT: [number, number, number] = [-0.1, 0.72, 0.42];
const zahnPose = (motion: Motion, time: number): DummyPose | null => {
  const breathe = Math.sin(time * 2.2) * 0.012;
  switch (motion) {
    case 'boxguard': {
      const p = base();
      const b = Math.abs(Math.sin(time * 4.6));
      p.hipY = 0.93 - 0.025 * b;
      p.torsoX = 0.12 + breathe;
      p.torsoY = 0.12;
      p.headX = 0.12;
      p.legL = L3(-0.28, 0.08, 0.3);
      p.legR = L3(0.2, -0.08, 0.28);
      const jab = 0.03 * Math.sin(time * 3);
      reachL(p, [0.12, 1.5 + jab, 0.36 + jab], 0.28, [0.6, -1, 0.1]);
      reachR(p, [-0.1, 1.42 - jab, 0.28], 0.28, [0.6, -1, 0.1]);
      return p;
    }
    case 'hitstagger': {
      const p = base();
      const hit = easeInOut(clamp(time / 0.22));
      const rec = easeInOut(clamp((time - 0.5) / 0.9));
      const k = hit * (1 - rec);
      p.headX = -0.75 * k + 0.15 * rec;
      p.headY = 0.3 * k;
      p.torsoX = -0.38 * k + 0.08 * rec;
      p.torsoZ = 0.12 * k + Math.sin(time * 5) * 0.06 * (1 - rec * 0.5);
      p.armL = mixLimb(L3(-0.6, 0.9, -0.6), L3(-1.0, -0.45, -2.3), rec);
      p.armR = mixLimb(L3(-0.4, -1.0, -0.4), L3(0, -0.12, -0.25), rec);
      const step = Math.sin(time * 9) * (1 - rec);
      p.legL = L3(0.35 * step, 0.1, 0.25 * Math.max(0, step));
      p.legR = L3(-0.35 * step, -0.1, 0.25 * Math.max(0, -step));
      p.hipY = 0.96 - 0.04 * k;
      if (time > 1.4) return mix(p, zahnPose('dazed', time - 1.4)!, easeInOut(clamp((time - 1.4) / 0.4)));
      return p;
    }
    case 'dazed': {
      const p = base();
      p.torsoZ = Math.sin(time * 1.6) * 0.07;
      p.torsoX = 0.06 + Math.sin(time * 1.1) * 0.03;
      p.headX = 0.18 + Math.sin(time * 1.3) * 0.06;
      p.headY = Math.sin(time * 0.9) * 0.2;
      p.headY += 0;
      reachL(p, [0.13, 1.64, 0.1], 0.3, [0.8, -1, 0]);
      p.armR = L3(0, -0.12, -0.25 + Math.sin(time * 1.6) * 0.1);
      p.legL = L3(0.05, 0.12, 0.05);
      p.legR = L3(-0.05, -0.12, 0.08);
      p.hipY = 0.97;
      return p;
    }
    case 'searchkneel': {
      const kneel = kneelPose();
      kneel.torsoX = 0.75;
      const k = easeInOut(clamp(time / 0.7));
      const p = mix(base(), kneel, k);
      const s = Math.max(0, time - 0.6);
      const sw = Math.sin(s * 3.2);
      p.armL = mixLimb(p.armL, L3(-0.95 + 0.15 * sw, 0.15 + 0.25 * sw, -0.35), k);
      p.armR = mixLimb(p.armR, L3(-0.95 - 0.15 * sw, -0.15 + 0.25 * sw, -0.35), k);
      p.headY = 0.45 * Math.sin(s * 1.4) * k;
      p.headX = 0.35 * k;
      p.torsoY = 0.12 * Math.sin(s * 1.4) * k;
      return p;
    }
    case 'pickcrown': {
      const kneel = kneelPose();
      const k0 = easeInOut(clamp(time / 0.5));
      const up = easeInOut(clamp((time - 0.9) / 0.8));
      kneel.torsoX = 0.75 - 0.55 * up;
      kneel.headX = 0.45 - 0.05 * up;
      const p = mix(base(), kneel, k0);
      const ground: [number, number, number] = [-0.08, 0.06, 0.52];
      const eye: [number, number, number] = [-0.08, 1.1, 0.44];
      const g = easeInOut(clamp(time / 0.9));
      const rest: [number, number, number] = [-0.2, 0.55, 0.3];
      const lerp3 = (a: [number, number, number], b: [number, number, number], q: number) => a.map((v, i) => v + (b[i] - v) * q) as [number, number, number];
      reachR(p, time < 0.9 ? lerp3(rest, ground, g) : lerp3(ground, eye, up), 0.36);
      p.armL = L3(-0.75, 0.2, -0.5 - 0.6 * up);
      p.item = time > 0.85 ? 'tooth' : '';
      return p;
    }
    case 'holdtooth': {
      const p = base();
      p.torsoX = 0.04 + breathe;
      p.headX = 0.32;
      reachR(p, [-0.04, 1.3 + Math.sin(time * 1.5) * 0.01, 0.36], 0.36);
      p.armL = L3(-0.3, 0.12, -0.5);
      p.item = 'tooth';
      return p;
    }
    case 'rinsetooth': {
      const p = base();
      p.torsoX = 0.38 + breathe;
      p.headX = 0.35;
      p.hipY = 0.96;
      p.legL = L3(-0.08, 0.08, 0.06);
      p.legR = L3(0.1, -0.08, 0.08);
      const rub = Math.sin(time * 9) * 0.025;
      reachR(p, [-0.03 + rub, 0.86, 0.45], 0.36);
      reachL(p, [0.05 - rub, 0.84, 0.43], 0.33);
      p.item = 'tooth';
      return p;
    }
    case 'wraptooth': {
      const p = base();
      p.torsoX = 0.1 + breathe;
      p.headX = 0.4;
      reachL(p, [0.04, 1.0, 0.33], 0.36);
      const c = Math.min(1, time / 0.5);
      reachR(p, [-0.03 + Math.sin(time * 5) * 0.04 * c, 1.1 + Math.cos(time * 5) * 0.02 * c, 0.33], 0.36);
      p.item = 'tissue';
      return p;
    }
    case 'placetooth': {
      const p = base();
      const k = easeInOut(clamp(time / 0.7));
      const back = easeInOut(clamp((time - 0.85) / 0.45));
      const lean = k * (1 - back);
      p.torsoX = 0.42 * lean + breathe;
      p.headX = 0.25 + 0.2 * lean;
      p.hipY = 0.98 - 0.03 * lean;
      const start: [number, number, number] = [-0.04, 1.2, 0.33];
      const tgt: [number, number, number] = [PLACE_SPOT[0], PLACE_SPOT[1] + 0.05, PLACE_SPOT[2]];
      const mixT = (a: [number, number, number], b: [number, number, number], q: number) => a.map((v, i) => v + (b[i] - v) * q) as [number, number, number];
      reachR(p, mixT(start, tgt, lean), 0.36);
      p.armL = L3(-0.3, 0.12, -0.5);
      p.item = time < 0.8 ? 'tooth' : '';
      return p;
    }
    case 'dentalsit': {
      const p = base();
      p.hipY = 0.6;
      p.pitch = -0.55;
      p.legL = L3(-1.0, 0.06, 0.75);
      p.legR = L3(-1.0, -0.06, 0.75);
      p.torsoX = 0.1 + breathe * 0.5;
      p.headX = 0.08 + Math.sin(time * 0.8) * 0.03;
      p.armL = L3(-0.35, -0.12, -1.25);
      p.armR = L3(-0.35, 0.12, -1.25);
      return p;
    }
  }
  return null;
};


// ---------- Spülmaschinentab (Vergiftung) ----------
/**
 *  - tabstare:    erschrocken: zuckt zurück (0–0,3 s), hält den angebissenen Tab mit rechts vor sich (ca. 0,34 m vor ihm,
 *                 1,42 m hoch) und starrt darauf, linke Hand erschrocken erhoben, leichtes Zittern
 *  - fingermouth: führt die rechte Hand mit ausgestrecktem Finger bis kurz vor den Mund (bis 1,0 s) und zögert dort
 *                 (nur angedeutet – der Finger geht NICHT in den Mund), linke Hand am Bauch
 *  - drinkmilk:   hebt das Glas Milch zum Mund (bis 0,8 s), kippt es (0,8–1,4 s), Kopf nach hinten, trinkt (Glas leert sich bis 3,2 s)
 *  - spit:        beugt sich vor, hält mit rechts ein Blatt Küchenpapier vor den Mund (bis 0,6 s), spuckt bei 0,9 / 1,6 / 2,3 s
 *  - stowtabs:    steht links vor dem Oberschrank, hebt die Tab-Packung mit rechts hinein (0,24 m rechts, 0,5 m vor ihm, 1,68 m hoch,
 *                 Hand dort bei 0,9 s, loslassen bei 1,0 s), drückt die Tür zu (1,2–1,7 s), Hand runter bis 2,3 s
 */
const L3t = (sx: number, sz: number, bend: number): Limb => ({sx, sz, bend});
type P3 = [number, number, number];
const lerp3t = (a: P3, b: P3, q: number) => a.map((v, i) => v + (b[i] - v) * q) as P3;
const tabPose = (motion: Motion, time: number): DummyPose | null => {
  const breathe = Math.sin(time * 2.2) * 0.012;
  switch (motion) {
    case 'tabstare': {
      const p = base();
      const jolt = easeInOut(clamp(time / 0.18)) * (1 - easeInOut(clamp((time - 0.25) / 0.6)));
      const tr = Math.sin(time * 31) * 0.004 + Math.sin(time * 23) * 0.003;
      p.torsoX = -0.04 - 0.12 * jolt + breathe;
      p.headX = 0.3 - 0.25 * jolt + Math.sin(time * 1.3) * 0.02;
      p.headY = Math.sin(time * 0.9) * 0.05;
      p.legL = L3t(-0.06, 0.08, 0.04);
      p.legR = L3t(0.06, -0.08, 0.04);
      reachR(p, [-0.03 + tr, 1.58 + tr + 0.05 * jolt, 0.44], 0.36);
      reachL(p, [0.2, 1.62 + 0.06 * jolt, 0.22], 0.3);
      p.item = 'tab';
      return p;
    }
    case 'fingermouth': {
      const p = base();
      const k = easeInOut(clamp(time / 1.0));
      const hes = time > 1.0 ? Math.sin((time - 1.0) * 4.5) * 0.012 : 0;
      p.torsoX = 0.03 + breathe;
      p.headX = -0.06 * k;
      const rest: P3 = [-0.22, 1.0, 0.12];
      const near: P3 = [-0.035, 1.68 + hes * 0.5, 0.27 + hes];
      reachR(p, lerp3t(rest, near, k), 0.33, [0.7, -1, -0.1]);
      reachL(p, [0.08, 1.12, 0.2], 0.33);
      p.item = k > 0.25 ? 'finger' : '';
      return p;
    }
    case 'drinkmilk': {
      const p = base();
      const up = easeInOut(clamp(time / 0.8));
      const tilt = easeInOut(clamp((time - 0.8) / 0.6));
      p.torsoX = -0.05 * tilt + breathe;
      p.headX = 0.15 * (1 - up) - 0.42 * tilt;
      const low: P3 = [-0.07, 1.2, 0.33];
      const mouth: P3 = [-0.03, 1.6 + 0.04 * tilt, 0.3 - 0.03 * tilt];
      reachR(p, lerp3t(low, mouth, up), 0.33);
      p.armL = L3t(-0.1, 0.12, -0.3);
      p.item = 'milk';
      p.cup = tilt;
      p.fill = 1 - 0.85 * clamp((time - 1.1) / 2.1);
      return p;
    }
    case 'spit': {
      const p = base();
      const k = easeInOut(clamp(time / 0.6));
      let pulse = 0;
      for (const s0 of [0.9, 1.6, 2.3]) {
        const d = time - s0;
        if (d > -0.15 && d < 0.35) pulse = Math.max(pulse, Math.sin(((d + 0.15) / 0.5) * Math.PI));
      }
      p.torsoX = 0.32 * k + 0.06 * pulse + breathe;
      p.headX = 0.3 * k + 0.16 * pulse;
      p.hipY = 0.98 - 0.02 * k;
      const mouth: P3 = [-0.02, 1.48 - 0.02 * pulse, 0.42 + 0.01 * pulse];
      reachR(p, lerp3t([-0.2, 1.0, 0.2], mouth, k), 0.36);
      reachL(p, lerp3t([0.2, 1.0, 0.2], [0.09, 1.44, 0.42], k), 0.33);
      p.item = 'paper';
      return p;
    }
    case 'stowtabs': {
      const p = base();
      const up = easeInOut(clamp(time / 0.9));
      const push = easeInOut(clamp((time - 1.15) / 0.55));
      const down = easeInOut(clamp((time - 1.8) / 0.5));
      p.torsoX = 0.02 + breathe;
      p.headX = -0.28 * up * (1 - down) + 0.02;
      const low: P3 = [-0.1, 1.12, 0.3];
      const shelf: P3 = [-0.24, 1.68, 0.5];
      const door: P3 = [-0.5, 1.78, 0.4];
      let tgt = lerp3t(low, shelf, up);
      if (time > 1.0) tgt = lerp3t(shelf, door, easeInOut(clamp((time - 1.0) / 0.25)));
      if (time > 1.15) tgt = lerp3t(door, [-0.36, 1.78, 0.46], push);
      if (time > 1.8) tgt = lerp3t([-0.36, 1.78, 0.46], [-0.22, 1.0, 0.12], down);
      reachR(p, tgt, 0.33, [0.6, -1, -0.3]);
      p.armL = L3t(-0.05, 0.12, -0.25);
      p.item = time < 1.0 ? 'tabpack' : '';
      return p;
    }
  }
  return null;
};

// ---------- Panikattacke (Wal im Zimmer) ----------
/**
 *  - wallpress:  Rücken an der Wand (Wand ca. 0,15 m hinter ihm), Handflächen flach an der Wand, Kopf an die Wand gedrückt,
 *                schaut zum Wal (leicht nach oben/links), zittert leicht. Schnelles Atmen über die Werte "breath" + "heave".
 *  - clench:     verkrampft: Fäuste vor der Brust (bis 0,6 s), Ellbogen raus, Kopf eingezogen, zittert immer stärker
 *  - bedsitdown: hinsetzen auf eine Sitzfläche 0,45 m (Hüfte über der Kante, ca. 1,2 s), danach = sitbreathe (Zeit ab 1,2 s)
 *  - sitbreathe: aufrecht sitzen, Hände auf dem Bauch; Atemzyklus 6 s: 0–2 s einatmen (Bauch hebt sich), 2–6 s lang ausatmen
 *                (ruhige Atemwolke beim Ausatmen). Coolpack/Wasser über die Werte "pack"/"sip" (siehe sitExtras)
 *  - uneasy:     angespannt stehen, Arme eng, Hände vor dem Bauch verschränkt, Blick wandert (Aufzug)
 *  - holdstrap:  stehen, rechte Hand hält einen Griff über dem Kopf (ca. 1,95 m), leichtes Schwanken (Bahn)
 */
/** Bauch-Atemzyklus 6 s: 2 s ein, 4 s aus → 0 … 1 */
export const calmBreath = (time: number) => {
  const c = ((time % 6) + 6) % 6;
  return c < 2 ? easeInOut(c / 2) : 1 - easeInOut((c - 2) / 4);
};
/** Rest-Haltung im Sitzen (Hände auf dem Bauch) – Zeit ab dem Hinsetzen */
const sitBreathePose = (time: number): DummyPose => {
  const p = chairSit(time);
  const b = calmBreath(time);
  p.torsoX = -0.03 - 0.02 * b;
  p.headX = 0.06 - 0.05 * b;
  p.chest = 0.15 * b;
  p.bellyOn = true;
  p.belly = b;
  p.legL = L3(-1.57, 0.1, 1.55);
  p.legR = L3(-1.57, -0.1, 1.55);
  reachR(p, [-0.06, 0.78, 0.2 + 0.03 * b], 0.36, [0.6, -1, -0.5]);
  reachL(p, [0.07, 0.8, 0.2 + 0.03 * b], 0.36, [0.6, -1, -0.5]);
  // Atemwolke beim Ausatmen (ab 2 s jedes Zyklus)
  p.puffPhase = time >= 2 ? Math.floor((time - 2) / 6) + 1 + (((time - 2) % 6) / 6) : 0;
  return p;
};
/** Wo Coolpack/Glas neben dem sitzenden Dummy liegen (rechts neben ihm, z. B. Beistelltisch 0,72 m hoch) */
export const SIT_SPOT_PACK: [number, number, number] = [-0.55, 0.78, 0.05];
export const SIT_SPOT_GLASS: [number, number, number] = [-0.55, 0.8, 0.25];
/**
 * Coolpack (pack) bzw. Wasserglas (sip) über die Sitz-Haltung mischen: 0 … 0,35 = Hand greift zur Ablage rechts neben ihm,
 * 0,35 … 1 = Coolpack in den Nacken bzw. Glas zum Mund (bei 1 gekippt). Ab 0,35 ist der Gegenstand in der Hand.
 */
export const sitExtras = (p: DummyPose, pack: number, sip: number): DummyPose => {
  const use = pack > sip ? 'pack' : 'sip';
  const k = Math.max(pack, sip);
  if (k < 0.002) return p;
  const q: DummyPose = {...p, armL: {...p.armL}, armR: {...p.armR}};
  const rest: P3 = [-0.06, 0.78, 0.22];
  const spot = use === 'pack' ? SIT_SPOT_PACK : SIT_SPOT_GLASS;
  const goal: P3 = use === 'pack' ? [-0.16, 1.26, -0.04] : [-0.02, 1.3, 0.26];
  let tgt: P3;
  if (k < 0.35) tgt = lerp3t(rest, spot, easeInOut(k / 0.35));
  else tgt = lerp3t(spot, goal, easeInOut((k - 0.35) / 0.65));
  const pole: [number, number, number] = use === 'pack' && k > 0.5 ? [1, 0.6, 0.2] : [0.7, -1, -0.2];
  reachR(q, tgt, use === 'pack' ? 0.38 : 0.33, pole);
  if (use === 'pack') {
    q.headX = p.headX + 0.18 * clamp((k - 0.5) * 2);
    q.item = k >= 0.35 ? 'coolpack' : '';
  } else {
    const tilt = clamp((k - 0.8) / 0.2);
    q.headX = p.headX - 0.35 * tilt;
    q.item = k >= 0.35 ? 'water' : '';
    q.cup = tilt;
    q.fill = 1 - 0.3 * tilt;
  }
  return q;
};
const panicPose = (motion: Motion, time: number): DummyPose | null => {
  switch (motion) {
    case 'wallpress': {
      const p = base();
      const tr = Math.sin(time * 29) * 0.006 + Math.sin(time * 37) * 0.004;
      p.hipY = 0.96;
      p.torsoX = -0.1 + tr;
      p.headX = -0.16 + Math.sin(time * 0.7) * 0.03;
      p.headY = 0.22 + Math.sin(time * 0.55) * 0.12;
      p.legL = L3(0.05, 0.1, 0.06);
      p.legR = L3(0.05, -0.1, 0.06);
      reachR(p, [-0.55 + tr, 1.3, -0.14], 0.36, [0.6, -0.9, 0.1]);
      reachL(p, [0.55 - tr, 1.33, -0.14], 0.36, [0.6, -0.9, 0.1]);
      return p;
    }
    case 'clench': {
      const p = base();
      const k = easeInOut(clamp(time / 0.6));
      const amp = (0.006 + 0.01 * clamp((time - 0.6) / 2.5)) * k;
      const tr = Math.sin(time * 31) * amp + Math.sin(time * 43) * amp * 0.7;
      p.hipY = 0.97 - 0.02 * k;
      p.torsoX = 0.14 * k + tr;
      p.headX = 0.32 * k + tr * 2;
      p.headY = Math.sin(time * 1.3) * 0.04 * k;
      p.legL = L3(-0.05 * k, 0.1, 0.1 * k);
      p.legR = L3(-0.05 * k, -0.1, 0.1 * k);
      reachR(p, lerp3t([-0.25, 0.95, 0.05], [-0.13 + tr, 1.3, 0.24], k), 0.33, [1, -0.5, -0.3]);
      reachL(p, lerp3t([0.25, 0.95, 0.05], [0.13 - tr, 1.31, 0.24], k), 0.33, [1, -0.5, -0.3]);
      p.fists = k > 0.3;
      p.chest = 0.3 * k;
      return p;
    }
    case 'bedsitdown': {
      if (time >= 1.2) return sitBreathePose(time - 1.2);
      const stand = base();
      const mid = squat();
      mid.hipY = 0.68;
      mid.torsoX = 0.35;
      if (time < 0.6) return mix(stand, mid, easeInOut(time / 0.6));
      return mix(mid, sitBreathePose(0), easeInOut((time - 0.6) / 0.6));
    }
    case 'sitbreathe':
      return sitBreathePose(time);
    case 'uneasy': {
      const p = base();
      p.torsoX = 0.03 + Math.sin(time * 3.2) * 0.012;
      p.headX = -0.12 + Math.sin(time * 0.8) * 0.08;
      p.headY = Math.sin(time * 0.6) * 0.25;
      p.legL = L3(0, 0.05, 0.03);
      p.legR = L3(0, -0.05, 0.03);
      reachR(p, [-0.03, 1.0, 0.2], 0.33);
      reachL(p, [0.04, 1.02, 0.21], 0.33);
      return p;
    }
    case 'holdstrap': {
      const p = base();
      const sway = Math.sin(time * 1.1) * 0.03;
      p.torsoZ = sway;
      p.torsoX = 0.02 + Math.sin(time * 2.6) * 0.01;
      p.headX = 0.05;
      p.headY = Math.sin(time * 0.5) * 0.15;
      p.legL = L3(0, 0.1, 0.03);
      p.legR = L3(0, -0.1, 0.03);
      reachR(p, [-0.14, 1.93, 0.06], 0.36, [0.8, 0.2, -0.3]);
      reachL(p, [0.06, 1.0, 0.2], 0.33);
      return p;
    }
  }
  return null;
};


// ---------- Magnetfischen (Granate) ----------
/**
 *  - magthrow:  Magnet an der Leine werfen: ausholen (0–0,55 s), Wurf (bis 0,8 s, loslassen ca. 0,7 s), danach Seil vorn halten
 *  - haul:      Seil Hand über Hand hochziehen (Takt 1 s), Blick nach unten ins Wasser
 *  - startle:   erschrocken erstarren: zuckt zurück (0–0,3 s), rechte Hand hält das Seil weit vor sich (Magnet + Granate hängen
 *               darunter), linke Hand abwehrend gehoben, zittert leicht
 *  - lowerset:  ganz langsam in die Hocke und das Hängende vorsichtig auf den Boden setzen (bis 1,8 s), rechte Hand dann
 *               ca. 0,55 m vor ihm auf 0,36 m Höhe
 *  - unhook:    in der Hocke: links hält die Granate fest, rechts zieht den Magneten ab (0,4–1,2 s), aufstehen bis 2,2 s
 *  - holdgren:  steht, hält die Granate mit rechts vor der Brust (links stützt), starrt darauf
 *  - windup:    hält die Granate, holt weit aus zum Werfen (0,3–1,3 s), Ausfallschritt, linker Arm zeigt nach vorn
 *  - placeseat: beugt sich durchs offene Beifahrerfenster und legt etwas auf den Sitz (Hand vorn bei 1,2 s), zurück bis 2,4 s
 *  Hand-Position für Gegenstände ("hand" am Gegenstand) = rechte Hand (rightHandLocal).
 */
export const ROPE_HOLD: P3 = [-0.1, 1.15, 0.42];
const crouchBody = (): DummyPose => {
  const p = base();
  p.hipY = 0.56;
  p.legL = L3t(-1.3, 0.2, 2.1);
  p.legR = L3t(-1.3, -0.2, 2.1);
  p.torsoX = 0.78;
  p.headX = 0.15;
  return p;
};
const startleBody = (time: number): DummyPose => {
  const p = base();
  const k = clamp(time / 0.25);
  const jolt = Math.sin(Math.PI * k) * (1 - k) * 0.6 + k;
  const tr = Math.sin(time * 31) * 0.007 + Math.sin(time * 23) * 0.005;
  p.torsoX = -0.18 * jolt + tr;
  p.headX = 0.45 - 0.12 * jolt + tr;
  p.legL = L3t(-0.08, 0.1, 0.08);
  p.legR = L3t(0.22 * jolt, -0.1, 0.12 * jolt);
  p.hipY = 0.97;
  return p;
};
const magnetPose = (motion: Motion, time: number): DummyPose | null => {
  switch (motion) {
    case 'magthrow': {
      const p = base();
      const back: P3 = [-0.36, 1.62, -0.2];
      const rest: P3 = [-0.24, 1.02, 0.28];
      const fwd: P3 = [-0.12, 1.6, 0.62];
      let tgt: P3;
      let tw = 0;
      let lean = 0;
      if (time < 0.55) {
        const k = easeInOut(time / 0.55);
        tgt = lerp3t(rest, back, k);
        tw = -0.4 * k;
        lean = -0.12 * k;
      } else if (time < 0.8) {
        const k = easeInOut((time - 0.55) / 0.25);
        tgt = lerp3t(back, fwd, k);
        tw = -0.4 + 0.62 * k;
        lean = -0.12 + 0.3 * k;
      } else {
        const k = easeInOut(clamp((time - 0.8) / 0.6));
        tgt = lerp3t(fwd, ROPE_HOLD, k);
        tw = 0.22 * (1 - k);
        lean = 0.18 - 0.12 * k;
      }
      p.torsoY = tw;
      p.torsoX = lean;
      p.headX = 0.3;
      p.legL = L3t(-0.25, 0.08, 0.15);
      p.legR = L3t(0.15, -0.08, 0.05);
      reachR(p, tgt, 0.33, [0.6, -1, -0.3]);
      reachL(p, [0.06, 1.08, 0.3], 0.33);
      return p;
    }
    case 'haul': {
      const p = base();
      const ph = (time / 1.0) % 1;
      const far: P3 = [-0.06, 0.98, 0.56];
      const near: P3 = [-0.1, 1.36, 0.16];
      const handAt = (u: number, side: 1 | -1): P3 => {
        const q = u < 0.5 ? easeInOut(u / 0.5) : 1 - easeInOut((u - 0.5) / 0.5);
        const lift = u < 0.5 ? 0 : Math.sin(Math.PI * (u - 0.5) / 0.5) * 0.12;
        const a = lerp3t(far, near, q);
        return [a[0] * -side + (side === 1 ? 0.08 : 0), a[1] + lift, a[2] - (u >= 0.5 ? 0.06 : 0)];
      };
      p.torsoX = -0.06 + Math.sin(ph * TAU) * 0.04;
      p.headX = 0.5;
      p.hipY = 0.95;
      p.legL = L3t(-0.22, 0.1, 0.25);
      p.legR = L3t(0.12, -0.1, 0.18);
      reachR(p, handAt(ph, -1), 0.33, [0.6, -1, -0.3]);
      reachL(p, handAt((ph + 0.5) % 1, 1), 0.33, [0.6, -1, -0.3]);
      return p;
    }
    case 'startle': {
      const p = startleBody(time);
      const k = clamp(time / 0.25);
      const tr = Math.sin(time * 29) * 0.006;
      reachR(p, lerp3t(ROPE_HOLD, [-0.08 + tr, 1.32, 0.56], easeInOut(k)), 0.33, [0.6, -1, -0.3]);
      reachL(p, lerp3t([0.1, 1.1, 0.32], [0.3, 1.48 + tr, 0.26], easeInOut(k)), 0.33, [0.8, -0.6, -0.5]);
      return p;
    }
    case 'lowerset': {
      const k = easeInOut(clamp(time / 1.8));
      const p = mix(startleBody(1), crouchBody(), k);
      p.headX = lerpN(0.45, 0.25, k);
      reachR(p, lerp3t([-0.08, 1.32, 0.56], [-0.06, 0.36, 0.56], k), 0.33, [0.6, -1, -0.3]);
      reachL(p, lerp3t([0.3, 1.48, 0.26], [0.08, 0.32, 0.5], k), 0.33, [0.6, -1, -0.3]);
      return p;
    }
    case 'unhook': {
      const up = easeInOut(clamp((time - 1.25) / 0.95));
      const p = mix(crouchBody(), base(), up);
      p.headX = lerpN(0.25, 0.5, up);
      const tug = time < 0.4 ? 0 : easeInOut(clamp((time - 0.4) / 0.8));
      const wig = time > 0.4 && time < 1.2 ? Math.sin(time * 15) * 0.035 : 0;
      const pulled: P3 = [-0.12 + wig, 0.62, 0.5];
      reachR(p, lerp3t(lerp3t([-0.06, 0.36, 0.56], pulled, tug), [-0.22, 1.0, 0.25], up), 0.33, [0.6, -1, -0.3]);
      reachL(p, lerp3t([0.08, 0.26, 0.54], [0.22, 0.95, 0.12], up), 0.33, [0.6, -1, -0.3]);
      return p;
    }
    case 'holdgren': {
      const p = base();
      const tr = Math.sin(time * 27) * 0.004;
      p.headX = 0.42;
      p.torsoX = 0.02 + Math.sin(time * 2.2) * 0.01;
      reachR(p, [-0.07 + tr, 1.16, 0.38], 0.33, [0.6, -1, -0.3]);
      reachL(p, [0.04, 1.09, 0.36], 0.33, [0.6, -1, -0.3]);
      return p;
    }
    case 'windup': {
      const p = base();
      const k = easeInOut(clamp((time - 0.3) / 1.0));
      const tr = time > 1.3 ? Math.sin(time * 25) * 0.004 : 0;
      p.torsoY = -0.55 * k;
      p.torsoX = 0.02 - 0.2 * k;
      p.headX = lerpN(0.42, -0.05, k);
      p.headY = 0.4 * k;
      p.legL = L3t(-0.38 * k, 0.1, 0.12 * k);
      p.legR = L3t(0.28 * k, -0.1, 0.1 * k);
      p.hipY = 0.98 - 0.04 * k;
      reachR(p, lerp3t([-0.07, 1.16, 0.38], [-0.4 + tr, 1.74, -0.32], k), 0.33, [0.6, -0.4, -0.8]);
      reachL(p, lerp3t([0.04, 1.09, 0.36], [0.22, 1.45, 0.62], k), 0.33, [0.6, -1, -0.3]);
      return p;
    }
    case 'placeseat': {
      const lean = time < 1.6 ? easeInOut(clamp(time / 0.9)) : 1 - easeInOut(clamp((time - 1.6) / 0.8));
      const p = base();
      p.pitch = 0.18 * lean;
      p.torsoX = 0.9 * lean;
      p.headX = 0.2 * lean;
      p.hipY = 0.97 - 0.05 * lean;
      p.legL = L3t(-0.15 * lean, 0.1, 0.15 * lean);
      p.legR = L3t(0.35 * lean, -0.1, 0.05);
      const reachK = time < 1.6 ? easeInOut(clamp((time - 0.2) / 1.0)) : 1 - easeInOut(clamp((time - 1.6) / 0.6));
      reachR(p, lerp3t([-0.07, 1.16, 0.38], [-0.05, 0.62, 0.95], reachK), 0.33, [0.6, -1, -0.3]);
      reachL(p, lerp3t([0.04, 1.09, 0.36], [0.3, 1.0, 0.5], lean), 0.33, [0.6, -1, -0.3]);
      return p;
    }
  }
  return null;
};

// ---------- Bahnhof (herrenloser Koffer) ----------
/**
 * Bewegungen für das Bahnhof-Video (wiederverwendbar):
 *  - lookaround: steht, schaut sich um (links 0–1 s, rechts 1–2 s), bemerkt dann etwas vor sich am Boden (2,2 s: kleines
 *                Zusammenzucken, Blick nach vorn unten, linke Hand kurz hoch)
 *  - bendopen:   beugt sich vor (bis 0,8 s) und fummelt mit beiden Händen an den Schnallen eines Koffers 0,55 m vor ihm
 *                (Hände ca. 0,7 m hoch)
 *  - grabcase:   greift den Koffergriff oben (Koffer 0,55 m vor ihm, Hand bei 0,5 s), zieht den Teleskopgriff hoch (0,6–1,2 s),
 *                dreht sich mit dem Koffer – danach "rollcase"
 *  - rollcase:   geht und zieht einen Rollkoffer hinter sich her (rechte Hand hinten bei CASE_HAND). Koffer dazu mit
 *                "attach": "dummy" bei x −0.2, y 0, z −1.04, face 0, tilt 40, handle 1
 *  - pointtalk:  steht, zeigt mit rechts nach vorn, dreht den Kopf zwischendurch nach rechts (redet mit jemandem rechts neben sich)
 *  - sheepish:   verlegen: linke Hand kratzt am Hinterkopf, Kopf gesenkt, rechte Hand ab 0,8 s nach vorn (nimmt etwas entgegen)
 *  - handover:   streckt die rechte Hand nach vorn und reicht etwas (bis 0,6 s), Hand bleibt vorn
 *  - tapewalk:   geht und hält mit rechts eine Rolle Absperrband seitlich vor sich (Band wird abgerollt)
 *  - listen:     steht, hört zu, nickt leicht, Hände vor dem Bauch verschränkt
 */
export const CASE_HAND: P3 = [-0.2, 0.97, -0.3];
const stationPose = (motion: Motion, time: number, speed: number): DummyPose | null => {
  switch (motion) {
    case 'lookaround': {
      const p = base();
      const br = Math.sin(time * 2.2) * 0.012;
      let hy = 0;
      if (time < 1.0) hy = 0.75 * Math.sin((Math.PI / 2) * easeInOut(time / 1.0));
      else if (time < 2.0) hy = 0.75 * Math.cos(Math.PI * easeInOut(time - 1.0));
      else hy = -0.75 * (1 - easeInOut(clamp((time - 2.0) / 0.35)));
      const notice = easeInOut(clamp((time - 2.1) / 0.3));
      const jolt = time > 2.1 ? Math.sin(Math.PI * clamp((time - 2.1) / 0.35)) : 0;
      p.headY = hy;
      p.torsoY = hy * 0.3;
      p.headX = 0.05 + 0.4 * notice;
      p.torsoX = 0.02 + br - 0.08 * jolt + 0.06 * notice;
      p.armL = L3t(-0.5 * jolt - 0.2 * notice, 0.15, -0.4 - 0.6 * jolt - 0.3 * notice);
      return p;
    }
    case 'bendopen': {
      const k = easeInOut(clamp(time / 0.8));
      const p = base();
      p.pitch = 0.12 * k;
      p.torsoX = 0.62 * k;
      p.headX = 0.25 * k;
      p.hipY = 0.98 - 0.16 * k;
      p.legL = L3t(-0.32 * k, 0.12, 0.55 * k);
      p.legR = L3t(-0.32 * k, -0.12, 0.55 * k);
      const f = time > 0.8 ? Math.sin(time * 13) * 0.025 : 0;
      const g = time > 0.8 ? Math.sin(time * 11 + 1.3) * 0.025 : 0;
      reachR(p, lerp3t([-0.2, 0.95, 0.15], [-0.14 + f, 0.74 + g, 0.47], k), 0.33, [0.6, -1, -0.3]);
      reachL(p, lerp3t([0.2, 0.95, 0.15], [0.14 - g, 0.74 + f, 0.47], k), 0.33, [0.6, -1, -0.3]);
      return p;
    }
    case 'grabcase': {
      const p = base();
      const bend = time < 0.5 ? easeInOut(time / 0.5) : 1 - easeInOut(clamp((time - 0.5) / 0.7));
      p.torsoX = 0.45 * bend;
      p.hipY = 0.98 - 0.08 * bend;
      p.headX = 0.3;
      p.legL = L3t(-0.15 * bend, 0.1, 0.3 * bend);
      p.legR = L3t(-0.15 * bend, -0.1, 0.3 * bend);
      const reachK = easeInOut(clamp(time / 0.5));
      const pull = easeInOut(clamp((time - 0.6) / 0.6));
      const top: P3 = [-0.06, 0.82, 0.5];
      reachR(p, lerp3t(lerp3t([-0.2, 0.95, 0.15], top, reachK), [-0.08, 1.2, 0.42], pull), 0.33, [0.6, -1, -0.3]);
      return p;
    }
    case 'rollcase': {
      const p = dummyPose('walk', time, speed);
      reachR(p, CASE_HAND, 0.33, [0.3, -1, 0.4]);
      p.headX = 0.05;
      return p;
    }
    case 'pointtalk': {
      const p = base();
      const k = easeInOut(clamp(time / 0.5));
      const look = Math.sin(Math.max(0, time - 0.6) * 1.6);
      p.headY = -0.6 * Math.max(0, look) * k;
      p.headX = 0.1;
      p.torsoX = Math.sin(time * 2.2) * 0.01;
      p.torsoY = -0.12 * Math.max(0, look) * k;
      reachR(p, lerp3t([-0.22, 0.95, 0.1], [-0.14, 1.38, 0.62], k), 0.4, [0.6, -1, -0.3]);
      // linke Hand gestikuliert
      reachL(p, [0.24, 1.0 + 0.06 * Math.sin(time * 4) * k, 0.25 + 0.05 * Math.sin(time * 3.1) * k], 0.33);
      return p;
    }
    case 'sheepish': {
      const p = base();
      const k = easeInOut(clamp(time / 0.5));
      const scratch = Math.sin(time * 9) * 0.03 * k;
      p.headX = 0.32 * k;
      p.headY = -0.12 * k;
      p.torsoX = 0.08 * k;
      p.torsoZ = 0.04 * k;
      reachL(p, lerp3t([0.22, 0.95, 0.1], [0.1 + scratch, 1.86, -0.06], k), 0.33, [0.8, 0.2, -0.5]);
      const give = easeInOut(clamp((time - 0.8) / 0.5));
      reachR(p, lerp3t([-0.22, 0.95, 0.1], [-0.1, 1.15, 0.45], give), 0.33, [0.6, -1, -0.3]);
      return p;
    }
    case 'handover': {
      const p = base();
      const k = easeInOut(clamp(time / 0.6));
      p.torsoX = 0.06 * k;
      p.headX = 0.15;
      reachR(p, lerp3t([-0.22, 0.95, 0.1], [-0.1, 1.18, 0.55], k), 0.33, [0.6, -1, -0.3]);
      return p;
    }
    case 'tapewalk': {
      const p = dummyPose('walk', time, speed);
      reachR(p, [-0.38, 1.1, 0.38], 0.33, [0.6, -1, -0.3]);
      p.headX = 0.1;
      return p;
    }
    case 'listen': {
      const p = base();
      p.headX = 0.08 + Math.max(0, Math.sin(time * 3.2)) * 0.12;
      p.torsoX = Math.sin(time * 2.2) * 0.01;
      reachR(p, [-0.05, 1.0, 0.24], 0.33, [0.6, -1, -0.3]);
      reachL(p, [0.05, 1.0, 0.24], 0.33, [0.6, -1, -0.3]);
      return p;
    }
  }
  return null;
};

/** Rechte Hand (Handmitte) im Dummy-System (Ursprung am Boden, +z = vorn) – für Gegenstände mit "hand" */
export const rightHandLocal = (p: DummyPose) =>
  armPoint(p.armR, -1, p.foreZ, 0.33)
    .applyEuler(new THREE.Euler(p.torsoX, p.torsoY, p.torsoZ))
    .add(new THREE.Vector3(0, p.hipY + 0.06, 0))
    .applyEuler(new THREE.Euler(p.pitch, 0, 0));

/** Zittern unter Strom: Gliedmaßen zucken zufällig (amount 0 … 1), ändert sich jedes Bild */
export const zapPose = (p: DummyPose, amount: number, time: number, seed = 1): DummyPose => {
  if (amount < 0.01) return p;
  const r = rng(seed * 4241 + Math.floor(time * 30) * 15013);
  const n = () => (r() - 0.5) * 2 * amount;
  const j = (l: Limb, a: number): Limb => ({sx: l.sx + n() * a, sz: l.sz + n() * a, bend: l.bend + n() * a});
  return {
    ...p,
    armL: j(p.armL, 0.12),
    armR: j(p.armR, 0.05),
    legL: j(p.legL, 0.05),
    legR: j(p.legR, 0.05),
    headX: p.headX + n() * 0.12,
    headY: p.headY + n() * 0.15,
    torsoX: p.torsoX + n() * 0.04,
    torsoZ: p.torsoZ + n() * 0.05,
    hipY: p.hipY + n() * 0.01,
  };
};

export const dummyPose = (motion: Motion, time: number, speed: number): DummyPose => {
  const g = gardenPose(motion, time, speed) ?? moatPose(motion, time, speed) ?? firstAidPose(motion, time, speed) ?? firePose(motion, time, speed) ?? stromPose(motion, time) ?? zahnPose(motion, time) ?? tabPose(motion, time) ?? panicPose(motion, time) ?? magnetPose(motion, time) ?? stationPose(motion, time, speed);
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
/**
 * Uniform für Figuren mit Dummy-Körper (Bahnmitarbeiterin, Bundespolizist …): Farben für Jacke, Säume, Kragen, Hose,
 * Mütze (Schirmmütze) + Mützenband, optional Halstuch und Zopf. Ohne Logos und ohne echte Abzeichen.
 */
export type Uniform = {jacket: string; dark: string; collar: string; pants: string; cap: string; band: string; scarf?: string; hair?: string; trim?: string};
const useMats = (color = YELLOW, coat = false, uni?: Uniform) =>
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
      // ---- Kleidung (Winterjacke + lange Hose) ----
      jacket: new THREE.MeshStandardMaterial({color: uni ? uni.jacket : coat ? '#f4f6f8' : JACKET, roughness: 0.75, flatShading: true}),
      jacketDark: new THREE.MeshStandardMaterial({color: uni ? uni.dark : coat ? '#dfe5ea' : '#7e2219', roughness: 0.8, flatShading: true}),
      fur: new THREE.MeshStandardMaterial({color: uni ? uni.collar : coat ? '#f4f6f8' : '#e9e1d2', roughness: 1, flatShading: true}),
      pants: new THREE.MeshStandardMaterial({color: uni ? uni.pants : PANTS, roughness: 0.85, flatShading: true}),
      reflect: new THREE.MeshStandardMaterial({color: uni ? (uni.trim ?? uni.jacket) : coat ? '#f4f6f8' : '#dfe6ea', roughness: 0.3, metalness: 0.2, flatShading: true}),
      cap: new THREE.MeshStandardMaterial({color: uni?.cap ?? '#222', roughness: 0.6, flatShading: true}),
      capBand: new THREE.MeshStandardMaterial({color: uni?.band ?? '#222', roughness: 0.5, flatShading: true}),
      visor: new THREE.MeshStandardMaterial({color: '#15171a', roughness: 0.3, flatShading: true}),
      scarf: new THREE.MeshStandardMaterial({color: uni?.scarf ?? '#c8102e', roughness: 0.8, flatShading: true, side: THREE.DoubleSide}),
      hair: new THREE.MeshStandardMaterial({color: uni?.hair ?? '#4a2f1f', roughness: 0.9, flatShading: true}),
    }),
    [color, coat, uni],
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
  sleeve = 0,
  wound,
  glove = false,
  fist = false,
}: {
  m: Mats;
  /** geballte Faust (runder, Knöchel-Kante) */
  fist?: boolean;
  /** roter Boxhandschuh statt Hand */
  glove?: boolean;
  limb: Limb;
  side: 1 | -1;
  foreZ?: number;
  phone?: boolean;
  tweezers?: boolean;
  ice?: boolean;
  spade?: boolean;
  smartphone?: boolean;
  /** Jackenärmel: 1 = an, 0 = aus (dazwischen rutscht er Richtung Hand) */
  sleeve?: number;
  /** linker Unterarm: Bissstelle, Rötung, Pflaster, Kompresse */
  wound?: ArmWound;
}) => (
  <group position={[0.27 * side, 0.44, 0]} rotation={[limb.sx, 0, limb.sz]}>
    <Joint m={m} r={0.09} />
    <Seg m={m} len={0.3} r={0.08} />
    {sleeve > 0.5 && (
      <group position={[0, -(1 - sleeve) * 0.3, 0]}>
        <mesh material={m.jacket} position={[0, -0.13, 0]} castShadow>
          <cylinderGeometry args={[0.112, 0.1, 0.34, 8]} />
        </mesh>
      </group>
    )}
    <group position={[0, -0.31, 0]} rotation={[limb.bend, 0, foreZ]}>
      <Joint m={m} r={0.07} />
      <Seg m={m} len={0.27} r={0.07} r2={0.058} />
      {wound && <ForearmWound w={wound} />}
      {sleeve > 0.03 && (
        <group position={[0, -Math.min(1, 1 - sleeve) * 0.2, 0]}>
          <mesh material={m.jacket} position={[0, -0.12, 0]} castShadow>
            <cylinderGeometry args={[0.096, 0.088, 0.25, 8]} />
          </mesh>
          <mesh material={m.jacketDark} position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.04, 8]} />
          </mesh>
        </group>
      )}
      {glove ? (
        <group position={[0, -0.25, 0]}>
          <BoxingGlove s={0.95} />
        </group>
      ) : fist ? (
        <group position={[0, -0.31, 0]}>
          <mesh material={m.body} scale={[0.95, 0.9, 0.85]} castShadow>
            <icosahedronGeometry args={[0.075, 1]} />
          </mesh>
          <mesh material={m.joint} position={[0, -0.03, 0.045]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.11, 0.022, 0.03]} />
          </mesh>
        </group>
      ) : (
        <mesh material={m.body} position={[0, -0.32, 0.0]} scale={[0.8, 1.1, 0.6]} castShadow>
          <icosahedronGeometry args={[0.08, 0]} />
        </mesh>
      )}
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
  pants = 0,
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
  /** lange Hose: 1 = an, 0 = aus (dazwischen rutscht sie nach unten) */
  pants?: number;
}) => (
  <group position={[0.105 * side, -0.06, 0]} rotation={[limb.sx, 0, limb.sz]}>
    <Joint m={m} r={0.1} />
    <Seg m={m} len={0.43} r={0.11} r2={0.088} />
    {pants > 0.5 && (
      <mesh material={m.pants} position={[0, -0.22 - (1 - pants) * 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.108, 0.46, 8]} />
      </mesh>
    )}
    <PainGlow m={m} amount={clamp((pain - 1.45) * 2)} len={0.43} r={0.11} time={time} phase={1.2} />
    <Marker m={m} r={0.055} position={[0.108 * side, -0.2, 0]} rotation={[0, (Math.PI / 2) * side, 0]} />
    {band > 0 && <Band m={m} amount={band} />}
    <group position={[0, -0.44, 0]} rotation={[limb.bend, 0, 0]}>
      <Joint m={m} r={0.08} />
      <Seg m={m} len={0.42} r={0.085} r2={0.065} />
      {pants > 0.03 && (
        <mesh material={m.pants} position={[0, -0.2 - Math.min(1, 1 - pants) * 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.104, 0.092, 0.42, 8]} />
        </mesh>
      )}
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

/** Atemwolken vor dem Mund: je Atemzug eine kleine Wolke, die wächst, nach vorn/oben treibt und verblasst */
const BreathPuffs = ({phase, rate, life = 1.7}: {phase: number; rate: number; life?: number}) => {
  const mats = useMemo(
    () =>
      [0, 1, 2, 3].map(
        () => new THREE.MeshStandardMaterial({color: '#f4f9ff', emissive: '#c9dcf0', emissiveIntensity: 0.35, transparent: true, depthWrite: false, roughness: 1, flatShading: true}),
      ),
    [],
  );
  if (rate <= 0.01 && phase <= 0) return null;
  const LIFE = life;
  const r = Math.max(life > 1.7 ? 0.1 : 0.15, rate);
  const out = [];
  for (let j = 0; j < 4; j++) {
    const n = Math.floor(phase) - j;
    if (n < 0) continue;
    const age = (phase - n) / r;
    if (age > LIFE) continue;
    const k = age / LIFE;
    mats[j].opacity = 0.62 * Math.pow(1 - k, 1.3) * Math.min(1, age * 8);
    const sc = 0.035 + 0.13 * Math.pow(k, 0.6);
    out.push(
      <group key={j} position={[0, -0.05 + 0.12 * k, 0.15 + 0.42 * Math.pow(k, 0.8)]} scale={sc}>
        <mesh material={mats[j]}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        <mesh material={mats[j]} position={[0.7, 0.35, 0.3]} scale={0.7}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        <mesh material={mats[j]} position={[-0.6, 0.2, 0.5]} scale={0.6}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
      </group>,
    );
  }
  return <>{out}</>;
};

/** Schirmmütze (Uniform) + optional Zopf hinten. Im Kopf-System (Kopfmitte = 0) */
const UniformCap = ({m, hair}: {m: Mats; hair: boolean}) => (
  <group position={[0, 0.1, 0]} rotation={[-0.08, 0, 0]}>
    <mesh material={m.cap} position={[0, 0.045, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.125, 0.07, 12]} />
    </mesh>
    <mesh material={m.capBand} position={[0, 0.005, 0]}>
      <cylinderGeometry args={[0.127, 0.124, 0.035, 12]} />
    </mesh>
    <mesh material={m.visor} position={[0, -0.01, 0.12]} rotation={[0.25, 0, 0]} scale={[1, 0.25, 0.75]}>
      <cylinderGeometry args={[0.1, 0.1, 0.05, 12, 1, false, -Math.PI / 2, Math.PI]} />
    </mesh>
    {hair && (
      <mesh material={m.hair} position={[0, -0.16, -0.13]} rotation={[0.5, 0, 0]} scale={[0.7, 1.4, 0.7]} castShadow>
        <icosahedronGeometry args={[0.06, 0]} />
      </mesh>
    )}
  </group>
);

/** Winterjacke am Oberkörper (Rumpf, Kragen, Reißverschluss). amount < 0.5: hängt nur noch am rechten Arm */
const JacketBody = ({m, amount, chest}: {m: Mats; amount: number; chest: number}) => {
  if (amount <= 0.03) return null;
  const hang = clamp((0.5 - amount) * 2);
  return (
    <group position={[-0.08 * hang, -0.04 * hang, 0]} rotation={[0, 0.3 * hang, -0.35 * hang]}>
      <mesh material={m.jacket} position={[0, 0.32 + 0.02 * chest, 0]} scale={[1.42 * (1 + 0.05 * chest), 1.38, 0.95 * (1 + 0.1 * chest)]} castShadow>
        <icosahedronGeometry args={[0.18, 1]} />
      </mesh>
      <mesh material={m.jacket} position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.165, 0.175, 0.22, 8]} />
      </mesh>
      <mesh material={m.jacketDark} position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.178, 0.178, 0.05, 8]} />
      </mesh>
      {/* Reißverschluss + Reflexstreifen */}
      <mesh material={m.jacketDark} position={[0, 0.27, 0.178]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.025, 0.42, 0.012]} />
      </mesh>
      <mesh material={m.reflect} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.212, 0.205, 0.035, 10]} />
      </mesh>
      {/* Kragen mit hellem Fellrand */}
      {hang < 0.5 && (
        <mesh material={m.fur} position={[0, 0.54, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.085, 0.035, 6, 12]} />
        </mesh>
      )}
    </group>
  );
};

// ---------- Erste Hilfe: Bissstelle, Rötung, Pflaster, Kompresse (linker Unterarm, Oberseite) ----------
/** Werte für den linken Unterarm: bite/plaster/dressing 0 … 1, red 0 … 2 */
export type ArmWound = {bite: number; red: number; plaster: number; dressing: number; time: number};

/** Teil-Zylinder auf der Oberseite (+z) des Unterarms, Mitte 0,15 m unter dem Ellbogen */
const ArmShell = ({r, h, arc, mat, y = -0.15, z = 0}: {r: number; h: number; arc: number; mat: THREE.Material; y?: number; z?: number}) => (
  <mesh material={mat} position={[0, y, z]} renderOrder={5}>
    <cylinderGeometry args={[r * 1.02, r * 0.98, h, 16, 1, true, -arc / 2, arc]} />
  </mesh>
);

const ForearmWound = ({w}: {w: ArmWound}) => {
  const mats = useMemo(
    () => ({
      dot: new THREE.MeshBasicMaterial({color: '#c8211a', side: THREE.DoubleSide}),
      red: new THREE.MeshBasicMaterial({color: '#f0140c', transparent: true, depthWrite: false, side: THREE.DoubleSide}),
      glow: new THREE.MeshBasicMaterial({color: '#ff3a24', transparent: true, depthWrite: false}),
      plaster: new THREE.MeshStandardMaterial({color: '#e2b78f', roughness: 0.8, side: THREE.DoubleSide}),
      pad: new THREE.MeshStandardMaterial({color: '#f6f1ea', roughness: 0.9, side: THREE.DoubleSide}),
      padRed: new THREE.MeshBasicMaterial({color: '#e0261a', transparent: true, depthWrite: false, side: THREE.DoubleSide}),
      gauze: new THREE.MeshStandardMaterial({color: '#f4f6f8', roughness: 1, flatShading: true, side: THREE.DoubleSide}),
    }),
    [],
  );
  const R = 0.064;
  const pulse = 0.82 + 0.18 * Math.sin(w.time * 5);
  mats.red.opacity = clamp(w.red * 1.5) * 0.78 * pulse;
  mats.glow.opacity = clamp(w.red - 1) * 0.35 * pulse;
  mats.padRed.opacity = clamp(w.red * 0.8) * 0.65 * pulse;
  const redH = 0.035 + 0.075 * Math.min(2, w.red);
  const redArc = 0.9 + 0.9 * Math.min(2, w.red);
  return (
    <group>
      {w.bite > 0.5 && w.dressing < 0.5 && (
        <group position={[0, -0.15, R + 0.0015]}>
          <mesh material={mats.dot}>
            <circleGeometry args={[0.013, 10]} />
          </mesh>
          <mesh material={mats.dot} position={[0.018, 0.004, 0]}>
            <circleGeometry args={[0.006, 8]} />
          </mesh>
        </group>
      )}
      {w.red > 0.01 && w.dressing < 0.5 && <ArmShell r={R + 0.003} h={redH} arc={redArc} mat={mats.red} />}
      {w.red > 1.01 && (
        <mesh material={mats.glow} position={[0, -0.14, 0]} scale={[1, clamp(w.red - 1) * 0.9 + 0.1, 1]} renderOrder={6}>
          <cylinderGeometry args={[R * 1.45, R * 1.4, 0.26, 12]} />
        </mesh>
      )}
      {w.plaster > 0.01 && (
        <group scale={[1, Math.max(0.05, w.plaster), 1]} position={[0, -0.15 * (1 - Math.max(0.05, w.plaster)), 0]}>
          <ArmShell r={R + 0.006} h={0.082} arc={1.7} mat={mats.plaster} />
          <ArmShell r={R + 0.008} h={0.036} arc={0.95} mat={mats.pad} />
          {w.red > 0.01 && <ArmShell r={R + 0.0095} h={0.036} arc={0.95} mat={mats.padRed} />}
        </group>
      )}
      {w.dressing > 0.01 && (
        <group>
          <ArmShell r={R + 0.007} h={0.09} arc={1.9} mat={mats.pad} />
          {w.dressing > 0.4 && (
            <mesh material={mats.gauze} position={[0, -0.15, 0]} scale={[1, clamp((w.dressing - 0.4) / 0.6), 1]}>
              <cylinderGeometry args={[R + 0.014, R + 0.012, 0.13, 10, 3, true]} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
};

/** Vorwärtsrechnung: Punkt am Arm (im Oberkörper-System). along = Abstand vom Ellbogen, up = Abstand über der Oberseite */
const armPoint = (limb: Limb, side: 1 | -1, foreZ: number, along: number, up = 0) =>
  new THREE.Vector3(0, -along, up)
    .applyEuler(new THREE.Euler(limb.bend, 0, foreZ))
    .add(new THREE.Vector3(0, -0.31, 0))
    .applyEuler(new THREE.Euler(limb.sx, 0, limb.sz))
    .add(new THREE.Vector3(0.27 * side, 0.44, 0));

/** Gegenstand in der rechten Hand (Pflaster, Spray, Kompresse, Impfpass) */
const HandItem = ({pose, time, zap = 0, zapTime = 0, tooth}: {pose: DummyPose; time: number; zap?: number; zapTime?: number; tooth?: ToothLook}) => {
  const hand = armPoint(pose.armR, -1, pose.foreZ, 0.33);
  if (!pose.item) return null;
  // Gegenstand bleibt in der Welt aufrecht (Oberkörper-Neigung ausgleichen)
  const level = new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(pose.torsoX, pose.torsoY, pose.torsoZ))
    .invert()
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-pose.pitch, 0, 0)));
  if (pose.item === 'tooth') {
    // Zahn mit spitzen Fingern an der Krone: Krone oben in der Hand, Wurzel zeigt nach unten
    const tip = armPoint(pose.armR, -1, pose.foreZ, 0.36);
    return (
      <group position={tip} quaternion={level}>
        <group position={[0, -0.075, 0.02]} rotation={[0.25, 0.4, 0]} scale={1.7}>
          <Tooth gray={tooth?.gray} mark={tooth?.mark} time={time} />
        </group>
      </group>
    );
  }
  if (pose.item === 'tissue') {
    // Taschentuch liegt auf der linken Hand (Handfläche oben), Zahn liegt darauf
    const palm = armPoint(pose.armL, 1, pose.foreZL, 0.36);
    const w = tooth?.wrap ?? 0;
    return (
      <group position={palm} quaternion={level}>
        <group position={[0, 0.02, 0]} rotation={[0, 0.3, 0]} scale={1.6}>
          <Tissue wrap={w} />
          {w < 0.85 && (
            <group position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0.4]} scale={1.05}>
              <Tooth gray={tooth?.gray} mark={tooth?.mark} time={time} />
            </group>
          )}
        </group>
      </group>
    );
  }
  if (pose.item === 'tab') {
    // angebissener Tab mit Bissstelle zur Kamera (comichaft vergrößert)
    const tip = armPoint(pose.armR, -1, pose.foreZ, 0.37);
    return (
      <group position={tip} quaternion={level}>
        <group position={[0.005, -0.04, 0.045]} rotation={[1.25, Math.PI + 0.35, 0]} scale={3}>
          <DishTab bitten />
        </group>
      </group>
    );
  }
  if (pose.item === 'milk') {
    const tip = armPoint(pose.armR, -1, pose.foreZ, 0.33);
    return (
      <group position={tip} quaternion={level}>
        <group position={[0.01, -0.06, 0.04]} rotation={[-pose.cup * 0.95, 0, 0]} scale={1.35}>
          <group position={[0, -0.02, 0]}>
            <MilkGlass fill={pose.fill} />
          </group>
        </group>
      </group>
    );
  }
  if (pose.item === 'water') {
    const tip = armPoint(pose.armR, -1, pose.foreZ, 0.33);
    return (
      <group position={tip} quaternion={level}>
        <group position={[0.01, -0.06, 0.04]} rotation={[-pose.cup * 0.95, 0, 0]} scale={1.35}>
          <group position={[0, -0.02, 0]}>
            <ColdWaterGlass fill={pose.fill} />
          </group>
        </group>
      </group>
    );
  }
  if (pose.item === 'coolpack') {
    // Coolpack liegt flach auf der Handfläche und wird in den Nacken gedrückt
    const tip = armPoint(pose.armR, -1, pose.foreZ, 0.37);
    return (
      <group position={tip} quaternion={level}>
        <group position={[-0.03, 0.0, 0.0]} rotation={[Math.PI / 2 - 0.2, 0, 0.5]} scale={1.9}>
          <CoolPack />
        </group>
      </group>
    );
  }
  if (pose.item === 'paper') {
    const tip = armPoint(pose.armR, -1, pose.foreZ, 0.35);
    return (
      <group position={tip} quaternion={level}>
        <group position={[0.04, -0.035, 0.03]} rotation={[-0.35, 0, 0]}>
          <PaperSheet w={0.17} h={0.15} />
        </group>
      </group>
    );
  }
  if (pose.item === 'tabpack') {
    return (
      <group position={hand} quaternion={level}>
        <group position={[0, -0.05, 0.04]} scale={0.85}>
          <TabPack open={0} />
        </group>
      </group>
    );
  }
  if (pose.item === 'finger') {
    // ausgestreckter Zeigefinger in Verlängerung des Unterarms
    const tip = armPoint(pose.armR, -1, pose.foreZ, 0.37);
    const far = armPoint(pose.armR, -1, pose.foreZ, 0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), far.clone().sub(tip).normalize());
    return (
      <group position={tip} quaternion={q}>
        <mesh position={[0, 0.035, 0]}>
          <capsuleGeometry args={[0.014, 0.05, 3, 6]} />
          <meshStandardMaterial color={YELLOW} roughness={0.45} flatShading />
        </mesh>
      </group>
    );
  }
  if (pose.item === 'box') {
    return (
      <group position={hand} quaternion={level}>
        <group position={[0, -0.06, 0.03]}>
          <RescueBox lid={0} />
        </group>
      </group>
    );
  }
  if (pose.item === 'towel') {
    // Handtuch hängt in Verlängerung des Unterarms aus der Hand (wie eine Peitsche), Blitze laufen daran entlang
    const fwd = armPoint(pose.armR, -1, pose.foreZ, 0.45);
    const dir = fwd.clone().sub(hand).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    return (
      <group position={hand} quaternion={q}>
        <group position={[0, 0.02, 0]}>
          <WetTowel time={time} bend={0.12} />
        </group>
        <ZapAura anchors={[new THREE.Vector3(0, 0, 0), ...towelPoints(0.12)].reverse()} amount={zap} time={zapTime} seed={77} count={6} len={0.16} light={false} />
      </group>
    );
  }
  if (pose.item === 'spray') {
    // Sprühflasche zeigt zur Bissstelle am linken Unterarm
    const target = armPoint(pose.armL, 1, 0, 0.15, 0.07);
    const dir = target.clone().sub(hand).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    const dist = target.distanceTo(hand);
    return (
      <group position={hand} quaternion={q}>
        <group position={[0, 0.02, -0.02]}>
          <SprayBottle />
        </group>
        <SprayMist amount={pose.mist} length={Math.max(0.05, dist - 0.05)} time={time} />
      </group>
    );
  }
  const fwd = armPoint(pose.armR, -1, pose.foreZ, 0.45);
  const dir = fwd.clone().sub(hand).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  return (
    <group position={hand} quaternion={q}>
      {pose.item === 'plaster' && (
        <group position={[0, -0.03, 0.03]}>
          <PlasterStrip />
        </group>
      )}
      {pose.item === 'compress' && (
        <group position={[0, -0.035, 0.03]}>
          <CompressPad />
        </group>
      )}
      {pose.item === 'pass' && (
        <group position={[0, -0.07, 0.04]} scale={1.5}>
          <VaccinationPass />
        </group>
      )}
    </group>
  );
};

/**
 * Stilisierte Zahnreihe vorn am Kopf (wie ein breites Grinsen): dunkler Mund, 6 obere Zähne.
 * gap = der zweite Zahn links von der Mitte (aus Sicht des Dummys rechts) fehlt – Lücke dunkel. Kein Blut.
 */
export const TeethRow = ({gap = false}: {gap?: boolean}) => {
  const mats = useMemo(
    () => ({
      mouth: new THREE.MeshStandardMaterial({color: '#2b1414', roughness: 0.8, flatShading: true}),
      tooth: new THREE.MeshStandardMaterial({color: '#fdfdf8', roughness: 0.25, flatShading: true}),
    }),
    [],
  );
  const N = 6;
  return (
    <group position={[0, -0.04, 0]}>
      {/* Mund (flaches, gebogenes Band) */}
      <mesh material={mats.mouth} position={[0, -0.002, 0.094]} scale={[1, 0.55, 0.32]} rotation={[0.05, 0, 0]}>
        <sphereGeometry args={[0.08, 14, 8, 0, Math.PI * 2, Math.PI * 0.33, Math.PI * 0.34]} />
      </mesh>
      {Array.from({length: N}, (_, i) => {
        if (gap && i === 2) return null;
        const a = ((i - (N - 1) / 2) / (N - 1)) * 1.25;
        const r = 0.118;
        const w = i === 2 || i === 3 ? 0.024 : 0.02;
        return (
          <mesh key={i} material={mats.tooth} position={[Math.sin(a) * r, 0.004, Math.cos(a) * r + 0.006]} rotation={[0, a, 0]} castShadow>
            <boxGeometry args={[w, 0.03, 0.012]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Aussehen des Zahns in der Hand (Werte des Dummys) */
export type ToothLook = {gray: number; mark: number; wrap: number};

/** Gegenstand in beiden Händen (Eimer, Geschenk): zwischen den Händen */
const BothHandsItem = ({pose, time}: {pose: DummyPose; time: number}) => {
  if (!pose.both) return null;
  const l = armPoint(pose.armL, 1, 0, 0.33);
  const r = armPoint(pose.armR, -1, pose.foreZ, 0.33);
  const mid = l.clone().add(r).multiplyScalar(0.5);
  if (pose.both === 'broom') {
    // Stiel läuft durch beide Hände (links vorn), Bürste am vorderen Ende
    const dir = l.clone().sub(r).normalize();
    const far = l.clone().addScaledVector(dir, 0.95);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    return (
      <group position={far} quaternion={q}>
        <group position={[0, -0.06, 0]}>
          <Broom />
        </group>
      </group>
    );
  }
  // Gegenstand bleibt in der Welt waagrecht (Oberkörper-Neigung ausgleichen)
  const rot: [number, number, number] = [-pose.torsoX - pose.pitch, -pose.torsoY, -pose.torsoZ];
  return (
    <group position={mid} rotation={rot}>
      {pose.both === 'bucket' ? (
        <group position={[0, -0.24, 0.06]}>
          <Bucket time={time} slosh={1} />
        </group>
      ) : (
        <group position={[0, -0.14, 0.04]}>
          <Gift color={Math.floor(time / 1.8) % 6} w={0.3} h={0.22} d={0.26} />
        </group>
      )}
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
  jacket = 0,
  pants = 0,
  breath = 0,
  breathPhase = 0,
  armbite = 0,
  redness = 0,
  plaster = 0,
  dressing = 0,
  coat = false,
  uniform,
  zap = 0,
  zapTime = 0,
  gloves = 0,
  teeth = 0,
  gap = 0,
  tooth,
  foam = 0,
  lunge = 0,
  blut = 0,
  fxTime = 0,
  heave = 0,
}: {
  /** Brustkorb hebt sich mit jedem Atemzug (Phase breathPhase), 0 … 1 */
  heave?: number;
  /** Schaumblasen am Mund 0 … 2 */
  foam?: number;
  /** Röntgen-Hinweis Lunge + Pfeil 0 … 1 */
  lunge?: number;
  /** Röntgen-Hinweis Magen → Blut 0 … 1 */
  blut?: number;
  /** Zeit für Schaum/Hinweise (friert beim Einfrieren mit ein) */
  fxTime?: number;
  pose: DummyPose;
  /** rote Boxhandschuhe 0/1 */
  gloves?: number;
  /** Zahnreihe zeigen 0/1 */
  teeth?: number;
  /** Zahnlücke 0/1 */
  gap?: number;
  /** Zahn in der Hand: grau, Markierung, Taschentuch */
  tooth?: ToothLook;
  /** unter Strom: Blitze um Hände, Arme, Kopf (0 … 1) – Zittern kommt über zapPose */
  zap?: number;
  /** Zeit für die Blitze (Bewegungszeit → friert beim Einfrieren mit ein) */
  zapTime?: number;
  bite?: boolean;
  sting?: boolean;
  pain?: number;
  barefoot?: boolean;
  /** andere Körperfarbe (z. B. Nachbar) – sonst Gelb */
  color?: string;
  /** Winterjacke 0 … 1 */
  jacket?: number;
  /** lange Hose 0 … 1 */
  pants?: number;
  /** Atemtempo (Atemzüge pro Sekunde) – 0 = keine Atemwolken */
  breath?: number;
  /** Atemzüge seit Abschnittsbeginn */
  breathPhase?: number;
  /** Bissstelle am linken Unterarm (kleiner roter Punkt) 0/1 */
  armbite?: number;
  /** Rötung um die Bissstelle: 0 = keine … 1 = rot … 2 = groß, ganzer Unterarm schimmert rot */
  redness?: number;
  /** Pflaster auf der Bissstelle 0 … 1 */
  plaster?: number;
  /** sterile Kompresse + Mullbinde auf der Bissstelle 0 … 1 */
  dressing?: number;
  /** weißer Arztkittel statt Winterjacke (Arzt-Figur) + Stethoskop */
  coat?: boolean;
  /** Uniform (Bahnmitarbeiterin, Bundespolizist): Jacke + Hose + Schirmmütze in festen Farben */
  uniform?: Uniform;
}) => {
  const m = useMats(color, coat, uniform);
  if (uniform) {
    jacket = 1;
    pants = 1;
  }
  const time = useCurrentFrame() / 30;
  const wound: ArmWound | undefined =
    armbite > 0 || redness > 0 || plaster > 0 || dressing > 0 ? {bite: armbite, red: redness, plaster, dressing, time} : undefined;
  if (coat) jacket = 1;
  if (heave > 0.001) pose = {...pose, chest: pose.chest + 1.5 * heave * (0.5 - 0.5 * Math.cos(2 * Math.PI * breathPhase))};
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
        {pants > 0.5 && (
          <mesh material={m.pants} position={[0, -0.01, 0]} scale={[1.36, 0.82, 0.95]} castShadow>
            <icosahedronGeometry args={[0.15, 1]} />
          </mesh>
        )}
        <Leg m={m} limb={pose.legL} side={1} barefoot={barefoot} pants={pants} />
        <Leg m={m} limb={pose.legR} side={-1} bite={bite} band={pose.band} sting={sting} pain={pain} barefoot={barefoot} time={time} pants={pants} />
        {/* Oberkörper */}
        <group position={[0, 0.06, 0]} rotation={[pose.torsoX, pose.torsoY, pose.torsoZ]}>
          <mesh material={m.joint} position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.16, 8]} />
          </mesh>
          <mesh
            material={m.body}
            position={[0, 0.33 + 0.02 * pose.chest, 0]}
            scale={[1.3 * (1 + 0.05 * pose.chest), 1.25, 0.8 * (1 + 0.1 * pose.chest)]}
            castShadow
          >
            <icosahedronGeometry args={[0.18, 1]} />
          </mesh>
          <JacketBody m={m} amount={jacket} chest={pose.chest} />
          {pose.bellyOn && (
            <mesh material={m.body} position={[0, 0.16, 0.05 + 0.02 * (pose.belly ?? 0)]} scale={[1.05, 0.78, 0.72 + 0.38 * (pose.belly ?? 0)]} castShadow>
              <icosahedronGeometry args={[0.14, 1]} />
            </mesh>
          )}
          <Marker m={m} r={0.06} position={[0, 0.36, 0.147]} />
          <ShoulderBelt m={m} amount={pose.belt} />
          <Arm m={m} limb={pose.armL} side={1} foreZ={pose.foreZL} ice={pose.ice} sleeve={clamp((jacket - 0.5) * 2)} wound={wound} glove={gloves > 0.5} fist={pose.fists} />
          <HandItem pose={pose} time={time} zap={zap} zapTime={zapTime} tooth={tooth} />
          {zap > 0.01 && (
            <ZapAura
              anchors={[
                armPoint(pose.armR, -1, pose.foreZ, 0.33),
                armPoint(pose.armL, 1, 0, 0.33),
                armPoint(pose.armR, -1, pose.foreZ, 0),
                armPoint(pose.armL, 1, 0, 0),
                new THREE.Vector3(0, 0.78, 0),
                new THREE.Vector3(0, 0.36, 0.13),
                new THREE.Vector3(0.2, 0.3, 0),
                new THREE.Vector3(-0.2, 0.3, 0),
              ]}
              amount={zap}
              time={zapTime}
              seed={color ? color.length * 13 + color.charCodeAt(1) : 5}
              count={9}
            />
          )}
          <BothHandsItem pose={pose} time={time} />
          {coat && (
            <mesh material={m.joint} position={[0, 0.5, 0.05]} rotation={[1.1, 0, 0]}>
              <torusGeometry args={[0.12, 0.012, 5, 16, Math.PI * 1.15]} />
            </mesh>
          )}
          {coat && (
            <mesh material={m.steel} position={[0.07, 0.3, 0.2]}>
              <cylinderGeometry args={[0.03, 0.03, 0.015, 10]} />
            </mesh>
          )}
          <Arm
            m={m}
            limb={pose.armR}
            side={-1}
            foreZ={pose.foreZ}
            phone={pose.phone}
            tweezers={pose.tweezers}
            smartphone={pose.smartphone}
            sleeve={clamp(jacket * 2)}
            glove={gloves > 0.5}
            fist={pose.fists}
          />
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
            {pose.puffPhase !== undefined ? <BreathPuffs phase={pose.puffPhase} rate={1 / 6} life={3.2} /> : <BreathPuffs phase={breathPhase} rate={breath} />}
            {teeth > 0.5 && <TeethRow gap={gap > 0.5} />}
            {uniform && <UniformCap m={m} hair={!!uniform.hair} />}
            <Foam amount={foam} time={fxTime} />
          </group>
          <BodyHint lunge={lunge} blut={blut} time={fxTime} />
          {uniform?.scarf && (
            <mesh material={m.scarf} position={[0, 0.5, 0.15]} rotation={[0.35, 0, Math.PI]}>
              <circleGeometry args={[0.085, 3]} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
};
