import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp} from '../lib/anim';

/**
 * Objekte für das Panikattacken-Video (Wal im Zimmer), wiederverwendbar:
 *  - ColdWaterGlass ("kaltwasser"): Glas mit kaltem Wasser, Eiswürfeln und Kondens-Tropfen außen. fill 1 voll … 0 leer.
 *  - CoolPack ("coolpack"): blaues Kühlkissen (Gel-Pack) mit Schneeflocke, ca. 0,16 × 0,11 m.
 *  - HeartBadge: rotes Herz-Symbol, pocht (wird am Dummy über den Wert "heart" gezeigt, schaut immer zur Kamera).
 */

// ---------- Glas mit kaltem Wasser ----------
export const ColdWaterGlass = ({fill = 1}: {fill?: number}) => {
  const m = useMemo(
    () => ({
      glass: new THREE.MeshStandardMaterial({color: '#eef7ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide}),
      water: new THREE.MeshStandardMaterial({color: '#8fd3f4', roughness: 0.1, transparent: true, opacity: 0.75, emissive: '#5fb8e6', emissiveIntensity: 0.15}),
      ice: new THREE.MeshStandardMaterial({color: '#f2fbff', roughness: 0.1, transparent: true, opacity: 0.85, flatShading: true}),
      drop: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.8}),
      rim: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.1, transparent: true, opacity: 0.6}),
    }),
    [],
  );
  const H = 0.14;
  const f = clamp(fill, 0.02, 1);
  const wh = (H - 0.015) * 0.85 * f;
  return (
    <group>
      <mesh material={m.glass} position={[0, H / 2, 0]} renderOrder={5}>
        <cylinderGeometry args={[0.043, 0.037, H, 16, 1, true]} />
      </mesh>
      <mesh material={m.glass} position={[0, 0.005, 0]} renderOrder={5}>
        <cylinderGeometry args={[0.037, 0.037, 0.01, 16]} />
      </mesh>
      <mesh material={m.water} position={[0, 0.01 + wh / 2, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.037 + 0.006 * (wh / H), 0.0365, wh, 16]} />
      </mesh>
      {/* Eiswürfel schwimmen oben */}
      {[
        [-0.012, 0.01, 0.3],
        [0.014, -0.008, 1.1],
        [0.0, 0.016, 2.0],
      ].map(([x, z, r], i) => (
        <mesh key={i} material={m.ice} position={[x, 0.01 + wh - 0.006 + i * 0.004, z]} rotation={[r, r * 0.7, 0.3]} renderOrder={6}>
          <boxGeometry args={[0.022, 0.022, 0.022]} />
        </mesh>
      ))}
      {/* Kondens-Tropfen außen (= kalt) */}
      {[0.4, 1.3, 2.2, 3.1, 4.0, 5.0, 5.7].map((a, i) => (
        <mesh key={i} material={m.drop} position={[Math.sin(a) * 0.042, 0.03 + ((i * 37) % 9) * 0.011, Math.cos(a) * 0.042]} scale={[1, 1.4, 1]}>
          <sphereGeometry args={[0.0035, 6, 4]} />
        </mesh>
      ))}
      <mesh material={m.rim} position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.043, 0.0018, 4, 20]} />
      </mesh>
    </group>
  );
};

