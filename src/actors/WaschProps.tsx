import {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {clamp} from '../lib/anim';
import {Sparkle} from './NeighborProps';

/**
 * Spezial „Waschmaschine“ – Objekte (alle OHNE Logo/Markenaufdruck, comichaft):
 *  - WashingMachine ("waschmaschine"): XXL-Frontlader (2,0 × 2,6 × 2,0 m, comichaft übergroß, damit der Dummy hineinpasst).
 *    Front zeigt nach +z des eigenen Systems (face 180 = zur Kamera). IMMER AUS: Anzeige dunkel, Drehknopf auf 0, keine Lämpchen,
 *    die Trommel dreht sich nie, kein Wasser. Wert `door` 0 zu … 1 offen (Tür links angeschlagen, schwenkt nach vorn links).
 *    Trommel innen: Boden bei y 0,43 (WM.floorY), Bullauge-Mitte y 1,25, Trommel-Radius 0,82, Tiefe z −0,8 … 0,95.
 *  - LaundryBasket ("waeschekorb"): weißer Plastik-Wäschekorb mit bunter Wäsche
 *  - SoftenerBottle ("weichspueler"): pastell-lila Flasche mit Wolken-Bild (kein Name); `smoke` = dampft wie eine Duftkerze
 *    (Dampf-Kringel + warmes Glimmen, KEINE Flamme), `size`
 *  - TowelBlanket ("handtuchdecke"): türkises Handtuch mit Streifen als Decke (über ausgestreckten Beinen), `fill` 0 … 1 = wird
 *    ausgebreitet (gefaltet → glatt)
 *  - SweaterPillow ("pullikissen"): zusammengelegter roter Strickpulli als kleines Kissen
 *  - Sock / FavSock ("lieblingssocke"): einzelne Socke; Ursprung = Bündchen oben (hängt in der Hand nach unten).
 *    Lieblingssocke rot-weiß geringelt mit gelbem Stern, `glow` = Glitzern; `size` = größer (im Riesen-Innenraum ca. 2,6)
 */
export const WM = {W: 2.0, H: 2.6, D: 2.0, cy: 1.25, drumR: 0.82, openR: 0.78, frontZ: 1.0, drumBackZ: -0.8, floorY: 0.43, hingeX: -0.95, doorR: 0.88};

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

/** Lochblech der Trommel (Edelstahl mit kleinen Löchern) */
export const drumTexture = (repeat: [number, number], dark = '#5c646c', base = '#c9d0d6') => {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 128, 128);
  grd.addColorStop(0, base);
  grd.addColorStop(0.5, '#e4e9ed');
  grd.addColorStop(1, base);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = dark;
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      g.beginPath();
      g.arc(16 + x * 32 + (y % 2) * 16, 16 + y * 32, 5, 0, Math.PI * 2);
      g.fill();
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
};

