import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {std} from '../stage/Rooms';
import {T} from '../ui/theme';
import {useFontTexture} from './ToothProps';

/**
 * Objekte für das Spezial-Video "Spüle" (wiederverwendbar, alles comichaft, bunt und stilisiert – nicht eklig):
 *  - SinkMess ("spuele"): Einsatz für die Spüle der Küchen-Bühnen (Ursprung = Mitte der Spüle auf der Arbeitsplatte,
 *      in kueche/wohnkueche/wg-kueche bei (−1.25, y 0.92, −1.98), face 0). Tiefes Edelstahlbecken mit Rand, darin ein
 *      Stapel schmutziger Teller, Schüssel, Topf mit Griff, Becher, Besteck und bunte Essensreste obendrauf:
 *      gelbe Nudeln, rote + grüne Paprikastücke und ein undefinierbarer grüner Klumpen (wabbelt leicht).
 *      Werte: fill 0 … 1 = wie viele Essensreste noch da sind (1 = alle 6 Stücke, 0 = keine),
 *      rumble 0 … 1 = Teller klirren/wackeln, good 0 … 1 = Geschirr wird sauber (weiß glänzend, Schaum verschwindet),
 *      mark 0 … 1 = Spülschaum im Becken.
 *  - DishRack ("abtropfgitter"): Abtropfgestell aus Draht, fill 0 … 1 = so viele saubere Teller stehen darin (bis 5).
 *  - FoodArc ("spuckbogen"): Essensreste fliegen in hohem Bogen vom Mund (Ursprung = Füße der Figur, gleiche Stelle +
 *      Richtung wie die Figur) nach vorn zurück in die Spüle. Bewegung "show" = Flug (1,1 s), size = weiter (Ziel 0,7 m × (1 + size)).
 *  - KitchenClock ("kuechenuhr"): große Wanduhr mit Zeigern + Digitalanzeige darunter. fill = Uhrzeit in Stunden
 *      (z. B. 18 → 21: die Zeiger drehen sich schnell, die Anzeige springt von „18:00“ auf „21:00“). Bewegung "spin" =
 *      rote Bewegungs-Striche + roter Minutenzeiger (Zeitraffer). Front +z.
 *  - FoodBit: einzelnes Stück Essensrest (Nudel / Paprika / Klumpen) – in der Hand des Dummys bei "pinchEat".
 */

export type FoodKind = 'noodle' | 'paprika' | 'paprika2' | 'blob';
const FOOD_COLORS = {noodle: '#f2c34a', paprika: '#e0352b', paprika2: '#3fae3a', blob: '#7cc243'};

const useFoodMats = () =>
  useMemo(
    () => ({
      noodle: std('#f2c34a', {roughness: 0.45}),
      noodleSauce: std('#e2582f', {roughness: 0.4}),
      paprika: std('#e0352b', {roughness: 0.3}),
      paprika2: std('#3fae3a', {roughness: 0.3}),
      blob: new THREE.MeshStandardMaterial({color: '#7cc243', roughness: 0.2, metalness: 0.05, flatShading: true, emissive: '#2c5a10', emissiveIntensity: 0.25}),
      blobDark: std('#4f8f2a', {roughness: 0.3}),
      blobShine: new THREE.MeshBasicMaterial({color: '#e9ffc8'}),
    }),
    [],
  );

/** Einzelne Nudel: gebogene Röhre */
const Noodle = ({mat, seed = 1, len = 0.16}: {mat: THREE.Material; seed?: number; len?: number}) => {
  const geo = useMemo(() => {
    const r = rng(seed * 31 + 7);
    const pts: THREE.Vector3[] = [];
    let a = r() * Math.PI * 2;
    let p = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < 6; i++) {
      pts.push(p.clone());
      a += (r() - 0.5) * 1.6;
      p = p.add(new THREE.Vector3(Math.cos(a) * len / 5, (r() - 0.4) * 0.012, Math.sin(a) * len / 5));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0085, 5, false);
  }, [seed, len]);
  return <mesh geometry={geo} material={mat} castShadow />;
};

