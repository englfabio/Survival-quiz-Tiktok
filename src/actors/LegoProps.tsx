import {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {clamp, easeInOut, rng} from '../lib/anim';
import {canvasTex, fitText, TextPlane} from './WgProps';
import {Glint} from './SyringeProps';

/**
 * Spezial „Legostein“ – alles comichaft und harmlos, Low-Poly-Cartoon-Stil, KEINE Marken/Logos (Noppen ohne Schrift).
 *
 *  - LegoBrick ("klemmstein"): einzelner kleiner bunter 2×2-Klemmbaustein (comichaft etwas groß: 0,1 × 0,06 × 0,1 m), Ursprung = Unterseite
 *      Mitte. `glow` = Glitzern (gemein funkelnd), `mark` = Farbe (0 rot, 1 blau, 2 gelb, 3 grün …), `size`.
 *  - BrickMountain ("steinberg"): Berg aus ca. 900 kleinen bunten Steinen, Radius ca. 0,8 m, oben flach auf STEINBERG.top (0,33 m) → Figur
 *      darauf mit y = STEINBERG.top. `fill` 0 … 1 = Steine erscheinen von unten nach oben (Schütten), `size`.
 *  - BrickTub ("steinkiste"): große blaue Spielzeug-Kiste (0,74 × 0,46 × 0,5 m) mit gelbem Rand + Seitengriffen, voller bunter Steine.
 *      Ursprung = MITTE der Griff-Achse (Griffe links/rechts bei x ±0,4 auf halber Höhe) → beim Tragen/Kippen bleiben die Hände an den Griffen.
 *      `tilt` = Grad um x (+ = kippt nach vorn +z, Öffnung zeigt nach vorn), `fill` 0 … 1 = wie voll, `mark` 0 … 1 = Steine prasseln heraus
 *      (Strom nach unten bis zum Boden, Höhe des Ursprungs über dem Boden = `drop`).
 *  - GiantScissors ("riesenschere"): übergroße bunte Spielzeug-Schere (ca. 0,95 m), Kunststoff, abgerundete Spitzen. Ursprung = Drehpunkt
 *      (gelbe Stern-Schraube), Klingen zeigen nach +z, Griffe (pink/türkis) nach −z. `fill` 0 … 1 = geöffnet, `tilt` = Grad um x
 *      (−90 = Klingen nach oben), `turn` = Grad um z (Rolle), `glow` = Glitzern an der Spitze, `size`.
 *  - KeepOutSign ("sperrschild"): gelbes Warnschild 0,95 × 0,5 m mit schwarz-gelbem Rand, Warndreieck und „SPERRGEBIET“, zwei Haken oben
 *      (hängt z. B. am Absperrband). Ursprung = Oberkante Mitte, Schrift zeigt nach +z. `fill` 0 → 1 = ploppt auf, `rumble` = schaukelt.
 *  - Zipline ("seilrutsche"): Seilrutsche quer durch das große Wohnzimmer in WELT-Koordinaten (Figur bei (0, 0), face 180): Stahlseil von
 *      ZIP.a nach ZIP.b mit Wandplatten, Stopper, Laufkatze (gelb, zwei Rollen) + roter Griffstange quer zum Seil (ZIP.handle unter dem Seil)
 *      + orangefarbener Gurt bis zu einer Hüftschlaufe (ZIP.hip unter dem Seil). `fill` 0 … 1 = Lage der Laufkatze zwischen ZIP.start und
 *      ZIP.end, `rumble` = schwingt.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.45, flatShading: true, ...extra});

export const LEGO_COLS = ['#d8322b', '#2f6fd0', '#f2c11d', '#2f9e4a', '#f07a1e', '#ffffff', '#3fb6d8', '#b44fd0'];

/** kleiner 2×2-Stein: Körper + 4 Noppen (Ursprung = Unterseite Mitte) */
const smallBrickGeo = (w = 0.1, h = 0.06, d = 0.1) => {
  const body = new THREE.BoxGeometry(w, h, d);
  body.translate(0, h / 2, 0);
  const parts: THREE.BufferGeometry[] = [body.toNonIndexed()];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const c = new THREE.CylinderGeometry(w * 0.16, w * 0.16, h * 0.3, 8);
      c.translate((sx * w) / 4, h + h * 0.15, (sz * d) / 4);
      parts.push(c.toNonIndexed());
    }
  const g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  return g;
};