export const WashingMachine = ({door = 0}: {door?: number}) => {
  const m = useMemo(
    () => ({
      enamel: std('#f4f5f3', {roughness: 0.35}),
      enamelDark: std('#dfe2e2', {roughness: 0.4}),
      plinth: std('#8e9396'),
      chrome: std('#cfd6dc', {roughness: 0.2, metalness: 0.75}),
      rubber: std('#5d6266', {roughness: 0.9}),
      drum: new THREE.MeshStandardMaterial({map: drumTexture([10, 3]), roughness: 0.35, metalness: 0.55, side: THREE.DoubleSide}),
      drumBack: new THREE.MeshStandardMaterial({map: drumTexture([4, 4]), roughness: 0.35, metalness: 0.55, side: THREE.DoubleSide}),
      glass: new THREE.MeshStandardMaterial({color: '#bfe2f2', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide}),
      shine: new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false}),
      display: std('#1d2226', {roughness: 0.15}),
      knob: std('#c8cdd1', {roughness: 0.3, metalness: 0.4}),
      mark: std('#30363b'),
    }),
    [],
  );
  const front = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-WM.W / 2, 0.12);
    s.lineTo(WM.W / 2, 0.12);
    s.lineTo(WM.W / 2, 2.15);
    s.lineTo(-WM.W / 2, 2.15);
    s.closePath();
    const h = new THREE.Path();
    h.absarc(0, WM.cy, WM.openR, 0, Math.PI * 2, true);
    s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, {depth: 0.04, bevelEnabled: false, curveSegments: 40});
    g.translate(0, 0, WM.frontZ - 0.04);
    return g;
  }, []);
  const ang = -clamp(door) * 1.9;
  const len = WM.frontZ - 0.04 - WM.drumBackZ;
  return (
    <group>
      {/* Gehäuse */}
      <mesh geometry={front} material={m.enamel} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.enamel} position={[(s * (WM.W - 0.04)) / 2, 1.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.04, 2.6, WM.D]} />
        </mesh>
      ))}
      <mesh material={m.enamelDark} position={[0, 1.3, -WM.D / 2 + 0.02]}>
        <boxGeometry args={[WM.W, 2.6, 0.04]} />
      </mesh>
      <mesh material={m.enamel} position={[0, 2.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[WM.W, 0.44, WM.D]} />
      </mesh>
      <mesh material={m.enamelDark} position={[0, 2.605, 0]}>
        <boxGeometry args={[WM.W + 0.02, 0.03, WM.D + 0.02]} />
      </mesh>
      <mesh material={m.plinth} position={[0, 0.06, -0.02]}>
        <boxGeometry args={[WM.W - 0.08, 0.12, WM.D - 0.04]} />
      </mesh>
      {[-0.85, 0.85].map((x) => [-0.85, 0.85].map((z) => (
        <mesh key={`${x}${z}`} material={m.rubber} position={[x, 0.03, z]}>
          <cylinderGeometry args={[0.06, 0.07, 0.06, 10]} />
        </mesh>
      )))}
      {/* Bedienfeld: Waschmittel-Schublade, Drehknopf auf 0, dunkle Anzeige (AUS), Tasten ohne Licht */}
      <group position={[0, 2.38, WM.frontZ + 0.005]}>
        <mesh material={m.enamelDark} position={[-0.62, 0, 0.01]}>
          <boxGeometry args={[0.6, 0.3, 0.03]} />
        </mesh>
        <mesh material={m.plinth} position={[-0.62, -0.08, 0.03]}>
          <boxGeometry args={[0.3, 0.05, 0.02]} />
        </mesh>
        <mesh material={m.display} position={[0.12, 0.02, 0.01]}>
          <boxGeometry args={[0.42, 0.17, 0.02]} />
        </mesh>
        <group position={[0.66, 0, 0.03]}>
          <mesh material={m.knob} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.14, 0.06, 24]} />
          </mesh>
          {/* Zeiger auf 0 (oben) */}
          <mesh material={m.mark} position={[0, 0.08, 0.035]}>
            <boxGeometry args={[0.02, 0.07, 0.01]} />
          </mesh>
        </group>
        {[-0.02, 0.12, 0.26].map((x) => (
          <mesh key={x} material={m.knob} position={[x, -0.12, 0.015]}>
            <boxGeometry args={[0.07, 0.035, 0.02]} />
          </mesh>
        ))}
      </group>
      {/* Gummi-Manschette + Trommel (steht still) */}
      <mesh material={m.rubber} position={[0, WM.cy, WM.frontZ - 0.07]}>
        <torusGeometry args={[WM.openR + 0.005, 0.05, 10, 48]} />
      </mesh>
      <mesh material={m.drum} position={[0, WM.cy, WM.frontZ - 0.04 - len / 2]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[WM.drumR, WM.drumR, len, 40, 1, true]} />
      </mesh>
      <mesh material={m.drumBack} position={[0, WM.cy, WM.drumBackZ]}>
        <circleGeometry args={[WM.drumR, 40]} />
      </mesh>
      <mesh material={m.chrome} position={[0, WM.cy, WM.drumBackZ + 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.05, 20]} />
      </mesh>
      {/* Mitnehmer-Rippen (oben + an den Seiten, unten frei) */}
      {[Math.PI, Math.PI / 3, -Math.PI / 3].map((a, i) => (
        <mesh key={i} material={m.chrome} position={[Math.sin(a) * (WM.drumR - 0.05), WM.cy - Math.cos(a) * (WM.drumR - 0.05), WM.frontZ - 0.1 - len / 2]} rotation={[0, 0, -a]}>
          <boxGeometry args={[0.12, 0.1, len - 0.15]} />
        </mesh>
      ))}
      <pointLight position={[0, WM.cy + 0.45, 0.1]} intensity={1.1} distance={2.4} decay={1.5} color="#fff4e6" />
      {/* Tür (links angeschlagen) */}
      <group position={[WM.hingeX, WM.cy, WM.frontZ + 0.07]} rotation={[0, ang, 0]}>
        <group position={[-WM.hingeX, 0, 0]}>
          <mesh material={m.enamel} castShadow>
            <torusGeometry args={[WM.doorR - 0.1, 0.1, 12, 48]} />
          </mesh>
          <mesh material={m.chrome} position={[0, 0, 0.06]}>
            <torusGeometry args={[WM.doorR - 0.17, 0.035, 8, 48]} />
          </mesh>
          <mesh material={m.glass} position={[0, 0, 0.02]}>
            <circleGeometry args={[WM.doorR - 0.16, 40]} />
          </mesh>
          {/* Glanzlicht auf dem Glas */}
          <mesh material={m.shine} position={[-0.25, 0.3, 0.05]} rotation={[0, 0, 0.6]}>
            <ringGeometry args={[0.42, 0.47, 20, 1, 0, 1.0]} />
          </mesh>
          {/* Griff rechts */}
          <mesh material={m.enamelDark} position={[WM.doorR - 0.06, 0, 0.08]}>
            <boxGeometry args={[0.1, 0.4, 0.08]} />
          </mesh>
          {/* Scharnier */}
          <mesh material={m.chrome} position={[-(WM.doorR - 0.02), 0, -0.02]}>
            <boxGeometry args={[0.1, 0.34, 0.08]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

/** Weißer Wäschekorb (ca. 0,62 × 0,42 m) mit bunter Wäsche */
export const LaundryBasket = () => {
  const m = useMemo(() => ({white: std('#f3f4f6', {roughness: 0.5}), hole: std('#c9cfd6')}), []);
  const clothes = ['#e2574c', '#4aa3df', '#f4c542', '#7bc67b', '#b98ad8', '#ff9f68'];
  return (
    <group>
      <mesh material={m.white} position={[0, 0.2, 0]} scale={[1, 1, 0.72]} castShadow receiveShadow>
        <cylinderGeometry args={[0.33, 0.29, 0.4, 20, 1, true]} />
      </mesh>
      <mesh material={m.white} position={[0, 0.01, 0]} scale={[1, 1, 0.72]}>
        <cylinderGeometry args={[0.29, 0.29, 0.02, 20]} />
      </mesh>
      <mesh material={m.white} position={[0, 0.4, 0]} scale={[1, 1, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.33, 0.02, 6, 24]} />
      </mesh>
      {/* Löcher */}
      {Array.from({length: 12}).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} material={m.hole} position={[Math.sin(a) * 0.315, 0.24, Math.cos(a) * 0.315 * 0.72]} rotation={[0, a, 0]}>
            <boxGeometry args={[0.07, 0.16, 0.01]} />
          </mesh>
        );
      })}
      {clothes.map((c, i) => (
        <mesh key={i} position={[Math.sin(i * 2.1) * 0.14, 0.38 + (i % 3) * 0.04, Math.cos(i * 1.7) * 0.08]} rotation={[i, i * 0.7, 0.3 * i]} scale={[1.3, 0.45, 0.9]}>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshStandardMaterial color={c} flatShading roughness={0.95} />
        </mesh>
      ))}
      {/* ein Ärmel hängt heraus */}
      <mesh position={[0.3, 0.3, 0.12]} rotation={[0.2, 0, -0.4]}>
        <cylinderGeometry args={[0.045, 0.05, 0.3, 8]} />
        <meshStandardMaterial color="#4aa3df" flatShading roughness={0.95} />
      </mesh>
    </group>
  );
};

