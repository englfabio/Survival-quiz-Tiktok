import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, rng} from '../lib/anim';
import {T} from '../ui/theme';
import {canvasTex, fitText, TextPlane} from './WgProps';

/**
 * Objekte für das Spezial "Paket beim Nachbarn" (alle wiederverwendbar, alles ohne echte Logos/Paketdienst-Farben):
 *  - Parcel ("paket"): Karton mit hellem Klebeband + neutralem weißem Etikett (Strichcode-Andeutung). Ursprung = Boden-Mitte.
 *  - ParcelStack ("pakete"): Stapel aus bis zu 7 Kartons, fill 0 … 1 = wie viele schon liegen (einer nach dem anderen). Ursprung = Boden-Mitte.
 *  - Tent ("zelt"): kleines Kuppelzelt (grün, orange Stangen), Eingang vorn (+z) offen. fill 0 = Packsack … 1 = steht (ploppt auf),
 *    squish 0 … 1 = Dach wird eingedrückt (jemand steigt drüber). Ursprung = Boden-Mitte.
 *  - FairyLights ("lichterkette"): bunte Lichterkette, hängt zwischen x −span … +span durch. glow 0 … 1. Ursprung = Mitte (Aufhängehöhe).
 *  - CampStove ("kocher"): Campingkocher mit Topf, fire 0 … 1 = kleine blaue Flamme, smoke = Dampf aus dem Topf. Ursprung = Boden-Mitte.
 *  - Saw ("saege"): kleine Handsäge (liegt flach; in der Hand automatisch bei "sawflap").
 *  - Doorbell ("klingel"): Klingelknopf mit Namensschild (Feld text), press 0 … 1 = gedrückt + leuchtet. Ursprung = Mitte, Vorderseite +z.
 *  - DayCalendar ("tageskalender"): Wandkalender "TAG n"; fill = Tag (1, 2, 5 …), zwischen zwei Zahlen blättert das Blatt nach oben weg.
 *    Ursprung = Mitte, Vorderseite +z.
 *  - FlatDoor ("treppentuer"): Wohnungstür fürs Treppenhaus. Ursprung = Boden an der Scharnier-Seite, Tür liegt geschlossen entlang +x
 *    (Breite 0,94), Vorderseite +z (Flur). door 0 … 1 = geht nach innen (−z) auf; fill 0 … 1 = Schnittlinie der Klappe wird gesägt
 *    (Sägespäne fliegen), ab fill 1 gibt es die Klappe, lid 0 … 1 = Klappe schwingt nach innen auf (oben angeschlagen).
 *    Feld text = Namensschild, mark 1 = Holztür (sonst graugrün). Wert side 1 = gespiegelt (Tür liegt entlang −x, Scharnier auf der anderen Seite).
 */

const cardboard = ['#c9a06c', '#bf9461', '#d2ab79', '#c49a66'];
const CARD_DARK = '#9c774a';
const TAPE = '#e2cf9d';