/** Paprikastück: kleiner gebogener Ring-Abschnitt */
const PaprikaPiece = ({mat, s = 1}: {mat: THREE.Material; s?: number}) => (
  <mesh material={mat} rotation={[Math.PI / 2, 0, 0]} scale={[s, s, s * 0.8]} castShadow>
    <torusGeometry args={[0.032, 0.011, 4, 8, Math.PI * 0.9]} />
  </mesh>
);

/** undefinierbarer grüner Klumpen (wabbelt), mit Glanzpunkt */
const Blob = ({m, time = 0, s = 1}: {m: ReturnType<typeof useFoodMats>; time?: number; s?: number}) => {
  const w = Math.sin(time * 5.3) * 0.06;
  return (
    <group scale={[s * (1 + w), s * (1 - w), s * (1 + w * 0.5)]}>
      <mesh material={m.blob} scale={[1.2, 0.7, 1]} castShadow>
        <icosahedronGeometry args={[0.05, 1]} />
      </mesh>
      <mesh material={m.blob} position={[0.04, 0.012, 0.015]} scale={[0.8, 0.6, 0.8]} castShadow>
        <icosahedronGeometry args={[0.035, 1]} />
      </mesh>
      <mesh material={m.blobDark} position={[-0.035, -0.005, -0.02]} scale={[0.9, 0.55, 0.8]}>
        <icosahedronGeometry args={[0.03, 0]} />
      </mesh>
      <mesh material={m.blobShine} position={[-0.012, 0.032, 0.03]}>
        <sphereGeometry args={[0.009, 6, 4]} />
      </mesh>
    </group>
  );
};

/** einzelnes Stück Essensrest (für die Hand oder den Flug) */
export const FoodBit = ({kind = 'noodle', time = 0, s = 1}: {kind?: FoodKind; time?: number; s?: number}) => {
  const m = useFoodMats();
  if (kind === 'noodle')
    return (
      <group scale={s} rotation={[0, 0, Math.PI / 2]} position={[0, -0.06 * s, 0]}>
        {/* hängende Nudel (Ursprung oben zwischen den Fingern) */}
        <Noodle mat={m.noodle} seed={4} len={0.13} />
      </group>
    );
  if (kind === 'paprika' || kind === 'paprika2')
    return (
      <group scale={s * 1.2}>
        <PaprikaPiece mat={kind === 'paprika' ? m.paprika : m.paprika2} />
      </group>
    );
  return (
    <group scale={s * 0.75}>
      <Blob m={m} time={time} />
    </group>
  );
};

// ---------------- Spüle mit Geschirr ----------------
const PLATE_COLORS = ['#f4f1ea', '#cfe3f2', '#f4f1ea', '#f6d9c2', '#e4f0d6'];
const Plate = ({color, dirty, tilt = 0, r = 0.11}: {color: THREE.Material; dirty: THREE.Material | null; tilt?: number; r?: number}) => (
  <group rotation={[tilt, 0, 0]}>
    <mesh material={color} castShadow receiveShadow>
      <cylinderGeometry args={[r, r * 0.72, 0.016, 16]} />
    </mesh>
    <mesh material={color} position={[0, 0.009, 0]}>
      <torusGeometry args={[r * 0.95, 0.007, 4, 18]} />
    </mesh>
    {dirty && (
      <mesh material={dirty} position={[0.02, 0.0095, -0.01]} rotation={[-Math.PI / 2, 0, 0.6]}>
        <circleGeometry args={[r * 0.45, 7]} />
      </mesh>
    )}
  </group>
);

