import React, {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {Sofa, Chair, Plant} from '../stage/Rooms';

/**
 * Spezial „Müll-Flüssigkeit“ – Objekte, alle comichaft, Low-Poly, harmlos, OHNE Logos/Markenaufdruck:
 *  - TrashBag ("muellsack"): voller dunkelgrauer Müllsack mit gelbem Zugband, Ursprung = Boden-Mitte, Knoten oben bei MUELLSACK.h (0,62 m).
 *    Werte: "fill" 0 … 1 = kleine Ecke oben rechts reißt auf, grüner Schleim quillt heraus + läuft am Sack herunter,
 *    "mark" 0 … 1 = grün-gelbe Cartoon-Tropfen fallen vom Sackboden, "squish" 0 … 1 = platt an eine Wand geklatscht (flach in z),
 *    "tilt"/"turn" = Drehung im Flug (Grad), "size". In der Hand: hand 1 + drop MUELL_DROP (0,6) → Knoten an der rechten Hand.
 *  - FacadeSplat ("fassadenklecks"): großer grüner Cartoon-Klecks an einer Wand (liegt in der x-y-Ebene, zeigt nach +z, Ursprung = Mitte).
 *    "fill" 0 … 0,15 = klatscht auf (mit Überschwingen + Spritzern), 0,15 … 1 = Saftnasen laufen bis zum Boden herunter
 *    ("drop" = Höhe der Mitte über dem Boden, Standard 3,2 m). Gelbe Glanzlichter, keine echten Flüssigkeiten.
 *  - ShotCup ("shotbecher"): kleiner Kunststoffbecher (Ø 7 cm, 9,5 cm hoch) mit grüner „Protein- und Vitamin“-Flüssigkeit, Bläschen,
 *    gelbes Blitz-Symbol (keine Marke). "fill" = Füllstand. Ursprung = Becherboden. Auch in der linken Dummy-Hand (pose.itemL 'shot').
 *  - GarbageTruck ("muellwagen"): Cartoon-Müllwagen in Kommunal-Orange, ohne Logo/Schrift, 6,2 m lang, 2,4 m breit, 3,1 m hoch, Front +z.
 *    Greifarm rechts (−x): "fill" 0 … 1 = Arm-Zyklus (0–0,3 ausfahren zum Boden bei MUELLWAGEN.grab, 0,3–0,38 greifen, 0,38–0,78 hoch über
 *    das Dach, 0,78–0,9 Sack fällt in die Luke, 0,9–1 zurück). Sack im Greifer von 0,34 bis 0,86 (das freie Objekt dann ausblenden).
 *    "blink" = Rundumleuchten, "rumble" = Rütteln, Räder drehen mit der Strecke ("dist").
 *  - HouseDoorWall ("haustuerwand"): durchbrechbare Wand mit Haustür, 7,7 × 3,8 m (Innenseite +z: Tapete, Holztür, Garderobe; Außenseite
 *    −z: gelber Putz wie das Haus des Dummys). "fill" 0 heil … 1 durchbrochen (Öffnung x ±1,7, 3,3 m hoch; Teile fliegen nach +z).
 *  - NeighborHouse ("nachbarhaus"): modernes Nachbarhaus mit heller Fassade (fast weiß), 8 × 7 m, 6,2 m hoch, Flachdach, große Fenster,
 *    Holzleiste, Haustür vorn (+z). Ursprung = Boden-Mitte, Fassade bei z +3,5.
 *  - LivingFurniture ("wohnmoebel"): Möbel des großen Wohnzimmers (Sofa, Sessel, Couchtisch mit Tasse, Stehlampe, Pflanze, Fernseher
 *    auf Lowboard, Bild) in Welt-Lage (Objekt bei (0, 0), face 180). "fill" 0 … 1 = alles verrutscht/verdreht (Müllwagen fährt durch),
 *    "rumble" = wackelt.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.7, flatShading: true, ...extra});

export const SLIME = {green: '#86d93a', yellow: '#d9e83a', dark: '#5fae24'};

// =====================================================================================================
// Müllsack
// =====================================================================================================
export const MUELLSACK = {h: 0.62, r: 0.27};
export const TrashBag = ({tear = 0, drip = 0, squish = 0, time = 0}: {tear?: number; drip?: number; squish?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      bag: std('#30353d', {roughness: 0.35, metalness: 0.1}),
      bag2: std('#3b414a', {roughness: 0.35, metalness: 0.1}),
      shine: new THREE.MeshStandardMaterial({color: '#aeb7c4', roughness: 0.2, transparent: true, opacity: 0.35}),
      tie: std('#ffd21a', {roughness: 0.5}),
      hole: std('#12141a'),
      slime: std(SLIME.green, {roughness: 0.15, flatShading: true}),
      slime2: std(SLIME.yellow, {roughness: 0.15}),
    }),
    [],
  );
  const bumps = useMemo(() => {
    const r = rng(812);
    return Array.from({length: 7}, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + r() * 0.4;
      return {p: [Math.cos(a) * 0.17, 0.18 + r() * 0.2, Math.sin(a) * 0.15] as [number, number, number], s: 0.11 + r() * 0.05};
    });
  }, []);
  const sq = clamp(squish);
  const tr = clamp(tear);
  const H = MUELLSACK.h;
  return (
    <group scale={[1 + 0.35 * sq, 1 - 0.15 * sq, 1 - 0.6 * sq]}>
      <mesh material={m.bag} position={[0, 0.25, 0]} scale={[1.0, 0.95, 0.9]} castShadow receiveShadow>
        <icosahedronGeometry args={[MUELLSACK.r, 1]} />
      </mesh>
      {bumps.map((b, i) => (
        <mesh key={i} material={i % 2 ? m.bag : m.bag2} position={b.p} castShadow>
          <icosahedronGeometry args={[b.s, 0]} />
        </mesh>
      ))}
      {/* Hals + Knoten + gelbes Zugband */}
      <mesh material={m.bag2} position={[0, 0.47, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.16, 0.16, 7]} />
      </mesh>
      <mesh material={m.tie} position={[0, 0.555, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.05, 0.016, 5, 10]} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} material={m.bag2} position={[k * 0.05, H - 0.02, 0]} rotation={[0, 0, k * 0.7]} scale={[1, 1.4, 0.6]}>
          <icosahedronGeometry args={[0.04, 0]} />
        </mesh>
      ))}
      {/* Glanzlicht */}
      <mesh material={m.shine} position={[-0.1, 0.33, 0.2]} rotation={[0, -0.4, 0.3]} scale={[0.6, 1.6, 0.3]}>
        <icosahedronGeometry args={[0.06, 0]} />
      </mesh>
      {/* Riss oben rechts + Schleim läuft am Sack herunter */}
      {tr > 0.01 && (
        <group position={[-0.17, 0.4, 0.13]} rotation={[0.2, -0.75, 0]}>
          <mesh material={m.hole} scale={[1.2 * tr, 0.5 * tr, 0.3]}>
            <icosahedronGeometry args={[0.05, 0]} />
          </mesh>
          <mesh material={m.slime} position={[0, -0.01, 0.02]} scale={[tr, tr, tr]}>
            <icosahedronGeometry args={[0.05, 1]} />
          </mesh>
          <mesh material={m.slime} position={[0.005, -0.1 * tr, 0.03]} scale={[0.6, 2.4 * tr, 0.4]}>
            <icosahedronGeometry args={[0.04, 1]} />
          </mesh>
          <mesh material={m.slime2} position={[0.02, -0.005, 0.045]} scale={0.5 * tr}>
            <icosahedronGeometry args={[0.03, 0]} />
          </mesh>
        </group>
      )}
      {/* Tropfen vom Sackboden */}
      {drip > 0.01 &&
        sq < 0.5 &&
        [0, 1, 2, 3].map((i) => {
          const ph = (time / 0.5 + i / 4) % 1;
          const y = 0.03 - ph * ph * 0.55;
          return (
            <mesh key={`d${i}`} material={i % 3 === 2 ? m.slime2 : m.slime} position={[(i - 1.5) * 0.06, y, 0.04 * Math.sin(i * 2)]} scale={[0.75, 1.3, 0.75].map((v) => v * clamp(drip) * (1 - 0.3 * ph)) as [number, number, number]}>
              <sphereGeometry args={[0.025, 6, 5]} />
            </mesh>
          );
        })}
      {drip > 0.01 && sq < 0.5 && (
        <mesh material={m.slime} position={[0, 0.02, 0]} scale={[1, 0.5, 1].map((v) => v * clamp(drip)) as [number, number, number]}>
          <icosahedronGeometry args={[0.045, 1]} />
        </mesh>
      )}
    </group>
  );
};

