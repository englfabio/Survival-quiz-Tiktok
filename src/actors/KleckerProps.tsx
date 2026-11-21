import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut} from '../lib/anim';
import {T} from '../ui/theme';
import {useFontTexture} from './ToothProps';

/**
 * Spezial „Von einer Taube angekackt“ – alles comichaft, sauber und harmlos. Den Tauben passiert nie etwas.
 *
 *  - ShoulderSplat (Dummy-Wert `klecks` 0 … 1): stilisierter weißer Cartoon-Fleck oben auf der LINKEN Schulter (im Oberkörper-System).
 *  - AngelWings (Dummy-Wert `wings`): große weiße Cartoon-Flügel am Rücken. 0 … 1 = wachsen + gehen auf, 1 = offen und wippen leicht,
 *      bis 2 = kräftiger Flügelschlag (Fliegen).
 *  - FallingBlob ("klecks", "klecks2"): weißer Cartoon-Tropfen (Bewegung `fall`, Weg über Zeitpunkte) bzw. flacher Fleck (`park`). `size`.
 *  - InvoicePad (Dummy: both 'notepad', Bewegung `padwrite`): Schreibblock „RECHNUNG – REINIGUNG“, Zeilen erscheinen beim Schreiben.
 *  - InvoiceEnvelope ("umschlag"): Briefumschlag „RECHNUNG – REINIGUNG“ an „Frau Taube, Oberleitung 1“, `mark` 1 = Briefmarke klebt drauf
 *      (ploppt auf). Vorderseite +z, Ursprung = Mitte. Halten: `hand` 1 (rechte Hand), in der Posttasche: `"attach": "brieftaube"`.
 *  - PlugStation ("ladestation"): Tauben-Ladestation unten am Holz-Strommast. Ursprung = Mastachse am Boden, Vorderseite +z
 *      (am Mast x 4 mit face 90 → zeigt nach +x). Steckdosen-Kasten (Front z 0.27, Mitte y 1.0) mit Lämpchen, Schild „TAUBEN-LADESTATION“
 *      darüber, riesiger Stecker mit dickem Kabel, das am Mast hoch zur Oberleitung läuft. `fill` 0 = steckt … 1 = 0,4 m herausgezogen,
 *      `glow` 1 = Lämpchen grün (Strom an), 0 = rot.
 *  - BenchProp ("parkbank"): Parkbank aus dem Park-Video (Sitz 0,45 m, Lehne oben ca. 0,88 m bei z −0.23), Sitz zeigt nach +z.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.7, flatShading: true, ...extra});
const sphere = new THREE.SphereGeometry(1, 12, 8);
const WHITE = '#fbfbf6';

// ---------- Schulter-Klecks ----------
export const ShoulderSplat = ({amount = 0}: {amount?: number}) => {
  const w = useMemo(() => std(WHITE, {roughness: 0.3, flatShading: false}), []);
  const k = easeInOut(clamp(amount));
  if (k < 0.01) return null;
  // flacher Haupt-Fleck auf der Schulterkuppe + kleine Spritzer + zwei kurze „Nasen“ nach vorn (comichaft, nicht eklig)
  return (
    <group position={[0.165, 0.5, 0.02]} rotation={[0, 0, -0.55]} scale={[k, k, k]}>
      <mesh geometry={sphere} material={w} scale={[0.078, 0.022, 0.072]} />
      <mesh geometry={sphere} material={w} position={[0.02, 0.012, -0.01]} scale={[0.042, 0.018, 0.04]} />
      <mesh geometry={sphere} material={w} position={[-0.05, -0.006, 0.05]} scale={[0.026, 0.014, 0.024]} />
      <mesh geometry={sphere} material={w} position={[0.065, -0.008, 0.045]} scale={[0.02, 0.012, 0.02]} />
      <mesh geometry={sphere} material={w} position={[-0.075, -0.012, -0.03]} scale={[0.016, 0.01, 0.016]} />
      <mesh geometry={sphere} material={w} position={[-0.01, -0.03, 0.075]} rotation={[0.9, 0, 0]} scale={[0.02, 0.04, 0.014]} />
      <mesh geometry={sphere} material={w} position={[0.03, -0.022, 0.07]} rotation={[0.9, 0, 0]} scale={[0.014, 0.028, 0.012]} />
    </group>
  );
};

// ---------- Engelsflügel ----------
const Feather = ({len, w, mat, z = 0}: {len: number; w: number; mat: THREE.Material; z?: number}) => (
  <mesh geometry={sphere} material={mat} position={[len / 2, 0, z]} scale={[len / 2, w, 0.018]} castShadow />
);

const Wing = ({side, open, flap, m}: {side: 1 | -1; open: number; flap: number; m: {a: THREE.Material; b: THREE.Material; c: THREE.Material}}) => {
  // Drehpunkt am Rücken; Flügel geht nach außen (+x * side) und leicht nach oben/hinten. open 0 = eng am Rücken gefaltet
  const fold = (1 - open) * 1.25;
  return (
    <group scale={[side, 1, 1]}>
      <group rotation={[0, -0.35 - fold, 0.32 + flap]}>
        {/* Arm-Teil (Deckfedern) */}
        <mesh geometry={sphere} material={m.a} position={[0.2, 0.03, 0]} scale={[0.22, 0.09, 0.035]} castShadow />
        {/* Schwungfedern: Fächer nach außen, unten länger */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <group key={i} position={[0.12 + i * 0.075, -0.02, -0.01 - 0.003 * i]} rotation={[0, 0, -0.35 - i * 0.2]}>
            <Feather len={0.26 + 0.06 * i} w={0.045} mat={i % 2 ? m.b : m.a} />
          </group>
        ))}
        {/* äußere Handschwingen nach oben-außen */}
        {[0, 1, 2].map((i) => (
          <group key={`o${i}`} position={[0.48, 0.03, -0.03]} rotation={[0, 0, 0.15 - i * 0.3]}>
            <Feather len={0.36 - 0.04 * i} w={0.05} mat={m.a} />
          </group>
        ))}
        {/* kleine Deckfedern oben (hellgrauer Rand für Tiefe) */}
        {[0, 1, 2, 3].map((i) => (
          <group key={`d${i}`} position={[0.08 + i * 0.09, 0.07, 0.02]} rotation={[0, 0, -0.9]}>
            <Feather len={0.12} w={0.035} mat={m.c} />
          </group>
        ))}
      </group>
    </group>
  );
};

