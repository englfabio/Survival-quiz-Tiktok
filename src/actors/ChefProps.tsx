import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {canvasTex, TextPlane} from './WgProps';
import {BoxingGlove} from './ToothProps';

/**
 * Objekte für das Spezial "Chef" (alle wiederverwendbar, comichaft, OHNE Logos/Marken-Designs):
 *  - BreakWall ("buerowand"): Stück Bürowand (Breite 4,4 m, Höhe 3,6 m, 0,15 m dick), Ursprung = Boden-Mitte, Wand entlang x.
 *      Bewegung "park" = heil, "burst" = bricht auf: großes Loch, Brocken fliegen nach local +z (face 0 → Welt −z), Staubwölkchen.
 *      Zeit seit Beginn von "burst" steuert alles (ca. 1,6 s bis alles liegt).
 *  - Copier ("kopierer"): großer Bürokopierer (hellgrau, Bedienfeld mit blauem Display + grüner Taste, Papierfächer),
 *      Front +z. Wert "tilt" = kippt zur Seite (Grad, + = nach local −x), Bewegung "burst" = Papierblätter fliegen heraus.
 *  - ReverseCard ("reversekarte"): rote Spielkarte mit zwei weißen gebogenen Pfeilen, die im Kreis zeigen (Reverse-Meme),
 *      OHNE Schrift, OHNE weißes Oval, OHNE Logo. Liegt flach (Ursprung = Mitte, Bild nach +y). "size" = größer.
 *      Gleiches Motiv in der Hand: Dummy-Gegenstand 'revcard'.
 *  - Swirl ("wirbel"): bunter Comic-Wirbel (Spiralbänder + Funken), dreht sich; "fill" 0 … 1 = Stärke (Größe/Deckkraft), "size".
 *  - BoxBell ("boxglocke"): Boxring-Glocke als Symbol (goldene Glocke auf dunkler Platte, Klingel-Linien), schaut zur Kamera.
 *      Bewegung "show" = ploppt auf + wackelt (klingelt), sonst unsichtbar.
 *  - GlovePair ("boxhandschuhe"): Paar Boxhandschuhe in BLAU (für den Chef), an der Schnürung verbunden. Ursprung = Mitte.
 *  - FileStack ("aktenstapel"): Stapel aus Papier + bunten Ordnern = "Aufgaben". "fill" 0 … 1 = Höhe (bis ca. 1,3 m),
 *      "mark" = weitere Stapel daneben (0 … 2), "size" = Grundfläche.
 *  - SweatDrops: Schweißtropfen am Kopf (Dummy-Wert "sweat" 0 … 1) – wird in actors/index.tsx an Figuren mit Dummy-Körper gehängt.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

// ---------------------------------------------------------------------------------------------
// Bürowand mit Durchbruch
// ---------------------------------------------------------------------------------------------
export const BREAKWALL = {w: 4.4, h: 3.6, t: 0.15};
const CHUNKS = 46;
export const BreakWall = ({burst = -1, color = '#e9e6df'}: {burst?: number; color?: string}) => {
  const {w, h, t} = BREAKWALL;
  const m = useMemo(
    () => ({
      wall: std(color, {roughness: 0.95}),
      inner: std('#c9c2b4', {roughness: 1}),
      base: std('#f2efe9'),
      dust: new THREE.MeshStandardMaterial({color: '#e8e3d8', transparent: true, opacity: 0.4, roughness: 1, depthWrite: false}),
    }),
    [color],
  );
  const chunks = useMemo(() => {
    const r = rng(77);
    return Array.from({length: CHUNKS}, () => {
      const x = (r() - 0.5) * (w - 1.0);
      const y = 0.2 + r() * (h - 0.75);
      const s = 0.16 + r() * 0.32;
      return {
        x,
        y,
        s: [s * (0.8 + r() * 0.6), s * (0.6 + r() * 0.5), t * (0.8 + r() * 0.4)] as [number, number, number],
        vx: x * 0.35 + (r() - 0.5) * 1.2,
        vy: 0.6 + r() * 1.6,
        vz: 2.2 + r() * 2.6,
        spin: [(r() - 0.5) * 9, (r() - 0.5) * 9, (r() - 0.5) * 9] as [number, number, number],
        shade: r(),
      };
    });
  }, [w, h, t]);
  if (burst < 0) {
    return (
      <group>
        <mesh material={m.wall} position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, t]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.base} position={[0, 0.05, s * (t / 2 + 0.01)]}>
            <boxGeometry args={[w, 0.1, 0.02]} />
          </mesh>
        ))}
      </group>
    );
  }
  // Rahmen um das Loch: links/rechts schmale Reste, oben ein Sturz (Loch fast über die ganze Breite, zackige Kanten)
  const holeW = w - 0.5;
  const holeH = h - 0.45;
  const jag = (i: number) => 0.08 + ((i * 37) % 11) / 40;
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.wall} position={[s * (w / 2 - 0.125), h / 2, 0]} castShadow>
          <boxGeometry args={[0.25, h, t]} />
        </mesh>
      ))}
      <mesh material={m.wall} position={[0, h - 0.225, 0]} castShadow>
        <boxGeometry args={[w, 0.45, t]} />
      </mesh>
      {/* zackige Bruchkanten */}
      {Array.from({length: 12}, (_, i) => {
        const x = -holeW / 2 + ((i + 0.5) / 12) * holeW;
        return (
          <mesh key={`t${i}`} material={i % 2 ? m.inner : m.wall} position={[x, holeH - jag(i) / 2, 0]} rotation={[0, 0, (i % 3) * 0.3 - 0.3]}>
            <boxGeometry args={[holeW / 12 + 0.05, jag(i), t * 0.95]} />
          </mesh>
        );
      })}
      {[-1, 1].map((s) =>
        Array.from({length: 7}, (_, i) => (
          <mesh key={`s${s}${i}`} material={i % 2 ? m.inner : m.wall} position={[s * (holeW / 2 - jag(i + s) / 2), 0.3 + i * 0.45, 0]} rotation={[0, 0, i * 0.4]}>
            <boxGeometry args={[jag(i + s) * 1.3, 0.5, t * 0.95]} />
          </mesh>
        )),
      )}
      {/* Brocken fliegen nach +z, fallen auf den Boden und bleiben liegen */}
      {chunks.map((c, i) => {
        const tt = Math.max(0, burst - (Math.abs(c.x) / w) * 0.12);
        let x = c.x + c.vx * tt;
        let y = c.y + c.vy * tt - 4.9 * tt * tt;
        let z = c.vz * tt;
        let rot: [number, number, number] = [c.spin[0] * tt, c.spin[1] * tt, c.spin[2] * tt];
        const half = c.s[1] / 2;
        if (y < half) {
          // gelandet: Zeitpunkt der Landung suchen und dort liegen bleiben (rutscht kurz nach)
          const a = -4.9;
          const disc = c.vy * c.vy - 4 * a * (c.y - half);
          const tl = (-c.vy - Math.sqrt(disc)) / (2 * a);
          const slide = Math.min(0.25, tt - tl);
          x = c.x + c.vx * tl + c.vx * 0.4 * slide;
          z = c.vz * tl + c.vz * 0.4 * slide;
          y = half;
          rot = [0, c.spin[1] * tl, 0];
        }
        return (
          <mesh key={i} material={c.shade > 0.4 ? m.wall : m.inner} position={[x, y, z]} rotation={rot} castShadow>
            <boxGeometry args={c.s} />
          </mesh>
        );
      })}
      {/* Staubwölkchen (comichaft, hell, verschwinden wieder) */}
      {Array.from({length: 10}, (_, i) => {
        const k = clamp((burst - 0.05 * i) / 1.6);
        if (k <= 0 || k >= 1) return null;
        const r = rng(200 + i);
        const x = (r() - 0.5) * (holeW - 0.4);
        return (
          <mesh key={`d${i}`} material={m.dust} position={[x, 0.4 + r() * 2.2 + k * 0.6, 0.3 + k * (1.0 + r())]} scale={(0.12 + 0.38 * easeInOut(k)) * (1 - k * 0.6)}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Kopierer
// ---------------------------------------------------------------------------------------------
export const COPIER = {w: 1.05, d: 0.7, h: 1.02};
export const Copier = ({tilt = 0, burst = -1}: {tilt?: number; burst?: number}) => {
  const {w, d, h} = COPIER;
  const m = useMemo(
    () => ({
      body: std('#dfe2e4', {roughness: 0.5}),
      dark: std('#3a3f46'),
      mid: std('#9aa2aa'),
      screen: new THREE.MeshBasicMaterial({color: '#4fa8ff'}),
      green: new THREE.MeshBasicMaterial({color: '#3fd26a'}),
      paper: std('#fbfbf7', {roughness: 0.9, side: THREE.DoubleSide}),
    }),
    [],
  );
  const a = THREE.MathUtils.degToRad(tilt);
  // kippt um die untere Kante auf der −x-Seite (tilt +) bzw. +x-Seite (tilt −)
  const px = tilt >= 0 ? -w / 2 : w / 2;
  const sheets = useMemo(() => {
    const r = rng(55);
    return Array.from({length: 14}, () => ({vx: (r() - 0.5) * 2.2, vy: 1.6 + r() * 1.8, vz: 0.4 + r() * 1.4, sp: (r() - 0.5) * 6, ph: r() * 6}));
  }, []);
  return (
    <group>
      <group position={[px, 0, 0]} rotation={[0, 0, a]}>
        <group position={[-px, 0, 0]}>
          {/* Unterschrank mit Papierfächern */}
          <mesh material={m.body} position={[0, h * 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, h * 0.84, d]} />
          </mesh>
          {[0.16, 0.38, 0.6].map((y) => (
            <group key={y}>
              <mesh material={m.mid} position={[0, y, d / 2 + 0.005]}>
                <boxGeometry args={[w - 0.1, 0.012, 0.01]} />
              </mesh>
              <mesh material={m.dark} position={[0, y + 0.1, d / 2 + 0.012]}>
                <boxGeometry args={[0.22, 0.03, 0.02]} />
              </mesh>
            </group>
          ))}
          {/* Rollen */}
          {[-1, 1].map((sx) =>
            [-1, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} material={m.dark} position={[sx * (w / 2 - 0.08), 0.03, sz * (d / 2 - 0.08)]}>
                <sphereGeometry args={[0.035, 8, 6]} />
              </mesh>
            )),
          )}
          {/* Oberteil + Deckel */}
          <mesh material={m.body} position={[0, h * 0.84 + 0.08, -0.03]} castShadow>
            <boxGeometry args={[w, 0.16, d - 0.06]} />
          </mesh>
          <mesh material={m.dark} position={[0, h + 0.02, -0.04]} castShadow>
            <boxGeometry args={[w - 0.06, 0.04, d - 0.12]} />
          </mesh>
          {/* Bedienfeld vorn rechts */}
          <group position={[w / 2 - 0.22, h - 0.03, d / 2 - 0.08]} rotation={[-0.5, 0, 0]}>
            <mesh material={m.dark}>
              <boxGeometry args={[0.36, 0.03, 0.18]} />
            </mesh>
            <mesh material={m.screen} position={[-0.05, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.16, 0.1]} />
            </mesh>
            <mesh material={m.green} position={[0.11, 0.022, 0.02]}>
              <cylinderGeometry args={[0.025, 0.025, 0.015, 12]} />
            </mesh>
          </group>
          {/* Ausgabefach links mit Papier */}
          <mesh material={m.mid} position={[-w / 2 - 0.12, h * 0.7, 0]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.26, 0.02, 0.36]} />
          </mesh>
          <mesh material={m.paper} position={[-w / 2 - 0.12, h * 0.7 + 0.025, 0]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.21, 0.025, 0.3]} />
          </mesh>
        </group>
      </group>
      {/* Papierblätter flattern heraus */}
      {burst >= 0 &&
        sheets.map((s, i) => {
          const tt = Math.max(0, burst - i * 0.04);
          const fall = Math.max(0, tt - 0.45);
          const y = Math.max(0.01, h + s.vy * Math.min(tt, 0.45) - 0.9 * fall * fall * 1.2 - 0.35 * fall);
          const x = s.vx * tt * 0.7 + Math.sin(tt * 4 + s.ph) * 0.12;
          const z = s.vz * tt * 0.6;
          const flat = y <= 0.011;
          return (
            <mesh key={i} material={m.paper} position={[x, y, z]} rotation={flat ? [-Math.PI / 2, 0, s.ph] : [Math.sin(tt * 5 + s.ph) * 0.9, s.sp * tt, Math.cos(tt * 4 + s.ph) * 0.7]}>
              <planeGeometry args={[0.21, 0.297]} />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Reverse-Karte (ohne Schrift, ohne Oval, ohne Logo)
// ---------------------------------------------------------------------------------------------
const arrowArc = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, a0: number, a1: number, wLine: number, color: string) => {
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = wLine;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(cx, cy, r, a0, a1, false);
  g.stroke();
  // Pfeilspitze am Ende (Richtung im Uhrzeigersinn)
  const ex = cx + Math.cos(a1) * r;
  const ey = cy + Math.sin(a1) * r;
  const tx = -Math.sin(a1);
  const ty = Math.cos(a1);
  const nx = Math.cos(a1);
  const ny = Math.sin(a1);
  const L = wLine * 1.6;
  const W = wLine * 1.25;
  g.beginPath();
  g.moveTo(ex + tx * L, ey + ty * L);
  g.lineTo(ex + nx * W, ey + ny * W);
  g.lineTo(ex - nx * W, ey - ny * W);
  g.closePath();
  g.fill();
};
const reverseTex = canvasTex(360, 540, (g) => {
  const W = 360;
  const H = 540;
  const rr = 34;
  const round = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  g.clearRect(0, 0, W, H);
  // Kartenrand dunkelrot, Fläche kräftig rot mit leichtem Verlauf
  g.fillStyle = '#8f1410';
  round(0, 0, W, H, rr);
  g.fill();
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#f03a2e');
  grad.addColorStop(1, '#c81e17');
  g.fillStyle = grad;
  round(14, 14, W - 28, H - 28, rr - 10);
  g.fill();
  // zwei große, gebogene Pfeile im Kreis (schräg gestellt wie im Meme)
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-0.5);
  arrowArc(g, 0, 0, 92, Math.PI * 0.12, Math.PI * 0.82, 30, '#ffffff');
  arrowArc(g, 0, 0, 92, Math.PI * 1.12, Math.PI * 1.82, 30, '#ffffff');
  g.restore();
  // kleine Pfeilpaare in zwei Ecken
  for (const [x, y] of [
    [62, 70],
    [W - 62, H - 70],
  ]) {
    g.save();
    g.translate(x, y);
    g.rotate(-0.5);
    arrowArc(g, 0, 0, 22, Math.PI * 0.15, Math.PI * 0.8, 8, '#ffffff');
    arrowArc(g, 0, 0, 22, Math.PI * 1.15, Math.PI * 1.8, 8, '#ffffff');
    g.restore();
  }
});
export const CARD = {w: 0.24, h: 0.36};
/** Karte stehend (Bild nach +z) – für die Hand */
export const ReverseCardFace = ({s = 1}: {s?: number}) => {
  const back = useMemo(() => std('#a81a14'), []);
  return (
    <group scale={s}>
      <mesh material={back} position={[0, 0, -0.002]}>
        <boxGeometry args={[CARD.w * 0.97, CARD.h * 0.97, 0.003]} />
      </mesh>
      <TextPlane draw={reverseTex} k="Reverse-Karte" w={CARD.w} h={CARD.h} glow={0.35} />
    </group>
  );
};
/** Karte flach liegend (Bild nach +y) */
export const ReverseCard = ({size = 0}: {size?: number}) => (
  <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
    <ReverseCardFace s={1 + size} />
  </group>
);

// ---------------------------------------------------------------------------------------------
// Wirbel
// ---------------------------------------------------------------------------------------------
const SWIRL_COLS = ['#ffd21a', '#ff5a3c', '#3fc4ff', '#b06bff', '#ffffff'];
export const Swirl = ({amount = 0, time = 0, size = 0}: {amount?: number; time?: number; size?: number}) => {
  const mats = useMemo(
    () => SWIRL_COLS.map((c) => new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false})),
    [],
  );
  if (amount < 0.01) return null;
  mats.forEach((m) => (m.opacity = 0.85 * clamp(amount * 1.5)));
  const s = (0.4 + 0.9 * amount) * (1 + size);
  return (
    <group scale={s}>
      {Array.from({length: 5}, (_, i) => {
        const a = time * (7 + i * 0.6) + (i * Math.PI * 2) / 5;
        return (
          <group key={i} rotation={[0, a, 0]} position={[0, 0.25 + i * 0.32, 0]}>
            <mesh material={mats[i % mats.length]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.55 + 0.18 * Math.sin(i * 1.7), 0.035, 6, 28, Math.PI * 1.25]} />
            </mesh>
          </group>
        );
      })}
      {/* Funken */}
      {Array.from({length: 16}, (_, i) => {
        const a = time * 9 + i * 0.9;
        const r = 0.45 + (i % 4) * 0.18;
        return (
          <mesh key={`f${i}`} material={mats[(i + 2) % mats.length]} position={[Math.cos(a) * r, 0.2 + ((i * 0.37 + time * 1.4) % 1.6), Math.sin(a) * r]}>
            <octahedronGeometry args={[0.045, 0]} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Boxring-Glocke (Symbol)
// ---------------------------------------------------------------------------------------------
export const BoxBell = ({time = 0, visible = false, size = 0}: {time?: number; visible?: boolean; size?: number}) => {
  const m = useMemo(
    () => ({
      gold: new THREE.MeshStandardMaterial({color: '#f2c230', metalness: 0.6, roughness: 0.25, emissive: '#5a4200', emissiveIntensity: 0.5}),
      plate: new THREE.MeshStandardMaterial({color: '#23262b', roughness: 0.5}),
      rim: new THREE.MeshBasicMaterial({color: '#ffd21a'}),
      line: new THREE.MeshBasicMaterial({color: '#ffd21a'}),
      knob: new THREE.MeshStandardMaterial({color: '#8a8f96', metalness: 0.8, roughness: 0.3}),
    }),
    [],
  );
  if (!visible) return null;
  const pop = Math.min(1, time / 0.18) * (1 + 0.18 * Math.sin(Math.min(1, time / 0.35) * Math.PI));
  const wob = Math.sin(time * 38) * 0.09 * Math.max(0, 1 - time / 1.6);
  const s = pop * (1 + size);
  return (
    <group scale={s}>
      <mesh material={m.rim} position={[0, 0, -0.03]}>
        <circleGeometry args={[0.34, 32]} />
      </mesh>
      <mesh material={m.plate} position={[0, 0, -0.02]}>
        <circleGeometry args={[0.31, 32]} />
      </mesh>
      <group rotation={[0, 0, wob]}>
        {/* Glockenschale (halbe Kugel, Öffnung nach unten) */}
        <mesh material={m.gold} position={[0, -0.02, 0.02]} scale={[1, 0.8, 0.45]}>
          <sphereGeometry args={[0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh material={m.knob} position={[0, 0.16, 0.02]}>
          <sphereGeometry args={[0.035, 10, 8]} />
        </mesh>
        <mesh material={m.knob} position={[0.13, -0.1, 0.08]}>
          <sphereGeometry args={[0.03, 10, 8]} />
        </mesh>
      </group>
      {/* Klingel-Linien */}
      {[-1, 1].map((sd) =>
        [0, 1, 2].map((i) => {
          const k = ((time * 2.2 + i / 3) % 1) * Math.max(0, 1 - time / 2.2);
          return (
            <mesh key={`${sd}${i}`} material={m.line} position={[sd * (0.27 + 0.05 * i), 0.02 + (i - 1) * 0.09, 0.03]} rotation={[0, 0, sd * (0.5 - 0.5 * i)]} scale={0.6 + 0.6 * k}>
              <boxGeometry args={[0.09, 0.022, 0.01]} />
            </mesh>
          );
        }),
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Paar Boxhandschuhe (blau, für den Chef)
// ---------------------------------------------------------------------------------------------
export const CHEF_GLOVE = '#2f6fe0';
export const GlovePair = () => (
  <group>
    <group position={[-0.09, 0.08, 0]} rotation={[0, 0, 1.45]}>
      <BoxingGlove s={1.1} color={CHEF_GLOVE} />
    </group>
    <group position={[0.09, 0.08, 0.02]} rotation={[0, 0.4, -1.5]}>
      <BoxingGlove s={1.1} color={CHEF_GLOVE} />
    </group>
    {/* Schnürung verbindet beide */}
    <mesh position={[0, 0.1, -0.02]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.006, 0.006, 0.12, 5]} />
      <meshStandardMaterial color="#f4f4f0" />
    </mesh>
  </group>
);

// ---------------------------------------------------------------------------------------------
// Aktenstapel ("Aufgaben")
// ---------------------------------------------------------------------------------------------
const FOLDER_COLS = ['#2f6fcf', '#d23a2c', '#e3b94b', '#3f9a4a', '#7d4f8f'];
export const FileStack = ({fill = 0, piles = 0, size = 0}: {fill?: number; piles?: number; size?: number}) => {
  const mats = useMemo(() => ({paper: std('#f7f5ef', {roughness: 0.9}), cols: FOLDER_COLS.map((c) => std(c, {roughness: 0.55}))}), []);
  const items = useMemo(() => {
    const r = rng(9);
    return Array.from({length: 120}, () => ({th: 0.025 + r() * 0.03, folder: r() < 0.38, col: Math.floor(r() * 5), dx: (r() - 0.5) * 0.05, dz: (r() - 0.5) * 0.05, rot: (r() - 0.5) * 0.35}));
  }, []);
  const n = Math.round(clamp(fill) * 36);
  const nPiles = 1 + Math.round(clamp(piles, 0, 2));
  const s = 1 + size;
  return (
    <group scale={[s, 1, s]}>
      {Array.from({length: nPiles}, (_, pIdx) => {
        let y = 0;
        const cnt = pIdx === 0 ? n : Math.max(0, n - 6 - pIdx * 5);
        const off = pIdx === 0 ? 0 : pIdx === 1 ? -0.38 : 0.38;
        return (
          <group key={pIdx} position={[off, 0, pIdx === 0 ? 0 : 0.04]}>
            {items.slice(pIdx * 40, pIdx * 40 + cnt).map((it, i) => {
              const yy = y + it.th / 2;
              y += it.th;
              return (
                <mesh key={i} material={it.folder ? mats.cols[it.col] : mats.paper} position={[it.dx, yy, it.dz]} rotation={[0, it.rot, 0]} castShadow>
                  <boxGeometry args={[it.folder ? 0.33 : 0.3, it.th, it.folder ? 0.25 : 0.22]} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Schweißtropfen (Comic) – Ursprung = Kopfmitte
// ---------------------------------------------------------------------------------------------
export const SweatDrops = ({amount = 0, time = 0}: {amount?: number; time?: number}) => {
  const m = useMemo(() => new THREE.MeshStandardMaterial({color: '#7fd0ff', emissive: '#2a8fd6', emissiveIntensity: 0.5, roughness: 0.1, transparent: true, opacity: 0.95}), []);
  if (amount < 0.02) return null;
  const n = Math.round(2 + 3 * clamp(amount));
  return (
    <group>
      {Array.from({length: n}, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const ph = ((time * (1.1 + 0.2 * i) + i * 0.37) % 1);
        const x = side * (0.17 + 0.03 * (i % 3));
        const y = 0.12 - 0.05 * i - ph * 0.5;
        const sc = clamp(amount) * (1 - ph * 0.6);
        return (
          <group key={i} position={[x + side * ph * 0.08, y, 0.06 + 0.02 * i]} scale={sc}>
            <mesh material={m} scale={[0.6, 1, 0.6]}>
              <sphereGeometry args={[0.035, 10, 8]} />
            </mesh>
            <mesh material={m} position={[0, 0.04, 0]}>
              <coneGeometry args={[0.02, 0.05, 8]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
