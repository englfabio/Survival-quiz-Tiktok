import {useMemo} from 'react';
import {spring} from 'remotion';
import * as THREE from 'three';
import {Instances, type Inst} from '../stage/Forest';
import {clamp, rng} from '../lib/anim';
import {T} from '../ui/theme';
import {useFontTexture} from './ToothProps';

/**
 * Objekte für das Spezial-Video "Nachbars Rasen" (wiederverwendbar für alle Nachbar-/Garten-Szenen). Alles comichaft + harmlos.
 *
 *  - LawnPatch ("rasen", "rasen2"): Rasenfläche 10,2 × 16,6 m (Ursprung = Mitte, liegt flach auf dem Boden).
 *      lush 0 = braun + fleckig (vertrocknet, kahle Stellen) … 1 = leuchtend grün + perfekt mit Mähstreifen,
 *      paint 0 … 1 = mit grüner Farbe angesprüht (knallig neon-grün, glänzend). Geht weich über.
 *  - GardenGnome ("gartenzwerg"): Gartenzwerg mit roter Mütze, weißem Bart, blauer Jacke (ca. 0,45 m), paint 1 = komplett neon-grün.
 *  - LawnMower ("rasenmaeher"): glänzender roter Rasenmäher mit Chrom-Griff + Glitzern. Ursprung = Mitte unten, vorn = +z,
 *      Griff hinten (Bügel bei z −0.52, y 0.88). Schieben: `"attach": "dummy", x 0, y 0, z 0.88, face 0` (Dummy "mowsneak").
 *  - Briefcase ("aktenkoffer"): brauner Leder-Aktenkoffer, Ursprung = Griff (zum Tragen "hand" 1, "drop" 0).
 *  - Contract ("kaufvertrag"): Klemmbrett mit "KAUFVERTRAG", Linien und Unterschriftsfeld. fill 0 … 1 = Unterschrift wird geschrieben.
 *      Ursprung = Mitte, liegt in der x/z-Ebene (Oberseite +y, Kopfzeile Richtung −z), tilt = um x kippen (Grad).
 *  - Envelope ("kuendigung"): Briefumschlag mit rotem Stempel "KÜNDIGUNG" (Text über Feld "text"). Ursprung = Mitte, Vorderseite +z.
 *  - Mailbox ("briefkasten"): Briefkasten auf Pfosten, Einwurf vorn (+z) auf 1,08 m Höhe, flap = Klappe öffnet sich (0 … 1).
 *  - SoldSign ("verkauft"): großes rotes Schild "VERKAUFT" auf Pfosten (Tafel 1,3 × 0,62 m auf ca. 1,5 m), Bewegung show = springt
 *      mit Plopp aus dem Boden, Vorderseite +z.
 *  - WateringCan ("giesskanne"): grüne Gießkanne, Ursprung = Griff oben (zum Tragen "hand" 1), Tülle zeigt nach +z,
 *      tilt = nach vorn kippen (Grad, ca. 35 zum Gießen), water 1 = Wasserstrahl aus der Brause.
 *  - NailScissors ("nagelschere"): kleine Nagelschere (vergrößert, damit man sie sieht), schnippt automatisch, size = größer.
 *  - SprayCan (in der Hand des Dummys bei "spraylawn"): Sprühdose mit grüner Farbe + grünem Sprühnebel.
 *  - Sparkle: kleines vierzackiges Glitzern (glänzende Dinge).
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.7, flatShading: true, ...extra});

/** Neon-Grün der Sprühfarbe */
export const PAINT_GREEN = '#36f04a';
const PAINT_GREEN_2 = '#2bd83f';

// ---------------- Rasen ----------------
export const LAWN_W = 10.2;
export const LAWN_D = 16.6;
const BROWN = ['#9a7845', '#8a6b3c', '#a98b55', '#7f6337', '#93743f'];
const BARE = '#6e4f31';
const DULL = '#7d8a44';
const LUSH_A = '#3fc23c';
const LUSH_B = '#2fa836';
const PAINT = [PAINT_GREEN, PAINT_GREEN_2, '#4af75c'];

