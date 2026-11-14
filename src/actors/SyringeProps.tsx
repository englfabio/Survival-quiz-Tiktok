import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';

/**
 * Objekte für das Video "Spritze auf dem Spielplatz" (wiederverwendbar für alle Fund-Szenen mit Spritzen/Müll).
 * WICHTIG (vom Inhaber): kein Drogenkonsum, kein Blut. Die Spritze ist stilisiert (klarer Kolben, orange Stopfen),
 * gut erkennbar, mit offener Nadel.
 *
 *  - Syringe ("spritze"): Einwegspritze. Ursprung = Mitte des Kolbens (dort wird sie gegriffen), Nadel zeigt nach +z.
 *      Echte Größe ca. 12 cm – im Video mit SYRINGE_SCALE vergrößert (comichaft, damit man sie im Hochformat erkennt).
 *      Werte: capon 1 = Kappe steckt auf der Nadel, blink 0 … 1 = Nadelspitze blitzt auf (Warnung), size = größer.
 *  - NeedleCap ("kappe"): orange Verschlusskappe, liegt (Ursprung = Mitte, Längsachse z, Öffnung bei +z).
 *  - LitterPile ("muell"): kleiner Haufen Verpackungsmüll (Folie, Papier, Tüte, Becher). Ursprung = Mitte am Boden.
 *  - HiddenNeedle ("nadel"): kleiner Müllhaufen, aus dem nur ein Stück Nadel schaut. blink 0 … 1 = blitzt auf + roter Warnring.
 *  - Branch ("ast"): Ast mit ein paar Zweigen und Blättern, steht senkrecht (Ursprung = unteres Ende). Bewegung "plant" =
 *      wird von oben in den Sand gedrückt (0,3 … 0,9 s, passt zur Dummy-Bewegung "mark"), "park" + Wert tilt 90 = liegt.
 */

export const SYRINGE_SCALE = 1.8;
const BARREL = {r: 0.0075, len: 0.085};
const NEEDLE = {r: 0.0016, len: 0.038};

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.55, flatShading: true, ...extra});

/** Kleiner Glitzer-Stern (drei gekreuzte Flächen), leuchtet unabhängig vom Licht */
export const Glint = ({amount, size = 0.05, color = '#ffffff'}: {amount: number; size?: number; color?: string}) => {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({color, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending}),
    [color],
  );
  if (amount < 0.01) return null;
  mat.opacity = clamp(amount);
  const s = size * (0.4 + 0.6 * amount);
  return (
    <group scale={s}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={mat} rotation={[i === 1 ? Math.PI / 2 : 0, i === 2 ? Math.PI / 2 : 0, Math.PI / 4]}>
          <planeGeometry args={[0.18, 1]} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={`b${i}`} material={mat} rotation={[i === 1 ? Math.PI / 2 : 0, i === 2 ? Math.PI / 2 : 0, -Math.PI / 4]}>
          <planeGeometry args={[0.18, 1]} />
        </mesh>
      ))}
      <mesh material={mat}>
        <icosahedronGeometry args={[0.16, 0]} />
      </mesh>
    </group>
  );
};

const useSyringeMats = () =>
  useMemo(
    () => ({
      barrel: new THREE.MeshStandardMaterial({color: '#eef6fb', roughness: 0.15, metalness: 0, transparent: true, opacity: 0.55, flatShading: true}),
      rim: std('#f7fbff', {roughness: 0.3}),
      plunger: std('#f1f1ee', {roughness: 0.4}),
      stopper: std('#ff7a1a', {roughness: 0.5}),
      scale: new THREE.MeshBasicMaterial({color: '#2a4e7a'}),
      hub: std('#ff8a22', {roughness: 0.45}),
      steel: std('#dfe5ea', {roughness: 0.15, metalness: 0.9}),
      cap: std('#ff7a1a', {roughness: 0.5}),
    }),
    [],
  );

