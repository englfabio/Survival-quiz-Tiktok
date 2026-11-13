import {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {T} from '../ui/theme';
import {useFontTexture} from '../actors/ToothProps';
import {Instances, Sky, type Inst} from './Forest';
import {FarHouses, ParkBench, TrashBin} from './Park';
import type {StageCam, StageDef} from './types';

/**
 * Bühne "spielplatz": öffentlicher Spielplatz an einem sonnigen Tag (wiederverwendbar).
 * Sandkasten mit Holzrand, Rutsche, Doppelschaukel, Parkbank, Mülleimer, Büsche am Rand, niedriger Zaun mit Eingang
 * und einem Schild am Eingang ("SPIELPLATZ" + Telefon-Symbol, ohne echte Nummer). Bäume + Häuser in der Ferne.
 *
 * Koordinaten (1 Einheit = 1 Meter), Boden flach (y = 0), Sand liegt 3 cm höher:
 * - Sandkasten: Sand x −1.6 … 1.6, z −2.0 … 0.7 (Holzrand 0,12 breit, 0,16 hoch, liegt außen herum).
 *   Fundstelle der Spritze PLAYGROUND.spot (0.4, 0.5) – ca. 0,2 m hinter der vorderen Kante; Dummy steht davor auf dem Rasen.
 * - Mülleimer PLAYGROUND.bin (2.6, 1.7), Öffnung 0,85 m hoch.
 * - Bank PLAYGROUND.bench (−3.4, 1.0), Blick nach +x.
 * - Rutsche: Leiter bei x −4.4, Plattform (−3.8, −3.6) 1,3 m hoch, Rutschfläche bis x −1.9 (Richtung +x).
 * - Schaukel: Gestell entlang x bei z −3.4 (Pfosten x 2.2 / 4.6, Querbalken 2,2 m), Sitze PLAYGROUND.swings
 *   (2.85 / 3.95), Sitzhöhe 0,42 m. Linker Sitz schwingt leicht, rechter hängt still (dort kann ein Kind sitzen).
 * - Zaun: x −7.5 … 7.5, z −7 … 5.5, 0,9 m hoch; Eingang rechts (x 7.5, z 0.6 … 2.0).
 *   Schild am Eingang PLAYGROUND.sign (7.3, 2.6), Tafel zeigt in den Spielplatz (nach −x), Mitte 1,45 m hoch.
 *   Zum Fotografieren steht der Dummy bei ca. (6.3, 2.6) mit face 90.
 * - Büsche innen am Zaun (hinten und links), vorn (z > 2.5, |x| < 6) frei für Kameras.
 */
export const PLAYGROUND = {
  sand: {x0: -1.6, x1: 1.6, z0: -2.0, z1: 0.7, y: 0.03},
  spot: [0.4, 0.5] as [number, number],
  bin: [2.6, 1.7] as [number, number],
  bench: [-3.4, 1.0] as [number, number],
  swings: [
    [2.85, -3.4],
    [3.95, -3.4],
  ] as [number, number][],
  swingSeatY: 0.42,
  sign: [7.3, 2.6] as [number, number],
  signY: 1.45,
};

const C = {
  skyTop: '#4f9fe0',
  skyHorizon: '#e9f5fb',
  fog: '#dcecf2',
  grass: '#79b04a',
  grass2: ['#6aa040', '#82b94f', '#5f9238', '#8cc257'],
  sand: '#e6cf98',
  sandDark: '#d6bb7f',
  wood: '#b07a45',
  woodDark: '#8a5c33',
  fence: '#2f7a4f',
  rubber: '#c4553f',
  trunk: '#6b4a2e',
  leaf: ['#4f8a34', '#5c9a3a', '#477d2f', '#66a843'],
};

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.75, flatShading: true, ...extra});

