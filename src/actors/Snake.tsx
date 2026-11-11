import {useMemo} from 'react';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut, lerp} from '../lib/anim';

/**
 * Stilisierte Low-Poly-Kreuzotter, gleicher Look wie Dummy und Bär (einfache Formen, flach schattiert).
 * Graubraun mit dunklem Zickzackband auf dem Rücken, dunkles X auf dem Kopf, kupferrote Augen.
 * Blickt im eigenen Koordinatensystem nach +z. Länge ca. 0,7 m (wird in actors/index.tsx leicht vergrößert).
 * Bewegungen: slither (schlängeln / wegschlängeln), coil (zusammengerollt), strike (zubeißen – kurz, nicht blutig).
 */

const BODY = '#8a7a66';
const BELLY = '#a8977e';
const ZIGZAG = '#2b2420';
const EYE = '#c2502a';

type P = [number, number, number];
export type SnakePose = {
  /** Wirbelsäule vom Kopf (Index 0) bis zur Schwanzspitze */
  spine: P[];
  /** Maul offen 0…1 */
  mouth: number;
  /** Zunge draußen 0…1 */
  tongue: number;
};

const N = 28; // Punkte
const LEN = 0.72; // Meter
const TAU = Math.PI * 2;

/** Dicke entlang des Körpers (0 = Kopf, 1 = Schwanz) */
const radiusAt = (u: number) => {
  if (u < 0.06) return 0.022; // Hals hinter dem Kopf
  if (u < 0.2) return lerp(0.022, 0.032, (u - 0.06) / 0.14);
  if (u < 0.7) return 0.033;
  return lerp(0.033, 0.006, (u - 0.7) / 0.3);
};

/** Schlängeln: Welle läuft vom Kopf zum Schwanz */
const slitherSpine = (time: number, speed: number): P[] => {
  const w = TAU * Math.max(0.9, Math.min(2.4, speed * 3.2));
  const pts: P[] = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const s = u * LEN;
    const amp = 0.075 * Math.min(1, 0.35 + u * 2);
    pts.push([amp * Math.sin(s * 11 - time * w), 0.022 + (u < 0.08 ? 0.025 * (1 - u / 0.08) : 0), 0.32 - s * 0.9]);
  }
  return pts;
};

/** Zusammengerollt: flache Spirale, Kopf liegt oben in der Mitte und schaut nach vorn */
const coilSpine = (time: number, neckLift = 0): P[] => {
  const pts: P[] = [];
  const neckN = 6;
  // Körper: Spirale von innen (nahe Hals) nach außen (Schwanz)
  const bodyN = N - neckN;
  for (let j = 0; j < bodyN; j++) {
    const u = j / (bodyN - 1);
    const ang = 0.6 + u * TAU * 1.55;
    const r = 0.05 + u * 0.12;
    const y = 0.075 - u * 0.05;
    pts.push([r * Math.sin(ang), y, -0.02 + r * Math.cos(ang)]);
  }
  // Hals + Kopf: von der Spiralmitte nach vorn, leicht angehoben
  const start = pts[0];
  const breathe = Math.sin(time * 1.6) * 0.004;
  const neck: P[] = [];
  for (let k = neckN; k >= 1; k--) {
    const v = k / neckN; // 1 = Kopf
    neck.push([
      start[0] * (1 - v) + 0.02 * Math.sin(v * 3 + time * 0.8),
      start[1] + (0.02 + neckLift * 0.08) * Math.sin(v * Math.PI * 0.9) + 0.012 * v + breathe,
      start[2] + v * 0.17,
    ]);
  }
  return [...neck, ...pts];
};

/** Zubeißen: S-Haltung, Kopf schnellt kurz vor (bei ca. 0,35 s) und wieder zurück */
const strikeSpine = (time: number): {spine: P[]; mouth: number} => {
  const base = coilSpine(time, 0.4);
  // Anlauf 0…0.35 s: Hals hebt sich zur S-Form
  const lift = easeInOut(clamp(time / 0.35));
  // Vorschnellen 0.35…0.47 s, halten bis 0.55, zurück bis 0.9 s
  const out =
    time < 0.35 ? 0 : time < 0.47 ? easeInOut((time - 0.35) / 0.12) : time < 0.55 ? 1 : 1 - easeInOut((time - 0.55) / 0.35);
  const neckN = 8;
  const spine = base.map((p, i) => {
    if (i >= neckN) return p;
    const v = 1 - i / neckN; // 1 = Kopf
    // S-Kurve (angespannt)
    const sx = 0.05 * Math.sin(v * TAU * 0.9) * lift;
    const sy = p[1] + 0.035 * Math.sin(v * Math.PI) * lift;
    const sz = p[2] - 0.06 * v * lift;
    // gestreckt nach vorn
    const ex = 0;
    const ey = 0.05 + 0.05 * v;
    const ez = -0.02 + v * 0.58;
    return [lerp(sx + p[0] * (1 - lift), ex, out), lerp(sy, ey, out), lerp(sz, ez, out)] as P;
  });
  return {spine, mouth: out > 0.2 ? Math.min(1, out * 1.3) : 0};
};

