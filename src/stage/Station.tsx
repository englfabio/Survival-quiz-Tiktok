import {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {T} from '../ui/theme';
import {useFontTexture} from '../actors/ToothProps';
import {Instances, Sky, type Inst} from './Forest';
import {std} from './Rooms';
import type {StageCam, StageDef} from './types';

/**
 * Bühne "bahnhof": Bahnsteig in einem großen Bahnhof (wiederverwendbar, z. B. auch für "Handy im Gleis").
 * Ohne echte Logos (kein Bahn-Logo, erfundene Ziele auf der Anzeigetafel).
 *
 * Koordinaten (1 Einheit = 1 Meter), Gleise laufen entlang der x-Achse:
 * - Bahnsteig (Gleis 3) auf y = 0 von der Bahnsteigkante z = 0 bis z = 9. Weiße Sicherheitslinie bei z = STATION.lineZ (0,8 m).
 *   Blindenleitstreifen bei z ≈ 1.15.
 * - Gleisbett auf y = STATION.trackY (−0,76): Gleis 3 Mitte z −1.75 (Schienen z −1.03 / −2.47), Gleis 2 Mitte z −6.5.
 *   Gegenüber Bahnsteig für Gleis 1/2 (z −8.6 … −13.5, y 0) mit Bänken + Anzeigetafel.
 *   Figuren/Gegenstände im Gleis: y relativ zum Gleisbett (groundHeight liefert −0,76 für z −8.6 … 0).
 * - Auf dem Bahnsteig: Bänke (−3.6, 7.3) und (8.2, 7.3) (Blick zum Gleis), Fahrkartenautomat (4.6, 7.9, Front zur Halle),
 *   Anzeigetafel hängend über (−1.2, 5.0) in 3,1 m Höhe (beidseitig), Gleisschild "3" an der Stütze, Mülleimer (6.4, 7.6),
 *   Stützen der Bahnsteighalle bei z 5.0 (x ±6.5, ±19.5, ±32.5). Freie Fläche für die Szene: x −3 … 4, z 1.5 … 6.
 * - Bahnhofshalle (Empfangshalle) dahinter: z 9 … 26, x −16 … 16, Boden y 0 (Steinfliesen), großes offenes Portal zum
 *   Bahnsteig (x −12 … 12, bis 7 m hoch). Fundbüro-Schalter an der Rückwand bei x STATION.lostFound.x (4.5), Theke bei z 25.
 *   Davor Platz für Figuren: (4.5, 24.2). Kiosk links (−9, 24.5), Info-Schild + Bahnhofsuhr.
 * - Großes Glas-Hallendach mit Stahlbögen über Gleisen + Bahnsteig (bis ca. 11 m hoch) → Kamera unter y ≈ 8 halten.
 *
 * Varianten: "bahnhof" = fast leer (Weit und breit niemand), "bahnhof-voll" = viele Reisende in der Halle (+ ein paar am
 * Bahnsteig in der Ferne). Atmo = "bahnhof-atmo".
 */
export const STATION = {
  trackY: -0.76,
  edgeZ: 0,
  lineZ: 0.8,
  platEnd: 9,
  track3Z: -1.75,
  track2Z: -6.5,
  farPlat: [-13.5, -8.6] as [number, number],
  hall: {z0: 9, z1: 26, x: 16, h: 9.5},
  lostFound: {x: 4.5, z: 25, standZ: 24.2},
  bench: [
    [-3.6, 7.3],
    [8.2, 7.3],
  ] as [number, number][],
  ticket: [4.6, 7.9] as [number, number],
  board: [-1.2, 5.0, 3.1] as [number, number, number],
  /** Variante "bahnsteig": Lautsprecher-Mast am Bahnsteig (Fuß) + Lautsprecher-Trichter (Mitte, Welt) */
  speakerMast: [-2.6, 2.7] as [number, number],
  speaker: [-2.6, 3.55, 2.45] as [number, number, number],
  /** Variante "bahnsteig": Fahrdraht der Oberleitung (Welt-y) und Mastreihe zwischen den Gleisen (z) */
  wireY: 4.55,
  catMastZ: -4.12,
};

const C = {
  skyTop: '#86b6dc',
  skyHorizon: '#eef0ea',
  fog: '#d9dcd8',
  plat: '#a9a7a1',
  platTile: ['#aeaca6', '#a3a19b', '#b3b1aa', '#9f9d97'],
  edge: '#d8d6cf',
  line: '#f7f7f2',
  tactile: '#c9c6bc',
  wall: '#6c6a66',
  gravel: ['#7a736b', '#6d675f', '#857e74', '#5f5a53'],
  sleeper: '#5e554c',
  rail: '#9aa0a6',
  steel: '#4c5b67',
  glass: '#cfe3ec',
  hallFloor: ['#d8cfbf', '#cdbfa9', '#e2d9c8', '#c4b49c'],
  hallWall: '#e7dccb',
  hallTrim: '#b9a78d',
  brick: '#b8664a',
  wood: '#8a5a36',
  sign: '#24456b',
};

const groundHeight = (_x: number, z: number) => (z < STATION.edgeZ && z > STATION.farPlat[1] ? STATION.trackY : 0);

const box = new THREE.BoxGeometry(1, 1, 1);
const boxBottom = (() => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return g;
})();

