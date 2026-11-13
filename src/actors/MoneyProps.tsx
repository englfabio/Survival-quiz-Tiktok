import {useEffect, useMemo, useState} from 'react';
import {continueRender, delayRender, spring} from 'remotion';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {T} from '../ui/theme';
import {clamp, deg} from '../lib/anim';
import {useFontTexture} from './ToothProps';

/**
 * Objekte für das Video "Geldkoffer mit einer Million" (wiederverwendbar für alle Fund-/Geld-Szenen).
 * WICHTIG (vom Inhaber): Geld nur stilisiert – keine echten Euro-Banknoten nachbilden. Die Bündel sind hell-sandfarben
 * mit grauer Banderole und einem "€"-Zeichen, ohne Motive, Seriennummern oder Unterschriften.
 *
 *  - MoneyBundle ("geldbuendel"): ein Geldbündel, ca. 16 × 7,5 × 2,5 cm. Ursprung = Mitte unten, lange Seite entlang x.
 *  - MoneyCase ("geldkoffer"): silberner Metall-Aktenkoffer (46 × 33 × 13 cm) mit Tragegriff, zwei Schlössern, Kantenschutz.
 *      Ursprung = Boden-Mitte des STEHENDEN Koffers (Griff oben, Front nach +z).
 *      tilt 0 = steht aufrecht (zum Tragen: "hand" 1 + "drop" 0.37 → Griff in der Hand), tilt 90 = liegt flach auf dem
 *      Rücken (Griff zeigt nach +z, Scharnier hinten bei −z): so wird er geöffnet. lid 0 … 1 = Deckel offen (ca. 105°),
 *      darin liegen stilisierte Geldbündel (money 0 … 1 = wie voll; 0.6 = ein paar Bündel fehlen).
 *  - PaperForm ("formular"): Formular "FUNDANZEIGE" mit Feldern Name / Anschrift / Telefon, liegt flach. fill 0 … 1 =
 *      wie weit die Felder schon ausgefüllt sind (blaue Schrift-Kringel). Mit Kugelschreiber daneben (pen 1).
 *  - Pen: Kugelschreiber (auch in der Hand des Dummys bei "fillform").
 *  - Calculator ("taschenrechner"): Taschenrechner mit großem Display, zeigt "30.010 €" (Feld "text" ändert den Text).
 *      fill 0 … 1 = Zahl zählt hoch (bei 1 steht der volle Betrag). Ursprung = Mitte unten, Display zeigt nach +z,
 *      tilt = nach hinten kippen (Grad).
 *  - CalendarSheet ("kalenderblatt"): Abreiß-Kalenderblatt mit roter Kopfleiste und "6 Monate" – springt auf (show),
 *      schaut immer zur Kamera.
 *  - ParagraphBadge ("paragraf"): rundes rotes Schild "§ 246" (Feld "text"), springt auf (show), schaut immer zur Kamera.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

// ---------- Geldbündel ----------
export const BUNDLE = {w: 0.16, h: 0.026, d: 0.075};

/** Banderole: graues Papierband mit weißem "€" */
const bandTexture = () => {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#5b6470';
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#f4f1e8';
  g.font = `800 150px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('€', 64, 132);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Seite des Bündels: viele helle Papierkanten (Streifen) */
const edgeTexture = () => {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e9e2c9';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(120,110,85,0.35)';
  for (let y = 2; y < 64; y += 5) g.fillRect(0, y, 64, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const useBundleMats = () => {
  const band = useFontTexture(bandTexture, 'Banderole');
  return useMemo(() => {
    const edge = edgeTexture();
    const top = std('#ece6cf', {roughness: 0.85});
    const side = new THREE.MeshStandardMaterial({map: edge, roughness: 0.9, flatShading: true});
    const bandM = band ? new THREE.MeshStandardMaterial({map: band, roughness: 0.7}) : std('#5b6470');
    // Box-Reihenfolge: +x, −x, +y, −y, +z, −z
    return {body: [side, side, top, top, side, side], band: bandM, inner: std('#d9d1b6', {roughness: 0.9})};
  }, [band]);
};

export const MoneyBundle = ({mats}: {mats?: ReturnType<typeof useBundleMats>}) => {
  const own = useBundleMats();
  const m = mats ?? own;
  const {w, h, d} = BUNDLE;
  return (
    <group>
      <mesh material={m.body} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* feiner Rahmen auf der Oberseite (ohne Motiv) */}
      <mesh material={m.inner} position={[0, h + 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.82, d * 0.7]} />
      </mesh>
      {/* Banderole */}
      <mesh material={m.band} position={[0, h / 2, 0]}>
        <boxGeometry args={[0.034, h + 0.004, d + 0.004]} />
      </mesh>
    </group>
  );
};

// ---------- Metallkoffer ----------
export const MCASE = {w: 0.46, h: 0.33, d: 0.13};
/** Bündel-Raster im Koffer (liegend): 2 Spalten × 4 Reihen × 2 Lagen */
const SLOTS = (() => {
  const out: [number, number, number][] = [];
  for (let layer = 0; layer < 2; layer++)
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 2; col++) out.push([(col - 0.5) * 0.19, 0.012 + layer * BUNDLE.h, 0.045 + row * 0.077]);
  return out;
})();

export const MoneyCase = ({tilt = 0, lid = 0, money = 1}: {tilt?: number; lid?: number; money?: number}) => {
  const m = useMemo(
    () => ({
      alu: std('#c3c8ce', {metalness: 0.75, roughness: 0.32}),
      aluDark: std('#8e959d', {metalness: 0.7, roughness: 0.35}),
      rib: std('#aeb4bb', {metalness: 0.75, roughness: 0.3}),
      lining: std('#2a2c33', {roughness: 0.95}),
      grip: std('#1f2125', {roughness: 0.5}),
      lock: std('#e1c66a', {metalness: 0.8, roughness: 0.25}),
    }),
    [],
  );
  const bm = useBundleMats();
  const {w, h, d} = MCASE;
  const half = d / 2;
  const k = clamp(tilt / 90);
  // Koffer wird im "liegenden" System gebaut: Schale y 0 … d/2, Deckel y d/2 … d, Länge z 0 (Scharnier) … h (Griff).
  // Stehend: um x drehen (−90° + tilt), damit der Griff oben ist.
  const rot = deg(-90 + 90 * k);
  const pos: [number, number, number] = [0, 0, (1 - k) * half - k * (h / 2) + (1 - k) * 0];
  const lidA = -deg(105) * clamp(lid);
  const nMoney = Math.round(SLOTS.length * clamp(money));
  return (
    <group position={pos}>
      <group rotation={[rot, 0, 0]} position={[0, 0, 0]}>
        <group position={[0, 0, 0]}>
          {/* Unterschale als Wanne: Boden + vier Wände, innen dunkel ausgeschlagen */}
          <mesh material={m.alu} position={[0, 0.005, h / 2]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.01, h]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={`wx${s}`} material={m.alu} position={[s * (w / 2 - 0.006), half / 2, h / 2]} castShadow>
              <boxGeometry args={[0.012, half, h]} />
            </mesh>
          ))}
          {[0, 1].map((s) => (
            <mesh key={`wz${s}`} material={m.alu} position={[0, half / 2, s ? h - 0.006 : 0.006]} castShadow>
              <boxGeometry args={[w, half, 0.012]} />
            </mesh>
          ))}
          <mesh material={m.lining} position={[0, 0.0105, h / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w - 0.024, h - 0.024]} />
          </mesh>
          {/* Geldbündel (nur sichtbar, wenn offen) */}
          {lid > 0.02 &&
            SLOTS.slice(0, nMoney).map((p, i) => (
              <group key={i} position={[p[0], p[1], p[2] + 0.012]} rotation={[0, (i % 3) * 0.02 - 0.02, 0]}>
                <MoneyBundle mats={bm} />
              </group>
            ))}
          {/* Rippen auf dem Boden (außen) */}
          {[-0.12, 0, 0.12].map((x) => (
            <mesh key={x} material={m.rib} position={[x, -0.003, h / 2]}>
              <boxGeometry args={[0.025, 0.008, h - 0.04]} />
            </mesh>
          ))}
          {/* Kantenschutz an den Ecken */}
          {[-1, 1].flatMap((sx) =>
            [0, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} material={m.aluDark} position={[sx * (w / 2 - 0.012), half, sz * h + (sz ? -0.012 : 0.012)]}>
                <boxGeometry args={[0.032, d + 0.006, 0.032]} />
              </mesh>
            )),
          )}
          {/* Griff an der Längsseite (z = h) + zwei Schlösser */}
          <group position={[0, half, h]}>
            {[-1, 1].map((s) => (
              <mesh key={s} material={m.grip} position={[s * 0.06, 0, 0.018]}>
                <boxGeometry args={[0.018, 0.026, 0.036]} />
              </mesh>
            ))}
            <mesh material={m.grip} position={[0, 0, 0.042]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={`l${s}`} material={m.lock} position={[s * 0.15, 0, 0.004]}>
                <boxGeometry args={[0.04, 0.03, 0.012]} />
              </mesh>
            ))}
          </group>
          {/* Deckel (Scharnier bei z = 0, y = half) */}
          <group position={[0, half, 0]} rotation={[lidA, 0, 0]}>
            <mesh material={m.alu} position={[0, half / 2, h / 2]} castShadow receiveShadow>
              <boxGeometry args={[w, half, h]} />
            </mesh>
            {lid > 0.02 && (
              <mesh material={m.lining} position={[0, -0.001, h / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w - 0.02, h - 0.02]} />
              </mesh>
            )}
            {[-0.12, 0, 0.12].map((x) => (
              <mesh key={x} material={m.rib} position={[x, half + 0.003, h / 2]}>
                <boxGeometry args={[0.025, 0.008, h - 0.04]} />
              </mesh>
            ))}
          </group>
          {/* Naht */}
          <mesh material={m.aluDark} position={[0, half, h / 2]}>
            <boxGeometry args={[w + 0.004, 0.006, h + 0.004]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ---------- Formular + Kugelschreiber ----------
const FORM_STEPS = 10;
const formTexture = (fill: number) => () => {
  const c = document.createElement('canvas');
  c.width = 420;
  c.height = 594;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbfaf6';
  g.fillRect(0, 0, 420, 594);
  g.fillStyle = '#25456b';
  g.fillRect(0, 0, 420, 78);
  g.fillStyle = '#ffffff';
  g.font = `800 52px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('FUNDANZEIGE', 210, 42);
  const fields = ['Name', 'Anschrift', 'Telefon', 'Fundort'];
  g.textAlign = 'left';
  fields.forEach((f, i) => {
    const y = 140 + i * 105;
    g.fillStyle = '#3a3f46';
    g.font = `700 30px ${T.font}`;
    g.fillText(f, 26, y);
    g.fillStyle = '#9aa0a8';
    g.fillRect(26, y + 50, 368, 3);
    // Handschrift-Kringel (blau), Feld für Feld
    const part = clamp(fill * fields.length - i);
    if (part > 0) {
      g.strokeStyle = '#1f4fd1';
      g.lineWidth = 4;
      g.lineCap = 'round';
      g.beginPath();
      const len = 330 * part * (i === 3 ? 0.7 : 1);
      for (let x = 0; x <= len; x += 4) {
        const yy = y + 34 + Math.sin(x * 0.21 + i) * 9 + Math.sin(x * 0.067 + i * 2) * 4;
        if (x === 0) g.moveTo(34 + x, yy);
        else g.lineTo(34 + x, yy);
      }
      g.stroke();
    }
  });
  // Unterschrift-Feld bleibt leer (keine echte Unterschrift)
  g.strokeStyle = '#26292e';
  g.lineWidth = 3;
  g.strokeRect(4, 4, 412, 586);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Textur, die sich mit einem Wert ändert (nach dem Laden der Schrift); alte Texturen werden aufgeräumt */
export const useFontReady = (key: string) => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender(`Schrift für ${key}`));
  const advance = useThree((st) => st.advance);
  useEffect(() => {
    document.fonts.load(`800 80px "Barlow Condensed"`).finally(() => {
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (!ready) return;
    advance(performance.now());
    continueRender(handle);
  }, [ready, advance, handle]);
  return ready;
};
const useStepTexture = (ready: boolean, draw: () => THREE.Texture, key: string) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tex = useMemo(() => (ready ? draw() : null), [ready, key]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
};

export const Pen = () => {
  const m = useMemo(() => ({body: std('#1f4fd1', {roughness: 0.4}), tip: std('#d9dde2', {metalness: 0.6}), clip: std('#e9edf2', {metalness: 0.6})}), []);
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh material={m.body} castShadow>
        <cylinderGeometry args={[0.0055, 0.0055, 0.13, 8]} />
      </mesh>
      <mesh material={m.tip} position={[0, -0.072, 0]}>
        <coneGeometry args={[0.0055, 0.016, 8]} />
      </mesh>
      <mesh material={m.clip} position={[0.006, 0.04, 0]}>
        <boxGeometry args={[0.003, 0.04, 0.004]} />
      </mesh>
    </group>
  );
};

