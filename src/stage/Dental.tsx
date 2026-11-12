import {useMemo} from 'react';
import * as THREE from 'three';
import {Plant, Room, std, tileTexture} from './Rooms';
import type {StageDef} from './types';

/**
 * Bühne "zahnarztpraxis": kleine, helle Zahnarztpraxis (aus dem Raum-Baukasten).
 * Behandlungsstuhl (türkis, Lehne nach hinten geneigt, Beinauflage), Behandlungslampe an einem Schwenkarm,
 * Ablage mit Instrumenten, Schrank mit Waschbecken an der Rückwand, Zahn-Poster, Fenster links.
 *
 * Koordinaten: W 4.6, D 4.4 → Rückwand z −2.2, vorn (+z) offen.
 * - Stuhl: DENTAL.chair (0, −0.5), Blick nach +z (zur Kamera). Dummy darin: x 0, z −0.5, face 180, motion "dentalsit"
 *   (Kopf liegt dann bei ca. (0, 1.15, −1.05)).
 * - Platz für Zahnarzt/Zahnärztin ("arzt"): x 0.75, z −0.75, face 250 (schaut zum Kopf).
 * - Eingang (Dummy kommt herein): von vorn rechts, z. B. (1.6, 1.6).
 */
export const DENTAL = {W: 4.6, D: 4.4, chair: {x: 0, z: -0.5}};

const SEAT = '#2fae9c';

const DentalChair = () => {
  const m = useMemo(
    () => ({
      seat: std(SEAT, {roughness: 0.45}),
      seatDark: std('#24897b', {roughness: 0.5}),
      metal: std('#d9dde2', {metalness: 0.6, roughness: 0.3}),
      base: std('#eef1f3', {roughness: 0.4}),
    }),
    [],
  );
  const back = -0.55; // Lehne nach hinten
  return (
    <group>
      {/* Fuß + Säule */}
      <mesh material={m.base} position={[0, 0.04, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.08, 0.9]} />
      </mesh>
      <mesh material={m.metal} position={[0, 0.2, -0.3]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.3, 10]} />
      </mesh>
      {/* Sitzfläche (unter der Hüfte bei z ≈ −0.31) */}
      <mesh material={m.seat} position={[0, 0.39, -0.28]} castShadow receiveShadow>
        <boxGeometry args={[0.58, 0.12, 0.52]} />
      </mesh>
      {/* Lehne (geneigt) */}
      <group position={[0, 0.45, -0.52]} rotation={[back, 0, 0]}>
        <mesh material={m.seat} position={[0, 0.38, -0.08]} castShadow>
          <boxGeometry args={[0.56, 0.8, 0.12]} />
        </mesh>
        {/* Kopfstütze */}
        <mesh material={m.seatDark} position={[0, 0.88, -0.06]} castShadow>
          <boxGeometry args={[0.3, 0.2, 0.1]} />
        </mesh>
      </group>
      {/* Beinauflage (schräg nach vorn unten) */}
      <group position={[0, 0.4, -0.03]} rotation={[-0.25, 0, 0]}>
        <mesh material={m.seat} position={[0, 0, 0.32]} castShadow>
          <boxGeometry args={[0.5, 0.1, 0.66]} />
        </mesh>
      </group>
      {/* Armlehne rechts */}
      <mesh material={m.seatDark} position={[-0.34, 0.58, -0.3]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.42]} />
      </mesh>
    </group>
  );
};

const Lamp = () => {
  const m = useMemo(
    () => ({
      arm: std('#eef1f3', {roughness: 0.35}),
      head: std('#dfe4e8', {roughness: 0.3}),
      glow: new THREE.MeshBasicMaterial({color: '#fffbe8'}),
    }),
    [],
  );
  // Säule rechts hinter dem Stuhl, Arm schwenkt über den Kopf
  return (
    <group position={[0.85, 0, -1.55]}>
      <mesh material={m.arm} position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 2.1, 8]} />
      </mesh>
      <mesh material={m.arm} position={[-0.32, 2.0, 0.22]} rotation={[0, 0.6, Math.PI / 2 - 0.15]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
      </mesh>
      <group position={[-0.7, 1.86, 0.42]} rotation={[0.9, 0.2, 0.35]}>
        <mesh material={m.head} castShadow>
          <boxGeometry args={[0.36, 0.08, 0.16]} />
        </mesh>
        <mesh material={m.glow} position={[0, -0.042, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.3, 0.11]} />
        </mesh>
      </group>
      <spotLight position={[-0.7, 1.8, 0.45]} target-position={[-0.85, 1.0, 0.5]} intensity={6} angle={0.55} penumbra={0.6} distance={4} color="#fff6e0" />
    </group>
  );
};

