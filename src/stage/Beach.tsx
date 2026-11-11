import {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {Instances, Sky, type Inst} from './Forest';
import {waveHeight as lakeWaves} from './Lake';
import type {StageCam, StageDef} from './types';

/**
 * Bühne "meeresstrand": heller Sandstrand an Nord-/Ostsee im Sommerlicht.
 * Flaches, klares Wasser mit sanften Wellen (Wasseroberfläche wie beim Seeufer, hier mit
 * Tiefe-abhängiger Durchsicht und Schaum am Spülsaum), Dünen mit Strandhafer, Dünenzaun,
 * zwei Buhnen aus Holzpfählen, ein Sonnenschirm mit Handtuch.
 *
 * Koordinaten (1 Einheit = 1 Meter):
 * - Wasseroberfläche bei y = 0. Das Meer liegt bei −z, der Strand bei +z.
 * - Wasserlinie bei z ≈ 0 (leicht geschwungen, siehe beachShoreZ).
 * - Im Wasser: Grund fällt sehr flach ab (z −5 ≈ 25 cm tief, z −11 ≈ 55 cm), ab z ≈ −12 wird es
 *   schnell tief (z −16 ≈ 1,5 m, ab z −22 ca. 3 m) → dort schwimmen.
 * - Strand steigt sanft an, Dünen mit Strandhafer ab z ≈ 11, Dünenzaun bei z ≈ 10.
 * - Buhnen (Holzpfähle) bei x ≈ −15 und x ≈ +17, Sonnenschirm + Handtuch bei (4.5, 5).
 * - Figuren stehen auf dem Grund (auch im Wasser). Mit "swim"/"struggle" bezieht sich y auf die
 *   Wasseroberfläche (swim: y ≈ −0.3; struggle: y ≈ −1.6 → Kopf gerade noch über Wasser).
 * - Dummy ist auf dieser Bühne automatisch barfuß.
 */

const C = {
  skyTop: '#4f9fe0',
  skyHorizon: '#eaf5fb',
  fog: '#dcecf4',
  sand: '#ecdcae',
  sandDark: '#e0cc98',
  wetSand: '#cdb685',
  seaSand: '#cdb37a',
  seaSandDeep: '#8f8a6c',
  dune: '#e6d5a3',
  shallow: '#2fc6d6',
  mid: '#139fc6',
  deep: '#0b6ea3',
  far: '#2a86ad',
  foam: '#ffffff',
  wood: '#8b6a48',
  woodDark: '#6f5238',
  grass: ['#a7b276', '#8e9c62', '#bfc38c', '#9aa96a'],
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Wasserlinie (z) abhängig von x */
export const beachShoreZ = (x: number) => 0.3 * Math.sin(x * 0.08) + 0.15 * Math.sin(x * 0.21 + 2);

/** Geländehöhe (im Wasser = Meeresgrund) */
export const beachTerrain = (x: number, z: number) => {
  const d = z - beachShoreZ(x);
  if (d >= 0) {
    let h = 0.035 * Math.min(d, 12) + 0.004 * Math.sin(x * 1.7 + z * 0.9);
    // Dünen
    const k = smoothstep(10.5, 16, d);
    h += k * (1.7 + 0.7 * Math.sin(x * 0.13) + 0.45 * Math.sin(x * 0.37 + z * 0.21) + 0.3 * Math.cos(x * 0.6 - z * 0.4));
    if (d > 20) h += (d - 20) * 0.08;
    return h;
  }
  // Meeresgrund: sehr flach, mit kleinen Sandrippeln; ab ca. 12 m schnell tiefer
  let h = Math.max(-0.58, d * 0.05) + 0.012 * Math.sin(x * 2.2 + z * 0.4) * Math.min(1, -d);
  if (d < -12) h -= Math.min(2.6, (-12 - d) * 0.28);
  return h;
};

const groundHeight = (x: number, z: number) => beachTerrain(x, z);

/** Sanfte Wellen: Dünung läuft Richtung Strand + kleine Kräuselung (wie Seeufer) */
export const beachWaves = (x: number, z: number, tau: number) =>
  0.05 * Math.sin(z * 0.9 - tau * 1.7 + 0.3 * Math.sin(x * 0.15)) + 0.6 * lakeWaves(x, z, tau);

// ---------- Boden (Sand, Dünen, Meeresgrund) ----------
const Ground = () => {
  const geo = useMemo(() => {
    const xs: number[] = [];
    for (let x = -110; x <= 110; x += 1.1) xs.push(x);
    const zs: number[] = [];
    for (let z = -60; z < -14; z += 2) zs.push(z);
    for (let z = -14; z < 14; z += 0.45) zs.push(z);
    for (let z = 14; z <= 70; z += 1.4) zs.push(z);
    const r = rng(5);
    const verts: number[] = [];
    const colors: number[] = [];
    const col = (x: number, z: number, y: number) => {
      const d = z - beachShoreZ(x);
      const n = r() * 0.45;
      if (d < -0.3) return new THREE.Color(C.seaSand).lerp(new THREE.Color(C.seaSandDeep), Math.min(1, -y * 0.45) + n * 0.3);
      if (d < 1.6) return new THREE.Color(C.wetSand).lerp(new THREE.Color(C.sand), smoothstep(-0.3, 1.6, d) * 0.8 + n * 0.3);
      if (d > 11) return new THREE.Color(C.dune).lerp(new THREE.Color(C.sandDark), n);
      return new THREE.Color(C.sand).lerp(new THREE.Color(C.sandDark), n);
    };
    for (let i = 0; i < zs.length - 1; i++) {
      for (let j = 0; j < xs.length - 1; j++) {
        const p = [
          [xs[j], zs[i]],
          [xs[j + 1], zs[i]],
          [xs[j], zs[i + 1]],
          [xs[j + 1], zs[i + 1]],
        ].map(([x, z]) => [x, beachTerrain(x, z), z]);
        const tri = (a: number[], b: number[], c: number[]) => {
          const cc = col((a[0] + b[0] + c[0]) / 3, (a[2] + b[2] + c[2]) / 3, (a[1] + b[1] + c[1]) / 3);
          for (const v of [a, b, c]) {
            verts.push(v[0], v[1], v[2]);
            colors.push(cc.r, cc.g, cc.b);
          }
        };
        tri(p[0], p[2], p[1]);
        tri(p[1], p[2], p[3]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
};

// ---------- Meer: bewegte Oberfläche, nah am Ufer klar und hell, weiter draußen tiefblau ----------
const Sea = ({tau}: {tau: number}) => {
  const {geo, xz} = useMemo(() => {
    const xs: number[] = [];
    for (let x = -110; x <= 110; x += 1.4) xs.push(x);
    const zs: number[] = [];
    for (let z = -70; z < -16; z += 2.2) zs.push(z);
    for (let z = -16; z <= 4; z += 0.42) zs.push(z);
    const verts: number[] = [];
    for (let i = 0; i < zs.length - 1; i++) {
      for (let j = 0; j < xs.length - 1; j++) {
        const a = [xs[j], zs[i]];
        const b = [xs[j + 1], zs[i]];
        const c = [xs[j], zs[i + 1]];
        const d = [xs[j + 1], zs[i + 1]];
        for (const v of [a, c, b, b, c, d]) verts.push(v[0], 0, v[1]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array((verts.length / 3) * 4), 4));
    const n = verts.length / 3;
    const xz = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      xz[i * 2] = verts[i * 3];
      xz[i * 2 + 1] = verts[i * 3 + 2];
    }
    return {geo: g, xz};
  }, []);
  useMemo(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const col = geo.attributes.color as THREE.BufferAttribute;
    const shallow = new THREE.Color(C.shallow);
    const mid = new THREE.Color(C.mid);
    const deep = new THREE.Color(C.deep);
    const foam = new THREE.Color(C.foam);
    const tmp = new THREE.Color();
    // Farbe pro Dreieck (flacher Low-Poly-Look)
    for (let i = 0; i < pos.count; i += 3) {
      let cx = 0;
      let cz = 0;
      for (let k = 0; k < 3; k++) {
        const x = xz[(i + k) * 2];
        const z = xz[(i + k) * 2 + 1];
        pos.setY(i + k, beachWaves(x, z, tau));
        cx += x / 3;
        cz += z / 3;
      }
      const depth = -beachTerrain(cx, cz);
      const d = cz - beachShoreZ(cx);
      tmp.copy(shallow).lerp(mid, smoothstep(0.05, 0.7, depth)).lerp(deep, smoothstep(0.8, 3, depth));
      let alpha = 0.42 + 0.36 * smoothstep(0.05, 0.9, depth) + 0.24 * smoothstep(1, 3, depth);
      // Schaum am Spülsaum (bewegt sich mit den Wellen) + kleine Schaumkronen in Ufernähe
      const wash = smoothstep(-1.6, -0.1, d + 0.9 * Math.sin(tau * 0.9 + cx * 0.05));
      const crest = Math.max(0, Math.sin(cz * 0.9 - tau * 1.7 + 0.3 * Math.sin(cx * 0.15)) - 0.93) * 12 * smoothstep(-9, -2, d);
      const patch = 0.5 + 0.5 * Math.sin(cx * 1.9 + cz * 0.7 + tau * 0.6);
      const f = Math.min(1, wash * (0.55 + 0.45 * patch) + crest * patch);
      tmp.lerp(foam, f * 0.85);
      alpha = alpha + (0.85 - alpha) * f;
      for (let k = 0; k < 3; k++) col.setXYZW(i + k, tmp.r, tmp.g, tmp.b, alpha);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    geo.computeVertexNormals();
  }, [geo, xz, tau]);
  return (
    <mesh geometry={geo} renderOrder={3}>
      <meshStandardMaterial vertexColors transparent roughness={0.12} metalness={0.1} flatShading depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

/** Offenes Meer bis zum Horizont (ruhig, undurchsichtig) */
const FarSea = () => (
  <mesh position={[0, -0.02, -369]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[1000, 600]} />
    <meshStandardMaterial color={C.far} roughness={0.25} metalness={0.1} />
  </mesh>
);

// ---------- Dünen-Bewuchs, Zaun, Buhnen, Muscheln ----------
const useLayout = () =>
  useMemo(() => {
    const r = rng(91);
    const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
    const grass: Inst[] = [];
    const posts: Inst[] = [];
    const piles: Inst[] = [];
    const shells: Inst[] = [];
    // Strandhafer in Büscheln auf den Dünen
    for (let i = 0; i < 520; i++) {
      const x = -80 + r() * 160;
      const d = 11 + Math.pow(r(), 0.8) * 28;
      const z = beachShoreZ(x) + d;
      const col = pick(C.grass);
      const n = 5 + Math.floor(r() * 6);
      for (let k = 0; k < n; k++) {
        const gx = x + (r() - 0.5) * 0.7;
        const gz = z + (r() - 0.5) * 0.7;
        const h = 0.45 + r() * 0.55;
        grass.push({pos: [gx, beachTerrain(gx, gz) - 0.03, gz], scale: [0.045, h, 0.045], rotY: r() * 6, color: col});
      }
    }
    // vereinzelter Strandhafer am Dünenfuß
    for (let i = 0; i < 90; i++) {
      const x = -60 + r() * 120;
      const z = beachShoreZ(x) + 8.5 + r() * 2.5;
      const h = 0.3 + r() * 0.35;
      for (let k = 0; k < 4; k++) {
        const gx = x + (r() - 0.5) * 0.4;
        const gz = z + (r() - 0.5) * 0.4;
        grass.push({pos: [gx, beachTerrain(gx, gz) - 0.02, gz], scale: [0.035, h, 0.035], rotY: r() * 6, color: pick(C.grass)});
      }
    }
    // Dünenzaun (Pfähle)
    for (let x = -70; x < 70; x += 0.55) {
      const z = beachShoreZ(x) + 10 + 0.4 * Math.sin(x * 0.05);
      const h = 0.75 + r() * 0.25;
      posts.push({pos: [x, beachTerrain(x, z) - 0.05, z], scale: [0.05, h, 0.05], rotY: r() * 6, color: pick([C.wood, C.woodDark, '#9a7b57'])});
    }
    // Buhnen: Reihen von Holzpfählen ins Meer
    for (const bx of [-15, 17]) {
      for (let d = 3; d > -28; d -= 0.42) {
        for (const off of [-0.2, 0.2]) {
          const x = bx + off + (r() - 0.5) * 0.05;
          const z = beachShoreZ(bx) + d;
          const top = Math.max(beachTerrain(x, z) + 0.5, 0.35) + (r() - 0.5) * 0.15;
          const bottom = beachTerrain(x, z) - 0.2;
          piles.push({pos: [x, bottom, z], scale: [0.11, top - bottom, 0.11], rotY: r() * 6, color: pick([C.woodDark, '#5e4632', C.wood])});
        }
      }
    }
    // Muscheln und Steinchen am Strand
    for (let i = 0; i < 260; i++) {
      const x = -30 + r() * 60;
      const z = beachShoreZ(x) + 0.3 + r() * 9;
      const s = 0.02 + r() * 0.035;
      shells.push({pos: [x, beachTerrain(x, z) + s * 0.2, z], scale: [s * 1.2, s * 0.45, s], rotY: r() * 6, color: pick(['#f6efe2', '#e9e1d3', '#c9c0b0', '#8e8a83', '#f0d9c8'])});
    }
    return {grass, posts, piles, shells};
  }, []);

/** Sonnenschirm mit Handtuch (Sommer-Deko) */
const Parasol = ({x, z}: {x: number; z: number}) => {
  const y = beachTerrain(x, z);
  const cols = ['#e5322d', '#f7f3ea'];
  return (
    <group position={[x, y, z]}>
      <mesh castShadow position={[0, 1.05, 0]} rotation={[0, 0, 0.12]}>
        <cylinderGeometry args={[0.025, 0.025, 2.1, 6]} />
        <meshStandardMaterial color="#e8e2d4" flatShading />
      </mesh>
      <group position={[0.24, 2.05, 0]} rotation={[0, 0, 0.12]}>
        {Array.from({length: 8}, (_, i) => (
          <mesh key={i} castShadow rotation={[0, (i * Math.PI) / 4, 0]}>
            <coneGeometry args={[1.1, 0.42, 2, 1, true, 0, Math.PI / 4]} />
            <meshStandardMaterial color={cols[i % 2]} flatShading side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        ))}
      </group>
      {/* Handtuch */}
      <mesh receiveShadow position={[-0.6, 0.012, 0.9]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <planeGeometry args={[0.9, 1.7]} />
        <meshStandardMaterial color="#2f8fd8" roughness={0.95} />
      </mesh>
      {[-0.25, 0.25].map((o) => (
        <mesh key={o} position={[-0.6 + o * Math.cos(0.3), 0.014, 0.9 - o * Math.sin(0.3)]} rotation={[-Math.PI / 2, 0, 0.3]}>
          <planeGeometry args={[0.14, 1.7]} />
          <meshStandardMaterial color="#ffffff" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

const BeachScene = ({cam}: {cam?: StageCam}) => {
  void cam;
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tau = frame / fps;
  const L = useLayout();
  const geos = useMemo(() => {
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    const post = new THREE.CylinderGeometry(0.8, 1, 1, 6);
    post.translate(0, 0.5, 0);
    const shell = new THREE.IcosahedronGeometry(1, 0);
    return {blade, post, shell};
  }, []);
  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 60, 420]} />
      <Sky c={C} />
      <hemisphereLight args={['#eaf4ff', '#d9c08c', 1.05]} />
      <ambientLight intensity={0.18} />
      <directionalLight
        position={[-10, 22, 8]}
        intensity={3.0}
        color="#fff1d6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <Ground />
      <FarSea />
      <Sea tau={tau} />
      <Parasol x={4.5} z={5} />
      <Instances geometry={geos.blade} items={L.grass} castShadow={false} />
      <Instances geometry={geos.post} items={L.posts} />
      <Instances geometry={geos.post} items={L.piles} />
      <Instances geometry={geos.shell} items={L.shells} castShadow={false} />
    </>
  );
};

export const beachStage: StageDef = {
  id: 'meeresstrand',
  Component: BeachScene,
  climbTrees: [],
  groundHeight,
  waterLevel: 0,
  barefoot: true,
};
