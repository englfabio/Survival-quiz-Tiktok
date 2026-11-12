import {useMemo} from 'react';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut} from '../lib/anim';
import {BoxingGlove} from './ToothProps';

/**
 * Känguru (Figurname "kaenguru"): gleicher stilisierter Low-Poly-Look wie die anderen Figuren, rotbraunes Fell,
 * heller Bauch, große Ohren, Kulleraugen mit halb geschlossenen Lidern + hochgezogener Augenbraue (frech, nicht
 * bedrohlich), rote Boxhandschuhe. Steht aufrecht ca. 1,75 m hoch, lehnt sich auf den Schwanz.
 * Blickt im eigenen Koordinatensystem nach +z.
 *
 * Bewegungen:
 *  - stand:   ruhig stehen, Pfoten locker vor dem Bauch
 *  - guard:   Boxhaltung, Fäuste vor dem Gesicht, wippt auf dem Schwanz
 *  - hop:     hüpfen (Weg über Zeitpunkte; ohne Weg = auf der Stelle), Sprung alle 0,6 s
 *  - punch:   Schlag mit rechts: ausholen 0–0,25 s, Treffer bei 0,4 s (Faust ca. 0,75 m vor ihm auf ca. 1,5 m Höhe),
 *             zurück in die Boxhaltung bis 0,85 s
 *  - victory: Siegerpose – beide Pfoten hoch, kleine Hüpfer, freches Grinsen, Ohren wackeln
 */

const FUR = '#b9653a';
const FUR_DARK = '#94502d';
const BELLY = '#ecd2ab';
const INNER_EAR = '#e9a98f';

type Arm = {sx: number; sz: number; bend: number};
export type KangarooPose = {
  lift: number; // ganzer Körper hoch (Sprung)
  crouch: number; // 0 = aufrecht … 1 = tief in den Knien
  lean: number; // Oberkörper nach vorn (rad)
  twist: number; // Oberkörper drehen (rad, + = nach links)
  headX: number;
  headY: number;
  headZ: number;
  armL: Arm;
  armR: Arm;
  foot: number; // Zehen nach unten (Flug)
  tail: number; // Schwanz anheben (m)
  grin: number; // 0 … 1
  ears: number; // Ohren wackeln (rad)
};

const A = (sx: number, sz: number, bend: number): Arm => ({sx, sz, bend});
const mixA = (a: Arm, b: Arm, k: number): Arm => ({sx: a.sx + (b.sx - a.sx) * k, sz: a.sz + (b.sz - a.sz) * k, bend: a.bend + (b.bend - a.bend) * k});

const base = (): KangarooPose => ({
  lift: 0,
  crouch: 0.15,
  lean: 0.18,
  twist: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
  armL: A(-0.45, 0.15, -1.3),
  armR: A(-0.45, -0.15, -1.3),
  foot: 0,
  tail: 0,
  grin: 0.35,
  ears: 0,
});

const GUARD_L = A(-0.85, -0.35, -2.05);
const GUARD_R = A(-0.85, 0.35, -2.05);

