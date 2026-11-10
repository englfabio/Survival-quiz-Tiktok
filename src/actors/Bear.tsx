import {useMemo} from 'react';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut} from '../lib/anim';

/**
 * Stilisierter Low-Poly-Braunbär, gleicher Look wie der Dummy (einfache Formen, flach schattiert).
 * Blickt im eigenen Koordinatensystem nach +z. Ca. 2 m lang, Schulterhöhe ca. 1,1 m.
 */

const FUR = '#6e4528';
const FUR_DARK = '#4b2e1a';
const SNOUT = '#a07650';
const NOSE = '#1b1410';

type Leg = {sx: number; bend: number};
export type BearPose = {
  bodyY: number;
  pitch: number; // ganzer Körper (für Klettern)
  bodyPitch: number; // Schaukeln beim Laufen
  headX: number;
  headY: number;
  fl: Leg;
  fr: Leg;
  bl: Leg;
  br: Leg;
};

const TAU = Math.PI * 2;

export const bearPose = (motion: Motion, time: number, speed: number): BearPose => {
  const p: BearPose = {
    bodyY: 0,
    pitch: 0,
    bodyPitch: 0,
    headX: 0.1,
    headY: 0,
    fl: {sx: 0, bend: 0},
    fr: {sx: 0, bend: 0},
    bl: {sx: 0, bend: 0},
    br: {sx: 0, bend: 0},
  };
  const breathe = Math.sin(time * 1.8) * 0.012;
  switch (motion) {
    case 'stand':
      p.bodyY = breathe;
      p.headY = Math.sin(time * 0.7) * 0.15;
      break;
    case 'alert':
      p.bodyY = breathe;
      p.headX = -0.3 + Math.sin(time * 1.3) * 0.04;
      p.headY = Math.sin(time * 0.5) * 0.06;
      break;
    case 'sniff':
      p.bodyY = breathe;
      p.headX = 0.45 + Math.sin(time * 5) * 0.06;
      p.headY = Math.sin(time * 0.9) * 0.3;
      break;
    case 'walk':
    case 'sidestep':
    case 'backstep': {
      const ph = time * TAU * Math.max(0.6, speed * 0.55);
      const a = 0.35;
      p.fl.sx = a * Math.sin(ph);
      p.br.sx = a * Math.sin(ph + 0.5);
      p.fr.sx = a * Math.sin(ph + Math.PI);
      p.bl.sx = a * Math.sin(ph + Math.PI + 0.5);
      for (const [leg, off] of [
        [p.fl, 0],
        [p.fr, Math.PI],
        [p.bl, Math.PI + 0.5],
        [p.br, 0.5],
      ] as const) {
        leg.bend = 0.45 * Math.max(0, Math.sin(ph + off + 1.4));
      }
      p.bodyY = 0.02 * Math.abs(Math.sin(ph));
      p.headX = 0.2 + Math.sin(ph * 2) * 0.04;
      p.headY = Math.sin(ph) * 0.08;
      break;
    }
    case 'run': {
      // Galopp: Vorderbeine zusammen, Hinterbeine zusammen
      const ph = time * TAU * 1.9;
      const s = Math.sin(ph);
      p.fl.sx = 0.85 * s;
      p.fr.sx = 0.85 * Math.sin(ph + 0.35);
      p.bl.sx = -0.85 * s;
      p.br.sx = -0.85 * Math.sin(ph + 0.35);
      p.fl.bend = 0.9 * Math.max(0, -s);
      p.fr.bend = 0.9 * Math.max(0, -Math.sin(ph + 0.35));
      p.bl.bend = 0.8 * Math.max(0, s);
      p.br.bend = 0.8 * Math.max(0, Math.sin(ph + 0.35));
      p.bodyPitch = 0.13 * Math.cos(ph);
      p.bodyY = 0.1 * Math.abs(Math.sin(ph));
      p.headX = -0.05 + 0.1 * Math.cos(ph);
      break;
    }
    case 'climb': {
      const k = easeInOut(clamp(time / 0.5));
      const ph = time * TAU * 0.9;
      p.pitch = -1.35 * k;
      p.fl.sx = (-1.2 + 0.5 * Math.sin(ph)) * k;
      p.fr.sx = (-1.2 - 0.5 * Math.sin(ph)) * k;
      p.bl.sx = (-0.5 - 0.4 * Math.sin(ph)) * k;
      p.br.sx = (-0.5 + 0.4 * Math.sin(ph)) * k;
      p.fl.bend = p.fr.bend = 0.6 * k;
      p.bl.bend = p.br.bend = 0.4 * k;
      p.headX = -0.2 * k;
      break;
    }
    default:
      p.bodyY = breathe;
  }
  return p;
};