/** Weichspüler-Flasche (ca. 0,32 m hoch), pastell-lila, Wolken-Bild statt Name. smoke > 0 = dampft wie eine Duftkerze */
export const SoftenerBottle = ({smoke = 0, time = 0, size = 0}: {smoke?: number; time?: number; size?: number}) => {
  const m = useMemo(
    () => ({
      body: std('#b9a3e3', {roughness: 0.3}),
      cap: std('#ffffff', {roughness: 0.3}),
      label: std('#f6f2ff', {roughness: 0.6}),
      cloud: std('#8fc9f2'),
      steam: new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false}),
      glow: new THREE.MeshBasicMaterial({color: '#ffd59a', transparent: true, opacity: 0.35, depthWrite: false}),
    }),
    [],
  );
  const s = smoke;
  return (
    <group scale={1 + size}>
      <mesh material={m.body} position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.16, 0.26, 0.1]} />
      </mesh>
      <mesh material={m.body} position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.05, 0.075, 0.05, 12]} />
      </mesh>
      {/* Griff hinten */}
      <mesh material={m.body} position={[0, 0.17, -0.06]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.05, 0.015, 6, 12, Math.PI]} />
      </mesh>
      <mesh material={m.cap} position={[0, 0.315, 0]}>
        <cylinderGeometry args={[0.042, 0.045, 0.045, 12]} />
      </mesh>
      {/* Etikett mit Wolke + Blümchen */}
      <mesh material={m.label} position={[0, 0.12, 0.051]}>
        <planeGeometry args={[0.12, 0.13]} />
      </mesh>
      {[[-0.025, 0.12], [0.01, 0.135], [0.035, 0.118]].map(([x, y], i) => (
        <mesh key={i} material={m.cloud} position={[x, y, 0.053]}>
          <circleGeometry args={[0.022 + (i === 1 ? 0.008 : 0), 12]} />
        </mesh>
      ))}
      {/* Duftkerzen-Dampf: drei Kringel steigen auf und verblassen + warmes Glimmen */}
      {s > 0.01 && (
        <group position={[0, 0.34, 0]}>
          <mesh material={m.glow} scale={s * (1 + 0.08 * Math.sin(time * 5))}>
            <sphereGeometry args={[0.07, 12, 8]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => {
            const u = (time * 0.45 + i * 0.25) % 1;
            const mat = m.steam.clone();
            mat.opacity = 0.55 * s * Math.sin(Math.PI * u);
            return (
              <mesh key={i} material={mat} position={[Math.sin(u * 7 + i) * 0.035, 0.03 + u * 0.32, 0]} rotation={[0, 0, u * 3 + i]} scale={0.6 + u * 0.9}>
                <torusGeometry args={[0.03, 0.009, 6, 14, Math.PI * 1.3]} />
              </mesh>
            );
          })}
          <group position={[0.05, 0.12, 0.02]}>
            <Sparkle time={time} size={0.035 * s} />
          </group>
          <group position={[-0.06, 0.2, 0.02]}>
            <Sparkle time={time} phase={0.5} size={0.03 * s} />
          </group>
        </group>
      )}
    </group>
  );
};

