import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp} from '../lib/anim';
import {T} from '../ui/theme';
import {Car} from './Car';
import {carPose} from './Car';
import {canvasTex, fitText, TextPlane} from './WgProps';

/**
 * Objekte für das Spezial "Bahn-Verspätung" (alle wiederverwendbar, alles ohne echte Logos/Bahn-Designs):
 *  - Loco ("lok"): kleine, knallbunte, stilisierte Lok (rot/türkis/gelb), lange Motorhaube vorn (+z), offenes Führerhaus hinten
 *      mit Sitz, kleinem Lenkrad und Hupe auf dem Dach (Zugschnur hängt ins Führerhaus). Ursprung = Gleismitte auf Schienenoberkante,
 *      Lok zeigt nach +z. Räder drehen sich mit der Fahrt (Bewegung "drive", Weg über Zeitpunkte), Wert "ring" 0 … 1 = Hupe tönt
 *      (Schallringe am Horn), "blink" = Scheinwerfer an. Dummy darin: "attach": "lok", LOCO.seat (x, y, z), face 0.
 *  - Excavator ("bagger"): riesiger stilisierter Bagger (orange/dunkelgrau, ohne Marke) auf Ketten, Kabine hoch oben links,
 *      Ausleger rechts mit Schaufel. Ursprung = Boden-Mitte, vorn +z. Bewegung "drive" = Ketten laufen, "tilt" hebt/senkt den Arm (Grad),
 *      "smoke" = Abgas-Wölkchen. Dummy darin: "attach": "bagger", EXC.seat, face 0.
 *  - RailSignal ("signal"): Hauptsignal am Mast (rot oben, grün unten, Mastschild rot-weiß). Wert "good" 0 = rot … 1 = grün. Ursprung = Fuß.
 *  - Speedo ("tacho"): runder Tacho mit roter Nadel + Schrift (Feld text, Standard "25 km/h"), schaut zur Kamera.
 *      Bewegung "show" = ploppt auf, sonst unsichtbar. Wert "fill" = Nadel (0 … 1 = 0 … 100 km/h, Standard 25 km/h). size = größer.
 *  - CoffeeMug ("kaffeetasse"): dicke Kaffeetasse (senfgelb, Herz) mit Dampf ("smoke" 0 … 1). In der Hand bei drinkcoffee/deskwave.
 *  - CarQueue ("autoschlange"): Reihe aus bis zu 8 bunten Kleinwagen hintereinander (vorn = Ursprung, Schlange nach −z),
 *      "fill" 0 … 1 = wie viele, "rumble" = rollen/ruckeln, Bewegung "drive" = Räder drehen.
 *  - DelayBoard ("anzeigetafel"): hängende Anzeigetafel mit erfundenem Zug (RE 7 Nordhafen) + großer gelber Verspätung (Feld text,
 *      Standard "+90 Min"), Wert "blink" 0 … 1 = Verspätung leuchtet/pulsiert (beim Umspringen). Ursprung = Unterkante Mitte, beidseitig.
 *  - LocoCap: Lokführermütze (blau-weiß gestreift) für den Dummy-Kopf (Dummy-Wert "lokcap").
 *  - WristWatch: Armbanduhr (Dummy-Pose watchL).
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.5, flatShading: true, ...extra});

// ---------------------------------------------------------------------------------------------
// Lok
// ---------------------------------------------------------------------------------------------
/** Maße der Lok (Lok-System: y über Schienenoberkante, vorn +z). seat = Hüft-Ursprung des sitzenden Dummys (chairSit: Sitz 0,45 darüber) */
export const LOCO = {
  len: 6.4,
  w: 2.5,
  floor: 1.25,
  cab: {z0: -3.0, z1: -0.75, roof: 3.45},
  seat: [0.0, 1.25, -2.05] as [number, number, number],
  wheelR: 0.48,
  horn: [0.0, 3.62, -1.75] as [number, number, number],
};
const LC = {
  red: '#e8352b',
  redDark: '#a8231c',
  teal: '#1fbfae',
  tealDark: '#14897d',
  yellow: '#ffd21a',
  white: '#f6f4ee',
  black: '#24262a',
  steel: '#9aa3ab',
  brass: '#e4b43a',
};

