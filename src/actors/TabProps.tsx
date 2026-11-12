import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut} from '../lib/anim';
import {T} from '../ui/theme';
import {useFontTexture} from './ToothProps';

/**
 * Objekte für das Video "Spülmaschinentab" (Erste Hilfe bei Vergiftung), alle wiederverwendbar:
 *  - DishTab ("spuelmaschinentab"): bunter Tab (weiße + blaue Schicht, rote Perle), ohne Markennamen.
 *      bitten = sichtbare Bissstelle an einer Ecke (gezackter Rand). Ursprung = Mitte unten. Ca. 4 × 3 × 1,6 cm.
 *  - TabPack ("tabpackung"): neutrale Packung Tabs ohne Markennamen, Aufschrift "TABS", Tab-Bild, orange Warnraute.
 *      Oben offen (zwei Tabs schauen heraus) – open 0 = zu. Ursprung = Mitte unten. Ca. 22 × 16 × 11 cm.
 *  - MilkGlass ("milchglas"): großes Glas Milch (ca. 15 cm), fill 1 = voll … 0 = leer. Ursprung = Boden.
 *  - KitchenRoll ("kuechenpapier"): Rolle Küchenpapier im Halter, ein Blatt hängt herunter. Ursprung = Boden.
 *  - PaperSheet: einzelnes Blatt Küchenpapier (hält der Dummy bei "spit").
 *  - ChildLockCabinet ("oberschrank"): Oberschrank (Wandschrank) mit Kindersicherung. Ursprung = unten hinten Mitte
 *      (an die Wand setzen). door 0 = zu … 1 = offen (Tür rechts angeschlagen, Kindersicherung links), lock 1 = Kindersicherung eingerastet
 *      (rotes Schloss mit Bügel, grüner Punkt), 0 = offen. Innen ein Regalboden bei 0,22 m.
 *  - WarnBadge: gelbes Warndreieck mit "!" (immer zur Kamera, z. B. neben den Organ-Pfeilen).
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

// ---------- Spülmaschinentab ----------
const TAB_W = 0.04;
const TAB_D = 0.03;
/** Umriss des Tabs (x/z) – bitten: Ecke vorn rechts mit gezacktem Bissrand */
const tabShape = (bitten: boolean, inset = 0) => {
  const w = TAB_W / 2 - inset;
  const d = TAB_D / 2 - inset;
  const s = new THREE.Shape();
  s.moveTo(-w, -d);
  s.lineTo(w, -d);
  if (bitten) {
    const r = 0.017;
    const cx = TAB_W / 2;
    const cy = TAB_D / 2;
    s.lineTo(w, cy - r);
    const N = 9;
    for (let i = 0; i <= N; i++) {
      const a = -Math.PI / 2 - (i / N) * (Math.PI / 2);
      const rr = r * (i % 2 === 0 ? 1 : 0.8);
      s.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    s.lineTo(-w, d);
  } else {
    s.lineTo(w, d);
    s.lineTo(-w, d);
  }
  s.closePath();
  return s;
};
const layerGeo = (bitten: boolean, depth: number, inset = 0) => {
  const g = new THREE.ExtrudeGeometry(tabShape(bitten, inset), {depth, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 1});
  g.rotateX(Math.PI / 2); // Umriss → x/z-Ebene (Umriss-y wird z), Extrusion zeigt danach nach −y
  g.translate(0, depth, 0);
  return g;
};
const TAB_GEO = {
  base: [layerGeo(false, 0.009), layerGeo(true, 0.009)],
  top: [layerGeo(false, 0.006, 0.0006), layerGeo(true, 0.006, 0.0006)],
};

export const DishTab = ({bitten = false}: {bitten?: boolean}) => {
  const m = useMemo(
    () => ({
      white: std('#f5f7fa', {roughness: 0.85}),
      blue: std('#2f7ee6', {roughness: 0.5}),
      red: std('#e8352c', {roughness: 0.25, emissive: '#5a0a06', emissiveIntensity: 0.3}),
      speck: std('#2fc46a', {roughness: 0.6}),
      crumb: std('#eaf0f6', {roughness: 0.9}),
    }),
    [],
  );
  const b = bitten ? 1 : 0;
  // Bissrand: Krümel-Kanten etwas heller
  return (
    <group>
      <mesh geometry={TAB_GEO.base[b]} material={m.white} castShadow />
      <mesh geometry={TAB_GEO.top[b]} material={m.blue} position={[0, 0.0095, 0]} castShadow />
      <mesh material={m.red} position={[-0.006, 0.0165, 0.0]} castShadow>
        <sphereGeometry args={[0.0062, 10, 8]} />
      </mesh>
      {[
        [-0.013, 0.0045, 0.0095],
        [0.004, 0.0045, -0.0095],
        [-0.015, 0.0045, -0.008],
        [0.012, 0.0045, -0.002],
      ].map(([x, y, z], i) =>
        bitten && x > 0.003 && z > 0.0 ? null : (
          <mesh key={i} material={m.speck} position={[x, y, z + (z > 0 ? 0.0062 : -0.0062)]}>
            <boxGeometry args={[0.004, 0.0035, 0.0015]} />
          </mesh>
        ),
      )}
      {bitten &&
        [
          [0.012, 0.005, 0.007],
          [0.007, 0.012, 0.011],
        ].map(([x, y, z], i) => (
          <mesh key={i} material={m.crumb} position={[x, y, z]} rotation={[i, i * 2, 0]}>
            <boxGeometry args={[0.0025, 0.0025, 0.0025]} />
          </mesh>
        ))}
    </group>
  );
};

// ---------- Packung Tabs ----------
const packTexture = () => {
  const c = document.createElement('canvas');
  c.width = 440;
  c.height = 320;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 320);
  grd.addColorStop(0, '#3fb4e8');
  grd.addColorStop(1, '#1f6fc2');
  g.fillStyle = grd;
  g.fillRect(0, 0, 440, 320);
  // weiße Welle
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath();
  g.moveTo(0, 210);
  g.bezierCurveTo(120, 170, 260, 260, 440, 200);
  g.lineTo(440, 320);
  g.lineTo(0, 320);
  g.closePath();
  g.fill();
  // Schrift
  g.fillStyle = '#ffffff';
  g.font = `800 120px ${T.font}`;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillText('TABS', 28, 128);
  // Tab-Bild
  g.save();
  g.translate(300, 150);
  g.rotate(-0.15);
  g.fillStyle = '#f5f7fa';
  g.fillRect(-80, -10, 160, 70);
  g.fillStyle = '#2f7ee6';
  g.fillRect(-80, -40, 160, 34);
  g.fillStyle = '#e8352c';
  g.beginPath();
  g.arc(-10, -28, 18, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // orange Warnraute mit "!"
  g.save();
  g.translate(64, 262);
  g.rotate(Math.PI / 4);
  g.fillStyle = '#ffffff';
  g.fillRect(-40, -40, 80, 80);
  g.strokeStyle = '#e5322d';
  g.lineWidth = 9;
  g.strokeRect(-36, -36, 72, 72);
  g.restore();
  g.fillStyle = '#111111';
  g.font = `800 64px ${T.font}`;
  g.textAlign = 'center';
  g.fillText('!', 64, 285);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

export const TabPack = ({open = 1}: {open?: number}) => {
  const tex = useFontTexture(packTexture, 'Tab-Packung');
  const m = useMemo(
    () => ({
      side: std('#2a86d6', {roughness: 0.7}),
      inner: std('#cfe6f7', {roughness: 0.9}),
      front: tex ? new THREE.MeshStandardMaterial({map: tex, roughness: 0.6}) : std('#2a86d6'),
    }),
    [tex],
  );
  const W = 0.22;
  const H = 0.16;
  const D = 0.11;
  const o = clamp(open);
  return (
    <group>
      <mesh material={[m.side, m.side, m.inner, m.side, m.front, m.front]} position={[0, H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      {/* Deckel-Lasche (hinten angeschlagen) */}
      <group position={[0, H, -D / 2]} rotation={[-o * 1.9, 0, 0]}>
        <mesh material={m.side} position={[0, 0, D / 2]} castShadow>
          <boxGeometry args={[W, 0.004, D]} />
        </mesh>
      </group>
      {o > 0.3 && (
        <>
          <group position={[-0.045, H - 0.022, 0.0]} rotation={[0.35, 0.2, 0.1]} scale={1.1}>
            <DishTab />
          </group>
          <group position={[0.045, H - 0.026, 0.005]} rotation={[0.25, -0.3, -0.12]} scale={1.1}>
            <DishTab />
          </group>
        </>
      )}
    </group>
  );
};

// ---------- Glas Milch ----------
export const MilkGlass = ({fill = 1}: {fill?: number}) => {
  const m = useMemo(
    () => ({
      glass: new THREE.MeshStandardMaterial({color: '#eef7ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide}),
      milk: new THREE.MeshStandardMaterial({color: '#fbfbf6', roughness: 0.35, emissive: '#ffffff', emissiveIntensity: 0.08}),
      rim: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.1, transparent: true, opacity: 0.6}),
    }),
    [],
  );
  const H = 0.15;
  const f = clamp(fill, 0.02, 1);
  const mh = (H - 0.015) * 0.9 * f;
  return (
    <group>
      <mesh material={m.glass} position={[0, H / 2, 0]} renderOrder={5}>
        <cylinderGeometry args={[0.045, 0.038, H, 16, 1, true]} />
      </mesh>
      <mesh material={m.glass} position={[0, 0.005, 0]} renderOrder={5}>
        <cylinderGeometry args={[0.038, 0.038, 0.01, 16]} />
      </mesh>
      <mesh material={m.milk} position={[0, 0.01 + mh / 2, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.038 + 0.0065 * (mh / H), 0.0375, mh, 16]} />
      </mesh>
      <mesh material={m.rim} position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.045, 0.0018, 4, 20]} />
      </mesh>
    </group>
  );
};

// ---------- Küchenpapier ----------
const paperTexture = () => {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#dfe7ee';
  for (let y = 8; y < 128; y += 16) for (let x = (y / 16) % 2 ? 8 : 16; x < 128; x += 16) g.fillRect(x - 2, y - 2, 4, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
export const PaperSheet = ({w = 0.2, h = 0.22}: {w?: number; h?: number}) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({map: paperTexture(), roughness: 0.95, side: THREE.DoubleSide}), []);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h, 6, 6);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      p.setZ(i, 0.03 * Math.cos((x / w) * Math.PI) - 0.01 * Math.sin((y / h) * 5));
    }
    g.computeVertexNormals();
    return g;
  }, [w, h]);
  return <mesh geometry={geo} material={mat} castShadow />;
};
export const KitchenRoll = () => {
  const m = useMemo(
    () => ({
      paper: new THREE.MeshStandardMaterial({map: paperTexture(), roughness: 0.95}),
      wood: std('#b88a57', {roughness: 0.8}),
      core: std('#a77b4c'),
    }),
    [],
  );
  return (
    <group>
      <mesh material={m.wood} position={[0, 0.01, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.085, 0.02, 16]} />
      </mesh>
      <mesh material={m.wood} position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.3, 8]} />
      </mesh>
      <mesh material={m.paper} position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.062, 0.062, 0.26, 18]} />
      </mesh>
      <mesh material={m.core} position={[0, 0.281, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.004, 10]} />
      </mesh>
      {/* herabhängendes Blatt */}
      <group position={[0.0, 0.16, 0.064]}>
        <mesh material={m.paper}>
          <planeGeometry args={[0.24, 0.17]} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- Oberschrank mit Kindersicherung ----------