// ---------- Texturen (Anzeigetafel, Schilder) ----------
const boardTexture = () => {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#16294a';
  g.fillRect(0, 0, 1024, 256);
  g.fillStyle = '#f2f4f8';
  g.font = `800 64px ${T.font}`;
  g.textBaseline = 'middle';
  g.fillText('14:32', 34, 62);
  g.fillText('Nordhafen', 260, 62);
  g.font = `700 44px ${T.font}`;
  g.fillStyle = '#ffd21a';
  g.fillText('RE 7', 180, 64);
  g.fillStyle = '#c9d4e6';
  g.font = `600 36px ${T.font}`;
  g.fillText('über Lindenau – Bergheim – Altstadt', 260, 120);
  g.fillStyle = '#f2f4f8';
  g.font = `700 46px ${T.font}`;
  g.fillText('14:51   RB 3   Seestadt', 34, 196);
  // Gleisnummer rechts
  g.fillStyle = '#f2f4f8';
  g.fillRect(880, 28, 116, 200);
  g.fillStyle = '#16294a';
  g.font = `800 160px ${T.font}`;
  g.textAlign = 'center';
  g.fillText('3', 938, 134);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
const signTexture = (text: string, bg: string, fg: string, w = 1024, h = 256, icon = '') => () => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.font = `800 ${Math.round(h * 0.6)}px ${T.font}`;
  g.fillText(text, w / 2 + (icon ? h * 0.35 : 0), h / 2 + h * 0.03);
  if (icon === 'koffer') {
    // kleines Koffer-Symbol links
    const s = h * 0.5;
    const x0 = w / 2 - g.measureText(text).width / 2 - s * 0.6;
    const y0 = h / 2 - s * 0.38;
    g.fillStyle = fg;
    g.fillRect(x0 - s / 2, y0, s, s * 0.8);
    g.strokeStyle = fg;
    g.lineWidth = h * 0.05;
    g.strokeRect(x0 - s * 0.18, y0 - s * 0.22, s * 0.36, s * 0.24);
    g.fillStyle = bg;
    g.fillRect(x0 - s * 0.06, y0 + s * 0.15, s * 0.12, s * 0.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
const lostTex = signTexture('FUNDBÜRO', '#24456b', '#ffffff', 1024, 220, 'koffer');
const infoTex = signTexture('i', '#24456b', '#ffffff', 256, 256);
const kioskTex = signTexture('KIOSK', '#c8432e', '#fff6e6', 768, 220);
const ticketTex = signTexture('FAHRKARTEN', '#2a3f57', '#ffffff', 1024, 200);
const exitTex = signTexture('Ausgang · Stadt', '#24456b', '#ffffff', 1024, 200);

/** Material mit Schrift-Textur (erst sichtbar, wenn die Schrift geladen ist) */
const useTexMat = (draw: () => THREE.Texture, k: string, emissive: number, fallback = '#24456b') => {
  const tex = useFontTexture(draw, k);
  return useMemo(
    () =>
      tex
        ? new THREE.MeshStandardMaterial({map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: emissive, roughness: 0.5})
        : new THREE.MeshStandardMaterial({color: fallback}),
    [tex, emissive, fallback],
  );
};

const Textured = ({draw, k, w, h, emissive = 0.25}: {draw: () => THREE.Texture; k: string; w: number; h: number; emissive?: number}) => {
  const mat = useTexMat(draw, k, emissive);
  return (
    <mesh material={mat}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
};

// ---------- Gleise ----------
const useTrackLayout = () =>
  useMemo(() => {
    const r = rng(17);
    const gravel: Inst[] = [];
    const sleepers: Inst[] = [];
    for (const tz of [STATION.track3Z, STATION.track2Z]) {
      for (let x = -60; x < 60; x += 0.65) {
        sleepers.push({pos: [x, STATION.trackY + 0.06, tz], scale: [0.26, 0.12, 2.6], rotY: (r() - 0.5) * 0.02, color: C.sleeper});
      }
    }
    for (let i = 0; i < 1400; i++) {
      const x = -40 + r() * 80;
      const z = STATION.farPlat[1] + 0.2 + r() * (-STATION.farPlat[1] - 0.4);
      const s = 0.05 + r() * 0.08;
      gravel.push({pos: [x, STATION.trackY + 0.02, z], scale: [s * 1.4, s * 0.7, s * 1.2], rotY: r() * 6, color: C.gravel[Math.floor(r() * C.gravel.length)]});
    }
    return {gravel, sleepers};
  }, []);

const Rails = ({z}: {z: number}) => (
  <>
    {[-0.72, 0.72].map((o) => (
      <group key={o} position={[0, STATION.trackY + 0.2, z + o]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[140, 0.1, 0.07]} />
          <meshStandardMaterial color={C.rail} metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[140, 0.015, 0.075]} />
          <meshStandardMaterial color="#d5dadf" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>
    ))}
  </>
);

// ---------- Bahnsteig-Möbel ----------
export const StationBench = () => {
  const m = useMemo(() => ({wood: std(C.wood), metal: std('#3b4148', {metalness: 0.4, roughness: 0.5})}), []);
  return (
    <group>
      {[-0.7, 0.7].map((x) => (
        <group key={x}>
          <mesh material={m.metal} position={[x, 0.22, 0]} castShadow>
            <boxGeometry args={[0.06, 0.44, 0.42]} />
          </mesh>
          <mesh material={m.metal} position={[x, 0.66, -0.2]} rotation={[0.18, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 0.5, 0.05]} />
          </mesh>
        </group>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={`s${i}`} material={m.wood} position={[0, 0.46, -0.13 + i * 0.13]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.04, 0.11]} />
        </mesh>
      ))}
      {[0, 1].map((i) => (
        <mesh key={`b${i}`} material={m.wood} position={[0, 0.66 + i * 0.15, -0.22 - i * 0.03]} rotation={[0.18, 0, 0]} castShadow>
          <boxGeometry args={[1.8, 0.11, 0.035]} />
        </mesh>
      ))}
    </group>
  );
};

/** Fahrkartenautomat (neutral, ohne Logo): Ursprung = Boden Mitte, Front nach −z */
export const TicketMachine = () => {
  const m = useMemo(
    () => ({
      body: std('#e1e4e7', {roughness: 0.45}),
      dark: std('#2c3138'),
      screen: new THREE.MeshStandardMaterial({color: '#6fb6e8', emissive: '#4a9ad6', emissiveIntensity: 0.7, roughness: 0.3}),
      accent: std('#2b6cb0'),
      slot: std('#9aa3ad', {metalness: 0.5}),
    }),
    [],
  );
  return (
    <group>
      <mesh material={m.body} position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 1.7, 0.55]} />
      </mesh>
      <mesh material={m.accent} position={[0, 1.78, 0]} castShadow>
        <boxGeometry args={[0.82, 0.18, 0.58]} />
      </mesh>
      <mesh material={m.dark} position={[0, 1.3, -0.28]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.6, 0.45, 0.04]} />
      </mesh>
      <mesh material={m.screen} position={[0, 1.3, -0.305]} rotation={[-0.2, Math.PI, 0]}>
        <planeGeometry args={[0.5, 0.36]} />
      </mesh>
      {/* Tastenfeld, Kartenschlitz, Ausgabefach */}
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <mesh key={`${r}${c}`} material={m.slot} position={[-0.2 + c * 0.06, 0.98 - r * 0.06, -0.285]}>
            <boxGeometry args={[0.045, 0.045, 0.02]} />
          </mesh>
        )),
      )}
      <mesh material={m.dark} position={[0.18, 0.95, -0.285]}>
        <boxGeometry args={[0.14, 0.03, 0.02]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.45, -0.28]}>
        <boxGeometry args={[0.45, 0.16, 0.03]} />
      </mesh>
      <group position={[0, 1.78, -0.296]} rotation={[0, Math.PI, 0]}>
        <Textured draw={ticketTex} k="Fahrkarten" w={0.76} h={0.15} emissive={0.4} />
      </group>
    </group>
  );
};