const Wheel = ({r, spin, m}: {r: number; spin: number; m: Record<string, THREE.Material>}) => (
  <group rotation={[spin, 0, 0]}>
    <mesh material={m.black} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[r, r, 0.14, 18]} />
    </mesh>
    <mesh material={m.red} rotation={[0, 0, Math.PI / 2]} position={[0.072, 0, 0]}>
      <cylinderGeometry args={[r * 0.78, r * 0.78, 0.02, 18]} />
    </mesh>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <mesh key={i} material={m.white} position={[0.085, 0, 0]} rotation={[(i * Math.PI) / 3, 0, 0]}>
        <boxGeometry args={[0.02, r * 1.4, 0.05]} />
      </mesh>
    ))}
    <mesh material={m.yellow} rotation={[0, 0, Math.PI / 2]} position={[0.09, 0, 0]}>
      <cylinderGeometry args={[0.1, 0.1, 0.03, 10]} />
    </mesh>
  </group>
);

/** Schallringe am Horn (Hupe tönt), ring 0 … 1 */
const HornRings = ({ring, time}: {ring: number; time: number}) => {
  if (ring < 0.02) return null;
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const c = (time * 2.2 + i / 3) % 1;
        return (
          <mesh key={i} position={[0, 0, 0.35 + c * 1.6]} rotation={[0, 0, 0]} renderOrder={6}>
            <torusGeometry args={[0.18 + c * 0.9, 0.035, 6, 20]} />
            <meshBasicMaterial color={T.yellow} transparent opacity={ring * (1 - c) * 0.9} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Loco = ({dist = 0, ring = 0, time = 0, lights = 0}: {dist?: number; ring?: number; time?: number; lights?: number}) => {
  const m = useMemo(
    () => ({
      red: std(LC.red),
      redDark: std(LC.redDark),
      teal: std(LC.teal),
      tealDark: std(LC.tealDark),
      yellow: std(LC.yellow),
      white: std(LC.white),
      black: std(LC.black, {roughness: 0.7}),
      steel: std(LC.steel, {metalness: 0.6, roughness: 0.35}),
      brass: std(LC.brass, {metalness: 0.7, roughness: 0.25}),
      seat: std('#3a4a7a'),
      glass: new THREE.MeshStandardMaterial({color: '#bfe4f2', transparent: true, opacity: 0.25, roughness: 0.1}),
      lamp: new THREE.MeshStandardMaterial({color: '#fff6d0', emissive: new THREE.Color('#ffe9a0'), emissiveIntensity: 0.3 + lights * 1.6}),
    }),
    [lights],
  );
  const {len, w, floor, cab, wheelR} = LOCO;
  const spin = dist / wheelR;
  const hoodZ0 = cab.z1;
  const hoodZ1 = len / 2 - 0.25;
  const wheelZ = [-2.2, -0.75, 0.75, 2.2];
  const rod = Math.sin(spin) * 0.18;
  const rodY = Math.cos(spin) * 0.18;
  return (
    <group>
      {/* Fahrgestell + Pufferbohlen (rot-weiß gestreift) */}
      <mesh material={m.black} position={[0, floor - 0.35, 0]} castShadow>
        <boxGeometry args={[w - 0.25, 0.4, len]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, floor - 0.42, s * (len / 2 + 0.05)]}>
          <mesh material={m.red}>
            <boxGeometry args={[w + 0.1, 0.36, 0.14]} />
          </mesh>
          {[-0.9, -0.3, 0.3, 0.9].map((x) => (
            <mesh key={x} material={m.white} position={[x, 0, s * 0.075]} rotation={[0, 0, 0.7]}>
              <boxGeometry args={[0.14, 0.42, 0.01]} />
            </mesh>
          ))}
          {[-0.85, 0.85].map((x) => (
            <mesh key={`p${x}`} material={m.steel} position={[x, 0, s * 0.25]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.13, 0.13, 0.3, 10]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Räder + Kuppelstangen */}
      {[-1, 1].map((s) => (
        <group key={`w${s}`} position={[s * (w / 2 - 0.12), wheelR, 0]} scale={[s, 1, 1]}>
          {wheelZ.map((z) => (
            <group key={z} position={[0, 0, z]}>
              <Wheel r={wheelR} spin={spin} m={m} />
            </group>
          ))}
          <mesh material={m.white} position={[0.13, rodY, rod]} castShadow>
            <boxGeometry args={[0.05, 0.09, 4.6]} />
          </mesh>
        </group>
      ))}
      {/* Umlauf (Laufblech) gelb */}
      <mesh material={m.yellow} position={[0, floor - 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.15, 0.08, len - 0.1]} />
      </mesh>
      {/* lange Motorhaube vorn: rot mit gelbem Streifen + Lüftungsgittern */}
      <group position={[0, floor, (hoodZ0 + hoodZ1) / 2]}>
        <mesh material={m.red} position={[0, 0.62, 0]} castShadow>
          <boxGeometry args={[w - 0.75, 1.24, hoodZ1 - hoodZ0]} />
        </mesh>
        <mesh material={m.red} position={[0, 1.24, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.35]}>
          <cylinderGeometry args={[(w - 0.75) / 2, (w - 0.75) / 2, hoodZ1 - hoodZ0, 14, 1, false]} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh material={m.yellow} position={[s * ((w - 0.75) / 2 + 0.006), 0.45, 0]} rotation={[0, s * Math.PI / 2, 0]}>
              <planeGeometry args={[hoodZ1 - hoodZ0 - 0.1, 0.16]} />
            </mesh>
            {[-1.0, -0.35, 0.3, 0.95].map((z) => (
              <mesh key={z} material={m.redDark} position={[s * ((w - 0.75) / 2 + 0.008), 0.9, z]} rotation={[0, s * Math.PI / 2, 0]}>
                <planeGeometry args={[0.42, 0.34]} />
              </mesh>
            ))}
          </group>
        ))}
        {/* Schornstein + Glocke vorn */}
        <mesh material={m.black} position={[0, 1.6, 0.9]}>
          <cylinderGeometry args={[0.13, 0.11, 0.4, 10]} />
        </mesh>
        {/* Scheinwerfer vorn (großes rundes Auge) */}
        <group position={[0, 1.0, (hoodZ1 - hoodZ0) / 2 + 0.01]}>
          <mesh material={m.yellow} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.1, 16]} />
          </mesh>
          <mesh material={m.lamp} position={[0, 0, 0.055]}>
            <circleGeometry args={[0.2, 16]} />
          </mesh>
        </group>
        {[-0.75, 0.75].map((x) => (
          <mesh key={x} material={m.lamp} position={[x, -0.25, (hoodZ1 - hoodZ0) / 2 + 0.35]}>
            <circleGeometry args={[0.09, 12]} />
          </mesh>
        ))}
      </group>
      {/* Führerhaus hinten: türkis, große offene Fenster (Dummy gut sichtbar), weißes Dach */}
      <group position={[0, floor, (cab.z0 + cab.z1) / 2]}>
        {(() => {
          const cw = w - 0.1;
          const cd = cab.z1 - cab.z0;
          const h = cab.roof - floor;
          const sill = 0.85;
          return (
            <>
              {/* Brüstung ringsum */}
              <mesh material={m.teal} position={[0, sill / 2, 0]} castShadow>
                <boxGeometry args={[cw, sill, cd]} />
              </mesh>
              <mesh material={m.tealDark} position={[0, sill + 0.03, 0]}>
                <boxGeometry args={[cw + 0.04, 0.06, cd + 0.04]} />
              </mesh>
              {/* Eckpfosten */}
              {[-1, 1].map((sx) =>
                [-1, 1].map((sz) => (
                  <mesh key={`${sx}${sz}`} material={m.teal} position={[sx * (cw / 2 - 0.07), (sill + h) / 2, sz * (cd / 2 - 0.07)]} castShadow>
                    <boxGeometry args={[0.14, h - sill, 0.14]} />
                  </mesh>
                )),
              )}
              {/* Mittelsteg der Frontscheibe + dünne Scheibe vorn */}
              <mesh material={m.teal} position={[0, (sill + h) / 2, cd / 2 - 0.07]}>
                <boxGeometry args={[0.1, h - sill, 0.1]} />
              </mesh>
              <mesh material={m.glass} position={[0, (sill + h) / 2, cd / 2 - 0.05]}>
                <planeGeometry args={[cw - 0.2, h - sill - 0.1]} />
              </mesh>
              {/* Dach (weiß, steht etwas über) + gelber Rand */}
              <mesh material={m.white} position={[0, h + 0.05, 0]} castShadow>
                <boxGeometry args={[cw + 0.35, 0.12, cd + 0.4]} />
              </mesh>
              <mesh material={m.yellow} position={[0, h - 0.04, 0]}>
                <boxGeometry args={[cw + 0.36, 0.08, cd + 0.41]} />
              </mesh>
              {/* Sitz + Pult mit kleinem Lenkrad */}
              <mesh material={m.seat} position={[LOCO.seat[0], 0.42, LOCO.seat[2] - (cab.z0 + cab.z1) / 2 - 0.05]} castShadow>
                <boxGeometry args={[0.55, 0.1, 0.5]} />
              </mesh>
              <mesh material={m.seat} position={[LOCO.seat[0], 0.8, LOCO.seat[2] - (cab.z0 + cab.z1) / 2 - 0.3]}>
                <boxGeometry args={[0.55, 0.7, 0.08]} />
              </mesh>
              <mesh material={m.black} position={[0, 0.55, cd / 2 - 0.35]}>
                <boxGeometry args={[0.9, 1.1, 0.4]} />
              </mesh>
              <group position={[LOCO.seat[0], 1.0, LOCO.seat[2] - (cab.z0 + cab.z1) / 2 + 0.47]} rotation={[-0.9, 0, 0]}>
                <mesh material={m.yellow}>
                  <torusGeometry args={[0.17, 0.025, 6, 18]} />
                </mesh>
                <mesh material={m.yellow} rotation={[0, 0, 0]}>
                  <boxGeometry args={[0.34, 0.025, 0.02]} />
                </mesh>
                <mesh material={m.black} position={[0, 0, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.24, 6]} />
                </mesh>
              </group>
            </>
          );
        })()}
      </group>
      {/* Hupe auf dem Dach: zwei Messing-Trichter + Zugschnur ins Führerhaus */}
      <group position={LOCO.horn}>
        {[-0.16, 0.16].map((x, i) => (
          <group key={x} position={[x, 0.05 + i * 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh material={m.brass}>
              <cylinderGeometry args={[0.05, 0.16, 0.55 - i * 0.12, 12, 1, true]} />
            </mesh>
          </group>
        ))}
        <mesh material={m.brass} position={[0, -0.05, -0.1]}>
          <boxGeometry args={[0.45, 0.1, 0.18]} />
        </mesh>
        <group position={[0, 0.05, 0.1]}>
          <HornRings ring={ring} time={time} />
        </group>
      </group>
      <mesh material={m.white} position={[LOCO.seat[0] - 0.18, LOCO.cab.roof - 0.42 - 0.08 * ring, LOCO.seat[2] + 0.28]}>
        <cylinderGeometry args={[0.01, 0.01, 0.8, 4]} />
      </mesh>
      <mesh material={m.red} position={[LOCO.seat[0] - 0.18, LOCO.cab.roof - 0.84 - 0.16 * ring, LOCO.seat[2] + 0.28]}>
        <sphereGeometry args={[0.04, 8, 6]} />
      </mesh>
      {/* Rücklichter hinten */}
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, floor + 0.35, cab.z0 - 0.03]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.08, 10]} />
          <meshStandardMaterial color="#ff4a3a" emissive="#ff2a1a" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Bagger
