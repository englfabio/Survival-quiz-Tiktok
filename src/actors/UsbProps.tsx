import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';

/**
 * Spezial „USB-Kabel“ – alles comichaft und harmlos, Low-Poly-Cartoon-Stil, KEINE Marken/Logos.
 *
 *  - UsbLaptop ("usblaptop"): markenloser Laptop (blaugrau, Deckel-Rückseite nur mit einfachem Streifen, kein Logo), Bildschirm mit
 *      selbst gestaltetem Schreibtisch (Himmelblau + zwei Fenster). Ursprung = Unterseite Mitte, vorn (Tastatur/Bildschirm) = +z.
 *      Deutlicher, großer USB-Anschluss an der RECHTEN Seite (aus Sicht des Benutzers = lokal +x) bei USBL.port, Öffnung zeigt nach +x.
 *      Werte: `lid` 0 zu … 1 offen, `fold` 0 … 1 = Deckel wird falschrum nach HINTEN überklappt (0,5 = flach nach hinten,
 *      1 = ganz unter den Boden geklappt), `squish` 0 … 1 = staucht + wackelt (Treffer), `glow` 0 … 1 = Anschluss leuchtet grün auf
 *      (Stecker sitzt), `tilt` = Überschlag in Grad um die Querachse (Flug), `size`.
 *  - UsbPlug ("usbstecker"): dicker USB-Stecker (dunkles Gehäuse mit Griffrillen, Metallzunge mit Kunststoff-Zunge auf EINER Hälfte →
 *      man sieht, wie herum er gerade ist) + dickes graues Kabel. Ursprung = Griffpunkt am Knickschutz (Hand verdeckt das Gehäuse nicht), Spitze zeigt nach +z
 *      (USBP.tip = Abstand Griff → Spitze). Werte: `tilt` = Drehung um die eigene Achse in Grad (180 = umgedreht),
 *      `rope` 0 = Kabel liegt flach nach hinten (auf dem Tisch, fällt an der Kante herunter) … 1 = hängt nach unten (in der Hand),
 *      `belt` 0 … 1 = winziger roter Sicherheitsgurt mit Schnalle, `helm` 0 … 1 = winziger Helm, `nod` 0 … 1 = nickt (versteht),
 *      `size`. In der Hand: `hand` 1.
 *  - CartoonMallet (Dummy-Werkzeug 'mallet'): kleiner Cartoon-Hammer (roter Gummikopf mit gelben Ringen, Holzstiel).
 *  - SoftBin ("muelltonne"): weiche, rundliche grüne Cartoon-Mülltonne mit Deckel + Kissenfüllung. Ursprung = Boden Mitte,
 *      Deckel-Scharnier hinten (−z). `lid` 0 zu … 1 offen, `squish` 0 … 1 = federt (Landung), `size`.
 *  - SparkBurst ("funken", Bewegung `burst`): kurze gelb-orange Comic-Funken + kleine Sterne, ca. 0,8 s. `size`, `mark` 1 = weiß.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

/** Laptop-Maße: Breite (x) 0,36, Tiefe (z) 0,25, Boden 0,022 hoch; Anschluss (lokal) an der rechten Seite */
export const USBL = {w: 0.36, d: 0.25, h: 0.022, lidLen: 0.24, port: [0.18, 0.011, 0.03] as [number, number, number], portW: 0.046, portH: 0.017};
/** Stecker: Griffpunkt (Ursprung, Knickschutz hinten) → Gehäusemitte 0,07 → Spitze 0,155 */
export const USBP = {tip: 0.155, body: 0.038, grip: 0.07};

const screenTex = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 160);
  gr.addColorStop(0, '#5fb4f0');
  gr.addColorStop(1, '#3f7fd0');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 160);
  // Hügel
  g.fillStyle = '#7fcf86';
  g.beginPath();
  g.moveTo(0, 130);
  g.quadraticCurveTo(70, 95, 140, 125);
  g.quadraticCurveTo(200, 150, 256, 118);
  g.lineTo(256, 160);
  g.lineTo(0, 160);
  g.fill();
  // zwei Fenster
  const win = (x: number, y: number, w: number, h: number) => {
    g.fillStyle = '#f5f7fa';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#ffd21a';
    g.fillRect(x, y, w, 12);
    g.fillStyle = '#c9d3de';
    for (let i = 0; i < 3; i++) g.fillRect(x + 8, y + 22 + i * 12, w - 16 - i * 14, 6);
  };
  win(26, 24, 110, 70);
  win(150, 48, 84, 58);
  // Leiste
  g.fillStyle = 'rgba(20,24,30,0.55)';
  g.fillRect(0, 146, 256, 14);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

