import {useMemo} from 'react';
import {spring} from 'remotion';
import * as THREE from 'three';
import {T} from '../ui/theme';
import {clamp, rng} from '../lib/anim';
import {useFontTexture} from './ToothProps';

/**
 * WG-Küche (Spezial "Mitbewohner-Joghurt") – alle Objekte comichaft und harmlos.
 *  - BigFridge ("kuehlschrank"): großer Kühlschrank, Tür links angeschlagen (Wert "door" 0 … 1), Innenlicht
 *  - YogurtCup ("joghurt"): Joghurtbecher mit Namensschild "DUMMY", Deckel ("lid"), Füllstand ("fill"), Klebezettel ("mark" + "text")
 *  - StickyNote ("klebezettel"), FatMarker, BigRedButton ("knopf", Wert "press"), YogurtBlast ("joghurtwelle")
 *  - Envelope ("brief", Text + "mark" = BEZAHLT-Stempel), RubberStamp, CoinPile ("muenzen", "fill"), Binder ("ordner"), Laptop ("laptop", "fill")
 *  - ReadingGlasses (Lesebrille am Dummy-Kopf)
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

/** Text-Textur auf Leinwand: draw(g, w, h) zeichnet, Rückgabe mit Seitenverhältnis */
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => () => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Text so groß wie möglich in eine Breite setzen (mehrzeilig über "\n") */
const fitText = (g: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, maxSize: number, weight = 800, lineH = 1.0) => {
  const lines = text.split('\n');
  let size = maxSize;
  g.font = `${weight} ${size}px ${T.font}`;
  while (size > 10 && Math.max(...lines.map((l) => g.measureText(l).width)) > maxW) {
    size -= 2;
    g.font = `${weight} ${size}px ${T.font}`;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const total = size * lineH * (lines.length - 1);
  lines.forEach((l, i) => g.fillText(l, cx, cy - total / 2 + i * size * lineH));
};

/** Mesh mit Text-Textur (leuchtet leicht, damit es immer gut lesbar ist) */
const TextPlane = ({draw, k, w, h, glow = 0.35}: {draw: () => THREE.Texture; k: string; w: number; h: number; glow?: number}) => {
  const tex = useFontTexture(draw, k);
  const mat = useMemo(
    () =>
      tex
        ? new THREE.MeshStandardMaterial({map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: glow, roughness: 0.85, transparent: true})
        : new THREE.MeshStandardMaterial({color: '#f4f1e8'}),
    [tex, glow],
  );
  return (
    <mesh material={mat}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
};

// ---------- Kühlschrank ----------
export const FRIDGE = {w: 0.7, h: 2.02, d: 0.68};
/**
 * Großer Kühlschrank. Ursprung = Boden-Mitte, Front +z. Tür links angeschlagen (−x), "door" 0 zu … 1 offen (ca. 105°).
 * Innen: 3 Glasböden (y 0.62 / 1.02 / 1.42 im eigenen System), Licht oben, Milch + Flaschen + Deko-Becher.
 * Fach für den Joghurt: rechts vorn auf dem mittleren Boden → FRIDGE_SHELF (0.18, 1.045, 0.1).
 */
export const FRIDGE_SHELF: [number, number, number] = [0.18, 1.045, 0.1];
export const BigFridge = ({door = 0, night = 0, wobble = 0, time = 0}: {door?: number; night?: number; wobble?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      body: std('#eef1f4', {roughness: 0.35, flatShading: false}),
      inner: std('#f8fbff', {roughness: 0.5, flatShading: false, emissive: new THREE.Color('#dff1ff'), emissiveIntensity: 0.25}),
      glass: new THREE.MeshStandardMaterial({color: '#cfe9ff', transparent: true, opacity: 0.45, roughness: 0.1}),
      seal: std('#b8bec6'),
      handle: std('#c9ced4', {metalness: 0.7, roughness: 0.25}),
      lamp: new THREE.MeshBasicMaterial({color: '#fffbe8'}),
      milk: std('#ffffff'),
      milkBlue: std('#3d8fd9'),
      bottle: std('#58b368', {roughness: 0.2}),
      jam: std('#c8323a'),
      cheese: std('#f4c542'),
    }),
    [],
  );
  const {w, h, d} = FRIDGE;
  const ang = clamp(door) * 1.85 + Math.sin(time * 18) * 0.12 * wobble;
  const t = 0.05; // Wandstärke
  return (
    <group>
      {/* Korpus: Seiten, Rückwand, Boden, Decke */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.body} position={[(s * (w - t)) / 2, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, h, d]} />
        </mesh>
      ))}
      <mesh material={m.body} position={[0, h / 2, -d / 2 + t / 2]} castShadow>
        <boxGeometry args={[w, h, t]} />
      </mesh>
      <mesh material={m.body} position={[0, h - t / 2, 0]} castShadow>
        <boxGeometry args={[w, t, d]} />
      </mesh>
      {/* Gefrierfach unten (Schublade, fest) */}
      <mesh material={m.body} position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[w, 0.4, d]} />
      </mesh>
      <mesh material={m.handle} position={[0, 0.34, d / 2 + 0.02]}>
        <boxGeometry args={[0.36, 0.025, 0.03]} />
      </mesh>
      <mesh material={m.seal} position={[0, 0.405, d / 2 + 0.001]}>
        <boxGeometry args={[w, 0.01, 0.004]} />
      </mesh>
      {/* Innenraum */}
      <mesh material={m.inner} position={[0, (h + 0.4) / 2, -d / 2 + t + 0.002]}>
        <planeGeometry args={[w - 2 * t, h - 0.4 - t]} />
      </mesh>
      {[0.62, 1.02, 1.42].map((y) => (
        <mesh key={y} material={m.glass} position={[0, y, 0.02]}>
          <boxGeometry args={[w - 2 * t, 0.012, d - 0.12]} />
        </mesh>
      ))}
      <mesh material={m.lamp} position={[0, h - 0.09, -0.05]}>
        <boxGeometry args={[0.2, 0.03, 0.12]} />
      </mesh>
      <pointLight position={[0, h - 0.25, 0.25]} intensity={clamp(door * 1.4) * (0.5 + 1.6 * night)} color="#e8f4ff" distance={3.2} decay={1.6} />
      {/* Inhalt (Deko) */}
      <group position={[-0.17, 0.628, -0.06]}>
        <mesh material={m.milk} position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[0.09, 0.24, 0.09]} />
        </mesh>
        <mesh material={m.milkBlue} position={[0, 0.1, 0.046]}>
          <planeGeometry args={[0.07, 0.06]} />
        </mesh>
      </group>
      {[0.14, 0.22].map((x) => (
        <mesh key={x} material={m.bottle} position={[x, 0.628 + 0.13, -0.12]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.26, 8]} />
        </mesh>
      ))}
      <mesh material={m.jam} position={[-0.18, 1.08, -0.1]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.1, 10]} />
      </mesh>
      <mesh material={m.cheese} position={[0.15, 1.45, -0.08]} rotation={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.06, 3]} />
      </mesh>
      {/* Tür (Scharnier links vorn) */}
      <group position={[-w / 2, 0.42, d / 2]} rotation={[0, -ang, 0]}>
        <mesh material={m.body} position={[w / 2, (h - 0.42) / 2, 0.03]} castShadow>
          <boxGeometry args={[w, h - 0.42, 0.06]} />
        </mesh>
        <mesh material={m.seal} position={[w / 2, (h - 0.42) / 2, -0.002]}>
          <boxGeometry args={[w - 0.04, h - 0.46, 0.004]} />
        </mesh>
        {/* Griff rechts außen */}
        <mesh material={m.handle} position={[w - 0.06, 0.75, 0.085]}>
          <boxGeometry args={[0.03, 0.42, 0.03]} />
        </mesh>
        {/* Türfächer innen */}
        {[0.35, 0.8].map((y) => (
          <mesh key={y} material={m.inner} position={[w / 2, y, -0.06]}>
            <boxGeometry args={[w - 0.12, 0.08, 0.08]} />
          </mesh>
        ))}
        {/* Magnete + Zettel außen */}
        <mesh position={[0.2, 1.15, 0.062]}>
          <planeGeometry args={[0.15, 0.19]} />
          <meshStandardMaterial color="#fff7b0" />
        </mesh>
        <mesh position={[0.46, 0.95, 0.062]} rotation={[0, 0, 0.1]}>
          <planeGeometry args={[0.13, 0.1]} />
          <meshStandardMaterial color="#ffc7dc" />
        </mesh>
      </group>
    </group>
  );
};