export const Parcel = ({w = 0.36, h = 0.26, d = 0.3, shade = 0}: {w?: number; h?: number; d?: number; shade?: number}) => {
  const mats = useMemo(
    () => ({
      box: new THREE.MeshStandardMaterial({color: cardboard[shade % 4], roughness: 0.9, flatShading: true}),
      edge: new THREE.MeshStandardMaterial({color: CARD_DARK, roughness: 0.9}),
      tape: new THREE.MeshStandardMaterial({color: TAPE, roughness: 0.35, metalness: 0.05}),
      label: new THREE.MeshStandardMaterial({color: '#f8f8f4', roughness: 0.8}),
      ink: new THREE.MeshBasicMaterial({color: '#2a2a2a'}),
    }),
    [shade],
  );
  return (
    <group>
      <mesh material={mats.box} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* Klebeband oben + vorn/hinten */}
      <mesh material={mats.tape} position={[0, h + 0.002, 0]}>
        <boxGeometry args={[0.06, 0.004, d + 0.004]} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} material={mats.tape} position={[0, h - 0.04, k * (d / 2 + 0.002)]}>
          <boxGeometry args={[0.06, 0.08, 0.004]} />
        </mesh>
      ))}
      {/* Kanten etwas dunkler */}
      <mesh material={mats.edge} position={[0, 0.005, 0]}>
        <boxGeometry args={[w + 0.004, 0.01, d + 0.004]} />
      </mesh>
      {/* neutrales Etikett vorn (+z) mit Strichen – kein Logo */}
      <group position={[w * 0.18, h * 0.42, d / 2 + 0.003]}>
        <mesh material={mats.label}>
          <boxGeometry args={[0.11, 0.075, 0.002]} />
        </mesh>
        {[-0.035, -0.024, -0.015, -0.004, 0.006, 0.014, 0.025, 0.034].map((x, i) => (
          <mesh key={i} material={mats.ink} position={[x, -0.012, 0.0015]}>
            <planeGeometry args={[i % 3 === 0 ? 0.005 : 0.003, 0.028]} />
          </mesh>
        ))}
        {[0.018, 0.028].map((y) => (
          <mesh key={y} material={mats.ink} position={[-0.012, y, 0.0015]}>
            <planeGeometry args={[0.07, 0.004]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** Lage der Kartons im Stapel (unten → oben) */
const STACK: {x: number; y: number; z: number; w: number; h: number; d: number; ry: number}[] = [
  {x: -0.2, y: 0, z: 0, w: 0.38, h: 0.28, d: 0.32, ry: 0.05},
  {x: 0.21, y: 0, z: 0.02, w: 0.34, h: 0.24, d: 0.3, ry: -0.1},
  {x: -0.02, y: 0.28, z: 0, w: 0.42, h: 0.22, d: 0.34, ry: 0.12},
  {x: 0.18, y: 0.24, z: 0.1, w: 0.24, h: 0.18, d: 0.22, ry: -0.3},
  {x: -0.12, y: 0.5, z: -0.02, w: 0.3, h: 0.2, d: 0.26, ry: -0.08},
  {x: 0.12, y: 0.5, z: 0.03, w: 0.22, h: 0.16, d: 0.2, ry: 0.25},
  {x: 0.0, y: 0.7, z: 0.0, w: 0.26, h: 0.18, d: 0.22, ry: 0.4},
];
export const PARCEL_COUNT = STACK.length;
export const ParcelStack = ({fill = 1}: {fill?: number}) => {
  const n = Math.round(clamp(fill) * STACK.length);
  return (
    <group>
      {STACK.slice(0, n).map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]} rotation={[0, s.ry, 0]}>
          <Parcel w={s.w} h={s.h} d={s.d} shade={i} />
        </group>
      ))}
    </group>
  );
};

// ---------- Zelt ----------
const TENT = {rx: 0.6, rz: 0.72, h: 0.88};
export const Tent = ({fill = 1, squish = 0, time = 0}: {fill?: number; squish?: number; time?: number}) => {
  const mats = useMemo(
    () => ({
      fly: new THREE.MeshStandardMaterial({color: '#3f9a5c', roughness: 0.7, flatShading: true, side: THREE.DoubleSide}),
      inner: new THREE.MeshStandardMaterial({color: '#2b6b40', roughness: 0.9, flatShading: true, side: THREE.BackSide}),
      pole: new THREE.MeshStandardMaterial({color: '#f08a24', roughness: 0.5, flatShading: true}),
      floor: new THREE.MeshStandardMaterial({color: '#2f4c3a', roughness: 1}),
      bag: new THREE.MeshStandardMaterial({color: '#3f9a5c', roughness: 0.7, flatShading: true}),
      strap: new THREE.MeshStandardMaterial({color: '#1f2a24', roughness: 0.8}),
    }),
    [],
  );
  const f = clamp(fill);
  // Aufploppen mit leichtem Nachfedern
  const grow = f <= 0 ? 0 : 1 - Math.cos(f * Math.PI * 2.5) * Math.exp(-f * 4.5) * (1 - f);
  const sy = Math.max(0.02, grow) * (1 - 0.38 * clamp(squish));
  const wob = f > 0 && f < 1 ? Math.sin(time * 20) * 0.03 * (1 - f) : 0;
  const gap = 1.3; // Breite der Eingangsöffnung (Bogenmaß), vorn (+z)
  return (
    <group>
      {f < 0.2 && (
        <group position={[0, 0.12, 0.2]} rotation={[0, 0, Math.PI / 2]} scale={1 - f * 4}>
          <mesh material={mats.bag} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.5, 10]} />
          </mesh>
          {[-0.15, 0.15].map((y) => (
            <mesh key={y} material={mats.strap} position={[0, y, 0]}>
              <cylinderGeometry args={[0.125, 0.125, 0.03, 10]} />
            </mesh>
          ))}
        </group>
      )}
      {f > 0.01 && (
        <group scale={[(0.15 + 0.85 * Math.min(1, grow)) * (1 + wob), sy, (0.15 + 0.85 * Math.min(1, grow)) * (1 - wob)]}>
          <mesh material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} scale={[TENT.rx, TENT.rz, 1]} receiveShadow>
            <circleGeometry args={[1.02, 24]} />
          </mesh>
          <group scale={[TENT.rx, TENT.h, TENT.rz]}>
            <mesh material={mats.fly} castShadow receiveShadow>
              <sphereGeometry args={[1, 24, 10, Math.PI / 2 + gap / 2, Math.PI * 2 - gap, 0, Math.PI / 2]} />
            </mesh>
            <mesh material={mats.inner}>
              <sphereGeometry args={[0.985, 24, 10, Math.PI / 2 + gap / 2, Math.PI * 2 - gap, 0, Math.PI / 2]} />
            </mesh>
            {/* zwei gekreuzte Stangen */}
            {[0.75, -0.75].map((a) => (
              <mesh key={a} material={mats.pole} rotation={[0, a, 0]}>
                <torusGeometry args={[1.005, 0.018, 5, 24, Math.PI]} />
              </mesh>
            ))}
          </group>
          {/* aufgerollte Eingangsplane oben am Eingang */}
          <mesh material={mats.pole} position={[0, TENT.h * 0.78, TENT.rz * 0.6]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.5, 8]} />
          </mesh>
        </group>
      )}
    </group>
  );
};
export const TENT_SIZE = TENT;