export const PaperForm = ({fill = 0, pen = 0, size = 0}: {fill?: number; pen?: number; size?: number}) => {
  const ready = useFontReady('Formular');
  const step = Math.round(clamp(fill) * FORM_STEPS);
  const tex = useStepTexture(ready, formTexture(step / FORM_STEPS), `Formular ${step}`);
  const mat = useMemo(
    () =>
      tex
        ? new THREE.MeshStandardMaterial({map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.35, roughness: 0.85})
        : new THREE.MeshStandardMaterial({color: '#fbfaf6'}),
    [tex],
  );
  const s = 1 + size;
  return (
    <group scale={s}>
      <mesh material={mat} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.21, 0.297]} />
      </mesh>
      {pen > 0.5 && (
        <group position={[0.14, 0.006, 0.02]} rotation={[0, 0.4, 0]}>
          <group rotation={[0, Math.PI / 2, 0]}>
            <Pen />
          </group>
        </group>
      )}
    </group>
  );
};

// ---------- Taschenrechner ----------
const fmtEuro = (v: number) => `${Math.round(v).toLocaleString('de-DE')} €`;
const calcTexture = (text: string) => () => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 200;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b9d3a8';
  g.fillRect(0, 0, 512, 200);
  g.fillStyle = 'rgba(40,60,30,0.08)';
  for (let x = 0; x < 512; x += 4) g.fillRect(x, 0, 1, 200);
  g.fillStyle = '#18241a';
  g.font = `800 132px ${T.font}`;
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  g.fillText(text, 490, 108);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