// =====================================================================================================
// Fassaden-Klecks
// =====================================================================================================
export const FacadeSplat = ({fill = 0, time = 0, height = 3.2, size = 0}: {fill?: number; time?: number; height?: number; size?: number}) => {
  const m = useMemo(
    () => ({
      g: new THREE.MeshStandardMaterial({color: SLIME.green, roughness: 0.18, metalness: 0.05, flatShading: true}),
      g2: new THREE.MeshStandardMaterial({color: SLIME.dark, roughness: 0.2, flatShading: true}),
      y: new THREE.MeshStandardMaterial({color: SLIME.yellow, roughness: 0.2, flatShading: true}),
      hi: new THREE.MeshBasicMaterial({color: '#f4ffd8'}),
    }),
    [],
  );
  const L = useMemo(() => {
    const r = rng(733);
    const lobes = Array.from({length: 11}, (_, i) => {
      const a = (i / 11) * Math.PI * 2 + r() * 0.3;
      const d = 0.55 + r() * 0.35;
      return {x: Math.cos(a) * d, y: Math.sin(a) * d * 0.85, s: 0.28 + r() * 0.22};
    });
    const dots = Array.from({length: 16}, () => {
      const a = r() * Math.PI * 2;
      const d = 1.2 + r() * 0.9;
      return {x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, s: 0.05 + r() * 0.08};
    });
    const drips = Array.from({length: 9}, (_, i) => ({x: -0.95 + i * 0.24 + (r() - 0.5) * 0.1, w: 0.1 + r() * 0.09, speed: 0.75 + r() * 0.35, delay: r() * 0.12, yel: r() < 0.25}));
    return {lobes, dots, drips};
  }, []);
  const f = clamp(fill);
  if (f < 0.002) return null;
  const pop = clamp(f / 0.12);
  const sc = (pop >= 1 ? 1 : 1 + 2.2 * Math.pow(pop - 1, 3) + 1.2 * Math.pow(pop - 1, 2)) * (1 + size);
  const run = clamp((f - 0.12) / 0.88);
  const maxLen = height - 0.15;
  return (
    <group>
      <group scale={[sc, sc, 1]}>
        <mesh material={m.g} scale={[1.05, 0.9, 0.12]}>
          <icosahedronGeometry args={[0.75, 1]} />
        </mesh>
        {L.lobes.map((b, i) => (
          <mesh key={i} material={i % 4 === 0 ? m.g2 : m.g} position={[b.x, b.y, 0.01]} scale={[1, 1, 0.22]}>
            <icosahedronGeometry args={[b.s, 1]} />
          </mesh>
        ))}
        {L.dots.map((b, i) => (
          <mesh key={`p${i}`} material={i % 5 === 0 ? m.y : m.g} position={[b.x, b.y, 0.01]} scale={[1, 1, 0.3]}>
            <icosahedronGeometry args={[b.s, 0]} />
          </mesh>
        ))}
        <mesh material={m.y} position={[-0.25, 0.22, 0.09]} scale={[1.4, 0.8, 0.3]}>
          <icosahedronGeometry args={[0.14, 0]} />
        </mesh>
        <mesh material={m.hi} position={[-0.32, 0.3, 0.13]} scale={[1.2, 0.6, 0.2]}>
          <icosahedronGeometry args={[0.06, 0]} />
        </mesh>
      </group>
      {/* Saftnasen laufen herunter */}
      {L.drips.map((d, i) => {
        const u = clamp((run - d.delay) / (1 - d.delay));
        const len = Math.min(maxLen, maxLen * u * d.speed * 1.15) * Math.min(1, sc);
        if (len < 0.02) return null;
        const wob = Math.sin(time * 3 + i) * 0.01;
        return (
          <group key={`r${i}`} position={[d.x * sc + wob, -0.35, 0.02]}>
            <mesh material={d.yel ? m.y : m.g} position={[0, -len / 2, 0]} scale={[1, 1, 0.35]}>
              <boxGeometry args={[d.w, len, d.w]} />
            </mesh>
            <mesh material={d.yel ? m.y : m.g} position={[0, -len, 0]} scale={[1, 1.25, 0.5]}>
              <icosahedronGeometry args={[d.w * 0.75, 1]} />
            </mesh>
          </group>
        );
      })}
      {/* Pfütze am Boden, wenn die Nasen unten ankommen */}
      {run > 0.75 && (
        <mesh material={m.g} position={[0, -height + 0.02, 0.25]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.2 * clamp((run - 0.75) / 0.25), 0.5 * clamp((run - 0.75) / 0.25), 1]}>
          <circleGeometry args={[1, 14]} />
        </mesh>
      )}
    </group>
  );
};