// ---------- Lichterkette ----------
const BULB_COLORS = ['#ff5a5a', '#ffd23a', '#5ad1ff', '#7dff7a', '#ff8ae0', '#ffb347'];
export const FairyLights = ({glow = 1, time = 0, span = 0.6, droop = 0.16, count = 11}: {glow?: number; time?: number; span?: number; droop?: number; count?: number}) => {
  const pts = useMemo(() => Array.from({length: count}, (_, i) => {
    const u = i / (count - 1);
    const x = -span + 2 * span * u;
    return new THREE.Vector3(x, -droop * (1 - (2 * u - 1) ** 2), 0);
  }), [span, droop, count]);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts), [pts]);
  const g = clamp(glow);
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 32, 0.004, 4, false]} />
        <meshStandardMaterial color="#1e2a22" />
      </mesh>
      {pts.map((p, i) => {
        const tw = 0.7 + 0.3 * Math.sin(time * 3.1 + i * 1.7);
        const c = BULB_COLORS[i % BULB_COLORS.length];
        return (
          <group key={i} position={[p.x, p.y - 0.018, p.z]}>
            <mesh>
              <sphereGeometry args={[0.018, 8, 6]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.2 + 2.2 * g * tw} toneMapped={false} />
            </mesh>
            {g > 0.05 && (
              <mesh>
                <sphereGeometry args={[0.04, 8, 6]} />
                <meshBasicMaterial color={c} transparent opacity={0.22 * g * tw} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
      {g > 0.05 && <pointLight position={[0, -droop * 0.6, 0.15]} intensity={0.9 * g} color="#ffd9a0" distance={2.2} decay={1.6} />}
    </group>
  );
};

// ---------- Campingkocher ----------
export const CampStove = ({fire = 1, smoke = 0, time = 0}: {fire?: number; smoke?: number; time?: number}) => {
  const f = clamp(fire);
  return (
    <group>
      {/* Gaskartusche (neutral, ohne Marke) */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.07, 0.12, 14]} />
        <meshStandardMaterial color="#3b6fb0" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.125, 0]}>
        <cylinderGeometry args={[0.03, 0.045, 0.02, 10]} />
        <meshStandardMaterial color="#c9ced3" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Brenner + Topfauflage */}
      <mesh position={[0, 0.145, 0]}>
        <cylinderGeometry args={[0.04, 0.03, 0.02, 12]} />
        <meshStandardMaterial color="#5c6066" metalness={0.7} roughness={0.35} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.06, 0.155, Math.sin((i * Math.PI * 2) / 3) * 0.06]} rotation={[0, -(i * Math.PI * 2) / 3, 0]}>
          <boxGeometry args={[0.07, 0.008, 0.01]} />
          <meshStandardMaterial color="#5c6066" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* kleine blaue Flamme */}
      {f > 0.02 &&
        [0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          const fl = 0.75 + 0.25 * Math.sin(time * 19 + i * 2.1);
          return (
            <mesh key={i} position={[Math.cos(a) * 0.028, 0.168, Math.sin(a) * 0.028]} scale={[1, fl * f, 1]}>
              <coneGeometry args={[0.009, 0.035, 5]} />
              <meshBasicMaterial color="#4fb2ff" transparent opacity={0.85} toneMapped={false} />
            </mesh>
          );
        })}
      {/* Topf mit Henkel */}
      <mesh position={[0, 0.21, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.075, 0.09, 16]} />
        <meshStandardMaterial color="#cfd4da" metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.258, 0]}>
        <cylinderGeometry args={[0.072, 0.072, 0.006, 16]} />
        <meshStandardMaterial color="#e8d28a" roughness={0.6} />
      </mesh>
      <mesh position={[0.11, 0.24, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.08, 6]} />
        <meshStandardMaterial color="#2a2a2c" />
      </mesh>
      {f > 0.02 && <pointLight position={[0, 0.2, 0.05]} intensity={0.35 * f} color="#7ac2ff" distance={0.9} decay={1.8} />}
      {/* Dampf */}
      {smoke > 0.02 &&
        [0, 1, 2, 3].map((i) => {
          const k = (time * 0.5 + i / 4) % 1;
          return (
            <mesh key={i} position={[Math.sin(i * 2.3 + time) * 0.02, 0.28 + k * 0.35, 0]} scale={0.03 + k * 0.05}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.55 * (1 - k) * clamp(smoke)} roughness={1} depthWrite={false} />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------- Säge ----------
/** Kleine Handsäge: Griff am Ursprung, Blatt nach +z (Länge 0,32), Zähne nach −y */
export const Saw = () => (
  <group>
    <mesh position={[0, 0, -0.04]} castShadow>
      <boxGeometry args={[0.03, 0.09, 0.1]} />
      <meshStandardMaterial color="#d2553a" roughness={0.6} flatShading />
    </mesh>
    <mesh position={[0, 0.0, 0.17]} castShadow>
      <boxGeometry args={[0.004, 0.06, 0.32]} />
      <meshStandardMaterial color="#d8dde2" metalness={0.85} roughness={0.25} />
    </mesh>
    {Array.from({length: 14}, (_, i) => (
      <mesh key={i} position={[0, -0.034, 0.025 + i * 0.022]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.004, 0.012, 0.012]} />
        <meshStandardMaterial color="#b9c0c7" metalness={0.85} roughness={0.3} />
      </mesh>
    ))}
  </group>
);

// ---------- Klingel ----------
const plateTex = (text: string, bg = '#f4efe2', ink = '#22252b') =>
  canvasTex(360, 110, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, 360, 110);
    g.strokeStyle = '#8f8a7c';
    g.lineWidth = 6;
    g.strokeRect(3, 3, 354, 104);
    g.fillStyle = ink;
    fitText(g, text, 180, 58, 320, 84, 800);
  });