/** Einwegspritze, Ursprung = Kolbenmitte, Nadel nach +z (echte Größe – Szene skaliert mit SYRINGE_SCALE) */
export const Syringe = ({capon = 0, blink = 0}: {capon?: number; blink?: number}) => {
  const m = useSyringeMats();
  const {r, len} = BARREL;
  return (
    <group>
      {/* Kolben (durchsichtig) mit Skala */}
      <mesh material={m.barrel} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, len, 10, 1, true]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} material={m.scale} position={[0, r + 0.0003, -len * 0.3 + i * 0.011]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[i % 2 ? 0.004 : 0.0065, 0.0009]} />
        </mesh>
      ))}
      {/* Fingerauflage hinten */}
      <mesh material={m.rim} position={[0, 0, -len / 2]} scale={[1.9, 0.7, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r * 1.15, r * 1.15, 0.003, 10]} />
      </mesh>
      {/* Stempel (Stange + Gummistopfen + Druckplatte) */}
      <mesh material={m.plunger} position={[0, 0, -len / 2 - 0.006]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[r * 0.9, 0.04, r * 0.3]} />
      </mesh>
      <mesh material={m.stopper} position={[0, 0, -len * 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r * 0.92, r * 0.92, 0.008, 10]} />
      </mesh>
      <mesh material={m.plunger} position={[0, 0, -len / 2 - 0.026]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r * 1.05, r * 1.05, 0.003, 10]} />
      </mesh>
      {/* Spitze + Nadelansatz (orange) */}
      <mesh material={m.rim} position={[0, 0, len / 2 + 0.003]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r * 0.45, r, 0.006, 10]} />
      </mesh>
      <mesh material={m.hub} position={[0, 0, len / 2 + 0.009]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r * 0.38, r * 0.45, 0.008, 8]} />
      </mesh>
      {/* Nadel (stilisiert etwas dicker, damit man sie sieht) */}
      <group position={[0, 0, len / 2 + 0.013]}>
        <mesh material={m.steel} position={[0, 0, NEEDLE.len / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[NEEDLE.r * 0.55, NEEDLE.r, NEEDLE.len, 6]} />
        </mesh>
        {capon > 0.5 && (
          <mesh material={m.cap} position={[0, 0, NEEDLE.len / 2 - 0.001]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r * 0.36, r * 0.42, NEEDLE.len + 0.006, 8]} />
          </mesh>
        )}
        <group position={[0, 0, NEEDLE.len]}>
          <Glint amount={blink} size={0.06} color="#fff6c8" />
        </group>
      </group>
    </group>
  );
};

/** Wo die Nadelspitze liegt (im System der Spritze, echte Größe) */
export const SYRINGE_TIP = BARREL.len / 2 + 0.013 + NEEDLE.len;

/** Verschlusskappe (orange), Ursprung = Mitte, Öffnung bei +z */
export const NeedleCap = () => {
  const m = useSyringeMats();
  return (
    <group>
      <mesh material={m.cap} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[BARREL.r * 0.5, BARREL.r * 0.36, NEEDLE.len + 0.012, 8]} />
      </mesh>
      <mesh material={m.cap} position={[0, 0, (NEEDLE.len + 0.012) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[BARREL.r * 0.62, BARREL.r * 0.62, 0.004, 8]} />
      </mesh>
    </group>
  );
};