const useMats = () =>
  useMemo(
    () => ({
      fur: new THREE.MeshStandardMaterial({color: FUR, roughness: 0.95, flatShading: true}),
      dark: new THREE.MeshStandardMaterial({color: FUR_DARK, roughness: 0.95, flatShading: true}),
      snout: new THREE.MeshStandardMaterial({color: SNOUT, roughness: 0.9, flatShading: true}),
      nose: new THREE.MeshStandardMaterial({color: NOSE, roughness: 0.4, flatShading: true}),
    }),
    [],
  );
type Mats = ReturnType<typeof useMats>;

const BearLeg = ({m, leg, pos, front}: {m: Mats; leg: Leg; pos: [number, number, number]; front: boolean}) => (
  <group position={pos} rotation={[leg.sx, 0, 0]}>
    <mesh material={m.fur} position={[0, -0.22, 0]} scale={[1, 1, 1.1]} castShadow>
      <cylinderGeometry args={[front ? 0.15 : 0.17, 0.12, 0.48, 6]} />
    </mesh>
    <group position={[0, -0.44, 0]} rotation={[front ? -leg.bend : leg.bend, 0, 0]}>
      <mesh material={m.fur} position={[0, -0.16, 0]} castShadow>
        <cylinderGeometry args={[0.115, 0.1, 0.34, 6]} />
      </mesh>
      <mesh material={m.dark} position={[0, -0.35, 0.05]} scale={[1, 0.55, 1.35]} castShadow>
        <icosahedronGeometry args={[0.12, 0]} />
      </mesh>
    </group>
  </group>
);

export const Bear = ({pose}: {pose: BearPose}) => {
  const m = useMats();
  // Beim Klettern: Körper aufrichten (Kopf nach oben), Bauch an den Stamm, Hinterbeine über dem Boden
  const k = Math.min(1, -pose.pitch / 1.35);
  return (
    <group position={[0, 0.8 * k, 0]} rotation={[pose.pitch, 0, 0]}>
      <group position={[0, pose.bodyY - 0.85 * k, 0]}>
        <group position={[0, 0, 0]} rotation={[pose.bodyPitch, 0, 0]}>
          {/* Rumpf */}
          <mesh material={m.fur} position={[0, 0.88, -0.1]} scale={[0.56, 0.52, 0.95]} castShadow>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          {/* Schulterbuckel */}
          <mesh material={m.dark} position={[0, 1.18, 0.38]} scale={[0.48, 0.36, 0.5]} castShadow>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
          {/* Hinterteil */}
          <mesh material={m.fur} position={[0, 0.92, -0.72]} scale={[0.5, 0.48, 0.45]} castShadow>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
          <BearLeg m={m} leg={pose.fl} pos={[0.27, 0.78, 0.5]} front />
          <BearLeg m={m} leg={pose.fr} pos={[-0.27, 0.78, 0.5]} front />
          <BearLeg m={m} leg={pose.bl} pos={[0.27, 0.8, -0.65]} front={false} />
          <BearLeg m={m} leg={pose.br} pos={[-0.27, 0.8, -0.65]} front={false} />
          {/* Kopf */}
          <group position={[0, 1.05, 0.88]} rotation={[pose.headX, pose.headY, 0]}>
            <mesh material={m.fur} position={[0, 0.05, 0.12]} scale={[0.3, 0.27, 0.3]} castShadow>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <mesh material={m.snout} position={[0, -0.02, 0.42]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.09, 0.15, 0.24, 6]} />
            </mesh>
            <mesh material={m.nose} position={[0, 0.0, 0.55]} scale={[1.2, 0.8, 0.8]}>
              <icosahedronGeometry args={[0.05, 0]} />
            </mesh>
            {[1, -1].map((s) => (
              <mesh key={s} material={m.dark} position={[0.19 * s, 0.28, 0.02]} scale={[1, 1, 0.6]} castShadow>
                <icosahedronGeometry args={[0.08, 0]} />
              </mesh>
            ))}
            {[1, -1].map((s) => (
              <mesh key={`e${s}`} material={m.nose} position={[0.12 * s, 0.1, 0.36]}>
                <icosahedronGeometry args={[0.025, 0]} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
};