/** hängende Anzeigetafel (beidseitig), Ursprung = Unterkante Mitte */
export const DepartureBoard = () => {
  const face = useTexMat(boardTexture, 'Anzeigetafel', 0.55, '#16294a');
  const m = useMemo(() => ({frame: std('#2a3038', {metalness: 0.4, roughness: 0.5})}), []);
  return (
    <group>
      <mesh material={m.frame} position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[3.0, 0.8, 0.16]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={face} position={[0, 0.4, s * 0.085]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[2.86, 0.7]} />
        </mesh>
      ))}
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} material={m.frame} position={[x, 2.0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 2.4, 6]} />
        </mesh>
      ))}
    </group>
  );
};

const TrashBin = () => (
  <group>
    <mesh position={[0, 0.45, 0]} castShadow>
      <cylinderGeometry args={[0.22, 0.2, 0.9, 10]} />
      <meshStandardMaterial color="#4f5a63" flatShading metalness={0.3} roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.92, 0]}>
      <cylinderGeometry args={[0.24, 0.24, 0.06, 10]} />
      <meshStandardMaterial color="#e3b505" flatShading />
    </mesh>
  </group>
);

/** Stütze der Bahnsteighalle (Stahl), Ursprung = Boden */
const Pillar = ({h = 6.4}: {h?: number}) => (
  <group>
    <mesh position={[0, h / 2, 0]} castShadow>
      <boxGeometry args={[0.3, h, 0.3]} />
      <meshStandardMaterial color={C.steel} flatShading metalness={0.35} roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.15, 0]}>
      <boxGeometry args={[0.46, 0.3, 0.46]} />
      <meshStandardMaterial color="#3d4a55" flatShading />
    </mesh>
  </group>
);

