import {useMemo} from 'react';
import * as THREE from 'three';
import {T} from '../ui/theme';
import {clamp} from '../lib/anim';
import {useFontTexture} from './ToothProps';

/**
 * Objekte für das Bahnhof-Video "herrenloser Koffer" (wiederverwendbar):
 *  - Suitcase ("koffer"): großer Hartschalenkoffer (verschlossen, ohne Namensschild), dunkelblau mit Rillen, zwei Schnallen
 *      oben vorn, Tragegriff oben, Teleskopgriff (handle 0 … 1), vier Rollen. Ursprung = Boden unter der Hinterkante
 *      (Achse der hinteren Rollen) Mitte, Front nach +z. Ca. 0,48 × 0,8 × 0,3 m. tilt (Grad) = nach vorn (+z) kippen um die
 *      Rollen-Achse (zum Ziehen ca. 40°).
 *  - CordonTape ("absperrband"): rot-weißes Absperrband um ein Quadrat (Kantenlänge 2 × (1.4 + size)), vier rot-weiße
 *      Pfosten an den Ecken. fill 0 … 1 = wie weit das Band schon gespannt ist (startet an der Ecke hinten links,
 *      läuft gegen den Uhrzeigersinn von oben gesehen: hinten links → vorn links → vorn rechts → hinten rechts → zurück).
 *      Pfosten erscheinen, sobald das Band sie erreicht. Ursprung = Mitte am Boden.
 *  - Bill ("rechnung"): Zettel mit großem Euro-Zeichen und ein paar Zeilen ("RECHNUNG"). Ursprung = Mitte. ca. 15 × 21 cm.
 *      size = größer (z. B. 0.6 für gut lesbar im Hochformat).
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.55, flatShading: true, ...extra});

export const CASE = {w: 0.48, h: 0.74, d: 0.3, wheel: 0.06, handleTop: 0.42};

export const Suitcase = ({handle = 0, tilt = 0, color = '#2a4e7a'}: {handle?: number; tilt?: number; color?: string}) => {
  const m = useMemo(
    () => ({
      shell: std(color, {roughness: 0.35}),
      rib: std(new THREE.Color(color).multiplyScalar(0.78).getStyle(), {roughness: 0.4}),
      seam: std('#1a1d22'),
      metal: std('#c9ced4', {metalness: 0.7, roughness: 0.25}),
      wheel: std('#202326'),
    }),
    [color],
  );
  const {w, h, d, wheel} = CASE;
  const hl = clamp(handle) * CASE.handleTop;
  return (
    <group rotation={[(tilt * Math.PI) / 180, 0, 0]}>
      <group position={[0, 0, d / 2 + 0.02]}>
        {/* Körper (zwei Schalen mit Naht) */}
        <mesh material={m.shell} position={[0, wheel + h / 2, d / 4]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d / 2 - 0.006]} />
        </mesh>
        <mesh material={m.shell} position={[0, wheel + h / 2, -d / 4]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d / 2 - 0.006]} />
        </mesh>
        <mesh material={m.seam} position={[0, wheel + h / 2, 0]}>
          <boxGeometry args={[w - 0.004, h - 0.004, 0.02]} />
        </mesh>
        {/* abgerundete Kanten (Wülste) */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.shell} position={[s * (w / 2 - 0.005), wheel + h / 2, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, h - 0.02, 6]} />
          </mesh>
        ))}
        {/* Rillen vorn */}
        {[-0.15, -0.05, 0.05, 0.15].map((x) => (
          <mesh key={x} material={m.rib} position={[x, wheel + h / 2, d / 2 - 0.002]}>
            <boxGeometry args={[0.035, h - 0.1, 0.012]} />
          </mesh>
        ))}
        {/* zwei Schnallen oben vorn an der Naht */}
        {[-0.14, 0.14].map((x) => (
          <group key={x} position={[x, wheel + h - 0.004, 0.012]}>
            <mesh material={m.metal}>
              <boxGeometry args={[0.07, 0.03, 0.05]} />
            </mesh>
            <mesh material={m.seam} position={[0, 0.006, 0.026]}>
              <boxGeometry args={[0.03, 0.012, 0.004]} />
            </mesh>
          </group>
        ))}
        {/* Tragegriff oben */}
        <mesh material={m.seam} position={[0, wheel + h + 0.035, 0]} castShadow>
          <boxGeometry args={[0.16, 0.025, 0.035]} />
        </mesh>
        {[-0.075, 0.075].map((x) => (
          <mesh key={x} material={m.seam} position={[x, wheel + h + 0.016, 0]}>
            <boxGeometry args={[0.022, 0.035, 0.035]} />
          </mesh>
        ))}
        {/* Teleskopgriff (hinten oben) */}
        {[-0.09, 0.09].map((x) => (
          <mesh key={`t${x}`} material={m.metal} position={[x, wheel + h + hl / 2 - 0.005, -d / 2 + 0.035]}>
            <boxGeometry args={[0.02, hl + 0.02, 0.02]} />
          </mesh>
        ))}
        <mesh material={m.seam} position={[0, wheel + h + hl + 0.012, -d / 2 + 0.035]} castShadow>
          <boxGeometry args={[0.22, 0.035, 0.035]} />
        </mesh>
        {/* Rollen */}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} material={m.wheel} position={[sx * (w / 2 - 0.05), wheel / 2, sz * (d / 2 - 0.05)]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[wheel / 2, wheel / 2, 0.03, 10]} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
};