/** Ablage mit Instrumenten (Spiegel, Sonde) an einem Ständer links vom Stuhl */
const Tray = () => (
  <group position={[-0.75, 0, -0.55]}>
    <mesh position={[0, 0.45, 0]} castShadow>
      <cylinderGeometry args={[0.03, 0.04, 0.9, 8]} />
      <meshStandardMaterial color="#d9dde2" metalness={0.6} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.92, 0]} castShadow>
      <boxGeometry args={[0.42, 0.03, 0.3]} />
      <meshStandardMaterial color="#eef1f3" roughness={0.4} flatShading />
    </mesh>
    {[-0.1, 0, 0.1].map((x, i) => (
      <mesh key={i} position={[x, 0.945, 0]} rotation={[Math.PI / 2, 0, 0.1 * i]}>
        <cylinderGeometry args={[0.006, 0.006, 0.2, 6]} />
        <meshStandardMaterial color="#b9c0c7" metalness={0.8} roughness={0.25} />
      </mesh>
    ))}
    <mesh position={[0.12, 0.945, 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.025, 10]} />
      <meshStandardMaterial color="#e8f2fa" metalness={0.9} roughness={0.1} />
    </mesh>
  </group>
);

/** Poster: großer, lächelnder Zahn */
const posterTexture = () => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 340;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d8f1ee';
  g.fillRect(0, 0, 256, 340);
  g.fillStyle = '#2fae9c';
  g.fillRect(0, 0, 256, 18);
  g.fillRect(0, 322, 256, 18);
  const cx = 128;
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#7dbdb4';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(cx - 70, 110);
  g.bezierCurveTo(cx - 78, 50, cx - 20, 48, cx, 70);
  g.bezierCurveTo(cx + 20, 48, cx + 78, 50, cx + 70, 110);
  g.bezierCurveTo(cx + 66, 170, cx + 52, 200, cx + 42, 270);
  g.bezierCurveTo(cx + 36, 292, cx + 18, 290, cx + 14, 266);
  g.lineTo(cx + 4, 210);
  g.lineTo(cx - 4, 210);
  g.lineTo(cx - 14, 266);
  g.bezierCurveTo(cx - 18, 290, cx - 36, 292, cx - 42, 270);
  g.bezierCurveTo(cx - 52, 200, cx - 66, 170, cx - 70, 110);
  g.fill();
  g.stroke();
  g.fillStyle = '#1e2226';
  g.beginPath();
  g.arc(cx - 24, 118, 9, 0, Math.PI * 2);
  g.arc(cx + 24, 118, 9, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1e2226';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(cx, 140, 26, 0.2, Math.PI - 0.2);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const DentalScene = () => {
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: tileTexture('#d9e4e8', '#c3d0d5', [8, 16]), roughness: 0.45}),
      wall: std('#eaf6f5', {roughness: 0.95, flatShading: false}),
      poster: new THREE.MeshStandardMaterial({map: posterTexture(), roughness: 0.8}),
    }),
    [],
  );
  const {W, D, chair} = DENTAL;
  return (
    <Room
      W={W}
      D={D}
      H={2.7}
      floor={mats.floor}
      wall={mats.wall}
      ceiling="#fafafa"
      window={{side: -1, z: -0.9, w: 1.2, y: 1.0, h: 1.2, sky: '#ffcf9c'}}
      light={{ambient: 0.6, hemi: 0.75, sun: 1.3, sunColor: '#ffe9d0', lamp: 6, lampColor: '#f4f8ff'}}
    >
      <group position={[chair.x, 0, chair.z]}>
        <DentalChair />
      </group>
      <Lamp />
      <Tray />
      {/* Schrank mit Waschbecken an der Rückwand rechts */}
      <group position={[1.35, 0, -D / 2 + 0.3]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.9, 0.55]} />
          <meshStandardMaterial color="#f6f8f9" roughness={0.5} flatShading />
        </mesh>
        <mesh position={[0, 0.91, 0]} receiveShadow>
          <boxGeometry args={[1.34, 0.04, 0.58]} />
          <meshStandardMaterial color="#9fb7bd" roughness={0.4} flatShading />
        </mesh>
        <mesh position={[0.3, 0.935, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.16, 14]} />
          <meshStandardMaterial color="#e3e9ec" metalness={0.5} roughness={0.2} />
        </mesh>
        <mesh position={[0.3, 1.05, -0.2]} rotation={[0.6, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.22, 6]} />
          <meshStandardMaterial color="#c9ced3" metalness={0.8} roughness={0.25} />
        </mesh>
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, 0.45, 0.28]}>
            <boxGeometry args={[0.55, 0.8, 0.01]} />
            <meshStandardMaterial color="#e9eef0" roughness={0.5} />
          </mesh>
        ))}
      </group>
      {/* Poster */}
      <mesh material={mats.poster} position={[-0.9, 1.6, -D / 2 + 0.01]}>
        <planeGeometry args={[0.55, 0.73]} />
      </mesh>
      <group position={[-1.9, 0, 0.4]}>
        <Plant s={1.1} />
      </group>
    </Room>
  );
};

export const dentalStage: StageDef = {id: 'zahnarztpraxis', Component: DentalScene, climbTrees: [], groundHeight: () => 0};
