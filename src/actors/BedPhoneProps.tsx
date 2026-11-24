import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, rng} from '../lib/anim';
import {canvasTex, fitText, TextPlane} from './WgProps';
import {ReverseCard} from './ChefProps';

/**
 * Spezial „Handy im Gesicht“ – alles comichaft und harmlos, Low-Poly-Cartoon-Stil, KEINE Marken/Logos.
 *
 *  - BedPhone ("betthandy"): markenloses Smartphone 0,1 × 0,2 × 0,013 m (rote Hülle) (comichaft etwas groß). Ursprung = MITTE des Handys.
 *      Grundlage: liegt flach, Bildschirm nach oben (+y), Oberkante zeigt nach −z. Drehung über `tilt` (Grad um x, 180 = Bildschirm nach unten)
 *      und `turn` (Grad um z). `size` = größer (7 ≈ Matratzengröße 1,6 × 0,8 m). Bildschirm über Feld `text`:
 *        'feed'  = bunte Beiträge (erfundene App, kein Logo), 'appsN' = Startbildschirm mit N App-Symbolen (0 … 20),
 *        'photos' = Fotogalerie, 'clean' = leer mit grünem Haken, 'sleep' = schlafendes Handy-Gesicht mit „Zzz“,
 *        'oops' = zusammengekniffenes Handy-Gesicht (nach dem Plumps), 'off' = dunkel.
 *      Werte: `glow` = Bildschirm leuchtet (+ blaues Licht aufs Gesicht), `thin` 0 … 1 = wird immer dünner und heller (federleicht),
 *      `rumble` = zittert, `squish` = wird kurz platt gedrückt (Plumps).
 *  - ReverseBurst ("reverseeffekt"): leuchtender Cartoon-Effekt „Rollentausch“: Strahlenkranz in vier Farben, Lichtring, große rote
 *      Karte mit zwei Pfeilen (ReverseCard, ohne Logo/Schrift) dreht sich. Schaut immer zur Kamera. `fill` 0 → 1 = ploppt auf, `size`.
 *  - DizzyStars ("sternchen"): fünf gelbe Comic-Sternchen kreisen (z. B. um den Kopf), `fill` = sichtbar/Größe, `size`.
 *  - ImpactStar ("klatschstern"): kurzer weiß-gelber Comic-Zackenstern beim Aufprall (ohne Text), `fill` 0 … 1, schaut zur Kamera.
 *  - TwinkleStar ("funkelstern"): Funkeln am Himmel, wo etwas verschwindet („Ping“), `fill` 0 … 1 = aufblitzen, schaut zur Kamera.
 *  - AppStream ("appregen", Bewegung `burst`): App-Symbole (bzw. Foto-Kacheln bei `mark` 1) fliegen laufend nach oben weg und verblassen.
 *  - Duvet ("bettdecke"): dicke Bettdecke (0,96 m breit) mit Mond-/Sternmuster und umgeschlagener Kante. Ursprung = Mitte des Fußendes
 *      auf der Unterlage; die Decke reicht nach +x bis `fill` (0 … 1 → 0,35 … 1,45 m). `squish` = wird platt gedrückt.
 *  - Pillow ("kissen"): Kopfkissen 0,38 × 0,13 × 0,7 m (Ursprung = Unterseite Mitte), `squish` = Delle.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

export const BED_PHONE = {w: 0.1, h: 0.2, t: 0.013};

const APP_COLORS = ['#ff5a5f', '#ffb020', '#4cc38a', '#3d8bfd', '#a66cff', '#ff7ab8', '#20c4d8', '#f2d43a', '#ff8a3d', '#6bd36b'];

const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
};
/** einfaches Symbol in einer App-Kachel (Herz, Kreis, Stern, Welle, Note …) – frei erfunden */
const glyph = (g: CanvasRenderingContext2D, k: number, x: number, y: number, s: number) => {
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ffffff';
  g.lineWidth = s * 0.14;
  g.lineCap = 'round';
  switch (k % 6) {
    case 0:
      g.beginPath();
      g.arc(x, y, s * 0.3, 0, Math.PI * 2);
      g.fill();
      break;
    case 1:
      g.beginPath();
      g.moveTo(x, y + s * 0.3);
      g.bezierCurveTo(x - s * 0.55, y - s * 0.1, x - s * 0.2, y - s * 0.45, x, y - s * 0.15);
      g.bezierCurveTo(x + s * 0.2, y - s * 0.45, x + s * 0.55, y - s * 0.1, x, y + s * 0.3);
      g.fill();
      break;
    case 2:
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? s * 0.14 : s * 0.34;
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.fill();
      break;
    case 3:
      g.beginPath();
      g.moveTo(x - s * 0.32, y);
      g.quadraticCurveTo(x - s * 0.16, y - s * 0.3, x, y);
      g.quadraticCurveTo(x + s * 0.16, y + s * 0.3, x + s * 0.32, y);
      g.stroke();
      break;
    case 4:
      g.fillRect(x - s * 0.28, y - s * 0.2, s * 0.56, s * 0.4);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath();
      g.arc(x, y, s * 0.12, 0, Math.PI * 2);
      g.fill();
      break;
    default:
      g.beginPath();
      g.arc(x - s * 0.08, y + s * 0.2, s * 0.12, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x + s * 0.02, y - s * 0.3, s * 0.08, s * 0.5);
  }
};
const photo = (g: CanvasRenderingContext2D, k: number, x: number, y: number, w: number, h: number) => {
  const r = rng(k * 13 + 5);
  const sky = ['#8fd0ff', '#ffc38a', '#b9a6ff', '#9be3c9'][k % 4];
  g.fillStyle = sky;
  g.fillRect(x, y, w, h);
  g.fillStyle = '#ffe36b';
  g.beginPath();
  g.arc(x + w * (0.25 + r() * 0.5), y + h * 0.3, w * 0.12, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = ['#4f9a5a', '#5a7fb0', '#7b6a5a', '#3f8f7f'][k % 4];
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x + w * 0.35, y + h * (0.45 + r() * 0.2));
  g.lineTo(x + w * 0.6, y + h * 0.75);
  g.lineTo(x + w * 0.8, y + h * (0.5 + r() * 0.2));
  g.lineTo(x + w, y + h);
  g.fill();
};
const face = (g: CanvasRenderingContext2D, W: number, H: number, kind: 'sleep' | 'oops') => {
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, kind === 'sleep' ? '#28346a' : '#3d4a8a');
  grad.addColorStop(1, kind === 'sleep' ? '#1a2148' : '#29336a');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // Gesicht im oberen Teil (beim Riesenhandy bleibt es neben dem Kopf des Dummys sichtbar)
  const cy = H * 0.19;
  g.strokeStyle = '#fff4c4';
  g.fillStyle = '#fff4c4';
  g.lineWidth = 14;
  g.lineCap = 'round';
  if (kind === 'sleep') {
    [-1, 1].forEach((s) => {
      g.beginPath();
      g.arc(W / 2 + s * 70, cy, 34, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    });
    g.beginPath();
    g.arc(W / 2, cy + 70, 30, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
    g.fillStyle = '#ff9fb8';
    [-1, 1].forEach((s) => {
      g.globalAlpha = 0.55;
      g.beginPath();
      g.arc(W / 2 + s * 110, cy + 48, 22, 0, Math.PI * 2);
      g.fill();
    });
    g.globalAlpha = 1;
    g.fillStyle = '#ffffff';
    fitText(g, 'Z', W * 0.62, H * 0.47, 80, 70);
    fitText(g, 'z', W * 0.76, H * 0.4, 60, 50);
    fitText(g, 'z', W * 0.87, H * 0.35, 40, 36);
  } else {
    // zusammengekniffene Augen > <
    [-1, 1].forEach((s) => {
      const x = W / 2 + s * 70;
      g.beginPath();
      g.moveTo(x - s * 30, cy - 26);
      g.lineTo(x + s * 22, cy);
      g.lineTo(x - s * 30, cy + 26);
      g.stroke();
    });
    g.beginPath();
    g.ellipse(W / 2, cy + 80, 26, 34, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#29336a';
    g.beginPath();
    g.ellipse(W / 2, cy + 82, 15, 22, 0, 0, Math.PI * 2);
    g.fill();
  }
};
const screenTex = (mode: string) =>
  canvasTex(300, 600, (g) => {
    const W = 300;
    const H = 600;
    if (mode === 'off') {
      g.fillStyle = '#121418';
      g.fillRect(0, 0, W, H);
      return;
    }
    if (mode === 'sleep' || mode === 'oops') {
      face(g, W, H, mode);
      return;
    }
    if (mode === 'clean') {
      g.fillStyle = '#e9f6ff';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#2fb34a';
      g.beginPath();
      g.arc(W / 2, 250, 90, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 26;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(W / 2 - 45, 252);
      g.lineTo(W / 2 - 10, 288);
      g.lineTo(W / 2 + 50, 212);
      g.stroke();
      g.fillStyle = '#2f3a4a';
      fitText(g, 'LEER', W / 2, 410, 240, 70);
      return;
    }
    if (mode === 'photos') {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#e8edf3';
      g.fillRect(0, 0, W, 54);
      g.fillStyle = '#9aa6b5';
      g.fillRect(16, 20, 110, 14);
      for (let i = 0; i < 18; i++) {
        const c = i % 3;
        const r = Math.floor(i / 3);
        photo(g, i, 6 + c * 97, 62 + r * 89, 91, 83);
      }
      return;
    }
    if (mode.startsWith('apps')) {
      const n = clamp(Number(mode.slice(4) || 20), 0, 20);
      const grad = g.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#5a7dff');
      grad.addColorStop(1, '#c77dff');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(20, 16, 50, 10);
      g.fillRect(W - 60, 16, 40, 10);
      for (let i = 0; i < n; i++) {
        const c = i % 4;
        const r = Math.floor(i / 4);
        const x = 22 + c * 68;
        const y = 56 + r * 100;
        rr(g, x, y, 52, 52, 14);
        g.fillStyle = APP_COLORS[i % APP_COLORS.length];
        g.fill();
        glyph(g, i, x + 26, y + 26, 52);
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.fillRect(x + 8, y + 62, 36, 7);
      }
      if (n === 0) {
        g.fillStyle = '#ffffff';
        fitText(g, '0', W / 2, H * 0.42, 200, 150);
      }
      return;
    }
    // 'feed': bunte Beiträge (erfundene App ohne Namen/Logo)
    g.fillStyle = '#f4f6fa';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ff6a5a';
    g.fillRect(0, 0, W, 54);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(30, 27, 13, 0, Math.PI * 2);
    g.fill();
    g.fillRect(56, 21, 120, 12);
    for (let k = 0; k < 3; k++) {
      const y = 66 + k * 178;
      g.fillStyle = '#ffffff';
      g.fillRect(10, y, 280, 170);
      g.fillStyle = APP_COLORS[(k * 3 + 1) % APP_COLORS.length];
      g.beginPath();
      g.arc(30, y + 18, 11, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#c3cad4';
      g.fillRect(48, y + 13, 100, 10);
      photo(g, k + 3, 18, y + 36, 264, 104);
      g.fillStyle = '#ff5a7a';
      g.beginPath();
      g.arc(28, y + 154, 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#c3cad4';
      g.fillRect(44, y + 150, 80, 8);
    }
  });

export const BedPhone = ({mode = 'feed', glow = 0, thin = 0, rumble = 0, squish = 0, time = 0}: {mode?: string; glow?: number; thin?: number; rumble?: number; squish?: number; time?: number}) => {
  const {w, h, t} = BED_PHONE;
  const th = clamp(thin);
  const thick = t * (1 - 0.85 * th);
  const caseCol = useMemo(() => new THREE.Color('#e5533f').lerp(new THREE.Color('#ffe6dc'), th * 0.8), [th]);
  const m = useMemo(
    () => ({
      case: std('#e5533f', {roughness: 0.35}),
      rim: std('#7b8494', {roughness: 0.3, metalness: 0.3}),
      cam: std('#101216'),
      lens: std('#3d5f8a', {roughness: 0.2}),
      btn: std('#5b6372'),
    }),
    [],
  );
  m.case.color.copy(caseCol);
  const sh = rumble > 0.01 ? Math.sin(time * 61) * 0.003 * rumble : 0;
  const sq = 1 - 0.35 * clamp(squish);
  return (
    <group position={[sh, 0, 0]} scale={[1 + 0.08 * clamp(squish), sq, 1 + 0.04 * clamp(squish)]}>
      <mesh material={m.case} castShadow receiveShadow>
        <boxGeometry args={[w, thick, h]} />
      </mesh>
      {/* Rand (leicht abgesetzt) */}
      <mesh material={m.rim}>
        <boxGeometry args={[w + 0.003, thick * 0.55, h + 0.003]} />
      </mesh>
      {/* Seitentasten */}
      <mesh material={m.btn} position={[w / 2 + 0.002, 0, -h * 0.2]}>
        <boxGeometry args={[0.003, thick * 0.4, 0.025]} />
      </mesh>
      {/* Kamera auf der Rückseite (ohne Logo) */}
      <mesh material={m.cam} position={[-w * 0.24, -thick / 2 - 0.002, -h * 0.36]}>
        <boxGeometry args={[0.03, 0.004, 0.03]} />
      </mesh>
      <mesh material={m.lens} position={[-w * 0.24, -thick / 2 - 0.004, -h * 0.36]}>
        <cylinderGeometry args={[0.008, 0.008, 0.003, 10]} />
      </mesh>
      {/* Bildschirm (oben) */}
      <group position={[0, thick / 2 + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <TextPlane draw={screenTex(mode)} k={`Betthandy ${mode}`} w={w - 0.008} h={h - 0.012} glow={0.7 + 0.6 * glow} />
      </group>
      {glow > 0.01 && (
        <>
          <mesh position={[0, thick / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w * 1.2, h * 1.08]} />
            <meshBasicMaterial color="#cfe6ff" transparent opacity={0.22 * glow} depthWrite={false} />
          </mesh>
          <pointLight position={[0, thick / 2 + 0.12, 0]} intensity={0.9 * glow} color="#9cc8ff" distance={1.1} decay={1.6} />
        </>
      )}
    </group>
  );
};

// ---------- Rollentausch-Effekt ----------
const RAY_COLORS = ['#ffd21a', '#3d8bfd', '#f2362b', '#3cbf5a'];
export const ReverseBurst = ({fill = 0, size = 0, time = 0}: {fill?: number; size?: number; time?: number}) => {
  const f = clamp(fill);
  const rayGeo = useMemo(() => new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, -0.035), new THREE.Vector2(1, -0.11), new THREE.Vector2(1, 0.11), new THREE.Vector2(0, 0.035)])), []);
  const mats = useMemo(
    () => ({
      rays: RAY_COLORS.map((c) => new THREE.MeshBasicMaterial({color: c, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false})),
      ring: new THREE.MeshBasicMaterial({color: '#fff6c8', transparent: true, depthWrite: false, toneMapped: false}),
      core: new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, depthWrite: false, toneMapped: false}),
    }),
    [],
  );
  if (f < 0.005) return null;
  // ploppt mit Überschwingen auf
  const pop = f < 1 ? Math.sin(f * Math.PI * 0.62) / Math.sin(Math.PI * 0.62) : 1;
  const k = (1 + size) * Math.max(0.001, pop);
  const pulse = 0.85 + 0.15 * Math.sin(time * 9);
  mats.rays.forEach((m) => (m.opacity = 0.75 * Math.min(1, f * 1.4)));
  mats.ring.opacity = 0.8 * Math.min(1, f * 1.4) * pulse;
  mats.core.opacity = 0.55 * Math.min(1, f * 1.4);
  const N = 16;
  const spin = time * 0.9;
  return (
    <group scale={k}>
      {Array.from({length: N}, (_, i) => {
        const a = (i / N) * Math.PI * 2 + spin;
        const L = 0.95 + 0.12 * Math.sin(time * 6 + i * 1.7);
        return (
          <mesh key={i} geometry={rayGeo} material={mats.rays[i % 4]} position={[0, 0, -0.03]} rotation={[0, 0, a]} scale={[L, 1, 1]} />
        );
      })}
      <mesh material={mats.core} position={[0, 0, -0.02]}>
        <circleGeometry args={[0.36, 32]} />
      </mesh>
      <mesh material={mats.ring} position={[0, 0, -0.015]}>
        <ringGeometry args={[0.38, 0.44, 40]} />
      </mesh>
      {/* Karte dreht sich (Rollentausch) */}
      <group rotation={[0, time * 4.2, 0.12 * Math.sin(time * 3)]} scale={1.6}>
        <ReverseCard glow={1} time={time} />
      </group>
      {/* kreisende Funken */}
      {Array.from({length: 10}, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - time * 2.2;
        const r = 0.6 + 0.06 * Math.sin(time * 5 + i);
        return (
          <mesh key={`s${i}`} material={mats.ring} position={[Math.cos(a) * r, Math.sin(a) * r, 0.02]} rotation={[0, 0, a]}>
            <circleGeometry args={[0.025 + 0.012 * Math.sin(time * 7 + i * 2), 4]} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- Comic-Sternchen ----------
const starShape = (ro: number, ri: number, n = 5) => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? ri : ro;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return new THREE.Shape(pts);
};
export const DizzyStars = ({fill = 1, size = 0, time = 0}: {fill?: number; size?: number; time?: number}) => {
  const f = clamp(fill);
  const geo = useMemo(() => new THREE.ShapeGeometry(starShape(0.05, 0.022)), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffe14a', side: THREE.DoubleSide, toneMapped: false}), []);
  if (f < 0.01) return null;
  return (
    <group scale={(1 + size) * f}>
      {Array.from({length: 5}, (_, i) => {
        const a = (i / 5) * Math.PI * 2 + time * 3.2;
        return (
          <mesh key={i} geometry={geo} material={mat} position={[Math.cos(a) * 0.2, 0.03 * Math.sin(time * 6 + i), Math.sin(a) * 0.2]} rotation={[0, -a + Math.PI / 2, time * 5 + i]} />
        );
      })}
    </group>
  );
};
export const ImpactStar = ({fill = 0, size = 0}: {fill?: number; size?: number}) => {
  const f = clamp(fill);
  const geo = useMemo(() => new THREE.ShapeGeometry(starShape(0.2, 0.085, 9)), []);
  const geo2 = useMemo(() => new THREE.ShapeGeometry(starShape(0.13, 0.06, 9)), []);
  const m1 = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, depthWrite: false, toneMapped: false}), []);
  const m2 = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffd21a', transparent: true, depthWrite: false, toneMapped: false}), []);
  if (f < 0.01 || f > 0.999) return null;
  const s = (1 + size) * (0.4 + 0.9 * Math.sin(Math.min(1, f * 1.6) * Math.PI * 0.5));
  m1.opacity = f < 0.7 ? 1 : (1 - f) / 0.3;
  m2.opacity = m1.opacity;
  return (
    <group scale={s}>
      <mesh geometry={geo} material={m1} />
      <mesh geometry={geo2} material={m2} position={[0, 0, 0.003]} rotation={[0, 0, 0.2]} />
    </group>
  );
};
export const TwinkleStar = ({fill = 0, size = 0, time = 0}: {fill?: number; size?: number; time?: number}) => {
  const f = clamp(fill);
  const geo = useMemo(() => new THREE.ShapeGeometry(starShape(0.5, 0.07, 4)), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#fffbe0', transparent: true, depthWrite: false, toneMapped: false}), []);
  const halo = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffe9a0', transparent: true, depthWrite: false, toneMapped: false}), []);
  if (f < 0.01 || f > 0.999) return null;
  const s = (1 + size) * Math.sin(f * Math.PI);
  mat.opacity = 1;
  halo.opacity = 0.35 * Math.sin(f * Math.PI);
  return (
    <group scale={Math.max(0.001, s)} rotation={[0, 0, time * 1.5]}>
      <mesh material={halo} position={[0, 0, -0.01]}>
        <circleGeometry args={[0.28, 20]} />
      </mesh>
      <mesh geometry={geo} material={mat} />
      <mesh geometry={geo} material={mat} rotation={[0, 0, Math.PI / 4]} scale={0.55} />
    </group>
  );
};

// ---------- fliegende App-Symbole / Foto-Kacheln ----------
export const AppStream = ({time = 0, photos = false, size = 0}: {time?: number; photos?: boolean; size?: number}) => {
  const items = useMemo(() => {
    const r = rng(photos ? 77 : 41);
    return Array.from({length: 26}, (_, i) => ({
      t0: i * 0.11,
      vx: (r() - 0.5) * 0.9,
      vz: (r() - 0.5) * 0.9,
      vy: 0.9 + r() * 0.6,
      spin: (r() - 0.5) * 12,
      col: photos ? ['#8fd0ff', '#ffc38a', '#b9a6ff', '#9be3c9'][i % 4] : APP_COLORS[i % APP_COLORS.length],
    }));
  }, [photos]);
  const mats = useMemo(() => items.map((it) => new THREE.MeshBasicMaterial({color: it.col, transparent: true, depthWrite: false, side: THREE.DoubleSide})), [items]);
  const white = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, depthWrite: false, side: THREE.DoubleSide}), []);
  const LIFE = 1.1;
  const cycle = items.length * 0.11;
  return (
    <group scale={1 + size}>
      {items.map((it, i) => {
        const u = (((time - it.t0) % cycle) + cycle) % cycle;
        if (time < it.t0 || u > LIFE) return null;
        const k = u / LIFE;
        mats[i].opacity = 1 - k * k;
        const pos: [number, number, number] = [it.vx * u, it.vy * u - 0.35 * u * u, it.vz * u];
        const s = 0.04 * (0.6 + 0.8 * Math.min(1, u * 4));
        return (
          <group key={i} position={pos} rotation={[it.spin * u * 0.3, it.spin * u, it.spin * u * 0.5]}>
            <mesh material={photos ? white : mats[i]}>
              <planeGeometry args={[s * (photos ? 1.25 : 1), s]} />
            </mesh>
            <mesh material={photos ? mats[i] : white} position={[0, 0, 0.001]}>
              <planeGeometry args={photos ? [s * 1.05, s * 0.8] : [s * 0.35, s * 0.35]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------- Bettdecke + Kissen ----------
const duvetTex = canvasTex(512, 512, (g) => {
  g.fillStyle = '#5f8fc4';
  g.fillRect(0, 0, 512, 512);
  const r = rng(9);
  for (let i = 0; i < 26; i++) {
    const x = r() * 512;
    const y = r() * 512;
    g.fillStyle = i % 3 ? '#ffe27a' : '#f4f1e8';
    g.globalAlpha = 0.85;
    if (i % 4 === 0) {
      g.beginPath();
      g.arc(x, y, 18, 0, Math.PI * 2);
      g.arc(x + 8, y - 5, 16, 0, Math.PI * 2, true);
      g.fill('evenodd');
    } else {
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const rr2 = k % 2 ? 5 : 12;
        g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
      }
      g.fill();
    }
  }
  g.globalAlpha = 1;
});
let duvetMapCache: THREE.Texture | null = null;
export const Duvet = ({fill = 1, squish = 0}: {fill?: number; squish?: number}) => {
  const len = 0.35 + 1.1 * clamp(fill);
  const mats = useMemo(() => {
    if (!duvetMapCache && typeof document !== 'undefined') {
      duvetMapCache = duvetTex();
      duvetMapCache.wrapS = duvetMapCache.wrapT = THREE.RepeatWrapping;
    }
    return {
      top: new THREE.MeshStandardMaterial({color: '#ffffff', map: duvetMapCache ?? undefined, roughness: 0.95}),
      side: std('#4f7db0', {roughness: 0.95}),
      fold: std('#f4efe6', {roughness: 0.95}),
    };
  }, []);
  const th = 0.085 * (1 - 0.55 * clamp(squish));
  const Wd = 0.98;
  return (
    <group>
      {/* Decke als drei weich gewölbte Streifen */}
      {[-1, 0, 1].map((k) => (
        <mesh key={k} material={mats.top} position={[len / 2, th / 2 + (k === 0 ? 0.01 : 0), (k * Wd) / 3]} scale={[1, 1, 1]} castShadow receiveShadow>
          <boxGeometry args={[len, th + (k === 0 ? 0.02 : 0), Wd / 3 + 0.004]} />
        </mesh>
      ))}
      {/* seitlich herabhängend */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.side} position={[len / 2, -0.06, s * (Wd / 2 + 0.01)]}>
          <boxGeometry args={[len, 0.2, 0.025]} />
        </mesh>
      ))}
      <mesh material={mats.side} position={[-0.012, -0.06, 0]}>
        <boxGeometry args={[0.025, 0.2, Wd + 0.04]} />
      </mesh>
      {/* umgeschlagene Kante oben (Bezug innen hell) */}
      <mesh material={mats.fold} position={[len - 0.06, th + 0.012, 0]} rotation={[0, 0, 0.08]} castShadow>
        <boxGeometry args={[0.14, 0.03, Wd + 0.01]} />
      </mesh>
    </group>
  );
};
export const Pillow = ({squish = 0}: {squish?: number}) => {
  const m = useMemo(() => ({p: std('#fbf6ec', {roughness: 0.95}), seam: std('#e7dccb', {roughness: 0.95})}), []);
  const sq = clamp(squish);
  return (
    <group scale={[1 + 0.08 * sq, 1 - 0.45 * sq, 1 + 0.05 * sq]}>
      <mesh material={m.p} position={[0, 0.065, 0]} scale={[0.19, 0.065, 0.35]} castShadow receiveShadow>
        <sphereGeometry args={[1, 12, 8]} />
      </mesh>
      <mesh material={m.p} position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.32, 0.09, 0.62]} />
      </mesh>
      <mesh material={m.seam} position={[0, 0.06, 0]}>
        <boxGeometry args={[0.36, 0.012, 0.66]} />
      </mesh>
    </group>
  );
};
