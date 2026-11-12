import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';

/**
 * Strom-Effekt (comichaft): helle Zickzack-Blitze, die um eine Figur / einen Gegenstand herum zucken.
 * Kein Rauch, keine Verbrennungen – nur gelb-weiße Blitze mit leichtem Schein.
 * Die Blitze springen alle ca. 2 Bilder an eine neue Stelle (Zeit = Bewegungszeit → frieren beim Einfrieren mit ein).
 */

type V3 = [number, number, number];

const useBoltMats = () =>
  useMemo(
    () => ({
      core: new THREE.MeshBasicMaterial({color: '#fffbe0', toneMapped: false}),
      glow: new THREE.MeshBasicMaterial({color: '#ffd21a', transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false}),
      halo: new THREE.MeshBasicMaterial({color: '#7fe4ff', transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false}),
    }),
    [],
  );

const Y = new THREE.Vector3(0, 1, 0);

/** Ein gerades Stück eines Blitzes (Kern + Schein) */
const Piece = ({a, b, w, m}: {a: THREE.Vector3; b: THREE.Vector3; w: number; m: ReturnType<typeof useBoltMats>}) => {
  const d = b.clone().sub(a);
  const len = d.length() || 0.001;
  const q = new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return (
    <group position={mid} quaternion={q}>
      <mesh material={m.core}>
        <boxGeometry args={[w, len + w, w]} />
      </mesh>
      <mesh material={m.glow}>
        <boxGeometry args={[w * 2.6, len + w * 2, w * 2.6]} />
      </mesh>
      <mesh material={m.halo}>
        <boxGeometry args={[w * 5, len + w * 4, w * 5]} />
      </mesh>
    </group>
  );
};

/** Zickzack-Punkte von a nach b (n Knicke, seitlicher Ausschlag jitter) */
const zigzag = (a: THREE.Vector3, b: THREE.Vector3, n: number, jitter: number, r: () => number) => {
  const pts = [a.clone()];
  const d = b.clone().sub(a);
  const len = d.length();
  const dir = d.clone().normalize();
  let side = new THREE.Vector3().crossVectors(dir, Y);
  if (side.lengthSq() < 1e-4) side = new THREE.Vector3(1, 0, 0);
  side.normalize();
  const up = new THREE.Vector3().crossVectors(side, dir).normalize();
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const s = (i % 2 === 0 ? 1 : -1) * (0.4 + 0.6 * r()) * jitter * len;
    const u = (r() - 0.5) * jitter * len;
    pts.push(a.clone().addScaledVector(d, k).addScaledVector(side, s).addScaledVector(up, u));
  }
  pts.push(b.clone());
  return pts;
};

/** Ein Blitz zwischen zwei Punkten */
export const Bolt = ({from, to, seed = 1, time = 0, width = 0.012, kinks = 5, jitter = 0.18}: {from: V3; to: V3; seed?: number; time?: number; width?: number; kinks?: number; jitter?: number}) => {
  const m = useBoltMats();
  const step = Math.floor(time * 15);
  const r = rng(seed * 7919 + step * 104729);
  const pts = zigzag(new THREE.Vector3(...from), new THREE.Vector3(...to), kinks, jitter, r);
  return (
    <>
      {pts.slice(1).map((p, i) => (
        <Piece key={i} a={pts[i]} b={p} w={width} m={m} />
      ))}
    </>
  );
};

/**
 * Blitze rund um eine Figur: Jeder Blitz startet an einem der Ankerpunkte (Hände, Kopf, Brust …) und zuckt
 * nach außen. amount 0 … 1 = wie viele Blitze gleichzeitig.
 */
export const ZapAura = ({
  anchors,
  amount,
  time,
  seed = 1,
  count = 7,
  len = 0.24,
  width = 0.011,
  light = true,
}: {
  anchors: THREE.Vector3[];
  amount: number;
  time: number;
  seed?: number;
  count?: number;
  len?: number;
  width?: number;
  /** kleines flackerndes Licht (Schein auf Wand/Figur) */
  light?: boolean;
}) => {
  const m = useBoltMats();
  if (amount < 0.01 || anchors.length === 0) return null;
  const step = Math.floor(time * 15);
  const n = Math.max(1, Math.round(count * Math.min(1, amount)));
  const bolts = [];
  for (let i = 0; i < n; i++) {
    const r = rng(seed * 7919 + step * 104729 + i * 31337);
    const a = anchors[Math.floor(r() * anchors.length) % anchors.length].clone();
    const dir = new THREE.Vector3(r() - 0.5, r() - 0.35, r() - 0.5).normalize();
    const l = len * (0.6 + 0.8 * r());
    const b = a.clone().addScaledVector(dir, l);
    const pts = zigzag(a, b, 4, 0.28, r);
    bolts.push(pts.slice(1).map((p, j) => <Piece key={`${i}-${j}`} a={pts[j]} b={p} w={width * (1 - j * 0.12)} m={m} />));
  }
  // Bogen zwischen zwei Ankerpunkten (wirkt "unter Strom")
  const ra = rng(seed * 13 + step * 7);
  const i0 = Math.floor(ra() * anchors.length);
  const i1 = (i0 + 1 + Math.floor(ra() * (anchors.length - 1))) % anchors.length;
  const arc = anchors.length > 1 && amount > 0.35 ? zigzag(anchors[i0], anchors[i1], 6, 0.22, ra) : [];
  const flick = 0.6 + 0.4 * Math.sin(time * 47 + seed);
  return (
    <>
      {bolts}
      {arc.slice(1).map((p, j) => (
        <Piece key={`arc${j}`} a={arc[j]} b={p} w={width * 0.9} m={m} />
      ))}
      {light && <pointLight position={anchors[0]} color="#ffe680" intensity={2.2 * amount * flick} distance={2.2} decay={1.6} />}
    </>
  );
};

/** Zufälliges Zittern (für Figuren unter Strom), ändert sich jedes Bild; amount 0 … 1 */
export const zapShake = (time: number, amount: number, seed = 1): {pos: V3; rot: V3} => {
  if (amount < 0.01) return {pos: [0, 0, 0], rot: [0, 0, 0]};
  const r = rng(seed * 977 + Math.floor(time * 30) * 7177);
  const s = () => (r() - 0.5) * 2 * amount;
  return {pos: [s() * 0.018, s() * 0.008, s() * 0.018], rot: [s() * 0.03, s() * 0.05, s() * 0.03]};
};
