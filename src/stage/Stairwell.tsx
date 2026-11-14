import {useMemo} from 'react';
import * as THREE from 'three';
import {ParcelStack} from '../actors/PaketProps';
import {HoleWall} from './Christmas';
import {Plant, std, tileTexture} from './Rooms';
import type {StageDef} from './types';

/**
 * Bühne "treppenhaus": Flur (Podest) in einem Mehrfamilienhaus am Tag, wiederverwendbar.
 *  - Podest x −1.4 … 1.4, Rückwand z −2.8 (großes Treppenhausfenster mit Himmel + Nachbarhaus), Decke 2.75, Vorderkante z 0.9.
 *  - Zwei gegenüberliegende Wohnungstüren (Türblätter sind Objekte "treppentuer"):
 *      links (Wohnung des Dummys): Öffnung in der Wand x −1.4, Mitte z −1.9 → Türblatt bei TH.doorL (x −1.4, z −1.43, face 90, Scharnier vorn)
 *      rechts (Nachbar):            Öffnung in der Wand x  1.4, Mitte z −0.5 → Türblatt bei TH.doorR (x  1.4, z −0.03, face 270, side 1 = gespiegelt,
 *                                   Scharnier vorn, Türspalt öffnet hinten zur Klingel hin)
 *    Fußmatten vor beiden Türen, Klingeln sind Objekte "klingel" (Plätze TH.bellL / TH.bellR).
 *  - Treppe nach unten (rechts, x 0.1 … 1.4) ab z 0.9 Richtung +z, 13 Stufen à 0,18 m (unten bei z 4.54, y −2.34);
 *    links daneben das Treppenauge mit Geländer (z 0.9 und x 0.1). groundHeight folgt der Treppe (Figuren gehen mit).
 *  - Hinter den Türen kleine Räume: beim Dummy warmes Licht, beim Nachbarn dunkel mit Paketbergen (sieht man durch Spalt/Klappe).
 *  - Kamera-Trick: Seitenwände sind von außen unsichtbar → Kamera darf hinter die linke Wand (x < −1.4, z > −1.25), um die
 *    Nachbartür von vorn zu sehen, bzw. hinter die rechte Wand (x > 1.4, z < −1.2) für die Tür des Dummys.
 */
export const TH = {
  W: 2.8,
  back: -2.8,
  H: 2.75,
  front: 0.9,
  doorL: {x: -1.4, z: -1.43, face: 90, center: -1.9},
  doorR: {x: 1.4, z: -0.03, face: 270, center: -0.5, side: 1},
  bellL: {x: -1.392, y: 1.38, z: -1.22, face: 90},
  bellR: {x: 1.392, y: 1.38, z: -1.18, face: 270},
  stairs: {x0: 0.1, x1: 1.4, rise: 0.18, run: 0.28, n: 13},
};
const STAIR_BOTTOM_Z = TH.front + TH.stairs.n * TH.stairs.run;
const STAIR_DROP = TH.stairs.n * TH.stairs.rise;

const groundHeight = (x: number, z: number) => {
  if (z <= TH.front) return 0;
  if (x >= TH.stairs.x0 - 0.05) return -Math.min(STAIR_DROP, ((z - TH.front) / TH.stairs.run) * TH.stairs.rise);
  return -STAIR_DROP;
};

