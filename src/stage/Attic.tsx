import {useMemo} from 'react';
import * as THREE from 'three';
import {NestBox} from '../actors/PigeonProps';
import type {StageCam, StageDef} from './types';

/**
 * Dachboden (`dachboden`, ATTIC, Spezial Tauben): gemütlicher, aufgeräumter Dachboden unter dem Satteldach – die Wohnung der Tauben.
 *  - Boden y 0 (Holzdielen), x ±2.6, Rückwand (Giebel) z −2.2, vorn offen (Kamera bis z ≈ 7). Kniestock 0,9 m an den Seiten, First 3,0 m
 *    über x 0: Dachhöhe ATTIC.roofY(x). Dachflächen + Seiten nur von innen sichtbar.
 *  - Giebelwand: rundes Fenster (Mitte ATTIC.window), Holztür rechts (Mitte x ATTIC.door[0], 0,75 × 1,75 m, Vorderseite z −2.18) →
 *    Platz für die Objekte `hausordnung` (oben) und `putzplan` (unten) an der Tür, face 180.
 *  - Nester (Holzkisten mit Stroh) ordentlich in einer Reihe vor der Rückwand links, eins an der linken Seite + zwei auf einem Brett darüber:
 *    Sitzplätze ATTIC.nests (x, y, z) – Tauben dort mit Blick nach vorn (face 180) bzw. zur Mitte.
 *  - warmes Licht, Lichterkette am First, kleiner Teppich, Futternapf, Wasserschale.
 */
const W = 5.2;
const D = 4.4;
const KNEE = 0.9;
const RIDGE = 3.0;
const roofY = (x: number) => RIDGE - (Math.abs(x) / (W / 2)) * (RIDGE - KNEE);
const NESTS: [number, number, number][] = [
  [-1.9, 0.09, -1.75],
  [-1.3, 0.09, -1.75],
  [-0.7, 0.09, -1.75],
  [-2.1, 0.09, -0.8],
  [-0.9, 1.0, -1.95],
  [-0.3, 1.0, -1.95],
];
export const ATTIC = {W, D, back: -D / 2, roofY, door: [0.92, -2.18] as [number, number], window: [-0.55, 2.05] as [number, number], nests: NESTS};

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.85, flatShading: true, ...extra});