export const snakePose = (motion: Motion, time: number, speed: number): SnakePose => {
  const flick = (t: number) => {
    const c = t % 2.3;
    return c < 0.35 ? Math.sin((c / 0.35) * Math.PI) : 0;
  };
  switch (motion) {
    case 'slither':
    case 'walk':
    case 'run':
      return {spine: slitherSpine(time, speed), mouth: 0, tongue: flick(time + 0.8)};
    case 'strike': {
      const s = strikeSpine(time);
      return {spine: s.spine, mouth: s.mouth, tongue: time > 1.2 ? flick(time) : 0};
    }
    case 'coil':
    default:
      return {spine: coilSpine(time), mouth: 0, tongue: flick(time)};
  }
};

// ---------- Darstellung ----------
const UP = new THREE.Vector3(0, 1, 0);

const useMats = () =>
  useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({color: BODY, roughness: 0.75, flatShading: true}),
      belly: new THREE.MeshStandardMaterial({color: BELLY, roughness: 0.8, flatShading: true}),
      zig: new THREE.MeshStandardMaterial({color: ZIGZAG, roughness: 0.7, flatShading: true}),
      eye: new THREE.MeshStandardMaterial({color: EYE, roughness: 0.3, emissive: '#3a1006', flatShading: true}),
      tongue: new THREE.MeshStandardMaterial({color: '#1d1a1a', roughness: 0.6}),
    }),
    [],
  );

export const Snake = ({pose}: {pose: SnakePose}) => {
  const m = useMats();
  const {spine} = pose;
  const segs = [];
  for (let i = 0; i < spine.length - 1; i++) {
    const a = new THREE.Vector3(...spine[i]);
    const b = new THREE.Vector3(...spine[i + 1]);
    const dir = b.clone().sub(a);
    const len = dir.length() || 0.001;
    dir.normalize();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    const u = i / (spine.length - 1);
    const r = radiusAt(u);
    // Seitenrichtung für das Zickzack (waagrecht, quer zum Körper)
    const side = new THREE.Vector3().crossVectors(dir, UP);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const zigOff = (i % 2 === 0 ? 1 : -1) * r * 0.22;
    const zigPos = mid.clone().addScaledVector(UP, r * 0.9).addScaledVector(side, zigOff);
    // Zickzack-Balken: schräg zur Körperachse, abwechselnd links/rechts geneigt
    const yaw = (i % 2 === 0 ? 1 : -1) * 0.75;
    const zq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw));
    segs.push(
      <group key={i}>
        <mesh material={m.body} position={mid} quaternion={q} castShadow>
          <cylinderGeometry args={[r, radiusAt((i + 1) / (spine.length - 1)), len * 1.08, 6]} />
        </mesh>
        <mesh material={m.body} position={a} castShadow>
          <icosahedronGeometry args={[r * 1.02, 0]} />
        </mesh>
        {i > 2 && u < 0.9 && (
          <mesh material={m.zig} position={zigPos} quaternion={zq} scale={[1, 1, 1]}>
            <boxGeometry args={[r * 0.42, len * 1.25, r * 0.22]} />
          </mesh>
        )}
        {/* dunkle Seitenflecken */}
        {i > 3 && i % 2 === 1 && u < 0.85 && (
          <mesh material={m.zig} position={mid.clone().addScaledVector(side, r * 0.9 * (i % 4 === 1 ? 1 : -1)).addScaledVector(UP, r * 0.2)}>
            <icosahedronGeometry args={[r * 0.22, 0]} />
          </mesh>
        )}
      </group>,
    );
  }
  // Kopf: Richtung von Punkt 1 zu Punkt 0
  const h0 = new THREE.Vector3(...spine[0]);
  const h1 = new THREE.Vector3(...spine[1]);
  const fwd = h0.clone().sub(h1).normalize();
  const yawH = Math.atan2(fwd.x, fwd.z);
  const pitchH = -Math.asin(clamp(fwd.y, -1, 1));
  const headPos = h0.clone().addScaledVector(fwd, 0.03);
  return (
    <group>
      {segs}
      <group position={headPos} rotation={[pitchH, yawH, 0, 'YXZ']}>
        {/* Oberkopf (breit, flach – typisch Otter) */}
        <mesh material={m.body} position={[0, 0.006, 0.012]} scale={[0.036, 0.02, 0.05]} castShadow>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
        {/* Unterkiefer (klappt beim Zubeißen auf) */}
        <group position={[0, -0.006, -0.01]} rotation={[0.55 * pose.mouth, 0, 0]}>
          <mesh material={m.belly} position={[0, -0.006, 0.025]} scale={[0.028, 0.009, 0.042]}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        </group>
        {/* dunkles X auf dem Kopf */}
        {[1, -1].map((s) => (
          <mesh key={s} material={m.zig} position={[0, 0.022, 0.008]} rotation={[0, s * 0.6, 0]}>
            <boxGeometry args={[0.008, 0.004, 0.05]} />
          </mesh>
        ))}
        {/* Augen */}
        {[1, -1].map((s) => (
          <mesh key={`e${s}`} material={m.eye} position={[0.026 * s, 0.01, 0.03]}>
            <icosahedronGeometry args={[0.0075, 0]} />
          </mesh>
        ))}
        {/* Zunge (dunkel, gespalten) */}
        {pose.tongue > 0.05 &&
          [1, -1].map((s) => (
            <mesh
              key={`t${s}`}
              material={m.tongue}
              position={[0.004 * s, -0.004, 0.06 + 0.02 * pose.tongue]}
              rotation={[Math.PI / 2, 0, s * 0.25]}
            >
              <cylinderGeometry args={[0.0018, 0.0018, 0.04 * pose.tongue, 3]} />
            </mesh>
          ))}
      </group>
    </group>
  );
};