export const CABINET = {W: 0.62, H: 0.6, D: 0.34, shelf: 0.22};
export const ChildLockCabinet = ({door = 0, lock = 1, hinge = 'right'}: {door?: number; lock?: number; hinge?: 'left' | 'right'}) => {
  /** h = −1: Tür rechts angeschlagen (Scharnier bei +x), +1: links */
  const h = hinge === 'right' ? -1 : 1;
  const m = useMemo(
    () => ({
      body: std('#6f8f78', {roughness: 0.55}),
      inner: std('#e9e4d8', {roughness: 0.9}),
      handle: std('#d9dde2', {roughness: 0.25, metalness: 0.7}),
      latch: std('#e5322d', {roughness: 0.4}),
      latchWhite: std('#f6f6f2', {roughness: 0.5}),
      shackle: std('#cfd4d9', {roughness: 0.2, metalness: 0.8}),
      ok: new THREE.MeshBasicMaterial({color: '#22d35f'}),
      open: new THREE.MeshBasicMaterial({color: '#ffc400'}),
    }),
    [],
  );
  const {W, H, D, shelf} = CABINET;
  const t = 0.018;
  const o = easeInOut(clamp(door));
  const l = clamp(lock);
  return (
    <group>
      {/* Korpus: Rückwand, Seiten, Boden, Deckel */}
      <mesh material={m.inner} position={[0, H / 2, t / 2]} receiveShadow>
        <boxGeometry args={[W, H, t]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.body} position={[(s * (W - t)) / 2, H / 2, D / 2]} castShadow>
          <boxGeometry args={[t, H, D]} />
        </mesh>
      ))}
      <mesh material={m.body} position={[0, t / 2, D / 2]} castShadow>
        <boxGeometry args={[W, t, D]} />
      </mesh>
      <mesh material={m.body} position={[0, H - t / 2, D / 2]} castShadow>
        <boxGeometry args={[W, t, D]} />
      </mesh>
      <mesh material={m.inner} position={[0, shelf, D / 2]}>
        <boxGeometry args={[W - 2 * t, 0.014, D - 0.03]} />
      </mesh>
      {/* Tür (rechts angeschlagen, öffnet nach vorn) – mit hinge="left" links angeschlagen */}
      <group position={[(-h * W) / 2, 0, D]} rotation={[0, -h * o * 1.75, 0]}>
        <mesh material={m.body} position={[(h * W) / 2, H / 2, t / 2]} castShadow>
          <boxGeometry args={[W - 0.004, H - 0.004, t]} />
        </mesh>
        <mesh material={m.handle} position={[h * (W - 0.06), 0.12, t + 0.012]}>
          <boxGeometry args={[0.022, 0.14, 0.022]} />
        </mesh>
        {/* Kindersicherung: Riegel-Teil an der Tür */}
        <group position={[h * (W - 0.008), H - 0.1, t + 0.012]}>
          <mesh material={m.latchWhite}>
            <boxGeometry args={[0.07, 0.07, 0.024]} />
          </mesh>
          <mesh material={m.latch} position={[0, 0, 0.013]}>
            <boxGeometry args={[0.055, 0.055, 0.006]} />
          </mesh>
          <mesh material={l > 0.5 ? m.ok : m.open} position={[0, -0.012, 0.0175]}>
            <circleGeometry args={[0.009, 12]} />
          </mesh>
        </group>
      </group>
      {/* Kindersicherung: Gegenstück an der Seitenwand + Bügel, der über die Tür greift */}
      <group position={[h * (W / 2 + 0.012), H - 0.1, D + t]}>
        <mesh material={m.latchWhite} position={[h * 0.012, 0, -0.04]}>
          <boxGeometry args={[0.024, 0.07, 0.09]} />
        </mesh>
        <mesh material={m.latch} position={[h * 0.025, 0, -0.04]}>
          <boxGeometry args={[0.004, 0.055, 0.075]} />
        </mesh>
        {/* Bügel: liegt geschlossen vorn auf dem Riegel (lock 1), steht offen zur Seite (lock 0) */}
        <group position={[h * 0.012, 0, 0.0]} rotation={[0, h * (1 - l) * 1.4, 0]}>
          <mesh material={m.latch} position={[-h * 0.03, 0.022, 0.024]}>
            <boxGeometry args={[0.07, 0.014, 0.012]} />
          </mesh>
          <mesh material={m.latch} position={[-h * 0.03, -0.022, 0.024]}>
            <boxGeometry args={[0.07, 0.014, 0.012]} />
          </mesh>
        </group>
        {/* kleines Schloss-Symbol */}
        <group position={[h * 0.034, 0.075, -0.035]} rotation={[0, (h * Math.PI) / 2, 0]}>
          <mesh material={m.latch}>
            <boxGeometry args={[0.04, 0.034, 0.012]} />
          </mesh>
          <mesh material={m.shackle} position={[0, 0.02 + (1 - l) * 0.012, 0]}>
            <torusGeometry args={[0.013, 0.0035, 6, 12, Math.PI]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ---------- Warndreieck ----------
const warnTexture = () => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 230;
  const g = c.getContext('2d')!;
  const tri = (pad: number) => {
    g.beginPath();
    g.moveTo(128, pad);
    g.lineTo(256 - pad, 222 - pad * 0.6);
    g.lineTo(pad, 222 - pad * 0.6);
    g.closePath();
  };
  g.lineJoin = 'round';
  g.fillStyle = '#111111';
  tri(4);
  g.lineWidth = 16;
  g.strokeStyle = '#111111';
  g.stroke();
  g.fill();
  g.fillStyle = T.yellow;
  tri(30);
  g.fill();
  g.fillStyle = '#111111';
  g.fillRect(116, 80, 24, 74);
  g.beginPath();
  g.arc(128, 178, 14, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
export const WarnBadge = ({size = 0.12, amount = 1}: {size?: number; amount?: number}) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({map: warnTexture(), depthTest: false, transparent: true}), []);
  const s = size * clamp(amount);
  if (s < 0.001) return null;
  return <sprite material={mat} scale={[s * 1.11, s, 1]} renderOrder={45} />;
};
