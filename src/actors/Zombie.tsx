import {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut} from '../lib/anim';

/**
 * Zombie (Figurname "zombie"): gleicher stilisierter Low-Poly-Look wie der Dummy (einfache Körperformen,
 * gleiche Proportionen, ca. 1,80 m), aber grünlich-graue Haut, zerrissenes Hemd mit schiefer Krawatte,
 * zerfranste Hose, wirre Haarbüschel, zwei ungleich große Kulleraugen. Eher witzig als eklig:
 * kein Blut, keine Wunden. Blickt im eigenen Koordinatensystem nach +z.
 *
 * Bewegungen: shamble (schlurfen, Arme ausgestreckt), reach (stehen, Arme ausgestreckt, schwanken),
 * chomp (zubeißen: Kopf schnappt bei ca. 0,45 s zu – Mund ca. 0,62 m vor der Figur auf 1,25 m Höhe),
 * confused (verwirrt am Kopf kratzen, Fragezeichen über dem Kopf; mit Weg = verwirrt davonschlurfen),
 * stand, wave.
 */

const SKIN = '#93ad8c';
const SKIN_DARK = '#7d9877';
const SHIRT = '#7c6f9c';
const SHIRT_DARK = '#5f557c';
const PANTS = '#6b5a45';
const TIE = '#b8463a';

type Limb = {sx: number; sz: number; bend: number};
export type ZombiePose = {
  hipY: number;
  torsoX: number;
  torsoY: number;
  torsoZ: number;
  headX: number;
  headY: number;
  headZ: number;
  /** Kopf nach vorn geschoben (m) – beim Zubeißen */
  headFwd: number;
  /** Mund offen 0 … 1 */
  jaw: number;
  armL: Limb;
  armR: Limb;
  legL: Limb;
  legR: Limb;
  /** Fragezeichen über dem Kopf 0 … 1 */
  question: number;
};

const L3 = (sx: number, sz: number, bend: number): Limb => ({sx, sz, bend});
const TAU = Math.PI * 2;

const base = (): ZombiePose => ({
  hipY: 0.96,
  torsoX: 0.12,
  torsoY: 0,
  torsoZ: 0,
  headX: 0.05,
  headY: 0,
  headZ: 0.18,
  headFwd: 0,
  jaw: 0.25,
  armL: L3(-0.1, 0.1, -0.15),
  armR: L3(-0.1, -0.1, -0.15),
  legL: L3(0, 0.05, 0.05),
  legR: L3(0, -0.05, 0.05),
  question: 0,
});

const mix = (a: ZombiePose, b: ZombiePose, k: number): ZombiePose => {
  const L = (x: number, y: number) => x + (y - x) * k;
  const limb = (x: Limb, y: Limb): Limb => ({sx: L(x.sx, y.sx), sz: L(x.sz, y.sz), bend: L(x.bend, y.bend)});
  return {
    hipY: L(a.hipY, b.hipY),
    torsoX: L(a.torsoX, b.torsoX),
    torsoY: L(a.torsoY, b.torsoY),
    torsoZ: L(a.torsoZ, b.torsoZ),
    headX: L(a.headX, b.headX),
    headY: L(a.headY, b.headY),
    headZ: L(a.headZ, b.headZ),
    headFwd: L(a.headFwd, b.headFwd),
    jaw: L(a.jaw, b.jaw),
    armL: limb(a.armL, b.armL),
    armR: limb(a.armR, b.armR),
    legL: limb(a.legL, b.legL),
    legR: limb(a.legR, b.legR),
    question: L(a.question, b.question),
  };
};

/** Arme nach vorn ausgestreckt (klassische Zombie-Haltung), leicht wippend */
const reachArms = (p: ZombiePose, time: number) => {
  const bob = Math.sin(time * 2.1) * 0.06;
  p.armL = L3(-1.45 + bob, 0.12, -0.12);
  p.armR = L3(-1.4 - bob, -0.1, -0.18);
  return p;
};