// ---------- Joghurtbecher ----------
const cupLabelTex = canvasTex(512, 160, (g) => {
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 512, 160);
  g.fillStyle = '#ff7aa8';
  g.fillRect(0, 0, 512, 46);
  g.fillStyle = '#ffffff';
  g.font = `800 38px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('JOGHURT · ERDBEER', 256, 24);
  // Namensschild mit dickem Stift
  g.fillStyle = '#16181c';
  g.font = `800 92px ${T.font}`;
  g.fillText('DUMMY', 256, 106);
  g.strokeStyle = '#16181c';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(110, 150);
  g.lineTo(402, 146);
  g.stroke();
});

const noteTex = (text: string) =>
  canvasTex(400, 400, (g) => {
    g.fillStyle = '#ffe866';
    g.fillRect(0, 0, 400, 400);
    g.fillStyle = 'rgba(0,0,0,0.06)';
    g.fillRect(0, 0, 400, 40);
    g.fillStyle = '#c3121b';
    const wrapped = text.replace(' fürs ', ' fürs\n').replace('Gesundheitsamt', 'Gesundheits-\namt');
    fitText(g, wrapped, 200, 225, 360, 120, 800, 1.0);
  });

/** Klebezettel (gelb, quadratisch) mit Text in Rot (dicker Stift). Ursprung = Mitte, zeigt nach +z */
export const StickyNote = ({text, size = 0.12}: {text: string; size?: number}) => (
  <group>
    <mesh position={[0, 0, -0.001]}>
      <boxGeometry args={[size, size, 0.002]} />
      <meshStandardMaterial color="#e6cf4c" />
    </mesh>
    <group position={[0, 0, 0.0015]}>
      <TextPlane draw={noteTex(text)} k={`Zettel ${text}`} w={size} h={size} glow={0.45} />
    </group>
  </group>
);

export const CUP = {h: 0.12, rTop: 0.055, rBottom: 0.043};
/**
 * Joghurtbecher (comichaft etwas größer). Ursprung = Boden-Mitte, Etikett "DUMMY" vorn (+z).
 * lid 0 = Alu-Deckel zu … 1 = aufgerissen (zurückgeklappt), fill 1 = voll … 0 = leer.
 * note = Klebezettel vorn auf dem Etikett (Text noteText).
 */
export const YogurtCup = ({lid = 0, fill = 1, note, spoon = false}: {lid?: number; fill?: number; note?: string; spoon?: boolean}) => {
  const label = useFontTexture(cupLabelTex, 'Joghurt-Etikett');
  const m = useMemo(
    () => ({
      cup: std('#fff8fb', {roughness: 0.45, flatShading: false}),
      inner: std('#ffe1ec', {side: THREE.DoubleSide, flatShading: false}),
      yog: std('#fdf6f8', {roughness: 0.3, flatShading: false}),
      foil: std('#d9dde3', {metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide}),
      foilTop: std('#ff8cb3', {metalness: 0.4, roughness: 0.35, side: THREE.DoubleSide}),
      spoon: std('#d4d9de', {metalness: 0.8, roughness: 0.2}),
      label: label
        ? new THREE.MeshStandardMaterial({map: label, emissive: new THREE.Color('#ffffff'), emissiveMap: label, emissiveIntensity: 0.3, roughness: 0.6, side: THREE.DoubleSide})
        : std('#ffffff'),
    }),
    [label],
  );
  const {h, rTop, rBottom} = CUP;
  const f = clamp(fill);
  const yH = 0.01 + (h - 0.02) * f;
  const rAt = (y: number) => rBottom + ((rTop - rBottom) * y) / h;
  const lidA = clamp(lid) * 2.6;
  return (
    <group>
      <mesh material={m.cup} position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[rTop, rBottom, h, 20, 1, true]} />
      </mesh>
      <mesh material={m.inner} position={[0, h / 2, 0]}>
        <cylinderGeometry args={[rTop * 0.97, rBottom * 0.97, h * 0.99, 20, 1, true]} />
      </mesh>
      <mesh material={m.cup} position={[0, 0.003, 0]}>
        <cylinderGeometry args={[rBottom, rBottom, 0.006, 20]} />
      </mesh>
      {/* Rand oben */}
      <mesh material={m.cup} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[rTop, 0.004, 5, 20]} />
      </mesh>
      {/* Etikett vorn (halbe Runde) */}
      <mesh material={m.label} position={[0, h * 0.47, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <cylinderGeometry args={[rAt(h * 0.47) + 0.0015, rAt(h * 0.47) + 0.0015, h * 0.5, 20, 1, true, 0, Math.PI]} />
      </mesh>
      {/* Joghurt */}
      {f > 0.02 && (
        <mesh material={m.yog} position={[0, yH, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[rAt(yH) * 0.97, 20]} />
        </mesh>
      )}
      {/* leerer Becher: ein paar Reste an der Wand */}
      {f <= 0.02 &&
        [0, 1, 2].map((i) => (
          <mesh key={i} material={m.yog} position={[Math.cos(i * 2.1) * rBottom * 0.8, 0.02 + i * 0.012, Math.sin(i * 2.1) * rBottom * 0.8]}>
            <sphereGeometry args={[0.009, 6, 5]} />
          </mesh>
        ))}
      {/* Alu-Deckel: Scharnier hinten (−z) */}
      <group position={[0, h + 0.002, -rTop]} rotation={[-lidA, 0, 0]}>
        <mesh material={m.foilTop} position={[0, 0.001, rTop]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[rTop + 0.006, 20]} />
        </mesh>
        <mesh material={m.foil} position={[0, -0.0005, rTop]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[rTop + 0.006, 20]} />
        </mesh>
      </group>
      {spoon && (
        <group position={[0.02, h * 0.55, -0.01]} rotation={[0.25, 0, -0.3]}>
          <mesh material={m.spoon} position={[0, 0.08, 0]}>
            <boxGeometry args={[0.012, 0.16, 0.004]} />
          </mesh>
        </group>
      )}
      {note && (
        <group position={[0, h * 0.5, rAt(h * 0.5) + 0.006]} rotation={[-0.09, 0, 0.06]}>
          <StickyNote text={note} size={0.115} />
        </group>
      )}
    </group>
  );
};

/** Löffel (für die Hand): Ursprung = Griffende, Laffe zeigt nach +y */
export const Spoon = () => (
  <group>
    <mesh position={[0, 0.07, 0]}>
      <boxGeometry args={[0.012, 0.13, 0.005]} />
      <meshStandardMaterial color="#d4d9de" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, 0.15, 0.004]} scale={[1, 1.4, 0.45]}>
      <sphereGeometry args={[0.018, 10, 8]} />
      <meshStandardMaterial color="#d4d9de" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, 0.152, 0.011]} scale={[0.8, 1.1, 0.3]}>
      <sphereGeometry args={[0.016, 8, 6]} />
      <meshStandardMaterial color="#fdf6f8" />
    </mesh>
  </group>
);

/** Dicker schwarzer Stift (Marker). Ursprung = Mitte, Spitze nach −y */
export const FatMarker = () => (
  <group>
    <mesh>
      <cylinderGeometry args={[0.013, 0.013, 0.14, 10]} />
      <meshStandardMaterial color="#1c1f24" roughness={0.4} />
    </mesh>
    <mesh position={[0, 0.06, 0]}>
      <cylinderGeometry args={[0.0135, 0.0135, 0.03, 10]} />
      <meshStandardMaterial color="#c3121b" roughness={0.4} />
    </mesh>
    <mesh position={[0, -0.08, 0]}>
      <coneGeometry args={[0.009, 0.025, 8]} />
      <meshStandardMaterial color="#c3121b" />
    </mesh>
  </group>
);

// ---------- Großer roter Knopf ----------
const stripeTex = canvasTex(256, 64, (g) => {
  for (let i = -2; i < 10; i++) {
    g.fillStyle = i % 2 ? '#1c1c1c' : '#f3bf12';
    g.beginPath();
    g.moveTo(i * 32, 64);
    g.lineTo(i * 32 + 32, 64);
    g.lineTo(i * 32 + 64, 0);
    g.lineTo(i * 32 + 32, 0);
    g.closePath();
    g.fill();
  }
});
/** Großer roter Knopf auf einem Sockel mit Warnstreifen. Ursprung = Boden, Knopf oben auf 0,92 m. press 0 … 1 = gedrückt */
export const BUTTON_TOP = 0.98;
export const BigRedButton = ({press = 0, glow = 0}: {press?: number; glow?: number}) => {
  const stripes = useMemo(() => {
    const t = stripeTex();
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(2, 1);
    return t;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.84, 0.34]} />
        <meshStandardMaterial color="#5a6069" roughness={0.5} flatShading />
      </mesh>
      <mesh position={[0, 0.75, 0.1705]}>
        <planeGeometry args={[0.34, 0.09]} />
        <meshStandardMaterial map={stripes} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.865, 0]} castShadow>
        <boxGeometry args={[0.38, 0.05, 0.38]} />
        <meshStandardMaterial color="#3b3f45" roughness={0.5} flatShading />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.13, 0.14, 0.025, 20]} />
        <meshStandardMaterial color="#d9dde2" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.915 - 0.035 * clamp(press), 0]} scale={[1, 0.55, 1]} castShadow>
        <sphereGeometry args={[0.11, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e3201b" roughness={0.3} emissive="#ff2a1a" emissiveIntensity={0.15 + 0.6 * glow} />
      </mesh>
    </group>
  );
};

// ---------- Joghurt-Welle (comichaftes "PUFF", KEIN Feuer, KEIN Rauch) ----------
const puffTex = canvasTex(640, 340, (g) => {
  // weiße, rundliche Joghurt-Wolke mit rosa Rand + Schriftzug "PUFF!"
  const blobs: [number, number, number][] = [
    [320, 175, 130], [180, 190, 100], [460, 190, 100], [250, 110, 90], [400, 110, 90], [110, 220, 60], [530, 220, 60], [320, 255, 95],
  ];
  g.fillStyle = '#ff8cb3';
  for (const [x, y, r] of blobs) {
    g.beginPath();
    g.arc(x, y, r + 14, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ffffff';
  for (const [x, y, r] of blobs) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.font = `900 170px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 22;
  g.strokeStyle = '#ffffff';
  g.strokeText('PUFF!', 320, 180);
  g.fillStyle = '#e84a86';
  g.fillText('PUFF!', 320, 180);
});

