import {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {clamp, rng} from '../lib/anim';
import {T} from '../ui/theme';
import {roofGeo} from '../stage/Garden';

/**
 * Objekte für das Spezial „Haus weg“ (wiederverwendbar, alle ohne Logos/Markenaufdruck):
 *  - Fußmatte „WILLKOMMEN“ (`fussmatte`), 0,9 × 0,55 m, Kokos-Braun mit dunklem Rand; Schrift lesbar von +z.
 *  - Einfamilienhaus (`haus`, `haus1` … `haus6`): 7 × 7 m, zwei Etagen, Satteldach, Tür vorn (+z) mit Stufe + Vordach.
 *    Wert `mark` = Farbe (0 = Haus des Dummys: sonnengelb mit dunklem Dach, 1 … 6 Pastell), `squish` 0 … 1 = plattgedrückt wie ein Pfannkuchen
 *    (comichaft, Dachziegel rutschen heraus, keine Trümmer/kein Feuer).
 *  - Klemmbaustein-Haus mit Garage (`klemmhaus`): große bunte Bausteine mit Noppen (1,2 × 0,6 × 0,5 m), OHNE Logo/Aufdruck.
 *    Wert `fill` 0 … 1 = wie viele Steine schon stehen (Reihenfolge: Etage für Etage rund ums Haus, Dach, dann Garage).
 *    Der jeweils nächste Stein senkt sich in den letzten Bruchteil hinein (sieht aus wie Aufsetzen). Anzahl/Reihenfolge: brickLayout().
 *  - Gartenhaus (`gartenhaus`): Holzhäuschen 2,5 × 2,1 × 2,3 m, Tür vorn rechts (Wert `door` 0 zu … 1 offen, schwenkt nach außen),
 *    dahinter warmes Licht (innen ist es riesig).
 *  - Baustein in beiden Händen (DummyPose.both 'brick') und Fußmatte in beiden Händen ('mat') → BrickPiece / DoormatMesh.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, flatShading: true, roughness: 0.9, ...extra});

// ---------------------------------------------------------------------------------------------
// Fußmatte
// ---------------------------------------------------------------------------------------------
let matTex: THREE.CanvasTexture | null = null;
const matTexture = () => {
  if (matTex) return matTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 312;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b07f45';
  g.fillRect(0, 0, 512, 312);
  // Kokos-Fasern
  const r = rng(7);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(90,55,25,0.25)' : 'rgba(220,180,120,0.22)';
    g.fillRect(r() * 512, r() * 312, 2, 5);
  }
  g.strokeStyle = '#4a2f17';
  g.lineWidth = 22;
  g.strokeRect(14, 14, 484, 284);
  g.fillStyle = '#3d2512';
  g.font = `800 82px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('WILLKOMMEN', 256, 160);
  matTex = new THREE.CanvasTexture(c);
  matTex.colorSpace = THREE.SRGBColorSpace;
  return matTex;
};

/** Fußmatte, liegt flach in der x-z-Ebene (Schrift lesbar von +z), Unterseite auf y 0 */
export const DoormatMesh = () => {
  const m = useMemo(() => ({top: new THREE.MeshStandardMaterial({map: matTexture(), roughness: 1}), side: std('#6e4a26', {roughness: 1})}), []);
  return (
    <group>
      <mesh position={[0, 0.0125, 0]} material={m.side} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.025, 0.55]} />
      </mesh>
      <mesh position={[0, 0.0256, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.top} receiveShadow>
        <planeGeometry args={[0.89, 0.54]} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Einfamilienhaus (kann plattgedrückt werden)
// ---------------------------------------------------------------------------------------------
const HOUSE_LOOK = [
  {wall: '#f4d35e', roof: '#4a4f57', trim: '#ffffff', door: '#2f6db5'},
  {wall: '#cfe3e8', roof: '#9c4a35', trim: '#ffffff', door: '#7a4a2a'},
  {wall: '#f4c7c3', roof: '#7d4436', trim: '#ffffff', door: '#3f6a4a'},
  {wall: '#d6e6c3', roof: '#5d5f66', trim: '#ffffff', door: '#a2392b'},
  {wall: '#efe6da', roof: '#8a5a3a', trim: '#ffffff', door: '#335c86'},
  {wall: '#c9d3ef', roof: '#9c4a35', trim: '#ffffff', door: '#6b4a32'},
  {wall: '#f2d6b3', roof: '#5d5f66', trim: '#ffffff', door: '#3a6e6a'},
];
export const HOUSE_DIM = {w: 7, d: 7, wallH: 5, roofH: 2.6};

export const FamilyHouse = ({look = 0, squish = 0, seed = 1, open = 0, doorOpen = 0}: {look?: number; squish?: number; seed?: number; /** Fenster offen (dunkle Öffnungen, Tauben fliegen heraus) */ open?: number; /** Haustür offen 0 … 1 (Türblatt schwenkt nach außen, dahinter warmer dunkler Flur) – Wert "lid" */ doorOpen?: number}) => {
  const L = HOUSE_LOOK[Math.max(0, Math.min(HOUSE_LOOK.length - 1, Math.round(look)))];
  const {w, d, wallH, roofH} = HOUSE_DIM;
  const m = useMemo(
    () => ({
      wall: std(L.wall, {roughness: 0.95}),
      roof: std(L.roof, {roughness: 0.8}),
      trim: std(L.trim, {roughness: 0.6}),
      glass: std('#7aa3bd', {roughness: 0.2, metalness: 0.25}),
      hole: std('#2a2730', {roughness: 1}),
      door: std(L.door, {roughness: 0.6}),
      step: std('#bdb7ad'),
      chimney: std('#9c5a45'),
      knob: std('#d9c27a', {metalness: 0.6, roughness: 0.4}),
    }),
    [L],
  );
  const roof = useMemo(() => roofGeo(w + 0.6, d + 0.8, roofH), [w, d, roofH]);
  const sq = clamp(squish);
  const tiles = useMemo(() => {
    const r = rng(seed * 31 + 7);
    return Array.from({length: 14}, () => ({x: (r() - 0.5) * 2 * (w / 2 + 1.6), z: (r() < 0.5 ? -1 : 1) * (d / 2 + 0.4 + r() * 1.6), ry: r() * 6, s: 0.7 + r() * 0.5}));
  }, [seed, w, d]);
  const tilt = useMemo(() => {
    const r = rng(seed * 13 + 3);
    return [(r() - 0.5) * 0.06, (r() - 0.5) * 0.08];
  }, [seed]);
  const win = (x: number, y: number, z: number, ry = 0, key = '') => (
    <group key={key || `${x}${y}${z}`} position={[x, y, z]} rotation={[0, ry, 0]}>
      <mesh material={m.trim}>
        <boxGeometry args={[1.25, 1.35, 0.06]} />
      </mesh>
      <mesh material={open > 0.5 ? m.hole : m.glass} position={[0, 0, 0.035]}>
        <boxGeometry args={[1.05, 1.15, 0.03]} />
      </mesh>
      {open < 0.5 && (
        <mesh material={m.trim} position={[0, 0, 0.055]}>
          <boxGeometry args={[0.06, 1.15, 0.02]} />
        </mesh>
      )}
    </group>
  );
  return (
    <group>
      <group scale={[1 + 0.16 * sq, Math.max(0.06, 1 - 0.94 * sq), 1 + 0.12 * sq]} rotation={[tilt[0] * sq, 0, tilt[1] * sq]}>
        <mesh position={[0, wallH / 2, 0]} material={m.wall} castShadow receiveShadow>
          <boxGeometry args={[w, wallH, d]} />
        </mesh>
        <mesh position={[0, wallH, 0]} material={m.roof} geometry={roof} castShadow />
        <mesh position={[1.9, wallH + 1.7, -1.0]} material={m.chimney} castShadow>
          <boxGeometry args={[0.6, 1.8, 0.6]} />
        </mesh>
        {/* Vorderseite (+z): Tür mit Vordach, Fenster unten/oben */}
        <group position={[0, 0, d / 2 + 0.01]}>
          {doorOpen > 0.01 && (
            <mesh position={[0, 1.1, 0.008]}>
              <planeGeometry args={[1.1, 2.2]} />
              <meshStandardMaterial color="#4a3426" emissive="#3a2412" emissiveIntensity={0.5} roughness={1} />
            </mesh>
          )}
          <group position={[-0.55, 0, 0.03]} rotation={[0, -1.75 * clamp(doorOpen), 0]}>
            <mesh material={m.door} position={[0.55, 1.1, 0]}>
              <boxGeometry args={[1.1, 2.2, 0.06]} />
            </mesh>
            <mesh material={m.knob} position={[0.93, 1.05, 0.05]}>
              <sphereGeometry args={[0.05, 6, 4]} />
            </mesh>
          </group>
          <mesh material={m.trim} position={[0, 2.5, 0.4]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[1.7, 0.08, 0.9]} />
          </mesh>
          <mesh material={m.step} position={[0, 0.08, 0.35]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 0.16, 0.7]} />
          </mesh>
          {win(-2.3, 1.5, 0.02)}
          {win(2.3, 1.5, 0.02)}
          {win(-2.3, 3.8, 0.02)}
          {win(0, 3.8, 0.02)}
          {win(2.3, 3.8, 0.02)}
        </group>
        {/* Seiten + Rückseite */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * (w / 2 + 0.01), 0, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
            {win(-1.6, 1.5, 0.02, 0, `a${s}`)}
            {win(1.6, 1.5, 0.02, 0, `b${s}`)}
            {win(0, 3.8, 0.02, 0, `c${s}`)}
          </group>
        ))}
        <group position={[0, 0, -d / 2 - 0.01]} rotation={[0, Math.PI, 0]}>
          {win(-2.3, 1.5, 0.02)}
          {win(2.3, 1.5, 0.02)}
          {win(-1.2, 3.8, 0.02)}
          {win(1.2, 3.8, 0.02)}
        </group>
      </group>
      {/* herausgerutschte Dachziegel (nur plattgedrückt) */}
      {sq > 0.35 &&
        tiles.map((t, i) => (
          <mesh key={i} material={m.roof} position={[t.x, 0.06, t.z]} rotation={[0, t.ry, 0]} scale={t.s * clamp((sq - 0.35) / 0.4)} castShadow>
            <boxGeometry args={[0.7, 0.1, 0.45]} />
          </mesh>
        ))}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Klemmbausteine
// ---------------------------------------------------------------------------------------------
export const BRICK = {len: 1.2, dep: 0.6, h: 0.5, stud: 0.1, studH: 0.09};
export const BRICK_COLS = ['#d8322b', '#2f6fd0', '#f2c11d', '#2f9e4a', '#f07a1e', '#ffffff', '#3fb6d8'];
type Piece = {x: number; y: number; z: number; rot: 0 | 1; kind: 'brick' | 'roofF' | 'roofB' | 'door' | 'window' | 'gdoor' | 'plate' | 'slab'; color: string; studs: boolean; len?: number};

/**
 * Reihenfolge aller Teile des Klemmbaustein-Hauses (Ursprung = Boden-Mitte des Hauses, Vorderseite +z, Garage rechts = +x).
 * Haus: x −3 … 3, z −2.4 … 2.4, 5 Lagen Wand (2,5 m), Satteldach aus roten Dachsteinen (4 Reihen + First, bis 5 m), Tür vorn Mitte, Fenster.
 * Garage: x 3 … 6.6, z −2.4 … 2.4, 4 Lagen (2,0 m), flaches graues Dach, weißes Garagentor vorn.
 */
export const brickLayout = () => {
  const out: Piece[] = [];
  const r = rng(91);
  let last = '';
  const col = () => {
    let c = BRICK_COLS[Math.floor(r() * BRICK_COLS.length)];
    if (c === last) c = BRICK_COLS[(BRICK_COLS.indexOf(c) + 1) % BRICK_COLS.length];
    last = c;
    return c;
  };
  const {h} = BRICK;
  const frontX = [-2.4, -1.2, 0, 1.2, 2.4];
  const sideZ = [1.2, 0, -1.2];
  const FZ = 2.1;
  for (let layer = 0; layer < 5; layer++) {
    const y = layer * h;
    const win = layer === 2 || layer === 3;
    // vorn links → rechts (Tür Mitte, Fenster links/rechts)
    for (const x of frontX) {
      if (Math.abs(x) < 0.1 && layer <= 3) continue; // Tür kommt am Ende der ersten Lage
      if (Math.abs(Math.abs(x) - 1.2) < 0.1 && win) {
        if (layer === 2) out.push({x, y, z: FZ, rot: 0, kind: 'window', color: '#ffffff', studs: false});
        continue;
      }
      out.push({x, y, z: FZ, rot: 0, kind: 'brick', color: col(), studs: true});
    }
    // rechte Seite vorn → hinten
    for (const z of sideZ) {
      if (Math.abs(z) < 0.1 && win) {
        if (layer === 2) out.push({x: 2.7, y, z, rot: 1, kind: 'window', color: '#ffffff', studs: false});
        continue;
      }
      out.push({x: 2.7, y, z, rot: 1, kind: 'brick', color: col(), studs: true});
    }
    // hinten rechts → links
    for (const x of [...frontX].reverse()) {
      if (Math.abs(x) < 0.1 && win) {
        if (layer === 2) out.push({x, y, z: -FZ, rot: 0, kind: 'window', color: '#ffffff', studs: false});
        continue;
      }
      out.push({x, y, z: -FZ, rot: 0, kind: 'brick', color: col(), studs: true});
    }
    // linke Seite hinten → vorn
    for (const z of [...sideZ].reverse()) {
      if (Math.abs(z) < 0.1 && win) {
        if (layer === 2) out.push({x: -2.7, y, z, rot: 1, kind: 'window', color: '#ffffff', studs: false});
        continue;
      }
      out.push({x: -2.7, y, z, rot: 1, kind: 'brick', color: col(), studs: true});
    }
    if (layer === 0) out.push({x: 0, y: 0, z: FZ, rot: 0, kind: 'door', color: '#8a3b2a', studs: false});
  }
  // Dach: vier Reihen Dachsteine je Seite (von außen nach oben) + Giebel-Füllung, dann First
  const top = 5 * h;
  for (let k = 0; k < 4; k++) {
    const y = top + k * h;
    for (const x of frontX) out.push({x, y, z: FZ - 0.6 * k, rot: 0, kind: 'roofF', color: '#c8362c', studs: false});
    for (const x of [...frontX].reverse()) out.push({x, y, z: -FZ + 0.6 * k, rot: 0, kind: 'roofB', color: '#c8362c', studs: false});
    const w = 2 * (1.8 - 0.6 * k);
    if (w > 0.1) for (const sx of [2.7, -2.7]) out.push({x: sx, y, z: 0, rot: 1, kind: 'slab', color: '#f2c11d', studs: false, len: w});
  }
  for (const x of frontX) out.push({x, y: top + 4 * h, z: 0, rot: 0, kind: 'brick', color: '#c8362c', studs: true});
  const houseDone = out.length;
  // Garage rechts: Tor vorn, rechte Seite (vorn → hinten), Rückwand, flaches Dach
  out.push({x: 4.5, y: 0, z: FZ, rot: 0, kind: 'gdoor', color: '#f4f4f0', studs: false});
  for (let layer = 0; layer < 4; layer++) {
    const y = layer * h;
    const st = layer === 3;
    for (const z of [1.8, 0.6, -0.6]) out.push({x: 6.3, y, z, rot: 1, kind: 'brick', color: col(), studs: st});
    out.push({x: 6.3, y, z: -1.5, rot: 1, kind: 'brick', color: col(), studs: st, len: 0.6});
    for (const x of [6.0, 4.8, 3.6]) out.push({x, y, z: -FZ, rot: 0, kind: 'brick', color: col(), studs: st});
  }
  for (const x of [3.6, 4.8, 6.0]) out.push({x, y: 4 * h, z: 0, rot: 0, kind: 'plate', color: '#7a7f86', studs: false});
  return {pieces: out, houseDone, total: out.length};
};

const PieceMesh = ({p, m}: {p: Piece; m: Record<string, THREE.Material>}) => {
  const {len, dep, h} = BRICK;
  switch (p.kind) {
    case 'door':
      // Tür 1,2 × 2,0 m in der Wand-Lücke
      return (
        <group>
          <mesh position={[0, 1.0, 0]} material={m.door} castShadow>
            <boxGeometry args={[1.1, 2.0, 0.3]} />
          </mesh>
          <mesh position={[0.35, 1.0, 0.17]} material={m.knob}>
            <sphereGeometry args={[0.07, 6, 4]} />
          </mesh>
        </group>
      );
    case 'window':
      return (
        <group>
          <mesh position={[0, h, 0]} material={m.frame} castShadow>
            <boxGeometry args={[len, 2 * h, 0.4]} />
          </mesh>
          <mesh position={[0, h, 0.01]} material={m.glass}>
            <boxGeometry args={[len - 0.2, 2 * h - 0.2, 0.44]} />
          </mesh>
        </group>
      );
    case 'gdoor':
      return (
        <group>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0, 0.25 + i * 0.5, 0]} material={m.gdoor} castShadow>
              <boxGeometry args={[2.9, 0.47, 0.3]} />
            </mesh>
          ))}
        </group>
      );
    case 'slab':
      // Giebel-Füllung (gelb, ohne Noppen), Breite = p.len entlang der Seite
      return (
        <mesh position={[0, h / 2, 0]} material={m.slab} castShadow receiveShadow>
          <boxGeometry args={[p.len ?? len, h - 0.01, dep - 0.02]} />
        </mesh>
      );
    case 'plate':
      return (
        <mesh position={[0, 0.12, 0]} material={m.plate} castShadow receiveShadow>
          <boxGeometry args={[len, 0.24, 4.8]} />
        </mesh>
      );
    default:
      return null;
  }
};