// =====================================================================================================
// Shot-Becher
// =====================================================================================================
export const ShotCup = ({fill = 1, time = 0}: {fill?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      cup: new THREE.MeshStandardMaterial({color: '#e8f4ff', roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false}),
      rim: std('#ffffff', {roughness: 0.2}),
      juice: std(SLIME.green, {roughness: 0.15, emissive: '#3b6e10', emissiveIntensity: 0.35}),
      top: std('#a6ee55', {roughness: 0.1, emissive: '#4c8a18', emissiveIntensity: 0.4}),
      bubble: new THREE.MeshBasicMaterial({color: '#e9ffc9'}),
      bolt: new THREE.MeshBasicMaterial({color: '#ffd21a', side: THREE.DoubleSide}),
    }),
    [],
  );
  const bolt = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0.004, 0.022);
    s.lineTo(-0.012, -0.002);
    s.lineTo(-0.001, -0.002);
    s.lineTo(-0.006, -0.022);
    s.lineTo(0.012, 0.004);
    s.lineTo(0.0, 0.004);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);
  const H = 0.095;
  const f = clamp(fill);
  const lh = Math.max(0.002, H * 0.92 * f);
  return (
    <group scale={1.25}>
      <mesh material={m.cup}>
        <cylinderGeometry args={[0.036, 0.028, H, 14, 1, true]} />
      </mesh>
      <mesh material={m.cup} position={[0, -H / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.028, 14]} />
      </mesh>
      <mesh material={m.rim} position={[0, H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.036, 0.003, 4, 16]} />
      </mesh>
      {f > 0.02 && (
        <>
          <mesh material={m.juice} position={[0, -H / 2 + lh / 2, 0]}>
            <cylinderGeometry args={[0.028 + 0.0085 * (lh / H) - 0.002, 0.026, lh, 14]} />
          </mesh>
          <mesh material={m.top} position={[0, -H / 2 + lh + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.027 + 0.0085 * (lh / H) - 0.002, 14]} />
          </mesh>
          {[0, 1, 2].map((i) => {
            const ph = (time * 0.8 + i / 3) % 1;
            return (
              <mesh key={i} material={m.bubble} position={[(i - 1) * 0.011, -H / 2 + 0.006 + ph * (lh - 0.008), 0.018]} scale={f}>
                <sphereGeometry args={[0.0035, 5, 4]} />
              </mesh>
            );
          })}
        </>
      )}
      <mesh geometry={bolt} material={m.bolt} position={[0, -0.005, 0.0335]} />
    </group>
  );
};