export const UsbLaptop = ({lid = 1, fold = 0, squish = 0, glow = 0, time = 0}: {lid?: number; fold?: number; squish?: number; glow?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      shell: std('#6f8799', {roughness: 0.45, metalness: 0.15}),
      shellDark: std('#56697a', {roughness: 0.5}),
      keys: std('#2a2f36'),
      key: std('#3b424b'),
      hole: new THREE.MeshStandardMaterial({color: '#0b0c0e', roughness: 0.9}),
      frame: std('#cfd6dd', {metalness: 0.3}),
      tongue: std('#2c6fd6'),
      screen: new THREE.MeshBasicMaterial({map: screenTex ?? undefined, color: screenTex ? '#ffffff' : '#4a8fe0'}),
      bezel: std('#1c2026'),
      stripe: std('#ffd21a'),
      glow: new THREE.MeshBasicMaterial({color: '#5dff8a', transparent: true, opacity: 0, depthWrite: false}),
    }),
    [],
  );
  const {w, d, h, lidLen} = USBL;
  const open = clamp(lid);
  const f = clamp(fold);
  // Deckelwinkel um die Scharnierachse (x): zu = +90° (flach auf der Tastatur) … offen = −17° … falschrum bis −267° (unter dem Boden)
  const openRot = Math.PI / 2 - 0.03 + (-0.3 - Math.PI / 2 + 0.03) * open;
  const rot = openRot + (-1.5 * Math.PI + 0.05 - openRot) * easeInOut(f);
  // ab „flach nach hinten“ wandert das Scharnier um die hintere Kante nach unten
  const pivotDown = clamp((-rot - Math.PI / 2) / Math.PI);
  const sq = clamp(squish);
  const wob = sq * Math.sin(time * 38) * 0.06;
  m.glow.opacity = 0.75 * clamp(glow) * (0.75 + 0.25 * Math.sin(time * 12));
  const [px, py, pz] = USBL.port;
  return (
    <group scale={[1 + 0.08 * sq, 1 - 0.18 * sq, 1 + 0.08 * sq]} rotation={[0, 0, wob]}>
      {/* Boden */}
      <mesh material={m.shell} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* Tastatur + Touchpad */}
      <mesh material={m.keys} position={[0, h + 0.001, -0.02]}>
        <boxGeometry args={[w - 0.04, 0.002, 0.12]} />
      </mesh>
      {Array.from({length: 4}, (_, r) =>
        Array.from({length: 10}, (_, c) => (
          <mesh key={`${r}-${c}`} material={m.key} position={[-0.135 + c * 0.03, h + 0.003, -0.068 + r * 0.03]}>
            <boxGeometry args={[0.022, 0.003, 0.022]} />
          </mesh>
        )),
      )}
      <mesh material={m.shellDark} position={[0, h + 0.001, 0.085]}>
        <boxGeometry args={[0.11, 0.002, 0.06]} />
      </mesh>
      {/* USB-Anschluss rechts (+x): heller Rahmen, schwarzes Loch, blaue Zunge oben (zeigt die richtige Richtung) */}
      <group position={[px, py, pz]}>
        <mesh material={m.frame} position={[-0.001, 0, 0]}>
          <boxGeometry args={[0.004, USBL.portH + 0.008, USBL.portW + 0.008]} />
        </mesh>
        <mesh material={m.hole} position={[0.0005, 0, 0]}>
          <boxGeometry args={[0.004, USBL.portH, USBL.portW]} />
        </mesh>
        <mesh material={m.tongue} position={[0.002, USBL.portH * 0.22, 0]}>
          <boxGeometry args={[0.002, USBL.portH * 0.36, USBL.portW * 0.8]} />
        </mesh>
        <mesh material={m.glow} position={[0.004, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[USBL.portW + 0.05, USBL.portH + 0.05]} />
        </mesh>
      </group>
      {/* Deckel */}
      <group position={[0, h - 0.034 * pivotDown, -d / 2]} rotation={[rot, 0, 0]}>
        <mesh material={m.shell} position={[0, lidLen / 2, -0.006]} castShadow>
          <boxGeometry args={[w, lidLen, 0.012]} />
        </mesh>
        {/* Rückseite: nur ein gelber Zierstreifen (kein Logo) */}
        <mesh material={m.stripe} position={[0, lidLen * 0.5, -0.0125]}>
          <boxGeometry args={[w * 0.9, 0.014, 0.001]} />
        </mesh>
        <mesh material={m.bezel} position={[0, lidLen / 2, 0.0005]}>
          <boxGeometry args={[w - 0.012, lidLen - 0.012, 0.001]} />
        </mesh>
        {open > 0.3 && (
          <mesh material={m.screen} position={[0, lidLen / 2 + 0.004, 0.0012]}>
            <planeGeometry args={[w - 0.036, lidLen - 0.04]} />
          </mesh>
        )}
      </group>
    </group>
  );
};