const PuffSprite = ({time, height}: {time: number; height: number}) => {
  const tex = useFontTexture(puffTex, 'Puff');
  const mat = useMemo(() => (tex ? new THREE.SpriteMaterial({map: tex, depthTest: false, transparent: true}) : null), [tex]);
  if (!mat || time < 0) return null;
  const s = spring({frame: time * 30, fps: 30, config: {damping: 9, stiffness: 170}});
  const fade = 1 - clamp((time - 2.4) / 0.6);
  if (fade <= 0) return null;
  mat.opacity = fade;
  const h = height * s;
  return <sprite material={mat} scale={[h * (640 / 340), h, 1]} renderOrder={50} />;
};

/** Joghurt-Kleckse (weiß-rosa) – flache Scheiben, Ursprung = Mitte, zeigen nach +z */
const Splats = ({seed, n, spread, r, amount, mat}: {seed: number; n: number; spread: [number, number]; r: number; amount: number; mat: THREE.Material}) => {
  const items = useMemo(() => {
    const rr = rng(seed);
    return Array.from({length: n}).map(() => ({x: (rr() - 0.5) * spread[0], y: (rr() - 0.5) * spread[1], s: r * (0.5 + rr()), d: rr() * 0.6, sx: 0.8 + rr() * 0.6}));
  }, [seed, n, spread, r]);
  return (
    <>
      {items.map((it, i) => {
        const k = clamp((amount - it.d * 0.5) / 0.5);
        if (k <= 0.01) return null;
        return (
          <mesh key={i} material={mat} position={[it.x, it.y, 0.003 * (i % 3)]} scale={[it.s * k * it.sx, it.s * k, 1]}>
            <circleGeometry args={[1, 12]} />
          </mesh>
        );
      })}
    </>
  );
};