export const LawnPatch = ({lush, paint, seed = 1}: {lush: number; paint: number; seed?: number}) => {
  // Feste Zufallswerte je Zelle (Farbe braun, kahle Stelle, Streifen)
  const base = useMemo(() => {
    const step = 0.3;
    const nx = Math.round(LAWN_W / step);
    const nz = Math.round(LAWN_D / step);
    const r = rng(41 + seed * 7);
    const cells: {x: number; z: number; brown: THREE.Color; green: THREE.Color; paint: THREE.Color}[] = [];
    // kahle Flecken (Mittelpunkte)
    const spots = Array.from({length: 9}, () => ({x: (r() - 0.5) * LAWN_W * 0.9, z: (r() - 0.5) * LAWN_D * 0.9, rad: 0.5 + r() * 0.9}));
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const x = -LAWN_W / 2 + (i + 0.5) * step;
        const z = -LAWN_D / 2 + (j + 0.5) * step;
        let brown = new THREE.Color(BROWN[Math.floor(r() * BROWN.length)]);
        if (r() < 0.12) brown = new THREE.Color(DULL);
        for (const s of spots) if (Math.hypot(x - s.x, z - s.z) < s.rad * (0.75 + 0.3 * r())) brown = new THREE.Color(BARE).lerp(new THREE.Color('#5d4128'), r() * 0.5);
        // Mähstreifen entlang z (je 0,9 m)
        const stripe = Math.floor((x + LAWN_W / 2) / 0.9) % 2 === 0;
        const green = new THREE.Color(stripe ? LUSH_A : LUSH_B).offsetHSL(0, 0, (r() - 0.5) * 0.03);
        const p = new THREE.Color(PAINT[Math.floor(r() * PAINT.length)]);
        cells.push({x, z, brown, green, paint: p});
      }
    }
    return {cells, step};
  }, [seed]);
  const lq = Math.round(clamp(lush) * 40) / 40;
  const pq = Math.round(clamp(paint) * 40) / 40;
  const geo = useMemo(() => {
    const verts: number[] = [];
    const cols: number[] = [];
    const h = base.step / 2;
    const c = new THREE.Color();
    for (const cell of base.cells) {
      c.copy(cell.brown).lerp(cell.green, lq).lerp(cell.paint, pq);
      const quad = [
        [cell.x - h, cell.z - h],
        [cell.x + h, cell.z - h],
        [cell.x - h, cell.z + h],
        [cell.x + h, cell.z + h],
      ];
      for (const idx of [0, 2, 1, 1, 2, 3]) {
        verts.push(quad[idx][0], 0, quad[idx][1]);
        cols.push(c.r, c.g, c.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, [base, lq, pq]);
  // Grasbüschel: vertrocknet = hoch, strohig, vereinzelt; grün = kurz, dicht; Farbe = knallgrün
  const tufts = useMemo(() => {
    const r = rng(90 + seed);
    const out: Inst[] = [];
    const n = 900;
    for (let i = 0; i < n; i++) {
      const x = (r() - 0.5) * (LAWN_W - 0.2);
      const z = (r() - 0.5) * (LAWN_D - 0.2);
      const keep = r();
      // braun: nur jedes 3. Büschel, dafür größer + strohig
      const dryVisible = keep < 0.33;
      const vis = lq > 0.5 ? 1 : dryVisible ? 1 : 0;
      if (!vis) continue;
      const s = (lq > 0.5 ? 0.045 + r() * 0.025 : 0.07 + r() * 0.06) * (1 + 0.15 * pq);
      const col = new THREE.Color(r() < 0.5 ? '#c8a964' : '#a98a4a')
        .lerp(new THREE.Color(r() < 0.5 ? '#4fd04a' : '#37b13c'), lq)
        .lerp(new THREE.Color(PAINT_GREEN), pq);
      out.push({pos: [x, 0, z], scale: [s * 0.6, s, s * 0.6], rotY: r() * 6, color: '#' + col.getHexString()});
    }
    return out;
  }, [seed, lq, pq]);
  const blade = useMemo(() => {
    const g = new THREE.ConeGeometry(0.5, 1, 3);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  return (
    <group position={[0, 0.012, 0]}>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={pq > 0.3 ? 0.35 : 1} metalness={0} />
      </mesh>
      <Instances geometry={blade} items={tufts} castShadow={false} />
    </group>
  );
};

// ---------------- Gartenzwerg ----------------
export const GardenGnome = ({paint = 0}: {paint?: number}) => {
  const p = paint > 0.5;
  const m = useMemo(
    () => ({
      hat: std(p ? PAINT_GREEN : '#d8322b', {roughness: p ? 0.3 : 0.6}),
      beard: std(p ? '#4af75c' : '#f4f2ec', {roughness: p ? 0.3 : 0.9}),
      face: std(p ? PAINT_GREEN_2 : '#f2c4a0', {roughness: p ? 0.3 : 0.7}),
      coat: std(p ? '#30e246' : '#2f63c4', {roughness: p ? 0.3 : 0.7}),
      belt: std(p ? '#28c83a' : '#3b2a1c'),
      boots: std(p ? '#2bd83f' : '#4a3020'),
      eye: std(p ? '#1c7d27' : '#1a1a1a', {roughness: 0.3}),
    }),
    [p],
  );
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.boots} position={[0.05 * s, 0.03, 0.02]} scale={[0.045, 0.03, 0.065]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
      ))}
      <mesh material={m.coat} position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.2, 8]} />
      </mesh>
      <mesh material={m.belt} position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.083, 0.086, 0.025, 8]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`a${s}`} material={m.coat} position={[0.075 * s, 0.17, 0.03]} rotation={[0.6, 0, 0.4 * s]} castShadow>
          <cylinderGeometry args={[0.022, 0.026, 0.11, 6]} />
        </mesh>
      ))}
      <mesh material={m.face} position={[0, 0.29, 0.005]} castShadow>
        <icosahedronGeometry args={[0.065, 1]} />
      </mesh>
      <mesh material={m.face} position={[0, 0.285, 0.068]}>
        <icosahedronGeometry args={[0.018, 0]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`e${s}`} material={m.eye} position={[0.024 * s, 0.305, 0.058]}>
          <sphereGeometry args={[0.009, 6, 4]} />
        </mesh>
      ))}
      <mesh material={m.beard} position={[0, 0.24, 0.04]} rotation={[0.25, 0, Math.PI]} castShadow>
        <coneGeometry args={[0.058, 0.13, 7]} />
      </mesh>
      <mesh material={m.hat} position={[0, 0.39, -0.01]} rotation={[-0.18, 0, 0]} castShadow>
        <coneGeometry args={[0.07, 0.2, 8]} />
      </mesh>
    </group>
  );
};