export const LegoBrick = ({glow = 0, mark = 0, size = 0, time = 0}: {glow?: number; mark?: number; size?: number; time?: number}) => {
  const geo = useMemo(() => smallBrickGeo(), []);
  const col = LEGO_COLS[Math.round(mark) % LEGO_COLS.length];
  const mat = useMemo(() => std(col, {roughness: 0.25, metalness: 0.05}), [col]);
  const s = 1 + size;
  const tw = glow > 0.01 ? glow * (0.65 + 0.35 * Math.sin(time * 9)) : 0;
  return (
    <group scale={s}>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {tw > 0.01 && (
        <group position={[0.03, 0.1, 0.03]}>
          <Glint amount={tw} size={0.16} />
        </group>
      )}
    </group>
  );
};

// =====================================================================================================
// Steinberg
// =====================================================================================================
export const STEINBERG = {R: 0.82, top: 0.33};

const mountainItems = () => {
  const r = rng(23);
  const {R, top} = STEINBERG;
  const out: {m: THREE.Matrix4; c: string; y: number}[] = [];
  const prof = (d: number) => (d < 0.42 ? top : top * Math.pow(Math.max(0, 1 - (d - 0.42) / (R - 0.42)), 0.9));
  // Schichten von unten nach oben; die oberste Schicht liegt flach (Standfläche)
  for (let y = 0; y <= top + 0.001; y += 0.035) {
    let rr = 0;
    for (let k = 0; k < 60; k++) {
      // Radius, an dem das Profil gerade y erreicht
      const d = (k / 59) * R;
      if (prof(d) >= y) rr = d;
    }
    const n = Math.round(10 + rr * rr * 135);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = rr * Math.sqrt(r());
      const flat = y > top - 0.04;
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(flat ? (r() - 0.5) * 0.25 : (r() - 0.5) * 1.6, r() * Math.PI * 2, flat ? (r() - 0.5) * 0.25 : (r() - 0.5) * 1.6),
      );
      const m = new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * d, Math.max(0, y - 0.03 + r() * 0.02), Math.sin(a) * d), q, new THREE.Vector3(1, 1, 1));
      out.push({m, c: LEGO_COLS[Math.floor(r() * LEGO_COLS.length)], y});
    }
  }
  out.sort((p, q) => p.y - q.y);
  return out;
};

const Instanced = ({items, geometry, count}: {items: {m: THREE.Matrix4; c: string}[]; geometry: THREE.BufferGeometry; count: number}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    items.forEach((it, i) => {
      im.setMatrixAt(i, it.m);
      im.setColorAt(i, new THREE.Color(it.c));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [items]);
  useLayoutEffect(() => {
    if (ref.current) ref.current.count = Math.max(0, Math.min(items.length, count));
  });
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, Math.max(1, items.length)]} castShadow receiveShadow frustumCulled={false}>
      <meshStandardMaterial flatShading roughness={0.3} />
    </instancedMesh>
  );
};

export const BrickMountain = ({fill = 1, size = 0}: {fill?: number; size?: number}) => {
  const geo = useMemo(() => smallBrickGeo(), []);
  const items = useMemo(() => mountainItems(), []);
  const n = Math.round(clamp(fill) * items.length);
  if (n <= 0) return null;
  return (
    <group scale={1 + size}>
      <Instanced items={items} geometry={geo} count={n} />
    </group>
  );
};

// =====================================================================================================
// Spielzeug-Kiste voller Steine
// =====================================================================================================
export const TUB = {w: 0.74, h: 0.46, d: 0.5, handleX: 0.4};

const tubContent = () => {
  const r = rng(5);
  const out: {m: THREE.Matrix4; c: string}[] = [];
  for (let i = 0; i < 70; i++) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 1.2, r() * 6.3, (r() - 0.5) * 1.2));
    out.push({
      m: new THREE.Matrix4().compose(new THREE.Vector3((r() - 0.5) * (TUB.w - 0.14), (r() - 0.5) * 0.06, (r() - 0.5) * (TUB.d - 0.14)), q, new THREE.Vector3(1, 1, 1)),
      c: LEGO_COLS[Math.floor(r() * LEGO_COLS.length)],
    });
  }
  return out;
};

