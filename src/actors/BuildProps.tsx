import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {Car, carPose} from './Car';
import {Dummy, dummyPoseBlended} from './Dummy';
import type {Uniform} from './Dummy';

/**
 * Spezial "T-Rex-Stau" – selbst gestaltete Bauteile (KEINE Original-Spielgrafik), Stau, Urknall.
 *
 * Bauteile (Raster BUILD.S = 7 m breit, BUILD.H = 5,25 m hoch – gleiches Verhältnis wie im Spiel-Bau):
 *  - Wand ("W"): Holzrahmen + senkrechte Bretter + zwei Querstreben. Lage = Mitte der Unterkante, Drehung r (Grad um y),
 *    Wand steht quer zur Richtung r (Fläche zeigt nach r).
 *  - Treppe/Rampe ("S"): schräge Bretterfläche mit Stufen-Leisten, Seitenbalken, Stützen. Lage = Mitte der Grundfläche (Unterkante),
 *    steigt in Richtung r an (r 0 = nach +z, 90 = nach +x, 180 = nach −z, 270 = nach −x); "D" = gleiche Rampe, fällt in Richtung r ab.
 *  - Boden ("F"): flache Bretterfläche mit Rahmen, Lage = Mitte, Höhe = Oberkante.
 *  Bau-Effekt: Fortschritt 0 … 1 je Teil: erst blaue, durchsichtige Bau-Vorschau mit hellen Kanten (0–0,4), dann ploppt das Holz auf.
 * BuildSet ("bau"): Liste der Teile im Feld text ("W x y z r;S x y z r;…"), Wert fill = wie viele Teile fertig (Teil i: clamp(fill − i)).
 * TrafficJam ("stau"): drei Spuren mit Autos (bunt) und genervten Fahrer-Dummys in den vorderen Reihen. Ursprung = vorderste Reihe,
 *  Schlange nach −x (Welt). Lücke für das Auto des Dummys: linke Spur (z −3.75) vorn. Wert fill = Reihen (Standard 9), rumble = ruckeln.
 * BigBang ("urknall"): Wert fill 0 … 1 = neuer Sternenhimmel entsteht (Lichtpunkt → expandierende Sterne + Gas + Galaxien).
 */
export const BUILD = {S: 7, H: 5.25, T: 0.32};

const WOOD = ['#a9784a', '#9a6a3f', '#b5865a', '#8f6038', '#a07045', '#ba8d5f'];
const WOOD_DARK = '#6f4a2b';

const useWoodMats = () =>
  useMemo(
    () => ({
      planks: WOOD.map((c) => new THREE.MeshStandardMaterial({color: c, roughness: 0.85, flatShading: true})),
      dark: new THREE.MeshStandardMaterial({color: WOOD_DARK, roughness: 0.9, flatShading: true}),
      ghost: new THREE.MeshBasicMaterial({color: '#7cc8ff', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide}),
      edge: new THREE.LineBasicMaterial({color: '#e8f6ff', transparent: true, opacity: 0.95}),
    }),
    [],
  );
type WoodMats = ReturnType<typeof useWoodMats>;

/** Brett-Fläche (in x-y-Ebene, Dicke z): n Bretter senkrecht (vertical) oder waagerecht */
const Boards = ({w, h, n, vertical, m, seed, t = BUILD.T * 0.7}: {w: number; h: number; n: number; vertical: boolean; m: WoodMats; seed: number; t?: number}) => {
  const r = useMemo(() => rng(seed), [seed]);
  const items = useMemo(() => Array.from({length: n}, (_, i) => ({i, c: Math.floor(r() * WOOD.length), j: (r() - 0.5) * 0.04})), [n, r]);
  const step = (vertical ? w : h) / n;
  return (
    <group>
      {items.map(({i, c, j}) =>
        vertical ? (
          <mesh key={i} material={m.planks[c]} position={[-w / 2 + step * (i + 0.5), j, 0]} castShadow receiveShadow>
            <boxGeometry args={[step * 0.94, h, t]} />
          </mesh>
        ) : (
          <mesh key={i} material={m.planks[c]} position={[j, -h / 2 + step * (i + 0.5), 0]} castShadow receiveShadow>
            <boxGeometry args={[w, step * 0.94, t]} />
          </mesh>
        ),
      )}
    </group>
  );
};