/** Schlurfen: rechtes Bein macht einen Schritt, linkes wird nachgezogen; Körper schwankt */
const shamblePose = (time: number, speed: number) => {
  const p = reachArms(base(), time);
  const ph = time * TAU * Math.max(0.45, speed * 0.9);
  const s = Math.sin(ph);
  const step = Math.max(0, s);
  const drag = Math.max(0, -s);
  p.legR = L3(-0.45 * step + 0.15 * drag, -0.06, 0.55 * Math.max(0, Math.sin(ph + 0.8)));
  p.legL = L3(0.25 * step - 0.22 * drag, 0.08, 0.12);
  p.hipY = 0.95 - 0.03 * Math.abs(Math.cos(ph));
  p.torsoZ = 0.1 * Math.sin(ph);
  p.torsoX = 0.2;
  p.torsoY = 0.08 * s;
  p.headZ = 0.2 + 0.12 * Math.sin(ph + 0.6);
  p.headX = -0.05;
  p.jaw = 0.3 + 0.15 * Math.sin(time * 3.1);
  return p;
};

export const zombiePose = (motion: Motion, time: number, speed: number): ZombiePose => {
  switch (motion) {
    case 'shamble':
      return shamblePose(time, speed);
    case 'reach': {
      const p = reachArms(base(), time);
      p.torsoZ = 0.08 * Math.sin(time * 1.3);
      p.torsoX = 0.18;
      p.headZ = 0.18 + 0.1 * Math.sin(time * 1.1);
      p.jaw = 0.3 + 0.2 * Math.max(0, Math.sin(time * 2.4));
      return p;
    }
    case 'chomp': {
      // vorbeugen + Mund auf (0–0,35 s), zuschnappen (0,45 s), zurück (bis 1,0 s)
      const r = reachArms(base(), time);
      r.torsoX = 0.2;
      const lunge = reachArms(base(), time);
      lunge.torsoX = 0.62;
      lunge.hipY = 0.9;
      lunge.legL = L3(-0.35, 0.08, 0.5);
      lunge.legR = L3(0.25, -0.06, 0.15);
      lunge.headX = 0.25;
      lunge.headFwd = 0.08;
      lunge.headZ = 0.05;
      lunge.jaw = 1;
      lunge.armL = L3(-1.05, -0.15, -0.6);
      lunge.armR = L3(-1.05, 0.15, -0.6);
      if (time < 0.35) return mix(r, lunge, easeInOut(time / 0.35));
      if (time < 0.5) {
        const snap = mix(lunge, {...lunge, headX: 0.42, headFwd: 0.13, jaw: 0}, easeInOut((time - 0.35) / 0.1));
        return snap;
      }
      const shut = {...lunge, headX: 0.42, headFwd: 0.13, jaw: 0};
      return mix(shut, r, easeInOut(clamp((time - 0.55) / 0.45)));
    }
    case 'confused': {
      // verwirrt: kratzt sich mit rechts am Kopf, Kopf schief, Fragezeichen; mit Weg: langsam davonschlurfen
      const p = speed > 0.05 ? shamblePose(time, speed * 0.8) : base();
      const k = easeInOut(clamp(time / 0.5));
      const scratch = Math.sin(time * 14) * 0.1;
      p.armR = L3(-2.6 * k, -0.35 * k + 0.05, -1.9 * k + scratch * k);
      p.armL = speed > 0.05 ? L3(-1.0, 0.15, -0.3) : L3(-0.15, 0.12, -0.25);
      p.headZ = 0.32 * k + Math.sin(time * 1.4) * 0.08;
      p.headY = 0.25 * Math.sin(time * 0.9) * k;
      p.headX = 0.02;
      p.torsoX = speed > 0.05 ? 0.18 : 0.06;
      p.jaw = 0.45;
      p.question = easeInOut(clamp((time - 0.15) / 0.4));
      return p;
    }
    case 'wave': {
      const p = base();
      const k = easeInOut(clamp(time / 0.5));
      p.armR = L3(-0.1, -0.1 - 2.4 * k + Math.sin(time * 8) * 0.3 * k, -0.3);
      p.torsoZ = 0.05 * Math.sin(time * 1.5);
      p.jaw = 0.55;
      return p;
    }
    default: {
      const p = base();
      p.torsoX = 0.12 + Math.sin(time * 1.8) * 0.015;
      p.headZ = 0.18 + Math.sin(time * 0.9) * 0.05;
      return p;
    }
  }
};