/** Keil für Dachsteine (Querschnitt: unten volle Tiefe, oben schmal; Schräge nach außen = +z) */
const roofWedge = () => {
  const {len, dep, h} = BRICK;
  const s = new THREE.Shape();
  s.moveTo(-dep / 2, 0);
  s.lineTo(dep / 2, 0);
  s.lineTo(-dep / 2 + 0.12, h);
  s.lineTo(-dep / 2, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth: len, bevelEnabled: false});
  g.translate(0, 0, -len / 2);
  g.rotateY(-Math.PI / 2);
  return g;
};

const InstancedPieces = ({items, geometry}: {items: {m: THREE.Matrix4; c: string}[]; geometry: THREE.BufferGeometry}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    items.forEach((it, i) => {
      im.setMatrixAt(i, it.m);
      im.setColorAt(i, new THREE.Color(it.c));
    });
    im.count = items.length;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [items]);
  if (!items.length) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, Math.max(1, items.length)]} castShadow receiveShadow key={items.length}>
      <meshStandardMaterial flatShading roughness={0.35} />
    </instancedMesh>
  );
};

/** Klemmbaustein-Haus mit Garage. fill 0 … 1 = Anteil der gesetzten Teile; das nächste Teil senkt sich gerade hinein. */
export const BrickHouse = ({fill = 1}: {fill?: number}) => {
  const lay = useMemo(() => brickLayout(), []);
  const geos = useMemo(() => {
    const {len, dep, h, stud, studH} = BRICK;
    const body = new THREE.BoxGeometry(len - 0.02, h - 0.01, dep - 0.02);
    body.translate(0, h / 2, 0);
    const studG = new THREE.CylinderGeometry(stud, stud, studH, 12);
    studG.translate(0, h + studH / 2, 0);
    return {body, stud: studG, wedge: roofWedge()};
  }, []);
  const m = useMemo(
    () => ({
      door: std('#8a3b2a', {roughness: 0.5}),
      knob: std('#e8c64a', {metalness: 0.5, roughness: 0.4}),
      frame: std('#ffffff', {roughness: 0.4}),
      glass: std('#8fc6e6', {roughness: 0.15, metalness: 0.2}),
      gdoor: std('#f4f4f0', {roughness: 0.4}),
      plate: std('#7a7f86', {roughness: 0.5}),
      slab: std('#f2c11d', {roughness: 0.35}),
    }),
    [],
  );
  const n = clamp(fill) * lay.total;
  const whole = Math.floor(n + 1e-6);
  const part = n - whole;
  const data = useMemo(() => {
    const bodies: {m: THREE.Matrix4; c: string}[] = [];
    const studs: {m: THREE.Matrix4; c: string}[] = [];
    const wedges: {m: THREE.Matrix4; c: string}[] = [];
    const special: {p: Piece; y: number; i: number}[] = [];
    const count = Math.min(lay.total, whole + (part > 0.001 ? 1 : 0));
    for (let i = 0; i < count; i++) {
      const p = lay.pieces[i];
      // gerade gesetztes Teil: senkt sich von 0,6 m darüber ein
      const drop = i === whole ? (1 - part) * (1 - part) * 0.6 : 0;
      const y = p.y + drop;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.rot ? Math.PI / 2 : p.kind === 'roofB' ? Math.PI : 0, 0));
      const mat = new THREE.Matrix4().compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(1, 1, 1));
      if (p.kind === 'brick') {
        const short = (p.len ?? BRICK.len) < 1;
        bodies.push({m: short ? mat.clone().multiply(new THREE.Matrix4().makeScale(0.5, 1, 1)) : mat, c: p.color});
        if (p.studs)
          for (const sx of short ? [-0.15, 0.15] : [-0.45, -0.15, 0.15, 0.45])
            for (const sz of [-0.15, 0.15]) studs.push({m: mat.clone().multiply(new THREE.Matrix4().makeTranslation(sx, 0, sz)), c: p.color});
      } else if (p.kind === 'roofF' || p.kind === 'roofB') {
        wedges.push({m: mat, c: p.color});
      } else {
        special.push({p, y, i});
      }
    }
    return {bodies, studs, wedges, special};
  }, [lay, whole, part]);
  return (
    <group>
      <InstancedPieces items={data.bodies} geometry={geos.body} />
      <InstancedPieces items={data.studs} geometry={geos.stud} />
      <InstancedPieces items={data.wedges} geometry={geos.wedge} />
      {data.special.map(({p, y, i}) => (
        <group key={i} position={[p.x, y, p.z]} rotation={[0, p.rot ? Math.PI / 2 : 0, 0]}>
          <PieceMesh p={p} m={m} />
        </group>
      ))}
    </group>
  );
};