export const Calculator = ({text = '30.010 €', fill = 1, tilt = 0, size = 0}: {text?: string; fill?: number; tilt?: number; size?: number}) => {
  const ready = useFontReady('Taschenrechner');
  const target = Number(text.replace(/[^0-9]/g, '')) || 0;
  const shown = fill >= 0.999 || !target ? text : fmtEuro(target * clamp(fill) ** 0.6);
  const tex = useStepTexture(ready, calcTexture(shown), `Rechner ${shown}`);
  const m = useMemo(
    () => ({
      body: std('#2d3138', {roughness: 0.5}),
      rim: std('#454b54', {roughness: 0.5}),
      key: std('#e7e9ec', {roughness: 0.5}),
      keyDark: std('#5d6570', {roughness: 0.5}),
      keyOrange: std(T.yellow, {roughness: 0.5}),
    }),
    [],
  );
  const disp = useMemo(
    () => (tex ? new THREE.MeshStandardMaterial({map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.55}) : std('#b9d3a8')),
    [tex],
  );
  const W = 0.11;
  const H = 0.17;
  const s = 1 + size;
  return (
    <group scale={s}>
      <group rotation={[-deg(tilt), 0, 0]}>
        <mesh material={m.body} position={[0, H / 2, 0]} castShadow>
          <boxGeometry args={[W, H, 0.018]} />
        </mesh>
        <mesh material={m.rim} position={[0, H - 0.035, 0.0095]}>
          <boxGeometry args={[W - 0.012, 0.046, 0.002]} />
        </mesh>
        <mesh material={disp} position={[0, H - 0.035, 0.0108]}>
          <planeGeometry args={[W - 0.018, 0.038]} />
        </mesh>
        {Array.from({length: 5}, (_, r) =>
          Array.from({length: 4}, (_, c) => (
            <mesh key={`${r}-${c}`} material={c === 3 ? m.keyOrange : r === 0 ? m.keyDark : m.key} position={[(c - 1.5) * 0.024, 0.017 + r * 0.019, 0.0105]}>
              <boxGeometry args={[0.018, 0.013, 0.004]} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
};

// ---------- Schilder, die zur Kamera schauen (Sprites) ----------
const calendarTexture = (text: string) => () => {
  const c = document.createElement('canvas');
  c.width = 420;
  c.height = 460;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(14, 18, 400, 438);
  g.fillStyle = '#fbfaf6';
  g.fillRect(6, 10, 400, 438);
  g.fillStyle = '#d7362b';
  g.fillRect(6, 10, 400, 110);
  // Spiralringe
  g.fillStyle = '#3b3f45';
  for (let i = 0; i < 7; i++) g.fillRect(40 + i * 54, 0, 12, 36);
  g.fillStyle = '#ffffff';
  g.font = `800 64px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('KALENDER', 206, 72);
  const [num, ...rest] = text.split(' ');
  g.fillStyle = '#1d2026';
  g.font = `800 210px ${T.font}`;
  g.fillText(num, 206, 255);
  g.font = `800 78px ${T.font}`;
  g.fillText(rest.join(' '), 206, 390);
  const t = new THREE.CanvasTexture(c) as THREE.CanvasTexture & {aspect: number};
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.aspect = 420 / 460;
  return t;
};

const paragraphTexture = (text: string) => () => {
  const c = document.createElement('canvas');
  c.width = 520;
  c.height = 300;
  const g = c.getContext('2d')!;
  const r = 140;
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath();
  g.roundRect(14, 16, 500, 280, r);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.roundRect(6, 6, 500, 280, r);
  g.fill();
  g.fillStyle = T.red;
  g.beginPath();
  g.roundRect(20, 20, 472, 252, r - 14);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = `800 190px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 156);
  const t = new THREE.CanvasTexture(c) as THREE.CanvasTexture & {aspect: number};
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.aspect = 520 / 300;
  return t;
};

const PopSprite = ({draw, k, time, visible, height}: {draw: () => THREE.Texture; k: string; time: number; visible: boolean; height: number}) => {
  const tex = useFontTexture(draw, k);
  const mat = useMemo(() => (tex ? new THREE.SpriteMaterial({map: tex, depthTest: false, transparent: true}) : null), [tex]);
  if (!visible || !mat || !tex) return null;
  const s = spring({frame: time * 30, fps: 30, config: {damping: 11, stiffness: 160}});
  const aspect = (tex as THREE.CanvasTexture & {aspect: number}).aspect;
  const h = height * s;
  return <sprite material={mat} scale={[h * aspect, h, 1]} center={new THREE.Vector2(0.5, 0)} renderOrder={40} />;
};

export const CalendarSheet = ({text = '6 Monate', time, visible, size = 0}: {text?: string; time: number; visible: boolean; size?: number}) => (
  <PopSprite draw={calendarTexture(text)} k={`Kalenderblatt ${text}`} time={time} visible={visible} height={0.5 * (1 + size)} />
);

export const ParagraphBadge = ({text = '§ 246', time, visible, size = 0}: {text?: string; time: number; visible: boolean; size?: number}) => (
  <PopSprite draw={paragraphTexture(text)} k={`Paragraf ${text}`} time={time} visible={visible} height={0.36 * (1 + size)} />
);