/** Weicher Übergang von der vorigen Bewegung (0,4 s) */
export const zombiePoseBlended = (motion: Motion, time: number, speed: number, prev?: {motion: Motion; time: number}) => {
  const cur = zombiePose(motion, time, speed);
  if (!prev || time >= 0.4) return cur;
  return mix(zombiePose(prev.motion, prev.time + time, 0), cur, easeInOut(time / 0.4));
};

// ---------- Bauteile ----------
const useMats = () =>
  useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({color: SKIN, roughness: 0.7, flatShading: true}),
      skinDark: new THREE.MeshStandardMaterial({color: SKIN_DARK, roughness: 0.8, flatShading: true}),
      shirt: new THREE.MeshStandardMaterial({color: SHIRT, roughness: 0.9, flatShading: true, side: THREE.DoubleSide}),
      shirtDark: new THREE.MeshStandardMaterial({color: SHIRT_DARK, roughness: 0.9, flatShading: true, side: THREE.DoubleSide}),
      pants: new THREE.MeshStandardMaterial({color: PANTS, roughness: 0.95, flatShading: true, side: THREE.DoubleSide}),
      tie: new THREE.MeshStandardMaterial({color: TIE, roughness: 0.7, flatShading: true}),
      shoe: new THREE.MeshStandardMaterial({color: '#3b3330', roughness: 0.8, flatShading: true}),
      hair: new THREE.MeshStandardMaterial({color: '#3f4a33', roughness: 1, flatShading: true}),
      eye: new THREE.MeshStandardMaterial({color: '#fbfbf2', roughness: 0.3, emissive: '#c8d6a8', emissiveIntensity: 0.25}),
      pupil: new THREE.MeshBasicMaterial({color: '#151515'}),
      mouth: new THREE.MeshBasicMaterial({color: '#2a1a1c'}),
      tooth: new THREE.MeshStandardMaterial({color: '#f1ecd6', roughness: 0.5, flatShading: true}),
      q: new THREE.MeshBasicMaterial({color: '#ffd21a'}),
      qEdge: new THREE.MeshBasicMaterial({color: '#151515'}),
    }),
    [],
  );
type Mats = ReturnType<typeof useMats>;

/** Zerfranster Saum: Kranz aus kleinen Dreiecken (Stoffzipfel) */
const Fringe = ({mat, r, y, n = 9, seed = 1}: {mat: THREE.Material; r: number; y: number; n?: number; seed?: number}) => (
  <group position={[0, y, 0]}>
    {Array.from({length: n}, (_, i) => {
      const a = (i / n) * TAU + seed;
      const len = 0.05 + 0.05 * Math.abs(Math.sin(i * 2.7 + seed * 3));
      return (
        <mesh key={i} material={mat} position={[Math.sin(a) * r, -len / 2, Math.cos(a) * r]} rotation={[0, a, Math.PI]}>
          <coneGeometry args={[0.035, len, 3]} />
        </mesh>
      );
    })}
  </group>
);

const Seg = ({mat, len, r, r2}: {mat: THREE.Material; len: number; r: number; r2?: number}) => (
  <mesh material={mat} position={[0, -len / 2, 0]} castShadow>
    <cylinderGeometry args={[r, r2 ?? r * 0.85, len, 8]} />
  </mesh>
);

