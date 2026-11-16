import {useEffect, useMemo, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {T} from '../ui/theme';
import {clamp, rng} from '../lib/anim';

/**
 * Spezial "Pirat-Token" – Gaming-Zimmer. ALLES selbst gestaltet: KEINE echten Spielgrafiken, KEINE Spieloberfläche,
 * KEIN Logo, KEIN echtes Token-Motiv (Vorgabe Inhaber, Spezial-Regel 4).
 *  - GamingLaptop ("gaminglaptop", "gaminglaptop2"): dunkler Gaming-Laptop mit RGB-Streifen. Auf dem Bildschirm ein eigenes, buntes
 *    Insel-Spiel (kleine runde Spielfigur, Palmen, Meer, Schatztruhen, die aufklappen und golden leuchten) + Zähler "Truhen geöffnet".
 *    Werte: lid 0 zu … 1 offen, fill = Zählerstand (Zahl), mark = Truhen pro Sekunde (0 = Standard 0,75), turn = Phase des Truhen-Zyklus
 *    (0 … 1; Truhe springt auf, wenn Abschnittszeit·mark + turn ganzzahlig ist), smoke 0 … 2 = comichafte
 *    Dampfwolken (kein Feuer), glow 0 … 1 = Tasten glühen rot, good 0 … 1 = goldene Piratenmünze leuchtet auf dem Bildschirm auf.
 *    Ursprung = Mitte unten, Tastatur vorn (+z), Scharnier hinten (z −0.13), Bildschirm schaut nach +z.
 *  - LaptopStack ("laptopstapel"): Stapel zugeklappter Laptops, fill = Anzahl (ganzzahlig gerundet).
 *  - EnergyCan: Dose ohne Marke (nur Farbstreifen). GamingChair: Gaming-Stuhl, Sitz 0,45 m. PiratePoster: Plakat mit eigener Münze.
 *  - PirateCoin (Zeichnung): goldene Münze, Totenkopf mit Piratenhut, Seil-Rand, Glanz.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

// ---------- Schrift laden (einmal), dann Leinwände zeichnen ----------
let fontsReady = false;
const useFonts = () => {
  const [ready, setReady] = useState(fontsReady);
  const [handle] = useState(() => (fontsReady ? null : delayRender('Schrift Gaming')));
  const advance = useThree((st) => st.advance);
  useEffect(() => {
    if (ready) return;
    document.fonts.load(`800 80px "Barlow Condensed"`).finally(() => {
      fontsReady = true;
      setReady(true);
    });
  }, [ready]);
  // nach dem Zeichnen der Leinwand die 3D-Szene einmal neu malen, dann erst weiter rendern
  useEffect(() => {
    if (!ready) return;
    advance(performance.now());
    if (handle !== null) continueRender(handle);
  }, [ready, advance, handle]);
  return ready;
};

/** Eine Leinwand + Textur, die nur neu gezeichnet wird, wenn sich "key" ändert */
const useLiveCanvas = (w: number, h: number) =>
  useMemo(() => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return {c, g: c.getContext('2d')!, tex, key: ''};
  }, [w, h]);