// ---------- Hallendach über Gleisen + Bahnsteig (Glas mit Stahlbögen) ----------
const ROOF_Z0 = -15;
const ROOF_Z1 = 9;
const archY = (z: number) => {
  const c = (ROOF_Z0 + ROOF_Z1) / 2;
  const hw = (ROOF_Z1 - ROOF_Z0) / 2;
  const u = (z - c) / hw;
  return 6.6 + 4.6 * Math.sqrt(Math.max(0, 1 - u * u));
};
const ShedRoof = () => {
  const {rib, glass} = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const z = ROOF_Z0 + ((ROOF_Z1 - ROOF_Z0) * i) / 32;
      pts.push(new THREE.Vector3(0, archY(z), z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const rib = new THREE.TubeGeometry(curve, 48, 0.12, 5, false);
    // Glasfläche: Bogen entlang x extrudiert
    const g = new THREE.PlaneGeometry(1, 1, 1, 32);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getY(i) + 0.5; // 0 … 1
      const z = ROOF_Z0 + (ROOF_Z1 - ROOF_Z0) * u;
      pos.setXYZ(i, pos.getX(i) * 140, archY(z) + 0.05, z);
    }
    g.computeVertexNormals();
    return {rib, glass: g};
  }, []);
  return (
    <>
      <mesh geometry={glass} renderOrder={2}>
        <meshStandardMaterial color={C.glass} transparent opacity={0.28} roughness={0.15} metalness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {Array.from({length: 23}, (_, i) => -66 + i * 6).map((x) => (
        <mesh key={x} geometry={rib} position={[x, 0, 0]}>
          <meshStandardMaterial color={C.steel} flatShading metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {/* Längsträger */}
      {[-11, -5, 2, 7].map((z) => (
        <mesh key={z} position={[0, archY(z) - 0.05, z]}>
          <boxGeometry args={[140, 0.1, 0.1]} />
          <meshStandardMaterial color={C.steel} />
        </mesh>
      ))}
    </>
  );
};

// ---------- Bahnhofshalle ----------
const Hall = () => {
  const {z0, z1, x: hx, h} = STATION.hall;
  const r = useMemo(() => rng(29), []);
  const tiles = useMemo(() => {
    const out: Inst[] = [];
    const rr = rng(31);
    for (let z = z0 + 0.5; z < z1; z += 1.0)
      for (let x = -hx + 0.5; x < hx; x += 1.0)
        out.push({pos: [x, 0.0, z], scale: [0.97, 0.02, 0.97], rotY: 0, color: (Math.round(x - 0.5) + Math.round(z - 0.5)) % 2 === 0 ? C.hallFloor[0] : C.hallFloor[1 + Math.floor(rr() * 3)]});
    return out;
  }, [z0, z1, hx, r]);
  const m = useMemo(
    () => ({
      wall: std(C.hallWall, {roughness: 0.9}),
      trim: std(C.hallTrim, {roughness: 0.9}),
      brick: std(C.brick, {roughness: 0.95}),
      win: new THREE.MeshStandardMaterial({color: '#cfe6f2', emissive: '#bfdcef', emissiveIntensity: 0.55, roughness: 0.2, side: THREE.DoubleSide}),
      frame: std('#3d4a55'),
      wood: std(C.wood),
      glass: new THREE.MeshStandardMaterial({color: '#bcd7e4', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false}),
      lamp: new THREE.MeshStandardMaterial({color: '#fff3d6', emissive: '#ffe7b0', emissiveIntensity: 1.0, side: THREE.DoubleSide}),
      dark: std('#2c3138'),
    }),
    [],
  );
  const W = hx * 2;
  return (
    <group>
      <Instances geometry={boxBottom} items={tiles} castShadow={false} />
      {/* Rückwand mit großem Rundbogenfenster oben */}
      <mesh material={m.wall} position={[0, h / 2, z1 + 0.25]} receiveShadow>
        <boxGeometry args={[W, h, 0.5]} />
      </mesh>
      <mesh material={m.win} position={[0, 6.6, z1 - 0.02]}>
        <circleGeometry args={[3.2, 24, 0, Math.PI]} />
      </mesh>
      <mesh material={m.win} position={[0, 5.5, z1 - 0.02]}>
        <planeGeometry args={[6.4, 2.2]} />
      </mesh>
      {[-2.1, -1.05, 0, 1.05, 2.1].map((x) => (
        <mesh key={x} material={m.frame} position={[x, 6.4, z1 - 0.04]}>
          <boxGeometry args={[0.07, 4.6, 0.04]} />
        </mesh>
      ))}
      {/* Seitenwände mit hohen Fenstern */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={m.wall} position={[s * (hx + 0.25), h / 2, (z0 + z1) / 2]} receiveShadow>
            <boxGeometry args={[0.5, h, z1 - z0]} />
          </mesh>
          {[12.5, 17.5, 22.5].map((z) => (
            <mesh key={z} material={m.win} position={[s * (hx - 0.02), 5.2, z]} rotation={[0, -s * Math.PI / 2, 0]}>
              <planeGeometry args={[2.2, 4.5]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Portal zum Bahnsteig: Wand oben + Pfeiler links/rechts */}
      <mesh material={m.wall} position={[0, (7 + h) / 2, z0 - 0.25]}>
        <boxGeometry args={[W + 1, h - 7, 0.5]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`p${s}`} material={m.wall} position={[s * 14, 3.5, z0 - 0.25]}>
          <boxGeometry args={[4, 7, 0.5]} />
        </mesh>
      ))}
      <mesh material={m.trim} position={[0, 7.05, z0 - 0.55]}>
        <boxGeometry args={[24.4, 0.3, 0.2]} />
      </mesh>
      {/* Decke */}
      <mesh material={m.trim} position={[0, h + 0.05, (z0 + z1) / 2]}>
        <boxGeometry args={[W + 1, 0.1, z1 - z0 + 0.5]} />
      </mesh>
      {/* Hängelampen */}
      {[-8, 0, 8].map((x) =>
        [13, 19].map((z) => (
          <group key={`${x}-${z}`} position={[x, h - 2.2, z]}>
            <mesh material={m.dark} position={[0, 1.1, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 2.2, 4]} />
            </mesh>
            <mesh material={m.lamp}>
              <sphereGeometry args={[0.32, 10, 8]} />
            </mesh>
          </group>
        )),
      )}
      {/* Fundbüro: Schalter mit Theke, Glasscheibe, Schild */}
      <group position={[STATION.lostFound.x, 0, z1]}>
        <mesh material={m.brick} position={[0, 1.6, -0.1]}>
          <boxGeometry args={[4.2, 3.2, 0.2]} />
        </mesh>
        <mesh material={m.dark} position={[0, 1.55, -0.21]}>
          <boxGeometry args={[3.2, 1.3, 0.02]} />
        </mesh>
        <mesh material={m.lamp} position={[0, 1.55, -0.225]} scale={[1, 1, 1]}>
          <planeGeometry args={[3.1, 1.2]} />
        </mesh>
        <mesh material={m.glass} position={[0, 1.55, -0.85]}>
          <boxGeometry args={[3.2, 1.25, 0.02]} />
        </mesh>
        <mesh material={m.wood} position={[0, 0.5, -0.65]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 1.0, 0.7]} />
        </mesh>
        <mesh material={m.trim} position={[0, 1.03, -0.7]} castShadow>
          <boxGeometry args={[3.6, 0.06, 0.85]} />
        </mesh>
        {/* Regal mit Fundsachen hinter der Scheibe (Schirm, Taschen, Koffer) */}
        {[
          ['#c8432e', -1.0, 0.25, 0.3],
          ['#2e6fa3', -0.4, 0.3, 0.22],
          ['#3c8a5a', 0.3, 0.22, 0.34],
          ['#d9a521', 0.95, 0.26, 0.2],
        ].map(([col, x, w, hh], i) => (
          <mesh key={i} position={[x as number, 1.15 + (hh as number) / 2, -0.4]}>
            <boxGeometry args={[w as number, hh as number, 0.2]} />
            <meshStandardMaterial color={col as string} flatShading />
          </mesh>
        ))}
        <group position={[0, 2.85, -0.22]} rotation={[0, Math.PI, 0]}>
          <Textured draw={lostTex} k="Fundbuero" w={3.4} h={0.73} emissive={0.45} />
        </group>
      </group>
      {/* Kiosk links */}
      <group position={[-9, 0, z1]}>
        <mesh material={m.wall} position={[0, 1.4, -1.1]} castShadow>
          <boxGeometry args={[4.2, 2.8, 2.0]} />
        </mesh>
        <mesh material={m.lamp} position={[0, 1.35, -2.11]}>
          <planeGeometry args={[3.4, 1.2]} />
        </mesh>
        {Array.from({length: 8}, (_, i) => (
          <mesh key={i} position={[-1.5 + i * 0.43, 1.0 + (i % 2) * 0.35, -2.13]}>
            <boxGeometry args={[0.3, 0.26, 0.04]} />
            <meshStandardMaterial color={['#e8c34a', '#d0503a', '#4a87c5', '#f0efe8'][i % 4]} flatShading />
          </mesh>
        ))}
        <mesh material={m.wood} position={[0, 0.5, -2.3]} castShadow>
          <boxGeometry args={[3.8, 1.0, 0.4]} />
        </mesh>
        <group position={[0, 3.1, -2.12]} rotation={[0, Math.PI, 0]}>
          <Textured draw={kioskTex} k="Kiosk" w={2.6} h={0.74} emissive={0.4} />
        </group>
      </group>
      {/* Info-Schild + Bahnhofsuhr + Ausgang */}
      <group position={[-1.6, 4.6, z1 - 0.02]} rotation={[0, Math.PI, 0]}>
        <Textured draw={infoTex} k="Info" w={0.9} h={0.9} emissive={0.4} />
      </group>
      <group position={[-12.5, 4.0, z1 - 0.02]} rotation={[0, Math.PI, 0]}>
        <Textured draw={exitTex} k="Ausgang" w={3.6} h={0.7} emissive={0.4} />
      </group>
      <StationClock position={[-4.5, 5.0, z1 - 0.06]} />
      {/* Bänke in der Halle */}
      {[
        [-6, 15],
        [10, 15.5],
      ].map(([x, z]) => (
        <group key={`${x}`} position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
          <StationBench />
        </group>
      ))}
      {/* Säulen in der Halle */}
      {[-11, 11].map((x) =>
        [14, 20].map((z) => (
          <mesh key={`${x}${z}`} material={m.trim} position={[x, h / 2, z]} castShadow>
            <cylinderGeometry args={[0.35, 0.4, h, 10]} />
          </mesh>
        )),
      )}
    </group>
  );
};

/** Bahnhofsuhr (zur Seite −z), zeigt 14:27 */
export const StationClock = ({position}: {position: [number, number, number]}) => (
  <group position={position} rotation={[0, Math.PI, 0]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.55, 0.55, 0.08, 24]} />
      <meshStandardMaterial color="#2c3138" flatShading />
    </mesh>
    <mesh position={[0, 0, 0.045]}>
      <circleGeometry args={[0.5, 32]} />
      <meshStandardMaterial color="#f7f6f1" emissive="#ffffff" emissiveIntensity={0.2} />
    </mesh>
    {Array.from({length: 12}, (_, i) => (
      <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * 0.42, Math.cos((i / 12) * Math.PI * 2) * 0.42, 0.05]} rotation={[0, 0, -(i / 12) * Math.PI * 2]}>
        <planeGeometry args={[0.035, 0.1]} />
        <meshBasicMaterial color="#151515" />
      </mesh>
    ))}
    {/* Stundenzeiger (2:27 ≈ 74°), Minutenzeiger (27 min = 162°) */}
    <mesh position={[Math.sin(1.29) * 0.13, Math.cos(1.29) * 0.13, 0.055]} rotation={[0, 0, -1.29]}>
      <planeGeometry args={[0.05, 0.28]} />
      <meshBasicMaterial color="#151515" />
    </mesh>
    <mesh position={[Math.sin(2.83) * 0.19, Math.cos(2.83) * 0.19, 0.056]} rotation={[0, 0, -2.83]}>
      <planeGeometry args={[0.035, 0.4]} />
      <meshBasicMaterial color="#151515" />
    </mesh>
  </group>
);