export const NamePlate = ({text, w = 0.16, h = 0.05, bg, ink}: {text: string; w?: number; h?: number; bg?: string; ink?: string}) => (
  <group>
    <mesh position={[0, 0, -0.004]}>
      <boxGeometry args={[w + 0.012, h + 0.012, 0.006]} />
      <meshStandardMaterial color="#b89a52" metalness={0.7} roughness={0.35} />
    </mesh>
    <TextPlane draw={plateTex(text, bg, ink)} k={`Schild ${text} ${bg ?? ''}`} w={w} h={h} glow={0.25} />
  </group>
);
export const Doorbell = ({text = 'NACHBAR', press = 0}: {text?: string; press?: number}) => {
  const p = clamp(press);
  return (
    <group>
      <mesh position={[0, 0, 0.006]} castShadow>
        <boxGeometry args={[0.1, 0.2, 0.012]} />
        <meshStandardMaterial color="#d9dcdf" metalness={0.6} roughness={0.3} />
      </mesh>
      <group position={[0, 0.045, 0.013]}>
        <NamePlate text={text} w={0.082} h={0.04} />
      </group>
      <mesh position={[0, -0.04, 0.016 - 0.006 * p]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.024, 0.012, 16]} />
        <meshStandardMaterial color={p > 0.3 ? '#fff1a8' : '#f6f6f2'} emissive="#ffd23a" emissiveIntensity={1.6 * p} roughness={0.3} toneMapped={p < 0.3} />
      </mesh>
      {p > 0.05 && <pointLight position={[0, -0.04, 0.06]} intensity={0.25 * p} color="#ffe27a" distance={0.5} decay={1.8} />}
    </group>
  );
};