export const kangarooPose = (motion: Motion, time: number, speed = 0): KangarooPose => {
  const p = base();
  switch (motion) {
    case 'guard': {
      const b = Math.abs(Math.sin(time * 5.2));
      p.lift = 0.035 * b;
      p.crouch = 0.25 - 0.08 * b;
      p.lean = 0.12;
      p.armL = GUARD_L;
      p.armR = GUARD_R;
      p.headX = 0.12 + Math.sin(time * 2.6) * 0.04;
      p.headY = Math.sin(time * 1.7) * 0.12;
      p.twist = Math.sin(time * 2.6) * 0.08;
      p.grin = 0.55;
      return p;
    }
    case 'hop': {
      const P = 0.6;
      const ph = (time % P) / P;
      const air = ph < 0.62;
      const k = air ? Math.sin((Math.PI * ph) / 0.62) : 0;
      const land = air ? 0 : Math.sin((Math.PI * (ph - 0.62)) / 0.38);
      const amp = speed > 0.2 ? 0.34 : 0.22;
      p.lift = amp * k;
      p.crouch = 0.2 + 0.45 * land + 0.1 * (1 - k);
      p.lean = speed > 0.2 ? 0.55 : 0.3;
      p.foot = 0.9 * k;
      p.tail = 0.25 * k;
      p.armL = A(-0.7, -0.2, -1.7);
      p.armR = A(-0.7, 0.2, -1.7);
      p.headX = -p.lean * 0.6;
      p.ears = Math.sin(time * 9) * 0.12;
      return p;
    }
    case 'punch': {
      const wind = easeInOut(clamp(time / 0.25));
      const strike = easeInOut(clamp((time - 0.25) / 0.15));
      const back = easeInOut(clamp((time - 0.55) / 0.3));
      const windR = A(-0.55, 0.45, -2.3);
      const hitR = A(-1.42, 0.05, -0.05);
      let r = mixA(GUARD_R, windR, wind);
      r = mixA(r, hitR, strike);
      r = mixA(r, GUARD_R, back);
      p.armR = r;
      p.armL = GUARD_L;
      p.twist = (-0.3 * wind + 0.6 * strike) * (1 - back);
      p.lean = 0.12 + 0.25 * strike * (1 - back);
      p.crouch = 0.25;
      p.headX = 0.1;
      p.grin = 0.7 + 0.3 * strike;
      return p;
    }
    case 'victory': {
      const up = easeInOut(clamp(time / 0.45));
      const ph = Math.max(0, time - 0.45);
      const b = Math.abs(Math.sin(ph * Math.PI * 1.4));
      p.lift = 0.1 * b * up;
      p.crouch = 0.15 + 0.1 * (1 - b);
      p.lean = 0.05;
      const wave = Math.sin(ph * 6) * 0.12;
      p.armL = mixA(p.armL, A(-2.75 + wave, 0.75, -0.25), up);
      p.armR = mixA(p.armR, A(-2.75 - wave, -0.75, -0.25), up);
      p.headX = -0.22 * up;
      p.headY = Math.sin(ph * 2.2) * 0.2;
      p.headZ = Math.sin(ph * 3.1) * 0.1;
      p.grin = 1;
      p.ears = Math.sin(ph * 11) * 0.2;
      return p;
    }
    case 'walk':
    case 'stand':
    default: {
      p.lean = 0.18 + Math.sin(time * 2.1) * 0.015;
      p.headY = Math.sin(time * 0.9) * 0.15;
      p.ears = Math.sin(time * 1.3) * 0.06;
      return p;
    }
  }
};

/** Mit weichem Übergang von der vorigen Bewegung (0,35 s) */
export const kangarooPoseBlended = (motion: Motion, time: number, speed: number, prev?: {motion: Motion; time: number}) => {
  const cur = kangarooPose(motion, time, speed);
  const BL = 0.35;
  if (!prev || time >= BL) return cur;
  const a = kangarooPose(prev.motion, prev.time + time, 0);
  const k = easeInOut(time / BL);
  const L = (x: number, y: number) => x + (y - x) * k;
  return {
    lift: L(a.lift, cur.lift),
    crouch: L(a.crouch, cur.crouch),
    lean: L(a.lean, cur.lean),
    twist: L(a.twist, cur.twist),
    headX: L(a.headX, cur.headX),
    headY: L(a.headY, cur.headY),
    headZ: L(a.headZ, cur.headZ),
    armL: mixA(a.armL, cur.armL, k),
    armR: mixA(a.armR, cur.armR, k),
    foot: L(a.foot, cur.foot),
    tail: L(a.tail, cur.tail),
    grin: L(a.grin, cur.grin),
    ears: L(a.ears, cur.ears),
  };
};