const stripeTex = (base: string, stripe: string, n: number, vertical = false) => {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = stripe;
  for (let i = 0; i < n; i++) {
    if (vertical) g.fillRect((i * 64) / n, 0, 32 / n, 64);
    else g.fillRect(0, (i * 64) / n, 64, 32 / n);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/** Handtuch als Decke (0,8 × 1,05 m), wölbt sich über ausgestreckte Beine. Ursprung = Mitte unten, Länge entlang +z */
export const TowelBlanket = ({fill = 1}: {fill?: number}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.8, 1.05, 10, 14);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const over = Math.max(0, Math.cos((x / 0.4) * (Math.PI / 2)));
      p.setY(i, 0.16 * Math.pow(over, 0.8) + 0.02 * Math.sin(z * 9 + x * 4));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => {
    const t = stripeTex('#3fb8b0', '#f4f1e6', 3);
    t.repeat.set(1, 1);
    return new THREE.MeshStandardMaterial({map: t, roughness: 1, side: THREE.DoubleSide});
  }, []);
  const k = clamp(fill);
  // gefaltet (kleines Paket) → ausgebreitet
  return (
    <group>
      <mesh geometry={geo} material={mat} scale={[0.45 + 0.55 * k, 1 + 0.6 * (1 - k), 0.3 + 0.7 * k]} castShadow receiveShadow />
    </group>
  );
};