// ---------- Tageskalender ----------
const dayTex = (n: number) =>
  canvasTex(300, 360, (g) => {
    g.fillStyle = '#fbfaf6';
    g.fillRect(0, 0, 300, 360);
    g.fillStyle = '#c62f2a';
    g.fillRect(0, 0, 300, 92);
    g.fillStyle = '#ffffff';
    fitText(g, 'TAG', 150, 50, 240, 78, 800);
    g.fillStyle = '#20232a';
    fitText(g, String(n), 150, 232, 250, 230, 800);
  });
const DaySheet = ({n}: {n: number}) => <TextPlane draw={dayTex(n)} k={`Tag ${n}`} w={0.3} h={0.36} glow={0.3} />;
export const DayCalendar = ({day = 1}: {day?: number}) => {
  const n = Math.max(1, Math.floor(day + 1e-4));
  const frac = day - n;
  const flip = frac > 0.002 ? frac : 0;
  return (
    <group>
      <mesh position={[0, 0, -0.012]} castShadow>
        <boxGeometry args={[0.34, 0.42, 0.012]} />
        <meshStandardMaterial color="#5b4630" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.2, 0.002]}>
        <boxGeometry args={[0.34, 0.03, 0.02]} />
        <meshStandardMaterial color="#2c2f35" metalness={0.5} roughness={0.4} />
      </mesh>
      <group position={[0, -0.01, 0.0]}>
        <DaySheet n={flip > 0 ? n + 1 : n} />
      </group>
      {flip > 0 && (
        <group position={[0, 0.17, 0.004]} rotation={[-flip * 2.9, 0, 0]}>
          <group position={[0, -0.18, 0]}>
            <DaySheet n={n} />
          </group>
        </group>
      )}
    </group>
  );
};