/** Kabel-Verlauf (im Stecker-System ohne Eigendrehung): flach nach hinten über die Tischkante … hängend */
const cablePoints = (rope: number) => {
  const flat: [number, number, number][] = [
    [0, 0, -USBP.body],
    [0, -0.008, -0.12],
    [0.015, -0.012, -0.24],
    [0.02, -0.012, -0.34],
    [0.025, -0.05, -0.42],
    [0.02, -0.4, -0.47],
    [0.0, -0.74, -0.55],
  ];
  const hang: [number, number, number][] = [
    [0, 0, -USBP.body],
    [0, -0.03, -0.09],
    [0.01, -0.12, -0.12],
    [0.02, -0.26, -0.1],
    [0.03, -0.4, -0.06],
    [0.03, -0.55, -0.02],
    [0.02, -0.7, 0.0],
  ];
  const k = clamp(rope);
  return flat.map((p, i) => new THREE.Vector3(p[0] + (hang[i][0] - p[0]) * k, p[1] + (hang[i][1] - p[1]) * k, p[2] + (hang[i][2] - p[2]) * k));
};

export const UsbPlug = ({tilt = 0, rope = 0, belt = 0, helm = 0, nod = 0, time = 0}: {tilt?: number; rope?: number; belt?: number; helm?: number; nod?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      body: std('#2b3038', {roughness: 0.55}),
      ridge: std('#3c434d'),
      metal: std('#c9ced4', {metalness: 0.8, roughness: 0.3}),
      tongue: std('#2c6fd6'),
      hole: new THREE.MeshStandardMaterial({color: '#151719'}),
      cable: std('#8b939c', {roughness: 0.75, flatShading: false}),
      belt: std('#d7263d'),
      buckle: std('#e6e9ec', {metalness: 0.6, roughness: 0.3}),
      helm: std('#ffd21a', {roughness: 0.35}),
      helmStripe: std('#d7263d'),
    }),
    [],
  );
  const rq = Math.round(clamp(rope) * 20) / 20;
  const cableGeo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints(rq)), 40, 0.013, 8, false), [rq]);
  const nodA = clamp(nod) * Math.sin(time * 9) * 0.35;
  const b = easeInOut(clamp(belt));
  const hm = easeInOut(clamp(helm));
  return (
    <group rotation={[nodA, 0, 0]}>
    <group position={[0, 0, USBP.grip]}>
      <mesh geometry={cableGeo} material={m.cable} castShadow />
      <group rotation={[0, 0, (tilt * Math.PI) / 180]}>
        {/* Gehäuse */}
        <mesh material={m.body} position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.06, 0.03, 0.076]} />
        </mesh>
        {[-0.022, -0.008, 0.006].map((z) => (
          <mesh key={z} material={m.ridge} position={[0, 0.0155, z]}>
            <boxGeometry args={[0.05, 0.003, 0.006]} />
          </mesh>
        ))}
        {/* Knickschutz */}
        <mesh material={m.body} position={[0, 0, -0.045]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.02, 0.02, 8]} />
        </mesh>
        {/* Metallzunge mit blauer Kunststoff-Zunge auf einer Hälfte (zeigt, wie herum er ist) */}
        <mesh material={m.metal} position={[0, 0, 0.038 + 0.0235]} castShadow>
          <boxGeometry args={[0.042, 0.014, 0.047]} />
        </mesh>
        <mesh material={m.tongue} position={[0, -0.0035, 0.038 + 0.0245]}>
          <boxGeometry args={[0.034, 0.005, 0.046]} />
        </mesh>
        {[-0.008, 0.008].map((x) => (
          <mesh key={x} material={m.hole} position={[x, 0.0071, 0.07]}>
            <boxGeometry args={[0.006, 0.001, 0.006]} />
          </mesh>
        ))}
        {/* winziger Sicherheitsgurt (diagonal) + Schnalle */}
        {b > 0.02 && (
          <group scale={[b, b, b]}>
            <mesh material={m.belt} rotation={[0, 0.55, 0]}>
              <torusGeometry args={[0.04, 0.0045, 4, 16]} />
            </mesh>
            <mesh material={m.belt} position={[0, 0.0175, 0]} rotation={[0, 0.55, 0]}>
              <boxGeometry args={[0.075, 0.003, 0.012]} />
            </mesh>
            <mesh material={m.buckle} position={[0.006, 0.019, 0.004]} rotation={[0, 0.55, 0]}>
              <boxGeometry args={[0.018, 0.006, 0.016]} />
            </mesh>
          </group>
        )}
        {/* winziger Helm */}
        {hm > 0.02 && (
          <group position={[0, 0.015 + 0.04 * (1 - hm), -0.01]} scale={[hm, hm, hm]}>
            <mesh material={m.helm} castShadow>
              <sphereGeometry args={[0.032, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh material={m.helmStripe} position={[0, 0.0005, 0]} scale={[0.25, 1.02, 1.02]}>
              <sphereGeometry args={[0.032, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh material={m.helm} position={[0, 0.002, 0.03]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.05, 0.004, 0.018]} />
            </mesh>
          </group>
        )}
      </group>
    </group>
    </group>
  );
};

/** Kleiner Cartoon-Hammer: Griff am Ursprung, Stiel entlang −y, roter Gummikopf bei y −0.28 (Kopfachse entlang z) */
export const CartoonMallet = () => {
  const m = useMemo(() => ({wood: std('#d29a5a'), grip: std('#2f6fd6'), head: std('#e5383b', {roughness: 0.4}), ring: std('#ffd21a'), face: std('#c42a2d')}), []);
  return (
    <group>
      <mesh material={m.grip} position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.021, 0.021, 0.11, 8]} />
      </mesh>
      <mesh material={m.wood} position={[0, -0.16, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.018, 0.22, 8]} />
      </mesh>
      <group position={[0, -0.29, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={m.head} castShadow>
          <cylinderGeometry args={[0.058, 0.058, 0.15, 12]} />
        </mesh>
        {[-0.062, 0.062].map((y) => (
          <mesh key={y} material={m.ring} position={[0, y, 0]}>
            <cylinderGeometry args={[0.061, 0.061, 0.018, 12]} />
          </mesh>
        ))}
        {[-0.077, 0.077].map((y) => (
          <mesh key={`f${y}`} material={m.face} position={[0, y, 0]}>
            <cylinderGeometry args={[0.05, 0.056, 0.008, 12]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** Weiche grüne Cartoon-Mülltonne mit Kissenfüllung (Landeplatz für den Laptop) */
export const SoftBin = ({lid = 0, squish = 0, time = 0}: {lid?: number; squish?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      body: std('#4fb36b', {roughness: 0.5, flatShading: false, side: THREE.DoubleSide}),
      rim: std('#3b8f55', {roughness: 0.5}),
      lid: std('#5cc479', {roughness: 0.45, flatShading: false}),
      wheel: std('#2a2e33'),
      pillow: std('#fbf7ef', {roughness: 0.9, flatShading: false}),
      pillow2: std('#ffd9e6', {roughness: 0.9, flatShading: false}),
      handle: std('#2f7a47'),
    }),
    [],
  );
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const y = (i / 12) * 0.82;
      const r = 0.27 + 0.05 * (i / 12) + 0.035 * Math.sin((Math.PI * i) / 12);
      pts.push(new THREE.Vector2(r, y));
    }
    return new THREE.LatheGeometry(pts, 18);
  }, []);
  const sq = clamp(squish);
  const bounce = sq * Math.cos(time * 14) * 0.5 + sq * 0.5;
  const op = easeInOut(clamp(lid));
  return (
    <group scale={[1 + 0.07 * bounce, 1 - 0.12 * bounce, 1 + 0.07 * bounce]}>
      <mesh geometry={geo} material={m.body} castShadow receiveShadow />
      <mesh material={m.rim} position={[0, 0.8, 0]}>
        <torusGeometry args={[0.32, 0.025, 6, 20]} />
      </mesh>
      {/* Kissen drin (weich!) */}
      <mesh material={m.pillow} position={[0.04, 0.72, 0.02]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.22, 12, 8]} />
      </mesh>
      <mesh material={m.pillow2} position={[-0.1, 0.74, -0.08]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.15, 10, 8]} />
      </mesh>
      {/* Griff + Räder hinten */}
      <mesh material={m.handle} position={[0, 0.76, -0.36]}>
        <boxGeometry args={[0.3, 0.04, 0.05]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.wheel} position={[s * 0.2, 0.08, -0.28]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 10]} />
        </mesh>
      ))}
      {/* Deckel (Scharnier hinten) */}
      <group position={[0, 0.83, -0.33]} rotation={[-op * 1.9, 0, 0]}>
        <mesh material={m.lid} position={[0, 0.02, 0.33]} scale={[1, 0.22, 1]} castShadow>
          <sphereGeometry args={[0.35, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh material={m.rim} position={[0, 0.0, 0.33]}>
          <cylinderGeometry args={[0.35, 0.35, 0.03, 18]} />
        </mesh>
      </group>
    </group>
  );
};