// ---------- Bauteile ----------
const UP = new THREE.Vector3(0, 1, 0);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Zylinder zwischen zwei Punkten */
const Bone = ({a, b, r, r2, mat}: {a: THREE.Vector3; b: THREE.Vector3; r: number; r2?: number; mat: THREE.Material}) => {
  const d = b.clone().sub(a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return (
    <mesh material={mat} position={mid} quaternion={q} castShadow>
      <cylinderGeometry args={[r2 ?? r, r, len, 7]} />
    </mesh>
  );
};

/** Ellipsoid zwischen zwei Punkten (dick in der Mitte) */
const Blob = ({a, b, r, mat, flat = 1}: {a: THREE.Vector3; b: THREE.Vector3; r: number; mat: THREE.Material; flat?: number}) => {
  const d = b.clone().sub(a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return (
    <mesh material={mat} position={mid} quaternion={q} scale={[r, len / 2, r * flat]} castShadow>
      <icosahedronGeometry args={[1, 1]} />
    </mesh>
  );
};

/** Arm-Punkte im Oberkörper-System (Schulter = Ursprung). Oberarm 0,2, Unterarm 0,19 */
const armPts = (arm: Arm) => {
  const e1 = new THREE.Euler(arm.sx, 0, arm.sz);
  const elbow = V(0, -0.2, 0).applyEuler(e1);
  const hand = V(0, -0.19, 0).applyEuler(new THREE.Euler(arm.bend, 0, 0)).applyEuler(e1).add(elbow);
  return {elbow, hand};
};

export const Kangaroo = ({pose}: {pose: KangarooPose}) => {
  const m = useMemo(
    () => ({
      fur: new THREE.MeshStandardMaterial({color: FUR, roughness: 0.75, flatShading: true}),
      dark: new THREE.MeshStandardMaterial({color: FUR_DARK, roughness: 0.8, flatShading: true}),
      belly: new THREE.MeshStandardMaterial({color: BELLY, roughness: 0.85, flatShading: true}),
      ear: new THREE.MeshStandardMaterial({color: INNER_EAR, roughness: 0.8, flatShading: true, side: THREE.DoubleSide}),
      eye: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.25}),
      pupil: new THREE.MeshBasicMaterial({color: '#1a1410'}),
      shine: new THREE.MeshBasicMaterial({color: '#ffffff'}),
      nose: new THREE.MeshStandardMaterial({color: '#2a1d18', roughness: 0.3}),
      mouth: new THREE.MeshBasicMaterial({color: '#3a1a12'}),
      tongue: new THREE.MeshStandardMaterial({color: '#e0706a', roughness: 0.6}),
    }),
    [],
  );
  const p = pose;
  const hipY = 0.6 - 0.18 * p.crouch + p.lift;
  const H = V(0, hipY, 0);
  // Beine (je Seite): Oberschenkel nach vorn-unten, Schienbein zur Ferse hinten, langer Fuß nach vorn
  const legs = [1, -1].map((s) => {
    const x = 0.12 * s;
    const knee = V(x, hipY - 0.2 + 0.05 * p.crouch, 0.2 + 0.06 * p.crouch);
    const heel = V(x, 0.06 + p.lift * 0.9, -0.14 - 0.05 * p.crouch);
    const tl = 0.4;
    const toe = V(x, heel.y - Math.sin(p.foot) * tl, heel.z + Math.cos(p.foot) * tl);
    return {x, knee, heel, toe};
  });
  // Schwanz: zwei Bögen nach hinten auf den Boden
  const tb = V(0, hipY - 0.05, -0.16);
  const tm = V(0, Math.max(0.12, hipY * 0.45) + p.tail * 0.6, -0.6);
  const tt = V(0, 0.05 + p.tail, -1.02);
  // Oberkörper
  const torsoRot = new THREE.Euler(p.lean, p.twist, 0, 'YXZ');
  const T = (v: THREE.Vector3) => v.clone().applyEuler(torsoRot).add(H);
  const chest = T(V(0, 0.56, 0.04));
  const belly = T(V(0, 0.22, 0.06));
  const neck = T(V(0, 0.72, 0.06));
  const shoulders = [1, -1].map((s) => V(0.14 * s, 0.6, 0.1));
  const arms = [p.armL, p.armR].map((arm, i) => {
    const sh = shoulders[i];
    const {elbow, hand} = armPts(arm);
    return {sh: T(sh), elbow: T(sh.clone().add(elbow)), hand: T(sh.clone().add(hand))};
  });
  const headRot = new THREE.Euler(p.lean * 0.5 + p.headX, p.twist + p.headY, p.headZ, 'YXZ');
  const grin = p.grin;
  return (
    <group>
      {/* Beine */}
      {legs.map((l, i) => (
        <group key={i}>
          <Blob a={H.clone().add(V(l.x * 0.9, 0.05, -0.05))} b={l.knee} r={0.13} mat={m.fur} />
          <Bone a={l.knee} b={l.heel} r={0.05} r2={0.06} mat={m.fur} />
          <Blob a={l.heel} b={l.toe} r={0.05} mat={m.dark} flat={0.7} />
        </group>
      ))}
      {/* Schwanz */}
      <Bone a={tb} b={tm} r={0.07} r2={0.11} mat={m.fur} />
      <Bone a={tm} b={tt} r={0.025} r2={0.07} mat={m.fur} />
      {/* Körper: birnenförmig, heller Bauch */}
      <Blob a={H.clone().add(V(0, -0.08, 0))} b={chest} r={0.21} mat={m.fur} flat={0.9} />
      <mesh material={m.belly} position={belly.clone().add(V(0, 0, 0.11).applyEuler(torsoRot))} quaternion={new THREE.Quaternion().setFromEuler(torsoRot)} scale={[0.15, 0.27, 0.1]}>
        <icosahedronGeometry args={[1, 1]} />
      </mesh>
      <Blob a={chest.clone().add(V(0, -0.05, 0))} b={neck} r={0.1} mat={m.fur} />
      {/* Arme + Handschuhe */}
      {arms.map((a, i) => {
        const dir = a.hand.clone().sub(a.elbow).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), dir);
        return (
          <group key={i}>
            <Bone a={a.sh} b={a.elbow} r={0.045} r2={0.055} mat={m.fur} />
            <Bone a={a.elbow} b={a.hand} r={0.04} r2={0.045} mat={m.fur} />
            <group position={a.hand} quaternion={q}>
              <BoxingGlove s={1.05} />
            </group>
          </group>
        );
      })}
      {/* Kopf */}
      <group position={neck.clone().add(V(0, 0.1, 0.02))} rotation={headRot}>
        <mesh material={m.fur} scale={[0.1, 0.105, 0.12]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        {/* Schnauze */}
        <mesh material={m.fur} position={[0, -0.035, 0.11]} scale={[0.065, 0.06, 0.095]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        <mesh material={m.belly} position={[0, -0.07, 0.12]} scale={[0.05, 0.03, 0.07]}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        <mesh material={m.nose} position={[0, -0.01, 0.2]} scale={[0.028, 0.02, 0.02]}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        {/* freches Grinsen (schief) */}
        <group position={[0.012, -0.058, 0.165]} rotation={[0.3, 0, -0.18]}>
          <mesh material={m.mouth} rotation={[0, 0, Math.PI]} scale={[1, 0.55 + 0.6 * grin, 1]}>
            <torusGeometry args={[0.034, 0.006, 4, 10, Math.PI * (0.55 + 0.35 * grin)]} />
          </mesh>
          {grin > 0.6 && (
            <mesh material={m.tongue} position={[0.008, -0.022 * grin, 0.002]} scale={[0.014, 0.008, 0.006]}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
          )}
        </group>
        {/* Augen: groß, Lider halb zu, eine Braue hochgezogen */}
        {[1, -1].map((s) => (
          <group key={s} position={[0.055 * s, 0.03, 0.075]} rotation={[0, 0.35 * s, 0]}>
            <mesh material={m.eye} scale={[0.036, 0.042, 0.03]}>
              <sphereGeometry args={[1, 12, 10]} />
            </mesh>
            <mesh material={m.pupil} position={[-0.006 * s, -0.004, 0.026]} scale={[0.017, 0.021, 0.008]}>
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
            <mesh material={m.shine} position={[-0.0 * s, 0.006, 0.033]} scale={0.005}>
              <sphereGeometry args={[1, 6, 6]} />
            </mesh>
            {/* Lid (halb zu = lässig/frech) */}
            <mesh material={m.dark} position={[0, 0.012, 0.004]} rotation={[-0.35, 0, 0]} scale={[0.039, 0.024, 0.034]}>
              <sphereGeometry args={[1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh material={m.nose} position={[0, 0.05 + (s < 0 ? 0.012 : 0), 0.012]} rotation={[0, 0, (s < 0 ? -0.35 : 0.2) * s]}>
              <boxGeometry args={[0.05, 0.009, 0.012]} />
            </mesh>
          </group>
        ))}
        {/* Ohren */}
        {[1, -1].map((s) => (
          <group key={s} position={[0.05 * s, 0.08, -0.02]} rotation={[-0.25 + p.ears * s, 0, -0.28 * s]}>
            <mesh material={m.fur} position={[0, 0.08, 0]} scale={[0.045, 0.1, 0.02]} castShadow>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <mesh material={m.ear} position={[0, 0.08, 0.012]} scale={[0.028, 0.075, 0.01]}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};