/** Holzwand: Ursprung = Mitte der Unterkante, Fläche in x-y, Dicke z */
const WallWood = ({m, seed}: {m: WoodMats; seed: number}) => {
  const {S, H, T} = BUILD;
  const beam = 0.36;
  return (
    <group>
      <group position={[0, H / 2, 0]}>
        <Boards w={S - 0.2} h={H - 0.2} n={11} vertical m={m} seed={seed} />
      </group>
      {/* Rahmen */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.dark} position={[s * (S / 2 - beam / 2), H / 2, 0]} castShadow>
          <boxGeometry args={[beam, H, T * 1.5]} />
        </mesh>
      ))}
      {[beam / 2, H - beam / 2, H * 0.5].map((y) => (
        <mesh key={y} material={m.dark} position={[0, y, T * 0.55]} castShadow>
          <boxGeometry args={[S, beam * 0.8, T * 0.6]} />
        </mesh>
      ))}
      {/* Querstreben */}
      {[1, -1].map((s) => (
        <mesh key={s} material={m.dark} position={[0, H / 2, -T * 0.55]} rotation={[0, 0, s * Math.atan2(H, S)]} castShadow>
          <boxGeometry args={[Math.hypot(S, H) * 0.95, beam * 0.6, T * 0.5]} />
        </mesh>
      ))}
    </group>
  );
};