// ---------- Schild am Eingang ----------
const signTexture = () => {
  const W = 768;
  const H = 560;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  // grüner Kopf
  g.fillStyle = '#1f7a45';
  g.fillRect(0, 0, W, 150);
  g.fillStyle = '#ffffff';
  g.font = `800 112px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('SPIELPLATZ', W / 2, 80);
  // Rahmen
  g.strokeStyle = '#1f7a45';
  g.lineWidth = 14;
  g.strokeRect(7, 7, W - 14, H - 14);
  g.fillStyle = '#1d2b36';
  g.font = `700 54px ${T.font}`;
  g.fillText('Gefährliche Funde melden:', W / 2, 220);
  // Telefon-Symbol (Hörer) in einem Kreis
  const cx = 210;
  const cy = 390;
  g.fillStyle = '#1f7a45';
  g.beginPath();
  g.arc(cx, cy, 92, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.translate(cx, cy);
  g.rotate(-Math.PI / 4);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 26;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(0, 30, 52, Math.PI * 1.08, Math.PI * 1.92);
  g.stroke();
  const ear = (x: number) => {
    g.beginPath();
    g.ellipse(x, 22, 22, 15, 0, 0, Math.PI * 2);
    g.fill();
  };
  ear(-50);
  ear(50);
  g.restore();
  // Platzhalter statt echter Nummer
  g.fillStyle = '#1d2b36';
  for (let i = 0; i < 9; i++) {
    const x = 345 + i * 40 + (i >= 3 ? 22 : 0) + (i >= 6 ? 22 : 0);
    g.beginPath();
    g.arc(x, cy, 12, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/** Schild auf zwei Pfosten, Tafel zeigt nach +z (Ursprung = Mitte am Boden). Tafel 0,9 × 0,66 m, Mitte 1,45 m hoch */
export const PlaygroundSign = () => {
  const tex = useFontTexture(signTexture, 'Spielplatz-Schild');
  const m = useMemo(
    () => ({
      face: tex ? new THREE.MeshStandardMaterial({map: tex, roughness: 0.55}) : std('#ffffff'),
      post: std('#5b6168', {metalness: 0.5, roughness: 0.4}),
      back: std('#d9dde0'),
    }),
    [tex],
  );
  return (
    <group>
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} material={m.post} position={[x, 0.9, -0.03]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 1.8, 8]} />
        </mesh>
      ))}
      <mesh material={m.back} position={[0, 1.45, -0.012]} castShadow>
        <boxGeometry args={[0.94, 0.7, 0.02]} />
      </mesh>
      <mesh material={m.face} position={[0, 1.45, 0.0]}>
        <planeGeometry args={[0.9, 0.66]} />
      </mesh>
    </group>
  );
};

// ---------- Sandkasten ----------
const Sandbox = () => {
  const {x0, x1, z0, z1, y} = PLAYGROUND.sand;
  const m = useMemo(() => ({sand: std(C.sand, {roughness: 1}), wood: std(C.wood), woodDark: std(C.woodDark)}), []);
  const geo = useMemo(() => {
    // leicht hügeliger Sand
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 24, 20);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i) + (x0 + x1) / 2;
      const pz = pos.getZ(i) + (z0 + z1) / 2;
      const edge = Math.min(px - x0, x1 - px, pz - z0, z1 - pz);
      const hill = 0.07 * Math.exp(-((px + 0.9) ** 2 + (pz + 1.3) ** 2) / 0.25) + 0.025 * Math.sin(px * 3.1) * Math.cos(pz * 2.7);
      pos.setY(i, edge < 0.05 ? 0 : hill);
    }
    g.computeVertexNormals();
    return g;
  }, [x0, x1, z0, z1]);
  const W = x1 - x0;
  const D = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  return (
    <group>
      <mesh geometry={geo} material={m.sand} position={[cx, y, cz]} receiveShadow />
      {/* Holzrand: vier Balken */}
      {[
        [cx, z0 - 0.06, W + 0.24, 0.12],
        [cx, z1 + 0.06, W + 0.24, 0.12],
      ].map(([x, z, w, d], i) => (
        <mesh key={`h${i}`} material={m.wood} position={[x, 0.08, z]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.16, d]} />
        </mesh>
      ))}
      {[x0 - 0.06, x1 + 0.06].map((x, i) => (
        <mesh key={`v${i}`} material={m.wood} position={[x, 0.08, cz]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.16, D]} />
        </mesh>
      ))}
      {/* Eckpfosten */}
      {[
        [x0 - 0.06, z0 - 0.06],
        [x1 + 0.06, z0 - 0.06],
        [x0 - 0.06, z1 + 0.06],
        [x1 + 0.06, z1 + 0.06],
      ].map(([x, z], i) => (
        <mesh key={`p${i}`} material={m.woodDark} position={[x, 0.11, z]} castShadow>
          <boxGeometry args={[0.15, 0.22, 0.15]} />
        </mesh>
      ))}
      {/* Sandspielzeug hinten links: Eimer + Schaufel + Förmchen */}
      <group position={[-1.15, y, -1.55]}>
        <mesh position={[0, 0.07, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.07, 0.14, 10]} />
          <meshStandardMaterial color="#e53935" flatShading roughness={0.5} />
        </mesh>
        <mesh position={[0.22, 0.02, 0.08]} rotation={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[0.07, 0.02, 0.22]} />
          <meshStandardMaterial color="#1e88e5" flatShading roughness={0.5} />
        </mesh>
        <mesh position={[-0.2, 0.025, 0.15]} castShadow>
          <cylinderGeometry args={[0.06, 0.045, 0.05, 6]} />
          <meshStandardMaterial color="#fdd835" flatShading roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- Rutsche ----------
const Slide = () => {
  const m = useMemo(
    () => ({
      post: std('#2f6fb3', {metalness: 0.3, roughness: 0.5}),
      deck: std(C.wood),
      chute: std('#f2b705', {roughness: 0.35, metalness: 0.1}),
      rail: std('#e53935', {roughness: 0.45}),
      rung: std('#2f6fb3', {metalness: 0.3, roughness: 0.5}),
    }),
    [],
  );
  const H = 1.3;
  const len = Math.hypot(2.0, H);
  const ang = Math.atan2(H, 2.0);
  return (
    <group>
      {/* Turm */}
      {[
        [-0.35, -0.35],
        [0.35, -0.35],
        [-0.35, 0.35],
        [0.35, 0.35],
      ].map(([x, z], i) => (
        <mesh key={i} material={m.post} position={[x, (H + 0.9) / 2, z]} castShadow>
          <boxGeometry args={[0.08, H + 0.9, 0.08]} />
        </mesh>
      ))}
      <mesh material={m.deck} position={[0, H, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.06, 0.8]} />
      </mesh>
      {/* Dach */}
      <mesh material={m.rail} position={[0, H + 1.12, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.72, 0.5, 4]} />
      </mesh>
      {/* Geländer hinten + seitlich */}
      {[-0.35, 0.35].map((z) => (
        <mesh key={z} material={m.rail} position={[0, H + 0.45, z]} castShadow>
          <boxGeometry args={[0.78, 0.06, 0.05]} />
        </mesh>
      ))}
      {/* Leiter (links, −x) */}
      <group position={[-0.62, 0, 0]} rotation={[0, 0, -0.28]}>
        {[-0.22, 0.22].map((z) => (
          <mesh key={z} material={m.post} position={[0, H / 2 + 0.05, z]} castShadow>
            <boxGeometry args={[0.06, H + 0.2, 0.06]} />
          </mesh>
        ))}
        {[0.25, 0.55, 0.85, 1.15].map((y) => (
          <mesh key={y} material={m.rung} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.44, 6]} />
          </mesh>
        ))}
      </group>
      {/* Rutschfläche nach +x */}
      <group position={[0.4, H, 0]} rotation={[0, 0, -ang]}>
        <mesh material={m.chute} position={[len / 2, 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[len, 0.04, 0.55]} />
        </mesh>
        {[-0.29, 0.29].map((z) => (
          <mesh key={z} material={m.chute} position={[len / 2, 0.1, z]} castShadow>
            <boxGeometry args={[len, 0.16, 0.04]} />
          </mesh>
        ))}
      </group>
      <mesh material={m.chute} position={[0.4 + 2.0 + 0.2, 0.12, 0]} castShadow>
        <boxGeometry args={[0.4, 0.04, 0.55]} />
      </mesh>
    </group>
  );
};

// ---------- Schaukel ----------
const SEAT_W = 0.46;
/** Schaukel-Gestell entlang x, Ursprung = Mitte am Boden. Sitze bei Abstand ±0.55; sway[i] = Schwingweite (rad) */
const SwingSet = ({sway}: {sway: [number, number]}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const m = useMemo(
    () => ({
      post: std('#2f6fb3', {metalness: 0.3, roughness: 0.5}),
      chain: std('#9aa3ab', {metalness: 0.8, roughness: 0.3}),
      seat: std('#e53935', {roughness: 0.5}),
    }),
    [],
  );
  const TOP = 2.2;
  const seats = [-0.55, 0.55];
  return (
    <group>
      {/* A-Gestelle links + rechts */}
      {[-1.2, 1.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} material={m.post} position={[0, TOP / 2, s * 0.42]} rotation={[s * -0.19, 0, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.05, TOP + 0.1, 8]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh material={m.post} position={[0, TOP, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.5, 8]} />
      </mesh>
      {seats.map((x, i) => {
        const a = sway[i] * Math.sin(t * 2.1 + i * 1.3);
        const L = TOP - PLAYGROUND.swingSeatY;
        return (
          <group key={i} position={[x, TOP, 0]} rotation={[a, 0, 0]}>
            {[-SEAT_W / 2 + 0.02, SEAT_W / 2 - 0.02].map((cx) => (
              <mesh key={cx} material={m.chain} position={[cx, -L / 2, 0]}>
                <cylinderGeometry args={[0.012, 0.012, L, 5]} />
              </mesh>
            ))}
            <mesh material={m.seat} position={[0, -L, 0]} castShadow>
              <boxGeometry args={[SEAT_W, 0.04, 0.2]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------- Zaun ----------
const Fence = () => {
  const m = useMemo(() => std(C.fence, {metalness: 0.3, roughness: 0.5}), []);
  const {x0, x1, z0, z1, gate} = {x0: -7.5, x1: 7.5, z0: -7, z1: 5.5, gate: [0.6, 2.0]};
  const segs: [number, number, number, number][] = []; // x0, z0, x1, z1
  segs.push([x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, gate[0]], [x1, gate[1], x1, z1]);
  return (
    <group>
      {segs.map(([ax, az, bx, bz], i) => {
        const len = Math.hypot(bx - ax, bz - az);
        const ang = Math.atan2(bz - az, bx - ax);
        const n = Math.max(2, Math.round(len / 0.14));
        return (
          <group key={i} position={[ax, 0, az]} rotation={[0, -ang, 0]}>
            {[0.15, 0.85].map((y) => (
              <mesh key={y} material={m} position={[len / 2, y, 0]}>
                <boxGeometry args={[len, 0.04, 0.04]} />
              </mesh>
            ))}
            {Array.from({length: n + 1}, (_, k) => (
              <mesh key={k} material={m} position={[(k / n) * len, 0.45, 0]}>
                <boxGeometry args={[0.025, 0.9, 0.025]} />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* Torpfosten am Eingang */}
      {gate.map((z) => (
        <mesh key={z} material={m} position={[x1, 0.6, z]} castShadow>
          <boxGeometry args={[0.1, 1.2, 0.1]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- Bäume / Büsche / Gras ----------
const useLayout = () =>
  useMemo(() => {
    const r = rng(77);
    const pick = <A,>(a: A[]) => a[Math.floor(r() * a.length)];
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const bushes: Inst[] = [];
    const grass: Inst[] = [];
    const addTree = (x: number, z: number, s: number) => {
      trunks.push({pos: [x, 0, z], scale: [0.25 * s, 2.8 * s, 0.25 * s], rotY: r() * 6, color: C.trunk});
      const col = pick(C.leaf);
      crowns.push({pos: [x, 3.9 * s, z], scale: [1.9 * s, 1.7 * s, 1.9 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + (r() - 0.5) * 1.3 * s, 3.2 * s, z + (r() - 0.5) * 1.3 * s], scale: [1.3 * s, 1.1 * s, 1.3 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + (r() - 0.5) * 1.0 * s, 4.8 * s, z + (r() - 0.5) * 0.9 * s], scale: [1.1 * s, 1.0 * s, 1.1 * s], rotY: r() * 6, color: pick(C.leaf)});
    };
    // Bäume außerhalb des Zauns (hinten + seitlich), vorn nur weit weg
    for (let x = -26; x <= 26; x += 4.2) addTree(x + (r() - 0.5) * 1.6, -9.5 - r() * 4, 1 + r() * 0.35);
    for (let i = 0; i < 24; i++) addTree(-40 + r() * 80, -15 - r() * 14, 1.1 + r() * 0.4);
    for (let z = -6; z <= 4; z += 3.6) {
      addTree(-10 - r() * 2, z + (r() - 0.5), 1 + r() * 0.3);
      addTree(10.5 + r() * 2.5, z + (r() - 0.5), 1 + r() * 0.3);
    }
    for (let i = 0; i < 18; i++) {
      const x = -40 + r() * 80;
      const z = 8 + r() * 18;
      if (Math.abs(x) < 12 && z < 26) continue;
      addTree(x, z, 1 + r() * 0.35);
    }
    // Büsche innen am Zaun: hinten (z −6.3 … −5.6) und links (x −6.8)
    const bushCols = ['#4a8a33', '#5a9a3c', '#3f7a2c', '#6aab45'];
    for (let x = -6.8; x <= 6.8; x += 0.9) {
      if (x > 1.6 && x < 5.4) continue; // hinter der Schaukel frei
      const s = 0.55 + r() * 0.35;
      bushes.push({pos: [x + (r() - 0.5) * 0.4, s * 0.45, -6.2 + (r() - 0.5) * 0.5], scale: [s * 1.3, s, s * 1.1], rotY: r() * 6, color: pick(bushCols)});
    }
    for (let z = -5.2; z <= 3.8; z += 0.95) {
      if (z > -0.4 && z < 2.2) continue; // Platz für die Bank
      const s = 0.5 + r() * 0.35;
      bushes.push({pos: [-6.8 + (r() - 0.5) * 0.4, s * 0.45, z], scale: [s * 1.1, s, s * 1.3], rotY: r() * 6, color: pick(bushCols)});
    }
    // ein paar Büsche rechts neben dem Eingang
    for (const z of [-5.5, -4.6, 4.2, 4.9]) {
      const s = 0.5 + r() * 0.3;
      bushes.push({pos: [6.9, s * 0.45, z], scale: [s * 1.1, s, s * 1.2], rotY: r() * 6, color: pick(bushCols)});
    }
    // Grasbüschel (nicht im Sandkasten, nicht auf den Fallschutz-Flächen)
    const {x0, x1, z0, z1} = PLAYGROUND.sand;
    for (let i = 0; i < 1400; i++) {
      const x = -14 + r() * 28;
      const z = -9 + r() * 20;
      if (x > x0 - 0.3 && x < x1 + 0.3 && z > z0 - 0.3 && z < z1 + 0.3) continue;
      if (x > 1.6 && x < 5.2 && z > -4.6 && z < -2.2) continue;
      if (x > -4.9 && x < -1.4 && z > -4.3 && z < -2.9) continue;
      const s = 0.07 + r() * 0.1;
      grass.push({pos: [x, 0, z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: pick(C.grass2)});
    }
    return {trunks, crowns, bushes, grass};
  }, []);

const PlaygroundScene = (_: {cam?: StageCam}) => {
  const L = useLayout();
  const geos = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
    trunk.translate(0, 0.5, 0);
    const crown = new THREE.IcosahedronGeometry(1, 0);
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    return {trunk, crown, blade};
  }, []);
  const [bx, bz] = PLAYGROUND.bin;
  const [sx, sz] = PLAYGROUND.sign;
  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 40, 200]} />
      <Sky c={C} />
      <hemisphereLight args={['#eaf4ff', '#6d8f45', 1.05]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[-8, 18, 12]}
        intensity={2.9}
        color="#fff3dc"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      {/* Rasen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color={C.grass} roughness={1} />
      </mesh>
      {/* Fallschutz-Matten unter Schaukel und Rutsche */}
      <mesh position={[3.4, 0.006, -3.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.6, 2.4]} />
        <meshStandardMaterial color={C.rubber} roughness={1} />
      </mesh>
      <mesh position={[-3.2, 0.006, -3.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.6, 1.6]} />
        <meshStandardMaterial color={C.rubber} roughness={1} />
      </mesh>
      {/* Weg vom Eingang (Pflaster, hell) */}
      <mesh position={[5.6, 0.005, 1.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.2, 1.3]} />
        <meshStandardMaterial color="#c9c1b0" roughness={1} />
      </mesh>
      <Sandbox />
      <group position={[-3.8, 0, -3.6]}>
        <Slide />
      </group>
      <group position={[3.4, 0, -3.4]}>
        <SwingSet sway={[0.12, 0]} />
      </group>
      <group position={[PLAYGROUND.bench[0], 0, PLAYGROUND.bench[1]]} rotation={[0, Math.PI / 2, 0]}>
        <ParkBench />
      </group>
      <group position={[bx, 0, bz]}>
        <TrashBin />
      </group>
      <Fence />
      <group position={[sx, 0, sz]} rotation={[0, -Math.PI / 2, 0]}>
        <PlaygroundSign />
      </group>
      <Instances geometry={geos.trunk} items={L.trunks} />
      <Instances geometry={geos.crown} items={L.crowns} />
      <Instances geometry={geos.crown} items={L.bushes} />
      <Instances geometry={geos.blade} items={L.grass} castShadow={false} />
      <FarHouses z={-40} face={1} seed={11} day />
      <FarHouses z={38} face={-1} seed={13} day />
    </>
  );
};

export const playgroundStage: StageDef = {
  id: 'spielplatz',
  Component: PlaygroundScene,
  climbTrees: [],
  groundHeight: () => 0,
  ambience: 'wald-atmo',
};