// ---------------- Glitzern ----------------
export const Sparkle = ({size = 0.12, time, phase = 0}: {size?: number; time: number; phase?: number}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, depthWrite: false}), []);
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    const n = 4;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const rr = i % 2 === 0 ? 1 : 0.18;
      const x = Math.sin(a) * rr;
      const y = Math.cos(a) * rr;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);
  const k = Math.max(0, Math.sin((time * 1.6 + phase) * Math.PI));
  const tw = Math.pow(k, 3);
  if (tw < 0.03) return null;
  mat.opacity = tw;
  return <mesh geometry={geo} material={mat} scale={size * tw} rotation={[0, 0, time * 1.5]} renderOrder={30} />;
};

// ---------------- Rasenmäher ----------------
export const LawnMower = ({time, spin = 0, camQ}: {time: number; spin?: number; camQ?: THREE.Quaternion}) => {
  const m = useMemo(
    () => ({
      red: std('#e2231a', {roughness: 0.22, metalness: 0.35}),
      redDark: std('#a3140f', {roughness: 0.3, metalness: 0.3}),
      chrome: std('#eef1f4', {roughness: 0.12, metalness: 0.95}),
      black: std('#1b1c1e', {roughness: 0.6}),
      hub: std('#c9ced4', {roughness: 0.25, metalness: 0.8}),
      grip: std('#262626', {roughness: 0.8}),
    }),
    [],
  );
  const wheels: [number, number, number][] = [
    [0.27, 0.1, 0.24],
    [-0.27, 0.1, 0.24],
    [0.27, 0.11, -0.24],
    [-0.27, 0.11, -0.24],
  ];
  return (
    <group>
      {/* Gehäuse */}
      <mesh material={m.red} position={[0, 0.19, 0]} castShadow>
        <boxGeometry args={[0.5, 0.12, 0.6]} />
      </mesh>
      <mesh material={m.redDark} position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.54, 0.04, 0.64]} />
      </mesh>
      <mesh material={m.red} position={[0, 0.27, 0.02]} scale={[1, 0.55, 1]} castShadow>
        <sphereGeometry args={[0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={m.chrome} position={[0, 0.34, 0.02]}>
        <cylinderGeometry args={[0.07, 0.08, 0.05, 10]} />
      </mesh>
      {/* Fangkorb hinten */}
      <mesh material={m.black} position={[0, 0.22, -0.4]} castShadow>
        <boxGeometry args={[0.36, 0.2, 0.22]} />
      </mesh>
      {/* Räder */}
      {wheels.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]} rotation={[spin, 0, 0]}>
          <mesh material={m.black} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[y, y, 0.06, 12]} />
          </mesh>
          <mesh material={m.hub} position={[0.032 * Math.sign(x), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[y * 0.45, y * 0.45, 0.015, 8]} />
          </mesh>
        </group>
      ))}
      {/* Griff: zwei Holme nach hinten oben + Querbügel */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.chrome} position={[0.2 * s, 0.53, -0.4]} rotation={[-0.62, 0, 0]} castShadow>
          <cylinderGeometry args={[0.014, 0.014, 0.72, 6]} />
        </mesh>
      ))}
      <mesh material={m.grip} position={[0, 0.84, -0.6]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.46, 8]} />
      </mesh>
      {/* Glitzern (glänzend!) */}
      {camQ &&
        (
          [
            [0.16, 0.36, 0.18, 0],
            [-0.2, 0.26, -0.05, 0.45],
            [0.12, 0.86, -0.6, 0.8],
          ] as [number, number, number, number][]
        ).map(([x, y, z, ph], i) => (
          <group key={i} position={[x, y, z]} quaternion={camQ}>
            <Sparkle time={time} phase={ph} size={0.1} />
          </group>
        ))}
    </group>
  );
};

