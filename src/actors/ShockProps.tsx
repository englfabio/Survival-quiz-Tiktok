import {useMemo, type ReactNode} from 'react';
import * as THREE from 'three';
import {clamp} from '../lib/anim';

/**
 * Objekte für Strom-Szenen (Zitteraal-Video), alle im Low-Poly-Look:
 *  - WetTowel ("handtuch"): nasses Handtuch, dunkle nasse Flecken, Tropfen fallen herunter.
 *    Hängt vom Ursprung (Griff/Hand) nach unten (−y). Hält der Dummy bei "towelswing" automatisch.
 *  - FuseBox ("sicherungskasten"): Sicherungskasten für die Wand (Rückseite bei z = 0, Mitte auf 1,5 m Höhe),
 *    offene Tür, Reihe Sicherungen + großer roter Hauptschalter. Wert "lever": 1 = an (oben), 0 = aus (unten).
 *  - Broom ("besen"): Besen mit trockenem Holzstiel. Steht senkrecht (Borsten unten am Ursprung).
 *    "tilt" = Neigung in Grad (z. B. 12 = an die Wand gelehnt). Hält der Dummy bei "broompush" automatisch.
 *  - Socket: Doppel-Steckdose (Wand bei z = 0, Löcher bei x = ±0.045), links optional mit Stecker + Kabel.
 *  - Toaster: roter Retro-Toaster (Unterseite bei y = 0).
 */