/** Einzelner Baustein (z. B. in den Händen), Ursprung = Mitte der Unterseite, Länge entlang x */
export const BrickPiece = ({color = BRICK_COLS[0]}: {color?: string}) => {
  const {len, dep, h, stud, studH} = BRICK;
  const mat = useMemo(() => std(color, {roughness: 0.35}), [color]);
  return (
    <group>
      <mesh position={[0, h / 2, 0]} material={mat} castShadow>
        <boxGeometry args={[len - 0.02, h - 0.01, dep - 0.02]} />
      </mesh>
      {[-0.45, -0.15, 0.15, 0.45].map((sx) =>
        [-0.15, 0.15].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx, h + studH / 2, sz]} material={mat} castShadow>
            <cylinderGeometry args={[stud, stud, studH, 12]} />
          </mesh>
        )),
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Gartenhaus mit Tür
// ---------------------------------------------------------------------------------------------
export const GardenShedProp = ({door = 0}: {door?: number}) => {
  const roof = useMemo(() => roofGeo(2.9, 2.7, 0.9), []);
  const planks = useMemo(() => Array.from({length: 12}, (_, i) => -1.2 + i * 0.22), []);
  const m = useMemo(
    () => ({
      wall: std('#8b6a48'),
      dark: std('#7d5c3c'),
      roof: std('#4d5359', {roughness: 0.8}),
      door: std('#5f4630'),
      knob: std('#d9c27a', {metalness: 0.6, roughness: 0.4}),
      frame: std('#f2efe6'),
      glass: std('#8fb7cf', {roughness: 0.2, metalness: 0.2}),
      glow: new THREE.MeshStandardMaterial({color: '#ffd27a', emissive: '#ffb84a', emissiveIntensity: 1.3}),
    }),
    [],
  );
  const open = clamp(door);
  return (
    <group>
      <mesh position={[0, 1.05, 0]} material={m.wall} castShadow receiveShadow>
        <boxGeometry args={[2.5, 2.1, 2.3]} />
      </mesh>
      {planks.map((px) =>
        Math.abs(px - 0.45) < 0.45 ? null : (
          <mesh key={px} position={[px, 1.05, 1.152]} material={m.dark}>
            <boxGeometry args={[0.02, 2.1, 0.01]} />
          </mesh>
        ),
      )}
      <mesh position={[0, 2.1, 0]} geometry={roof} material={m.roof} castShadow />
      {/* warmes Licht hinter der Tür (innen ist es riesig) */}
      <mesh position={[0.45, 0.9, 1.155]} material={open > 0.02 ? m.glow : m.door}>
        <planeGeometry args={[0.78, 1.73]} />
      </mesh>
      {/* Türblatt: Scharnier links bei x 0.05, schwenkt nach außen (+z) */}
      <group position={[0.05, 0, 1.17]} rotation={[0, -open * 1.75, 0]}>
        <mesh position={[0.4, 0.9, 0.02]} material={m.door} castShadow>
          <boxGeometry args={[0.8, 1.75, 0.04]} />
        </mesh>
        <mesh position={[0.68, 0.9, 0.06]} material={m.knob}>
          <sphereGeometry args={[0.035, 6, 4]} />
        </mesh>
      </group>
      <mesh position={[-0.65, 1.3, 1.17]} material={m.frame}>
        <boxGeometry args={[0.6, 0.5, 0.04]} />
      </mesh>
      <mesh position={[-0.65, 1.3, 1.19]} material={m.glass}>
        <boxGeometry args={[0.5, 0.4, 0.02]} />
      </mesh>
    </group>
  );
};