// ---------- Reisende (stilisiert, ohne Gesicht) ----------
const COATS = ['#5a6b80', '#3f6fa6', '#7a4b6d', '#8a6b3f', '#4d7a5a', '#a0473c', '#5e5e70', '#c08a3a', '#2f5d6e', '#6d5a8a'];
const SKINS = ['#e2b48c', '#a8714f', '#f0c9a4', '#7a4f36', '#d9a07a'];
const HAIRS = ['#3b2a20', '#2a2220', '#d9b46a', '#8a4b2a', '#b9b4ab', '#151515'];

/**
 * Reisende/r: einfache Figur mit Gehbewegung (Beine + Arme schwingen), optional Rollkoffer hinter sich.
 * Ursprung = Boden, Blick nach +z. walk = Gehzeit in Sekunden (0 = steht).
 */
export const Passenger = ({coat, skin, hair, pants = '#2f3542', h = 1, walk = 0, bag = ''}: {coat: string; skin: string; hair: string; pants?: string; h?: number; walk?: number; bag?: string}) => {
  const m = useMemo(() => ({coat: std(coat), skin: std(skin), hair: std(hair), pants: std(pants), bag: std(bag || '#333')}), [coat, skin, hair, pants, bag]);
  const ph = walk * Math.PI * 2 * 0.95;
  const sw = walk > 0 ? Math.sin(ph) * 0.42 : 0;
  const bob = walk > 0 ? Math.abs(Math.cos(ph)) * 0.025 : 0;
  return (
    <group scale={h}>
      <group position={[0, bob, 0]}>
        {[-1, 1].map((k) => (
          <group key={k} position={[k * 0.09, 0.84, 0]} rotation={[k * sw, 0, 0]}>
            <mesh material={m.pants} position={[0, -0.42, 0]} castShadow>
              <cylinderGeometry args={[0.075, 0.065, 0.84, 7]} />
            </mesh>
          </group>
        ))}
        <mesh material={m.coat} position={[0, 1.12, 0]} scale={[1, 1, 0.7]} castShadow>
          <cylinderGeometry args={[0.2, 0.18, 0.62, 8]} />
        </mesh>
        <mesh material={m.coat} position={[0, 1.42, 0]} scale={[1, 0.5, 0.7]} castShadow>
          <sphereGeometry args={[0.2, 8, 6]} />
        </mesh>
        <mesh material={m.skin} position={[0, 1.6, 0]} castShadow>
          <icosahedronGeometry args={[0.11, 1]} />
        </mesh>
        <mesh material={m.hair} position={[0, 1.66, -0.02]} scale={[1.05, 0.7, 1.05]}>
          <icosahedronGeometry args={[0.11, 1]} />
        </mesh>
        {[-1, 1].map((k) => (
          <group key={`a${k}`} position={[k * 0.24, 1.4, 0]} rotation={[bag && k < 0 ? -0.35 : -k * sw * 0.8, 0, k * 0.08]}>
            <mesh material={m.coat} position={[0, -0.3, 0]} castShadow>
              <cylinderGeometry args={[0.055, 0.05, 0.6, 6]} />
            </mesh>
          </group>
        ))}
      </group>
      {bag && (
        <group position={[-0.3, 0, -0.42]} rotation={[-0.45, 0, 0]}>
          <mesh material={m.bag} position={[0, 0.33, 0]} castShadow>
            <boxGeometry args={[0.36, 0.56, 0.22]} />
          </mesh>
          <mesh material={m.bag} position={[0, 0.82, 0.02]}>
            <boxGeometry args={[0.03, 0.44, 0.03]} />
          </mesh>
        </group>
      )}
    </group>
  );
};