// =====================================================================================================
// Müllwagen
// =====================================================================================================
export const MUELLWAGEN = {len: 6.2, w: 2.4, h: 3.1, base: [-1.12, 1.55, 0.3] as [number, number, number], grab: [-2.55, 0.0, 0.3] as [number, number, number]};
/** Greifer-Position (lokal) im Arm-Zyklus f (0 … 1) */
export const truckClaw = (f: number): [number, number, number] => {
  const rest: [number, number, number] = [-1.42, 1.75, 0.3];
  const low: [number, number, number] = [MUELLWAGEN.grab[0], 0.62, MUELLWAGEN.grab[2]];
  const top: [number, number, number] = [-0.45, 3.85, 0.3];
  const dropP: [number, number, number] = [-0.25, 3.4, 0.3];
  const L = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  if (f < 0.3) return L(rest, low, easeInOut(f / 0.3));
  if (f < 0.38) return low;
  if (f < 0.78) {
    // Bogen nach oben über das Dach
    const k = easeInOut((f - 0.38) / 0.4);
    const p = L(low, top, k);
    p[0] -= Math.sin(Math.PI * k) * 0.6;
    return p;
  }
  if (f < 0.9) return L(top, dropP, easeInOut((f - 0.78) / 0.12));
  return L(dropP, rest, easeInOut((f - 0.9) / 0.1));
};
export const GarbageTruck = ({arm = 0, dist = 0, time = 0, blink = 0, rumble = 0}: {arm?: number; dist?: number; time?: number; blink?: number; rumble?: number}) => {
  const m = useMemo(
    () => ({
      orange: std('#f07a1e', {roughness: 0.45}),
      orange2: std('#d9651a', {roughness: 0.5}),
      white: std('#f4f4f0', {roughness: 0.5}),
      dark: std('#2a2d33', {roughness: 0.6}),
      tire: std('#1d1f22', {roughness: 0.9}),
      hub: std('#c9ced4', {roughness: 0.3, metalness: 0.6}),
      glass: std('#253a52', {roughness: 0.1, metalness: 0.3}),
      steel: std('#9aa3ab', {roughness: 0.35, metalness: 0.6}),
      reflect: std('#ffe9a8', {emissive: '#ffd36a', emissiveIntensity: 0.6}),
      red: std('#d0261c', {emissive: '#a01810', emissiveIntensity: 0.4}),
      beacon: new THREE.MeshStandardMaterial({color: '#ffb020', emissive: '#ff9a00', emissiveIntensity: 1.2, transparent: true, opacity: 0.9}),
      stripe: std('#ffffff', {roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.15}),
    }),
    [],
  );
  const {len, w, h} = MUELLWAGEN;
  const z0 = -len / 2;
  const cabZ = 1.55;
  const r = 0.5;
  const spin = dist / r;
  const sh = rumble * (Math.sin(time * 31) * 0.012 + Math.sin(time * 19) * 0.008);
  const claw = truckClaw(clamp(arm));
  const B = MUELLWAGEN.base;
  const dir = new THREE.Vector3(claw[0] - B[0], claw[1] - B[1], claw[2] - B[2]);
  const boomLen = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const carrying = arm > 0.34 && arm < 0.86;
  const grip = arm < 0.3 ? 0 : arm < 0.38 ? (arm - 0.3) / 0.08 : arm < 0.84 ? 1 : arm < 0.9 ? 1 - (arm - 0.84) / 0.06 : 0;
  const bl = blink > 0.01 ? 0.55 + 0.45 * Math.sin(time * 9) : 0;
  return (
    <group position={[0, sh, 0]}>
      {/* Fahrgestell */}
      <mesh material={m.dark} position={[0, 0.62, -0.2]}>
        <boxGeometry args={[w - 0.4, 0.3, len - 0.6]} />
      </mesh>
      {/* Aufbau (Müllbehälter) mit runder Oberkante */}
      <group position={[0, 0, (z0 + cabZ - 0.1) / 2]}>
        <mesh material={m.orange} position={[0, 1.95, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 2.3, cabZ - 0.1 - z0]} />
        </mesh>
        <mesh material={m.orange} position={[0, 3.1, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]} castShadow>
          <cylinderGeometry args={[w / 2, w / 2, cabZ - 0.1 - z0, 14, 1, false, -Math.PI / 2, Math.PI]} />
        </mesh>
        {/* weiße Streifen */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.stripe} position={[(s * w) / 2 + s * 0.005, 1.35, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <planeGeometry args={[cabZ - 0.1 - z0 - 0.3, 0.22]} />
          </mesh>
        ))}
        {/* Rippen */}
        {[-1.6, -0.6, 0.4].map((dz) => (
          <mesh key={dz} material={m.orange2} position={[0, 1.95, dz]}>
            <boxGeometry args={[w + 0.06, 2.2, 0.1]} />
          </mesh>
        ))}
        {/* Einwurfluke oben rechts */}
        <mesh material={m.dark} position={[-0.35, 3.62, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 0.9]} />
        </mesh>
      </group>
      {/* Heck-Schüttung */}
      <group position={[0, 0, z0]}>
        <mesh material={m.orange2} position={[0, 1.65, -0.25]} castShadow>
          <boxGeometry args={[w - 0.05, 2.5, 0.5]} />
        </mesh>
        <mesh material={m.dark} position={[0, 1.25, -0.51]}>
          <boxGeometry args={[w - 0.5, 0.9, 0.02]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.red} position={[s * (w / 2 - 0.2), 0.9, -0.52]}>
            <boxGeometry args={[0.18, 0.28, 0.03]} />
          </mesh>
        ))}
        {[-0.6, 0, 0.6].map((x) => (
          <mesh key={x} material={m.white} position={[x, 2.2, -0.52]} rotation={[0, 0, 0.785]}>
            <boxGeometry args={[0.16, 0.16, 0.02]} />
          </mesh>
        ))}
      </group>
      {/* Fahrerhaus */}
      <group position={[0, 0, cabZ]}>
        <mesh material={m.white} position={[0, 1.55, 0.78]} castShadow>
          <boxGeometry args={[w, 2.0, 1.55]} />
        </mesh>
        <mesh material={m.orange} position={[0, 0.85, 0.79]} castShadow>
          <boxGeometry args={[w + 0.02, 0.6, 1.56]} />
        </mesh>
        <mesh material={m.glass} position={[0, 1.95, 1.56]}>
          <boxGeometry args={[w - 0.25, 0.9, 0.02]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.glass} position={[s * (w / 2 + 0.005), 1.95, 0.95]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <planeGeometry args={[0.9, 0.75]} />
          </mesh>
        ))}
        <mesh material={m.dark} position={[0, 0.75, 1.58]}>
          <boxGeometry args={[w - 0.5, 0.3, 0.04]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={`l${s}`} material={m.reflect} position={[s * (w / 2 - 0.28), 0.95, 1.58]}>
            <boxGeometry args={[0.32, 0.18, 0.03]} />
          </mesh>
        ))}
        <mesh material={m.dark} position={[0, 0.42, 1.62]}>
          <boxGeometry args={[w, 0.22, 0.12]} />
        </mesh>
        {/* Rundumleuchten */}
        {[-1, 1].map((s) => (
          <mesh key={`b${s}`} material={m.beacon} position={[s * 0.8, 2.66, 0.5]} scale={1 + 0.25 * bl}>
            <cylinderGeometry args={[0.1, 0.12, 0.16, 10]} />
          </mesh>
        ))}
        {bl > 0 && <pointLight position={[0, 2.9, 0.5]} intensity={6 * bl} color="#ffa020" distance={6} decay={1.6} />}
      </group>
      {/* Räder */}
      {[cabZ + 0.65, -1.2, -2.25].map((z) =>
        [-1, 1].map((s) => (
          <group key={`${z}${s}`} position={[s * (w / 2 - 0.15), r, z]} rotation={[spin, 0, 0]}>
            <mesh material={m.tire} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[r, r, 0.36, 12]} />
            </mesh>
            <mesh material={m.hub} position={[s * 0.185, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.22, 0.22, 0.02, 8]} />
            </mesh>
          </group>
        )),
      )}
      {/* Greifarm rechts */}
      <mesh material={m.steel} position={B}>
        <boxGeometry args={[0.3, 0.4, 0.5]} />
      </mesh>
      <group position={B} quaternion={q}>
        <mesh material={m.dark} position={[0, boomLen * 0.3, 0]}>
          <boxGeometry args={[0.18, boomLen * 0.6, 0.18]} />
        </mesh>
        <mesh material={m.steel} position={[0, boomLen * 0.72, 0]}>
          <boxGeometry args={[0.12, boomLen * 0.56, 0.12]} />
        </mesh>
      </group>
      <group position={claw}>
        <mesh material={m.orange2}>
          <boxGeometry args={[0.22, 0.16, 0.42]} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[0, -0.06, s * 0.2]} rotation={[s * (0.55 - 0.45 * grip), 0, 0]}>
            <mesh material={m.steel} position={[0, -0.2, 0]}>
              <boxGeometry args={[0.16, 0.42, 0.05]} />
            </mesh>
          </group>
        ))}
        {carrying && (
          <group position={[0, -0.62, 0]} rotation={[0.1 * Math.sin(time * 5), 0, 0.08 * Math.sin(time * 4)]}>
            <TrashBag drip={0.6} tear={1} time={time} />
          </group>
        )}
      </group>
    </group>
  );
};