export const BrickTub = ({tilt = 0, fill = 1, pour = 0, drop = 1, time = 0}: {tilt?: number; fill?: number; pour?: number; drop?: number; time?: number}) => {
  const m = useMemo(() => ({blue: std('#2f7fe0', {roughness: 0.35}), rim: std('#f2c11d', {roughness: 0.35}), inner: std('#245fb0', {roughness: 0.5})}), []);
  const geo = useMemo(() => smallBrickGeo(), []);
  const items = useMemo(() => tubContent(), []);
  const {w, h, d, handleX} = TUB;
  const th = (tilt * Math.PI) / 180;
  const level = -h / 2 + 0.05 + (h - 0.1) * clamp(fill); // Oberkante des Inhalts (im Kisten-System)
  // Öffnung (oben Mitte, vorn) nach dem Kippen → Startpunkt des Stroms
  const mouth = new THREE.Vector3(0, h / 2, d / 2 - 0.04).applyEuler(new THREE.Euler(th, 0, 0));
  const streamN = 26;
  const stream = useMemo(() => {
    const r = rng(9);
    return Array.from({length: streamN}, (_, i) => ({ph: i / streamN + r() * 0.03, dx: (r() - 0.5) * 0.32, dz: (r() - 0.5) * 0.12, c: LEGO_COLS[Math.floor(r() * LEGO_COLS.length)], rot: r() * 6}));
  }, []);
  const fallH = Math.max(0.1, drop + mouth.y);
  return (
    <group>
      <group rotation={[th, 0, 0]}>
        {/* Boden + Wände (offen nach oben) */}
        <mesh material={m.blue} position={[0, -h / 2 + 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.04, d]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={`x${s}`} material={m.blue} position={[(s * (w - 0.04)) / 2, 0, 0]} castShadow>
            <boxGeometry args={[0.04, h, d]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`z${s}`} material={m.blue} position={[0, 0, (s * (d - 0.04)) / 2]} castShadow>
            <boxGeometry args={[w, h, 0.04]} />
          </mesh>
        ))}
        {/* gelber Rand */}
        {[-1, 1].map((s) => (
          <mesh key={`rx${s}`} material={m.rim} position={[(s * (w - 0.02)) / 2, h / 2 + 0.015, 0]}>
            <boxGeometry args={[0.06, 0.03, d + 0.04]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`rz${s}`} material={m.rim} position={[0, h / 2 + 0.015, (s * (d - 0.02)) / 2]}>
            <boxGeometry args={[w + 0.04, 0.03, 0.06]} />
          </mesh>
        ))}
        {/* Seitengriffe (gelb) auf der Griff-Achse */}
        {[-1, 1].map((s) => (
          <mesh key={`h${s}`} material={m.rim} position={[s * (handleX - 0.01), 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.05, 0.016, 6, 12, Math.PI]} />
          </mesh>
        ))}
        {/* Inhalt */}
        {fill > 0.02 && (
          <group position={[0, level, 0]}>
            <mesh material={m.inner} position={[0, -0.02, 0]}>
              <boxGeometry args={[w - 0.1, 0.03, d - 0.1]} />
            </mesh>
            <Instanced items={items} geometry={geo} count={items.length} />
          </group>
        )}
      </group>
      {/* Strom aus Steinen: fällt von der Öffnung senkrecht nach unten bis zum Boden */}
      {pour > 0.02 &&
        stream.map((s, i) => {
          const u = (time * 1.6 + s.ph) % 1;
          const y = mouth.y - fallH * u * u;
          const sc = clamp(pour * 1.5) * (u < 0.08 ? u / 0.08 : 1);
          return (
            <mesh key={i} geometry={geo} position={[mouth.x + s.dx, y, mouth.z + 0.05 + s.dz + u * 0.12]} rotation={[s.rot + time * 7, s.rot * 2, time * 5]} scale={sc}>
              <meshStandardMaterial color={s.c} flatShading roughness={0.3} />
            </mesh>
          );
        })}
    </group>
  );
};

// =====================================================================================================
// Riesen-Spielzeugschere
// =====================================================================================================
export const SCISSORS = {blade: 0.5, handle: 0.27, maxOpen: 0.75};

const bladeShape = () => {
  const L = SCISSORS.blade;
  const s = new THREE.Shape();
  s.moveTo(-0.045, -0.02);
  s.lineTo(0.05, -0.02);
  s.quadraticCurveTo(0.055, L * 0.6, 0.03, L - 0.03);
  s.quadraticCurveTo(0.0, L + 0.02, -0.03, L - 0.04);
  s.quadraticCurveTo(-0.045, L * 0.5, -0.045, -0.02);
  return s;
};