const Arm = ({m, limb, side, torn}: {m: Mats; limb: Limb; side: 1 | -1; torn: boolean}) => (
  <group position={[0.27 * side, 0.44, 0]} rotation={[limb.sx, 0, limb.sz]}>
    <mesh material={m.skinDark} castShadow>
      <icosahedronGeometry args={[0.085, 1]} />
    </mesh>
    <Seg mat={m.skin} len={0.3} r={0.075} />
    {/* Hemdsärmel: links kurz und zerfetzt, rechts lang */}
    <mesh material={m.shirt} position={[0, torn ? -0.08 : -0.15, 0]} castShadow>
      <cylinderGeometry args={[0.1, 0.095, torn ? 0.16 : 0.3, 8, 1, true]} />
    </mesh>
    <Fringe mat={m.shirt} r={0.095} y={torn ? -0.16 : -0.3} n={7} seed={side} />
    <group position={[0, -0.31, 0]} rotation={[limb.bend, 0, 0]}>
      <mesh material={m.skinDark}>
        <icosahedronGeometry args={[0.065, 1]} />
      </mesh>
      <Seg mat={m.skin} len={0.27} r={0.066} r2={0.055} />
      {/* Hand mit drei Fingern (krallig, aber harmlos) */}
      <group position={[0, -0.31, 0]}>
        <mesh material={m.skin} scale={[0.85, 1, 0.6]} castShadow>
          <icosahedronGeometry args={[0.075, 0]} />
        </mesh>
        {[-0.03, 0, 0.03].map((x, i) => (
          <mesh key={i} material={m.skin} position={[x, -0.07, 0]} rotation={[0.2, 0, x * 3]}>
            <cylinderGeometry args={[0.013, 0.01, 0.07, 5]} />
          </mesh>
        ))}
      </group>
    </group>
  </group>
);

const Leg = ({m, limb, side}: {m: Mats; limb: Limb; side: 1 | -1}) => (
  <group position={[0.105 * side, -0.06, 0]} rotation={[limb.sx, 0, limb.sz]}>
    <mesh material={m.skinDark}>
      <icosahedronGeometry args={[0.1, 1]} />
    </mesh>
    <mesh material={m.pants} position={[0, -0.22, 0]} castShadow>
      <cylinderGeometry args={[0.125, 0.105, 0.45, 8]} />
    </mesh>
    <group position={[0, -0.44, 0]} rotation={[limb.bend, 0, 0]}>
      <mesh material={m.skinDark}>
        <icosahedronGeometry args={[0.08, 1]} />
      </mesh>
      <Seg mat={m.skin} len={0.42} r={0.08} r2={0.062} />
      {/* Hosenbein: links zerfetzt bis übers Knie, rechts bis zur Wade */}
      <mesh material={m.pants} position={[0, side > 0 ? -0.06 : -0.13, 0]} castShadow>
        <cylinderGeometry args={[0.102, 0.096, side > 0 ? 0.12 : 0.26, 8, 1, true]} />
      </mesh>
      <Fringe mat={m.pants} r={0.098} y={side > 0 ? -0.12 : -0.26} n={8} seed={side * 2} />
      <mesh material={m.shoe} position={[0, -0.46, 0.06]} castShadow>
        <boxGeometry args={[0.13, 0.08, 0.27]} />
      </mesh>
    </group>
  </group>
);

