import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {canvasTex, TextPlane} from './WgProps';

/**
 * Spezial „Schwarzes Loch in der Küche“ – Objekte, alle comichaft, bunt, Low-Poly, harmlos:
 *  - BlackHoleDisk + BlackHoleHalo ("schwarzesloch"): schwebendes, wirbelndes Cartoon-Schwarzes-Loch. Schwarze Kugel (r 0,55),
 *    leuchtender Ring, Wirbelscheibe aus orange/pink/lila Spiralarmen, die nach innen strudeln, kleine Sternchen, Halo zur Kamera.
 *    Werte: "fill" 0 … 1 = öffnet sich (wächst mit Überschwingen aus einem Punkt), "rumble" = pulsiert (schluckt gerade etwas), "size".
 *    Scheibe steht im eigenen System in der x-y-Ebene (zeigt nach +z) und ist oben 26° nach hinten gekippt.
 *  - KitchenWall ("kuechenwand"): durchbrechbare Küchen-Rückwand 5,4 × 5,2 m (Innenseite +z hell mit Bild + Regal, Außenseite −z Putz).
 *    "fill" 0 heil … 1 durchbrochen (Öffnung 4,7 m breit, 4,9 m hoch; Teile fliegen nach +z höchstens ca. 3 m weit + Staub). Linear über 2,2 s.
 *  - JumpRamp ("schanze"): Sprungschanze aus Holz mit gelb-schwarzer Kante, 3,6 m breit, steigt auf 3,0 m Länge nach +z auf 1,25 m.
 *    Ursprung = unteres Ende Mitte. "fill" 0 … 1 = ploppt aus dem Boden (mit Überschwingen + Staubwölkchen).
 *  - DishMountain ("abwasch"): riesiger Berg schmutziger Teller, Töpfe, Pfanne, Tassen, Schüsseln, Besteck (bunte Soßenflecken,
 *    Nudeln, Erbsen – comichaft, nicht eklig). Grundfläche ca. 0,8 × 0,55 m, Höhe ca. 1,05 m. "fill" 0 … 1 = Teile fliegen auseinander
 *    (im Flug), "rumble" = wackelt/klirrt.
 *  - SuckItems ("sogkram"): zwei Tassen + drei Servietten, die vom Schwarzen Loch angezogen werden. Zug nach +z des eigenen Systems.
 *    "fill" 0 … 1 = Stärke (Tassen kippeln + rutschen, Servietten flattern hoch).
 *  - Sparkles ("glanz"): Glitzer-Sterne + Glanzstreifen über einer Fläche 4,4 × 1,2 m (Küchenzeile), "fill" 0 … 1.
 *  - LabNotepad ("notizblock"): Spiral-Notizblock „FORSCHUNG“ mit Formel-Gekritzel und Bleistift, Seite zeigt nach +z.
 *  - ResearchGoggles (Dummy-Wert "goggles"): dicke Forscher-Schutzbrille mit orangem Band, 0 … 1 rutscht von der Stirn auf die Augen.
 * Außerdem: allgemeiner Wert "shrink" 0 … 1 an JEDER Figur (index.tsx) = wird ins Loch gesaugt (schrumpft auf 0 + dreht sich).
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.7, flatShading: true, ...extra});
const basic = (color: string, opacity = 1, extra: Partial<THREE.MeshBasicMaterialParameters> = {}) =>
  new THREE.MeshBasicMaterial({color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: THREE.DoubleSide, ...extra});

/** Öffnen mit Überschwingen (0 → 1) */
const popOpen = (f: number) => {
  const k = clamp(f);
  if (k >= 1) return 1;
  return 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
};

// =====================================================================================================
// Schwarzes Loch
// =====================================================================================================
export const BH = {core: 0.55, disk: 1.75, tilt: -0.45};
const ARM_COLS = ['#fff0b8', '#ffc24a', '#ff8a3c', '#ff5f8f', '#d455ff', '#8a4dff', '#5a3cff'];