export const GiantScissors = ({fill = 0, glow = 0, time = 0}: {fill?: number; glow?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      blade: std('#cfe9ff', {roughness: 0.25, metalness: 0.15, emissive: '#2a5070', emissiveIntensity: 0.12}),
      edge: std('#8fc2ea', {roughness: 0.3}),
      pink: std('#ff4fa3', {roughness: 0.35}),
      teal: std('#18c3b8', {roughness: 0.35}),
      screw: std('#ffd21f', {roughness: 0.3, emissive: '#7a5a00', emissiveIntensity: 0.2}),
    }),
    [],
  );
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(bladeShape(), {depth: 0.026, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 6});
    g.translate(0, 0, -0.013);
    g.rotateX(Math.PI / 2); // Klinge liegt jetzt in der x-z-Ebene, Spitze nach +z (rotateX: y → z), Dicke entlang y
    return g;
  }, []);
  const a = clamp(fill) * SCISSORS.maxOpen * 0.5;
  const H = SCISSORS.handle;
  const half = (side: 1 | -1) => (
    <group rotation={[0, side * a, 0]} position={[0, side * 0.016, 0]}>
      <mesh geometry={geo} material={side > 0 ? m.blade : m.edge} castShadow />
      {/* Griff: Steg + großer Ring */}
      <mesh material={side > 0 ? m.pink : m.teal} position={[side * 0.035, 0, -0.08]} rotation={[0, side * 0.35, 0]} castShadow>
        <boxGeometry args={[0.05, 0.035, 0.14]} />
      </mesh>
      <mesh material={side > 0 ? m.pink : m.teal} position={[side * 0.075, 0, -H + 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.085, 0.028, 8, 16]} />
      </mesh>
    </group>
  );
  return (
    <group>
      {half(1)}
      {half(-1)}
      <mesh material={m.screw} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.03, 5]} />
      </mesh>
      <mesh material={m.screw} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.03, 5]} />
      </mesh>
      {glow > 0.01 && (
        <group position={[0, 0.06, SCISSORS.blade - 0.05]}>
          <Glint amount={glow * (0.6 + 0.4 * Math.sin(time * 8))} size={0.25} />
        </group>
      )}
    </group>
  );
};

// =====================================================================================================
// Warnschild „SPERRGEBIET“
// =====================================================================================================
const signTex = canvasTex(760, 400, (g) => {
  g.fillStyle = '#ffd21f';
  g.fillRect(0, 0, 760, 400);
  // schwarz-gelber Streifenrand
  g.save();
  g.beginPath();
  g.rect(0, 0, 760, 400);
  g.rect(34, 34, 692, 332);
  g.clip('evenodd');
  for (let x = -400; x < 1200; x += 60) {
    g.fillStyle = '#1b1b1b';
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 30, 0);
    g.lineTo(x + 30 - 400, 400);
    g.lineTo(x - 400, 400);
    g.closePath();
    g.fill();
  }
  g.restore();
  // Warndreieck
  g.fillStyle = '#1b1b1b';
  g.beginPath();
  g.moveTo(380, 62);
  g.lineTo(440, 166);
  g.lineTo(320, 166);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffd21f';
  g.beginPath();
  g.moveTo(380, 86);
  g.lineTo(424, 158);
  g.lineTo(336, 158);
  g.closePath();
  g.fill();
  g.fillStyle = '#1b1b1b';
  g.fillRect(375, 104, 10, 32);
  g.fillRect(375, 142, 10, 10);
  g.fillStyle = '#1b1b1b';
  fitText(g, 'SPERRGEBIET', 380, 238, 640, 120, 900);
  g.fillStyle = '#c1271d';
  fitText(g, 'BETRETEN VERBOTEN!', 380, 318, 520, 54, 800);
});

export const KeepOutSign = ({fill = 1, rumble = 0, time = 0}: {fill?: number; rumble?: number; time?: number}) => {
  const m = useMemo(() => ({hook: std('#3a3d42', {metalness: 0.5, roughness: 0.4}), back: std('#e2b812')}), []);
  const f = clamp(fill);
  if (f < 0.01) return null;
  // ploppt mit Überschwingen auf
  const s = f < 1 ? Math.max(0.01, easeInOut(f) * (1 + 0.18 * Math.sin(f * Math.PI))) : 1;
  const sw = rumble * Math.sin(time * 5) * 0.12 + (1 - f) * 0.3 * Math.sin(time * 9);
  const W = 0.95;
  const H = 0.5;
  return (
    <group rotation={[0, 0, sw * 0.4]} scale={s}>
      {[-1, 1].map((k) => (
        <mesh key={k} material={m.hook} position={[k * 0.3, 0.02, 0]}>
          <torusGeometry args={[0.035, 0.008, 5, 10]} />
        </mesh>
      ))}
      <mesh material={m.back} position={[0, -H / 2 - 0.02, -0.012]}>
        <boxGeometry args={[W + 0.02, H + 0.02, 0.018]} />
      </mesh>
      <group position={[0, -H / 2 - 0.02, 0]}>
        <TextPlane draw={signTex} k="sperrgebiet" w={W} h={H} glow={0.4} />
      </group>
    </group>
  );
};