// =====================================================================================================
// durchbrechbare Wand mit Haustür (Innenansicht Wohnzimmer)
// =====================================================================================================
export const DWALL = {w: 7.7, h: 3.8, d: 0.25, hole: 1.7, top: 3.3};
const G = 9.81;
type Chunk = {c: [number, number]; w: number; h: number; v: [number, number, number]; spin: [number, number, number]; delay: number; door: boolean};
export const HouseDoorWall = ({fill = 0}: {fill?: number}) => {
  const m = useMemo(
    () => ({
      paper: std('#f1e3c6', {roughness: 0.95}),
      paper2: std('#e6d3b0', {roughness: 0.95}),
      outside: std('#f4d35e', {roughness: 1}),
      core: std('#c9b79a', {roughness: 1}),
      door: std('#9a6a3e', {roughness: 0.6}),
      doorDark: std('#7d532e', {roughness: 0.6}),
      frame: std('#f7f5ef'),
      knob: std('#d9c27a', {metalness: 0.6, roughness: 0.3}),
      hook: std('#3a3d42'),
      coat: std('#3f6a8f'),
      scarf: std('#d8392b'),
      board: std('#c99a63'),
      dust: new THREE.MeshStandardMaterial({color: '#e8dccb', transparent: true, opacity: 0.6, roughness: 1, depthWrite: false}),
    }),
    [],
  );
  const chunks = useMemo(() => {
    const r = rng(907);
    const out: Chunk[] = [];
    const cols = 6;
    const rows = 6;
    const cw = (DWALL.hole * 2) / cols;
    const rh = DWALL.top / rows;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const x = -DWALL.hole + cw * (i + 0.5);
        const y = rh * (j + 0.5);
        const isDoor = Math.abs(x) < 0.55 && y < 2.15;
        out.push({
          c: [x, y],
          w: cw * (0.92 + r() * 0.06),
          h: rh * (0.9 + r() * 0.08),
          v: [(x / DWALL.hole) * (0.8 + r() * 0.8), 0.8 + r() * 1.4, 1.6 + r() * 1.2 + (1 - y / DWALL.top) * 0.4],
          spin: [(r() - 0.5) * 9, (r() - 0.5) * 4, (r() - 0.5) * 8],
          delay: (1 - y / DWALL.top) * 0.05 + Math.abs(x) * 0.02 + r() * 0.05,
          door: isDoor,
        });
      }
    return out;
  }, []);
  const t = clamp(fill) * 2.2;
  const rim = (DWALL.w / 2 - DWALL.hole) / 2;
  const doorFront = (
    <group position={[0, 0, DWALL.d / 2 + 0.01]}>
      <mesh material={m.frame} position={[0, 1.08, -0.005]}>
        <boxGeometry args={[1.2, 2.24, 0.04]} />
      </mesh>
      <mesh material={m.door} position={[0, 1.05, 0.02]}>
        <boxGeometry args={[1.0, 2.1, 0.05]} />
      </mesh>
      {[0.55, 1.5].map((y) => (
        <mesh key={y} material={m.doorDark} position={[0, y, 0.05]}>
          <boxGeometry args={[0.7, 0.62, 0.02]} />
        </mesh>
      ))}
      <mesh material={m.knob} position={[0.38, 1.02, 0.07]}>
        <sphereGeometry args={[0.045, 8, 6]} />
      </mesh>
    </group>
  );
  const deco = (
    <group position={[0, 0, DWALL.d / 2 + 0.02]}>
      {/* Garderobe links der Tür */}
      <group position={[-2.35, 1.75, 0]}>
        <mesh material={m.board}>
          <boxGeometry args={[1.0, 0.1, 0.04]} />
        </mesh>
        {[-0.35, 0, 0.35].map((x) => (
          <mesh key={x} material={m.hook} position={[x, -0.06, 0.05]}>
            <sphereGeometry args={[0.03, 6, 4]} />
          </mesh>
        ))}
        <mesh material={m.coat} position={[-0.3, -0.45, 0.1]} scale={[1, 1, 0.45]}>
          <boxGeometry args={[0.42, 0.8, 0.3]} />
        </mesh>
        <mesh material={m.scarf} position={[0.3, -0.3, 0.06]}>
          <boxGeometry args={[0.12, 0.55, 0.03]} />
        </mesh>
      </group>
      {/* Bild rechts */}
      <group position={[2.5, 1.9, 0]}>
        <mesh material={m.board}>
          <boxGeometry args={[0.9, 0.7, 0.04]} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.76, 0.56]} />
          <meshStandardMaterial color="#8fc6e8" />
        </mesh>
        <mesh position={[0.1, -0.12, 0.03]}>
          <circleGeometry args={[0.18, 3]} />
          <meshStandardMaterial color="#5aa04a" />
        </mesh>
      </group>
    </group>
  );
  return (
    <group>
      {fill <= 0.0001 ? (
        <>
          <mesh material={m.paper} position={[0, DWALL.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[DWALL.w, DWALL.h, DWALL.d]} />
          </mesh>
          <mesh material={m.outside} position={[0, DWALL.h / 2, -DWALL.d / 2 - 0.005]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[DWALL.w, DWALL.h]} />
          </mesh>
          {doorFront}
          {deco}
        </>
      ) : (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} material={m.paper} position={[s * (DWALL.hole + rim), DWALL.h / 2, 0]} castShadow>
              <boxGeometry args={[rim * 2, DWALL.h, DWALL.d]} />
            </mesh>
          ))}
          <mesh material={m.paper} position={[0, (DWALL.top + DWALL.h) / 2, 0]} castShadow>
            <boxGeometry args={[DWALL.hole * 2, DWALL.h - DWALL.top, DWALL.d]} />
          </mesh>
          {deco}
          {chunks.map((k, i) => {
            const tt = Math.max(0, t - k.delay);
            const half = DWALL.d * 0.8;
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
                <mesh material={k.door ? m.door : m.paper} castShadow>
                  <boxGeometry args={[k.w * 0.9, k.h * 0.9, DWALL.d * 1.2]} />
                </mesh>
                <mesh material={k.door ? m.doorDark : m.core} position={[0, 0, -0.005]}>
                  <boxGeometry args={[k.w * 0.92, k.h * 0.92, DWALL.d * 1.1]} />
                </mesh>
              </group>
            );
          })}
          {Array.from({length: 14}, (_, i) => {
            const ph = clamp((t - (i % 4) * 0.05) / 2.0);
            if (ph <= 0 || ph >= 1) return null;
            const ang = (i / 14) * Math.PI * 2;
            const rr = 0.5 + ph * 2.0;
            const op = Math.sin(Math.PI * ph);
            return (
              <mesh key={`d${i}`} material={m.dust} position={[Math.cos(ang) * rr * 1.1, 0.4 + (i % 4) * 0.6 + ph * 0.6, 0.6 + Math.abs(Math.sin(ang)) * rr]} scale={(0.4 + ph * 0.7) * op}>
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
// Nachbarhaus mit heller Fassade
// =====================================================================================================
export const NHOUSE = {w: 8, d: 7, h: 6.2};
export const NeighborHouse = () => {
  const m = useMemo(
    () => ({
      wall: std('#f8f5ee', {roughness: 0.95}),
      plinth: std('#bdb8ae'),
      roof: std('#5f646c'),
      frame: std('#3a3f46', {roughness: 0.5}),
      glass: std('#8fb3cc', {roughness: 0.15, metalness: 0.25}),
      wood: std('#b9824f', {roughness: 0.8}),
      door: std('#3f6a6a', {roughness: 0.5}),
      step: std('#c9c4ba'),
      knob: std('#d9dde2', {metalness: 0.7, roughness: 0.3}),
      lamp: std('#fff3c4', {emissive: '#ffe08a', emissiveIntensity: 0.3}),
    }),
    [],
  );
  const {w, d, h} = NHOUSE;
  const fz = d / 2 + 0.01;
  const win = (x: number, y: number, ww: number, hh: number, key: string) => (
    <group key={key} position={[x, y, fz]}>
      <mesh material={m.frame}>
        <boxGeometry args={[ww + 0.12, hh + 0.12, 0.08]} />
      </mesh>
      <mesh material={m.glass} position={[0, 0, 0.045]}>
        <boxGeometry args={[ww, hh, 0.02]} />
      </mesh>
      <mesh material={m.frame} position={[0, 0, 0.06]}>
        <boxGeometry args={[0.05, hh, 0.02]} />
      </mesh>
    </group>
  );
  return (
    <group>
      <mesh material={m.wall} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      <mesh material={m.plinth} position={[0, 0.2, 0]}>
        <boxGeometry args={[w + 0.04, 0.4, d + 0.04]} />
      </mesh>
      <mesh material={m.roof} position={[0, h + 0.12, 0.2]} castShadow>
        <boxGeometry args={[w + 0.5, 0.24, d + 0.9]} />
      </mesh>
      {/* Holzleiste rechts oben */}
      <mesh material={m.wood} position={[2.85, 4.4, fz + 0.01]}>
        <boxGeometry args={[2.2, 2.6, 0.04]} />
      </mesh>
      {win(-2.4, 1.65, 1.9, 1.5, 'w1')}
      {win(2.6, 1.65, 1.5, 1.5, 'w2')}
      {win(-2.4, 4.45, 1.9, 1.3, 'w3')}
      {win(0.0, 4.45, 1.2, 1.3, 'w4')}
      {win(2.85, 4.45, 1.3, 1.3, 'w5')}
      {/* Haustür + Vordach + Stufe + Lampe */}
      <group position={[0.25, 0, fz]}>
        <mesh material={m.frame} position={[0, 1.15, 0.01]}>
          <boxGeometry args={[1.25, 2.4, 0.06]} />
        </mesh>
        <mesh material={m.door} position={[0, 1.12, 0.05]}>
          <boxGeometry args={[1.05, 2.2, 0.04]} />
        </mesh>
        <mesh material={m.knob} position={[0.38, 1.08, 0.09]}>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
        </mesh>
        <mesh material={m.roof} position={[0, 2.62, 0.5]} castShadow>
          <boxGeometry args={[1.9, 0.1, 1.0]} />
        </mesh>
        <mesh material={m.step} position={[0, 0.08, 0.45]} castShadow receiveShadow>
          <boxGeometry args={[1.7, 0.16, 0.8]} />
        </mesh>
        <mesh material={m.lamp} position={[-0.85, 2.0, 0.08]}>
          <boxGeometry args={[0.14, 0.24, 0.12]} />
        </mesh>
      </group>
      {/* Seiten-/Rückfenster */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 + 0.01), 0, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
          <mesh material={m.glass} position={[0, 1.65, 0.02]}>
            <boxGeometry args={[1.4, 1.3, 0.03]} />
          </mesh>
          <mesh material={m.glass} position={[0, 4.45, 0.02]}>
            <boxGeometry args={[1.4, 1.2, 0.03]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// =====================================================================================================
// Möbel im großen Wohnzimmer (verrutschen, wenn der Müllwagen durchfährt)
// =====================================================================================================
type Piece = {p: [number, number]; ry: number; dp: [number, number]; dry: number; tilt?: number};
export const LIVING_BIG = {
  sofa: {p: [-4.55, 0.4], ry: Math.PI / 2, dp: [0.35, 0.55], dry: -0.22} as Piece,
  table: {p: [-2.75, 0.45], ry: 0, dp: [-0.55, 0.75], dry: 0.45} as Piece,
  chair: {p: [-0.25, -2.75], ry: 0.5, dp: [-1.1, 0.95], dry: 0.9} as Piece,
  lamp: {p: [3.75, -3.55], ry: 0, dp: [0.55, 0.85], dry: 0.3, tilt: 0.38} as Piece,
  plant: {p: [-1.05, -3.85], ry: 0, dp: [-0.4, 0.45], dry: 0.2, tilt: 0.42} as Piece,
  tv: {p: [4.85, 0.2], ry: -Math.PI / 2, dp: [0.0, 0.3], dry: 0.18} as Piece,
};
export const LivingFurniture = ({fill = 0, rumble = 0, time = 0}: {fill?: number; rumble?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      rug: std('#c95f4a', {roughness: 1}),
      rug2: std('#e8b04b', {roughness: 1}),
      wood: std('#a8743f'),
      woodD: std('#7d532e'),
      mug: std('#4fa3e0'),
      book: std('#3f8f4a'),
      lampPole: std('#2f3134', {metalness: 0.4, roughness: 0.5}),
      shade: std('#f2e2b8', {emissive: '#ffe2a0', emissiveIntensity: 0.5}),
      tv: std('#16181c', {roughness: 0.3}),
      screen: std('#2b4a66', {roughness: 0.15, emissive: '#1d3a55', emissiveIntensity: 0.4}),
      board: std('#e9e4da'),
    }),
    [],
  );
  const f = easeInOut(clamp(fill));
  const wob = (i: number) => rumble * Math.sin(time * 23 + i * 1.7) * 0.025;
  const place = (pc: Piece, i: number, child: React.ReactNode) => (
    <group key={i} position={[pc.p[0] + pc.dp[0] * f + wob(i), 0, pc.p[1] + pc.dp[1] * f]} rotation={[0, pc.ry + pc.dry * f + wob(i + 3) * 2, 0]}>
      <group rotation={[0, 0, (pc.tilt ?? 0) * f]}>{child}</group>
    </group>
  );
  const L = LIVING_BIG;
  return (
    <group>
      {/* Teppich (rutscht ein Stück, wirft eine Falte) */}
      <group position={[-2.5 - 0.3 * f, 0.006, 0.5 + 0.25 * f]} rotation={[0, 0.12 * f, 0]}>
        <mesh material={m.rug} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3.8, 2.9]} />
        </mesh>
        <mesh material={m.rug2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <ringGeometry args={[0.9, 1.05, 24]} />
        </mesh>
        {f > 0.05 && (
          <mesh material={m.rug} position={[1.75, 0.08 * f, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]}>
            <cylinderGeometry args={[0.1 * f, 0.1 * f, 2.6, 8, 1, false, 0, Math.PI]} />
          </mesh>
        )}
      </group>
      {place(L.sofa, 0, <Sofa color="#4f7a8c" />)}
      {place(
        L.table,
        1,
        <group>
          <mesh material={m.wood} position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.06, 0.7]} />
          </mesh>
          {[
            [-0.52, -0.28],
            [0.52, -0.28],
            [-0.52, 0.28],
            [0.52, 0.28],
          ].map(([x, z], k) => (
            <mesh key={k} material={m.woodD} position={[x, 0.2, z]}>
              <boxGeometry args={[0.06, 0.4, 0.06]} />
            </mesh>
          ))}
          <mesh material={m.mug} position={[0.25, 0.5, 0.05]}>
            <cylinderGeometry args={[0.05, 0.045, 0.1, 10]} />
          </mesh>
          <mesh material={m.book} position={[-0.25, 0.47, -0.05]} rotation={[0, 0.3, 0]}>
            <boxGeometry args={[0.3, 0.04, 0.22]} />
          </mesh>
        </group>,
      )}
      {place(L.chair, 2, <group scale={1.25}><Chair color="#e8b04b" legs="#3a2a1e" /></group>)}
      {place(
        L.lamp,
        3,
        <group>
          <mesh material={m.lampPole} position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.2, 0.22, 0.04, 12]} />
          </mesh>
          <mesh material={m.lampPole} position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.7, 6]} />
          </mesh>
          <mesh material={m.shade} position={[0, 1.75, 0]}>
            <cylinderGeometry args={[0.18, 0.3, 0.35, 12, 1, true]} />
          </mesh>
        </group>,
      )}
      {place(L.plant, 4, <Plant s={1.6} />)}
      {place(
        L.tv,
        5,
        <group>
          <mesh material={m.board} position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[1.8, 0.5, 0.45]} />
          </mesh>
          <mesh material={m.tv} position={[0, 0.95, -0.05]} castShadow>
            <boxGeometry args={[1.4, 0.82, 0.06]} />
          </mesh>
          <mesh material={m.screen} position={[0, 0.95, -0.015]}>
            <planeGeometry args={[1.3, 0.72]} />
          </mesh>
          <mesh material={m.tv} position={[0, 0.52, -0.05]}>
            <boxGeometry args={[0.3, 0.05, 0.2]} />
          </mesh>
        </group>,
      )}
    </group>
  );
};