/** Haufen Verpackungsmüll: Folie, Papier, Tüte, zerdrückter Becher, Kronkorken. Ursprung = Mitte am Boden */
export const LitterPile = ({seed = 3, spread = 1}: {seed?: number; spread?: number}) => {
  const items = useMemo(() => {
    const r = rng(seed);
    const cols = ['#e8e4da', '#c9d3dc', '#d94b3d', '#3d7fd9', '#f2c94c', '#bfc6cc', '#7fbf6a', '#f4f4f0'];
    return Array.from({length: 9}, (_, i) => ({
      kind: i % 4,
      x: (r() - 0.5) * 0.36 * spread,
      z: (r() - 0.5) * 0.28 * spread,
      rot: [r() * 0.8 - 0.4, r() * 6.2, r() * 0.8 - 0.4] as [number, number, number],
      s: 0.7 + r() * 0.6,
      c: cols[Math.floor(r() * cols.length)],
    }));
  }, [seed, spread]);
  const mats = useMemo(() => new Map<string, THREE.Material>(), []);
  const mat = (c: string, foil = false) => {
    const k = c + foil;
    if (!mats.has(k)) mats.set(k, std(c, foil ? {metalness: 0.75, roughness: 0.3} : {roughness: 0.85, side: THREE.DoubleSide}));
    return mats.get(k)!;
  };
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={[it.x, 0.012 * it.s, it.z]} rotation={it.rot} scale={it.s}>
          {it.kind === 0 && (
            // zerknüllte Folie / Papier
            <mesh material={mat(it.c, i % 3 === 0)} castShadow>
              <icosahedronGeometry args={[0.035, 0]} />
            </mesh>
          )}
          {it.kind === 1 && (
            // flache Verpackung (Tütchen)
            <mesh material={mat(it.c)} castShadow rotation={[-Math.PI / 2 + 0.1, 0, 0]}>
              <planeGeometry args={[0.11, 0.07, 2, 2]} />
            </mesh>
          )}
          {it.kind === 2 && (
            // zerdrückter Pappbecher
            <mesh material={mat('#f4f4f0')} castShadow rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.55]}>
              <cylinderGeometry args={[0.032, 0.024, 0.08, 8]} />
            </mesh>
          )}
          {it.kind === 3 && (
            // kleine Schachtel / Pappe
            <mesh material={mat('#c9a77a')} castShadow>
              <boxGeometry args={[0.07, 0.02, 0.05]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

/** Nadel, die nur ein Stück aus dem Müll herausschaut. blink = blitzt auf + roter Warnring am Boden */
export const HiddenNeedle = ({blink = 0, time = 0}: {blink?: number; time?: number}) => {
  const m = useSyringeMats();
  const ring = useMemo(() => new THREE.MeshBasicMaterial({color: '#ff2b22', transparent: true, depthWrite: false, side: THREE.DoubleSide}), []);
  const pulse = 0.5 + 0.5 * Math.sin(time * 9);
  ring.opacity = clamp(blink) * (0.55 + 0.4 * pulse);
  return (
    <group>
      <LitterPile seed={9} spread={1.15} />
      <group position={[0, 0.03, 0]} rotation={[0.55, 0, 0]} scale={SYRINGE_SCALE}>
        <mesh material={m.hub} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[BARREL.r * 0.38, BARREL.r * 0.45, 0.008, 8]} />
        </mesh>
        <mesh material={m.steel} position={[0, 0, NEEDLE.len / 2 + 0.004]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[NEEDLE.r * 0.55, NEEDLE.r, NEEDLE.len, 6]} />
        </mesh>
        <group position={[0, 0, NEEDLE.len + 0.004]}>
          <Glint amount={blink * (0.6 + 0.4 * pulse)} size={0.09} color="#fff3b0" />
        </group>
      </group>
      {blink > 0.01 && (
        <mesh material={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.8 + 0.25 * pulse}>
          <ringGeometry args={[0.13, 0.17, 28]} />
        </mesh>
      )}
    </group>
  );
};

/** Ast mit Zweigen + ein paar Blättern, Ursprung = unteres Ende, steht senkrecht (Länge ca. 0,9 m) */
export const BRANCH_LEN = 0.9;
export const Branch = ({time = 0, plant = false}: {time?: number; plant?: boolean}) => {
  const m = useMemo(() => ({bark: std('#6b4a2e', {roughness: 0.95}), leaf: std('#5f9a3c', {roughness: 0.9, side: THREE.DoubleSide})}), []);
  // "plant": wird von oben in den Sand gedrückt (0,3 … 0,9 s), danach steckt er 0,15 m tief
  const y = plant ? 0.35 - 0.5 * easeInOut(clamp((time - 0.3) / 0.6)) : 0;
  const twigs: [number, number, number, number][] = [
    [0.55, 0.6, 0.0, 0.22],
    [0.7, -0.7, 1.6, 0.18],
    [0.82, 0.5, 3.4, 0.15],
  ];
  return (
    <group position={[0, y, 0]}>
      <mesh material={m.bark} position={[0, BRANCH_LEN / 2, 0]} castShadow>
        <cylinderGeometry args={[0.013, 0.02, BRANCH_LEN, 6]} />
      </mesh>
      {twigs.map(([h, a, ry, l], i) => (
        <group key={i} position={[0, BRANCH_LEN * h, 0]} rotation={[0, ry, a]}>
          <mesh material={m.bark} position={[0, l / 2, 0]} castShadow>
            <cylinderGeometry args={[0.006, 0.009, l, 5]} />
          </mesh>
          <mesh material={m.leaf} position={[0, l, 0]} rotation={[0.3, 0, 0.6]} scale={[1, 1.6, 1]} castShadow>
            <circleGeometry args={[0.03, 5]} />
          </mesh>
        </group>
      ))}
      <mesh material={m.leaf} position={[0, BRANCH_LEN + 0.02, 0]} rotation={[0.5, 0.3, 0]} scale={[1, 1.6, 1]} castShadow>
        <circleGeometry args={[0.035, 5]} />
      </mesh>
    </group>
  );
};