/** rot-weiß gestreiftes Band (Textur) */
const stripeTex = (() => {
  let t: THREE.Texture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 16;
    const g = c.getContext('2d')!;
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#ffffff' : '#e3201b';
      g.beginPath();
      g.moveTo(i * 16, 0);
      g.lineTo(i * 16 + 16, 0);
      g.lineTo(i * 16 + 8, 16);
      g.lineTo(i * 16 - 8, 16);
      g.closePath();
      g.fill();
    }
    t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();

const Post = () => (
  <group>
    <mesh position={[0, 0.02, 0]}>
      <cylinderGeometry args={[0.16, 0.18, 0.04, 10]} />
      <meshStandardMaterial color="#2a2d31" flatShading />
    </mesh>
    {[0, 1, 2, 3, 4].map((i) => (
      <mesh key={i} position={[0, 0.09 + i * 0.19, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.19, 8]} />
        <meshStandardMaterial color={i % 2 ? '#ffffff' : '#e3201b'} flatShading />
      </mesh>
    ))}
  </group>
);

const TapeStrip = ({len, tex}: {len: number; tex: THREE.Texture}) => {
  const L = Math.round(len * 100) / 100;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(Math.max(0.01, L), 0.07);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * Math.max(0.01, L) / 0.5);
    return g;
  }, [L]);
  return (
    <mesh geometry={geo} rotation={[0, Math.PI / 2, 0]}>
      <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.6} />
    </mesh>
  );
};

export const CordonTape = ({fill = 1, size = 0}: {fill?: number; size?: number}) => {
  const tex = useMemo(() => stripeTex(), []);
  const a = 1.4 + size;
  const H = 0.92;
  // Ecken: hinten links → vorn links → vorn rechts → hinten rechts → hinten links (+z = vorn, +x = rechts)
  const pts: [number, number][] = [
    [-a, -a],
    [-a, a],
    [a, a],
    [a, -a],
    [-a, -a],
  ];
  const total = 4 * 2 * a;
  let left = clamp(fill) * total;
  const segs: {x0: number; z0: number; x1: number; z1: number; len: number}[] = [];
  const posts: [number, number][] = [pts[0]];
  for (let i = 0; i < 4 && left > 0.001; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[i + 1];
    const L = 2 * a;
    const f = Math.min(1, left / L);
    segs.push({x0, z0, x1: x0 + (x1 - x0) * f, z1: z0 + (z1 - z0) * f, len: L * f});
    if (f >= 0.999 && i < 3) posts.push(pts[i + 1]);
    left -= L;
  }
  return (
    <group>
      {posts.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Post />
        </group>
      ))}
      {segs.map((s, i) => {
        const mid = new THREE.Vector3((s.x0 + s.x1) / 2, H, (s.z0 + s.z1) / 2);
        const ang = Math.atan2(s.x1 - s.x0, s.z1 - s.z0);
        return (
          <group key={`s${i}`} position={mid} rotation={[0, ang, 0]}>
            <TapeStrip len={s.len} tex={tex} />
          </group>
        );
      })}
    </group>
  );
};

/** Absperrband-Rolle (in der Hand des Polizisten bei "tapewalk") */
export const TapeRoll = () => (
  <group>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.07, 0.07, 0.08, 12]} />
      <meshStandardMaterial color="#e3201b" flatShading />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.072, 0.072, 0.02, 12]} />
      <meshStandardMaterial color="#ffffff" flatShading />
    </mesh>
  </group>
);

const billTexture = () => {
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 420;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbfaf5';
  g.fillRect(0, 0, 300, 420);
  g.fillStyle = '#26292e';
  g.font = `800 50px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('RECHNUNG', 150, 48);
  g.fillStyle = '#c1271d';
  g.font = `800 210px ${T.font}`;
  g.fillText('€', 150, 200);
  g.fillStyle = '#9aa0a8';
  for (let i = 0; i < 4; i++) g.fillRect(40, 312 + i * 22, i === 3 ? 120 : 220, 9);
  g.strokeStyle = '#26292e';
  g.lineWidth = 3;
  g.strokeRect(6, 6, 288, 408);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

export const Bill = ({size = 0}: {size?: number}) => {
  const tex = useFontTexture(billTexture, 'Rechnung');
  const mat = useMemo(
    () =>
      tex
        ? new THREE.MeshStandardMaterial({map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.45, roughness: 0.8, side: THREE.DoubleSide})
        : new THREE.MeshStandardMaterial({color: '#fbfaf5', side: THREE.DoubleSide}),
    [tex],
  );
  const s = 1 + size;
  return (
    <group scale={s}>
      <mesh material={mat}>
        <planeGeometry args={[0.15, 0.21]} />
      </mesh>
    </group>
  );
};
