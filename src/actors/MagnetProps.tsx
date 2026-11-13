import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';

/**
 * Magnetfischen: starker runder Topfmagnet (Ösen-Magnet), rostige Weltkriegs-Handgranate, Seil.
 * Gleicher Low-Poly-Look wie der Dummy, flach schattiert.
 */

/** Größe des Magneten im Video (echt ca. 12 cm Durchmesser – vergrößert, damit er im Hochformat gut zu sehen ist) */
export const MAGNET_SCALE = 1.6;
/** Unterseite des Magneten unter dem Ursprung (Öse) in Metern (bereits mit MAGNET_SCALE) */
export const MAGNET_BOTTOM = 0.105 * MAGNET_SCALE;
/** Granate: Größe im Video (echt ca. 12 cm hoch) */
export const GRENADE_SCALE = 2.0;
/** Halbe Höhe der Granate (bereits mit GRENADE_SCALE) – Ursprung = Mitte */
export const GRENADE_HALF = 0.066 * GRENADE_SCALE;

export const ROPE_COLOR = '#2a6fd6';

/**
 * Runder Topfmagnet mit Öse oben. Ursprung = Öse (dort hängt das Seil), Magnet darunter.
 * Silberner Stahltopf, roter Lackring, dunkle Unterseite.
 */
export const Magnet = () => {
  const m = useMemo(
    () => ({
      steel: new THREE.MeshStandardMaterial({color: '#cfd3d8', metalness: 0.75, roughness: 0.28, flatShading: true}),
      red: new THREE.MeshStandardMaterial({color: '#d4332b', roughness: 0.45, flatShading: true}),
      dark: new THREE.MeshStandardMaterial({color: '#3a3d42', metalness: 0.5, roughness: 0.5, flatShading: true}),
    }),
    [],
  );
  return (
    <group scale={MAGNET_SCALE}>
      {/* Öse */}
      <mesh material={m.steel} position={[0, -0.014, 0]} castShadow>
        <torusGeometry args={[0.014, 0.0045, 6, 12]} />
      </mesh>
      <mesh material={m.steel} position={[0, -0.034, 0]} castShadow>
        <cylinderGeometry args={[0.009, 0.011, 0.016, 8]} />
      </mesh>
      {/* Topf: roter Deckel, silberner Körper, dunkle Polfläche */}
      <mesh material={m.red} position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.052, 0.058, 0.018, 18]} />
      </mesh>
      <mesh material={m.steel} position={[0, -0.075, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.034, 18]} />
      </mesh>
      <mesh material={m.dark} position={[0, -0.0975, 0]}>
        <cylinderGeometry args={[0.057, 0.057, 0.012, 18]} />
      </mesh>
      <mesh material={m.steel} position={[0, -0.0985, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.013, 14]} />
      </mesh>
    </group>
  );
};

/**
 * Rostige Handgranate aus dem Weltkrieg (stilisiert): eiförmiger, geriffelter Körper ("Ananas"-Muster),
 * oben Zünder mit Sicherungsbügel (Löffel) und Abzugsring. Rost, Verkrustungen und Reste von olivgrüner Farbe.
 * Ursprung = Mitte des Körpers, Längsachse = y (Zünder oben).
 */
