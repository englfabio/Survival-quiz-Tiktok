import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {T} from '../ui/theme';
import {Car, type CarPose} from './Car';
import {useFontTexture} from './ToothProps';
import {canvasTex, fitText} from './WgProps';

/**
 * Spezial "Monstertruck" (wiederverwendbar). Alles stilisiert, OHNE echte Logos, Marken oder bekannte Monstertruck-Designs.
 *
 *  - MonsterTruck: Pickup-Aufbau auf riesigen Stollenreifen (Ursprung = Boden-Mitte, vorn +z). `big` = noch größer (Maßstab 1,5).
 *    Sitz des Fahrers (für "attach"): MONSTER.seat (× Maßstab), Lenkrad passt zu den Sitz-Bewegungen des Dummys.
 *  - Unimog: stilisierter Polizei-Unimog (typische Form: kurze schräge Haube, kantiges Fahrerhaus, gleich große hohe Räder,
 *    Pritsche hinten) – silber/blau, Blaulicht, Schriftzug "POLIZEI", KEIN Stern/Logo. Fahrersitz links (+x): UNIMOG.seat.
 *  - FlatCar: das Auto aus dem Auto-im-See-Video, plattgedrückt wie eine Pizza (Räder stehen seitlich heraus).
 *  - PictureFrame: großer goldener Bilderrahmen mit hellem Passepartout, darin (fill 1) das platte Auto von oben.
 *  - PriceTag: Preisschild aus Karton an einer Schnur (Text frei, Standard "2.000.000 €"), ploppt auf.
 *  - MudSpray: Schlamm-Spritzer hinter den Rädern (Menge 0 … 1).
 *  - WineGlass: Weinglas mit Rotwein (in der Hand der Museumsbesucher).
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.55, flatShading: true, ...extra});

// ---------------------------------------------------------------------------------------------
// Reifen mit groben Stollen
// ---------------------------------------------------------------------------------------------
const BigTire = ({r, w, angle, m, squish = 0}: {r: number; w: number; angle: number; m: {tire: THREE.Material; hub: THREE.Material; rim: THREE.Material}; squish?: number}) => {
  const n = 14;
  return (
    <group scale={[1, 1 - 0.35 * squish, 1]}>
      <group rotation={[angle, 0, 0]}>
        <mesh material={m.tire} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[r * 0.93, r * 0.93, w, 16]} />
        </mesh>
        {Array.from({length: n}, (_, i) => {
          const a = (i / n) * Math.PI * 2;
          return (
            <group key={i} rotation={[a, 0, 0]}>
              {[-1, 1].map((s) => (
                <mesh key={s} material={m.tire} position={[s * w * 0.24, r * 0.95, 0]} rotation={[s * 0.35, 0, 0]}>
                  <boxGeometry args={[w * 0.46, r * 0.14, r * 0.22]} />
                </mesh>
              ))}
            </group>
          );
        })}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh material={m.rim} position={[s * (w / 2 + 0.005), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[r * 0.5, r * 0.5, 0.04, 10]} />
            </mesh>
            <mesh material={m.hub} position={[s * (w / 2 + 0.03), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[r * 0.16, r * 0.2, 0.06, 8]} />
            </mesh>
            {[0, 1, 2, 3, 4].map((k) => (
              <mesh key={k} material={m.hub} position={[s * (w / 2 + 0.03), Math.cos((k / 5) * Math.PI * 2) * r * 0.34, Math.sin((k / 5) * Math.PI * 2) * r * 0.34]}>
                <boxGeometry args={[0.04, r * 0.07, r * 0.07]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Schlamm-Spritzer (hinter einem Rad, fliegt nach hinten oben, −z)
// ---------------------------------------------------------------------------------------------
export const MudSpray = ({amount, time, spread = 1, seed = 3}: {amount: number; time: number; spread?: number; seed?: number}) => {
  const mat = useMemo(() => std('#5a3d24', {roughness: 0.35}), []);
  const drops = useMemo(() => {
    const r = rng(seed);
    return Array.from({length: 22}, () => ({ph: r(), vz: -(2.2 + r() * 2.8), vy: 2.2 + r() * 2.6, vx: (r() - 0.5) * 2.2, s: 0.06 + r() * 0.09}));
  }, [seed]);
  if (amount < 0.02) return null;
  const n = Math.round(drops.length * clamp(amount));
  return (
    <group>
      {drops.slice(0, n).map((d, i) => {
        const life = 0.7;
        const t = ((time / life + d.ph) % 1) * life;
        const y = d.vy * t - 4.9 * t * t;
        if (y < -0.05) return null;
        const k = 1 - t / life;
        return (
          <mesh key={i} material={mat} position={[d.vx * t * spread, y, d.vz * t * spread]} scale={d.s * (0.6 + 0.6 * k) * spread}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Schlamm-Kleckse auf einer Fahrzeugseite (Menge 0 … 1) */