export const BlackHoleDisk = ({fill = 1, time = 0, rumble = 0, size = 0}: {fill?: number; time?: number; rumble?: number; size?: number}) => {
  const m = useMemo(
    () => ({
      core: new THREE.MeshBasicMaterial({color: '#000000'}),
      rim: basic('#fff4d6'),
      arms: ARM_COLS.map((c) => basic(c, 0.95)),
      rings: ['#ffb347', '#ff6fa0', '#a35cff', '#5b3dff'].map((c, i) => basic(c, 0.42 - i * 0.07)),
      star: basic('#ffffff'),
      streak: basic('#ffe6a8', 0.7),
    }),
    [],
  );
  const blobs = useMemo(() => {
    const r = rng(404);
    const out: {arm: number; u: number; s: number; off: number}[] = [];
    for (let a = 0; a < 4; a++) for (let i = 0; i < 16; i++) out.push({arm: a, u: i / 16, s: 0.07 + r() * 0.06, off: (r() - 0.5) * 0.25});
    return out;
  }, []);
  const stars = useMemo(() => {
    const r = rng(77);
    return Array.from({length: 26}, () => ({u: r(), a: r() * Math.PI * 2, s: 0.02 + r() * 0.03, sp: 0.5 + r() * 0.6}));
  }, []);
  const sc = popOpen(fill) * (1 + size) * (1 + 0.07 * rumble * Math.sin(time * 26));
  if (fill < 0.005) return null;
  const R0 = BH.core + 0.08;
  const R1 = BH.disk;
  const ringR = [0.8, 1.05, 1.3, 1.58];
  return (
    <group scale={sc}>
      <mesh material={m.core}>
        <icosahedronGeometry args={[BH.core, 2]} />
      </mesh>
      <group rotation={[BH.tilt, 0, 0]}>
        {/* leuchtender Ring direkt am Rand */}
        <mesh material={m.rim} rotation={[0, 0, time * 0.8]}>
          <torusGeometry args={[BH.core + 0.03, 0.04, 6, 32]} />
        </mesh>
        {/* weiche Farbringe (drehen langsam) */}
        {ringR.map((rr, i) => (
          <mesh key={i} material={m.rings[i]} rotation={[0, 0, -time * (0.6 - i * 0.1)]} position={[0, 0, -0.01 - i * 0.004]}>
            <ringGeometry args={[rr - 0.2, rr + 0.12, 28, 1, 0, Math.PI * 1.7]} />
          </mesh>
        ))}
        {/* Spiralarme: Klumpen strudeln nach innen (innen schneller) */}
        {blobs.map((b, i) => {
          const u = (((b.u - time * 0.22) % 1) + 1) % 1; // 1 = außen, 0 = innen
          const rr = R0 + (R1 - R0) * u;
          const ang = (b.arm / 4) * Math.PI * 2 + u * 3.6 - time * (1.4 + (1 - u) * 1.6) + b.off;
          const ci = Math.min(ARM_COLS.length - 1, Math.floor(u * ARM_COLS.length));
          const fade = clamp(u / 0.12) * clamp((1 - u) / 0.15);
          const s = b.s * (0.6 + 0.8 * u) * fade;
          if (s < 0.004) return null;
          return (
            <mesh key={i} material={m.arms[ci]} position={[Math.cos(ang) * rr, Math.sin(ang) * rr, 0.02]} rotation={[0, 0, ang + 1.2]} scale={[s * 2.2, s, s * 0.6]}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
          );
        })}
        {/* Sog-Streifen */}
        {Array.from({length: 8}, (_, i) => {
          const u = (((i / 8 + 0.37 * i - time * 0.6) % 1) + 1) % 1;
          const rr = R0 + 0.2 + (R1 + 0.3 - R0) * u;
          const ang = (i / 8) * Math.PI * 2 + u * 1.5 - time * 1.2;
          const op = Math.sin(Math.PI * u);
          return (
            <mesh key={`s${i}`} material={m.streak} position={[Math.cos(ang) * rr, Math.sin(ang) * rr, 0.03]} rotation={[0, 0, ang + 0.35]} scale={[0.32 * op, 0.018, 1]}>
              <planeGeometry args={[1, 1]} />
            </mesh>
          );
        })}
        {/* Sternchen werden eingesaugt */}
        {stars.map((s, i) => {
          const u = (((s.u - time * 0.18 * s.sp) % 1) + 1) % 1;
          const rr = R0 + (R1 + 0.6 - R0) * u;
          const ang = s.a + u * 2.6 - time * 0.9;
          return (
            <mesh key={`t${i}`} material={m.star} position={[Math.cos(ang) * rr, Math.sin(ang) * rr, 0.05]} rotation={[time * 3 + i, time * 2, 0]} scale={s.s * clamp(u / 0.15)}>
              <octahedronGeometry args={[1, 0]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

/** Halo, das immer zur Kamera schaut (wird in index.tsx mit billboard gedreht) */
export const BlackHoleHalo = ({fill = 1, time = 0, size = 0}: {fill?: number; time?: number; size?: number}) => {
  const m = useMemo(
    () => [
      basic('#2a0f4a', 0.55),
      basic('#5b2aa8', 0.28),
      basic('#ff8ad8', 0.16),
      basic('#ffe2a0', 0.75),
    ],
    [],
  );
  if (fill < 0.005) return null;
  const sc = popOpen(fill) * (1 + size) * (1 + 0.03 * Math.sin(time * 3));
  return (
    <group scale={sc}>
      <mesh material={m[3]} position={[0, 0, -0.02]}>
        <ringGeometry args={[BH.core - 0.005, BH.core + 0.05, 32]} />
      </mesh>
      <mesh material={m[0]} position={[0, 0, -0.04]}>
        <ringGeometry args={[BH.core + 0.04, BH.core + 0.3, 32]} />
      </mesh>
      <mesh material={m[1]} position={[0, 0, -0.06]}>
        <ringGeometry args={[BH.core + 0.28, BH.core + 0.9, 32]} />
      </mesh>
      <mesh material={m[2]} position={[0, 0, -0.08]}>
        <ringGeometry args={[BH.core + 0.85, BH.core + 1.55, 32]} />
      </mesh>
    </group>
  );
};

// =====================================================================================================
// durchbrechbare Küchen-Rückwand
// =====================================================================================================
export const KWALL = {w: 5.4, h: 5.2, d: 0.2, hole: 2.35, top: 4.9};
const G = 9.81;
type Chunk = {c: [number, number]; w: number; h: number; v: [number, number, number]; spin: [number, number, number]; delay: number};
export const KitchenWall = ({fill = 0}: {fill?: number}) => {
  const m = useMemo(
    () => ({
      paint: std('#eadcc0', {roughness: 0.95}),
      outside: std('#cdbb9c', {roughness: 1}),
      core: std('#b9ad9a', {roughness: 1}),
      frame: std('#5a4632'),
      art: [std('#ffb347'), std('#4fa3e0'), std('#7fc96b')],
      shelf: std('#c99a63'),
      pot: std('#d26a3c'),
      leaf: std('#4e9a4a'),
      jar: std('#f2e2b8'),
      dust: new THREE.MeshStandardMaterial({color: '#e0d6c6', transparent: true, opacity: 0.6, roughness: 1, depthWrite: false}),
    }),
    [],
  );
  const chunks = useMemo(() => {
    const r = rng(311);
    const out: Chunk[] = [];
    const cols = 7;
    const rows = 7;
    const cw = (KWALL.hole * 2) / cols;
    const rh = KWALL.top / rows;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const x = -KWALL.hole + cw * (i + 0.5);
        const y = rh * (j + 0.5);
        out.push({
          c: [x, y],
          w: cw * (0.92 + r() * 0.06),
          h: rh * (0.9 + r() * 0.08),
          v: [(x / KWALL.hole) * (0.5 + r() * 0.6), 0.6 + r() * 1.4, 1.0 + r() * 0.8 + (1 - y / KWALL.top) * 0.3],
          spin: [(r() - 0.5) * 9, (r() - 0.5) * 4, (r() - 0.5) * 8],
          delay: (1 - y / KWALL.top) * 0.05 + Math.abs(x) * 0.02 + r() * 0.05,
        });
      }
    return out;
  }, []);
  const t = clamp(fill) * 2.2;
  const rim = (KWALL.w / 2 - KWALL.hole) / 2;
  const deco = (
    <>
      {/* Bild mit Rahmen (Innenseite) */}
      <group position={[-0.9, 2.05, KWALL.d / 2 + 0.02]}>
        <mesh material={m.frame}>
          <boxGeometry args={[1.1, 0.8, 0.04]} />
        </mesh>
        {m.art.map((a, i) => (
          <mesh key={i} material={a} position={[-0.3 + i * 0.3, -0.04 + (i % 2) * 0.12, 0.025]}>
            <circleGeometry args={[0.17 - i * 0.025, 10]} />
          </mesh>
        ))}
      </group>
      {/* Wandregal mit Pflanze + Gläsern */}
      <group position={[1.05, 1.55, KWALL.d / 2 + 0.12]}>
        <mesh material={m.shelf}>
          <boxGeometry args={[1.3, 0.05, 0.24]} />
        </mesh>
        <mesh material={m.pot} position={[-0.4, 0.11, 0]}>
          <cylinderGeometry args={[0.08, 0.06, 0.17, 8]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} material={m.leaf} position={[-0.4 + Math.cos(i * 1.6) * 0.06, 0.28, Math.sin(i * 1.6) * 0.05]} rotation={[0.3 * Math.sin(i), i, 0.4 * Math.cos(i)]}>
            <icosahedronGeometry args={[0.08, 0]} />
          </mesh>
        ))}
        {[0, 1, 2].map((i) => (
          <mesh key={`j${i}`} material={m.jar} position={[0.05 + i * 0.2, 0.1, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.15 + (i % 2) * 0.05, 8]} />
          </mesh>
        ))}
      </group>
    </>
  );
  return (
    <group>
      {fill <= 0.0001 ? (
        <>
          <mesh material={m.paint} position={[0, KWALL.h / 2, 0.002]} castShadow receiveShadow>
            <boxGeometry args={[KWALL.w, KWALL.h, KWALL.d]} />
          </mesh>
          <mesh material={m.outside} position={[0, KWALL.h / 2, -KWALL.d / 2 - 0.005]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[KWALL.w, KWALL.h]} />
          </mesh>
          {deco}
        </>
      ) : (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} material={m.paint} position={[s * (KWALL.hole + rim), KWALL.h / 2, 0]} castShadow>
              <boxGeometry args={[rim * 2, KWALL.h, KWALL.d]} />
            </mesh>
          ))}
          <mesh material={m.paint} position={[0, (KWALL.top + KWALL.h) / 2, 0]} castShadow>
            <boxGeometry args={[KWALL.hole * 2, KWALL.h - KWALL.top, KWALL.d]} />
          </mesh>
          {chunks.map((k, i) => {
            const tt = Math.max(0, t - k.delay);
            const half = KWALL.d * 0.8;
            const a = G / 2;
            const disc = k.v[1] * k.v[1] + 4 * a * (k.c[1] - half);
            const tl = (k.v[1] + Math.sqrt(Math.max(0, disc))) / (2 * a);
            const tf = Math.min(tt, tl);
            const slide = Math.max(0, tt - tl);
            const sl = 1 - Math.exp(-slide * 4);
            const x = k.c[0] + k.v[0] * tf + k.v[0] * 0.12 * sl;
            const z = k.v[2] * tf + k.v[2] * 0.15 * sl;
            const y = tt >= tl ? half : k.c[1] + k.v[1] * tf - a * tf * tf;
            const land = clamp(slide / 0.25);
            const rx = THREE.MathUtils.lerp(k.spin[0] * tf, Math.PI / 2, land);
            const ry = k.spin[1] * tf;
            const rz = THREE.MathUtils.lerp(k.spin[2] * tf, 0, land);
            return (
              <group key={i} position={[x, y, z]} rotation={[rx, ry, rz]}>
                <mesh material={m.paint} castShadow>
                  <boxGeometry args={[k.w * 0.9, k.h * 0.9, KWALL.d * 1.3]} />
                </mesh>
                <mesh material={m.core} position={[0, 0, -0.005]}>
                  <boxGeometry args={[k.w * 0.92, k.h * 0.92, KWALL.d * 1.2]} />
                </mesh>
              </group>
            );
          })}
          {Array.from({length: 14}, (_, i) => {
            const ph = clamp((t - (i % 4) * 0.05) / 2.0);
            if (ph <= 0 || ph >= 1) return null;
            const ang = (i / 14) * Math.PI * 2;
            const rr = 0.5 + ph * 2.2;
            const op = Math.sin(Math.PI * ph);
            return (
              <mesh key={`d${i}`} material={m.dust} position={[Math.cos(ang) * rr * 1.2, 0.4 + (i % 4) * 0.7 + ph * 0.7, 0.6 + Math.abs(Math.sin(ang)) * rr]} scale={(0.45 + ph * 0.8) * op}>
                <icosahedronGeometry args={[1, 1]} />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
};

// =====================================================================================================
// Sprungschanze
// =====================================================================================================
export const RAMP = {w: 3.6, len: 3.0, h: 1.25};
export const rampHeightAt = (dz: number) => (dz <= 0 || dz >= RAMP.len ? 0 : (RAMP.h * dz) / RAMP.len);
export const JumpRamp = ({fill = 1, time = 0}: {fill?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      wood: std('#c98d52'),
      woodDark: std('#9a6534'),
      yellow: std('#ffd21a'),
      black: std('#1d1f22'),
      dust: new THREE.MeshStandardMaterial({color: '#e8dfcf', transparent: true, opacity: 0.55, roughness: 1, depthWrite: false}),
    }),
    [],
  );
  const side = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(RAMP.len, 0);
    s.lineTo(RAMP.len, RAMP.h);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, {depth: 0.08, bevelEnabled: false});
  }, []);
  if (fill < 0.005) return null;
  const sy = popOpen(fill);
  const ang = Math.atan2(RAMP.h, RAMP.len);
  const deckL = Math.hypot(RAMP.h, RAMP.len);
  const planks = 9;
  return (
    <group>
      <group scale={[1, sy, 1]}>
        {/* Seitenwände (Dreiecke) */}
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={side} material={m.woodDark} position={[s * (RAMP.w / 2) + (s < 0 ? 0.08 : 0), 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow>
            {/* Shape liegt in x-y → nach dem Drehen: Länge entlang +z */}
          </mesh>
        ))}
        {/* Fahrbahn aus Brettern */}
        <group position={[0, RAMP.h / 2, RAMP.len / 2]} rotation={[-ang, 0, 0]}>
          {Array.from({length: planks}, (_, i) => (
            <mesh key={i} material={i % 2 ? m.wood : m.woodDark} position={[0, 0.03, -deckL / 2 + (deckL / planks) * (i + 0.5)]} castShadow receiveShadow>
              <boxGeometry args={[RAMP.w, 0.06, deckL / planks - 0.02]} />
            </mesh>
          ))}
          {/* gelb-schwarze Kante oben */}
          {Array.from({length: 8}, (_, i) => (
            <mesh key={`k${i}`} material={i % 2 ? m.black : m.yellow} position={[-RAMP.w / 2 + (RAMP.w / 8) * (i + 0.5), 0.07, deckL / 2 - 0.14]}>
              <boxGeometry args={[RAMP.w / 8, 0.03, 0.26]} />
            </mesh>
          ))}
        </group>
        {/* Stützbalken hinten */}
        <mesh material={m.woodDark} position={[0, RAMP.h / 2, RAMP.len - 0.05]}>
          <boxGeometry args={[RAMP.w, RAMP.h, 0.1]} />
        </mesh>
      </group>
      {/* Staubwölkchen beim Auftauchen */}
      {fill < 1 &&
        Array.from({length: 8}, (_, i) => {
          const ph = clamp(fill);
          const a = (i / 8) * Math.PI * 2;
          const rr = 1.2 + ph * 1.2;
          return (
            <mesh key={i} material={m.dust} position={[Math.cos(a) * rr, 0.2 + ph * 0.3, RAMP.len / 2 + Math.sin(a) * rr * 0.8]} scale={0.3 * Math.sin(Math.PI * ph) + 0.01 * time}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
          );
        })}
    </group>
  );
};