// ---------------- Aktenkoffer ----------------
export const Briefcase = () => {
  const m = useMemo(() => ({leather: std('#6b3f22', {roughness: 0.55}), dark: std('#4a2a16'), gold: std('#d8b45a', {metalness: 0.8, roughness: 0.3})}), []);
  return (
    <group>
      {/* Griff (Ursprung) */}
      <mesh material={m.dark} position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.05, 0.012, 5, 10, Math.PI]} />
      </mesh>
      <mesh material={m.leather} position={[0, -0.2, 0]} castShadow>
        <boxGeometry args={[0.42, 0.3, 0.1]} />
      </mesh>
      <mesh material={m.dark} position={[0, -0.09, 0]}>
        <boxGeometry args={[0.43, 0.02, 0.105]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.gold} position={[0.13 * s, -0.1, 0.055]}>
          <boxGeometry args={[0.04, 0.03, 0.01]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------- Texturen ----------------
const contractTexture = (fill: number) => () => {
  const c = document.createElement('canvas');
  c.width = 360;
  c.height = 480;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbfaf5';
  g.fillRect(0, 0, 360, 480);
  g.fillStyle = '#1d2733';
  g.font = `800 58px ${T.font}`;
  g.textAlign = 'center';
  g.fillText('KAUFVERTRAG', 180, 78);
  g.fillStyle = '#9aa3ad';
  for (let i = 0; i < 9; i++) g.fillRect(36, 120 + i * 26, i % 3 === 2 ? 190 : 288, 8);
  g.strokeStyle = '#1d2733';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(40, 420);
  g.lineTo(320, 420);
  g.stroke();
  g.font = `600 22px ${T.font}`;
  g.fillStyle = '#5b6570';
  g.textAlign = 'left';
  g.fillText('Unterschrift', 40, 450);
  // Unterschrift (Kringel), wird mit fill geschrieben
  if (fill > 0.01) {
    g.strokeStyle = '#1f4fd6';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath();
    const n = Math.round(60 * clamp(fill));
    for (let i = 0; i <= n; i++) {
      const u = i / 60;
      const x = 60 + u * 230;
      const y = 400 - 18 * Math.sin(u * 22) * (0.6 + 0.4 * Math.sin(u * 5)) - 6 * u;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

export const Contract = ({fill = 0, tilt = 0}: {fill?: number; tilt?: number}) => {
  const fq = Math.round(clamp(fill) * 20) / 20;
  const tex = useFontTexture(contractTexture(fq), `Kaufvertrag ${fq}`);
  const m = useMemo(() => ({board: std('#8a5a33', {roughness: 0.6}), clip: std('#c9ced4', {metalness: 0.8, roughness: 0.3})}), []);
  const paper = useMemo(() => (tex ? new THREE.MeshStandardMaterial({map: tex, roughness: 0.9}) : null), [tex]);
  return (
    <group rotation={[THREE.MathUtils.degToRad(tilt), 0, 0]}>
      <mesh material={m.board} castShadow>
        <boxGeometry args={[0.27, 0.012, 0.36]} />
      </mesh>
      {paper && (
        <mesh material={paper} position={[0, 0.0075, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.24, 0.32]} />
        </mesh>
      )}
      <mesh material={m.clip} position={[0, 0.014, -0.165]}>
        <boxGeometry args={[0.1, 0.014, 0.035]} />
      </mesh>
    </group>
  );
};

const envelopeTexture = (text: string) => () => {
  const c = document.createElement('canvas');
  c.width = 440;
  c.height = 240;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbfaf5';
  g.fillRect(0, 0, 440, 240);
  g.strokeStyle = '#d9d4c6';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(220, 110);
  g.lineTo(440, 0);
  g.stroke();
  // roter Stempel
  g.save();
  g.translate(220, 150);
  g.rotate(-0.08);
  g.strokeStyle = T.red;
  g.lineWidth = 8;
  g.strokeRect(-190, -48, 380, 96);
  g.fillStyle = T.red;
  g.font = `800 84px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, 5);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

export const Envelope = ({text = 'KÜNDIGUNG', size = 0}: {text?: string; size?: number}) => {
  const tex = useFontTexture(envelopeTexture(text), `Umschlag ${text}`);
  const m = useMemo(() => (tex ? new THREE.MeshStandardMaterial({map: tex, roughness: 0.9}) : null), [tex]);
  const back = useMemo(() => std('#f3f0e6', {roughness: 0.9}), []);
  const s = 1 + size;
  return (
    <group scale={s}>
      <mesh material={back} castShadow>
        <boxGeometry args={[0.24, 0.13, 0.006]} />
      </mesh>
      {m && (
        <mesh material={m} position={[0, 0, 0.0035]}>
          <planeGeometry args={[0.24, 0.13]} />
        </mesh>
      )}
    </group>
  );
};

// ---------------- Briefkasten ----------------
export const Mailbox = ({flap = 0}: {flap?: number}) => {
  const m = useMemo(
    () => ({box: std('#2f5d8a', {roughness: 0.35, metalness: 0.3}), dark: std('#1f3f60'), post: std('#5a5f66', {metalness: 0.5, roughness: 0.4}), slot: std('#0f1418')}),
    [],
  );
  return (
    <group>
      <mesh material={m.post} position={[0, 0.48, -0.05]} castShadow>
        <boxGeometry args={[0.07, 0.96, 0.07]} />
      </mesh>
      <mesh material={m.box} position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.38, 0.34, 0.2]} />
      </mesh>
      <mesh material={m.box} position={[0, 1.27, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.45]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.2, 12, 1, false, -Math.PI / 2, Math.PI]} />
      </mesh>
      {/* Einwurfschlitz + Klappe */}
      <mesh material={m.slot} position={[0, 1.08, 0.101]}>
        <boxGeometry args={[0.26, 0.035, 0.004]} />
      </mesh>
      <group position={[0, 1.1, 0.104]} rotation={[-1.1 * clamp(flap), 0, 0]}>
        <mesh material={m.dark} position={[0, -0.024, 0.004]}>
          <boxGeometry args={[0.29, 0.05, 0.008]} />
        </mesh>
      </group>
    </group>
  );
};

// ---------------- "VERKAUFT"-Schild ----------------
const soldTexture = () => {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 300;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.roundRect(0, 0, 640, 300, 26);
  g.fill();
  g.fillStyle = T.red;
  g.beginPath();
  g.roundRect(16, 16, 608, 268, 18);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = `800 178px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('VERKAUFT', 320, 160);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

export const SoldSign = ({time, visible}: {time: number; visible: boolean}) => {
  const tex = useFontTexture(soldTexture, 'VERKAUFT');
  const m = useMemo(() => ({post: std('#efe9dc', {roughness: 0.8}), face: tex ? new THREE.MeshStandardMaterial({map: tex, roughness: 0.5}) : null, back: std(T.red)}), [tex]);
  if (!visible) return null;
  const s = spring({frame: time * 30, fps: 30, config: {damping: 9, stiffness: 170}});
  const wob = Math.sin(time * 9) * 0.06 * Math.max(0, 1 - time / 1.2);
  return (
    <group scale={[1, Math.max(0.001, s), 1]} rotation={[0, 0, wob]}>
      <mesh material={m.post} position={[0, 0.75, -0.04]} castShadow>
        <boxGeometry args={[0.09, 1.5, 0.09]} />
      </mesh>
      <mesh material={m.back} position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[1.32, 0.63, 0.05]} />
      </mesh>
      {m.face && (
        <mesh material={m.face} position={[0, 1.5, 0.027]}>
          <planeGeometry args={[1.3, 0.61]} />
        </mesh>
      )}
    </group>
  );
};

// ---------------- Gießkanne ----------------
export const WateringCan = ({tilt = 0, water = 0, time}: {tilt?: number; water?: number; time: number}) => {
  const m = useMemo(
    () => ({
      can: std('#2f9a52', {roughness: 0.35, metalness: 0.4}),
      dark: std('#227440', {roughness: 0.4, metalness: 0.4}),
      rose: std('#c9ced4', {roughness: 0.3, metalness: 0.8}),
      drop: new THREE.MeshStandardMaterial({color: '#9fd6ff', roughness: 0.1, transparent: true, opacity: 0.85}),
    }),
    [],
  );
  const drops = useMemo(() => {
    const r = rng(12);
    return Array.from({length: 30}, () => ({u: r(), a: (r() - 0.5) * 0.12, b: (r() - 0.5) * 0.12, sp: 0.8 + r() * 0.4}));
  }, []);
  // Kanne hängt am Griff (Ursprung); kippt um den Griff nach vorn
  const rose = new THREE.Vector3(0, -0.06, 0.38);
  return (
    <group rotation={[THREE.MathUtils.degToRad(tilt), 0, 0]}>
      <mesh material={m.dark} position={[0, -0.04, -0.04]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.07, 0.012, 5, 12, Math.PI]} />
      </mesh>
      <mesh material={m.can} position={[0, -0.18, -0.04]} castShadow>
        <cylinderGeometry args={[0.11, 0.12, 0.24, 12]} />
      </mesh>
      <mesh material={m.dark} position={[0, -0.06, -0.04]}>
        <cylinderGeometry args={[0.112, 0.112, 0.02, 12]} />
      </mesh>
      {/* Tülle */}
      <mesh material={m.can} position={[0, -0.15, 0.19]} rotation={[1.0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.026, 0.3, 6]} />
      </mesh>
      <mesh material={m.rose} position={[rose.x, rose.y + 0.0, rose.z - 0.06]} rotation={[1.0, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.022, 0.05, 10]} />
      </mesh>
      {/* Wasserstrahl: Tropfen fallen aus der Brause (in Welt-Richtung unten → gegen die Kippung drehen) */}
      {water > 0.02 && (
        <group position={[rose.x, rose.y - 0.02, rose.z - 0.03]} rotation={[-THREE.MathUtils.degToRad(tilt), 0, 0]}>
          {drops.map((d, i) => {
            const u = (d.u + time * 1.6 * d.sp) % 1;
            return (
              <mesh key={i} material={m.drop} position={[d.a * (0.3 + u), -u * 0.75 * water, 0.12 * u + d.b * u]} scale={[0.011, 0.024, 0.011]}>
                <icosahedronGeometry args={[1, 0]} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

// ---------------- Nagelschere ----------------
export const NailScissors = ({time, size = 0}: {time: number; size?: number}) => {
  const m = useMemo(() => ({steel: std('#dfe3e8', {metalness: 0.9, roughness: 0.2}), ring: std('#c23b6c', {roughness: 0.4})}), []);
  const open = 0.25 + 0.25 * Math.max(0, Math.sin(time * 14));
  return (
    <group scale={2.2 * (1 + size)}>
      {[-1, 1].map((s) => (
        <group key={s} rotation={[0, (open / 2) * s, 0]}>
          <mesh material={m.steel} position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0015, 0.004, 0.05, 5]} />
          </mesh>
          <mesh material={m.ring} position={[0.008 * s, 0, -0.018]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.009, 0.0025, 4, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ---------------- Sprühdose (in der Hand) ----------------
/** Sprühdose mit grüner Farbe, Sprühkopf zeigt nach +z */
export const SprayCan = () => {
  const m = useMemo(
    () => ({can: std('#e8ecef', {metalness: 0.7, roughness: 0.25}), label: std(PAINT_GREEN, {roughness: 0.4}), cap: std('#1f8a2c'), nozzle: std('#222')}),
    [],
  );
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <group rotation={[Math.PI, 0, 0]}>
        <mesh material={m.can} position={[0, -0.06, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.032, 0.15, 12]} />
        </mesh>
        <mesh material={m.label} position={[0, -0.065, 0]}>
          <cylinderGeometry args={[0.0335, 0.0335, 0.08, 12]} />
        </mesh>
        <mesh material={m.cap} position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.022, 0.03, 0.03, 10]} />
        </mesh>
        <mesh material={m.nozzle} position={[0, 0.052, 0.008]}>
          <boxGeometry args={[0.016, 0.016, 0.02]} />
        </mesh>
      </group>
    </group>
  );
};

// ---------------- Gartentor ----------------
/** Weißes Lattentor im niedrigen Zaun. Ursprung = Scharnier, Tor reicht 1 m nach +z, door 0 zu … 1 offen (dreht nach −x auf) */
export const GardenGate = ({door = 0}: {door?: number}) => {
  const m = useMemo(() => ({white: std('#f5f3ee', {roughness: 0.8}), rail: std('#e6e2d8'), latch: std('#5a5f66', {metalness: 0.6, roughness: 0.4})}), []);
  return (
    <group rotation={[0, -1.7 * clamp(door), 0]}>
      {Array.from({length: 6}, (_, i) => (
        <mesh key={i} material={m.white} position={[0, 0.36, 0.08 + i * 0.17]} castShadow>
          <boxGeometry args={[0.025, 0.72, 0.085]} />
        </mesh>
      ))}
      {[0.18, 0.52].map((h) => (
        <mesh key={h} material={m.rail} position={[0.025, h, 0.5]}>
          <boxGeometry args={[0.035, 0.07, 1.0]} />
        </mesh>
      ))}
      <mesh material={m.latch} position={[0.04, 0.45, 0.95]}>
        <boxGeometry args={[0.03, 0.05, 0.08]} />
      </mesh>
    </group>
  );
};