const AtticScene = (_: {cam?: StageCam}) => {
  const m = useMemo(
    () => ({
      floor: std('#b48a5c'),
      floor2: std('#a57d51'),
      wall: std('#e9dcc4', {side: THREE.FrontSide}),
      roof: std('#d8c4a2', {side: THREE.DoubleSide}),
      rafter: std('#8a6440'),
      door: std('#7a5234'),
      frame: std('#5e3f27'),
      knob: std('#d9c27a', {metalness: 0.6, roughness: 0.35}),
      sky: new THREE.MeshStandardMaterial({color: '#cfe8ff', emissive: '#bfe0ff', emissiveIntensity: 0.9}),
      rug: std('#c9665a'),
      bowl: std('#3f8f9a'),
      seed: std('#e6c46a'),
      bulb: new THREE.MeshStandardMaterial({color: '#fff1c4', emissive: '#ffcf6a', emissiveIntensity: 1.6}),
      shelf: std('#9b7651'),
    }),
    [],
  );
  const slopeLen = Math.hypot(W / 2, RIDGE - KNEE);
  const slopeAng = Math.atan2(RIDGE - KNEE, W / 2);
  const gable = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-W / 2, 0);
    s.lineTo(W / 2, 0);
    s.lineTo(W / 2, KNEE);
    s.lineTo(0, RIDGE);
    s.lineTo(-W / 2, KNEE);
    s.closePath();
    const hole = new THREE.Path();
    hole.absarc(ATTIC.window[0], ATTIC.window[1], 0.36, 0, Math.PI * 2, true);
    s.holes.push(hole);
    return new THREE.ShapeGeometry(s);
  }, []);
  return (
    <>
      <color attach="background" args={['#2b2219']} />
      <hemisphereLight args={['#ffe9c8', '#6a5038', 0.9]} />
      <ambientLight intensity={0.55} color="#ffe7c6" />
      <directionalLight position={[-0.6, 2.2, 3]} intensity={1.1} color="#fff1da" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[0, 2.6, 0]} intensity={7} color="#ffd59a" distance={9} decay={1.5} />
      <pointLight position={[0, 1.6, 3.5]} intensity={3} color="#fff1dc" distance={9} decay={1.6} />
      {/* Holzdielen */}
      {Array.from({length: 13}, (_, i) => -W / 2 + 0.2 + i * 0.4).map((x, i) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, 0]} receiveShadow material={i % 2 ? m.floor : m.floor2}>
          <planeGeometry args={[0.39, D]} />
        </mesh>
      ))}
      {/* Giebelwand mit rundem Fenster */}
      <mesh geometry={gable} material={m.wall} position={[0, 0, -D / 2]} receiveShadow />
      <mesh material={m.sky} position={[ATTIC.window[0], ATTIC.window[1], -D / 2 - 0.02]}>
        <circleGeometry args={[0.36, 20]} />
      </mesh>
      <mesh material={m.frame} position={[ATTIC.window[0], ATTIC.window[1], -D / 2 + 0.01]}>
        <torusGeometry args={[0.37, 0.035, 6, 24]} />
      </mesh>
      <mesh material={m.frame} position={[ATTIC.window[0], ATTIC.window[1], -D / 2 + 0.01]}>
        <boxGeometry args={[0.72, 0.035, 0.03]} />
      </mesh>
      <mesh material={m.frame} position={[ATTIC.window[0], ATTIC.window[1], -D / 2 + 0.01]}>
        <boxGeometry args={[0.035, 0.72, 0.03]} />
      </mesh>
      {/* Tür */}
      <group position={[ATTIC.door[0], 0, -D / 2 + 0.01]}>
        <mesh material={m.frame} position={[0, 0.9, 0]}>
          <boxGeometry args={[0.87, 1.82, 0.03]} />
        </mesh>
        <mesh material={m.door} position={[0, 0.875, 0.02]}>
          <boxGeometry args={[0.75, 1.75, 0.03]} />
        </mesh>
        <mesh material={m.knob} position={[-0.28, 0.95, 0.05]}>
          <sphereGeometry args={[0.035, 8, 6]} />
        </mesh>
      </group>
      {/* Kniestock-Wände links/rechts (nur von innen sichtbar) */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.wall} position={[s * (W / 2), KNEE / 2, 0]} rotation={[0, (-s * Math.PI) / 2, 0]}>
          <planeGeometry args={[D, KNEE]} />
        </mesh>
      ))}
      {/* Dachflächen + Sparren */}
      {[-1, 1].map((s) => (
        <group key={s} position={[(s * W) / 4, (RIDGE + KNEE) / 2, 0]} rotation={[0, 0, s * slopeAng]}>
          <mesh material={m.roof}>
            <boxGeometry args={[slopeLen, 0.04, D]} />
          </mesh>
          {[-1.8, -0.9, 0, 0.9, 1.8].map((z) => (
            <mesh key={z} material={m.rafter} position={[0, -0.07, z]} castShadow>
              <boxGeometry args={[slopeLen, 0.12, 0.1]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh material={m.rafter} position={[0, RIDGE - 0.08, 0]}>
        <boxGeometry args={[0.16, 0.16, D]} />
      </mesh>
      {/* Lichterkette am First */}
      {Array.from({length: 11}, (_, i) => -D / 2 + 0.2 + i * 0.4).map((z, i) => (
        <mesh key={z} material={m.bulb} position={[0, RIDGE - 0.24 - 0.05 * Math.sin(i * 1.3), z]}>
          <sphereGeometry args={[0.035, 8, 6]} />
        </mesh>
      ))}
      {/* Nester */}
      {NESTS.map(([x, y, z], i) => (
        <group key={i} position={[x, y - 0.09, z]}>
          <NestBox seed={i + 3} />
        </group>
      ))}
      <mesh material={m.shelf} position={[-0.6, 0.89, -D / 2 + 0.2]} castShadow>
        <boxGeometry args={[1.5, 0.04, 0.4]} />
      </mesh>
      {/* Teppich, Futternapf, Wasserschale */}
      <mesh material={m.rug} rotation={[-Math.PI / 2, 0, 0]} position={[0.1, 0.006, 0.2]} receiveShadow>
        <circleGeometry args={[0.85, 24]} />
      </mesh>
      <group position={[0.5, 0, 0.4]}>
        <mesh material={m.bowl} position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.13, 0.1, 0.08, 12]} />
        </mesh>
        <mesh material={m.seed} position={[0, 0.075, 0]}>
          <cylinderGeometry args={[0.115, 0.115, 0.02, 12]} />
        </mesh>
      </group>
    </>
  );
};

export const atticStage: StageDef = {id: 'dachboden', Component: AtticScene, climbTrees: [], groundHeight: () => 0, ambience: 'uhr-ticken'};
