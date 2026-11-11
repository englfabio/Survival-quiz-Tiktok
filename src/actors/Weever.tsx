import {useMemo} from 'react';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut, lerp} from '../lib/anim';

/**
 * Petermännchen (Figurname "petermaennchen"): kleiner, länglicher Giftfisch im Low-Poly-Look.
 * Sandfarben mit feinen dunklen Schrägstreifen, Augen oben auf dem Kopf (schauen nach oben),
 * schwarze erste Rückenflosse mit Stacheln. Blickt im eigenen Koordinatensystem nach +z.
 * Länge ca. 0,3 m (wird in actors/index.tsx vergrößert, damit er im Hochformat gut zu sehen ist).
 *
 * Bewegungen:
 * - buried   im Sand eingegraben, nur die Augen schauen heraus
 * - finup    Rückenflosse mit Stacheln aufstellen (kommt dabei ein Stück aus dem Sand)
 * - swimaway aus dem Sand heraus und davonschwimmen (Weg über die Zeitpunkte)
 */

const SAND = '#b0925e';
const BELLY = '#ddc9a0';
const STRIPE = '#5e4a30';
const FIN = '#141414';
const EYE = '#e8d27a';

export type WeeverPose = {
  /** 1 = ganz eingegraben (nur Augen), 0 = frei */
  bury: number;
  /** Rückenflosse 0 = angelegt … 1 = aufgestellt */
  fin: number;
  /** Schlängeln: Phase + Stärke */
  phase: number;
  amp: number;
  /** über dem Boden schweben (Meter) */
  lift: number;
};

const LEN = 0.3;
const N = 12;

export const weeverPose = (motion: Motion, time: number): WeeverPose => {
  switch (motion) {
    case 'finup': {
      const k = easeInOut(clamp(time / 0.35));
      return {bury: lerp(1, 0.55, k), fin: k, phase: time * 3, amp: 0.008 * k, lift: 0};
    }
    case 'swimaway':
    case 'walk':
    case 'run': {
      const k = easeInOut(clamp(time / 0.3));
      return {bury: lerp(0.55, 0, k), fin: lerp(1, 0.45, k), phase: time * 16, amp: 0.035 * k, lift: 0.045 * k};
    }
    case 'buried':
    default:
      return {bury: 1, fin: 0.12, phase: time * 1.2, amp: 0, lift: 0};
  }
};

/** Dicke entlang des Körpers (0 = Maul, 1 = Schwanz): Höhe und Breite */
const profile = (u: number) => {
  const h = u < 0.25 ? lerp(0.022, 0.036, u / 0.25) : u < 0.75 ? lerp(0.036, 0.022, (u - 0.25) / 0.5) : lerp(0.022, 0.008, (u - 0.75) / 0.25);
  return {h, w: h * 0.78};
};

const useMats = () =>
  useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({color: SAND, roughness: 0.7, flatShading: true}),
      belly: new THREE.MeshStandardMaterial({color: BELLY, roughness: 0.8, flatShading: true}),
      stripe: new THREE.MeshStandardMaterial({color: STRIPE, roughness: 0.8, flatShading: true}),
      fin: new THREE.MeshStandardMaterial({color: FIN, roughness: 0.6, flatShading: true, side: THREE.DoubleSide}),
      soft: new THREE.MeshStandardMaterial({color: '#a68a5a', roughness: 0.8, flatShading: true, side: THREE.DoubleSide, transparent: true, opacity: 0.9}),
      eye: new THREE.MeshStandardMaterial({color: EYE, roughness: 0.3, emissive: '#3a3010', flatShading: true}),
      pupil: new THREE.MeshBasicMaterial({color: '#0b0b0b'}),
      mound: new THREE.MeshStandardMaterial({color: '#dcc796', roughness: 1, flatShading: true}),
    }),
    [],
  );

/** Dreieckige Flosse als flaches Mesh (Punkte im y/z-Plan) */
const finGeo = (pts: [number, number][]) => {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][1], pts[0][0]);
  for (const p of pts.slice(1)) shape.lineTo(p[1], p[0]);
  const g = new THREE.ShapeGeometry(shape);
  // Shape liegt in x/y → drehen, damit x = Länge (z) und y = Höhe
  g.rotateY(-Math.PI / 2);
  return g;
};