const DoorFrame = ({w = 0.96, h = 2.08, color = '#e8e2d6'}: {w?: number; h?: number; color?: string}) => (
  <group>
    {[-1, 1].map((k) => (
      <mesh key={k} position={[k * (w / 2 + 0.035), h / 2, 0]} castShadow>
        <boxGeometry args={[0.07, h + 0.07, 0.17]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    ))}
    <mesh position={[0, h + 0.035, 0]}>
      <boxGeometry args={[w + 0.14, 0.07, 0.17]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  </group>
);

const DoorMat = ({color = '#7a5a3a', border = '#5a3f27'}: {color?: string; border?: string}) => (
  <group>
    <mesh position={[0, 0.008, 0]} receiveShadow>
      <boxGeometry args={[0.8, 0.016, 0.5]} />
      <meshStandardMaterial color={border} roughness={1} />
    </mesh>
    <mesh position={[0, 0.017, 0]} receiveShadow>
      <boxGeometry args={[0.7, 0.004, 0.4]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  </group>
);

const Railing = ({from, to, h = 0.95}: {from: [number, number, number]; to: [number, number, number]; h?: number}) => {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  const n = Math.max(2, Math.round(len / 0.14));
  return (
    <group>
      <group position={[mid.x, mid.y + h, mid.z]} quaternion={q}>
        <mesh castShadow>
          <boxGeometry args={[len + 0.06, 0.06, 0.07]} />
          <meshStandardMaterial color="#7b4f2e" roughness={0.5} flatShading />
        </mesh>
      </group>
      {Array.from({length: n + 1}, (_, i) => {
        const p = a.clone().lerp(b, i / n);
        return (
          <mesh key={i} position={[p.x, p.y + h / 2, p.z]} castShadow>
            <boxGeometry args={[0.022, h, 0.022]} />
            <meshStandardMaterial color="#3d4248" metalness={0.5} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
};

const StairwellScene = () => {
  const {W, back, H, front} = TH;
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: tileTexture('#cfc8bd', '#b3aa9c', [5, 7]), roughness: 0.55}),
      low: std('#a9c2bb', {roughness: 0.6, flatShading: false}),
      up: std('#f2ede3', {roughness: 0.95, flatShading: false}),
      stair: std('#bdb3a5', {roughness: 0.6}),
      nose: std('#8f857a', {roughness: 0.6}),
      ceil: std('#f6f3ec', {flatShading: false}),
      roomWarm: new THREE.MeshStandardMaterial({color: '#e8d2b0', side: THREE.BackSide, roughness: 1}),
      roomDark: new THREE.MeshStandardMaterial({color: '#4e4a52', side: THREE.BackSide, roughness: 1}),
    }),
    [],
  );
  const sideLen = 7.6; // Seitenwände von der Rückwand bis z 4.8
  const sideC = back + sideLen / 2;
  const LOW = 1.1;
  const holeL = {c: TH.doorL.center - sideC, y0: 0, w: 0.96, h: 2.08};
  const holeR = {c: -(TH.doorR.center - sideC), y0: 0, w: 0.96, h: 2.08};
  const win = {c: 0, y0: 1.0, w: 1.15, h: 1.25};
  const two = (len: number, holes: {c: number; y0: number; w: number; h: number}[]) => (
    <>
      <HoleWall len={len} H={LOW} holes={holes} material={mats.low} />
      <group position={[0, LOW, 0]}>
        <HoleWall len={len} H={H - LOW} holes={holes.map((h) => ({...h, y0: h.y0 - LOW}))} material={mats.up} />
      </group>
      {/* Trennleiste zwischen Ölsockel und Wand */}
      {(() => {
        const segs: [number, number][] = [];
        let cur = -len / 2;
        for (const h of [...holes].filter((h) => h.y0 < LOW).sort((a, b) => a.c - b.c)) {
          segs.push([cur, h.c - h.w / 2 - 0.07]);
          cur = h.c + h.w / 2 + 0.07;
        }
        segs.push([cur, len / 2]);
        return segs.map(([a, b], i) => (
          <mesh key={i} position={[(a + b) / 2, LOW, 0.004]}>
            <planeGeometry args={[b - a, 0.035]} />
            <meshStandardMaterial color="#7f9a93" />
          </mesh>
        ));
      })()}
    </>
  );
  return (
    <>
      <color attach="background" args={['#c9dcea']} />
      <ambientLight intensity={0.5} color="#fff6ea" />
      <hemisphereLight args={['#fffaf0', '#8a7c6c', 0.55]} />
      <directionalLight
        position={[0.6, 4.2, back - 2.5]}
        intensity={1.15}
        color="#fff1d8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <pointLight position={[0, H - 0.3, -0.9]} intensity={3.2} color="#ffe6c2" distance={9} decay={1.5} />
      <pointLight position={[0.2, 1.9, 3.2]} intensity={1.2} color="#fff3e2" distance={8} decay={1.6} />
      {/* Podest-Boden */}
      <mesh material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (back + front) / 2]} receiveShadow>
        <planeGeometry args={[W, front - back]} />
      </mesh>
      {/* Decke + Leuchte */}
      <mesh material={mats.ceil} position={[0, H, (back + 4.8) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, 4.8 - back]} />
      </mesh>
      <mesh position={[0, H - 0.05, -0.9]}>
        <sphereGeometry args={[0.2, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#ffffff" emissive="#fff1d6" emissiveIntensity={1.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Rückwand mit Fenster */}
      <group position={[0, 0, back]}>{two(W, [win])}</group>
      <group position={[0, win.y0, back]}>
        {[
          [0, win.h + 0.03, win.w + 0.12, 0.07],
          [0, -0.03, win.w + 0.16, 0.07],
          [0, win.h / 2, 0.06, win.h],
          [0, win.h * 0.62, win.w, 0.05],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.03]}>
            <boxGeometry args={[w, h, 0.07]} />
            <meshStandardMaterial color="#f7f7f5" />
          </mesh>
        ))}
        {[-1, 1].map((k) => (
          <mesh key={k} position={[(k * win.w) / 2, win.h / 2, 0.03]}>
            <boxGeometry args={[0.07, win.h + 0.12, 0.07]} />
            <meshStandardMaterial color="#f7f7f5" />
          </mesh>
        ))}
        {/* Fensterbank */}
        <mesh position={[0, -0.05, 0.14]}>
          <boxGeometry args={[win.w + 0.3, 0.04, 0.24]} />
          <meshStandardMaterial color="#e9e6e0" />
        </mesh>
        {/* Blick nach draußen: Himmel, Nachbarhaus, Baumkrone */}
        <mesh position={[0, win.h / 2, -2.5]}>
          <planeGeometry args={[6, 5]} />
          <meshBasicMaterial color="#a9d2f0" />
        </mesh>
        <mesh position={[0.9, 0.1, -2.2]}>
          <boxGeometry args={[2.6, 2.4, 0.2]} />
          <meshStandardMaterial color="#d8b98f" flatShading />
        </mesh>
        {[[-0.1, 0.55], [0.7, 0.55], [1.5, 0.55], [-0.1, -0.35], [0.7, -0.35], [1.5, -0.35]].map(([x, y], i) => (
          <mesh key={i} position={[x, y, -2.08]}>
            <planeGeometry args={[0.36, 0.5]} />
            <meshStandardMaterial color="#6f8fa8" roughness={0.2} />
          </mesh>
        ))}
        <mesh position={[-1.0, 0.25, -1.8]}>
          <icosahedronGeometry args={[0.75, 0]} />
          <meshStandardMaterial color="#5d9a4e" flatShading />
        </mesh>
      </group>
      {/* Heizkörper unter dem Fenster */}
      <group position={[0, 0.25, back + 0.08]}>
        {Array.from({length: 9}, (_, i) => (
          <mesh key={i} position={[-0.4 + i * 0.1, 0.2, 0]} castShadow>
            <boxGeometry args={[0.07, 0.55, 0.08]} />
            <meshStandardMaterial color="#f4f4f2" roughness={0.4} />
          </mesh>
        ))}
      </group>
      {/* Seitenwände mit Türöffnungen */}
      <group position={[-W / 2, 0, sideC]} rotation={[0, Math.PI / 2, 0]}>
        {two(sideLen, [holeL])}
        <group position={[holeL.c, 0, 0]}>
          <DoorFrame />
        </group>
      </group>
      <group position={[W / 2, 0, sideC]} rotation={[0, -Math.PI / 2, 0]}>
        {two(sideLen, [holeR])}
        <group position={[holeR.c, 0, 0]}>
          <DoorFrame />
        </group>
      </group>
      {/* Seitenwände unten entlang der Treppe */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.low} position={[(s * W) / 2, -STAIR_DROP / 2, (front + 4.8) / 2]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[4.8 - front, STAIR_DROP]} />
        </mesh>
      ))}
      {/* Fußmatten */}
      <group position={[-W / 2 + 0.3, 0, TH.doorL.center]} rotation={[0, Math.PI / 2, 0]}>
        <DoorMat color="#8a6440" />
      </group>
      <group position={[W / 2 - 0.3, 0, TH.doorR.center]} rotation={[0, -Math.PI / 2, 0]}>
        <DoorMat color="#5d6e7d" border="#3c4955" />
      </group>
      {/* Räume hinter den Türen */}
      <mesh material={mats.roomWarm} position={[-W / 2 - 0.65, H / 2, TH.doorL.center]}>
        <boxGeometry args={[1.3, H, 1.1]} />
      </mesh>
      <pointLight position={[-W / 2 - 0.6, 2.0, TH.doorL.center]} intensity={1.2} color="#ffd9a6" distance={2.5} decay={1.6} />
      <mesh material={mats.roomDark} position={[W / 2 + 0.95, H / 2, TH.doorR.center]}>
        <boxGeometry args={[1.9, H, 1.2]} />
      </mesh>
      <pointLight position={[W / 2 + 0.9, 1.6, TH.doorR.center]} intensity={0.5} color="#c9d2ff" distance={2.2} decay={1.6} />
      {/* Paketberge beim Nachbarn */}
      <group position={[W / 2 + 0.95, 0, TH.doorR.center - 0.3]} rotation={[0, -0.4, 0]}>
        <ParcelStack fill={1} />
      </group>
      <group position={[W / 2 + 1.45, 0, TH.doorR.center + 0.3]} rotation={[0, 0.5, 0]}>
        <ParcelStack fill={0.72} />
      </group>
      {/* Treppe nach unten */}
      {Array.from({length: TH.stairs.n}, (_, i) => {
        const y = -(i + 1) * TH.stairs.rise;
        const z = front + i * TH.stairs.run + TH.stairs.run / 2;
        return (
          <group key={i}>
            <mesh material={mats.stair} position={[(TH.stairs.x0 + TH.stairs.x1) / 2, y + TH.stairs.rise / 2 - 0.02, z]} receiveShadow castShadow>
              <boxGeometry args={[TH.stairs.x1 - TH.stairs.x0, 0.04, TH.stairs.run]} />
            </mesh>
            <mesh material={mats.nose} position={[(TH.stairs.x0 + TH.stairs.x1) / 2, y + TH.stairs.rise / 2, z - TH.stairs.run / 2 + 0.015]}>
              <boxGeometry args={[TH.stairs.x1 - TH.stairs.x0, TH.stairs.rise + 0.01, 0.03]} />
            </mesh>
          </group>
        );
      })}
      {/* Wange zum Treppenauge */}
      <mesh material={mats.low} position={[TH.stairs.x0 - 0.04, -STAIR_DROP / 2 - 0.1, (front + STAIR_BOTTOM_Z) / 2]} rotation={[-Math.atan2(STAIR_DROP, STAIR_BOTTOM_Z - front), 0, 0]}>
        <boxGeometry args={[0.08, 0.3, Math.hypot(STAIR_DROP, STAIR_BOTTOM_Z - front)]} />
      </mesh>
      {/* Treppenauge: unten das Stockwerk darunter (dämmrig) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -STAIR_DROP, 3.0]}>
        <planeGeometry args={[W, 6]} />
        <meshStandardMaterial color="#8e877c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.0, front + 0.02]}>
        <boxGeometry args={[W, 0.14, 0.04]} />
        <meshStandardMaterial color="#bdb3a5" />
      </mesh>
      {/* Geländer */}
      <Railing from={[-W / 2 + 0.02, 0, front + 0.03]} to={[TH.stairs.x0 - 0.02, 0, front + 0.03]} />
      <Railing from={[TH.stairs.x0 - 0.02, 0, front + 0.03]} to={[TH.stairs.x0 - 0.02, -STAIR_DROP + 0.18, STAIR_BOTTOM_Z]} />
      {/* Handlauf an der rechten Wand entlang der Treppe */}
      <mesh position={[W / 2 - 0.05, 0.85 - STAIR_DROP / 2, (front + STAIR_BOTTOM_Z) / 2]} rotation={[-Math.atan2(STAIR_DROP, STAIR_BOTTOM_Z - front), 0, 0]}>
        <boxGeometry args={[0.04, 0.04, Math.hypot(STAIR_DROP, STAIR_BOTTOM_Z - front)]} />
        <meshStandardMaterial color="#7b4f2e" />
      </mesh>
      {/* Deko: Pflanze in der Ecke hinten links, Schuhregal neben der Tür des Dummys */}
      <group position={[-1.12, 0, back + 0.3]}>
        <Plant s={0.9} />
      </group>
      <group position={[-1.22, 0, -0.75]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.3, 0.4, 0.7]} />
          <meshStandardMaterial color="#efece6" flatShading />
        </mesh>
        {[[-0.18, '#2f5f8f'], [0.12, '#c0503f']].map(([z, c], i) => (
          <mesh key={i} position={[0.03, 0.45, z as number]} castShadow>
            <boxGeometry args={[0.12, 0.09, 0.26]} />
            <meshStandardMaterial color={c as string} flatShading />
          </mesh>
        ))}
      </group>
    </>
  );
};

export const stairwellStage: StageDef = {id: 'treppenhaus', Component: StairwellScene, climbTrees: [], groundHeight, ambience: 'treppenhaus-atmo'};