export const Grenade = ({time = 0, rumble = 0}: {time?: number; rumble?: number}) => {
  const m = useMemo(
    () => ({
      rust: new THREE.MeshStandardMaterial({color: '#7f4520', roughness: 0.95, flatShading: true}),
      rustLight: new THREE.MeshStandardMaterial({color: '#a35a26', roughness: 0.95, flatShading: true}),
      dark: new THREE.MeshStandardMaterial({color: '#4a2a14', roughness: 1, flatShading: true}),
      olive: new THREE.MeshStandardMaterial({color: '#5e5c34', roughness: 0.9, flatShading: true}),
      crust: new THREE.MeshStandardMaterial({color: '#b0743c', roughness: 1, flatShading: true}),
      silt: new THREE.MeshStandardMaterial({color: '#6c6a4c', roughness: 1, flatShading: true}),
    }),
    [],
  );
  const parts = useMemo(() => {
    const r = rng(73);
    // Riffel-Blöcke: 6 Reihen × 8 Spalten auf dem Ei
    const blocks: {pos: THREE.Vector3; q: THREE.Quaternion; s: number; mat: 'rust' | 'rustLight' | 'olive' | 'dark'}[] = [];
    const R = 0.05;
    const H = 0.06;
    for (let row = 0; row < 6; row++) {
      const v = -0.8 + (row / 5) * 1.6; // −0.8 … 0.8
      const yy = v * H;
      const rad = R * Math.sqrt(Math.max(0.05, 1 - v * v * 0.92));
      for (let c = 0; c < 8; c++) {
        const a = (c / 8) * Math.PI * 2 + (row % 2) * 0.0;
        const n = new THREE.Vector3(Math.cos(a), v * 0.55, Math.sin(a)).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        const pick = r();
        blocks.push({
          pos: new THREE.Vector3(Math.cos(a) * rad, yy, Math.sin(a) * rad),
          q,
          s: 0.85 + r() * 0.25,
          mat: pick < 0.18 ? 'olive' : pick < 0.55 ? 'rustLight' : pick < 0.9 ? 'rust' : 'dark',
        });
      }
    }
    // Verkrustungen (Klumpen)
    const crust = Array.from({length: 18}, () => {
      const a = r() * Math.PI * 2;
      const v = -0.9 + r() * 1.6;
      const rad = R * Math.sqrt(Math.max(0.05, 1 - v * v * 0.92)) + 0.004;
      return {pos: [Math.cos(a) * rad, v * H, Math.sin(a) * rad] as [number, number, number], s: 0.008 + r() * 0.012, silt: r() < 0.35};
    });
    return {blocks, crust};
  }, []);
  // leichtes Rütteln (im Auto auf dem Kopfsteinpflaster)
  const j = rumble > 0.001 ? rumble : 0;
  const rot: [number, number, number] = [Math.sin(time * 37) * 0.08 * j, Math.sin(time * 5.3) * 0.25 * j, Math.sin(time * 29 + 1) * 0.1 * j];
  const hop = Math.max(0, Math.sin(time * 23)) * 0.012 * j;
  return (
    <group scale={GRENADE_SCALE} rotation={rot} position={[0, hop, 0]}>
      {/* Körper */}
      <mesh material={m.rust} scale={[1, 1.22, 1]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.049, 1]} />
      </mesh>
      {parts.blocks.map((b, i) => (
        <mesh key={i} material={m[b.mat]} position={b.pos} quaternion={b.q} scale={b.s} castShadow>
          <boxGeometry args={[0.03, 0.017, 0.012]} />
        </mesh>
      ))}
      {parts.crust.map((c, i) => (
        <mesh key={`c${i}`} material={c.silt ? m.silt : m.crust} position={c.pos} scale={c.s}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      {/* Boden-Stopfen */}
      <mesh material={m.dark} position={[0, -0.062, 0]}>
        <cylinderGeometry args={[0.012, 0.014, 0.01, 8]} />
      </mesh>
      {/* Zünder oben */}
      <mesh material={m.dark} position={[0, 0.066, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.017, 0.016, 8]} />
      </mesh>
      <mesh material={m.rust} position={[0, 0.082, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.014, 0.018, 8]} />
      </mesh>
      {/* Sicherungsbügel (Löffel): oben quer, dann an der Seite herunter */}
      <mesh material={m.rustLight} position={[0.012, 0.094, 0]} rotation={[0, 0, -0.15]} castShadow>
        <boxGeometry args={[0.04, 0.006, 0.016]} />
      </mesh>
      <mesh material={m.rustLight} position={[0.036, 0.066, 0]} rotation={[0, 0, -0.32]} castShadow>
        <boxGeometry args={[0.007, 0.06, 0.016]} />
      </mesh>
      <mesh material={m.rustLight} position={[0.046, 0.026, 0]} rotation={[0, 0, -0.12]} castShadow>
        <boxGeometry args={[0.007, 0.03, 0.014]} />
      </mesh>
      {/* Splint + Abzugsring */}
      <mesh material={m.dark} position={[-0.012, 0.083, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.026, 5]} />
      </mesh>
      <mesh material={m.rustLight} position={[-0.034, 0.083, 0]} rotation={[0, 0.35, 0]} castShadow>
        <torusGeometry args={[0.015, 0.0032, 6, 14]} />
      </mesh>
    </group>
  );
};

/** Seil (Leine) zwischen zwei Punkten in der Welt, leicht durchhängend */
export const Rope = ({from, to, sag = 0.06}: {from: THREE.Vector3; to: THREE.Vector3; sag?: number}) => {
  const geo = useMemo(() => {
    const len = from.distanceTo(to);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.y -= sag * len;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    return new THREE.TubeGeometry(curve, 24, 0.009, 5, false);
  }, [from.x, from.y, from.z, to.x, to.y, to.z, sag]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={ROPE_COLOR} roughness={0.7} flatShading />
    </mesh>
  );
};