type Walker = {x: number; z: number; ax: number; az: number; len: number; speed: number; phase: number; coat: string; skin: string; hair: string; h: number; bag: string; stand: boolean; face: number};

/** Menschenmenge: Leute gehen auf Bahnen hin und her (frei bleibt der Gang x −1 … 6.5 zum Fundbüro) */
const useCrowd = (full: boolean) =>
  useMemo(() => {
    const r = rng(full ? 73 : 74);
    const pick = <X,>(a: X[]) => a[Math.floor(r() * a.length)];
    const out: Walker[] = [];
    const add = (w: Partial<Walker> & {x: number; z: number}) =>
      out.push({
        ax: 1,
        az: 0,
        len: 0,
        speed: 1.1 + r() * 0.4,
        phase: r() * 30,
        coat: pick(COATS),
        skin: pick(SKINS),
        hair: pick(HAIRS),
        h: 0.94 + r() * 0.12,
        bag: r() < 0.3 ? pick(['#2b2f36', '#8a2f2f', '#2f4f7a', '#556b2f']) : '',
        stand: false,
        face: 0,
        ...w,
      });
    if (full) {
      // Laufbahnen quer durch die Halle: vorn (z < 14) links und rechts vom Gang, weiter hinten über die ganze Breite
      for (const z of [10.6, 12.0, 13.4]) {
        add({x: -9 + r() * 2, z, ax: 1, az: 0, len: 9});
        add({x: 10.5 + r() * 1.5, z: z + 0.6, ax: 1, az: 0, len: 6});
      }
      for (const z of [15.4, 16.6, 17.8, 19.0, 20.4, 21.8, 23.2]) {
        add({x: -7 + r() * 4, z, ax: 1, az: 0, len: 14});
        add({x: 7 + r() * 4, z: z + 0.4, ax: 1, az: 0, len: 12});
      }
      for (const x of [-13.5, -11.8, -7.8, -3.2, -1.6, 7.4, 8.8, 12.5, 14.2]) add({x, z: 17, ax: 0, az: 1, len: 12});
      // Wartende direkt neben dem Gang zum Fundbüro
      for (const [x, z] of [[-1.4, 10.8], [-1.9, 12.6], [-1.2, 14.4], [6.6, 11.2], [7.2, 13.0], [6.4, 14.8], [-2.6, 11.6], [7.9, 10.4]] as [number, number][])
        add({x, z, stand: true, face: r() * 360});
      // Wartende mit Koffern / am Kiosk
      for (let i = 0; i < 14; i++) {
        const left = r() < 0.6;
        const x = left ? -14.5 + r() * 12.5 : 7.5 + r() * 7.5;
        add({x, z: 10.5 + r() * 14, stand: true, face: r() * 360});
      }
      // ein paar Reisende weit hinten am Bahnsteig
      for (const x of [-24, -19, 21, 27]) add({x, z: 3 + r() * 4, stand: r() < 0.5, ax: 1, az: 0, len: 6, face: 90 + r() * 180});
    } else {
      // fast leer: zwei, drei Leute ganz hinten in der Halle
      add({x: -11, z: 23.5, ax: 1, az: 0, len: 6, speed: 0.9});
      add({x: 12.5, z: 21, stand: true, face: 200});
    }
    return out;
  }, [full]);

const Crowd = ({full}: {full: boolean}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const walkers = useCrowd(full);
  return (
    <>
      {walkers.map((w, i) => {
        if (w.stand) {
          return (
            <group key={i} position={[w.x, 0, w.z]} rotation={[0, ((w.face + Math.sin(t * 0.3 + i) * 6) * Math.PI) / 180, 0]}>
              <Passenger coat={w.coat} skin={w.skin} hair={w.hair} h={w.h} bag={w.bag} />
            </group>
          );
        }
        // Hin und her (Dreieckswelle), dreht am Ende um
        const d = (t * w.speed + w.phase) % (2 * w.len);
        const fwd = d < w.len;
        const s = (fwd ? d : 2 * w.len - d) - w.len / 2;
        const x = w.x + w.ax * s;
        const z = w.z + w.az * s;
        const yaw = Math.atan2(w.ax * (fwd ? 1 : -1), w.az * (fwd ? 1 : -1));
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, yaw, 0]}>
            <Passenger coat={w.coat} skin={w.skin} hair={w.hair} h={w.h} bag={w.bag} walk={(t * w.speed) / 1.3 + w.phase} />
          </group>
        );
      })}
    </>
  );
};