const SPARKS = (() => {
  const r = rng(913);
  return Array.from({length: 26}, () => {
    const a = r() * Math.PI * 2;
    const e = (r() - 0.3) * 1.2;
    const sp = 0.9 + r() * 1.4;
    return {dx: Math.cos(a) * Math.cos(e), dy: Math.sin(e) + 0.25, dz: Math.sin(a) * Math.cos(e), sp, len: 0.04 + r() * 0.05, c: r()};
  });
})();

export const SparkBurst = ({time, white = false, size = 0}: {time: number; white?: boolean; size?: number}) => {
  const mats = useMemo(
    () => [new THREE.MeshBasicMaterial({color: '#ffe14a', transparent: true}), new THREE.MeshBasicMaterial({color: '#ff9a2e', transparent: true}), new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true})],
    [],
  );
  if (time <= 0 || time > 0.9) return null;
  const k = 1 + size;
  const fade = 1 - clamp((time - 0.45) / 0.45);
  mats.forEach((mm) => (mm.opacity = fade));
  return (
    <group scale={[k, k, k]}>
      {SPARKS.map((s, i) => {
        const dist = s.sp * (1 - Math.exp(-time * 6)) * 0.32;
        const g = -0.6 * time * time;
        const p = new THREE.Vector3(s.dx * dist, s.dy * dist + g, s.dz * dist);
        const dir = new THREE.Vector3(s.dx, s.dy - 1.2 * time, s.dz).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        return (
          <mesh key={i} material={white ? mats[2] : mats[s.c < 0.55 ? 0 : 1]} position={p} quaternion={q}>
            <boxGeometry args={[0.008, s.len * (1.2 - time), 0.008]} />
          </mesh>
        );
      })}
      {/* Comic-Stern in der Mitte */}
      {time < 0.35 && (
        <mesh material={white ? mats[2] : mats[0]} scale={(1 - time / 0.35) * 0.09 + 0.02}>
          <octahedronGeometry args={[1, 0]} />
        </mesh>
      )}
    </group>
  );
};