// ---------------------------------------------------------------------------------------------
/** Maße des Baggers (vorn +z). seat = Hüft-Ursprung des sitzenden Dummys in der Kabine (Sitz 0,45 darüber) */
export const EXC = {
  trackL: 5.6,
  trackW: 1.0,
  gauge: 3.0,
  trackH: 1.15,
  deck: 1.45,
  cab: {x: -0.85, z: 0.75, w: 1.55, d: 1.8, floor: 2.6, h: 2.0},
  seat: [-0.85, 2.6, 0.55] as [number, number, number],
};
const EX = {orange: '#ff8a1f', orangeDark: '#c9620d', grey: '#3d4147', greyLight: '#6b7078', black: '#1d1f22', white: '#f2f2ee', stripeY: '#ffd21a'};

export const Excavator = ({dist = 0, arm = 0, smoke = 0, time = 0}: {dist?: number; arm?: number; smoke?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      orange: std(EX.orange),
      orangeDark: std(EX.orangeDark),
      grey: std(EX.grey, {roughness: 0.7}),
      greyLight: std(EX.greyLight, {metalness: 0.3}),
      black: std(EX.black, {roughness: 0.8}),
      white: std(EX.white),
      yellow: std(EX.stripeY),
      glass: new THREE.MeshStandardMaterial({color: '#bfe4f2', transparent: true, opacity: 0.22, roughness: 0.1}),
      puff: new THREE.MeshStandardMaterial({color: '#cfd3d8', transparent: true, opacity: 0.6, roughness: 1}),
    }),
    [],
  );
  const {trackL, trackW, gauge, trackH, deck, cab} = EXC;
  // Kettenglieder laufen mit der Fahrt
  const pads = 18;
  const step = (trackL * 2 + 1.2) / pads;
  const off = ((dist % step) + step) % step;
  const boom = THREE.MathUtils.degToRad(arm);
  return (
    <group>
      {/* Ketten */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * gauge / 2, 0, 0]}>
          <mesh material={m.grey} position={[0, trackH / 2, 0]} castShadow>
            <boxGeometry args={[trackW, trackH - 0.2, trackL - 0.6]} />
          </mesh>
          {[-1, 1].map((e) => (
            <mesh key={e} material={m.grey} position={[0, trackH / 2, e * (trackL / 2 - 0.3)]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[trackH / 2, trackH / 2, trackW, 14]} />
            </mesh>
          ))}
          {/* Glieder oben + unten (laufen gegeneinander) */}
          {Array.from({length: pads}, (_, i) => {
            const u = i * step + off;
            const top = u < trackL - 0.6;
            const z = top ? -(trackL / 2 - 0.3) + u : trackL / 2 - 0.3 - (u - (trackL - 0.6) - 0.6);
            if (Math.abs(z) > trackL / 2 - 0.3) return null;
            return (
              <mesh key={i} material={m.black} position={[0, top ? trackH + 0.01 : 0.02, z]}>
                <boxGeometry args={[trackW + 0.04, 0.06, 0.12]} />
              </mesh>
            );
          })}
          {[-1.2, 0, 1.2].map((z) => (
            <mesh key={`r${z}`} material={m.yellow} position={[s * (trackW / 2 + 0.01), trackH / 2, z]} rotation={[0, s * Math.PI / 2, 0]}>
              <circleGeometry args={[0.22, 12]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Drehkranz + Oberwagen */}
      <mesh material={m.black} position={[0, trackH + 0.1, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.25, 16]} />
      </mesh>
      <group position={[0, deck, 0]}>
        <mesh material={m.orange} position={[0.25, 0.55, -0.6]} castShadow>
          <boxGeometry args={[3.4, 1.1, 3.0]} />
        </mesh>
        {/* Gegengewicht hinten mit Warnstreifen */}
        <mesh material={m.orangeDark} position={[0.1, 0.65, -2.35]} castShadow>
          <boxGeometry args={[3.5, 1.3, 0.7]} />
        </mesh>
        {[-1.4, -0.7, 0, 0.7, 1.4].map((x) => (
          <mesh key={x} material={m.black} position={[x, 0.5, -2.71]} rotation={[0, Math.PI, 0.6]}>
            <planeGeometry args={[0.22, 0.9]} />
          </mesh>
        ))}
        {/* Auspuff */}
        <mesh material={m.black} position={[1.2, 1.45, -1.4]}>
          <cylinderGeometry args={[0.07, 0.07, 0.7, 8]} />
        </mesh>
        {smoke > 0.01 &&
          [0, 1, 2, 3].map((i) => {
            const c = (time * 0.7 + i / 4) % 1;
            return (
              <mesh key={i} material={m.puff} position={[1.2 + c * 0.3, 1.9 + c * 1.4, -1.4 - c * 0.6]} scale={(0.12 + c * 0.35) * smoke}>
                <icosahedronGeometry args={[1, 0]} />
              </mesh>
            );
          })}
      </group>
      {/* Kabine hoch oben links: Sockel + Kabine mit großen Fenstern */}
      <group position={[cab.x, 0, cab.z]}>
        <mesh material={m.orangeDark} position={[0, (deck + 1.1 + cab.floor) / 2, -0.1]} castShadow>
          <boxGeometry args={[cab.w - 0.1, cab.floor - deck - 1.1 + 0.02, cab.d - 0.3]} />
        </mesh>
        <group position={[0, cab.floor, 0]}>
          <mesh material={m.orange} position={[0, 0.05, 0]} castShadow>
            <boxGeometry args={[cab.w + 0.1, 0.1, cab.d + 0.1]} />
          </mesh>
          <mesh material={m.orange} position={[0, 0.4, -cab.d / 2 + 0.05]}>
            <boxGeometry args={[cab.w, 0.8, 0.1]} />
          </mesh>
          {[-1, 1].map((sx) =>
            [-1, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} material={m.grey} position={[sx * (cab.w / 2 - 0.05), cab.h / 2, sz * (cab.d / 2 - 0.05)]} castShadow>
                <boxGeometry args={[0.1, cab.h, 0.1]} />
              </mesh>
            )),
          )}
          <mesh material={m.orange} position={[0, 0.35, 0]}>
            <boxGeometry args={[cab.w, 0.5, cab.d]} />
          </mesh>
          <mesh material={m.glass} position={[0, cab.h / 2 + 0.2, cab.d / 2 - 0.04]}>
            <planeGeometry args={[cab.w - 0.15, cab.h - 0.5]} />
          </mesh>
          <mesh material={m.white} position={[0, cab.h + 0.05, 0]} castShadow>
            <boxGeometry args={[cab.w + 0.2, 0.12, cab.d + 0.2]} />
          </mesh>
          {/* Rundumleuchte */}
          <mesh position={[0.4, cab.h + 0.2, -0.4]}>
            <cylinderGeometry args={[0.1, 0.12, 0.2, 10]} />
            <meshStandardMaterial color="#ffb300" emissive="#ff9800" emissiveIntensity={0.5 + 0.5 * Math.max(0, Math.sin(time * 9))} />
          </mesh>
          {/* Sitz */}
          <mesh material={m.black} position={[EXC.seat[0] - cab.x, 0.42, EXC.seat[2] - cab.z - 0.05]}>
            <boxGeometry args={[0.55, 0.1, 0.5]} />
          </mesh>
          <mesh material={m.black} position={[EXC.seat[0] - cab.x, 0.85, EXC.seat[2] - cab.z - 0.3]}>
            <boxGeometry args={[0.55, 0.8, 0.08]} />
          </mesh>
        </group>
      </group>
      {/* Ausleger rechts vorn: Boom → Stiel → Schaufel */}
      <group position={[0.75, deck + 0.9, 0.7]} rotation={[-0.55 - boom, 0, 0]}>
        <mesh material={m.orange} position={[0, 0, 1.9]} castShadow>
          <boxGeometry args={[0.5, 0.55, 3.8]} />
        </mesh>
        <mesh material={m.greyLight} position={[0, -0.45, 1.6]} rotation={[0.06, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 2.4, 8]} />
        </mesh>
        <group position={[0, 0, 3.75]} rotation={[1.75 + boom * 0.6, 0, 0]}>
          <mesh material={m.orange} position={[0, 0, 1.3]} castShadow>
            <boxGeometry args={[0.42, 0.42, 2.6]} />
          </mesh>
          <group position={[0, 0, 2.6]} rotation={[0.6, 0, 0]}>
            <mesh material={m.grey} position={[0, -0.25, 0.25]} castShadow>
              <boxGeometry args={[1.15, 0.7, 0.75]} />
            </mesh>
            {[-0.42, -0.14, 0.14, 0.42].map((x) => (
              <mesh key={x} material={m.greyLight} position={[x, -0.65, 0.55]} rotation={[0.4, 0, 0]}>
                <coneGeometry args={[0.07, 0.22, 4]} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Signal, Tacho, Tasse
// ---------------------------------------------------------------------------------------------
export const RailSignal = ({green = 0, time = 0}: {green?: number; time?: number}) => {
  const red = 1 - clamp(green);
  const glowR = red * (0.9 + 0.1 * Math.sin(time * 6));
  return (
    <group>
      <mesh position={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 4.8, 8]} />
        <meshStandardMaterial color="#8a9096" metalness={0.5} roughness={0.4} flatShading />
      </mesh>
      {/* Mastschild rot-weiß */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 2.0 + i * 0.16, 0.1]}>
          <boxGeometry args={[0.32, 0.16, 0.02]} />
          <meshStandardMaterial color={i % 2 ? '#f5f5f2' : '#d42a20'} />
        </mesh>
      ))}
      {/* Signalschirm */}
      <group position={[0, 4.25, 0.12]}>
        <mesh castShadow>
          <boxGeometry args={[0.85, 1.25, 0.16]} />
          <meshStandardMaterial color="#1b1d20" flatShading />
        </mesh>
        <mesh position={[0, 0, 0.081]}>
          <planeGeometry args={[0.95, 1.35]} />
          <meshStandardMaterial color="#f2f2ee" />
        </mesh>
        <mesh position={[0, 0, 0.083]}>
          <planeGeometry args={[0.8, 1.2]} />
          <meshStandardMaterial color="#1b1d20" />
        </mesh>
        {[
          [0.27, '#ff3626', glowR],
          [-0.27, '#3cff6a', clamp(green)],
        ].map(([y, c, g]) => (
          <group key={c as string} position={[0, y as number, 0.09]}>
            <mesh>
              <circleGeometry args={[0.2, 18]} />
              <meshStandardMaterial color={(g as number) > 0.1 ? (c as string) : '#3a2a2a'} emissive={c as string} emissiveIntensity={(g as number) * 2.2} />
            </mesh>
            {(g as number) > 0.1 && (
              <mesh position={[0, 0, 0.01]}>
                <circleGeometry args={[0.42, 20]} />
                <meshBasicMaterial color={c as string} transparent opacity={0.25 * (g as number)} depthWrite={false} />
              </mesh>
            )}
            <mesh position={[0, 0.17, 0.1]} rotation={[0.4, 0, 0]}>
              <boxGeometry args={[0.46, 0.03, 0.22]} />
              <meshStandardMaterial color="#1b1d20" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

const speedoTex = (text: string, v: number) =>
  canvasTex(512, 600, (g) => {
    const cx = 256;
    const cy = 250;
    g.fillStyle = '#f7f5ee';
    g.beginPath();
    g.arc(cx, cy, 240, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#20232a';
    g.beginPath();
    g.arc(cx, cy, 222, 0, Math.PI * 2);
    g.fill();
    // Skala 0 … 100 über 240°
    const a0 = Math.PI * 0.75;
    const span = Math.PI * 1.5;
    g.lineCap = 'round';
    for (let k = 0; k <= 20; k++) {
      const a = a0 + (span * k) / 20;
      const big = k % 4 === 0;
      g.strokeStyle = k >= 16 ? '#ff4a3a' : '#ffffff';
      g.lineWidth = big ? 9 : 5;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * (big ? 170 : 185), cy + Math.sin(a) * (big ? 170 : 185));
      g.lineTo(cx + Math.cos(a) * 205, cy + Math.sin(a) * 205);
      g.stroke();
      if (big) {
        g.fillStyle = '#ffffff';
        g.font = `700 34px ${T.font}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(k * 5), cx + Math.cos(a) * 135, cy + Math.sin(a) * 135);
      }
    }
    // Nadel
    const a = a0 + span * clamp(v / 100);
    g.strokeStyle = '#ff2a1a';
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(cx - Math.cos(a) * 26, cy - Math.sin(a) * 26);
    g.lineTo(cx + Math.cos(a) * 190, cy + Math.sin(a) * 190);
    g.stroke();
    g.fillStyle = '#ff2a1a';
    g.beginPath();
    g.arc(cx, cy, 22, 0, Math.PI * 2);
    g.fill();
    // Schriftfeld unten
    g.fillStyle = T.yellow;
    g.fillRect(56, 470, 400, 116);
    g.fillStyle = '#20232a';
    fitText(g, text, 256, 530, 380, 96, 800);
  });

export const Speedo = ({text = '25 km/h', value = 25, time = 0, visible = true, size = 0}: {text?: string; value?: number; time?: number; visible?: boolean; size?: number}) => {
  if (!visible) return null;
  const k = clamp(time / 0.35);
  const pop = k < 1 ? 0.6 + 0.4 * k + Math.sin(k * Math.PI) * 0.15 : 1;
  // Nadel zittert leicht (nur in Schritten neu zeichnen)
  const v = Math.round((value + Math.sin(time * 9) * 0.8) * 2) / 2;
  return (
    <group scale={pop * (1 + size)}>
      <TextPlane draw={speedoTex(text, v)} k={`Tacho ${text} ${v}`} w={0.62} h={0.726} glow={0.55} />
    </group>
  );
};

export const CoffeeMug = ({smoke = 0, time = 0}: {smoke?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      mug: new THREE.MeshStandardMaterial({color: '#e8a93a', roughness: 0.35}),
      coffee: new THREE.MeshStandardMaterial({color: '#4a2a17', roughness: 0.2}),
      heart: new THREE.MeshBasicMaterial({color: '#e8352b'}),
      steam: new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0.55, roughness: 1, depthWrite: false}),
    }),
    [],
  );
  return (
    <group>
      <mesh material={m.mug} position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.042, 0.1, 16, 1, true]} />
      </mesh>
      <mesh material={m.mug} position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.042, 0.042, 0.004, 16]} />
      </mesh>
      <mesh material={m.coffee} position={[0, 0.088, 0]}>
        <cylinderGeometry args={[0.043, 0.043, 0.004, 16]} />
      </mesh>
      <mesh material={m.mug} position={[-0.052, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.025, 0.008, 6, 12]} />
      </mesh>
      <mesh material={m.heart} position={[0, 0.055, 0.046]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.022, 0.022]} />
      </mesh>
      {smoke > 0.01 &&
        [0, 1, 2].map((i) => {
          const c = (time * 0.6 + i / 3) % 1;
          return (
            <mesh key={i} material={m.steam} position={[Math.sin(time * 2 + i) * 0.012, 0.11 + c * 0.16, 0]} scale={(0.012 + c * 0.03) * smoke}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Autoschlange
// ---------------------------------------------------------------------------------------------
const QUEUE_COLORS = ['#2f6fcf', '#e3b94b', '#3f9a4a', '#d23a2c', '#7d4f8f', '#f2f2ee', '#1fbfae', '#ff7aa8'];
export const CarQueue = ({count = 6, dist = 0, time = 0, rumble = 0}: {count?: number; dist?: number; time?: number; rumble?: number}) => {
  const pose = carPose('drive', dist / 1.0, 1.0);
  return (
    <group>
      {QUEUE_COLORS.slice(0, Math.max(0, Math.min(8, Math.round(count)))).map((c, i) => {
        const bob = rumble * Math.abs(Math.sin(time * 5 + i * 1.7)) * 0.03;
        return (
          <group key={i} position={[(i % 2) * 0.12 - 0.06, bob, -i * 5.4]}>
            <Car pose={pose} color={c} />
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Anzeigetafel mit Verspätung
// ---------------------------------------------------------------------------------------------
const delayTex = (delay: string, hot: number) =>
  canvasTex(1024, 300, (g) => {
    g.fillStyle = '#16294a';
    g.fillRect(0, 0, 1024, 300);
    g.fillStyle = '#f2f4f8';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.font = `800 60px ${T.font}`;
    g.fillText('07:12', 30, 56);
    g.fillStyle = '#ffd21a';
    g.font = `700 44px ${T.font}`;
    g.fillText('RE 7', 200, 58);
    g.fillStyle = '#f2f4f8';
    g.font = `800 60px ${T.font}`;
    g.fillText('Nordhafen', 320, 56);
    // Verspätung groß, gelb auf dunklem Feld
    g.fillStyle = hot > 0.5 ? '#3a1a10' : '#0d1a30';
    g.fillRect(24, 110, 840, 168);
    g.fillStyle = hot > 0.5 ? '#ffe45a' : '#ffd21a';
    fitText(g, delay, 444, 196, 800, 150, 800);
    // Gleisnummer rechts
    g.fillStyle = '#f2f4f8';
    g.fillRect(886, 28, 116, 244);
    g.fillStyle = '#16294a';
    fitText(g, '3', 944, 152, 100, 190, 800);
  });

export const DelayBoard = ({text = '+90 Min', blink = 0}: {text?: string; blink?: number}) => {
  const hot = blink > 0.5 ? 1 : 0;
  const pulse = 1 + 0.06 * clamp(blink);
  return (
    <group>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[3.1, 0.96, 0.16]} />
        <meshStandardMaterial color="#2a3038" metalness={0.4} roughness={0.5} flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0.48, s * 0.085]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} scale={pulse}>
          <TextPlane draw={delayTex(text, hot)} k={`Tafel ${text} ${hot}`} w={2.96} h={0.867} glow={0.7 + 0.5 * clamp(blink)} />
        </group>
      ))}
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} position={[x, 2.1, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 2.4, 6]} />
          <meshStandardMaterial color="#2a3038" />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Kleidung/Accessoires für die Dummy-Figur
// ---------------------------------------------------------------------------------------------
/** Lokführermütze (blau-weiß gestreift, weich, mit Schirm). Ursprung = Kopfmitte des Dummys */
export const LocoCap = () => {
  const m = useMemo(() => ({blue: std('#2a4d8f', {roughness: 0.85}), white: std('#f2f4f8', {roughness: 0.85}), visor: std('#1c2a48', {roughness: 0.4})}), []);
  return (
    <group position={[0, 0.095, 0.0]} rotation={[-0.12, 0, 0]}>
      {/* Krone: gestreifte Ringe */}
      {Array.from({length: 7}, (_, i) => (
        <mesh key={i} material={i % 2 ? m.white : m.blue} position={[0, i * 0.015, 0]}>
          <cylinderGeometry args={[0.135 + i * 0.004, 0.13 + i * 0.004, 0.016, 14]} />
        </mesh>
      ))}
      <mesh material={m.blue} position={[0, 0.115, -0.01]} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[0.165, 14, 8]} />
      </mesh>
      <mesh material={m.white} position={[0, 0.12, 0.03]} scale={[0.9, 0.3, 0.9]}>
        <sphereGeometry args={[0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={m.visor} position={[0, 0.0, 0.14]} rotation={[0.3, 0, 0]} scale={[1, 0.22, 0.75]}>
        <cylinderGeometry args={[0.12, 0.12, 0.05, 14, 1, false, -Math.PI / 2, Math.PI]} />
      </mesh>
    </group>
  );
};

/** Armbanduhr: Band um den Unterarm (Achse y), Zifferblatt außen (+x). */
export const WristWatch = () => (
  <group>
    <mesh rotation={[0, 0, 0]}>
      <cylinderGeometry args={[0.047, 0.047, 0.03, 12, 1, true]} />
      <meshStandardMaterial color="#2a2a2c" side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.03, 0.03, 0.014, 14]} />
      <meshStandardMaterial color="#c9ccd1" metalness={0.7} roughness={0.25} />
    </mesh>
    <mesh position={[0.058, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      <circleGeometry args={[0.025, 14]} />
      <meshStandardMaterial color="#fbfaf6" />
    </mesh>
  </group>
);
