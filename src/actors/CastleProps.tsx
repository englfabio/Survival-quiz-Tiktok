import {useMemo} from 'react';
import * as THREE from 'three';
import {deg, rng} from '../lib/anim';

/**
 * Objekte für die Bühne "burg".
 *
 * Zugbrücke ("zugbruecke"): Holzbohlen auf zwei Balken, Eisenbeschläge, zwei Ketten zur Mauer über dem Tor.
 * Ursprung = Drehachse (Scharnier) an der Torschwelle, Oberkante der Bohlen bei y = 0; die Brücke liegt
 * in Richtung +z (Länge 6,4 m, Breite 2,4 m). Mit "face": 180 zeigt sie vom Burgtor weg zum Ufer.
 * "tilt" (Grad) = hochklappen: 0 = unten, 90 = ganz oben (steht senkrecht vor dem Tor).
 * Figuren können darauf stehen: "attach": "zugbruecke", dann x/y/z/face auf der Brücke
 * (z = Abstand vom Tor, x = seitlich, face 0 = Richtung Ufer, 180 = Richtung Tor) – sie kippen mit.
 */
export const BRIDGE = {length: 6.4, width: 2.4, thick: 0.18, anchor: [1.32, 4.9, -0.28] as [number, number, number]};

const WOOD = ['#7a5636', '#6c4a2e', '#86603c', '#704d31'];
const IRON = '#2b2d31';

/** Kippmatrix der Brücke (für Figuren, die darauf stehen) */
export const bridgeLocalMatrix = (tiltDeg: number) => new THREE.Matrix4().makeRotationX(-deg(tiltDeg));

const ChainLinks = ({from, to, mat}: {from: THREE.Vector3; to: THREE.Vector3; mat: THREE.Material}) => {
  const dir = to.clone().sub(from);
  const len = dir.length();
  const n = Math.max(2, Math.round(len / 0.13));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <group position={from} quaternion={q}>
      {Array.from({length: n}, (_, i) => (
        <mesh key={i} material={mat} position={[0, (i + 0.5) * (len / n), 0]} rotation={[0, (i % 2) * (Math.PI / 2), 0]} scale={[1, 1.6, 1]}>
          <torusGeometry args={[0.045, 0.014, 4, 8]} />
        </mesh>
      ))}
    </group>
  );
};

export const Drawbridge = ({tilt}: {tilt: number}) => {
  const {planks, mats} = useMemo(() => {
    const r = rng(61);
    const planks: {z: number; w: number; c: string; dy: number}[] = [];
    for (let z = 0.0; z < BRIDGE.length - 0.01; z += 0.32) {
      planks.push({z: z + 0.155, w: 0.3, c: WOOD[Math.floor(r() * WOOD.length)], dy: (r() - 0.5) * 0.02});
    }
    const mats = {
      iron: new THREE.MeshStandardMaterial({color: IRON, roughness: 0.55, metalness: 0.6, flatShading: true}),
      beam: new THREE.MeshStandardMaterial({color: '#4f3722', roughness: 0.95, flatShading: true}),
      frost: new THREE.MeshStandardMaterial({color: '#e4eef5', roughness: 0.9, flatShading: true, transparent: true, opacity: 0.55}),
      wood: Object.fromEntries(WOOD.map((c) => [c, new THREE.MeshStandardMaterial({color: c, roughness: 0.95, flatShading: true})])),
    };
    return {planks, mats};
  }, []);
  const a = -deg(tilt);
  const L = BRIDGE.length;
  const W = BRIDGE.width;
  // Ketten: Anker an der Mauer (fest) → Ecke an der Brückenspitze (kippt mit)
  const chains = [1, -1].map((s) => {
    const tip = new THREE.Vector3(s * (W / 2 - 0.12), 0.06, L - 0.18).applyAxisAngle(new THREE.Vector3(1, 0, 0), a);
    return {from: new THREE.Vector3(s * BRIDGE.anchor[0], BRIDGE.anchor[1], BRIDGE.anchor[2]), to: tip};
  });
  return (
    <group>
      <group rotation={[a, 0, 0]}>
        {planks.map((p, i) => (
          <mesh key={i} material={mats.wood[p.c]} position={[0, -BRIDGE.thick / 2 + p.dy, p.z]} castShadow receiveShadow>
            <boxGeometry args={[W, BRIDGE.thick, p.w]} />
          </mesh>
        ))}
        {/* Raureif auf den Bohlen (Ränder) */}
        {[1, -1].map((s) => (
          <mesh key={s} material={mats.frost} position={[s * (W / 2 - 0.2), 0.004, L / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.35, L - 0.2]} />
          </mesh>
        ))}
        {/* Längsbalken unten */}
        {[0.75, -0.75].map((x) => (
          <mesh key={x} material={mats.beam} position={[x, -BRIDGE.thick - 0.11, L / 2]} castShadow>
            <boxGeometry args={[0.24, 0.22, L - 0.1]} />
          </mesh>
        ))}
        {/* Eisenbeschläge quer + Kantenschutz */}
        {[0.35, L / 2, L - 0.35].map((z) => (
          <mesh key={z} material={mats.iron} position={[0, 0.008, z]}>
            <boxGeometry args={[W + 0.02, 0.025, 0.09]} />
          </mesh>
        ))}
        {[1, -1].map((s) => (
          <mesh key={`e${s}`} material={mats.iron} position={[s * (W / 2), -0.05, L / 2]}>
            <boxGeometry args={[0.04, 0.16, L]} />
          </mesh>
        ))}
        {/* Ösen für die Ketten */}
        {[1, -1].map((s) => (
          <mesh key={`o${s}`} material={mats.iron} position={[s * (W / 2 - 0.12), 0.06, L - 0.18]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.06, 0.02, 5, 10]} />
          </mesh>
        ))}
      </group>
      {/* Scharnier-Achse */}
      <mesh material={mats.iron} position={[0, -0.09, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, W + 0.3, 8]} />
      </mesh>
      {chains.map((c, i) => (
        <ChainLinks key={i} from={c.from} to={c.to} mat={mats.iron} />
      ))}
    </group>
  );
};