/** Gelbes Fragezeichen (aus Ring-Bogen + Strich + Punkt), schaut zur Kamera */
export const QuestionMark = ({amount}: {amount: number}) => {
  const m = useMats();
  const time = useCurrentFrame() / 30;
  if (amount < 0.02) return null;
  const s = amount * (1 + 0.06 * Math.sin(time * 5));
  return (
    <group scale={s} rotation={[0, 0, Math.sin(time * 2.2) * 0.12]}>
      {[
        {mat: m.qEdge, w: 0.042, z: -0.006},
        {mat: m.q, w: 0.03, z: 0},
      ].map(({mat, w, z}, i) => (
        <group key={i} position={[0, 0, z]}>
          <mesh material={mat} position={[0, 0.1, 0]} rotation={[0, 0, -0.55]}>
            <torusGeometry args={[0.08, w, 6, 14, Math.PI * 1.45]} />
          </mesh>
          <mesh material={mat} position={[0, -0.01, 0]}>
            <boxGeometry args={[w * 2, 0.08, w * 0.6]} />
          </mesh>
          <mesh material={mat} position={[0, -0.12, 0]}>
            <circleGeometry args={[w * 1.2, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export const Zombie = ({pose}: {pose: ZombiePose}) => {
  const m = useMats();
  return (
    <group>
      <group position={[0, pose.hipY, 0]}>
        {/* Becken + Hose */}
        <mesh material={m.pants} scale={[1.3, 0.8, 0.9]} castShadow>
          <icosahedronGeometry args={[0.15, 1]} />
        </mesh>
        <Leg m={m} limb={pose.legL} side={1} />
        <Leg m={m} limb={pose.legR} side={-1} />
        <group position={[0, 0.06, 0]} rotation={[pose.torsoX, pose.torsoY, pose.torsoZ]}>
          {/* Bauch + Brust (Hemd, unten zerfranst, ein Loch zeigt Haut) */}
          <mesh material={m.shirt} position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.17, 0.165, 0.22, 8]} />
          </mesh>
          <Fringe mat={m.shirt} r={0.165} y={0.0} n={11} seed={0.4} />
          <mesh material={m.shirt} position={[0, 0.34, 0]} scale={[1.33, 1.25, 0.85]} castShadow>
            <icosahedronGeometry args={[0.18, 1]} />
          </mesh>
          <mesh material={m.skinDark} position={[-0.09, 0.2, 0.15]} rotation={[0.15, -0.4, 0]}>
            <circleGeometry args={[0.035, 6]} />
          </mesh>
          {/* Hemdkragen + schiefe Krawatte */}
          <mesh material={m.shirtDark} position={[0, 0.54, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.07, 0.025, 4, 10]} />
          </mesh>
          <group position={[0.01, 0.5, 0.135]} rotation={[-0.25, 0, 0.35]}>
            <mesh material={m.tie} position={[0, -0.1, 0]}>
              <boxGeometry args={[0.045, 0.2, 0.015]} />
            </mesh>
            <mesh material={m.tie} position={[0, -0.21, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.045, 0.045, 0.015]} />
            </mesh>
          </group>
          <Arm m={m} limb={pose.armL} side={1} torn />
          <Arm m={m} limb={pose.armR} side={-1} torn={false} />
          {/* Hals + Kopf */}
          <mesh material={m.skinDark} position={[0, 0.58, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 0.1, 6]} />
          </mesh>
          <group position={[0, 0.74, pose.headFwd]} rotation={[pose.headX, pose.headY, pose.headZ]}>
            <mesh material={m.skin} scale={[0.95, 1.1, 1.0]} castShadow>
              <icosahedronGeometry args={[0.135, 1]} />
            </mesh>
            {/* Kulleraugen: links groß, rechts klein (witzig, nicht gruselig) */}
            {[
              {x: 0.055, r: 0.042, py: 0.0},
              {x: -0.055, r: 0.03, py: 0.01},
            ].map((e, i) => (
              <group key={i} position={[e.x, 0.03, 0.115]}>
                <mesh material={m.eye}>
                  <icosahedronGeometry args={[e.r, 1]} />
                </mesh>
                <mesh material={m.pupil} position={[i ? 0.004 : -0.006, e.py - 0.004, e.r * 0.92]}>
                  <circleGeometry args={[e.r * 0.42, 8]} />
                </mesh>
              </group>
            ))}
            {/* Mund (Kiefer klappt auf) mit zwei Zähnen */}
            <group position={[0, -0.06, 0.112]}>
              <mesh material={m.mouth} scale={[1, 0.25 + pose.jaw * 0.9, 1]}>
                <boxGeometry args={[0.1, 0.045, 0.02]} />
              </mesh>
              {[-0.025, 0.02].map((x) => (
                <mesh key={x} material={m.tooth} position={[x, 0.008 + 0.006 * pose.jaw, 0.012]}>
                  <boxGeometry args={[0.018, 0.02, 0.008]} />
                </mesh>
              ))}
            </group>
            {/* wirre Haarbüschel */}
            {[
              [0.03, 0.14, 0.0, 0.3],
              [-0.05, 0.13, 0.03, -0.4],
              [0.0, 0.135, -0.06, 0.1],
              [0.07, 0.11, -0.04, 0.8],
            ].map(([x, y, z, rz], i) => (
              <mesh key={i} material={m.hair} position={[x, y, z]} rotation={[0.2, 0, rz]}>
                <coneGeometry args={[0.03, 0.09, 4]} />
              </mesh>
            ))}
            <mesh material={m.skinDark} position={[0.135, 0.0, 0]} scale={[0.4, 1, 0.7]}>
              <icosahedronGeometry args={[0.04, 0]} />
            </mesh>
            <mesh material={m.skinDark} position={[-0.135, 0.0, 0]} scale={[0.4, 1, 0.7]}>
              <icosahedronGeometry args={[0.04, 0]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