const fmt = (n: number) => Math.max(0, Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ---------- goldene Piratenmünze (eigenes Motiv) ----------
export const drawPirateCoin = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, shine = 0.5) => {
  g.save();
  // Schatten
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.beginPath();
  g.ellipse(cx + r * 0.06, cy + r * 0.08, r, r, 0, 0, Math.PI * 2);
  g.fill();
  // Münzkörper
  const body = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  body.addColorStop(0, '#fff3a6');
  body.addColorStop(0.45, '#f7c531');
  body.addColorStop(0.85, '#d38f12');
  body.addColorStop(1, '#9c5f06');
  g.fillStyle = body;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  // Seil-Rand: gedrehte Glieder
  const n = 34;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rx = cx + Math.cos(a) * r * 0.86;
    const ry = cy + Math.sin(a) * r * 0.86;
    g.save();
    g.translate(rx, ry);
    g.rotate(a + 0.9);
    g.fillStyle = i % 2 ? '#c98a12' : '#ffe07a';
    g.beginPath();
    g.ellipse(0, 0, r * 0.085, r * 0.04, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#8a5408';
    g.lineWidth = Math.max(1, r * 0.012);
    g.stroke();
    g.restore();
  }
  // innerer Ring
  g.strokeStyle = '#a8690a';
  g.lineWidth = r * 0.03;
  g.beginPath();
  g.arc(cx, cy, r * 0.74, 0, Math.PI * 2);
  g.stroke();
  const inner = g.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.05, cx, cy, r * 0.72);
  inner.addColorStop(0, '#ffe680');
  inner.addColorStop(1, '#e3a521');
  g.fillStyle = inner;
  g.beginPath();
  g.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  g.fill();
  const dark = '#7a4a06';
  const mid = '#b8780e';
  // gekreuzte Knochen hinter dem Totenkopf
  for (const s of [-1, 1]) {
    g.save();
    g.translate(cx, cy + r * 0.2);
    g.rotate(s * 0.75);
    g.fillStyle = mid;
    g.fillRect(-r * 0.5, -r * 0.045, r, r * 0.09);
    for (const e of [-1, 1]) {
      g.beginPath();
      g.arc(e * r * 0.5, -r * 0.05, r * 0.06, 0, Math.PI * 2);
      g.arc(e * r * 0.5, r * 0.05, r * 0.06, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  // Totenkopf (rund + Kiefer), freundlich-comichaft
  g.fillStyle = '#fff0b0';
  g.strokeStyle = dark;
  g.lineWidth = r * 0.025;
  g.beginPath();
  g.ellipse(cx, cy + r * 0.02, r * 0.3, r * 0.27, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.beginPath();
  g.roundRect(cx - r * 0.17, cy + r * 0.18, r * 0.34, r * 0.17, r * 0.05);
  g.fill();
  g.stroke();
  g.fillStyle = dark;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + s * r * 0.11, cy + r * 0.03, r * 0.075, r * 0.085, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.moveTo(cx, cy + r * 0.12);
  g.lineTo(cx - r * 0.035, cy + r * 0.18);
  g.lineTo(cx + r * 0.035, cy + r * 0.18);
  g.fill();
  for (let i = -1; i <= 1; i++) g.fillRect(cx + i * r * 0.075 - r * 0.008, cy + r * 0.2, r * 0.016, r * 0.13);
  // Piratenhut (Dreispitz) mit Goldborte
  g.fillStyle = '#3a2410';
  g.beginPath();
  g.moveTo(cx - r * 0.5, cy - r * 0.16);
  g.quadraticCurveTo(cx - r * 0.35, cy - r * 0.62, cx, cy - r * 0.58);
  g.quadraticCurveTo(cx + r * 0.35, cy - r * 0.62, cx + r * 0.5, cy - r * 0.16);
  g.quadraticCurveTo(cx, cy - r * 0.3, cx - r * 0.5, cy - r * 0.16);
  g.fill();
  g.strokeStyle = '#ffd34d';
  g.lineWidth = r * 0.03;
  g.beginPath();
  g.moveTo(cx - r * 0.46, cy - r * 0.18);
  g.quadraticCurveTo(cx, cy - r * 0.32, cx + r * 0.46, cy - r * 0.18);
  g.stroke();
  // kleiner Totenkopf auf dem Hut
  g.fillStyle = '#fff0b0';
  g.beginPath();
  g.arc(cx, cy - r * 0.43, r * 0.06, 0, Math.PI * 2);
  g.fill();
  // Glanz
  g.globalAlpha = 0.35 + 0.4 * shine;
  g.strokeStyle = '#fffbe0';
  g.lineWidth = r * 0.06;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(cx, cy, r * 0.93, Math.PI * 1.08, Math.PI * 1.42);
  g.stroke();
  g.globalAlpha = 1;
  const star = (x: number, y: number, s: number) => {
    g.fillStyle = '#ffffff';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 ? s * 0.25 : s;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.fill();
  };
  star(cx - r * 0.55, cy - r * 0.55, r * (0.12 + 0.08 * shine));
  star(cx + r * 0.62, cy + r * 0.35, r * 0.07 * (0.5 + shine));
  g.restore();
};

// ---------- selbst gestaltetes Insel-Spiel ----------
const drawChest = (g: CanvasRenderingContext2D, x: number, y: number, s: number, open: number, glow: number) => {
  // Truhe: Holz + Metallbeschläge, Deckel klappt nach hinten auf, goldenes Leuchten
  if (glow > 0.01) {
    const gl = g.createRadialGradient(x, y - s * 0.4, s * 0.1, x, y - s * 0.4, s * 1.6);
    gl.addColorStop(0, `rgba(255,230,120,${0.85 * glow})`);
    gl.addColorStop(1, 'rgba(255,200,60,0)');
    g.fillStyle = gl;
    g.beginPath();
    g.arc(x, y - s * 0.4, s * 1.6, 0, Math.PI * 2);
    g.fill();
    // Strahlen
    g.save();
    g.globalAlpha = 0.55 * glow;
    g.fillStyle = '#fff2a8';
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.28;
      g.beginPath();
      g.moveTo(x, y - s * 0.55);
      g.lineTo(x + Math.cos(a - 0.06) * s * 1.7, y - s * 0.55 + Math.sin(a - 0.06) * s * 1.7);
      g.lineTo(x + Math.cos(a + 0.06) * s * 1.7, y - s * 0.55 + Math.sin(a + 0.06) * s * 1.7);
      g.fill();
    }
    g.restore();
  }
  g.fillStyle = '#8a4f22';
  g.fillRect(x - s * 0.6, y - s * 0.55, s * 1.2, s * 0.55);
  g.fillStyle = '#6b3a17';
  for (let i = 1; i < 3; i++) g.fillRect(x - s * 0.6, y - s * 0.55 + i * s * 0.18, s * 1.2, s * 0.02);
  g.fillStyle = '#d9d2c2';
  g.fillRect(x - s * 0.62, y - s * 0.57, s * 0.08, s * 0.57);
  g.fillRect(x + s * 0.54, y - s * 0.57, s * 0.08, s * 0.57);
  // Inneres (leer!) + Deckel
  const h = s * 0.42 * (1 - open);
  if (open > 0.05) {
    g.fillStyle = '#3b2210';
    g.fillRect(x - s * 0.55, y - s * 0.62, s * 1.1, s * 0.08);
  }
  g.fillStyle = '#9a5a28';
  g.beginPath();
  if (open < 0.5) {
    g.moveTo(x - s * 0.62, y - s * 0.55);
    g.quadraticCurveTo(x, y - s * 0.55 - h * 1.25, x + s * 0.62, y - s * 0.55);
    g.closePath();
  } else {
    const k = (open - 0.5) * 2;
    g.moveTo(x - s * 0.62, y - s * 0.6);
    g.lineTo(x + s * 0.62, y - s * 0.6);
    g.lineTo(x + s * 0.58, y - s * 0.6 - s * 0.45 * k - s * 0.05);
    g.lineTo(x - s * 0.58, y - s * 0.6 - s * 0.45 * k - s * 0.05);
    g.closePath();
  }
  g.fill();
  g.fillStyle = '#ffd34d';
  g.fillRect(x - s * 0.08, y - s * 0.6, s * 0.16, s * 0.16);
};

const drawGame = (g: CanvasRenderingContext2D, W: number, H: number, time: number, count: number, rate: number, coin: number, steam: number, phase: number) => {
  // Himmel + Meer
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#6ec8ff');
  sky.addColorStop(0.55, '#bfe9ff');
  sky.addColorStop(0.56, '#2aa7d6');
  sky.addColorStop(1, '#1676b8');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  // Wolken
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [cx, cy, s] of [
    [90, 70, 1],
    [380, 55, 0.8],
    [250, 105, 0.6],
  ] as [number, number, number][]) {
    const ox = ((cx + time * 12 * s) % (W + 120)) - 60;
    g.beginPath();
    g.arc(ox, cy, 22 * s, 0, Math.PI * 2);
    g.arc(ox + 24 * s, cy - 8 * s, 26 * s, 0, Math.PI * 2);
    g.arc(ox + 50 * s, cy, 20 * s, 0, Math.PI * 2);
    g.fill();
  }
  // Insel
  g.fillStyle = '#f2d98c';
  g.beginPath();
  g.ellipse(W / 2, H * 0.72, W * 0.47, H * 0.17, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#58c24a';
  g.beginPath();
  g.ellipse(W / 2, H * 0.69, W * 0.4, H * 0.12, 0, 0, Math.PI * 2);
  g.fill();
  // Palmen
  for (const [px, s] of [
    [70, 1],
    [W - 60, 0.85],
  ] as [number, number][]) {
    g.strokeStyle = '#9b6a3a';
    g.lineWidth = 9 * s;
    g.beginPath();
    g.moveTo(px, H * 0.7);
    g.quadraticCurveTo(px + 14 * s, H * 0.55, px + 4 * s, H * 0.42);
    g.stroke();
    g.fillStyle = '#2f9a3d';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI + (i / 4) * Math.PI + Math.sin(time * 2 + i) * 0.05;
      g.beginPath();
      g.ellipse(px + 4 * s + Math.cos(a) * 26 * s, H * 0.42 + Math.sin(a) * 10 * s, 28 * s, 8 * s, a, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Truhe: Zyklus (Truhe auf – leer – Truhe zu – nächste)
  const r = rate > 0 ? rate : 0.75;
  const cyc = (((time * r + phase) % 1) + 1) % 1;
  const open = cyc < 0.15 ? cyc / 0.15 : cyc < 0.7 ? 1 : cyc < 0.85 ? 1 - (cyc - 0.7) / 0.15 : 0;
  const glow = cyc < 0.1 ? 0 : cyc < 0.3 ? (cyc - 0.1) / 0.2 : cyc < 0.6 ? 1 - (cyc - 0.3) / 0.3 : 0;
  drawChest(g, W * 0.6, H * 0.71, 64, coin > 0.3 ? 1 : open, coin > 0.3 ? 1 : glow * 0.8);
  // „leer“-Wölkchen über der offenen Truhe
  if (coin < 0.3 && cyc > 0.3 && cyc < 0.7) {
    const a = Math.sin(Math.PI * (cyc - 0.3) / 0.4);
    g.globalAlpha = a;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(W * 0.6, H * 0.45 - 10 * (cyc - 0.3), 15, 0, Math.PI * 2);
    g.arc(W * 0.6 + 18, H * 0.45 - 12 * (cyc - 0.3), 12, 0, Math.PI * 2);
    g.arc(W * 0.6 - 16, H * 0.45 - 8 * (cyc - 0.3), 11, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }
  // Spielfigur: kleine runde Figur in Gelb mit Kopftuch (eigenes Design)
  const fx = W * 0.38 + Math.sin(time * 1.3) * 6;
  const fy = H * 0.7;
  const hop = Math.abs(Math.sin(time * 6)) * 4;
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.beginPath();
  g.ellipse(fx, fy + 2, 16, 5, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2d5bd8';
  g.fillRect(fx - 9, fy - 20 - hop, 18, 20);
  g.fillStyle = '#ffcf33';
  g.beginPath();
  g.arc(fx, fy - 32 - hop, 13, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e8402f';
  g.beginPath();
  g.arc(fx, fy - 35 - hop, 13.5, Math.PI, 0);
  g.fill();
  g.fillRect(fx + 9, fy - 38 - hop, 10, 4);
  // Zähler oben
  g.fillStyle = 'rgba(20,24,40,0.78)';
  g.beginPath();
  g.roundRect(10, 10, W - 20, 50, 12);
  g.fill();
  g.fillStyle = '#ffd34d';
  g.font = `800 34px ${T.font}`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText('TRUHEN GEÖFFNET:', 24, 36);
  g.fillStyle = '#ffffff';
  g.textAlign = 'right';
  g.font = `800 40px ${T.font}`;
  g.fillText(fmt(count), W - 24, 37);
  // Dampf beschlägt den Bildschirm
  if (steam > 0.6) {
    g.fillStyle = `rgba(255,255,255,${clamp((steam - 0.6) * 0.18, 0, 0.22)})`;
    g.fillRect(0, 60, W, H - 60);
  }
  // goldene Münze leuchtet auf
  if (coin > 0.01) {
    g.fillStyle = `rgba(255,214,60,${0.45 * coin})`;
    g.fillRect(0, 0, W, H);
    g.save();
    g.globalAlpha = coin;
    const rays = g.createRadialGradient(W / 2, H * 0.52, 10, W / 2, H * 0.52, H * 0.6);
    rays.addColorStop(0, 'rgba(255,255,220,1)');
    rays.addColorStop(1, 'rgba(255,200,40,0)');
    g.fillStyle = rays;
    g.beginPath();
    g.arc(W / 2, H * 0.52, H * 0.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,250,200,0.6)';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + time * 0.8;
      g.beginPath();
      g.moveTo(W / 2, H * 0.52);
      g.lineTo(W / 2 + Math.cos(a - 0.09) * W, H * 0.52 + Math.sin(a - 0.09) * W);
      g.lineTo(W / 2 + Math.cos(a + 0.09) * W, H * 0.52 + Math.sin(a + 0.09) * W);
      g.fill();
    }
    const sc = 0.4 + 0.6 * Math.min(1, coin * 1.4);
    drawPirateCoin(g, W / 2, H * 0.55, 92 * sc, 0.5 + 0.5 * Math.sin(time * 5));
    g.restore();
  }
};

const LidScreen = ({time, count, rate, coin, steam, phase}: {time: number; count: number; rate: number; coin: number; steam: number; phase: number}) => {
  const ready = useFonts();
  const live = useLiveCanvas(512, 320);
  // nur bei Änderungen neu zeichnen (30 Bilder/s)
  const key = `${Math.round(time * 30)}|${Math.round(count)}|${rate}|${phase}|${coin.toFixed(2)}|${steam.toFixed(1)}|${ready}`;
  if (ready && live.key !== key) {
    drawGame(live.g, 512, 320, time, count, rate, coin, steam, phase);
    live.tex.needsUpdate = true;
    live.key = key;
  }
  const mat = useMemo(() => new THREE.MeshBasicMaterial({map: live.tex, toneMapped: false}), [live]);
  return (
    <mesh material={mat}>
      <planeGeometry args={[0.39, 0.244]} />
    </mesh>
  );
};

// ---------- Dampfwolken (comichaft, kein Feuer) ----------
const PUFFS = Array.from({length: 14}, (_, i) => {
  const r = rng(700 + i * 13);
  return {x: (r() - 0.5) * 0.36, z: (r() - 0.5) * 0.2, ph: r(), sp: 0.55 + r() * 0.4, s: 0.6 + r() * 0.6};
});
export const SteamPuffs = ({amount, time, height = 0.55}: {amount: number; time: number; height?: number}) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 1, transparent: true, opacity: 0.85, flatShading: true, emissive: '#d8dde6', emissiveIntensity: 0.35, depthWrite: false}), []);
  if (amount < 0.02) return null;
  const n = Math.min(PUFFS.length, Math.round(4 + amount * 5));
  return (
    <group>
      {PUFFS.slice(0, n).map((p, i) => {
        const u = (time * p.sp * (0.8 + 0.3 * amount) + p.ph) % 1;
        const s = (0.03 + 0.06 * u) * p.s * (0.7 + 0.4 * amount);
        const op = Math.sin(Math.PI * u);
        return (
          <mesh key={i} material={mat} position={[p.x * (1 + u * 0.6), 0.02 + u * height * (0.7 + 0.4 * amount), p.z + u * 0.04]} scale={s * (0.4 + 0.6 * op)}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- Gaming-Laptop ----------
/** Deckelwinkel (Grad aus der Senkrechten, + = zur Tastatur hin): offen −16° … zu +90° */
export const lidAngle = (lid: number) => -16 + (1 - clamp(lid)) * 106;
export const GLAPTOP = {w: 0.42, d: 0.29, hinge: -0.135, lidLen: 0.27, base: 0.024};
export const GamingLaptop = ({lid = 1, count = 0, rate = 0, steam = 0, keys = 0, coin = 0, time = 0, phase = 0}: {lid?: number; count?: number; rate?: number; steam?: number; keys?: number; coin?: number; time?: number; phase?: number}) => {
  const m = useMemo(
    () => ({
      shell: std('#262a33', {roughness: 0.45, metalness: 0.3}),
      edge: std('#15171c'),
      keysOff: std('#1b1d22'),
    }),
    [],
  );
  const k = clamp(keys);
  const keyMat = useMemo(() => new THREE.MeshStandardMaterial({color: new THREE.Color('#1b1d22').lerp(new THREE.Color('#ff2200'), k), emissive: new THREE.Color('#ff1a00'), emissiveIntensity: 2.6 * k, flatShading: true, toneMapped: false}), [k]);
  const hue = (time * 0.12) % 1;
  const rgb = useMemo(() => new THREE.MeshBasicMaterial({color: new THREE.Color().setHSL(hue, 0.9, 0.55), toneMapped: false}), [Math.round(hue * 60)]);
  const a = (lidAngle(lid) * Math.PI) / 180;
  const {w, d, hinge, lidLen, base} = GLAPTOP;
  return (
    <group>
      <mesh material={m.shell} position={[0, base / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, base, d]} />
      </mesh>
      {/* RGB-Streifen vorn */}
      <mesh material={rgb} position={[0, base * 0.5, d / 2 + 0.002]}>
        <boxGeometry args={[w * 0.8, 0.005, 0.004]} />
      </mesh>
      {/* Tastatur: 5 Reihen Tasten */}
      {Array.from({length: 5}, (_, r) => (
        <mesh key={r} material={keyMat} position={[0, base + 0.003, -0.08 + r * 0.03]}>
          <boxGeometry args={[w * 0.86, 0.006, 0.022]} />
        </mesh>
      ))}
      {Array.from({length: 13}, (_, c) => (
        <mesh key={c} material={m.edge} position={[-w * 0.43 + (c + 0.5) * ((w * 0.86) / 13), base + 0.0068, -0.02]}>
          <boxGeometry args={[0.003, 0.0012, 0.15]} />
        </mesh>
      ))}
      {k > 0.05 && <pointLight position={[0, base + 0.06, 0.0]} intensity={0.9 * k} color="#ff3a10" distance={0.9} decay={2} />}
      <mesh material={m.edge} position={[0, base + 0.001, 0.105]}>
        <boxGeometry args={[0.11, 0.002, 0.06]} />
      </mesh>
      {/* Deckel */}
      <group position={[0, base, hinge]} rotation={[a, 0, 0]}>
        <mesh material={m.shell} position={[0, lidLen / 2, -0.007]} castShadow>
          <boxGeometry args={[w, lidLen, 0.014]} />
        </mesh>
        {/* Rückseite: RGB-Streifen (kein Logo) */}
        <mesh material={rgb} position={[0, lidLen * 0.55, -0.0145]}>
          <boxGeometry args={[0.16, 0.006, 0.002]} />
        </mesh>
        {lid > 0.2 && (
          <group position={[0, lidLen / 2 + 0.005, 0.0015]}>
            <LidScreen time={time} count={count} rate={rate} coin={coin} steam={steam} phase={phase} />
          </group>
        )}
        {lid > 0.2 && <pointLight position={[0, lidLen / 2, 0.15]} intensity={0.5 + 1.8 * coin} color={coin > 0.1 ? '#ffd040' : '#9fd8ff'} distance={1.6} decay={2} />}
      </group>
      <group position={[0, base, -0.02]}>
        <SteamPuffs amount={steam} time={time} />
      </group>
    </group>
  );
};

// ---------- Stapel zugeklappter Laptops ----------
const STACK_COLORS = ['#55606f', '#6a5578', '#4b6a73', '#6d5f4a', '#5a5a63', '#64506e'];
export const LaptopStack = ({count = 4}: {count?: number}) => {
  const n = Math.max(0, Math.round(count));
  return (
    <group>
      {Array.from({length: n}, (_, i) => {
        const r = rng(40 + i * 7);
        return (
          <group key={i} position={[(r() - 0.5) * 0.04, i * 0.04, (r() - 0.5) * 0.04]} rotation={[0, (r() - 0.5) * 0.22, 0]}>
            <mesh position={[0, 0.019, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.42, 0.038, 0.29]} />
              <meshStandardMaterial color={STACK_COLORS[i % STACK_COLORS.length]} roughness={0.45} metalness={0.3} flatShading />
            </mesh>
            <mesh position={[0, 0.019, 0.146]}>
              <boxGeometry args={[0.34, 0.004, 0.003]} />
              <meshBasicMaterial color={['#ff4fd8', '#4fe3ff', '#7cff6b', '#ffb84f'][i % 4]} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------- Energydrink-Dose ohne Marke ----------
export const EnergyCan = ({color = '#2fd0a0', band = '#151515', tilt = 0}: {color?: string; band?: string; tilt?: number}) => (
  <group rotation={[0, 0, tilt]}>
    <mesh position={[0, 0.062, 0]} castShadow>
      <cylinderGeometry args={[0.032, 0.032, 0.124, 14]} />
      <meshStandardMaterial color={band} metalness={0.5} roughness={0.35} />
    </mesh>
    <mesh position={[0, 0.07, 0]}>
      <cylinderGeometry args={[0.0325, 0.0325, 0.05, 14]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} emissive={color} emissiveIntensity={0.15} />
    </mesh>
    <mesh position={[0, 0.127, 0]}>
      <cylinderGeometry args={[0.028, 0.032, 0.008, 14]} />
      <meshStandardMaterial color="#c9ced4" metalness={0.8} roughness={0.25} />
    </mesh>
  </group>
);

// ---------- Gaming-Stuhl ----------
/** Gaming-Stuhl (Rennsitz-Stil), Sitz 0,45 m, Lehne hinten (−z), Sitz nach +z. Ursprung = Boden unter Sitzmitte */
export const GamingChair = ({accent = '#e0245e'}: {accent?: string}) => {
  const m = useMemo(() => ({black: std('#1e2026', {roughness: 0.7}), acc: std(accent, {roughness: 0.6}), metal: std('#8d949c', {metalness: 0.6, roughness: 0.35})}), [accent]);
  return (
    <group>
      {/* Fünfstern-Fuß mit Rollen */}
      {Array.from({length: 5}, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh material={m.black} position={[0, 0.07, 0.17]}>
              <boxGeometry args={[0.05, 0.035, 0.34]} />
            </mesh>
            <mesh material={m.black} position={[0, 0.03, 0.33]}>
              <sphereGeometry args={[0.03, 8, 6]} />
            </mesh>
          </group>
        );
      })}
      <mesh material={m.metal} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.03, 0.035, 0.32, 10]} />
      </mesh>
      {/* Sitz */}
      <mesh material={m.black} position={[0, 0.42, 0.02]} castShadow>
        <boxGeometry args={[0.5, 0.07, 0.48]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.acc} position={[s * 0.22, 0.46, 0.02]} castShadow>
          <boxGeometry args={[0.07, 0.06, 0.48]} />
        </mesh>
      ))}
      {/* Armlehnen */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={m.black} position={[s * 0.29, 0.53, -0.02]}>
            <boxGeometry args={[0.04, 0.18, 0.04]} />
          </mesh>
          <mesh material={m.black} position={[s * 0.29, 0.63, 0.02]}>
            <boxGeometry args={[0.07, 0.03, 0.26]} />
          </mesh>
        </group>
      ))}
      {/* hohe Lehne mit Seitenwangen + Kopfstütze */}
      <group position={[0, 0.45, -0.23]} rotation={[-0.14, 0, 0]}>
        <mesh material={m.black} position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.46, 0.84, 0.08]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.acc} position={[s * 0.205, 0.38, 0.03]} castShadow>
            <boxGeometry args={[0.07, 0.7, 0.07]} />
          </mesh>
        ))}
        <mesh material={m.acc} position={[0, 0.78, 0.05]}>
          <boxGeometry args={[0.24, 0.12, 0.05]} />
        </mesh>
        <mesh material={m.black} position={[0, 0.42, 0.045]}>
          <boxGeometry args={[0.12, 0.6, 0.01]} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- Plakat „PIRAT-TOKEN“ (eigene Münze) ----------
const posterDraw = (g: CanvasRenderingContext2D) => {
  const W = 600;
  const H = 840;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1d2a4a');
  bg.addColorStop(1, '#0d1326');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // Strahlen hinter der Münze
  g.save();
  g.translate(W / 2, 330);
  for (let i = 0; i < 16; i++) {
    g.rotate((Math.PI * 2) / 16);
    g.fillStyle = i % 2 ? 'rgba(255,210,80,0.16)' : 'rgba(255,240,170,0.08)';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-60, -520);
    g.lineTo(60, -520);
    g.fill();
  }
  g.restore();
  drawPirateCoin(g, W / 2, 330, 215, 1);
  // Rahmen
  g.strokeStyle = '#ffd34d';
  g.lineWidth = 10;
  g.strokeRect(14, 14, W - 28, H - 28);
  // Schrift
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffd34d';
  g.font = `800 112px ${T.font}`;
  g.strokeStyle = '#5a3500';
  g.lineWidth = 8;
  g.strokeText('PIRAT-TOKEN', W / 2, 628);
  g.fillText('PIRAT-TOKEN', W / 2, 628);
  g.fillStyle = '#ffffff';
  g.font = `800 52px ${T.font}`;
  g.fillText('Chance: 1 : 137.500', W / 2, 718);
  g.font = `700 44px ${T.font}`;
  g.fillText('pro Schatztruhe', W / 2, 772);
};
export const POSTER = {w: 0.66, h: 0.924};
export const PiratePoster = () => {
  const ready = useFonts();
  const live = useLiveCanvas(600, 840);
  if (ready && live.key !== 'p') {
    posterDraw(live.g);
    live.tex.needsUpdate = true;
    live.key = 'p';
  }
  const mat = useMemo(() => new THREE.MeshStandardMaterial({map: live.tex, roughness: 0.8, emissive: '#ffffff', emissiveMap: live.tex, emissiveIntensity: 0.45}), [live]);
  return (
    <group>
      {/* Rahmen nur von vorn sichtbar (Kamera darf hinter der Wand stehen) */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[POSTER.w + 0.04, POSTER.h + 0.04]} />
        <meshStandardMaterial color="#111318" />
      </mesh>
      <mesh material={mat} position={[0, 0, 0.001]}>
        <planeGeometry args={[POSTER.w, POSTER.h]} />
      </mesh>
    </group>
  );
};