// =====================================================================================================
// Seilrutsche (Welt-Koordinaten im großen Wohnzimmer)
// =====================================================================================================
export const ZIP = {
  a: [-5.46, 3.06, 1.4] as [number, number, number],
  b: [5.46, 2.86, 1.4] as [number, number, number],
  /** Laufkatze fährt von x start (über der Sofa-Armlehne bei z 1.4, Oberkante 0,66 m) bis x end (vor dem Fernseher) */
  start: -4.59,
  end: 3.9,
  /** Griffstange so weit unter dem Seil */
  handle: 0.42,
  /** Hüftschlaufe des Gurts so weit unter dem Seil */
  hip: 1.38,
};
export const zipPoint = (x: number): [number, number, number] => {
  const u = (x - ZIP.a[0]) / (ZIP.b[0] - ZIP.a[0]);
  return [x, ZIP.a[1] + (ZIP.b[1] - ZIP.a[1]) * u, ZIP.a[2] + (ZIP.b[2] - ZIP.a[2]) * u];
};

export const Zipline = ({fill = 0, rumble = 0, time = 0}: {fill?: number; rumble?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      cable: std('#4b5058', {metalness: 0.6, roughness: 0.35}),
      plate: std('#8a9099', {metalness: 0.5, roughness: 0.4}),
      yellow: std('#ffc81f', {roughness: 0.35}),
      wheel: std('#2a2c30', {roughness: 0.5}),
      red: std('#e2342b', {roughness: 0.4}),
      strap: std('#ff8a1f', {roughness: 0.8}),
      stop: std('#e2342b', {roughness: 0.5}),
    }),
    [],
  );
  const A = new THREE.Vector3(...ZIP.a);
  const B = new THREE.Vector3(...ZIP.b);
  const len = A.distanceTo(B);
  const mid = A.clone().add(B).multiplyScalar(0.5);
  const slope = Math.atan2(B.y - A.y, B.x - A.x);
  const x = ZIP.start + (ZIP.end - ZIP.start) * clamp(fill);
  const P = zipPoint(x);
  const swing = rumble * Math.sin(time * 4.2) * 0.12;
  return (
    <group>
      {/* Seil */}
      <mesh material={m.cable} position={mid} rotation={[0, 0, slope - Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, len, 6]} />
      </mesh>
      {/* Wandplatten + Spanner */}
      {[A, B].map((p, i) => (
        <group key={i} position={p}>
          <mesh material={m.plate} position={[i === 0 ? 0.02 : -0.02, 0, 0]}>
            <boxGeometry args={[0.04, 0.3, 0.3]} />
          </mesh>
          <mesh material={m.yellow} position={[i === 0 ? 0.12 : -0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.18, 8]} />
          </mesh>
        </group>
      ))}
      {/* Stopper vor dem Ziel */}
      <mesh material={m.stop} position={zipPoint(ZIP.end + 0.32)} rotation={[0, 0, slope - Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.12, 10]} />
      </mesh>
      {/* Laufkatze + Griff + Gurt */}
      <group position={P}>
        <group rotation={[0, 0, slope]}>
          <mesh material={m.yellow} position={[0, -0.02, 0]} castShadow>
            <boxGeometry args={[0.3, 0.16, 0.1]} />
          </mesh>
          {[-0.09, 0.09].map((wx) => (
            <mesh key={wx} material={m.wheel} position={[wx, 0.03, 0]} rotation={[Math.PI / 2, 0, time * 30 * (fill > 0 && fill < 1 ? 1 : 0)]}>
              <cylinderGeometry args={[0.05, 0.05, 0.12, 10]} />
            </mesh>
          ))}
        </group>
        <group rotation={[swing, 0, 0]}>
          {/* Stange runter zur Griffstange */}
          <mesh material={m.yellow} position={[0, -ZIP.handle / 2, 0]}>
            <cylinderGeometry args={[0.018, 0.018, ZIP.handle, 6]} />
          </mesh>
          {/* Griffstange quer zum Seil (entlang z), rote Griffe */}
          <mesh material={m.yellow} position={[0, -ZIP.handle, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={m.red} position={[0, -ZIP.handle, s * 0.17]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.032, 0.032, 0.13, 8]} />
            </mesh>
          ))}
          {/* Gurt: orangefarbenes Band bis zur Hüftschlaufe */}
          <mesh material={m.strap} position={[-0.06, -(ZIP.hip - 0.08) / 2 - 0.04, 0]} rotation={[0, 0, 0.04]}>
            <boxGeometry args={[0.012, ZIP.hip - 0.08, 0.06]} />
          </mesh>
          <mesh material={m.strap} position={[0, -ZIP.hip, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.025, 6, 18]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