// =====================================================================================================
// Abwasch-Berg
// =====================================================================================================
type DishItem = {kind: 'plate' | 'pot' | 'pan' | 'mug' | 'bowl' | 'fork' | 'noodle' | 'pea' | 'glass'; p: [number, number, number]; r: [number, number, number]; c: number; s: number; dir: [number, number, number]};
const PLATE_COLS = ['#f7f5ef', '#f2ead8', '#dfeefa', '#fbe3e3', '#e6f4dc'];
const STAIN = ['#b5552d', '#d9442a', '#8a5a2b', '#e1a12c'];
export const DishMountain = ({fill = 0, rumble = 0, time = 0}: {fill?: number; rumble?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      plates: PLATE_COLS.map((c) => std(c, {roughness: 0.35})),
      stain: STAIN.map((c) => std(c, {roughness: 0.6})),
      potBlue: std('#3f7fd6', {roughness: 0.4, metalness: 0.2}),
      potRed: std('#e0463a', {roughness: 0.4, metalness: 0.2}),
      pan: std('#2c2f34', {roughness: 0.5, metalness: 0.3}),
      handle: std('#1a1b1e'),
      steel: std('#cfd4d9', {roughness: 0.25, metalness: 0.75}),
      mug: [std('#ffd21a'), std('#5fc6b0'), std('#ff8aa8'), std('#9b72d9')],
      noodle: std('#f6cf4a'),
      pea: std('#6fbf3f'),
      glass: new THREE.MeshStandardMaterial({color: '#cfe8f7', transparent: true, opacity: 0.55, roughness: 0.05}),
    }),
    [],
  );
  const items = useMemo(() => {
    const r = rng(2026);
    const out: DishItem[] = [];
    const dir = (x: number, y: number, z: number): [number, number, number] => {
      const l = Math.hypot(x, y * 0.6 + 0.4, z) || 1;
      return [x / l + (r() - 0.5) * 0.4, (y * 0.6 + 0.4) / l + r() * 0.3, z / l + (r() - 0.5) * 0.4];
    };
    // drei schiefe Tellertürme
    const towers: [number, number, number][] = [
      [-0.22, 0, -0.05],
      [0.18, 0, 0.06],
      [0.0, 0, -0.12],
    ];
    towers.forEach(([tx, , tz], ti) => {
      const n = [11, 9, 13][ti];
      let y = 0.012;
      for (let i = 0; i < n; i++) {
        const lean = (i / n) * 0.09 * (ti === 1 ? -1 : 1);
        const p: [number, number, number] = [tx + lean + (r() - 0.5) * 0.02, y, tz + (r() - 0.5) * 0.02];
        out.push({kind: 'plate', p, r: [(r() - 0.5) * 0.12, r() * 3, (r() - 0.5) * 0.12], c: Math.floor(r() * PLATE_COLS.length), s: 1, dir: dir(p[0], p[1], p[2])});
        y += 0.034;
      }
    });
    // Töpfe + Pfanne obendrauf
    out.push({kind: 'pot', p: [-0.2, 0.42, -0.04], r: [0.25, 0.4, 0.18], c: 0, s: 1, dir: dir(-0.5, 1, 0)});
    out.push({kind: 'pot', p: [0.14, 0.36, 0.05], r: [-0.3, 1.2, -0.2], c: 1, s: 0.85, dir: dir(0.6, 1, 0.2)});
    out.push({kind: 'pan', p: [0.02, 0.6, -0.08], r: [0.5, 0.6, 0.35], c: 0, s: 1, dir: dir(0, 1.2, -0.2)});
    out.push({kind: 'bowl', p: [-0.05, 0.47, 0.12], r: [0.4, 0, -0.3], c: 3, s: 1, dir: dir(0, 1, 1)});
    out.push({kind: 'bowl', p: [0.24, 0.6, -0.02], r: [-0.5, 0, 0.5], c: 2, s: 0.9, dir: dir(1, 1, 0)});
    // Tassen + Gläser
    [
      [-0.32, 0.47, 0.08, 0],
      [0.3, 0.38, -0.12, 1],
      [-0.08, 0.76, -0.02, 2],
      [0.16, 0.73, 0.1, 3],
      [-0.28, 0.66, -0.1, 1],
    ].forEach(([x, y, z, c]) => out.push({kind: 'mug', p: [x, y, z], r: [(r() - 0.5) * 1.6, r() * 3, (r() - 0.5) * 1.2], c, s: 1, dir: dir(x, y, z)}));
    out.push({kind: 'glass', p: [0.05, 0.86, 0.02], r: [0.6, 0, 0.4], c: 0, s: 1, dir: dir(0, 1.5, 0)});
    // Besteck steckt heraus
    for (let i = 0; i < 7; i++) {
      const x = (r() - 0.5) * 0.5;
      const z = (r() - 0.5) * 0.3;
      out.push({kind: 'fork', p: [x, 0.5 + r() * 0.3, z], r: [(r() - 0.5) * 1.2, r() * 3, (r() - 0.5) * 1.2], c: 0, s: 1, dir: dir(x, 1, z)});
    }
    // Nudeln + Erbsen (Essensreste)
    for (let i = 0; i < 9; i++) {
      const x = (r() - 0.5) * 0.5;
      const z = (r() - 0.5) * 0.3;
      out.push({kind: i % 3 === 0 ? 'pea' : 'noodle', p: [x, 0.45 + r() * 0.45, z], r: [r() * 3, r() * 3, r() * 3], c: 0, s: 1, dir: dir(x, 1, z)});
    }
    return out;
  }, []);
  const f = clamp(fill);
  const wob = rumble * Math.sin(time * 30) * 0.02;
  return (
    <group rotation={[wob, 0, wob * 0.7]}>
      {items.map((it, i) => {
        const spread = f * (0.9 + (i % 5) * 0.12);
        const p: [number, number, number] = [it.p[0] + it.dir[0] * spread, it.p[1] + it.dir[1] * spread * 0.8, it.p[2] + it.dir[2] * spread];
        const rr: [number, number, number] = [it.r[0] + f * (i % 3) * 2.2, it.r[1] + f * 1.5, it.r[2] + f * ((i + 1) % 3) * 1.8];
        const jig = rumble > 0 ? Math.sin(time * 40 + i) * 0.006 * rumble : 0;
        return (
          <group key={i} position={[p[0], p[1] + jig, p[2]]} rotation={rr} scale={it.s}>
            {it.kind === 'plate' && (
              <>
                <mesh material={m.plates[it.c]} castShadow>
                  <cylinderGeometry args={[0.135, 0.105, 0.026, 14]} />
                </mesh>
                {i % 2 === 0 && (
                  <mesh material={m.stain[i % STAIN.length]} position={[0.03, 0.0135, -0.02]} rotation={[-Math.PI / 2, 0, i]} scale={[1, 0.7, 1]}>
                    <circleGeometry args={[0.05, 6]} />
                  </mesh>
                )}
              </>
            )}
            {it.kind === 'pot' && (
              <>
                <mesh material={it.c ? m.potRed : m.potBlue} castShadow>
                  <cylinderGeometry args={[0.15, 0.14, 0.2, 12, 1, true]} />
                </mesh>
                <mesh material={it.c ? m.potRed : m.potBlue} position={[0, -0.1, 0]}>
                  <cylinderGeometry args={[0.14, 0.14, 0.01, 12]} />
                </mesh>
                <mesh material={m.stain[0]} position={[0, 0.05, 0]}>
                  <cylinderGeometry args={[0.13, 0.13, 0.01, 12]} />
                </mesh>
                {[-1, 1].map((s) => (
                  <mesh key={s} material={m.handle} position={[s * 0.18, 0.06, 0]}>
                    <boxGeometry args={[0.07, 0.025, 0.05]} />
                  </mesh>
                ))}
              </>
            )}
            {it.kind === 'pan' && (
              <>
                <mesh material={m.pan} castShadow>
                  <cylinderGeometry args={[0.17, 0.14, 0.05, 14]} />
                </mesh>
                <mesh material={m.stain[3]} position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.1, 8]} />
                </mesh>
                <mesh material={m.handle} position={[0.3, 0.01, 0]}>
                  <boxGeometry args={[0.26, 0.025, 0.035]} />
                </mesh>
              </>
            )}
            {it.kind === 'bowl' && (
              <mesh material={m.plates[it.c]} castShadow>
                <sphereGeometry args={[0.1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
              </mesh>
            )}
            {it.kind === 'mug' && (
              <>
                <mesh material={m.mug[it.c % 4]} castShadow>
                  <cylinderGeometry args={[0.045, 0.04, 0.1, 10]} />
                </mesh>
                <mesh material={m.mug[it.c % 4]} position={[0.055, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.025, 0.008, 5, 10]} />
                </mesh>
              </>
            )}
            {it.kind === 'glass' && (
              <mesh material={m.glass}>
                <cylinderGeometry args={[0.04, 0.035, 0.12, 10]} />
              </mesh>
            )}
            {it.kind === 'fork' && (
              <mesh material={m.steel}>
                <boxGeometry args={[0.012, 0.2, 0.006]} />
              </mesh>
            )}
            {it.kind === 'noodle' && (
              <mesh material={m.noodle}>
                <torusGeometry args={[0.03, 0.007, 4, 8, Math.PI * 1.3]} />
              </mesh>
            )}
            {it.kind === 'pea' && (
              <mesh material={m.pea}>
                <icosahedronGeometry args={[0.015, 0]} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

// =====================================================================================================
// Tassen + Servietten, die angezogen werden
// =====================================================================================================
export const SuckItems = ({fill = 0, time = 0}: {fill?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      mug: [std('#e0463a'), std('#3f9be0')],
      napkin: [std('#fff3b0', {side: THREE.DoubleSide}), std('#ffd0e0', {side: THREE.DoubleSide}), std('#d6f0ff', {side: THREE.DoubleSide})],
      coffee: std('#5a3a22'),
    }),
    [],
  );
  const f = clamp(fill);
  return (
    <group>
      {[-0.22, 0.12].map((x, i) => {
        const wob = Math.sin(time * (9 + i * 3) + i) * 0.12 * f;
        const lean = 0.18 * f + Math.max(0, wob);
        const slide = 0.05 * f + 0.015 * Math.sin(time * 5 + i) * f;
        return (
          <group key={i} position={[x, 0, slide]}>
            {/* kippt um die vordere Unterkante nach +z */}
            <group position={[0, 0, 0.05]} rotation={[lean, 0, 0]}>
              <group position={[0, 0, -0.05]}>
                <mesh material={m.mug[i]} position={[0, 0.055, 0]} castShadow>
                  <cylinderGeometry args={[0.05, 0.045, 0.11, 12]} />
                </mesh>
                <mesh material={m.coffee} position={[0, 0.106, 0]}>
                  <cylinderGeometry args={[0.044, 0.044, 0.005, 12]} />
                </mesh>
                <mesh material={m.mug[i]} position={[0.06, 0.055, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.028, 0.009, 5, 10]} />
                </mesh>
              </group>
            </group>
          </group>
        );
      })}
      {[-0.42, -0.02, 0.32].map((x, i) => {
        const ph = time * (7 + i * 1.7) + i * 2;
        const lift = f * (0.1 + 0.06 * Math.sin(ph * 0.7)) * (i === 1 ? 1.6 : 1);
        const fwd = f * (0.08 + 0.04 * Math.sin(ph * 0.5));
        return (
          <group key={`n${i}`} position={[x, 0.004 + lift, 0.05 + fwd]} rotation={[-Math.PI / 2 + f * (0.9 + 0.35 * Math.sin(ph)), 0, f * 0.3 * Math.sin(ph * 1.3) + i * 0.4]}>
            <mesh material={m.napkin[i]} castShadow>
              <planeGeometry args={[0.16, 0.16, 2, 2]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// =====================================================================================================
// Glitzer / Glanz
// =====================================================================================================
export const Sparkles = ({fill = 0, time = 0, w = 4.4, d = 1.2, big = false}: {fill?: number; time?: number; w?: number; d?: number; big?: boolean}) => {
  const m = useMemo(() => ({star: basic('#ffffff'), gold: basic('#fff1a8'), streak: basic('#ffffff', 0.55)}), []);
  const pts = useMemo(() => {
    const r = rng(88);
    return Array.from({length: 34}, () => ({x: (r() - 0.5) * w, y: r() * 1.4, z: (r() - 0.5) * d, ph: r() * 6, s: 0.05 + r() * 0.07, g: r() < 0.4}));
  }, [w, d]);
  const f = clamp(fill);
  if (f < 0.01) return null;
  return (
    <group>
      {pts.map((p, i) => {
        const tw = 0.5 + 0.5 * Math.sin(time * 6 + p.ph);
        const s = p.s * f * (0.4 + 0.9 * tw) * (big ? 2.2 : 1);
        return (
          <group key={i} position={[p.x, p.y, p.z]} rotation={[0, 0, time * 1.2 + p.ph]} scale={s}>
            <mesh material={p.g ? m.gold : m.star}>
              <boxGeometry args={[1, 0.16, 0.16]} />
            </mesh>
            <mesh material={p.g ? m.gold : m.star}>
              <boxGeometry args={[0.16, 1, 0.16]} />
            </mesh>
            <mesh material={p.g ? m.gold : m.star} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[1, 0.16, 0.16]} />
            </mesh>
          </group>
        );
      })}
      {/* Glanzstreifen über die Arbeitsplatte */}
      {[0, 1, 2].map((i) => {
        const u = (((time * 0.45 + i / 3) % 1) + 1) % 1;
        return (
          <mesh key={`g${i}`} material={m.streak} position={[-w / 2 + u * w, 0.35, d / 2 + 0.02]} rotation={[0, 0, 0.6]} scale={[0.08 * f, 0.9 * f * Math.sin(Math.PI * u), 1]}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        );
      })}
    </group>
  );
};

// =====================================================================================================
// Notizblock „FORSCHUNG“
// =====================================================================================================
const drawLabPad = canvasTex(256, 352, (g) => {
  g.fillStyle = '#fffdf2';
  g.fillRect(0, 0, 256, 352);
  g.strokeStyle = '#b9d4f0';
  g.lineWidth = 2;
  for (let y = 92; y < 352; y += 28) {
    g.beginPath();
    g.moveTo(14, y);
    g.lineTo(242, y);
    g.stroke();
  }
  g.fillStyle = '#d8392b';
  g.font = '800 40px "Barlow Condensed", sans-serif';
  g.textAlign = 'center';
  g.fillText('FORSCHUNG', 128, 66);
  g.fillStyle = '#26324a';
  g.font = '700 34px "Barlow Condensed", sans-serif';
  g.textAlign = 'left';
  g.fillText('Loch = ?', 22, 130);
  g.fillText('Tiefe: ∞ ?', 22, 186);
  g.strokeStyle = '#26324a';
  g.lineWidth = 4;
  g.beginPath();
  g.arc(170, 262, 34, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  for (let a = 0; a < 12; a += 0.2) {
    const rr = 30 - a * 2.3;
    g.lineTo(170 + Math.cos(a) * rr, 262 + Math.sin(a) * rr);
  }
  g.stroke();
  g.fillText('→ !!', 40, 272);
});
export const LabNotepad = () => {
  const m = useMemo(() => ({cover: std('#2f6fbf'), ring: std('#c7ccd2', {metalness: 0.6, roughness: 0.3}), pencil: std('#ffd21a'), tip: std('#3a3f46')}), []);
  return (
    <group>
      <mesh material={m.cover} position={[0, 0, -0.006]}>
        <boxGeometry args={[0.17, 0.23, 0.01]} />
      </mesh>
      <group position={[0, -0.005, 0.0]}>
        <TextPlane draw={drawLabPad} k="labpad-forschung" w={0.16} h={0.22} glow={0.3} />
      </group>
      {Array.from({length: 6}, (_, i) => (
        <mesh key={i} material={m.ring} position={[-0.065 + i * 0.026, 0.118, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.011, 0.0025, 4, 8]} />
        </mesh>
      ))}
      <group position={[0.1, -0.02, 0.012]} rotation={[0, 0, 0.35]}>
        <mesh material={m.pencil}>
          <cylinderGeometry args={[0.006, 0.006, 0.17, 6]} />
        </mesh>
        <mesh material={m.tip} position={[0, -0.093, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.006, 0.018, 6]} />
        </mesh>
      </group>
    </group>
  );
};

// =====================================================================================================
// Forscher-Schutzbrille (Ursprung = Kopfmitte wie die Lesebrille)
// =====================================================================================================
export const ResearchGoggles = ({amount = 1}: {amount?: number}) => {
  const m = useMemo(
    () => ({
      rim: std('#2d3a2f', {roughness: 0.5}),
      lens: new THREE.MeshStandardMaterial({color: '#8fe3ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.7, flatShading: true}),
      band: std('#ff7a1a'),
      shine: basic('#ffffff', 0.8),
    }),
    [],
  );
  if (amount < 0.02) return null;
  const k = easeInOut(clamp(amount));
  // sitzt erst hochgeschoben auf der Stirn, rutscht dann auf die Augen
  return (
    <group position={[0, 0.02 + 0.1 * (1 - k), -0.01 * (1 - k)]} rotation={[-0.55 * (1 - k), 0, 0]}>
      <mesh material={m.band} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.55]}>
        <torusGeometry args={[0.128, 0.018, 4, 18]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.052, 0, 0.118]}>
          <mesh material={m.rim} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.046, 0.05, 0.04, 10, 1, true]} />
          </mesh>
          <mesh material={m.lens} position={[0, 0, 0.02]}>
            <circleGeometry args={[0.044, 12]} />
          </mesh>
          <mesh material={m.shine} position={[-0.014, 0.016, 0.022]}>
            <circleGeometry args={[0.009, 6]} />
          </mesh>
        </group>
      ))}
      <mesh material={m.rim} position={[0, 0.0, 0.13]}>
        <boxGeometry args={[0.03, 0.016, 0.02]} />
      </mesh>
    </group>
  );
};