export const Weever = ({pose}: {pose: WeeverPose}) => {
  const m = useMats();
  const geos = useMemo(
    () => ({
      second: finGeo([
        [0, 0],
        [0.022, 0.01],
        [0.02, 0.12],
        [0, 0.13],
      ]),
      anal: finGeo([
        [0, 0],
        [-0.018, 0.01],
        [-0.016, 0.13],
        [0, 0.14],
      ]),
      tail: finGeo([
        [0, 0],
        [0.035, -0.05],
        [-0.035, -0.05],
      ]),
      membrane: finGeo([
        [0, 0],
        [0.05, -0.004],
        [0.032, -0.04],
        [0, -0.045],
      ]),
    }),
    [],
  );

  // Wirbelsäule: von Maul (+z) bis Schwanz (−z), seitliches Schlängeln
  const spine: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const z = LEN / 2 - u * LEN;
    const x = pose.amp * Math.pow(u, 1.3) * Math.sin(u * 7 - pose.phase);
    spine.push(new THREE.Vector3(x, 0, z));
  }
  // eingegraben: Oberkante der Augen knapp über dem Sand (y ≈ 0.008)
  const eyeTop = 0.034 + 0.012;
  const y = lerp(0.03 + pose.lift, 0.014 - eyeTop, pose.bury);
  const UP = new THREE.Vector3(0, 1, 0);

  const segs = [];
  for (let i = 0; i < N - 1; i++) {
    const a = spine[i];
    const b = spine[i + 1];
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const yaw = Math.atan2(dir.x, dir.z);
    const u = (i + 0.5) / (N - 1);
    const pr = profile(u);
    segs.push(
      <group key={i} position={mid} rotation={[0, yaw, 0]}>
        <mesh material={m.body} rotation={[Math.PI / 2, 0, 0]} scale={[pr.w / pr.h, 1, 1]} castShadow>
          <cylinderGeometry args={[profile(i / (N - 1)).h, profile((i + 1) / (N - 1)).h, len * 1.12, 7]} />
        </mesh>
        <mesh material={m.belly} position={[0, -pr.h * 0.55, 0]} scale={[pr.w * 0.8, pr.h * 0.45, len * 0.55]}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
        {/* feine dunkle Schrägstreifen auf den Flanken */}
        {i > 2 && i < N - 3 && i % 2 === 1 &&
          [1, -1].map((s) => (
            <mesh key={s} material={m.stripe} position={[s * pr.w * 0.9, pr.h * 0.35, 0]} rotation={[0.6, 0, 0]}>
              <boxGeometry args={[0.002, pr.h * 0.7, 0.004]} />
            </mesh>
          ))}
      </group>,
    );
  }

  const head = spine[0];
  const tailEnd = spine[N - 1];
  const tailDir = tailEnd.clone().sub(spine[N - 2]);
  const tailYaw = Math.atan2(tailDir.x, tailDir.z);
  const finAngle = lerp(-1.25, 0, pose.fin); // um die x-Achse: angelegt (nach hinten) … aufgestellt
  const finBase = spine[2];

  return (
    <group position={[0, y, 0]}>
      {segs}
      {/* Kopf: leicht schräg nach oben gerichtetes Maul */}
      <group position={[head.x, 0.002, head.z]}>
        <mesh material={m.body} scale={[0.026, 0.024, 0.04]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        <mesh material={m.belly} position={[0, -0.01, 0.022]} rotation={[-0.5, 0, 0]} scale={[0.018, 0.008, 0.022]}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
        {/* Augen oben auf dem Kopf, schauen nach oben */}
        {[1, -1].map((s) => (
          <group key={s} position={[0.0095 * s, 0.024, 0.005]}>
            <mesh material={m.eye} scale={[0.011, 0.012, 0.011]}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <mesh material={m.pupil} position={[0.001 * s, 0.0105, 0.001]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.005, 8]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* erste Rückenflosse: schwarz, mit Stacheln (aufstellbar) */}
      <group position={[finBase.x, 0.032, finBase.z]} rotation={[finAngle, 0, 0]}>
        {[0, 1, 2, 3, 4].map((k) => (
          <mesh key={k} material={m.fin} position={[0, 0.026, -k * 0.011]} rotation={[-0.25 - k * 0.07, 0, 0]}>
            <coneGeometry args={[0.0028, 0.055 - k * 0.006, 4]} />
          </mesh>
        ))}
        {/* Flossenhaut zwischen den Stacheln */}
        <mesh material={m.fin} geometry={geos.membrane} position={[0, 0, 0.002]} />
      </group>
      {/* zweite Rückenflosse (lang, niedrig, sandfarben) und Afterflosse */}
      <mesh material={m.soft} geometry={geos.second} position={[spine[4].x, 0.026, spine[4].z]} rotation={[0, Math.PI, 0]} />
      <mesh material={m.soft} geometry={geos.anal} position={[spine[4].x, -0.02, spine[4].z]} rotation={[0, Math.PI, 0]} />
      {/* Brustflossen */}
      {[1, -1].map((s) => (
        <mesh key={s} material={m.soft} position={[0.03 * s, -0.008, spine[1].z - 0.01]} rotation={[0.2, s * 0.6, s * 1.1]} scale={[0.028, 0.004, 0.024]}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      {/* Schwanzflosse */}
      <mesh material={m.soft} geometry={geos.tail} position={tailEnd} rotation={[0, tailYaw + Math.PI, 0]} />
      {/* kleiner Sandhügel über dem eingegrabenen Fisch */}
      {pose.bury > 0.05 && (
        <mesh material={m.mound} position={[0, -y - 0.005 - 0.012 * (1 - pose.bury), -0.03]} scale={[0.05, 0.011 * pose.bury, LEN * 0.55]}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
      )}
    </group>
  );
};