export const SinkMess = ({fill = 1, rumble = 0, good = 0, foam = 0, time = 0}: {fill?: number; rumble?: number; good?: number; foam?: number; time?: number}) => {
  const f = useFoodMats();
  const m = useMemo(
    () => ({
      steel: std('#c9cfd5', {roughness: 0.22, metalness: 0.8}),
      steelDark: std('#7d868f', {roughness: 0.3, metalness: 0.6}),
      water: new THREE.MeshStandardMaterial({color: '#9fb4a2', roughness: 0.1, transparent: true, opacity: 0.85, flatShading: true}),
      plates: PLATE_COLORS.map((c) => std(c, {roughness: 0.3})),
      sauce: new THREE.MeshStandardMaterial({color: '#d9622f', roughness: 0.5, flatShading: true}),
      pot: std('#3f6fb3', {roughness: 0.35, metalness: 0.2}),
      potIn: std('#cfd4d9', {roughness: 0.3, metalness: 0.6}),
      handle: std('#2b2f35', {roughness: 0.6}),
      mug: std('#f0a23c', {roughness: 0.4}),
      bowl: std('#e86a8f', {roughness: 0.4}),
      fork: std('#d9dde2', {roughness: 0.2, metalness: 0.85}),
      foam: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.9, transparent: true, opacity: 0.95, flatShading: true}),
      sparkle: new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, depthWrite: false}),
    }),
    [],
  );
  const g = clamp(good);
  const dirty = g < 0.5 ? m.sauce : null;
  // Teller klirren: jedes Teil wackelt ein bisschen anders
  const jig = (i: number) => (rumble > 0.01 ? Math.sin(time * 47 + i * 1.9) * 0.02 * rumble : 0);
  const hop = (i: number) => (rumble > 0.01 ? Math.abs(Math.sin(time * 31 + i * 2.3)) * 0.018 * rumble : 0);
  const showFood = (k: number) => clamp(fill * 6 - k) > 0.5; // Stück k verschwindet, wenn fill unter (k+0.5)/6 fällt
  const W = 0.5;
  const Dp = 0.4;
  return (
    <group>
      {/* Beckenrand (sitzt auf der Arbeitsplatte) + dunkles Innenleben */}
      {[
        [0, Dp / 2, W + 0.04, 0.03],
        [0, -Dp / 2, W + 0.04, 0.03],
      ].map(([x, z, w, d], i) => (
        <mesh key={`r${i}`} material={m.steel} position={[x, 0.012, z]}>
          <boxGeometry args={[w, 0.024, d]} />
        </mesh>
      ))}
      {[W / 2, -W / 2].map((x, i) => (
        <mesh key={`s${i}`} material={m.steel} position={[x, 0.012, 0]}>
          <boxGeometry args={[0.03, 0.024, Dp + 0.03]} />
        </mesh>
      ))}
      <mesh material={m.steelDark} position={[0, 0.003, 0]}>
        <boxGeometry args={[W - 0.02, 0.004, Dp - 0.02]} />
      </mesh>
      {/* trübes Spülwasser (verschwindet beim Saubermachen etwas) */}
      <mesh material={m.water} position={[0, 0.006, 0]} scale={[1, 1, 1]}>
        <boxGeometry args={[W - 0.03, 0.004, Dp - 0.03]} />
      </mesh>
      {/* Tellerstapel (schräg im Becken, ragt über den Rand) */}
      <group position={[-0.08 + jig(1), 0.02 + hop(1), 0.02]} rotation={[0.18, 0.3, 0.1]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} position={[0.006 * i + jig(i + 3), 0.019 * i + hop(i + 5), -0.004 * i]} rotation={[0, i * 0.5, 0.04 * (i % 2 ? 1 : -1)]}>
            <Plate color={m.plates[i]} dirty={dirty} />
          </group>
        ))}
      </group>
      {/* zwei Teller hochkant hinten an den Rand gelehnt */}
      {[0, 1].map((i) => (
        <group key={`u${i}`} position={[-0.12 + 0.12 * i + jig(10 + i), 0.11 + hop(12 + i), -0.14]} rotation={[-1.25 + jig(14 + i) * 3, 0.1 * i, 0]}>
          <Plate color={m.plates[3 + i]} dirty={dirty} />
        </group>
      ))}
      {/* Topf mit Griff rechts */}
      <group position={[0.15 + jig(20), 0.05 + hop(20), 0.04]} rotation={[0.15, -0.5, -0.12]}>
        <mesh material={m.pot} castShadow>
          <cylinderGeometry args={[0.085, 0.08, 0.09, 14, 1, true]} />
        </mesh>
        <mesh material={m.potIn} position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.008, 14]} />
        </mesh>
        <mesh material={m.handle} position={[0.14, 0.03, 0]} rotation={[0, 0, Math.PI / 2 - 0.15]}>
          <cylinderGeometry args={[0.013, 0.015, 0.13, 6]} />
        </mesh>
        {dirty && (
          <mesh material={m.sauce} position={[0, -0.03, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.01, 10]} />
          </mesh>
        )}
      </group>
      {/* Becher + Schüssel + Gabel */}
      <group position={[-0.19 + jig(30), 0.05 + hop(30), -0.08]} rotation={[0.5, 0, 0.3]}>
        <mesh material={m.mug} castShadow>
          <cylinderGeometry args={[0.038, 0.034, 0.09, 10, 1, true]} />
        </mesh>
        <mesh material={m.mug} position={[0.045, 0, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.025, 0.007, 4, 10]} />
        </mesh>
      </group>
      <group position={[0.06 + jig(40), 0.035 + hop(40), 0.13]} rotation={[0.25, 0, -0.2]}>
        <mesh material={m.bowl} castShadow>
          <sphereGeometry args={[0.075, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </mesh>
      </group>
      <group position={[0.18 + jig(50), 0.1 + hop(50), -0.1]} rotation={[0.9, 0.4, 0.5]}>
        <mesh material={m.fork}>
          <boxGeometry args={[0.012, 0.17, 0.004]} />
        </mesh>
        {[-0.008, 0, 0.008].map((x) => (
          <mesh key={x} material={m.fork} position={[x, 0.1, 0]}>
            <boxGeometry args={[0.003, 0.04, 0.003]} />
          </mesh>
        ))}
      </group>
      {/* Essensreste obendrauf: Nudeln, Paprika, grüner Klumpen (verschwinden in dieser Reihenfolge: Nudel, Paprika rot, Klumpen, Nudel, Nudel, Paprika grün) */}
      <group position={[jig(60), hop(60), 0]}>
        {showFood(5) && (
          <group position={[-0.05, 0.11, 0.05]}>
            <Noodle mat={f.noodle} seed={1} />
          </group>
        )}
        {showFood(2) && (
          <group position={[0.0, 0.1, 0.0]} rotation={[0, 1.3, 0]}>
            <Noodle mat={f.noodle} seed={2} />
          </group>
        )}
        {showFood(1) && (
          <group position={[-0.1, 0.1, -0.02]} rotation={[0, 2.4, 0]}>
            <Noodle mat={f.noodle} seed={3} len={0.13} />
          </group>
        )}
        {showFood(4) && (
          <group position={[0.06, 0.115, 0.07]} rotation={[0.3, 0.6, 0]}>
            <PaprikaPiece mat={f.paprika} />
          </group>
        )}
        {showFood(0) && (
          <group position={[-0.14, 0.105, 0.08]} rotation={[0.2, -0.7, 0.3]}>
            <PaprikaPiece mat={f.paprika2} s={0.9} />
          </group>
        )}
        {showFood(3) && (
          <group position={[0.02, 0.12, -0.05]}>
            <Blob m={f} time={time} s={1.15} />
          </group>
        )}
      </group>
      {/* Spülschaum */}
      {foam > 0.01 &&
        Array.from({length: 9}).map((_, i) => {
          const r = rng(i * 7 + 3);
          const s = (0.035 + r() * 0.03) * clamp(foam);
          return (
            <mesh key={`f${i}`} material={m.foam} position={[(r() - 0.5) * 0.4, 0.05 + r() * 0.05, (r() - 0.5) * 0.3]} scale={[s, s * 0.8, s]}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
          );
        })}
      {/* sauber: kleine Glitzer-Sterne */}
      {g > 0.6 &&
        [0, 1, 2].map((i) => {
          const ph = (time * 1.3 + i * 0.37) % 1;
          m.sparkle.opacity = Math.sin(ph * Math.PI);
          return (
            <mesh key={`g${i}`} material={m.sparkle} position={[-0.12 + i * 0.12, 0.2 + i * 0.03, 0.05]} rotation={[0, 0, ph * 2]} scale={0.6 + 0.5 * Math.sin(ph * Math.PI)}>
              <octahedronGeometry args={[0.025, 0]} />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------------- Abtropfgestell ----------------
export const DishRack = ({fill = 0}: {fill?: number}) => {
  const m = useMemo(() => ({wire: std('#d9dde2', {roughness: 0.25, metalness: 0.8}), plate: std('#f8f6f0', {roughness: 0.25}), rim: std('#bcd7ee', {roughness: 0.3})}), []);
  const n = Math.round(clamp(fill) * 5);
  return (
    <group>
      <mesh material={m.wire} position={[0, 0.01, 0]}>
        <boxGeometry args={[0.36, 0.012, 0.26]} />
      </mesh>
      {[-0.16, -0.08, 0, 0.08, 0.16].map((x) => (
        <mesh key={x} material={m.wire} position={[x, 0.07, -0.08]}>
          <boxGeometry args={[0.008, 0.12, 0.008]} />
        </mesh>
      ))}
      {Array.from({length: n}).map((_, i) => (
        <group key={i} position={[-0.14 + i * 0.07, 0.115, 0.0]} rotation={[0, Math.PI / 2, 0]}>
          <group rotation={[-Math.PI / 2 + 0.15, 0, 0]}>
            <mesh material={m.plate} castShadow>
              <cylinderGeometry args={[0.1, 0.075, 0.014, 16]} />
            </mesh>
            <mesh material={m.rim} position={[0, 0.008, 0]}>
              <torusGeometry args={[0.095, 0.006, 4, 18]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};

// ---------------- Essensreste fliegen im Bogen ----------------
const ARC_KINDS: FoodKind[] = ['noodle', 'paprika', 'blob', 'noodle', 'paprika2', 'noodle', 'blob'];
export const FoodArc = ({time, active, size = 0}: {time: number; active: boolean; size?: number}) => {
  const m = useFoodMats();
  if (!active) return null;
  const DUR = 1.1;
  const D = 0.7 * (1 + size);
  const start = new THREE.Vector3(0, 1.62, 0.2);
  const end = new THREE.Vector3(0, 0.98, D);
  const apex = 0.75; // so viel höher als der Start
  return (
    <group>
      {ARC_KINDS.map((k, i) => {
        const r = rng(i * 13 + 5);
        const u = clamp((time - i * 0.05) / DUR);
        if (u <= 0 || u >= 1) return null;
        const x = (r() - 0.5) * 0.12 * u;
        const z = start.z + (end.z - start.z) * u + (r() - 0.5) * 0.06 * u;
        const y = start.y + (end.y - start.y) * u + 4 * apex * u * (1 - u);
        const spin = time * (6 + r() * 6);
        return (
          <group key={i} position={[x, y, z]} rotation={[spin, spin * 0.7, 0]} scale={1.9}>
            {k === 'noodle' ? <Noodle mat={m.noodle} seed={i + 2} len={0.12} /> : k === 'blob' ? <Blob m={m} time={time} s={0.7} /> : <PaprikaPiece mat={k === 'paprika' ? m.paprika : m.paprika2} />}
          </group>
        );
      })}
      {/* kleine Tröpfchen-Spur */}
      {Array.from({length: 8}).map((_, i) => {
        const u = clamp((time - 0.03 * i) / DUR) * 0.92;
        if (u <= 0.02 || u >= 0.9) return null;
        const y = start.y + (end.y - start.y) * u + 4 * apex * u * (1 - u);
        return (
          <mesh key={`d${i}`} material={m.blob} position={[0, y, start.z + (end.z - start.z) * u]} scale={1.0 + 0.1 * i}>
            <sphereGeometry args={[0.012, 5, 4]} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------------- Küchenuhr ----------------
const clockTexture = (text: string) => () => {
  const c = document.createElement('canvas');
  c.width = 420;
  c.height = 170;
  const g = c.getContext('2d')!;
  g.fillStyle = '#16191d';
  g.fillRect(0, 0, 420, 170);
  g.fillStyle = '#ffd21a';
  g.shadowColor = '#ffb000';
  g.shadowBlur = 16;
  g.font = `800 150px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 210, 92);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
export const KitchenClock = ({hours = 18, moving = false, time = 0}: {hours?: number; moving?: boolean; time?: number}) => {
  const shown = `${Math.round(hours) % 24}:00`;
  const tex = useFontTexture(clockTexture(shown), `Kuechenuhr ${shown}`);
  const m = useMemo(
    () => ({rim: std('#2f3438', {roughness: 0.4}), face: std('#fbfaf5', {roughness: 0.6}), hand: std('#1d1f22'), red: std('#d23a2c'), box: std('#2b2f35', {roughness: 0.5})}),
    [],
  );
  // Zeiger: Stunden aus dem (weich übergehenden) Wert; beim Springen drehen sie sich sichtbar schnell weiter
  const h = hours;
  const minuteA = (h % 1) * Math.PI * 2;
  const hourA = ((h % 12) / 12) * Math.PI * 2;
  return (
    <group>
      <mesh material={m.rim} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.025]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.05, 28]} />
      </mesh>
      <mesh material={m.face} position={[0, 0, 0.051]}>
        <circleGeometry args={[0.215, 28]} />
      </mesh>
      {Array.from({length: 12}, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} material={m.hand} position={[Math.sin(a) * 0.185, Math.cos(a) * 0.185, 0.053]} rotation={[0, 0, -a]}>
            <boxGeometry args={[0.012, i % 3 ? 0.025 : 0.045, 0.002]} />
          </mesh>
        );
      })}
      <group position={[0, 0, 0.056]} rotation={[0, 0, -hourA]}>
        <mesh material={m.hand} position={[0, 0.055, 0]}>
          <boxGeometry args={[0.02, 0.12, 0.004]} />
        </mesh>
      </group>
      <group position={[0, 0, 0.06]} rotation={[0, 0, -minuteA]}>
        <mesh material={moving ? m.red : m.hand} position={[0, 0.08, 0]}>
          <boxGeometry args={[0.012, 0.17, 0.004]} />
        </mesh>
      </group>
      <mesh material={m.hand} position={[0, 0, 0.063]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.006, 10]} />
      </mesh>
      {/* Digitalanzeige unter der Uhr */}
      <mesh material={m.box} position={[0, -0.36, 0.025]} castShadow>
        <boxGeometry args={[0.42, 0.18, 0.05]} />
      </mesh>
      {tex && (
        <mesh position={[0, -0.36, 0.0515]}>
          <planeGeometry args={[0.39, 0.158]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      )}
      {/* kleine Bewegungs-Striche, wenn die Zeit springt */}
      {moving &&
        [0, 1, 2].map((i) => (
          <mesh key={`w${i}`} material={m.red} position={[0.29 + 0.02 * i, 0.06 - 0.06 * i, 0.03]} rotation={[0, 0, 0.6 - 0.3 * i]}>
            <boxGeometry args={[0.07 + 0.01 * Math.sin(time * 20 + i), 0.012, 0.004]} />
          </mesh>
        ))}
    </group>
  );
};

export const FOOD_COLOR = FOOD_COLORS;
export const foodEase = easeInOut;