// ---------- Coolpack ----------
const snowTexture = () => {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3aa0e8';
  g.fillRect(0, 0, 128, 96);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 6;
  g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    g.beginPath();
    g.moveTo(64 - Math.cos(a) * 30, 48 - Math.sin(a) * 30);
    g.lineTo(64 + Math.cos(a) * 30, 48 + Math.sin(a) * 30);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Coolpack, liegt flach (Oberseite +y), Mitte im Ursprung, Länge entlang x */
export const CoolPack = () => {
  const m = useMemo(
    () => ({
      gel: new THREE.MeshStandardMaterial({color: '#3aa0e8', roughness: 0.25, metalness: 0.05, emissive: '#1d6fb3', emissiveIntensity: 0.15}),
      top: new THREE.MeshStandardMaterial({map: snowTexture(), roughness: 0.25}),
      seam: new THREE.MeshStandardMaterial({color: '#bfe3fb', roughness: 0.3}),
    }),
    [],
  );
  return (
    <group>
      <mesh material={m.gel} scale={[1, 0.22, 0.7]} castShadow>
        <sphereGeometry args={[0.08, 14, 8]} />
      </mesh>
      <mesh material={m.top} position={[0, 0.0182, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, 0.07]} />
      </mesh>
      <mesh material={m.seam} scale={[1.04, 0.05, 0.74]}>
        <sphereGeometry args={[0.08, 14, 4]} />
      </mesh>
    </group>
  );
};

// ---------- Herz-Symbol ----------
const heartShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.32, -0.55, -0.12, -0.55, 0.15);
  s.bezierCurveTo(-0.55, 0.42, -0.25, 0.55, 0, 0.32);
  s.bezierCurveTo(0.25, 0.55, 0.55, 0.42, 0.55, 0.15);
  s.bezierCurveTo(0.55, -0.12, 0.15, -0.32, 0, -0.5);
  return s;
};

/** Ein Herzschlag-Verlauf: schneller Doppelschlag ("bu-bum") am Anfang jeder Phase */
export const heartPulse = (phase: number) => {
  const u = phase - Math.floor(phase);
  const a = u < 0.14 ? Math.sin((u / 0.14) * Math.PI) : 0;
  const b = u > 0.18 && u < 0.3 ? 0.6 * Math.sin(((u - 0.18) / 0.12) * Math.PI) : 0;
  return Math.max(a, b);
};

/**
 * Rotes Herz mit weißem Rand. phase = Herzschläge seit Abschnittsbeginn, rate = Schläge pro Sekunde.
 * Bei schnellem Herzschlag (rate > 1.6) zucken kleine Striche um das Herz. amount blendet ein/aus.
 * Größe ca. 0,22 m (scale).
 */
export const HeartBadge = ({phase, rate, amount = 1}: {phase: number; rate: number; amount?: number}) => {
  const geo = useMemo(() => new THREE.ExtrudeGeometry(heartShape(), {depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1, curveSegments: 10}), []);
  const rimGeo = useMemo(() => new THREE.ShapeGeometry(heartShape(), 10), []);
  const m = useMemo(
    () => ({
      red: new THREE.MeshStandardMaterial({color: '#e2263a', emissive: '#b3122a', emissiveIntensity: 0.5, roughness: 0.35, flatShading: true}),
      white: new THREE.MeshBasicMaterial({color: '#ffffff'}),
      line: new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true}),
    }),
    [],
  );
  const p = heartPulse(phase);
  const fast = clamp((rate - 1.6) / 1.2);
  const s = 0.22 * amount * (1 + 0.22 * p);
  m.line.opacity = fast * p;
  return (
    <group scale={s}>
      <mesh geometry={rimGeo} material={m.white} position={[0, 0, -0.03]} scale={1.18} />
      <mesh geometry={geo} material={m.red} position={[0, 0, -0.02]} />
      {/* Glanzpunkt */}
      <mesh position={[-0.25, 0.22, 0.17]} scale={[1, 0.6, 1]}>
        <circleGeometry args={[0.08, 10]} />
        <meshBasicMaterial color="#ffd0d6" />
      </mesh>
      {fast > 0.01 &&
        [-1, 1].map((side) =>
          [0, 1, 2].map((i) => {
            const a = (side > 0 ? 0 : Math.PI) + (i - 1) * 0.5 * side;
            const r = 0.82 + 0.12 * p;
            return (
              <mesh key={`${side}-${i}`} material={m.line} position={[Math.cos(a) * r, Math.sin(a) * r * 0.9, 0]} rotation={[0, 0, a]}>
                <planeGeometry args={[0.26, 0.07]} />
              </mesh>
            );
          }),
        )}
    </group>
  );
};