export const AngelWings = ({amount = 0, time = 0}: {amount?: number; time?: number}) => {
  const m = useMemo(() => ({a: std('#ffffff', {roughness: 0.55}), b: std('#f1f2ef', {roughness: 0.6}), c: std('#dfe3e8', {roughness: 0.6})}), []);
  if (amount < 0.01) return null;
  const grow = easeInOut(clamp(amount / 0.6));
  const open = easeInOut(clamp((amount - 0.3) / 0.7));
  const strong = clamp(amount - 1);
  const flap = Math.sin(time * (5 + 5 * strong)) * (0.12 + 0.45 * strong) * open;
  return (
    <group position={[0, 0.44, -0.14]} scale={grow * 1.15}>
      <group position={[0.05, 0, 0]}>
        <Wing side={1} open={open} flap={flap} m={m} />
      </group>
      <group position={[-0.05, 0, 0]}>
        <Wing side={-1} open={open} flap={flap} m={m} />
      </group>
    </group>
  );
};

// ---------- fallender Cartoon-Klecks ----------
export const FallingBlob = ({falling, time = 0, size = 0}: {falling: boolean; time?: number; size?: number}) => {
  const w = useMemo(() => std(WHITE, {roughness: 0.3, flatShading: false}), []);
  const s = 1 + size;
  if (falling) {
    const wob = 1 + 0.08 * Math.sin(time * 30);
    return (
      <group scale={s}>
        <mesh geometry={sphere} material={w} scale={[0.045 * wob, 0.055 / wob, 0.045 * wob]} />
        <mesh material={w} position={[0, 0.06, 0]}>
          <coneGeometry args={[0.032, 0.07, 10]} />
        </mesh>
        {/* kleine Fall-Striche (comichaft) */}
        {[-0.03, 0.03].map((x) => (
          <mesh key={x} position={[x, 0.15, 0]}>
            <boxGeometry args={[0.006, 0.09, 0.006]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group scale={s}>
      <mesh geometry={sphere} material={w} position={[0, 0.008, 0]} scale={[0.07, 0.016, 0.065]} />
      <mesh geometry={sphere} material={w} position={[0.06, 0.004, 0.04]} scale={[0.02, 0.01, 0.02]} />
      <mesh geometry={sphere} material={w} position={[-0.06, 0.004, -0.03]} scale={[0.018, 0.009, 0.018]} />
    </group>
  );
};

// ---------- Rechnungsblock ----------
const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return {c, g: c.getContext('2d')!};
};
const tex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Zeilen der Reinigungsrechnung (step = so viele Zeilen sind schon geschrieben) */
const INVOICE_LINES = ['1× Schulter reinigen', '1× Klecks entfernen', 'Express-Zuschlag', 'SUMME: 19,90 €'];
const padTexture = (step: number) => () => {
  const {c, g} = canvas(400, 520);
  g.fillStyle = '#fffdf3';
  g.fillRect(0, 0, 400, 520);
  // Karo-Linien
  g.strokeStyle = '#cfe0f0';
  g.lineWidth = 2;
  for (let y = 40; y < 520; y += 34) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(400, y);
    g.stroke();
  }
  g.fillStyle = '#1e2226';
  g.textAlign = 'center';
  g.font = `800 74px ${T.font}`;
  g.fillText('RECHNUNG', 200, 92);
  g.fillStyle = '#d8392b';
  g.font = `800 44px ${T.font}`;
  g.fillText('– REINIGUNG –', 200, 146);
  g.textAlign = 'left';
  g.fillStyle = '#1f4fd6';
  g.font = `700 36px ${T.font}`;
  INVOICE_LINES.slice(0, step).forEach((l, i) => {
    if (i === 3) {
      g.fillStyle = '#d8392b';
      g.font = `800 42px ${T.font}`;
    }
    g.fillText(l, 34, 222 + i * 70);
  });
  if (step >= 4) {
    g.strokeStyle = '#d8392b';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(30, 448);
    g.lineTo(300, 448);
    g.stroke();
  }
  return tex(c);
};

export const InvoicePad = ({progress = 1}: {progress?: number}) => {
  const step = Math.min(4, Math.floor(clamp(progress) * 4.999));
  const t = useFontTexture(padTexture(step), `Rechnungsblock ${step}`);
  const mat = useMemo(() => (t ? new THREE.MeshStandardMaterial({map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.35, roughness: 0.85}) : null), [t]);
  return (
    <group>
      {/* Pappe hinten + Spiralbindung oben */}
      <mesh position={[0, 0, -0.006]} castShadow>
        <boxGeometry args={[0.2, 0.26, 0.01]} />
        <meshStandardMaterial color="#7a5a3e" />
      </mesh>
      {mat && (
        <mesh material={mat} position={[0, -0.005, 0.0005]}>
          <planeGeometry args={[0.19, 0.247]} />
        </mesh>
      )}
      {[-0.07, -0.035, 0, 0.035, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.128, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.009, 0.0025, 4, 8]} />
          <meshStandardMaterial color="#9aa1a8" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

/** Kugelschreiber (rechte Hand beim Schreiben), Spitze am Ursprung, Schaft nach +y */
export const Pen = () => (
  <group>
    <mesh position={[0, 0.065, 0]}>
      <cylinderGeometry args={[0.007, 0.007, 0.12, 6]} />
      <meshStandardMaterial color="#1f4fd6" />
    </mesh>
    <mesh position={[0, 0.003, 0]}>
      <coneGeometry args={[0.007, 0.012, 6]} />
      <meshStandardMaterial color="#d9dde2" metalness={0.5} />
    </mesh>
  </group>
);

// ---------- Umschlag mit Briefmarke ----------
const envelopeTexture = (stamp: boolean) => () => {
  const {c, g} = canvas(520, 320);
  g.fillStyle = '#f6f1e4';
  g.fillRect(0, 0, 520, 320);
  g.strokeStyle = '#d9cfb8';
  g.lineWidth = 4;
  g.strokeRect(6, 6, 508, 308);
  g.fillStyle = '#d8392b';
  g.font = `800 58px ${T.font}`;
  g.textAlign = 'left';
  g.fillText('RECHNUNG –', 30, 92);
  g.fillText('REINIGUNG', 30, 152);
  g.fillStyle = '#2c3238';
  g.font = `600 34px ${T.font}`;
  g.fillText('An: Frau Taube', 30, 230);
  g.fillText('Oberleitung 1', 30, 272);
  // Feld für die Briefmarke
  g.strokeStyle = '#b9ae96';
  g.setLineDash([8, 6]);
  g.lineWidth = 3;
  g.strokeRect(380, 24, 116, 136);
  g.setLineDash([]);
  if (stamp) {
    // Briefmarke: gezackter Rand, blaues Bild mit weißer Comic-Taube + Wert
    g.fillStyle = '#ffffff';
    g.fillRect(376, 20, 124, 144);
    g.fillStyle = '#f6f1e4';
    for (let i = 0; i <= 8; i++) {
      for (const [x, y] of [
        [376 + i * 15.5, 20],
        [376 + i * 15.5, 164],
      ]) {
        g.beginPath();
        g.arc(x, y, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
    for (let i = 0; i <= 9; i++) {
      for (const [x, y] of [
        [376, 20 + i * 16],
        [500, 20 + i * 16],
      ]) {
        g.beginPath();
        g.arc(x, y, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = '#3f8fd6';
    g.fillRect(388, 32, 100, 120);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(438, 96, 26, 18, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(462, 78, 11, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffc400';
    g.beginPath();
    g.moveTo(472, 78);
    g.lineTo(484, 82);
    g.lineTo(472, 85);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = `800 30px ${T.font}`;
    g.textAlign = 'center';
    g.fillText('85', 438, 144);
    // Poststempel-Wellen
    g.strokeStyle = 'rgba(40,44,52,0.55)';
    g.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      for (let x = 300; x <= 400; x += 4) {
        const y = 60 + i * 18 + 6 * Math.sin(x / 9);
        if (x === 300) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  return tex(c);
};

export const InvoiceEnvelope = ({mark = 0, size = 0, time = 0}: {mark?: number; size?: number; time?: number}) => {
  const st = mark > 0.5;
  const t = useFontTexture(envelopeTexture(st), `Umschlag Reinigung ${st}`);
  const mat = useMemo(() => (t ? new THREE.MeshStandardMaterial({map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.4, roughness: 0.85}) : null), [t]);
  const back = useMemo(() => std('#ebe4d2', {roughness: 0.9}), []);
  // Briefmarke ploppt beim Aufkleben kurz auf
  const pop = st ? 1 + 0.12 * Math.sin(Math.PI * clamp((mark - 0.5) * 4)) : 1;
  void time;
  return (
    <group scale={(1 + size) * pop}>
      <mesh material={back} castShadow>
        <boxGeometry args={[0.26, 0.16, 0.005]} />
      </mesh>
      {mat && (
        <mesh material={mat} position={[0, 0, 0.003]}>
          <planeGeometry args={[0.26, 0.16]} />
        </mesh>
      )}
      {/* Rückseite: Umschlag-Klappe */}
      <mesh position={[0, 0.025, -0.003]} rotation={[0, Math.PI, Math.PI]}>
        <circleGeometry args={[0.15, 3]} />
        <meshStandardMaterial color="#e2d9c2" />
      </mesh>
    </group>
  );
};

// ---------- Tauben-Ladestation am Strommast ----------
const signTexture = () => () => {
  const {c, g} = canvas(560, 230);
  g.fillStyle = '#1e2226';
  g.beginPath();
  g.roundRect(4, 4, 552, 222, 26);
  g.fill();
  g.strokeStyle = '#ffc400';
  g.lineWidth = 10;
  g.stroke();
  // Blitz
  g.fillStyle = '#ffc400';
  g.beginPath();
  g.moveTo(84, 26);
  g.lineTo(40, 128);
  g.lineTo(78, 128);
  g.lineTo(60, 206);
  g.lineTo(122, 96);
  g.lineTo(84, 96);
  g.lineTo(104, 26);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.font = `800 78px ${T.font}`;
  g.fillText('TAUBEN-', 330, 102);
  g.fillText('LADESTATION', 330, 186);
  return tex(c);
};

/** Riesiger Comic-Stecker: Griffkörper entlang +z, Stifte nach −z (Ursprung = Stirnfläche, an der die Stifte sitzen) */
const BigPlug = ({m}: {m: Record<string, THREE.Material>}) => (
  <group>
    {/* Stifte */}
    {[-0.055, 0.055].map((x) => (
      <mesh key={x} material={m.steel} position={[x, 0, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.14, 8]} />
      </mesh>
    ))}
    {/* Stirnplatte + Griffkörper (nach hinten schmaler) */}
    <mesh material={m.plug} position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.13, 0.13, 0.06, 14]} />
    </mesh>
    <mesh material={m.plug} position={[0, 0, 0.17]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.085, 0.115, 0.22, 12]} />
    </mesh>
    {/* Griffrillen */}
    {[0.11, 0.16, 0.21].map((z) => (
      <mesh key={z} material={m.plugDark} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.112 - (z - 0.1) * 0.13, 0.112 - (z - 0.1) * 0.13, 0.018, 12]} />
      </mesh>
    ))}
    {/* Knickschutz */}
    <mesh material={m.plugDark} position={[0, 0, 0.31]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.035, 0.06, 0.08, 10]} />
    </mesh>
  </group>
);

const SOCKET_Z = 0.27;
const SOCKET_Y = 1.0;
export const PLUG_OUT = 0.4;

export const PlugStation = ({fill = 0, glow = 1, time = 0}: {fill?: number; glow?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      box: std('#cfd5da', {roughness: 0.5}),
      face: std('#eef1f3', {roughness: 0.4}),
      hole: std('#2a2d31'),
      steel: std('#c8ccd0', {metalness: 0.7, roughness: 0.3, flatShading: false}),
      plug: std('#f2f2ee', {roughness: 0.45}),
      plugDark: std('#2b2f35', {roughness: 0.6}),
      cable: new THREE.MeshStandardMaterial({color: '#1d2024', roughness: 0.55}),
      strap: std('#5e6670'),
      green: new THREE.MeshStandardMaterial({color: '#3ddc5a', emissive: '#2bd14b', emissiveIntensity: 2.0}),
      red: new THREE.MeshStandardMaterial({color: '#ff3b2f', emissive: '#ff2a1a', emissiveIntensity: 1.8}),
    }),
    [],
  );
  const sign = useFontTexture(signTexture(), 'Tauben-Ladestation');
  const signMat = useMemo(() => (sign ? new THREE.MeshStandardMaterial({map: sign, emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: 0.4, roughness: 0.7}) : null), [sign]);
  const out = easeInOut(clamp(fill)) * PLUG_OUT;
  // nach dem Herausziehen hängt der Stecker in der Hand leicht nach unten
  const sag = 0.04 * clamp(fill - 0.5) * 2;
  const plugZ = SOCKET_Z + 0.005 + out;
  const back: [number, number, number] = [0, SOCKET_Y - sag, plugZ + 0.34];
  // Kabel: von hinten am Stecker in einem Bogen zum Mast und daran hoch bis unter den Querträger
  const cableGeo = useMemo(() => {
    const pts = [
      new THREE.Vector3(...back),
      new THREE.Vector3(0, back[1] + 0.05, back[2] + 0.12),
      new THREE.Vector3(0, SOCKET_Y + 0.38, 0.34 + out * 0.6),
      new THREE.Vector3(0, SOCKET_Y + 0.75, 0.2),
      new THREE.Vector3(0, 2.6, 0.175),
      new THREE.Vector3(0, 4.5, 0.155),
      new THREE.Vector3(0, 6.15, 0.14),
      new THREE.Vector3(0, 6.42, 0.06),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.028, 6, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [out, sag]);
  const on = glow > 0.5;
  void time;
  return (
    <group>
      {/* Halteschellen am Mast */}
      {[SOCKET_Y + 0.75, 2.6, 4.5].map((y) => (
        <mesh key={y} material={m.strap} position={[0, y, 0]}>
          <cylinderGeometry args={[0.185 - y * 0.007, 0.185 - y * 0.007, 0.04, 10]} />
        </mesh>
      ))}
      {/* Steckdosen-Kasten */}
      <mesh material={m.box} position={[0, SOCKET_Y, SOCKET_Z - 0.05]} castShadow>
        <boxGeometry args={[0.38, 0.46, 0.1]} />
      </mesh>
      <mesh material={m.face} position={[0, SOCKET_Y, SOCKET_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.012, 16]} />
      </mesh>
      {[-0.055, 0.055].map((x) => (
        <mesh key={x} material={m.hole} position={[x, SOCKET_Y, SOCKET_Z + 0.007]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.004, 8]} />
        </mesh>
      ))}
      {/* Lämpchen oben am Kasten: grün = Strom an, rot = aus */}
      <mesh material={on ? m.green : m.red} position={[0.12, SOCKET_Y + 0.18, SOCKET_Z + 0.002]}>
        <sphereGeometry args={[0.026, 10, 8]} />
      </mesh>
      {/* Schild */}
      {signMat && (
        <group position={[0, SOCKET_Y + 0.62, 0.2]}>
          <mesh position={[0, 0, -0.012]}>
            <boxGeometry args={[0.62, 0.27, 0.02]} />
            <meshStandardMaterial color="#1e2226" />
          </mesh>
          <mesh material={signMat} position={[0, 0, 0.0]}>
            <planeGeometry args={[0.6, 0.246]} />
          </mesh>
        </group>
      )}
      {/* Stecker */}
      <group position={[0, SOCKET_Y - sag, plugZ]} rotation={[-sag * 2, 0, 0]}>
        <BigPlug m={m} />
      </group>
      <mesh geometry={cableGeo} material={m.cable} castShadow />
    </group>
  );
};