/** Holzrampe: steigt nach +z, Ursprung = Mitte der Grundfläche unten */
const StairWood = ({m, seed}: {m: WoodMats; seed: number}) => {
  const {S, H, T} = BUILD;
  const ang = Math.atan2(H, S);
  const len = Math.hypot(S, H);
  return (
    <group>
      <group position={[0, H / 2, 0]} rotation={[-ang, 0, 0]}>
        {/* Brett-Fläche (Bretter quer) */}
        <group rotation={[Math.PI / 2, 0, 0]} position={[0, -T * 0.35, 0]}>
          <Boards w={S - 0.3} h={len} n={12} vertical={false} m={m} seed={seed} />
        </group>
        {/* Stufen-Leisten (wie Treppenstufen) */}
        {Array.from({length: 7}, (_, i) => (
          <mesh key={i} material={m.dark} position={[0, T * 0.12, -len / 2 + (len / 7) * (i + 0.5)]} castShadow>
            <boxGeometry args={[S - 0.4, 0.14, 0.24]} />
          </mesh>
        ))}
        {/* Seitenbalken */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.dark} position={[s * (S / 2 - 0.18), -0.05, 0]} castShadow>
            <boxGeometry args={[0.36, 0.55, len]} />
          </mesh>
        ))}
      </group>
      {/* Stützen unter dem hohen Ende + Mitte */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={m.dark} position={[s * (S / 2 - 0.25), H / 2 - 0.2, S / 2 - 0.3]} castShadow>
            <boxGeometry args={[0.3, H - 0.4, 0.3]} />
          </mesh>
          <mesh material={m.dark} position={[s * (S / 2 - 0.25), H / 4 - 0.1, 0.1]} castShadow>
            <boxGeometry args={[0.26, H / 2 - 0.2, 0.26]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Holzboden: Ursprung = Mitte, Oberkante y = 0 */
const FloorWood = ({m, seed}: {m: WoodMats; seed: number}) => {
  const {S, T} = BUILD;
  return (
    <group>
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, -T * 0.35, 0]}>
        <Boards w={S - 0.3} h={S - 0.3} n={12} vertical={false} m={m} seed={seed} />
      </group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={m.dark} position={[s * (S / 2 - 0.18), -0.15, 0]} castShadow>
            <boxGeometry args={[0.36, 0.5, S]} />
          </mesh>
          <mesh material={m.dark} position={[0, -0.15, s * (S / 2 - 0.18)]} castShadow>
            <boxGeometry args={[S, 0.5, 0.36]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Bau-Vorschau (blaue, durchsichtige Form mit hellen Kanten) */
const Ghost = ({kind, m, alpha}: {kind: string; m: WoodMats; alpha: number}) => {
  const {S, H, T} = BUILD;
  const geo = useMemo(() => {
    if (kind === 'W') {
      const g = new THREE.BoxGeometry(S, H, T * 1.2);
      g.translate(0, H / 2, 0);
      return g;
    }
    if (kind === 'F') {
      const g = new THREE.BoxGeometry(S, T, S);
      g.translate(0, -T / 2, 0);
      return g;
    }
    const len = Math.hypot(S, H);
    const g = new THREE.BoxGeometry(S, T, len);
    g.rotateX(-Math.atan2(H, S));
    g.translate(0, H / 2, 0);
    return g;
  }, [kind, S, H, T]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  const gm = useMemo(() => m.ghost.clone(), [m]);
  const em = useMemo(() => m.edge.clone(), [m]);
  gm.opacity = 0.32 * alpha;
  em.opacity = 0.95 * alpha;
  return (
    <group>
      <mesh geometry={geo} material={gm} />
      <lineSegments geometry={edges} material={em} />
    </group>
  );
};

/** Ein Bauteil mit Bau-Effekt (p 0 … 1) */
export const BuildPiece = ({kind, p, seed}: {kind: string; p: number; seed: number}) => {
  const m = useWoodMats();
  if (p <= 0.001) return null;
  const ghostA = p < 0.4 ? clamp(p / 0.15) : clamp(1 - (p - 0.4) / 0.25);
  const wood = clamp((p - 0.35) / 0.4);
  // Holz ploppt auf: wächst schnell + federt nach
  const pop = wood <= 0 ? 0 : wood < 1 ? 0.6 + 0.4 * easeInOut(wood) + Math.sin(wood * Math.PI) * 0.08 : 1;
  const k = kind === 'D' ? 'S' : kind;
  return (
    <group rotation={kind === 'D' ? [0, Math.PI, 0] : undefined}>
      {ghostA > 0.01 && <Ghost kind={k} m={m} alpha={ghostA} />}
      {wood > 0 && (
        <group scale={[pop, k === 'W' ? pop : 1, k === 'W' ? 1 : pop]}>
          {k === 'W' && <WallWood m={m} seed={seed} />}
          {k === 'S' && <StairWood m={m} seed={seed} />}
          {k === 'F' && <FloorWood m={m} seed={seed} />}
        </group>
      )}
    </group>
  );
};

/** Liste aus dem Textfeld: "W x y z r;S x y z r;…" */
export const parseBuild = (text?: string) =>
  (text ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [kind, x, y, z, r] = s.split(/\s+/);
      return {kind, x: +x, y: +y, z: +z, r: +r};
    });

export const BuildSet = ({text, fill}: {text?: string; fill: number}) => {
  const pieces = useMemo(() => parseBuild(text), [text]);
  return (
    <group>
      {pieces.map((q, i) => (
        <group key={i} position={[q.x, q.y, q.z]} rotation={[0, (q.r * Math.PI) / 180, 0]}>
          <BuildPiece kind={q.kind} p={clamp(fill - i)} seed={i * 13 + 5} />
        </group>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Stau: Autos in drei Spuren + genervte Fahrer
// ---------------------------------------------------------------------------------------------
const JAM_COLORS = ['#2f6fcf', '#e3b94b', '#3f9a4a', '#d23a2c', '#7d4f8f', '#f2f2ee', '#1fbfae', '#ff7aa8', '#ef8a34', '#5b6b7a', '#c9d64a'];
const DRIVER: {color: string; uniform: Uniform}[] = [
  {color: '#8fd0c0', uniform: {jacket: '#9cc3e6', dark: '#6f9cc4', collar: '#f4f6f8', pants: '#3a3f46', cap: '#9cc3e6', band: '#9cc3e6', trim: '#9cc3e6', nocap: true}},
  {color: '#f2b38a', uniform: {jacket: '#c66a8a', dark: '#9a4d68', collar: '#f6e9ee', pants: '#2f3542', cap: '#c66a8a', band: '#c66a8a', trim: '#c66a8a', nocap: true, hair: '#3a2618'}},
  {color: '#b8a6e0', uniform: {jacket: '#6a8f4a', dark: '#4d6b35', collar: '#eef0e6', pants: '#4a3d30', cap: '#6a8f4a', band: '#6a8f4a', trim: '#6a8f4a', nocap: true}},
  {color: '#9fd17a', uniform: {jacket: '#b5473a', dark: '#82322a', collar: '#f2e6d6', pants: '#3a3f46', cap: '#b5473a', band: '#b5473a', trim: '#b5473a', nocap: true}},
  {color: '#c9a3d9', uniform: {jacket: '#3d6b8f', dark: '#2a4d6b', collar: '#e9e6e1', pants: '#2f3542', cap: '#3d6b8f', band: '#3d6b8f', trim: '#3d6b8f', nocap: true, hair: '#5a3622'}},
];
/** Plätze im Stau (relativ zur vordersten Reihe, Welt-Richtung): Spur z, Abstand x */
export const jamSlots = (rows = 9) => {
  const r = rng(42);
  const out: {x: number; z: number; color: string; driver: number}[] = [];
  const lanes = [-3.75, 0, 3.75];
  for (let i = 0; i < rows; i++) {
    lanes.forEach((z, li) => {
      if (i === 0 && li === 0) return; // Platz für das Auto des Dummys (linke Spur vorn)
      out.push({x: -i * 6.4 - r() * 1.2 - (li === 1 ? 0 : 0.6), z: z + (r() - 0.5) * 0.3, color: JAM_COLORS[Math.floor(r() * JAM_COLORS.length)], driver: i < 3 ? out.length % DRIVER.length : -1});
    });
  }
  return out;
};

export const TrafficJam = ({rows = 9, time = 0, rumble = 0}: {rows?: number; time?: number; rumble?: number}) => {
  const slots = useMemo(() => jamSlots(rows), [rows]);
  const pose = carPose('park', 0, 0);
  return (
    <group>
      {slots.map((s, i) => {
        const bob = rumble * Math.abs(Math.sin(time * 4 + i * 1.7)) * 0.025;
        const motion = i % 3 === 1 ? 'wheeltap' : i % 3 === 2 ? 'buckled' : 'wheeltap';
        return (
          // Auto blickt nach +x (Welt): Drehung 90°
          <group key={i} position={[s.x, bob, s.z]} rotation={[0, Math.PI / 2, 0]}>
            <Car pose={pose} color={s.color} />
            {s.driver >= 0 && (
              <group position={[0.3, motion === 'buckled' ? 0 : 0.02, -0.2]}>
                <Dummy
                  pose={dummyPoseBlended(motion, time + i * 0.77, 0)}
                  color={DRIVER[s.driver].color}
                  uniform={DRIVER[s.driver].uniform}
                  brow={1}
                />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Urknall: neuer Sternenhimmel entsteht
// ---------------------------------------------------------------------------------------------
const glowTex = (inner: string, mid: string) => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.3, mid);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const galaxyTex = (hue: number) => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const r = rng(Math.round(hue * 1000));
  const core = g.createRadialGradient(128, 128, 0, 128, 128, 40);
  core.addColorStop(0, 'rgba(255,250,230,1)');
  core.addColorStop(1, 'rgba(255,230,180,0)');
  g.fillStyle = core;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const arm = i % 2;
    const d = r() * 110;
    const a = d * 0.055 + arm * Math.PI + (r() - 0.5) * 0.5;
    const x = 128 + Math.cos(a) * d;
    const y = 128 + Math.sin(a) * d * 0.55;
    const col = new THREE.Color().setHSL(hue + r() * 0.08, 0.7, 0.75 + r() * 0.2);
    g.fillStyle = `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},${0.25 + r() * 0.6})`;
    g.fillRect(x, y, 1.6, 1.6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export const BigBang = ({fill, camPos}: {fill: number; camPos: [number, number, number]}) => {
  const data = useMemo(() => {
    const r = rng(11);
    const N = 1800;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const d = 0.25 + Math.pow(r(), 0.6) * 0.75;
      pos.set([d * s * Math.cos(th), d * u * 0.8, d * s * Math.sin(th)], i * 3);
      const c = new THREE.Color().setHSL(r() < 0.5 ? 0.58 + r() * 0.1 : 0.08 + r() * 0.06, 0.6, 0.8);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const gas = [glowTex('rgba(255,255,255,1)', 'rgba(255,220,150,0.6)'), glowTex('rgba(170,110,255,0.7)', 'rgba(90,50,200,0.25)'), glowTex('rgba(80,190,255,0.6)', 'rgba(30,90,200,0.2)'), glowTex('rgba(255,130,180,0.55)', 'rgba(160,50,110,0.2)')];
    const gal = [galaxyTex(0.58), galaxyTex(0.08), galaxyTex(0.78)];
    const clouds = Array.from({length: 10}, (_, i) => ({d: [(r() - 0.5) * 2, (r() - 0.5) * 1.2, (r() - 0.5) * 2] as [number, number, number], s: 0.5 + r() * 0.5, k: 1 + (i % 3)}));
    return {geo, gas, gal, clouds};
  }, []);
  if (fill <= 0.0001) return null;
  // Lichtpunkt (0–0,12) → Explosion → Ausdehnung
  const core = fill < 0.12 ? easeInOut(fill / 0.12) : 1 - easeInOut(clamp((fill - 0.12) / 0.5));
  const R = 2 + 70 * Math.pow(easeInOut(clamp((fill - 0.06) / 0.94)), 0.8);
  const starA = clamp((fill - 0.08) / 0.15);
  const galA = clamp((fill - 0.45) / 0.3);
  const spin = fill * 2.5;
  const look = (p: [number, number, number]) => {
    const o = new THREE.Object3D();
    o.position.set(...p);
    o.lookAt(...camPos);
    return o.quaternion.clone();
  };
  return (
    <group>
      <group scale={R} rotation={[0, spin * 0.3, 0]}>
        <points geometry={data.geo}>
          <pointsMaterial size={2.4} sizeAttenuation={false} vertexColors transparent opacity={starA} depthWrite={false} fog={false} />
        </points>
      </group>
      {/* Gaswolken */}
      {data.clouds.map((c, i) => {
        const p: [number, number, number] = [c.d[0] * R * 0.6, c.d[1] * R * 0.6, c.d[2] * R * 0.6];
        return (
          <mesh key={i} position={p} quaternion={look(p)}>
            <planeGeometry args={[R * c.s, R * c.s]} />
            <meshBasicMaterial map={data.gas[c.k]} transparent opacity={0.55 * starA * (1 - galA * 0.4)} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
          </mesh>
        );
      })}
      {/* Galaxien formen sich */}
      {[
        [-0.35, 0.2, -0.1],
        [0.4, -0.15, -0.3],
        [0.05, 0.38, -0.45],
      ].map((d, i) => {
        const p: [number, number, number] = [d[0] * R, d[1] * R, d[2] * R];
        return (
          <group key={i} position={p} quaternion={look(p)}>
            <mesh rotation={[0, 0, spin * (i % 2 ? 1 : -1) + i]}>
              <planeGeometry args={[R * 0.32, R * 0.32]} />
              <meshBasicMaterial map={data.gal[i]} transparent opacity={galA} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
            </mesh>
          </group>
        );
      })}
      {/* heller Kern */}
      {core > 0.01 && (
        <mesh quaternion={look([0, 0, 0])}>
          <planeGeometry args={[3 + 30 * core, 3 + 30 * core]} />
          <meshBasicMaterial map={data.gas[0]} transparent opacity={core} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
      )}
    </group>
  );
};
