import {useThree} from '@react-three/fiber';
import {useEffect, useMemo, useState} from 'react';
import {continueRender, delayRender, spring} from 'remotion';
import * as THREE from 'three';
import {clamp, easeInOut} from '../lib/anim';
import {T} from '../ui/theme';

/**
 * Objekte für den Zahnunfall (Känguru-Video), alle wiederverwendbar:
 *  - Tooth ("zahn"): einzelner Schneidezahn, Krone weiß, Wurzel leicht gelblich. Comichaft vergrößert (ca. 9 cm lang).
 *      gray 0 … 1 = wird grau, mark 0 … 1 = Krone grün + Wurzel rot markiert (über 1 … 2: Wurzel-Rot blendet aus).
 *      Ursprung = Mitte zwischen Krone und Wurzel; Krone zeigt nach +y.
 *  - Tissue ("taschentuch"): Papiertaschentuch, wrap 0 = offen … 1 = eingewickelt.
 *  - WaterGlass ("wasserglas"): Glas mit Leitungswasser (ca. 12 cm hoch). Ursprung = Boden.
 *  - GardenTap ("wasserhahn"): Wasserhahn an einem Standrohr (Außenzapfstelle), Wasser über den Wert "water".
 *      Auslauf vorn bei (0, 1.0, 0.17) im eigenen System.
 *  - RescueBox ("zahnrettungsbox"): neutrale Dose mit Zahn-Symbol, ohne Markennamen, Deckel über "lid".
 *  - MilkCarton ("hmilch"): neutrale Milchpackung mit Aufschrift "H-Milch".
 *  - BoxingGlove: roter Boxhandschuh (Dummy, Känguru).
 *  - HintSign ("hinweis"): rotes Hinweisschild mit Text, schaut immer zur Kamera (z. B. "Nicht anfassen").
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

/** Wartet (beim Rendern), bis die Schrift geladen ist, und liefert dann eine Textur */
export const useFontTexture = (draw: () => THREE.Texture, key: string) => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender(`Schrift für ${key}`));
  const advance = useThree((st) => st.advance);
  useEffect(() => {
    document.fonts.load(`800 80px "Barlow Condensed"`).finally(() => setReady(true));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tex = useMemo(() => (ready ? draw() : null), [ready, key]);
  useEffect(() => {
    if (!tex) return;
    advance(performance.now());
    continueRender(handle);
  }, [tex, advance, handle]);
  return tex;
};

// ---------- Zahn ----------
const CROWN = new THREE.Color('#fbfbf6');
const ROOT = new THREE.Color('#e9d29a');
const DEAD = new THREE.Color('#8d8f8c');
const GREEN = new THREE.Color('#22d35f');
const RED = new THREE.Color('#ff2b22');

/** Krone: Schaufelform (oben breit + flach, unten zum Hals schmaler) */
const crownGeo = (() => {
  const g = new THREE.CylinderGeometry(1, 0.78, 1, 8, 2);
  g.scale(0.022, 0.042, 0.011);
  g.translate(0, 0.021, 0);
  return g;
})();
const crownTip = (() => {
  const g = new THREE.CylinderGeometry(0.92, 1, 1, 8, 1);
  g.scale(0.021, 0.006, 0.0095);
  g.translate(0, 0.045, 0);
  return g;
})();
/** Wurzel: langer Kegel nach unten */
const rootGeo = (() => {
  const g = new THREE.ConeGeometry(0.0155, 0.055, 7, 2);
  g.rotateX(Math.PI);
  g.scale(1, 1, 0.75);
  g.translate(0, -0.0275, 0);
  return g;
})();

export const Tooth = ({gray = 0, mark = 0, time = 0}: {gray?: number; mark?: number; time?: number}) => {
  const g = clamp(gray);
  const pulse = 0.75 + 0.25 * Math.sin(time * 7);
  const crownMark = clamp(mark);
  const rootMark = clamp(mark) * (1 - clamp(mark - 1));
  const crownCol = CROWN.clone().lerp(DEAD, g).lerp(GREEN, crownMark * 0.75);
  const rootCol = ROOT.clone().lerp(DEAD.clone().multiplyScalar(0.85), g).lerp(RED, rootMark * 0.8);
  return (
    <group position={[0, -0.005, 0]}>
      <mesh geometry={crownGeo} castShadow>
        <meshStandardMaterial color={crownCol} roughness={0.25} flatShading emissive={GREEN} emissiveIntensity={crownMark * 0.55 * pulse} />
      </mesh>
      <mesh geometry={crownTip} castShadow>
        <meshStandardMaterial color={crownCol} roughness={0.25} flatShading emissive={GREEN} emissiveIntensity={crownMark * 0.55 * pulse} />
      </mesh>
      <mesh geometry={rootGeo} castShadow>
        <meshStandardMaterial color={rootCol} roughness={0.55} flatShading emissive={RED} emissiveIntensity={rootMark * 0.6 * pulse} />
      </mesh>
      {/* Leuchtrand um die Markierung (gut sichtbar in der Nahaufnahme) */}
      {crownMark > 0.02 && (
        <mesh position={[0, 0.024, 0]} scale={[0.031, 0.04, 0.02]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color={GREEN} transparent opacity={0.22 * crownMark * pulse} depthWrite={false} />
        </mesh>
      )}
      {rootMark > 0.02 && (
        <mesh position={[0, -0.03, 0]} scale={[0.024, 0.038, 0.019]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color={RED} transparent opacity={0.22 * rootMark * pulse} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

// ---------- Papiertaschentuch ----------
/** Vier Ecken klappen über der Mitte zusammen. Ursprung = Mitte, liegt flach (y nach oben). Seitenlänge 0,2 m */
export const Tissue = ({wrap = 0}: {wrap?: number}) => {
  const mat = useMemo(() => std('#f6f6f2', {roughness: 0.95, side: THREE.DoubleSide}), []);
  const k = easeInOut(clamp(wrap));
  const S = 0.1;
  return (
    <group>
      {/* Mitte */}
      <mesh material={mat} rotation={[-Math.PI / 2, 0, Math.PI / 4]} castShadow receiveShadow>
        <planeGeometry args={[S * 0.75, S * 0.75]} />
      </mesh>
      {/* Klappen (Dreiecke), knittrig durch leichte Unterschiede */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2;
        const fold = k * (2.55 + i * 0.08);
        return (
          <group key={i} rotation={[0, a, 0]}>
            <group position={[0, 0.001 + i * 0.0015, S * 0.265]} rotation={[-fold, 0, 0]}>
              <mesh material={mat} position={[0, 0, S * 0.24]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
                <circleGeometry args={[S * 0.37, 3, Math.PI / 2 - Math.PI / 3, (Math.PI * 2) / 3]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};

// ---------- Glas mit Leitungswasser ----------
export const WaterGlass = ({time = 0, ripple = 0}: {time?: number; ripple?: number}) => {
  const mats = useMemo(
    () => ({
      glass: new THREE.MeshStandardMaterial({color: '#e6f4ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide}),
      water: new THREE.MeshStandardMaterial({color: '#8fd0f2', roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false}),
      rim: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.1, transparent: true, opacity: 0.6}),
    }),
    [],
  );
  const wob = ripple * Math.sin(time * 9) * 0.004;
  return (
    <group>
      <mesh material={mats.glass} position={[0, 0.065, 0]} renderOrder={5}>
        <cylinderGeometry args={[0.042, 0.035, 0.13, 16, 1, true]} />
      </mesh>
      <mesh material={mats.glass} position={[0, 0.004, 0]} renderOrder={5}>
        <cylinderGeometry args={[0.035, 0.035, 0.008, 16]} />
      </mesh>
      <mesh material={mats.water} position={[0, 0.048, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.0385, 0.034, 0.088, 16]} />
      </mesh>
      <mesh material={mats.water} position={[0, 0.092 + wob, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
        <circleGeometry args={[0.0385, 16]} />
      </mesh>
      <mesh material={mats.rim} position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.042, 0.0018, 4, 20]} />
      </mesh>
    </group>
  );
};

// ---------- Wasserhahn an einem Standrohr ----------
export const TAP_SPOUT: [number, number, number] = [0, 1.0, 0.17];
export const GardenTap = ({water = 0, time = 0}: {water?: number; time?: number}) => {
  const mats = useMemo(
    () => ({
      pipe: std('#7d868d', {metalness: 0.6, roughness: 0.35}),
      brass: std('#c9a24a', {metalness: 0.8, roughness: 0.3}),
      handle: std('#c8352b', {roughness: 0.5}),
      wood: std('#8a6440', {roughness: 0.9}),
      water: new THREE.MeshStandardMaterial({color: '#bfe8ff', roughness: 0.05, transparent: true, opacity: 0.75, emissive: '#7cc8f0', emissiveIntensity: 0.25}),
      puddle: new THREE.MeshStandardMaterial({color: '#6aa8c8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.6}),
    }),
    [],
  );
  const w = clamp(water);
  const len = TAP_SPOUT[1] - 0.02;
  return (
    <group>
      {/* Holzpfosten + Rohr */}
      <mesh material={mats.wood} position={[0, 0.6, -0.06]} castShadow>
        <boxGeometry args={[0.1, 1.2, 0.08]} />
      </mesh>
      <mesh material={mats.pipe} position={[0, 0.53, 0.02]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 1.06, 8]} />
      </mesh>
      {/* Hahn: Körper, Auslauf nach vorn-unten, roter Drehgriff */}
      <mesh material={mats.brass} position={[0, 1.06, 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.09, 10]} />
      </mesh>
      <mesh material={mats.brass} position={[0, 1.04, 0.13]} rotation={[Math.PI / 2 + 0.6, 0, 0]} castShadow>
        <cylinderGeometry args={[0.017, 0.02, 0.11, 8]} />
      </mesh>
      <group position={[0, 1.12, 0.05]} rotation={[0, w * 1.2, 0]}>
        <mesh material={mats.brass} position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.04, 6]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} material={mats.handle} rotation={[0, (i * Math.PI) / 2, 0]} position={[0, 0, 0]}>
            <boxGeometry args={[0.09, 0.012, 0.016]} />
          </mesh>
        ))}
      </group>
      {/* Wasserstrahl + Pfütze */}
      {w > 0.02 && (
        <>
          <mesh material={mats.water} position={[0, TAP_SPOUT[1] - len / 2, TAP_SPOUT[2]]}>
            <cylinderGeometry args={[0.009 * w, 0.013 * w, len, 8, 6, true]} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const ph = (time * 2.6 + i / 6) % 1;
            return (
              <mesh key={i} material={mats.water} position={[Math.sin(i * 2.1) * 0.012, TAP_SPOUT[1] - ph * len, TAP_SPOUT[2] + Math.cos(i * 1.7) * 0.01]} scale={w}>
                <icosahedronGeometry args={[0.011, 0]} />
              </mesh>
            );
          })}
          <mesh material={mats.puddle} position={[0, 0.012, TAP_SPOUT[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[w, w, 1]}>
            <circleGeometry args={[0.2, 14]} />
          </mesh>
          {[0, 1, 2].map((i) => {
            const ph = (time * 1.8 + i / 3) % 1;
            return (
              <mesh key={i} position={[0, 0.016, TAP_SPOUT[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={0.03 + ph * 0.14}>
                <ringGeometry args={[0.9, 1, 16]} />
                <meshBasicMaterial color="#e8f7ff" transparent opacity={0.5 * (1 - ph) * w} depthWrite={false} />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
};

// ---------- Zahnrettungsbox (neutral, ohne Markennamen) ----------
const boxLabel = () => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4f8fb';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#1f7fd0';
  g.fillRect(0, 0, 512, 34);
  g.fillRect(0, 222, 512, 34);
  // Zahn-Symbol (zweimal, damit es von vorn immer zu sehen ist)
  for (const cx of [128, 384]) {
    g.fillStyle = '#1f7fd0';
    g.beginPath();
    g.arc(cx, 128, 74, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(cx - 40, 98);
    g.bezierCurveTo(cx - 44, 62, cx - 10, 62, cx, 76);
    g.bezierCurveTo(cx + 10, 62, cx + 44, 62, cx + 40, 98);
    g.bezierCurveTo(cx + 38, 128, cx + 30, 150, cx + 24, 184);
    g.bezierCurveTo(cx + 20, 196, cx + 10, 194, cx + 8, 180);
    g.lineTo(cx + 2, 150);
    g.lineTo(cx - 2, 150);
    g.lineTo(cx - 8, 180);
    g.bezierCurveTo(cx - 10, 194, cx - 20, 196, cx - 24, 184);
    g.bezierCurveTo(cx - 30, 150, cx - 38, 128, cx - 40, 98);
    g.fill();
    // kleines Kreuz (Erste Hilfe)
    g.fillStyle = '#1f7fd0';
    g.fillRect(cx - 5, 92, 10, 30);
    g.fillRect(cx - 15, 102, 30, 10);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Zahnrettungsbox: Dose ca. 9 cm hoch, Ø 8 cm (etwas größer als echt). Ursprung = Boden, Scharnier hinten. */
export const RescueBox = ({lid = 0}: {lid?: number}) => {
  const tex = useMemo(() => boxLabel(), []);
  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({map: tex, roughness: 0.45}),
      cap: std('#1f7fd0', {roughness: 0.4, flatShading: false}),
      liquid: new THREE.MeshStandardMaterial({color: '#f6d6dc', roughness: 0.1, transparent: true, opacity: 0.85}),
      inner: std('#dfe8ee'),
    }),
    [tex],
  );
  const open = easeInOut(clamp(lid)) * 1.9;
  return (
    <group>
      <mesh material={mats.body} position={[0, 0.042, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.084, 20, 1, true]} />
      </mesh>
      <mesh material={mats.inner} position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.004, 20]} />
      </mesh>
      <mesh material={mats.liquid} position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.038, 20]} />
      </mesh>
      {/* Deckel (klappt nach hinten auf) */}
      <group position={[0, 0.086, -0.04]} rotation={[-open, 0, 0]}>
        <mesh material={mats.cap} position={[0, 0.008, 0.04]} castShadow>
          <cylinderGeometry args={[0.043, 0.043, 0.016, 20]} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- H-Milch-Packung (neutral) ----------
const milkTexture = () => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 512);
  g.fillStyle = '#2a6fc9';
  g.fillRect(0, 0, 256, 120);
  // Welle
  g.beginPath();
  g.moveTo(0, 120);
  for (let x = 0; x <= 256; x += 8) g.lineTo(x, 120 + Math.sin(x / 26) * 14);
  g.lineTo(256, 0);
  g.lineTo(0, 0);
  g.fill();
  g.fillStyle = '#2a6fc9';
  g.font = `800 92px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('H-Milch', 128, 268);
  // Glas-Symbol + Tropfen
  g.fillStyle = '#9cc5ee';
  g.beginPath();
  g.moveTo(98, 360);
  g.lineTo(158, 360);
  g.lineTo(150, 460);
  g.lineTo(106, 460);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffffff';
  g.fillRect(104, 380, 48, 74);
  g.fillStyle = '#2a6fc9';
  g.beginPath();
  g.arc(190, 420, 16, 0, Math.PI * 2);
  g.moveTo(174, 418);
  g.lineTo(190, 382);
  g.lineTo(206, 418);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Milchpackung ca. 22 cm hoch (1-Liter-Ziegel). Ursprung = Boden, Vorderseite (+z) mit Aufschrift. */
export const MilkCarton = () => {
  const tex = useFontTexture(milkTexture, 'H-Milch');
  const mats = useMemo(
    () => ({
      front: tex ? new THREE.MeshStandardMaterial({map: tex, roughness: 0.6}) : std('#ffffff'),
      side: std('#ffffff', {roughness: 0.6, flatShading: false}),
      top: std('#2a6fc9', {roughness: 0.5}),
      cap: std('#f2f2f2'),
    }),
    [tex],
  );
  return (
    <group>
      <mesh position={[0, 0.11, 0]} castShadow material={[mats.side, mats.side, mats.top, mats.side, mats.front, mats.front]}>
        <boxGeometry args={[0.095, 0.22, 0.064]} />
      </mesh>
      <mesh material={mats.cap} position={[0.025, 0.226, 0.01]} castShadow>
        <cylinderGeometry args={[0.013, 0.013, 0.014, 10]} />
      </mesh>
    </group>
  );
};

// ---------- Boxhandschuh ----------
/** Roter Boxhandschuh. Ursprung = Handgelenk, Faust zeigt nach −y (wie die Hand am Arm). s = Größe */
export const BoxingGlove = ({s = 1, color = '#d42a22'}: {s?: number; color?: string}) => {
  const mats = useMemo(
    () => ({
      glove: std(color, {roughness: 0.35, flatShading: true}),
      cuff: std('#f4f4f0', {roughness: 0.6}),
      lace: std('#8e1b15'),
    }),
    [color],
  );
  return (
    <group scale={s}>
      <mesh material={mats.cuff} position={[0, -0.02, 0]} castShadow>
        <cylinderGeometry args={[0.062, 0.058, 0.06, 10]} />
      </mesh>
      <mesh material={mats.glove} position={[0, -0.1, 0.012]} scale={[0.95, 1.12, 1.0]} castShadow>
        <icosahedronGeometry args={[0.078, 1]} />
      </mesh>
      {/* Daumen */}
      <mesh material={mats.glove} position={[0.055, -0.08, 0.04]} scale={[0.6, 1, 0.6]} rotation={[0, 0, -0.4]} castShadow>
        <icosahedronGeometry args={[0.04, 0]} />
      </mesh>
      <mesh material={mats.lace} position={[0, -0.055, -0.055]}>
        <boxGeometry args={[0.03, 0.05, 0.012]} />
      </mesh>
    </group>
  );
};

// ---------- Hinweisschild ----------
const signTexture = (text: string, color: string, below = false) => {
  const c = document.createElement('canvas');
  const H = 200;
  const g0 = c.getContext('2d')!;
  g0.font = `800 120px ${T.font}`;
  const W = Math.ceil(g0.measureText(text).width) + 120;
  c.width = W;
  c.height = H + 50;
  const g = c.getContext('2d')!;
  const box = (x: number, y: number, w: number, h: number, rad: number) => {
    g.beginPath();
    g.moveTo(x + rad, y);
    g.arcTo(x + w, y, x + w, y + h, rad);
    g.arcTo(x + w, y + h, x, y + h, rad);
    g.arcTo(x, y + h, x, y, rad);
    g.arcTo(x, y, x + w, y, rad);
    g.closePath();
  };
  // Zeiger nach unten (oder nach oben, wenn das Schild unterhalb steht)
  const oy = below ? 50 : 0;
  g.fillStyle = color;
  g.beginPath();
  if (below) {
    g.moveTo(W / 2 - 40, 54);
    g.lineTo(W / 2 + 40, 54);
    g.lineTo(W / 2, 4);
  } else {
    g.moveTo(W / 2 - 40, H - 4);
    g.lineTo(W / 2 + 40, H - 4);
    g.lineTo(W / 2, H + 46);
  }
  g.closePath();
  g.fill();
  box(6, 6 + oy, W - 12, H - 12, 34);
  g.fill();
  g.lineWidth = 10;
  g.strokeStyle = '#ffffff';
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = `800 120px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, W / 2, H / 2 + 6 + oy);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  (t as THREE.CanvasTexture & {aspect: number}).aspect = W / (H + 50);
  return t;
};

/**
 * Hinweisschild mit Text (Figurname "hinweis", Text über das Feld "text" im Zeitpunkt), schaut immer zur Kamera.
 * Die Spitze des Zeigers liegt am Ursprung → Ursprung genau auf die Stelle setzen, auf die gezeigt wird.
 * Wert "below" 1 = Schild steht unterhalb und zeigt nach oben. Wert "size" = größer.
 * Bewegung "show" = erscheint (springt auf), alles andere = unsichtbar. height = Höhe des Schilds in m.
 */
export const HintSign = ({text, time, visible, height = 0.07, color = T.red, below = false}: {text: string; time: number; visible: boolean; height?: number; color?: string; below?: boolean}) => {
  const tex = useFontTexture(() => signTexture(text, color, below), `Schild ${text} ${below}`);
  const mat = useMemo(() => (tex ? new THREE.SpriteMaterial({map: tex, depthTest: false, transparent: true}) : null), [tex]);
  if (!visible || !mat || !tex) return null;
  const s = spring({frame: time * 30, fps: 30, config: {damping: 12, stiffness: 170}});
  const aspect = (tex as THREE.CanvasTexture & {aspect: number}).aspect;
  const h = height * s;
  return <sprite material={mat} scale={[h * aspect, h, 1]} center={new THREE.Vector2(0.5, below ? 1 : 0)} renderOrder={40} />;
};