/** Haufen großer Bausteine (`klemmsteine`): liegt bereit; Wert `fill` 1 = voll … 0 = leer (Steine verschwinden von oben) */
export const BrickPile = ({fill = 1}: {fill?: number}) => {
  const items = useMemo(() => {
    const r = rng(17);
    const out: {x: number; y: number; z: number; ry: number; rz: number; c: string}[] = [];
    const rows = [6, 5, 3, 2];
    let y = 0;
    rows.forEach((n, ri) => {
      for (let i = 0; i < n; i++) {
        out.push({x: (i - (n - 1) / 2) * 0.75 + (r() - 0.5) * 0.25, y: y + (r() - 0.5) * 0.04, z: (r() - 0.5) * 0.7, ry: (r() - 0.5) * 1.2 + (ri % 2 ? Math.PI / 2 : 0), rz: (r() - 0.5) * 0.18, c: BRICK_COLS[Math.floor(r() * BRICK_COLS.length)]});
      }
      y += BRICK.h * 0.82;
    });
    return out;
  }, []);
  const n = Math.round(items.length * clamp(fill));
  return (
    <group>
      {items.slice(0, n).map((b, i) => (
        <group key={i} position={[b.x, b.y, b.z]} rotation={[0, b.ry, b.rz]}>
          <BrickPiece color={b.c} />
        </group>
      ))}
    </group>
  );
};