// ---------- Wohnungstür mit Katzenklappe ----------
export const FLAT_DOOR = {w: 0.94, h: 2.05, t: 0.05, flap: {cx: 0.47, y0: 0.13, w: 0.44, h: 0.44}};
const flapPerimeter = () => {
  const {cx, y0, w, h} = FLAT_DOOR.flap;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  // Start unten links → hoch → oben nach rechts → runter → unten zurück
  return [
    [x0, y0],
    [x0, y0 + h],
    [x1, y0 + h],
    [x1, y0],
    [x0, y0],
  ] as [number, number][];
};
/** Punkt auf dem Klappen-Umriss (u 0 … 1) im Tür-System (x, y) */
export const flapCutPoint = (u: number): [number, number] => {
  const P = flapPerimeter();
  const seg = Math.min(3, Math.floor(clamp(u) * 4));
  const k = clamp(u) * 4 - seg;
  const a = P[seg];
  const b = P[seg + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
};
export const FlatDoor = ({open = 0, cut = 0, lid = 0, text, wood = false, time = 0, mirror = false}: {open?: number; cut?: number; lid?: number; text?: string; wood?: boolean; time?: number; /** gespiegelt: Tür liegt geschlossen entlang −x (Scharnier rechts, von vorn gesehen links) */ mirror?: boolean}) => {
  const {w, h, t, flap} = FLAT_DOOR;
  const leaf = wood ? '#8a5b36' : '#5f7f7a';
  const mats = useMemo(
    () => ({
      leaf: new THREE.MeshStandardMaterial({color: leaf, roughness: 0.6, flatShading: true}),
      panel: new THREE.MeshStandardMaterial({color: new THREE.Color(leaf).multiplyScalar(0.88).getStyle(), roughness: 0.6}),
      metal: new THREE.MeshStandardMaterial({color: '#c9ced3', metalness: 0.8, roughness: 0.25}),
      cut: new THREE.MeshBasicMaterial({color: '#1d1a17'}),
      dark: new THREE.MeshBasicMaterial({color: '#0f0d0c'}),
      dust: new THREE.MeshStandardMaterial({color: '#e3c58f', roughness: 1}),
    }),
    [leaf],
  );
  const ang = clamp(open) * 1.55;
  const done = cut >= 0.999;
  const fx0 = flap.cx - flap.w / 2;
  const fx1 = flap.cx + flap.w / 2;
  const fy1 = flap.y0 + flap.h;
  const parts: [number, number, number, number][] = [
    // x, y, breite, höhe (Mitte)
    [fx0 / 2, h / 2, fx0, h],
    [(fx1 + w) / 2, h / 2, w - fx1, h],
    [flap.cx, flap.y0 / 2, flap.w, flap.y0],
    [flap.cx, (fy1 + h) / 2, flap.w, h - fy1],
  ];
  const P = flapPerimeter();
  const cp = flapCutPoint(cut);
  return (
    <group scale={[mirror ? -1 : 1, 1, 1]}>
    <group rotation={[0, ang, 0]}>
      {parts.map(([x, y, pw, ph], i) => (
        <mesh key={i} material={mats.leaf} position={[x, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[pw, ph, t]} />
        </mesh>
      ))}
      {/* Füllungen (oben) */}
      {[1.05, 1.62].map((y) => (
        <mesh key={y} material={mats.panel} position={[w / 2, y, t / 2 + 0.003]}>
          <boxGeometry args={[w - 0.26, y < 1.3 ? 0.42 : 0.5, 0.006]} />
        </mesh>
      ))}
      {/* Klappe: vor dem Schnitt fest, danach oben angeschlagen */}
      <group position={[flap.cx, fy1, 0]} rotation={[done ? -clamp(lid) * 1.45 : 0, 0, 0]}>
        <mesh material={mats.leaf} position={[0, -flap.h / 2, 0]} castShadow>
          <boxGeometry args={[flap.w - (done ? 0.012 : 0), flap.h - (done ? 0.012 : 0), t * (done ? 0.8 : 1)]} />
        </mesh>
        {done && (
          <mesh material={mats.metal} position={[0, -flap.h + 0.05, t / 2 + 0.004]}>
            <boxGeometry args={[0.1, 0.022, 0.012]} />
          </mesh>
        )}
      </group>
      {/* dunkles Inneres hinter der offenen Klappe */}
      {done && lid > 0.02 && (
        <mesh material={mats.dark} position={[flap.cx, flap.y0 + flap.h / 2, -t / 2 - 0.25]}>
          <planeGeometry args={[flap.w * 0.98, flap.h * 0.98]} />
        </mesh>
      )}
      {/* Schnittlinie (wächst mit cut) */}
      {cut > 0.001 &&
        [0, 1, 2, 3].map((s) => {
          const k = clamp(cut * 4 - s);
          if (k <= 0) return null;
          const a = P[s];
          const b = P[s + 1];
          const ex = a[0] + (b[0] - a[0]) * k;
          const ey = a[1] + (b[1] - a[1]) * k;
          const len = Math.hypot(ex - a[0], ey - a[1]);
          const vert = s % 2 === 0;
          return (
            <mesh key={s} material={mats.cut} position={[(a[0] + ex) / 2, (a[1] + ey) / 2, t / 2 + 0.002]}>
              <planeGeometry args={[vert ? 0.012 : len + 0.012, vert ? len + 0.012 : 0.012]} />
            </mesh>
          );
        })}
      {/* Sägespäne am Schnittpunkt */}
      {cut > 0.005 && cut < 0.995 &&
        Array.from({length: 10}, (_, i) => {
          const r = rng(i * 31 + 7);
          const k = (time * 1.6 + i / 10) % 1;
          return (
            <mesh key={i} material={mats.dust} position={[cp[0] + (r() - 0.5) * 0.08 + (r() - 0.5) * 0.1 * k, cp[1] - k * Math.max(0.05, cp[1] - 0.02) * 0.9, t / 2 + 0.03 + r() * 0.06 * k]} scale={0.008 + r() * 0.008}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
          );
        })}
      {/* Türspion */}
      <mesh material={mats.metal} position={[w / 2, 1.5, t / 2 + 0.006]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.012, 10]} />
      </mesh>
      {/* Griff beidseitig + Schloss */}
      {[-1, 1].map((k) => (
        <group key={k} position={[w - 0.1, 1.02, k * (t / 2 + 0.02)]}>
          <mesh material={mats.metal}>
            <boxGeometry args={[0.035, 0.035, 0.04]} />
          </mesh>
          <mesh material={mats.metal} position={[-0.065, 0, k * 0.02]}>
            <boxGeometry args={[0.14, 0.026, 0.026]} />
          </mesh>
          <mesh material={mats.metal} position={[0, -0.12, 0]}>
            <boxGeometry args={[0.03, 0.06, 0.02]} />
          </mesh>
        </group>
      ))}
      {/* Namensschild */}
      {text && (
        <group position={[w / 2, 1.33, t / 2 + 0.008]} scale={[mirror ? -1 : 1, 1, 1]}>
          <NamePlate text={text} />
        </group>
      )}
    </group>
    </group>
  );
};

export const PAKET_FONT = T.font;