/**
 * Joghurt-Welle für die WG-Küche ("joghurtwelle", Figur bei x 0, z 0 platzieren – Koordinaten = Küche).
 * Motion "splash": ab Beginn quillt aus dem Kühlschrank (bei FRIDGE_AT) eine weiße Joghurt-Wolke mit Schriftzug "PUFF!",
 * eine Welle aus Joghurt-Kugeln rollt durch den Raum (0,2–1,4 s). "fill" 0 … 1 = wie weiß die Küche danach ist
 * (Boden-Pfütze, Kleckse an Wänden, Schränken, Kühlschrank, Decke, Tisch). Kein Feuer, kein Rauch, keine Trümmer.
 */
export const WG_FRIDGE_AT: [number, number, number] = [-2.13, 0, -1.94];
export const YogurtBlast = ({time, active, fill}: {time: number; active: boolean; fill: number}) => {
  const m = useMemo(
    () => ({
      yog: new THREE.MeshStandardMaterial({color: '#fffafc', roughness: 0.25, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.12, side: THREE.DoubleSide}),
      pink: new THREE.MeshStandardMaterial({color: '#ffd6e5', roughness: 0.3, side: THREE.DoubleSide}),
    }),
    [],
  );
  const f = clamp(fill);
  const [fx, , fz] = WG_FRIDGE_AT;
  // Welle: Kugeln fliegen vom Kühlschrank in den Raum
  const balls = useMemo(() => {
    const r = rng(77);
    return Array.from({length: 46}).map(() => ({
      dx: 0.6 + r() * 4.2,
      dz: -0.2 + r() * 4.0,
      up: 0.6 + r() * 1.6,
      s: 0.08 + r() * 0.16,
      d: r() * 0.35,
      pink: r() < 0.2,
    }));
  }, []);
  const tt = active ? time : -1;
  return (
    <group>
      {tt >= 0 && (
        <group position={[fx + 0.5, 1.35, fz + 0.75]}>
          <PuffSprite time={tt - 0.05} height={1.3} />
        </group>
      )}
      {/* Quellwolke vor dem Kühlschrank (weiße Kugeln, wachsen + sinken) */}
      {tt >= 0 &&
        tt < 2.6 &&
        [0, 1, 2, 3, 4, 5, 6].map((i) => {
          const k = clamp(tt / 0.35);
          const out = 1 - clamp((tt - 1.6) / 1.0);
          const a = i * 0.9;
          return (
            <mesh key={i} material={i % 3 === 0 ? m.pink : m.yog} position={[fx + 0.2 + Math.cos(a) * 0.35 * k, 0.9 + Math.sin(a) * 0.45 * k - 0.5 * (1 - out), fz + 0.55 + 0.25 * k]} scale={0.32 * k * out + 0.001}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
          );
        })}
      {tt >= 0 &&
        balls.map((b, i) => {
          const p = clamp((tt - 0.12 - b.d) / 1.0);
          if (p <= 0 || p >= 1) return null;
          const x = fx + 0.3 + b.dx * p;
          const z = fz + 0.4 + b.dz * p;
          const y = 0.6 + b.up * Math.sin(Math.PI * p) * 0.8 + 0.3 * (1 - p);
          return (
            <mesh key={i} material={b.pink ? m.pink : m.yog} position={[x, Math.max(0.05, y), z]} scale={b.s * (1 - 0.3 * p)}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
          );
        })}
      {/* bleibende Joghurt-Schicht */}
      {f > 0.01 && (
        <>
          {/* Boden: große weiße Pfütze */}
          <group position={[-0.3, 0.004, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
            <Splats seed={3} n={26} spread={[4.6, 3.6]} r={0.55} amount={f} mat={m.yog} />
          </group>
          {/* Rückwand + Schränke + Oberschränke */}
          <group position={[-0.6, 1.3, -2.285]}>
            <Splats seed={5} n={22} spread={[3.4, 2.0]} r={0.14} amount={f} mat={m.yog} />
          </group>
          <group position={[-0.6, 1.3, -2.285 + 0.62]}>
            <Splats seed={8} n={10} spread={[2.4, 0.5]} r={0.09} amount={f} mat={m.yog} />
          </group>
          <group position={[-0.6, 1.82, -2.285 + 0.36]}>
            <Splats seed={11} n={10} spread={[2.4, 0.4]} r={0.1} amount={f} mat={m.yog} />
          </group>
          {/* Kühlschrank-Front */}
          <group position={[fx, 1.2, fz + 0.43]}>
            <Splats seed={13} n={10} spread={[0.6, 1.4]} r={0.09} amount={f} mat={m.pink} />
          </group>
          {/* linke + rechte Wand */}
          <group position={[-2.49, 1.3, 0.2]} rotation={[0, Math.PI / 2, 0]}>
            <Splats seed={17} n={14} spread={[3.4, 1.8]} r={0.13} amount={f} mat={m.yog} />
          </group>
          <group position={[2.49, 1.3, -0.5]} rotation={[0, -Math.PI / 2, 0]}>
            <Splats seed={19} n={12} spread={[2.2, 1.8]} r={0.12} amount={f} mat={m.yog} />
          </group>
          {/* Decke: Tropfen-Kleckse */}
          <group position={[-0.3, 2.595, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <Splats seed={23} n={12} spread={[4, 3]} r={0.16} amount={f} mat={m.yog} />
          </group>
          {/* Tisch */}
          <group position={[-0.2, 0.765, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
            <Splats seed={29} n={7} spread={[1.0, 0.6]} r={0.12} amount={f} mat={m.yog} />
          </group>
        </>
      )}
    </group>
  );
};

// ---------- Briefe ----------
const envelopeTex = (text: string, paid: boolean) =>
  canvasTex(520, 340, (g) => {
    g.fillStyle = '#fbf7ee';
    g.fillRect(0, 0, 520, 340);
    g.strokeStyle = '#c9c1b0';
    g.lineWidth = 6;
    g.strokeRect(4, 4, 512, 332);
    // Klappe angedeutet
    g.beginPath();
    g.moveTo(8, 8);
    g.lineTo(260, 150);
    g.lineTo(512, 8);
    g.stroke();
    // Marke oben rechts
    g.fillStyle = '#e84a86';
    g.fillRect(420, 22, 76, 86);
    // Aufschrift
    const red = text.includes('Mahnung');
    g.fillStyle = red ? '#c3121b' : '#1d2026';
    fitText(g, text.toUpperCase(), 250, 238, 440, 112, 800);
    if (paid) {
      g.save();
      g.translate(270, 190);
      g.rotate(-0.22);
      g.strokeStyle = 'rgba(30,160,70,0.92)';
      g.lineWidth = 12;
      g.strokeRect(-215, -62, 430, 124);
      g.fillStyle = 'rgba(30,160,70,0.92)';
      g.font = `900 112px ${T.font}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('BEZAHLT', 0, 6);
      g.restore();
    }
  });
/** Briefumschlag mit großer Aufschrift (z. B. "Rechnung", "1. Mahnung"). Ursprung = Mitte, Vorderseite +z. mark 1 = grüner Stempel "BEZAHLT" */
export const Envelope = ({text, paid = false, size = 0}: {text: string; paid?: boolean; size?: number}) => (
  <group scale={1 + size}>
    <mesh position={[0, 0, -0.002]} castShadow>
      <boxGeometry args={[0.26, 0.17, 0.003]} />
      <meshStandardMaterial color="#ece5d6" />
    </mesh>
    <group position={[0, 0, 0.0005]}>
      <TextPlane draw={envelopeTex(text, paid)} k={`Brief ${text} ${paid}`} w={0.26} h={0.17} glow={0.35} />
    </group>
  </group>
);

/** Stempel (Holzgriff + roter Gummi). Ursprung = Stempelfläche unten, Griff nach +y */
export const RubberStamp = () => (
  <group>
    <mesh position={[0, 0.012, 0]}>
      <boxGeometry args={[0.11, 0.024, 0.06]} />
      <meshStandardMaterial color="#2ea055" roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.034, 0]}>
      <boxGeometry args={[0.12, 0.02, 0.07]} />
      <meshStandardMaterial color="#8e5f36" roughness={0.6} flatShading />
    </mesh>
    <mesh position={[0, 0.075, 0]}>
      <cylinderGeometry args={[0.012, 0.016, 0.07, 8]} />
      <meshStandardMaterial color="#c48a52" roughness={0.6} flatShading />
    </mesh>
    <mesh position={[0, 0.125, 0]}>
      <sphereGeometry args={[0.026, 10, 8]} />
      <meshStandardMaterial color="#c48a52" roughness={0.6} flatShading />
    </mesh>
  </group>
);

/** Münze (flach liegend). Ursprung = Mitte */
const COIN_MAT = new THREE.MeshStandardMaterial({color: '#d9a93a', metalness: 0.75, roughness: 0.3});
const COIN_MAT2 = new THREE.MeshStandardMaterial({color: '#c9ccd1', metalness: 0.8, roughness: 0.3});
export const Coin = ({silver = false}: {silver?: boolean}) => (
  <mesh material={silver ? COIN_MAT2 : COIN_MAT} castShadow>
    <cylinderGeometry args={[0.016, 0.016, 0.004, 14]} />
  </mesh>
);
/**
 * Häufchen Münzen ("muenzen"): fill 0 … 1 = wie viele schon einzeln vor ihm aufgereiht sind (bis 13 Münzen, je eine Reihe nach +x).
 * Ursprung = Mitte des Häufchens auf dem Tisch. Reihe beginnt 0,1 m rechts davor.
 */
export const COIN_COUNT = 13;
export const CoinPile = ({fill = 0}: {fill?: number}) => {
  const coins = useMemo(() => {
    const r = rng(41);
    return Array.from({length: COIN_COUNT}).map((_, i) => ({x: (r() - 0.5) * 0.07, z: (r() - 0.5) * 0.07, y: 0.002 + (i % 5) * 0.0045 + Math.floor(i / 5) * 0.003, rx: (r() - 0.5) * 0.5, rz: (r() - 0.5) * 0.5, silver: r() < 0.4}));
  }, []);
  const n = Math.floor(clamp(fill) * COIN_COUNT + 1e-6);
  return (
    <group>
      {coins.map((c, i) => {
        const counted = i < n;
        // gezählte Münzen: Reihe nach +x, je 0,035 m Abstand
        const pos: [number, number, number] = counted ? [0.12 + i * 0.036, 0.002, 0.08] : [c.x, c.y, c.z];
        return (
          <group key={i} position={pos} rotation={counted ? [0, 0, 0] : [c.rx, 0, c.rz]}>
            <Coin silver={c.silver} />
          </group>
        );
      })}
    </group>
  );
};

// ---------- Aktenordner ----------
const spineTex = (text: string, color: string) =>
  canvasTex(160, 600, (g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, 160, 600);
    g.fillStyle = '#ffffff';
    g.fillRect(16, 60, 128, 330);
    g.save();
    g.translate(80, 225);
    g.rotate(-Math.PI / 2);
    g.fillStyle = '#1d2026';
    fitText(g, text, 0, 0, 300, 96, 800, 1.0);
    g.restore();
    // Griffloch
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.arc(80, 490, 30, 0, Math.PI * 2);
    g.fill();
  });
/** Aktenordner mit Rückenschild. Ursprung = Boden-Mitte, Rücken zeigt nach +z, 0,32 m hoch. */
export const Binder = ({text, color = '#2f6fb5', size = 0}: {text: string; color?: string; size?: number}) => (
  <group scale={1 + size}>
    <mesh position={[0, 0.16, -0.12]} castShadow>
      <boxGeometry args={[0.075, 0.32, 0.25]} />
      <meshStandardMaterial color={color} roughness={0.55} flatShading />
    </mesh>
    <group position={[0, 0.16, 0.0055]}>
      <TextPlane draw={spineTex(text, color)} k={`Ordner ${text} ${color}`} w={0.075} h={0.32} glow={0.3} />
    </group>
  </group>
);

// ---------- Laptop ----------
const screenTex = (n: number) =>
  canvasTex(480, 300, (g) => {
    g.fillStyle = '#f4f7fb';
    g.fillRect(0, 0, 480, 300);
    g.fillStyle = '#2f6fb5';
    g.fillRect(0, 0, 480, 34);
    const lines = ['RECHNUNG', 'Joghurt (Erdbeer)', '1,29 €', 'zahlbar sofort'];
    const full = lines.join('\n');
    const shown = full.slice(0, n).split('\n');
    g.fillStyle = '#1d2026';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    const sizes = [62, 36, 74, 32];
    let y = 46;
    shown.forEach((l, i) => {
      g.font = `800 ${sizes[i]}px ${T.font}`;
      g.fillStyle = i === 2 ? '#c3121b' : '#1d2026';
      g.fillText(l, 28, y);
      y += sizes[i] + 10;
    });
  });
export const LAPTOP_CHARS = 'RECHNUNG\nJoghurt (Erdbeer)\n1,29 €\nzahlbar sofort'.length;
const Screen = ({n}: {n: number}) => <TextPlane draw={screenTex(n)} k={`Laptop ${n}`} w={0.3} h={0.19} glow={0.85} />;
/** Laptop (aufgeklappt). Ursprung = Mitte unten, Bildschirm hinten, zeigt nach +z. fill 0 … 1 = getippter Text "RECHNUNG … 1,29 €" */
export const Laptop = ({fill = 0}: {fill?: number}) => {
  const n = Math.round(clamp(fill) * LAPTOP_CHARS);
  // nur in Schritten neu zeichnen (jede Textur kostet)
  const step = Math.min(LAPTOP_CHARS, Math.ceil(n / 3) * 3);
  return (
    <group>
      <mesh position={[0, 0.008, 0]} castShadow>
        <boxGeometry args={[0.34, 0.016, 0.23]} />
        <meshStandardMaterial color="#9aa3ad" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.0165, 0.01]}>
        <boxGeometry args={[0.29, 0.002, 0.11]} />
        <meshStandardMaterial color="#2a2e33" />
      </mesh>
      <group position={[0, 0.016, -0.115]} rotation={[-0.28, 0, 0]}>
        <mesh position={[0, 0.11, -0.006]} castShadow>
          <boxGeometry args={[0.34, 0.22, 0.012]} />
          <meshStandardMaterial color="#9aa3ad" metalness={0.5} roughness={0.35} />
        </mesh>
        <group position={[0, 0.11, 0.0005]}>
          <Screen n={step} />
        </group>
      </group>
    </group>
  );
};

// ---------- Lesebrille (am Dummy-Kopf) ----------
/** Lesebrille: zwei runde Gläser mit Bügeln. Ursprung = Kopfmitte des Dummys (Kopf-Radius ca. 0,13), Gläser vorn (+z) */
export const ReadingGlasses = ({amount = 1}: {amount?: number}) => {
  if (amount < 0.05) return null;
  const y = 0.015 - 0.25 * (1 - clamp(amount));
  return (
    <group position={[0, y, 0]}>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.048, 0, 0.122]}>
            <torusGeometry args={[0.034, 0.006, 6, 18]} />
            <meshStandardMaterial color="#3a2414" roughness={0.4} />
          </mesh>
          <mesh position={[s * 0.048, 0, 0.12]}>
            <circleGeometry args={[0.032, 16]} />
            <meshStandardMaterial color="#d8f0ff" transparent opacity={0.35} roughness={0.05} />
          </mesh>
          <mesh position={[s * 0.112, 0, 0.06]} rotation={[0, s * 0.2, 0]}>
            <boxGeometry args={[0.006, 0.006, 0.12]} />
            <meshStandardMaterial color="#3a2414" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.006, 0.126]}>
        <boxGeometry args={[0.03, 0.006, 0.006]} />
        <meshStandardMaterial color="#3a2414" />
      </mesh>
    </group>
  );
};

/** Joghurt-Kleckse am Kopf/Körper einer Dummy-Figur ("splat" 0 … 1). Ursprung = Kopfmitte */
export const HeadSplat = ({amount}: {amount: number}) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({color: '#fffafc', roughness: 0.25, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.1}), []);
  if (amount < 0.02) return null;
  const k = clamp(amount);
  return (
    <group>
      {/* Stirn-Klecks (wird weggewischt) */}
      <mesh material={mat} position={[0.02, 0.07, 0.1]} scale={[0.07 * k, 0.045 * k, 0.03]}>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
      <mesh material={mat} position={[-0.05, 0.12, 0.04]} scale={[0.05 * k, 0.03 * k, 0.05 * k]}>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
      <mesh material={mat} position={[0.0, 0.145, -0.02]} scale={[0.08 * k, 0.025, 0.07 * k]}>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
      {/* Tropfen */}
      <mesh material={mat} position={[0.05, 0.02, 0.115]} scale={[0.012, 0.03 * k, 0.012]}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
    </group>
  );
};

// ---------- Putzplan ----------
export const putzplanTex = canvasTex(500, 640, (g) => {
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 500, 640);
  g.fillStyle = '#2f6fb5';
  g.fillRect(0, 0, 500, 96);
  g.fillStyle = '#ffffff';
  g.font = `800 74px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('PUTZPLAN', 250, 52);
  const rows = ['Küche', 'Bad', 'Müll', 'Flur'];
  const cols = ['GELB', 'ORANGE'];
  g.font = `800 40px ${T.font}`;
  g.fillStyle = '#1d2026';
  cols.forEach((c, i) => g.fillText(c, 290 + i * 130, 140));
  rows.forEach((r, j) => {
    const y = 220 + j * 105;
    g.fillStyle = '#1d2026';
    g.textAlign = 'left';
    g.fillText(r, 24, y);
    g.textAlign = 'center';
    // Gelb (Dummy) hat alles erledigt, Orange (Mitbewohner) nichts
    g.fillStyle = '#22a04a';
    g.font = `900 64px ${T.font}`;
    g.fillText('✓', 290, y);
    g.fillStyle = '#c3121b';
    g.fillText('✗', 420, y);
    g.font = `800 40px ${T.font}`;
  });
  g.strokeStyle = '#c9ced4';
  g.lineWidth = 4;
  for (let j = 0; j <= 4; j++) {
    g.beginPath();
    g.moveTo(14, 168 + j * 105);
    g.lineTo(486, 168 + j * 105);
    g.stroke();
  }
  g.strokeRect(4, 4, 492, 632);
});
export const Putzplan = () => <TextPlane draw={putzplanTex} k="Putzplan" w={0.42} h={0.54} glow={0.25} />;