const useMats = () =>
  useMemo(
    () => ({
      towel: new THREE.MeshStandardMaterial({color: '#4fa3d9', roughness: 0.95, flatShading: true, side: THREE.DoubleSide}),
      towelWet: new THREE.MeshStandardMaterial({color: '#2f78ad', roughness: 0.4, flatShading: true, side: THREE.DoubleSide}),
      towelStripe: new THREE.MeshStandardMaterial({color: '#f4f6f8', roughness: 0.9, flatShading: true, side: THREE.DoubleSide}),
      drop: new THREE.MeshStandardMaterial({color: '#bfe6ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85}),
      boxWhite: new THREE.MeshStandardMaterial({color: '#e9ebee', roughness: 0.6, flatShading: true}),
      boxGrey: new THREE.MeshStandardMaterial({color: '#b9bec5', roughness: 0.6, flatShading: true}),
      boxDark: new THREE.MeshStandardMaterial({color: '#3a3f46', roughness: 0.7, flatShading: true}),
      red: new THREE.MeshStandardMaterial({color: '#d8342a', roughness: 0.45, flatShading: true}),
      yellow: new THREE.MeshBasicMaterial({color: '#ffd21a', side: THREE.DoubleSide}),
      black: new THREE.MeshBasicMaterial({color: '#151515', side: THREE.DoubleSide}),
      green: new THREE.MeshBasicMaterial({color: '#3fd16a', toneMapped: false}),
      wood: new THREE.MeshStandardMaterial({color: '#c4935c', roughness: 0.8, flatShading: true}),
      woodDark: new THREE.MeshStandardMaterial({color: '#9a6a3c', roughness: 0.8, flatShading: true}),
      bristle: new THREE.MeshStandardMaterial({color: '#e2c27a', roughness: 1, flatShading: true}),
      broomHead: new THREE.MeshStandardMaterial({color: '#d8342a', roughness: 0.6, flatShading: true}),
      plastic: new THREE.MeshStandardMaterial({color: '#f6f5f1', roughness: 0.45, flatShading: true}),
      hole: new THREE.MeshStandardMaterial({color: '#2a2a2a', roughness: 0.9}),
      cable: new THREE.MeshStandardMaterial({color: '#f2f2ee', roughness: 0.6}),
      chrome: new THREE.MeshStandardMaterial({color: '#dfe3e8', roughness: 0.2, metalness: 0.8, flatShading: true}),
      toaster: new THREE.MeshStandardMaterial({color: '#d9463b', roughness: 0.35, flatShading: true}),
    }),
    [],
  );

// ---------------------------------------------------------------- Handtuch
/** Nasses Handtuch: hängt vom Ursprung nach −y, leicht geschwungen (bend), Tropfen fallen (time) */
export const WetTowel = ({time = 0, bend = 0.25, drip = true}: {time?: number; bend?: number; drip?: boolean}) => {
  const m = useMats();
  const parts = 4;
  const segLen = 0.13;
  // Kette aus 4 Stücken, jedes etwas weiter gebogen
  const chain = (i: number): ReactNode => {
    if (i >= parts) return null;
    return (
      <group position={[0, i === 0 ? 0 : -segLen, 0]} rotation={[bend * (0.6 + i * 0.25), 0, Math.sin(time * 3 + i) * 0.06]}>
        <mesh material={i % 2 === 0 ? m.towelWet : m.towel} position={[0, -segLen / 2, 0]} castShadow>
          <boxGeometry args={[0.2 - i * 0.01, segLen + 0.01, 0.02]} />
        </mesh>
        {i === 2 && (
          <mesh material={m.towelStripe} position={[0, -segLen * 0.3, 0]}>
            <boxGeometry args={[0.2 - i * 0.01 + 0.004, 0.025, 0.024]} />
          </mesh>
        )}
        {chain(i + 1)}
      </group>
    );
  };
  // Tropfen: fallen vom unteren Ende herunter (in lokalen Koordinaten ungefähr)
  const drops = [];
  if (drip) {
    for (let k = 0; k < 4; k++) {
      const ph = (time * 1.6 + k * 0.27) % 1;
      drops.push(
        <mesh key={k} material={m.drop} position={[(k - 1.5) * 0.045, -parts * segLen - ph * ph * 0.7, 0.02 * bend * 4]} scale={[1, 1.5, 1]}>
          <icosahedronGeometry args={[0.012, 0]} />
        </mesh>,
      );
    }
  }
  return (
    <group>
      {chain(0)}
      {drops}
    </group>
  );
};

/** Punkte entlang des hängenden Handtuchs (für Blitze), lokale Koordinaten */
export const towelPoints = (bend = 0.25) => {
  const pts: THREE.Vector3[] = [];
  let p = new THREE.Vector3();
  let ang = 0;
  for (let i = 0; i < 4; i++) {
    ang += bend * (0.6 + i * 0.25);
    const d = new THREE.Vector3(0, -0.13 * Math.cos(ang), 0.13 * Math.sin(ang) * -1);
    p = p.clone().add(d);
    pts.push(p.clone());
  }
  return pts;
};

// ---------------------------------------------------------------- Sicherungskasten
/** Sicherungskasten an der Wand. lever: 1 = an (oben) … 0 = aus (unten). open: Tür 0 zu … 1 offen */
export const FuseBox = ({lever = 1, open = 1}: {lever?: number; open?: number}) => {
  const m = useMats();
  const W = 0.44;
  const H = 0.56;
  const D = 0.1;
  const lv = clamp(lever);
  return (
    <group position={[0, 1.5, 0]}>
      {/* Gehäuse */}
      <mesh material={m.boxWhite} position={[0, 0, D / 2]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh material={m.boxGrey} position={[0, 0, D + 0.001]}>
        <planeGeometry args={[W - 0.05, H - 0.05]} />
      </mesh>
      {/* Hutschiene mit Sicherungen (zwei Reihen) */}
      {[0.12, -0.06].map((y, row) => (
        <group key={row} position={[0, y, D]}>
          <mesh material={m.boxDark} position={[0, 0, 0.004]}>
            <boxGeometry args={[W - 0.08, 0.1, 0.008]} />
          </mesh>
          {Array.from({length: 7}).map((_, i) => (
            <group key={i} position={[-0.15 + i * 0.05, 0, 0.02]}>
              <mesh material={m.plastic}>
                <boxGeometry args={[0.042, 0.085, 0.03]} />
              </mesh>
              <mesh material={m.boxDark} position={[0, 0.012, 0.017]}>
                <boxGeometry args={[0.012, 0.024, 0.012]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* großer Hauptschalter unten (rot), Hebel kippt von oben (an) nach unten (aus) */}
      <group position={[0, -0.19, D]}>
        <mesh material={m.plastic} position={[0, 0, 0.02]}>
          <boxGeometry args={[0.12, 0.11, 0.04]} />
        </mesh>
        <group position={[0, 0, 0.04]} rotation={[-0.65 + 1.3 * (1 - lv), 0, 0]}>
          <mesh material={m.red} position={[0, 0, 0.035]} castShadow>
            <boxGeometry args={[0.07, 0.03, 0.075]} />
          </mesh>
        </group>
        {/* Lämpchen: grün = Strom an */}
        <mesh material={lv > 0.5 ? m.green : m.boxDark} position={[0.08, 0.03, 0.03]}>
          <icosahedronGeometry args={[0.01, 0]} />
        </mesh>
      </group>
      {/* Tür (Scharnier links), innen grau; Warnzeichen außen */}
      <group position={[-W / 2, 0, D + 0.005]} rotation={[0, -1.95 * clamp(open), 0]}>
        <mesh material={m.boxWhite} position={[W / 2, 0, 0.008]} castShadow>
          <boxGeometry args={[W, H, 0.014]} />
        </mesh>
        <group position={[W / 2, 0.06, 0.017]}>
          <mesh material={m.yellow}>
            <circleGeometry args={[0.07, 3, Math.PI / 2]} />
          </mesh>
          <mesh material={m.black} position={[0, -0.005, 0.001]} rotation={[0, 0, -0.35]}>
            <planeGeometry args={[0.012, 0.06]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- Besen
/** Besen mit trockenem Holzstiel. Borsten unten am Ursprung, Stiel nach +y (Länge ca. 1,35 m) */
export const Broom = () => {
  const m = useMats();
  return (
    <group>
      <mesh material={m.wood} position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 1.3, 7]} />
      </mesh>
      <mesh material={m.woodDark} position={[0, 1.43, 0]}>
        <icosahedronGeometry args={[0.02, 0]} />
      </mesh>
      {/* Bürstenkopf */}
      <mesh material={m.broomHead} position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.32, 0.05, 0.07]} />
      </mesh>
      <mesh material={m.bristle} position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.3, 0.09, 0.06]} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- Steckdose
/** Doppel-Steckdose (Rückseite = Wand bei z = 0). Loch-Mitten bei x = ±0.045. plugLeft = Stecker steckt links */
export const Socket = ({plugLeft = true}: {plugLeft?: boolean}) => {
  const m = useMats();
  return (
    <group>
      <mesh material={m.plastic} position={[0, 0, 0.012]} castShadow>
        <boxGeometry args={[0.2, 0.11, 0.024]} />
      </mesh>
      {[-0.045, 0.045].map((x) => (
        <group key={x} position={[x, 0, 0.025]}>
          <mesh material={m.boxGrey} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.004, 14]} />
          </mesh>
          <mesh material={m.hole} position={[0, 0, 0.002]}>
            <circleGeometry args={[0.032, 14]} />
          </mesh>
        </group>
      ))}
      {plugLeft && (
        <group position={[-0.045, 0, 0.025]}>
          <mesh material={m.plastic} position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.034, 0.05, 10]} />
          </mesh>
          <mesh material={m.cable} position={[0, -0.04, 0.03]}>
            <cylinderGeometry args={[0.007, 0.007, 0.05, 6]} />
          </mesh>
        </group>
      )}
    </group>
  );
};

/** Kabel als Kette zwischen Punkten (weiß) */
export const Cable = ({pts}: {pts: [number, number, number][]}) => {
  const m = useMats();
  const Y = new THREE.Vector3(0, 1, 0);
  return (
    <>
      {pts.slice(1).map((p, i) => {
        const a = new THREE.Vector3(...pts[i]);
        const b = new THREE.Vector3(...p);
        const d = b.clone().sub(a);
        const q = new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize());
        return (
          <mesh key={i} material={m.cable} position={a.clone().add(b).multiplyScalar(0.5)} quaternion={q}>
            <cylinderGeometry args={[0.007, 0.007, d.length() + 0.006, 6]} />
          </mesh>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- Toaster
export const Toaster = () => {
  const m = useMats();
  return (
    <group>
      <mesh material={m.toaster} position={[0, 0.11, 0]} scale={[1, 1, 0.75]} castShadow>
        <boxGeometry args={[0.3, 0.2, 0.2]} />
      </mesh>
      <mesh material={m.chrome} position={[0, 0.215, 0]}>
        <boxGeometry args={[0.28, 0.012, 0.13]} />
      </mesh>
      {[-0.035, 0.035].map((z) => (
        <mesh key={z} material={m.hole} position={[0, 0.222, z]}>
          <boxGeometry args={[0.22, 0.004, 0.025]} />
        </mesh>
      ))}
      {/* Toastscheiben schauen heraus */}
      {[-0.035, 0.035].map((z) => (
        <mesh key={`t${z}`} material={m.bristle} position={[0, 0.235, z]}>
          <boxGeometry args={[0.15, 0.04, 0.012]} />
        </mesh>
      ))}
      <mesh material={m.boxDark} position={[0.16, 0.13, 0]}>
        <boxGeometry args={[0.02, 0.03, 0.04]} />
      </mesh>
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} material={m.boxDark} position={[x, 0.005, 0]}>
          <boxGeometry args={[0.04, 0.01, 0.12]} />
        </mesh>
      ))}
    </group>
  );
};