/** Zusammengelegter roter Strickpulli als Kissen (ca. 0,5 × 0,16 × 0,34 m) */
export const SweaterPillow = () => {
  const mat = useMemo(() => {
    const t = stripeTex('#c8413a', '#b13831', 8, true);
    t.repeat.set(3, 1);
    return new THREE.MeshStandardMaterial({map: t, roughness: 1, flatShading: true});
  }, []);
  const cuff = useMemo(() => std('#a83029', {roughness: 1}), []);
  return (
    <group>
      <mesh material={mat} position={[0, 0.08, 0]} scale={[1, 0.55, 0.7]} castShadow>
        <sphereGeometry args={[0.26, 14, 10]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={mat} position={[s * 0.1, 0.13, 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.045, 0.28, 8]} />
        </mesh>
      ))}
      <mesh material={cuff} position={[0, 0.085, 0.16]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.35]}>
        <torusGeometry args={[0.17, 0.025, 6, 20, Math.PI]} />
      </mesh>
    </group>
  );
};

/** Socken-Form (Ursprung = Bündchen oben, Schaft nach unten, Fuß nach +z): Schaft + Ferse + Fuß + Spitze, ca. 0,42 m */
export const sockGeometry = (seg = 10) => {
  const r = 0.045;
  const leg = new THREE.CylinderGeometry(r, r, 0.22, seg, 1, true);
  leg.translate(0, -0.11, 0);
  const heel = new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2));
  heel.translate(0, -0.22, 0);
  const foot = new THREE.CylinderGeometry(r, r * 0.95, 0.17, seg, 1, true);
  foot.rotateX(Math.PI / 2);
  foot.translate(0, -0.22, 0.085);
  const toe = new THREE.SphereGeometry(r * 0.95, seg, Math.max(4, seg - 2));
  toe.scale(1, 0.85, 1.2);
  toe.translate(0, -0.22, 0.17);
  const parts = [leg, heel, foot, toe].map((g) => g.toNonIndexed());
  parts.forEach((g) => g.deleteAttribute('uv'));
  return mergeGeometries(parts)!;
};
/** Bündchen (Ring oben) */
export const sockCuffGeometry = (seg = 10) => {
  const g = new THREE.CylinderGeometry(0.049, 0.049, 0.05, seg, 1, true);
  g.translate(0, -0.025, 0);
  return g;
};

export const SOCK_COLORS = ['#e2574c', '#4aa3df', '#f4c542', '#7bc67b', '#b98ad8', '#ff9f68', '#2f3542', '#f2f2f0', '#ff7eb3', '#36c2b4', '#8a6a4f', '#5b6fd8'];