// ---------- Gegenüberliegender Bahnsteig ----------
const FarPlatform = () => {
  const [z1, z0] = STATION.farPlat;
  return (
    <group>
      <mesh position={[0, -0.38, (z0 + z1) / 2]} receiveShadow>
        <boxGeometry args={[140, 0.76, z0 - z1]} />
        <meshStandardMaterial color={C.plat} flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.005, z0 - 0.18]}>
        <boxGeometry args={[140, 0.012, 0.36]} />
        <meshStandardMaterial color={C.edge} />
      </mesh>
      <mesh position={[0, 0.008, z0 - 0.8]}>
        <boxGeometry args={[140, 0.01, 0.1]} />
        <meshStandardMaterial color={C.line} />
      </mesh>
      {[-30, -18, 6, 18, 30].map((x) => (
        <group key={x} position={[x, 0, -11.6]} rotation={[0, Math.PI, 0]}>
          <StationBench />
        </group>
      ))}
      {[-26, -13, 0, 13, 26].map((x) => (
        <group key={`p${x}`} position={[x, 0, -11]}>
          <Pillar />
        </group>
      ))}
      <group position={[4, 3.1, -11]} rotation={[0, Math.PI, 0]}>
        <DepartureBoard />
      </group>
      {/* Wand hinter dem Bahnsteig */}
      <mesh position={[0, 3, z1 - 0.3]}>
        <boxGeometry args={[140, 7, 0.5]} />
        <meshStandardMaterial color="#c9bba6" flatShading roughness={0.95} />
      </mesh>
      {Array.from({length: 14}, (_, i) => -65 + i * 10).map((x) => (
        <mesh key={`w${x}`} position={[x, 3.6, z1 - 0.04]}>
          <planeGeometry args={[3.2, 2.8]} />
          <meshStandardMaterial color="#b9d4e2" emissive="#a9cbe0" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- Oberleitung + Lautsprecher (Variante "bahnsteig") ----------
/**
 * Oberleitung über Gleis 3 und Gleis 2: Masten zwischen den Gleisen (z STATION.catMastZ) mit Auslegern, Tragseil, Hängern
 * und Fahrdraht (Welt-y STATION.wireY, ca. 5,3 m über dem Gleisbett). Ohne Logos. Wiederverwendbar für alle Gleis-Szenen.
 */
export const Catenary = ({xs = [-54, -30, -6, 18, 42]}: {xs?: number[]}) => {
  const m = useMemo(
    () => ({
      mast: new THREE.MeshStandardMaterial({color: '#6f7b84', flatShading: true, metalness: 0.4, roughness: 0.5}),
      wire: new THREE.MeshStandardMaterial({color: '#2b2f33', roughness: 0.6, metalness: 0.3}),
      iso: new THREE.MeshStandardMaterial({color: '#8b5a3c', roughness: 0.5}),
    }),
    [],
  );
  const wy = STATION.wireY;
  const my = wy + 1.35; // Tragseil an den Masten
  const tracks = [STATION.track3Z, STATION.track2Z];
  const droppers = useMemo(() => {
    const out: Inst[] = [];
    for (const tz of tracks)
      for (let x = -70; x < 70; x += 4.5) {
        // Tragseil hängt zwischen den Masten durch → Hänger unterschiedlich lang
        const nearest = xs.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
        const span = 24;
        const u = clamp01(Math.abs(x - nearest) / (span / 2));
        const top = my - 0.95 * (u * (2 - u));
        const len = Math.max(0.12, top - wy);
        out.push({pos: [x, wy, tz], scale: [0.02, len, 0.02], rotY: 0, color: '#3a3f44'});
      }
    return out;
  }, [xs]);
  const sag = useMemo(() => {
    // Tragseil als Kette kurzer Stücke
    const out: Inst[] = [];
    for (const tz of tracks)
      for (let x = -70; x < 70; x += 1.5) {
        const nearest = xs.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
        const u = clamp01(Math.abs(x - nearest) / 12);
        out.push({pos: [x, my - 0.95 * (u * (2 - u)), tz], scale: [1.52, 0.025, 0.025], rotY: 0, color: '#2b2f33'});
      }
    return out;
  }, [xs]);
  return (
    <group>
      {/* Fahrdrähte */}
      {tracks.map((tz) => (
        <mesh key={tz} material={m.wire} position={[0, wy, tz]}>
          <boxGeometry args={[140, 0.028, 0.028]} />
        </mesh>
      ))}
      <Instances geometry={boxBottom} items={droppers} castShadow={false} />
      <Instances geometry={box} items={sag} castShadow={false} />
      {xs.map((x) => (
        <group key={x} position={[x, STATION.trackY, STATION.catMastZ]}>
          {/* Mast (Doppel-T-Profil) */}
          <mesh material={m.mast} position={[0, (my - STATION.trackY + 0.6) / 2, 0]} castShadow>
            <boxGeometry args={[0.32, my - STATION.trackY + 0.6, 0.22]} />
          </mesh>
          <mesh material={m.mast} position={[0, 0.25, 0]}>
            <boxGeometry args={[0.6, 0.5, 0.6]} />
          </mesh>
          {/* Ausleger zu beiden Gleisen */}
          {tracks.map((tz) => {
            const dz = tz - STATION.catMastZ;
            return (
              <group key={tz}>
                <mesh material={m.mast} position={[0, my - STATION.trackY, dz / 2]}>
                  <boxGeometry args={[0.07, 0.07, Math.abs(dz) + 0.2]} />
                </mesh>
                <mesh material={m.mast} position={[0, wy - STATION.trackY + 0.35, dz / 2]} rotation={[Math.sign(dz) * -0.18, 0, 0]}>
                  <boxGeometry args={[0.06, 0.06, Math.abs(dz) + 0.1]} />
                </mesh>
                <mesh material={m.iso} position={[0, my - STATION.trackY, Math.sign(dz) * 0.35]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
                </mesh>
                <mesh material={m.wire} position={[0, (my + wy) / 2 - STATION.trackY, dz]}>
                  <boxGeometry args={[0.03, my - wy, 0.03]} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Schlanker Mast am Bahnsteig mit Lautsprecher-Trichter (für Durchsagen) + kleiner Lampe. Ursprung = Fuß am Boden.
 * Der Trichter sitzt 3,55 m hoch und zeigt schräg zur Bahnsteigmitte (Welt-Lage: STATION.speaker).
 */
export const SpeakerMast = () => {
  const m = useMemo(
    () => ({
      pole: new THREE.MeshStandardMaterial({color: '#4c5b67', flatShading: true, metalness: 0.4, roughness: 0.5}),
      horn: new THREE.MeshStandardMaterial({color: '#d9dcdf', flatShading: true, roughness: 0.45}),
      dark: new THREE.MeshStandardMaterial({color: '#2a2f35', roughness: 0.6}),
      lamp: new THREE.MeshStandardMaterial({color: '#fff6dc', emissive: '#ffe9b0', emissiveIntensity: 0.6}),
    }),
    [],
  );
  return (
    <group>
      <mesh material={m.pole} position={[0, 2.1, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 4.2, 8]} />
      </mesh>
      <mesh material={m.pole} position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.24, 8]} />
      </mesh>
      {/* Lautsprecher: Halter + Trichter, zeigt nach vorn (−z) und leicht nach unten */}
      <group position={[0, 3.55, -0.12]} rotation={[0.35, 0, 0]}>
        <mesh material={m.pole} position={[0, 0, 0.08]}>
          <boxGeometry args={[0.06, 0.06, 0.16]} />
        </mesh>
        <mesh material={m.dark} position={[0, 0, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.08, 0.12, 10]} />
        </mesh>
        <mesh material={m.horn} position={[0, 0, -0.2]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.23, 0.06, 0.28, 12, 1, true]} />
        </mesh>
        <mesh material={m.dark} position={[0, 0, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.1, 12]} />
        </mesh>
      </group>
      {/* Lampe oben */}
      <mesh material={m.pole} position={[0, 4.2, -0.25]}>
        <boxGeometry args={[0.06, 0.06, 0.5]} />
      </mesh>
      <mesh material={m.lamp} position={[0, 4.15, -0.5]}>
        <boxGeometry args={[0.18, 0.06, 0.3]} />
      </mesh>
    </group>
  );
};

// ---------- Szene ----------
const StationScene = ({full, platform = false}: {full: boolean; platform?: boolean; cam?: StageCam}) => {
  const L = useTrackLayout();
  const tiles = useMemo(() => {
    const r = rng(9);
    const out: Inst[] = [];
    for (let z = 0.45; z < STATION.platEnd; z += 0.6)
      for (let x = -60; x < 60; x += 0.6) {
        if (z < 1.5) continue;
        out.push({pos: [x + 0.3, -0.012, z + 0.3], scale: [0.58, 0.02, 0.58], rotY: 0, color: C.platTile[Math.floor(r() * C.platTile.length)]});
      }
    return out;
  }, []);
  const ribs = useMemo(() => {
    const out: Inst[] = [];
    for (let x = -60; x < 60; x += 0.12) out.push({pos: [x, 0, 1.15], scale: [0.05, 0.012, 0.3], rotY: 0, color: '#e8e6de'});
    return out;
  }, []);
  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 45, 140]} />
      <Sky c={C} />
      <hemisphereLight args={['#eef4ff', '#7a7468', 1.05]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[-8, 18, -6]}
        intensity={2.3}
        color="#fff0d6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
      {/* warmes Licht aus der Halle */}
      <pointLight position={[0, 6, 17]} intensity={60} distance={30} color="#ffe2b0" />
      {/* Bahnsteig: Körper + Fliesen + Kante + Sicherheitslinie + Leitstreifen */}
      <mesh position={[0, -0.39, STATION.platEnd / 2]} receiveShadow>
        <boxGeometry args={[140, 0.76, STATION.platEnd]} />
        <meshStandardMaterial color={C.plat} flatShading roughness={0.95} />
      </mesh>
      <Instances geometry={boxBottom} items={tiles} castShadow={false} />
      <mesh position={[0, -0.01, 0.2]} receiveShadow>
        <boxGeometry args={[140, 0.03, 0.4]} />
        <meshStandardMaterial color={C.edge} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.006, STATION.lineZ]}>
        <boxGeometry args={[140, 0.014, platform ? 0.25 : 0.12]} />
        <meshStandardMaterial color={C.line} emissive="#ffffff" emissiveIntensity={platform ? 0.85 : 0.15} />
      </mesh>
      <mesh position={[0, -0.002, 1.15]}>
        <boxGeometry args={[140, 0.012, 0.3]} />
        <meshStandardMaterial color={C.tactile} />
      </mesh>
      <Instances geometry={boxBottom} items={ribs} castShadow={false} />
      {/* Fläche zwischen Kante und Fliesen */}
      <mesh position={[0, -0.012, 0.95]}>
        <boxGeometry args={[140, 0.02, 1.1]} />
        <meshStandardMaterial color={platform ? '#9c9a94' : '#b9b7b0'} roughness={0.95} />
      </mesh>
      {/* Gleisbett */}
      <mesh position={[0, STATION.trackY, (STATION.farPlat[1] + 0) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, -STATION.farPlat[1]]} />
        <meshStandardMaterial color="#6f685f" roughness={1} />
      </mesh>
      <Instances geometry={box} items={L.gravel} castShadow={false} />
      <Instances geometry={box} items={L.sleepers} />
      <Rails z={STATION.track3Z} />
      <Rails z={STATION.track2Z} />
      <FarPlatform />
      <ShedRoof />
      {/* Stützen + Möbel am Bahnsteig */}
      {[-32.5, -19.5, -6.5, 6.5, 19.5, 32.5].map((x) => (
        <group key={x} position={[x, 0, 5.0]}>
          <Pillar />
        </group>
      ))}
      {STATION.bench.map(([x, z]) => (
        <group key={`b${x}`} position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
          <StationBench />
        </group>
      ))}
      {[-15, 15, -26, 26].map((x) => (
        <group key={`b2${x}`} position={[x, 0, 7.3]} rotation={[0, Math.PI, 0]}>
          <StationBench />
        </group>
      ))}
      <group position={[STATION.ticket[0], 0, STATION.ticket[1]]} rotation={[0, Math.PI, 0]}>
        <TicketMachine />
      </group>
      <group position={[6.4, 0, 7.6]}>
        <TrashBin />
      </group>
      <group position={STATION.board}>
        <DepartureBoard />
      </group>
      <group position={[-20, 3.1, 5.0]}>
        <DepartureBoard />
      </group>
      <Hall />
      <Crowd full={full} />
      {platform && (
        <>
          <Catenary />
          <group position={[STATION.speakerMast[0], 0, STATION.speakerMast[1]]} rotation={[0, -0.5, 0]}>
            <SpeakerMast />
          </group>
        </>
      )}
    </>
  );
};

const EmptyStation = (p: {cam?: StageCam}) => <StationScene full={false} {...p} />;
const FullStation = (p: {cam?: StageCam}) => <StationScene full {...p} />;

export const stationStage: StageDef = {
  id: 'bahnhof',
  Component: EmptyStation,
  climbTrees: [],
  groundHeight,
  ambience: 'bahnhof-atmo',
};
const PlatformStation = (p: {cam?: StageCam}) => <StationScene full={false} platform {...p} />;
/** Variante "bahnsteig": wie "bahnhof", dazu Oberleitung, Lautsprecher-Mast und deutlich sichtbare weiße Linie (0,2 m breit, hell) */
export const stationPlatformStage: StageDef = {
  id: 'bahnsteig',
  Component: PlatformStation,
  climbTrees: [],
  groundHeight,
  ambience: 'bahnhof-atmo',
};
export const stationFullStage: StageDef = {
  id: 'bahnhof-voll',
  Component: FullStation,
  climbTrees: [],
  groundHeight,
  ambience: 'bahnhof-atmo',
};