const MudSplats = ({amount, w, len, y0, h, seed}: {amount: number; w: number; len: number; y0: number; h: number; seed: number}) => {
  const mat = useMemo(() => std('#5e4128', {roughness: 0.9}), []);
  const spots = useMemo(() => {
    const r = rng(seed);
    return Array.from({length: 18}, () => ({side: r() < 0.5 ? -1 : 1, z: (r() - 0.5) * len, y: y0 + r() * h * (r() < 0.6 ? 0.45 : 1), s: 0.08 + r() * 0.16, th: r() * 6}));
  }, [seed, len, y0, h]);
  if (amount < 0.02) return null;
  const n = Math.round(spots.length * clamp(amount));
  return (
    <group>
      {spots.slice(0, n).map((s, i) => (
        <mesh key={i} material={mat} position={[s.side * (w / 2 + 0.012), s.y, s.z]} rotation={[s.th, s.side * Math.PI / 2, 0]} scale={[s.s * 1.3, s.s, 1]}>
          <circleGeometry args={[1, 6]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Monstertruck
// ---------------------------------------------------------------------------------------------
/** Maße (Maßstab 1). seat = Hüft-Ursprung des sitzenden Dummys (Sitz 0,45 darüber), Lenkrad 0,47 vor / 1,0 über dem Ursprung */
export const MONSTER = {
  tireR: 0.86,
  tireW: 0.78,
  track: 1.16,
  axle: 1.5,
  floor: 1.78,
  seat: [0, 1.78, 0.05] as [number, number, number],
  bigScale: 1.5,
  /** im großen Truck sitzt der Fahrer so viel höher (Sitz = seat × 1,5 + bigSeatLift) */
  bigSeatLift: 0.62,
  len: 4.6,
  height: 3.15,
};

const TRUCK_LOOK = {
  normal: {body: '#d8392b', dark: '#9e2a20', stripe: '#ffd21a', frame: '#3a3d42', shock: '#ffd21a'},
  big: {body: '#f3bf12', dark: '#b88f0a', stripe: '#1b1b1d', frame: '#2b2d31', shock: '#e2442f'},
  /** Farbvarianten (Spezial Schwarzes Loch): blau mit weißen Streifen, grün mit orangen Streifen – keine echten Truck-Designs */
  blue: {body: '#2f7fe0', dark: '#1f5aa6', stripe: '#f4f6f8', frame: '#2b2d31', shock: '#f4f6f8'},
  green: {body: '#3fb35a', dark: '#2a7f3f', stripe: '#ff8a1f', frame: '#2b2d31', shock: '#ff8a1f'},
};

export const MonsterTruck = ({
  big = false,
  dist = 0,
  time = 0,
  squish = 0,
  smoke = 0,
  spray = 0,
  mud = 0,
  rumble = 0,
  variant,
}: {
  /** Farbvariante (blue/green), sonst rot bzw. gelb (big) */
  variant?: 'blue' | 'green';
  big?: boolean;
  /** gefahrener Weg (Räder drehen) */
  dist?: number;
  time?: number;
  /** plattgedrückt 0 … 1 */
  squish?: number;
  /** Abgas aus den Auspuffrohren 0 … 1 */
  smoke?: number;
  /** Schlamm spritzt hinter den Rädern 0 … 1 */
  spray?: number;
  /** Schlamm-Kleckse auf der Karosserie 0 … 1 */
  mud?: number;
  /** Motor rüttelt 0 … 1 */
  rumble?: number;
}) => {
  const L = variant ? TRUCK_LOOK[variant] : big ? TRUCK_LOOK.big : TRUCK_LOOK.normal;
  const m = useMemo(
    () => ({
      body: std(L.body, {roughness: 0.35, metalness: 0.15}),
      dark: std(L.dark),
      stripe: std(L.stripe, {roughness: 0.4}),
      frame: std(L.frame, {roughness: 0.6, metalness: 0.4}),
      shock: std(L.shock, {roughness: 0.3, metalness: 0.4}),
      chrome: std('#d9dde2', {roughness: 0.2, metalness: 0.8}),
      tire: std('#232427', {roughness: 0.95}),
      hub: std('#cfd3d8', {roughness: 0.3, metalness: 0.7}),
      rim: std('#55595f', {roughness: 0.5, metalness: 0.5}),
      seat: std('#2c2f35'),
      glass: new THREE.MeshStandardMaterial({color: '#bfe4f2', transparent: true, opacity: 0.18, roughness: 0.1}),
      light: new THREE.MeshStandardMaterial({color: '#fff6d8', emissive: '#ffe9a8', emissiveIntensity: 0.9}),
      tail: new THREE.MeshStandardMaterial({color: '#ff4a3a', emissive: '#c0140a', emissiveIntensity: 0.6}),
      puff: new THREE.MeshStandardMaterial({color: '#6b6e73', transparent: true, opacity: 0.55, roughness: 1}),
    }),
    [L],
  );
  const s = big ? MONSTER.bigScale : 1;
  const {tireR: R, tireW: W, track, axle, floor} = MONSTER;
  const angle = dist / (R * s);
  const sq = clamp(squish);
  const shake = rumble * (Math.sin(time * 37) * 0.012 + Math.sin(time * 23 + 1) * 0.008);
  const bodyY = floor - 0.18;
  return (
    <group scale={s}>
      {/* Reifen */}
      {[1, -1].map((x) =>
        [axle, -axle].map((z) => (
          <group key={`${x}${z}`} position={[x * track, R * (1 - 0.35 * sq), z]}>
            <BigTire r={R} w={W} angle={angle} m={m} squish={sq} />
          </group>
        )),
      )}
      <group position={[0, shake, 0]} scale={[1 + 0.12 * sq, 1 - 0.55 * sq, 1 + 0.04 * sq]}>
        {/* Achsen + Rahmen + Federbeine */}
        {[axle, -axle].map((z) => (
          <group key={z}>
            <mesh material={m.frame} position={[0, R, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.1, 0.1, track * 2 - W * 0.6, 8]} />
            </mesh>
            <mesh material={m.frame} position={[0, R, z]}>
              <sphereGeometry args={[0.2, 8, 6]} />
            </mesh>
            {[1, -1].map((x) => (
              <group key={x}>
                <mesh material={m.shock} position={[x * 0.55, R + 0.38, z + 0.1]} rotation={[0.25, 0, x * 0.3]}>
                  <cylinderGeometry args={[0.075, 0.075, 0.8, 8]} />
                </mesh>
                <mesh material={m.chrome} position={[x * 0.62, R + 0.12, z + 0.04]} rotation={[0.25, 0, x * 0.3]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
        {[0.42, -0.42].map((x) => (
          <mesh key={x} material={m.frame} position={[x, R + 0.42, 0]}>
            <boxGeometry args={[0.14, 0.16, axle * 2 + 0.9]} />
          </mesh>
        ))}
        {/* Unterboden */}
        <mesh material={m.frame} position={[0, bodyY - 0.02, 0]}>
          <boxGeometry args={[1.5, 0.12, 3.9]} />
        </mesh>
        {/* Karosserie: Ladefläche + Fahrerhaus + Haube */}
        <group position={[0, bodyY, 0]}>
          {/* Seitenwände */}
          {[1, -1].map((x) => (
            <group key={x}>
              <mesh material={m.body} position={[x * 1.02, 0.36, -0.1]} castShadow>
                <boxGeometry args={[0.1, 0.72, 4.3]} />
              </mesh>
              {/* Blitz-Streifen (Fantasie-Design) */}
              <mesh material={m.stripe} position={[x * 1.075, 0.42, 0.6]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.012, 0.12, 1.1]} />
              </mesh>
              <mesh material={m.stripe} position={[x * 1.075, 0.42, -0.35]} rotation={[-0.5, 0, 0]}>
                <boxGeometry args={[0.012, 0.12, 0.9]} />
              </mesh>
              <mesh material={m.stripe} position={[x * 1.075, 0.42, -1.2]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.012, 0.12, 0.9]} />
              </mesh>
              {/* Kotflügel-Kanten über den Reifen */}
              {[axle, -axle].map((z) => (
                <mesh key={z} material={m.dark} position={[x * 1.12, 0.0, z]}>
                  <boxGeometry args={[0.22, 0.1, 1.5]} />
                </mesh>
              ))}
            </group>
          ))}
          {/* Boden der Ladefläche + Heckklappe */}
          <mesh material={m.dark} position={[0, 0.1, -1.25]}>
            <boxGeometry args={[1.95, 0.08, 2.0]} />
          </mesh>
          <mesh material={m.body} position={[0, 0.36, -2.22]} castShadow>
            <boxGeometry args={[2.14, 0.72, 0.1]} />
          </mesh>
          {[0.7, -0.7].map((x) => (
            <mesh key={x} material={m.tail} position={[x, 0.5, -2.28]}>
              <boxGeometry args={[0.32, 0.14, 0.03]} />
            </mesh>
          ))}
          {/* Haube vorn */}
          <mesh material={m.body} position={[0, 0.5, 1.6]} castShadow>
            <boxGeometry args={[2.04, 0.6, 1.3]} />
          </mesh>
          <mesh material={m.dark} position={[0, 0.38, 2.27]}>
            <boxGeometry args={[1.5, 0.42, 0.06]} />
          </mesh>
          {[-0.3, -0.15, 0, 0.15, 0.3].map((x) => (
            <mesh key={x} material={m.chrome} position={[x, 0.38, 2.31]}>
              <boxGeometry args={[0.05, 0.36, 0.02]} />
            </mesh>
          ))}
          {[0.78, -0.78].map((x) => (
            <mesh key={x} material={m.light} position={[x, 0.55, 2.27]}>
              <boxGeometry args={[0.32, 0.16, 0.05]} />
            </mesh>
          ))}
          {/* Lufthutze auf der Haube */}
          <mesh material={m.chrome} position={[0, 0.88, 1.55]}>
            <boxGeometry args={[0.6, 0.16, 0.7]} />
          </mesh>
          {/* Fahrerhaus (offene Seitenfenster, damit man den Fahrer sieht) */}
          <group position={[0, 0.72, 0.2]}>
            <mesh material={m.body} position={[0, 1.08, 0]} castShadow>
              <boxGeometry args={[2.0, 0.1, 1.5]} />
            </mesh>
            {[1, -1].map((x) =>
              [0.7, -0.7].map((z) => (
                <mesh key={`${x}${z}`} material={m.body} position={[x * 0.96, 0.54, z]} rotation={[z > 0 ? -0.18 : 0, 0, 0]}>
                  <boxGeometry args={[0.08, 1.08, 0.1]} />
                </mesh>
              )),
            )}
            <mesh material={m.body} position={[0, 0.54, -0.72]}>
              <boxGeometry args={[2.0, 1.08, 0.08]} />
            </mesh>
            <mesh material={m.glass} position={[0, 0.54, 0.68]} rotation={[-0.18, 0, 0]}>
              <boxGeometry args={[1.84, 1.0, 0.02]} />
            </mesh>
            {/* Dachlampen */}
            {[-0.6, -0.2, 0.2, 0.6].map((x) => (
              <mesh key={x} material={m.light} position={[x, 1.2, 0.55]}>
                <boxGeometry args={[0.2, 0.14, 0.08]} />
              </mesh>
            ))}
          </group>
          {/* Armaturenbrett + Lenkrad + Sitz */}
          <mesh material={m.seat} position={[0, 0.78, 0.82]}>
            <boxGeometry args={[1.8, 0.18, 0.3]} />
          </mesh>
          {/* Auspuffrohre hinter dem Fahrerhaus */}
          {[0.75, -0.75].map((x) => (
            <mesh key={x} material={m.chrome} position={[x, 1.55, -0.62]}>
              <cylinderGeometry args={[0.07, 0.08, 1.4, 8]} />
            </mesh>
          ))}
          {smoke > 0.01 &&
            [0.75, -0.75].map((x, j) =>
              [0, 1, 2, 3].map((i) => {
                const u = (time * 1.4 + i / 4 + j * 0.13) % 1;
                return (
                  <mesh key={`${x}${i}`} material={m.puff} position={[x + Math.sin(u * 5 + i) * 0.1, 2.3 + u * 1.4, -0.65 - u * 0.6]} scale={(0.12 + u * 0.35) * smoke}>
                    <icosahedronGeometry args={[1, 0]} />
                  </mesh>
                );
              }),
            )}
          <MudSplats amount={mud} w={2.1} len={4.2} y0={0.0} h={0.8} seed={big ? 11 : 7} />
        </group>
        <MudSplats amount={mud} w={track * 2 + W - 0.1} len={axle * 2 + 1.2} y0={R * 0.3} h={R * 1.1} seed={big ? 13 : 9} />
      </group>
      {/* Sitz + Lenkrad in Original-Größe (auch im großen Truck passt der Dummy genau): Sitz bei MONSTER.seat × Maßstab */}
      <group scale={1 / s} position={[0, shake, 0]}>
        <group position={[MONSTER.seat[0] * s, MONSTER.seat[1] * s * (1 - 0.55 * sq) + (big ? MONSTER.bigSeatLift : 0), MONSTER.seat[2] * s]}>
          <group position={[0, 1.0, 0.5]} rotation={[-0.5, 0, 0]}>
            <mesh material={m.seat}>
              <torusGeometry args={[0.17, 0.025, 5, 14]} />
            </mesh>
          </group>
          <mesh material={m.seat} position={[0, 0.39, -0.05]}>
            <boxGeometry args={[0.6, 0.12, 0.5]} />
          </mesh>
          <mesh material={m.seat} position={[0, 0.78, -0.35]} rotation={[-0.15, 0, 0]}>
            <boxGeometry args={[0.6, 0.75, 0.12]} />
          </mesh>
          <mesh material={m.seat} position={[0, 0.2, 0]}>
            <boxGeometry args={[0.4, 0.4 + (big ? MONSTER.bigSeatLift * 2 : 0), 0.4]} />
          </mesh>
        </group>
      </group>
      {spray > 0.01 &&
        [1, -1].map((x) => (
          <group key={x} position={[x * track, 0.2, -axle - R * 0.7]}>
            <MudSpray amount={spray} time={time} spread={1.1} seed={big ? 5 + x : 2 + x} />
          </group>
        ))}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Polizei-Unimog
// ---------------------------------------------------------------------------------------------
export const UNIMOG = {
  wheelR: 0.6,
  track: 0.98,
  front: 1.35,
  rear: -1.45,
  floor: 1.32,
  /** Fahrersitz links (+x): Hüft-Ursprung des sitzenden Dummys */
  seat: [0.42, 1.32, 0.62] as [number, number, number],
  len: 5.0,
  height: 2.9,
};

const policeTex = canvasTex(512, 112, (g) => {
  g.clearRect(0, 0, 512, 112);
  g.fillStyle = '#ffffff';
  fitText(g, 'POLIZEI', 256, 60, 490, 96, 800);
});
const policeTexBlue = canvasTex(512, 112, (g) => {
  g.clearRect(0, 0, 512, 112);
  g.fillStyle = '#1d3f8f';
  fitText(g, 'POLIZEI', 256, 60, 490, 96, 800);
});

const UWheel = ({angle, m}: {angle: number; m: {tire: THREE.Material; hub: THREE.Material; rim: THREE.Material}}) => {
  const r = UNIMOG.wheelR;
  return (
    <group rotation={[angle, 0, 0]}>
      <mesh material={m.tire} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r, 0.42, 14]} />
      </mesh>
      {Array.from({length: 12}, (_, i) => (
        <group key={i} rotation={[(i / 12) * Math.PI * 2, 0, 0]}>
          <mesh material={m.tire} position={[0, r + 0.02, 0]} rotation={[0, (i % 2 ? 1 : -1) * 0.5, 0]}>
            <boxGeometry args={[0.36, 0.06, 0.1]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={m.rim} position={[s * 0.215, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r * 0.55, r * 0.55, 0.02, 10]} />
          </mesh>
          <mesh material={m.hub} position={[s * 0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.14, 0.06, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export const Unimog = ({
  dist = 0,
  time = 0,
  blue = 0,
  spray = 0,
  mud = 0,
  rumble = 0,
  seed = 0,
}: {
  dist?: number;
  time?: number;
  /** Blaulicht 1 = an */
  blue?: number;
  spray?: number;
  mud?: number;
  rumble?: number;
  /** Phase des Blaulichts (mehrere Unimogs blinken versetzt) */
  seed?: number;
}) => {
  const m = useMemo(
    () => ({
      silver: std('#e6e9ec', {roughness: 0.4, metalness: 0.2}),
      blue: std('#2457c5', {roughness: 0.4}),
      blueDark: std('#1b3f8f', {roughness: 0.5}),
      frame: std('#2a2d31', {roughness: 0.6, metalness: 0.3}),
      black: std('#1c1d20', {roughness: 0.8}),
      grille: std('#3a3e44', {roughness: 0.5, metalness: 0.4}),
      tire: std('#232427', {roughness: 0.95}),
      hub: std('#cfd3d8', {roughness: 0.3, metalness: 0.7}),
      rim: std('#e6e9ec', {roughness: 0.4}),
      seat: std('#2c2f35'),
      glass: new THREE.MeshStandardMaterial({color: '#bfe4f2', transparent: true, opacity: 0.2, roughness: 0.1}),
      light: new THREE.MeshStandardMaterial({color: '#fff6d8', emissive: '#ffe9a8', emissiveIntensity: 0.9}),
      blueOn: new THREE.MeshStandardMaterial({color: '#4f8dff', emissive: '#2f6bff', emissiveIntensity: 2.4, transparent: true, opacity: 0.95}),
      blueOff: std('#1e3c8a', {roughness: 0.3, transparent: true, opacity: 0.9}),
    }),
    [],
  );
  const tw = useFontTexture(policeTex, 'Unimog-POLIZEI-weiss');
  const tb = useFontTexture(policeTexBlue, 'Unimog-POLIZEI-blau');
  const textW = useMemo(() => (tw ? new THREE.MeshBasicMaterial({map: tw, transparent: true, depthWrite: false}) : null), [tw]);
  const textB = useMemo(() => (tb ? new THREE.MeshBasicMaterial({map: tb, transparent: true, depthWrite: false}) : null), [tb]);
  const {wheelR: R, track, front, rear} = UNIMOG;
  const angle = dist / R;
  const shake = rumble * (Math.sin(time * 33 + seed) * 0.01 + Math.sin(time * 19) * 0.006);
  const on = blue > 0.5;
  const ph = (time * 2.6 + seed * 0.37) % 1;
  const leftOn = on && ph < 0.5 && ph % 0.25 < 0.16;
  const rightOn = on && ph >= 0.5 && ph % 0.25 < 0.16;
  const cabZ0 = 0.0;
  const cabZ1 = 1.55;
  const cabY0 = 1.15;
  const cabY1 = 2.72;
  return (
    <group>
      {[1, -1].map((x) =>
        [front, rear].map((z) => (
          <group key={`${x}${z}`} position={[x * track, R, z]}>
            <UWheel angle={angle} m={m} />
          </group>
        )),
      )}
      <group position={[0, shake, 0]}>
        {/* Portalachsen + Rahmen (hohe Bodenfreiheit) */}
        {[front, rear].map((z) => (
          <group key={z}>
            <mesh material={m.frame} position={[0, R + 0.18, z]}>
              <boxGeometry args={[track * 2 - 0.3, 0.16, 0.22]} />
            </mesh>
            {[1, -1].map((x) => (
              <mesh key={x} material={m.frame} position={[x * (track - 0.18), R + 0.08, z]}>
                <boxGeometry args={[0.18, 0.34, 0.3]} />
              </mesh>
            ))}
          </group>
        ))}
        {[0.42, -0.42].map((x) => (
          <mesh key={x} material={m.frame} position={[x, R + 0.42, -0.1]}>
            <boxGeometry args={[0.12, 0.2, 4.6]} />
          </mesh>
        ))}
        {/* Haube: kurz, schräg abfallend */}
        <group position={[0, 0, cabZ1]}>
          <mesh material={m.silver} position={[0, 1.38, 0.38]} rotation={[0.16, 0, 0]} castShadow>
            <boxGeometry args={[1.45, 0.5, 0.8]} />
          </mesh>
          {/* Kühlergrill mit Querstreben (ohne Stern/Logo) */}
          <mesh material={m.grille} position={[0, 1.27, 0.8]}>
            <boxGeometry args={[1.0, 0.42, 0.04]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} material={m.silver} position={[0, 1.12 + i * 0.1, 0.825]}>
              <boxGeometry args={[0.96, 0.03, 0.02]} />
            </mesh>
          ))}
          {/* Schriftzug vorn auf der Haube */}
          {textB && (
            <mesh material={textB} position={[0, 1.6, 0.62]} rotation={[-1.2, 0, 0]}>
              <planeGeometry args={[0.9, 0.2]} />
            </mesh>
          )}
          {/* runde Kotflügel über den Vorderrädern mit Scheinwerfern */}
          {[1, -1].map((x) => (
            <group key={x} position={[x * track, R, front - cabZ1]}>
              <mesh material={m.blue} position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]}>
                <cylinderGeometry args={[R + 0.16, R + 0.16, 0.5, 12, 1, true, -Math.PI / 2 - 0.2, Math.PI + 0.4]} />
              </mesh>
              <mesh material={m.light} position={[0, 0.42, 0.62]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.11, 0.11, 0.05, 10]} />
              </mesh>
            </group>
          ))}
          {/* Stoßstange */}
          <mesh material={m.black} position={[0, 0.95, 0.88]}>
            <boxGeometry args={[2.1, 0.16, 0.12]} />
          </mesh>
        </group>
        {/* Fahrerhaus: kantig, Seitenfenster offen (Polizisten sichtbar) */}
        <group>
          <mesh material={m.silver} position={[0, cabY0 + 0.25, (cabZ0 + cabZ1) / 2]} castShadow>
            <boxGeometry args={[2.0, 0.5, cabZ1 - cabZ0]} />
          </mesh>
          {/* blauer Streifen unten */}
          {[1, -1].map((x) => (
            <group key={x}>
              <mesh material={m.blue} position={[x * 1.005, cabY0 + 0.18, (cabZ0 + cabZ1) / 2]}>
                <boxGeometry args={[0.01, 0.2, cabZ1 - cabZ0]} />
              </mesh>
              {textB && (
                <mesh material={textB} position={[x * 1.012, cabY0 + 0.4, (cabZ0 + cabZ1) / 2]} rotation={[0, x * Math.PI / 2, 0]}>
                  <planeGeometry args={[1.3, 0.28]} />
                </mesh>
              )}
            </group>
          ))}
          {/* Säulen */}
          {[1, -1].map((x) =>
            [cabZ1 - 0.06, cabZ0 + 0.05].map((z) => (
              <mesh key={`${x}${z}`} material={m.silver} position={[x * 0.97, (cabY0 + 0.5 + cabY1) / 2, z]}>
                <boxGeometry args={[0.08, cabY1 - cabY0 - 0.5, 0.1]} />
              </mesh>
            )),
          )}
          {/* Rückwand + Dach (blau) */}
          <mesh material={m.silver} position={[0, (cabY0 + 0.5 + cabY1) / 2, cabZ0 + 0.03]}>
            <boxGeometry args={[2.0, cabY1 - cabY0 - 0.5, 0.06]} />
          </mesh>
          <mesh material={m.blueDark} position={[0, cabY1 + 0.04, (cabZ0 + cabZ1) / 2]} castShadow>
            <boxGeometry args={[2.06, 0.1, cabZ1 - cabZ0 + 0.06]} />
          </mesh>
          {/* zweiteilige, fast senkrechte Frontscheibe */}
          {[1, -1].map((x) => (
            <mesh key={x} material={m.glass} position={[x * 0.47, (cabY0 + 0.5 + cabY1) / 2, cabZ1 - 0.04]} rotation={[-0.08, 0, 0]}>
              <boxGeometry args={[0.88, cabY1 - cabY0 - 0.56, 0.02]} />
            </mesh>
          ))}
          <mesh material={m.silver} position={[0, (cabY0 + 0.5 + cabY1) / 2, cabZ1 - 0.04]}>
            <boxGeometry args={[0.06, cabY1 - cabY0 - 0.5, 0.05]} />
          </mesh>
          {/* Spiegel an Armen */}
          {[1, -1].map((x) => (
            <group key={x} position={[x * 1.18, 2.15, cabZ1 - 0.1]}>
              <mesh material={m.black} position={[-x * 0.1, 0, 0]}>
                <boxGeometry args={[0.2, 0.03, 0.03]} />
              </mesh>
              <mesh material={m.black}>
                <boxGeometry args={[0.04, 0.32, 0.18]} />
              </mesh>
            </group>
          ))}
          {/* Blaulicht-Balken */}
          <group position={[0, cabY1 + 0.14, cabZ1 - 0.35]}>
            <mesh material={m.black}>
              <boxGeometry args={[1.5, 0.06, 0.26]} />
            </mesh>
            <mesh material={leftOn ? m.blueOn : m.blueOff} position={[0.45, 0.09, 0]}>
              <boxGeometry args={[0.5, 0.14, 0.24]} />
            </mesh>
            <mesh material={rightOn ? m.blueOn : m.blueOff} position={[-0.45, 0.09, 0]}>
              <boxGeometry args={[0.5, 0.14, 0.24]} />
            </mesh>
            {leftOn && <pointLight color="#3f7bff" intensity={4} distance={8} position={[0.45, 0.3, 0]} />}
            {rightOn && <pointLight color="#3f7bff" intensity={4} distance={8} position={[-0.45, 0.3, 0]} />}
          </group>
          {/* Armaturenbrett, Lenkrad (links), Sitze */}
          <mesh material={m.seat} position={[0, cabY0 + 0.6, cabZ1 - 0.25]}>
            <boxGeometry args={[1.8, 0.2, 0.3]} />
          </mesh>
          <group position={[UNIMOG.seat[0], UNIMOG.seat[1] + 1.0, UNIMOG.seat[2] + 0.48]} rotation={[-0.6, 0, 0]}>
            <mesh material={m.seat}>
              <torusGeometry args={[0.17, 0.025, 5, 14]} />
            </mesh>
          </group>
          {[UNIMOG.seat[0], -UNIMOG.seat[0]].map((x) => (
            <group key={x}>
              <mesh material={m.seat} position={[x, UNIMOG.seat[1] + 0.39, UNIMOG.seat[2] - 0.05]}>
                <boxGeometry args={[0.5, 0.12, 0.45]} />
              </mesh>
              <mesh material={m.seat} position={[x, UNIMOG.seat[1] + 0.75, UNIMOG.seat[2] - 0.32]} rotation={[-0.12, 0, 0]}>
                <boxGeometry args={[0.5, 0.65, 0.1]} />
              </mesh>
            </group>
          ))}
        </group>
        {/* Pritsche hinten mit niedrigen Bordwänden */}
        <group position={[0, cabY0 + 0.05, -1.25]}>
          <mesh material={m.frame} position={[0, 0, 0]}>
            <boxGeometry args={[2.0, 0.1, 2.4]} />
          </mesh>
          {[1, -1].map((x) => (
            <group key={x}>
              <mesh material={m.silver} position={[x * 0.97, 0.3, 0]} castShadow>
                <boxGeometry args={[0.06, 0.5, 2.4]} />
              </mesh>
              <mesh material={m.blue} position={[x * 1.005, 0.3, 0]}>
                <boxGeometry args={[0.01, 0.16, 2.3]} />
              </mesh>
              {textW && (
                <mesh material={textW} position={[x * 1.012, 0.3, 0]} rotation={[0, x * Math.PI / 2, 0]}>
                  <planeGeometry args={[1.2, 0.17]} />
                </mesh>
              )}
            </group>
          ))}
          <mesh material={m.silver} position={[0, 0.3, -1.18]}>
            <boxGeometry args={[2.0, 0.5, 0.06]} />
          </mesh>
          {/* hintere Kotflügel */}
          {[1, -1].map((x) => (
            <mesh key={x} material={m.black} position={[x * track, -0.0, rear + 1.25]}>
              <boxGeometry args={[0.5, 0.06, 1.3]} />
            </mesh>
          ))}
        </group>
        <MudSplats amount={mud} w={2.04} len={4.6} y0={0.5} h={1.2} seed={17 + seed} />
      </group>
      {spray > 0.01 &&
        [1, -1].map((x) => (
          <group key={x} position={[x * track, 0.2, rear - R * 0.7]}>
            <MudSpray amount={spray} time={time} spread={0.8} seed={30 + seed * 3 + x} />
          </group>
        ))}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Plattes Auto (wie eine Pizza)
// ---------------------------------------------------------------------------------------------
const PARKED: CarPose = {wheelAngle: 0, dy: 0, roll: 0, pitch: 0, bubbles: 0, time: 0};

/** Das Auto aus dem Auto-im-See-Video, plattgedrückt: flat 0 = normal … 1 = ganz platt (Räder stehen seitlich heraus) */
export const FlatCar = ({flat, pose = PARKED, color}: {flat: number; pose?: CarPose; color?: string}) => {
  const k = clamp(flat);
  const m = useMemo(() => ({tire: std('#1f2023', {roughness: 0.95}), rim: std('#c9cdd2', {metalness: 0.5, roughness: 0.4})}), []);
  return (
    <group>
      <group scale={[1 + 0.2 * k, 1 - 0.93 * k, 1 + 0.06 * k]}>
        <Car pose={pose} color={color} />
      </group>
      {k > 0.5 &&
        [1, -1].map((x) =>
          [1.18, -1.2].map((z) => (
            <group key={`${x}${z}`} position={[x * (0.98 + 0.12 * k), 0.035, z * (1 + 0.06 * k)]} rotation={[0, x * (z > 0 ? 0.35 : -0.25), 0]}>
              <mesh material={m.tire} scale={[0.85, 0.07, 1]}>
                <cylinderGeometry args={[0.34, 0.34, 1, 12]} />
              </mesh>
              <mesh material={m.rim} position={[0, 0.04, 0]} scale={[0.85, 0.02, 1]}>
                <cylinderGeometry args={[0.17, 0.17, 1, 10]} />
              </mesh>
            </group>
          )),
        )}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Bilderrahmen (Museum)
// ---------------------------------------------------------------------------------------------
/** Außenmaße des Rahmens; Ursprung = Mitte, Vorderseite +z, Rückseite liegt auf z 0 (an der Wand) */
export const FRAME = {w: 4.7, h: 2.7, depth: 0.16};

export const PictureFrame = ({fill = 1, carColor}: {fill?: number; carColor?: string}) => {
  const m = useMemo(
    () => ({
      gold: std('#d2a43a', {roughness: 0.3, metalness: 0.65}),
      goldDark: std('#9c7424', {roughness: 0.35, metalness: 0.6}),
      mat: std('#f4efe2', {roughness: 0.95}),
    }),
    [],
  );
  const {w, h, depth: d} = FRAME;
  const b = 0.26;
  return (
    <group>
      <mesh material={m.mat} position={[0, 0, 0.03]} receiveShadow>
        <boxGeometry args={[w - 0.1, h - 0.1, 0.04]} />
      </mesh>
      {/* Rahmenleisten mit Profil */}
      {[
        [0, h / 2 - b / 2, w, b],
        [0, -h / 2 + b / 2, w, b],
        [w / 2 - b / 2, 0, b, h - 2 * b],
        [-w / 2 + b / 2, 0, b, h - 2 * b],
      ].map(([x, y, ww, hh], i) => (
        <group key={i} position={[x, y, d / 2]}>
          <mesh material={m.gold} castShadow>
            <boxGeometry args={[ww, hh, d]} />
          </mesh>
          <mesh material={m.goldDark} position={[0, 0, d / 2 + 0.01]} scale={[ww > hh ? 1 : 0.45, ww > hh ? 0.45 : 1, 1]}>
            <boxGeometry args={[ww - 0.04, hh - 0.04, 0.03]} />
          </mesh>
        </group>
      ))}
      {/* Eck-Ornamente */}
      {[1, -1].map((sx) =>
        [1, -1].map((sy) => (
          <mesh key={`${sx}${sy}`} material={m.gold} position={[sx * (w / 2 - b / 2), sy * (h / 2 - b / 2), d + 0.03]}>
            <sphereGeometry args={[0.12, 8, 6]} />
          </mesh>
        )),
      )}
      {/* das platte Auto, von oben gesehen (Dach zeigt nach vorn) */}
      {fill > 0.5 && (
        <group position={[0, 0, 0.06]} rotation={[Math.PI / 2, Math.PI / 2, 0]} scale={0.98}>
          <FlatCar flat={1} color={carColor} />
        </group>
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Preisschild (Karton an einer Schnur), ploppt auf
// ---------------------------------------------------------------------------------------------
const tagTex = (text: string) =>
  canvasTex(640, 300, (g) => {
    g.fillStyle = '#fbf3df';
    g.fillRect(0, 0, 640, 300);
    g.fillStyle = '#c8102e';
    g.fillRect(0, 0, 640, 18);
    g.fillRect(0, 282, 640, 18);
    g.fillStyle = '#1b1b1d';
    fitText(g, text, 330, 156, 560, 150, 800);
  });

export const PriceTag = ({text = '2.000.000 €', time = 0, visible = true}: {text?: string; time?: number; visible?: boolean}) => {
  const tex = useFontTexture(useMemo(() => tagTex(text), [text]), `Preisschild-${text}`);
  const m = useMemo(
    () => ({
      card: tex ? new THREE.MeshStandardMaterial({map: tex, roughness: 0.9, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.25}) : std('#fbf3df'),
      back: std('#e9dfc6', {roughness: 0.95}),
      string: std('#b8433a', {roughness: 0.8}),
      ring: std('#d2a43a', {metalness: 0.6, roughness: 0.3}),
    }),
    [tex],
  );
  if (!visible) return null;
  const pop = easeInOut(clamp(time / 0.3));
  const over = 1 + 0.15 * Math.sin(Math.PI * clamp(time / 0.45)) * (1 - clamp(time / 0.45));
  const swing = Math.sin(time * 2.6) * 0.06 * (1 - clamp(time / 3)) + Math.sin(time * 1.3) * 0.02;
  const W = 1.5;
  const H = 0.7;
  return (
    <group scale={pop * over} rotation={[0, 0, swing]}>
      {/* Schnur von oben */}
      <mesh material={m.string} position={[0, -0.18, 0.01]}>
        <boxGeometry args={[0.02, 0.36, 0.01]} />
      </mesh>
      <group position={[0, -0.36 - H / 2, 0]}>
        <mesh material={m.back} position={[0, 0, -0.005]}>
          <boxGeometry args={[W + 0.04, H + 0.04, 0.01]} />
        </mesh>
        <mesh material={m.card} position={[0, 0, 0.002]}>
          <planeGeometry args={[W, H]} />
        </mesh>
        <mesh material={m.ring} position={[-W / 2 + 0.1, H / 2 - 0.1, 0.006]}>
          <torusGeometry args={[0.04, 0.012, 5, 10]} />
        </mesh>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Weinglas (Rotwein)
// ---------------------------------------------------------------------------------------------
export const WineGlass = ({fill = 0.6}: {fill?: number}) => {
  const m = useMemo(
    () => ({
      glass: new THREE.MeshStandardMaterial({color: '#e6f4fb', transparent: true, opacity: 0.4, roughness: 0.05}),
      wine: std('#7a1430', {roughness: 0.2}),
    }),
    [],
  );
  return (
    <group>
      <mesh material={m.glass} position={[0, 0.003, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.006, 10]} />
      </mesh>
      <mesh material={m.glass} position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.09, 6]} />
      </mesh>
      <mesh material={m.glass} position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.042, 0.022, 0.09, 10, 1, true]} />
      </mesh>
      <mesh material={m.wine} position={[0, 0.1 + 0.02 * fill, 0]}>
        <cylinderGeometry args={[0.024 + 0.013 * fill, 0.022, 0.04 * fill + 0.005, 10]} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Rennhelm (für den Monstertruck-Fahrer, an der Dummy-Figur über Uniform-Feld "helmet")
// ---------------------------------------------------------------------------------------------
export const RaceHelmet = ({color}: {color: string}) => {
  const m = useMemo(
    () => ({
      shell: std(color, {roughness: 0.25, metalness: 0.2}),
      stripe: std('#ffffff', {roughness: 0.3}),
      visor: std('#1c2a3a', {roughness: 0.1, metalness: 0.5}),
    }),
    [color],
  );
  return (
    <group position={[0, 0.02, 0]}>
      <mesh material={m.shell} scale={[1.0, 1.05, 1.05]} castShadow>
        <icosahedronGeometry args={[0.165, 1]} />
      </mesh>
      <mesh material={m.stripe} position={[0, 0.06, 0]} scale={[0.18, 1.06, 1.1]}>
        <icosahedronGeometry args={[0.162, 1]} />
      </mesh>
      <mesh material={m.visor} position={[0, 0.0, 0.115]} scale={[0.85, 0.42, 0.48]}>
        <sphereGeometry args={[0.15, 12, 8]} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Hilfen für die Texte
// ---------------------------------------------------------------------------------------------
export const TRUCK_FONT = T.font;