/** Einzelne Socke (Farbe + Bündchen) */
export const Sock = ({color = '#4aa3df', cuff = '#f4f1e6'}: {color?: string; cuff?: string}) => {
  const geo = useMemo(() => sockGeometry(), []);
  const cg = useMemo(() => sockCuffGeometry(), []);
  return (
    <group>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color={color} roughness={1} flatShading />
      </mesh>
      <mesh geometry={cg}>
        <meshStandardMaterial color={cuff} roughness={1} flatShading side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

/** Lieblingssocke von 2016: rot-weiß geringelt, gelber Stern auf dem Schaft, glitzert (glow) */
export const FavSock = ({glow = 0, time = 0, size = 0}: {glow?: number; time?: number; size?: number}) => {
  const geo = useMemo(() => {
    const r = 0.045;
    const leg = new THREE.CylinderGeometry(r, r, 0.22, 12, 1, true);
    leg.translate(0, -0.11, 0);
    return leg;
  }, []);
  const rest = useMemo(() => {
    const r = 0.045;
    const heel = new THREE.SphereGeometry(r, 12, 8);
    heel.translate(0, -0.22, 0);
    const foot = new THREE.CylinderGeometry(r, r * 0.95, 0.17, 12, 1, true);
    foot.rotateX(Math.PI / 2);
    foot.translate(0, -0.22, 0.085);
    const toe = new THREE.SphereGeometry(r * 0.95, 12, 8);
    toe.scale(1, 0.85, 1.2);
    toe.translate(0, -0.22, 0.17);
    return mergeGeometries([heel, foot, toe].map((g) => g.toNonIndexed()))!;
  }, []);
  const m = useMemo(() => {
    const t = stripeTex('#e23b3b', '#ffffff', 4);
    t.repeat.set(1, 1.5);
    return {
      striped: new THREE.MeshStandardMaterial({map: t, roughness: 0.9, side: THREE.DoubleSide}),
      red: std('#e23b3b', {roughness: 0.9}),
      star: new THREE.MeshStandardMaterial({color: '#ffd21a', emissive: '#ffb300', emissiveIntensity: 0.4, roughness: 0.5, side: THREE.DoubleSide}),
      halo: new THREE.MeshBasicMaterial({color: '#fff2a8', transparent: true, opacity: 0.25, depthWrite: false}),
    };
  }, []);
  const star = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = i % 2 === 0 ? 0.032 : 0.014;
      if (i === 0) s.moveTo(Math.sin(a) * rr, Math.cos(a) * rr);
      else s.lineTo(Math.sin(a) * rr, Math.cos(a) * rr);
    }
    return new THREE.ShapeGeometry(s);
  }, []);
  const g = clamp(glow);
  return (
    <group scale={1 + size}>
      <mesh geometry={geo} material={m.striped} castShadow />
      <mesh geometry={rest} material={m.red} castShadow />
      <mesh material={m.striped} position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.049, 0.049, 0.04, 12, 1, true]} />
      </mesh>
      <mesh geometry={star} material={m.star} position={[0, -0.12, 0.047]} />
      <mesh geometry={star} material={m.star} position={[0, -0.12, -0.047]} rotation={[0, Math.PI, 0]} />
      {g > 0.01 && (
        <>
          <mesh material={m.halo} position={[0, -0.15, 0.06]} scale={g * (1 + 0.1 * Math.sin(time * 4))}>
            <sphereGeometry args={[0.2, 14, 10]} />
          </mesh>
          {[[0.09, -0.05, 0.06, 0], [-0.08, -0.2, 0.06, 0.4], [0.1, -0.26, 0.12, 0.8], [-0.04, 0.03, 0.05, 1.2]].map(([x, y, z, ph], i) => (
            <group key={i} position={[x, y, z]}>
              <Sparkle time={time} phase={ph} size={0.05 * g} />
            </group>
          ))}
        </>
      )}
    </group>
  );
};
