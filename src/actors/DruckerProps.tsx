import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {canvasTex, fitText, TextPlane} from './WgProps';
import {GardenHat} from './WeckerProps';
import {T} from '../ui/theme';

/**
 * Spezial „Drucker macht sich selbstständig“ – alles comichaft und harmlos, Low-Poly-Cartoon-Stil, KEINE Marken/Logos.
 *
 *  - InkPrinter ("drucker"): markenloser Tintenstrahldrucker 0,46 × 0,22 × 0,34 m (Ursprung = Boden-Mitte, Vorderseite mit Ausgabeschlitz +z),
 *      Papierfach hinten oben (Blätter stehen schräg), Ausgabefach vorn, kleines Display mit Cartoon-Augen (rechts oben), Knöpfe, Status-Lämpchen,
 *      gelber Zierstreifen (kein Logo). Werte: `rumble` = rattert wie besessen (Zittern + kleine Hüpfer), `glow` = Display/Lämpchen leuchten,
 *      `mark` = Druckkopf saust hinter dem Schlitz hin und her, `glasses` = Sonnenbrille vor dem Display, `lei` = Blumenkette, `gardenhat` = Strohhut,
 *      `good` 1 = Display zeigt fröhliche Augen (^ ^), `squish` = Stauchen; Bewegung `hop` = hüpft (Periode 0,42 s, 0,1 m hoch, Weg über Zeitpunkte),
 *      `tilt` = Neigung nach vorn (Grad).
 *  - Printer3D ("drucker3d"): Low-Poly-3D-Drucker 0,36 × 0,46 × 0,36 m (Rahmen, Druckplatte, Druckkopf orange, Filamentrolle, Display).
 *      `fill` 0 … 0,75 = entsteht Blatt für Blatt aus Papier (weiße Teile wachsen von unten nach oben), 0,75 … 1 = Papier wird zum echten Drucker
 *      (Farben kommen); `mark` = Druckkopf fährt, `glow` = Düse/Display leuchten, `rumble`. Druckplatte bei PRINTER3D.bed (lokal).
 *  - PrintSheet ("blatt", "blatt2" … "blatt6"): Blatt Papier 0,21 × 0,297 m, liegt flach (Schrift oben, Oberkante nach −z), Ursprung = Mitte.
 *      Feld `text`: 'kuendigung' = Überschrift „KÜNDIGUNG“, Text-Zeilen, Unterschriftszeile („Unterschrift“); `fill` 0 … 1 = Unterschrift wird
 *      gekritzelt; 'text' = bedrucktes Blatt (Zeilen); 'hawaii' = Urlaubs-Prospekt (Palme, Sonne, „HAWAII“). `tilt` = Drehung um x (Grad), `size`.
 *  - SheetBurst ("blattregen", Bewegung `burst`): Drucker spuckt Blatt um Blatt aus (alle 0,13 s), sie flattern nach +z und bleiben auf dem Boden
 *      liegen (`drop` = Höhe über dem Boden), `size` = Kraft.
 *  - PaperStack ("papierstapel"): Stapel Druckerpapier, `fill` 0 … 1 = Höhe bis 0,3 m.
 *  - Pen ("kuli"): Kugelschreiber 0,14 m entlang x (Spitze +x), blaue Kappe; `tilt`. In der Hand: Dummy-Gegenstand 'pen'.
 *  - Passport ("reisepass"): gedruckter Fake-Reisepass (weinrot, goldene Schrift „REISEPASS“ + Drucker-Symbol statt Wappen), 0,1 × 0,14 m, flach.
 *  - FlightTicket ("flugticket"): Bordkarte „HAWAII · ONE-WAY“ ohne Airline/Logo, 0,21 × 0,085 m, flach.
 *  - MiniSuitcase ("minikoffer"): kleiner oranger Koffer mit Griff + Urlaubs-Aufklebern (Sonne, Palme), 0,2 × 0,15 × 0,08 m, Ursprung = Boden.
 *  - PrintObject ("druckobjekt1" … "druckobjekt8"): Feld `text` 'pizza' | 'gold' | 'ente'; `fill` 0 … 1 = wird von unten nach oben gedruckt
 *      (wächst aus der Platte), `glow` = frisch gedruckt (leuchtet), `size`.
 *  - RoomLight ("zimmerlicht"): Deckenleuchte + Raumlicht für Nacht-Bühnen, `glow` 0 = aus … 1 = alle Lichter an (bei (0, 0) platzieren).
 *  - ZzzBadge (Dummy-Wert `zzz`): drei Comic-„Z“ steigen über dem Kopf auf (schlafend/schlaftrunken).
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

// ---------- Display mit Cartoon-Augen ----------
const eyesTex = (mode: string) =>
  canvasTex(200, 100, (g) => {
    g.fillStyle = '#1b3b4a';
    g.fillRect(0, 0, 200, 100);
    g.strokeStyle = '#bff4ff';
    g.fillStyle = '#bff4ff';
    g.lineWidth = 12;
    g.lineCap = 'round';
    [62, 138].forEach((x) => {
      if (mode === 'happy') {
        g.beginPath();
        g.arc(x, 62, 22, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      } else if (mode === 'closed') {
        g.beginPath();
        g.moveTo(x - 20, 52);
        g.lineTo(x + 20, 52);
        g.stroke();
      } else {
        g.beginPath();
        g.ellipse(x, 50, 15, 22, 0, 0, Math.PI * 2);
        g.fill();
      }
    });
  });

export const PRINTER = {w: 0.46, h: 0.22, d: 0.34, slotY: 0.075};

export const InkPrinter = ({rumble = 0, glow = 0, mark = 0, glasses = 0, lei = 0, hat = 0, good = 0, squish = 0, time = 0}: {rumble?: number; glow?: number; mark?: number; glasses?: number; lei?: number; hat?: number; good?: number; squish?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      body: std('#e4e7ec'),
      lid: std('#3b4048'),
      dark: std('#1c1f24'),
      tray: std('#cfd4db'),
      paper: std('#fbfbf7', {roughness: 0.9}),
      stripe: std('#f5c518'),
      btnG: std('#3fbf5f'),
      btnB: std('#3f8fe0'),
      head: std('#2b2f36'),
      ink: std('#29b6d8'),
      lens: std('#111317', {roughness: 0.2, metalness: 0.4}),
      frameG: std('#e8453c'),
    }),
    [],
  );
  const blinkClosed = good < 0.5 && (time % 2.7) > 2.55;
  const mode = good > 0.5 ? 'happy' : blinkClosed ? 'closed' : 'open';
  const {w, h, d} = PRINTER;
  // Rattern: schnelles Zittern + kleine Hüpfer
  const jy = rumble * (Math.abs(Math.sin(time * 38)) * 0.012 + Math.abs(Math.sin(time * 9.3)) * 0.01);
  const jr = rumble * Math.sin(time * 47) * 0.035;
  const jx = rumble * Math.sin(time * 29 + 1) * 0.006;
  const headX = mark > 0.01 ? Math.sin(time * 9) * 0.15 : -0.15;
  const sq = 1 - 0.18 * squish;
  return (
    <group position={[jx, jy, 0]} rotation={[0, 0, jr]} scale={[1 + 0.1 * squish, sq, 1 + 0.1 * squish]}>
      {/* Gehäuse */}
      <mesh material={m.body} position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.16, d]} />
      </mesh>
      <mesh material={m.lid} position={[0, 0.18, -0.01]} castShadow>
        <boxGeometry args={[w - 0.02, 0.04, d - 0.04]} />
      </mesh>
      {/* gelber Zierstreifen (kein Logo) */}
      <mesh material={m.stripe} position={[0, 0.135, d / 2 + 0.002]}>
        <boxGeometry args={[w - 0.04, 0.014, 0.004]} />
      </mesh>
      {/* Ausgabeschlitz + Druckkopf dahinter */}
      <mesh material={m.dark} position={[0, PRINTER.slotY, d / 2 + 0.001]}>
        <boxGeometry args={[0.34, 0.03, 0.004]} />
      </mesh>
      <mesh material={m.head} position={[headX, PRINTER.slotY + 0.002, d / 2 - 0.01]}>
        <boxGeometry args={[0.06, 0.026, 0.02]} />
      </mesh>
      <mesh material={m.ink} position={[headX, PRINTER.slotY + 0.002, d / 2 + 0.001]}>
        <boxGeometry args={[0.03, 0.012, 0.004]} />
      </mesh>
      {/* Ausgabefach vorn */}
      <mesh material={m.tray} position={[0, 0.035, d / 2 + 0.09]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.012, 0.18]} />
      </mesh>
      {/* Papierfach hinten (schräg) mit Blättern */}
      <group position={[0, 0.19, -d / 2 + 0.04]} rotation={[-0.45, 0, 0]}>
        <mesh material={m.tray} position={[0, 0.1, -0.01]} castShadow>
          <boxGeometry args={[0.3, 0.2, 0.012]} />
        </mesh>
        <mesh material={m.paper} position={[0, 0.11, 0.005]}>
          <boxGeometry args={[0.22, 0.2, 0.018]} />
        </mesh>
      </group>
      {/* Bedienfeld rechts oben: Display mit Augen, Knöpfe, Lämpchen */}
      <group position={[0.13, 0.2, d / 2 - 0.06]} rotation={[-0.55, 0, 0]}>
        <mesh material={m.dark} position={[0, 0, 0]}>
          <boxGeometry args={[0.14, 0.08, 0.012]} />
        </mesh>
        <group position={[-0.015, 0.005, 0.007]}>
          <TextPlane draw={eyesTex(mode)} k={`Drucker-Augen ${mode}`} w={0.09} h={0.045} glow={0.5 + 0.8 * glow} />
        </group>
        <mesh material={m.btnG} position={[0.05, 0.015, 0.008]}>
          <cylinderGeometry args={[0.008, 0.008, 0.008, 8]} />
        </mesh>
        <mesh material={m.btnB} position={[0.05, -0.012, 0.008]}>
          <cylinderGeometry args={[0.008, 0.008, 0.008, 8]} />
        </mesh>
        {/* Sonnenbrille vor dem Display */}
        {glasses > 0.02 && (
          <group position={[-0.015, 0.005 + 0.06 * (1 - glasses), 0.016]} scale={glasses}>
            {[-1, 1].map((k) => (
              <mesh key={k} material={m.lens} position={[k * 0.024, 0, 0]}>
                <boxGeometry args={[0.04, 0.03, 0.006]} />
              </mesh>
            ))}
            <mesh material={m.lens} position={[0, 0.01, 0]}>
              <boxGeometry args={[0.1, 0.006, 0.006]} />
            </mesh>
          </group>
        )}
      </group>
      <mesh position={[-0.19, 0.2, d / 2 - 0.05]}>
        <sphereGeometry args={[0.008, 8, 6]} />
        <meshStandardMaterial color="#5cff7a" emissive="#5cff7a" emissiveIntensity={0.4 + 1.6 * glow} />
      </mesh>
      {/* Blumenkette vorn */}
      {lei > 0.02 && <Lei amount={lei} />}
      {/* Strohhut */}
      {hat > 0.02 && (
        <group position={[-0.05, 0.2 + 0.15 * (1 - hat), -0.02]} scale={0.75 * hat} rotation={[0.1, 0, 0.12]}>
          <GardenHat />
        </group>
      )}
    </group>
  );
};

const LEI_COLORS = ['#ff5aa0', '#ffd21a', '#ff7a3c', '#c46cff', '#ffffff'];
const Lei = ({amount}: {amount: number}) => {
  const mats = useMemo(() => LEI_COLORS.map((c) => std(c, {roughness: 0.8})), []);
  const n = 15;
  return (
    <group scale={amount}>
      {Array.from({length: n}, (_, i) => {
        const u = i / (n - 1);
        const x = -0.21 + 0.42 * u;
        const y = 0.17 - 0.09 * Math.sin(Math.PI * u);
        return (
          <mesh key={i} material={mats[i % mats.length]} position={[x, y, PRINTER.d / 2 + 0.018]}>
            <icosahedronGeometry args={[0.022, 0]} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- 3D-Drucker ----------
export const PRINTER3D = {w: 0.36, h: 0.46, d: 0.36, bed: [0, 0.085, 0.02] as [number, number, number]};
type Part = {pos: [number, number, number]; size: [number, number, number]; col: string; y0: number; y1: number};
const parts3d = (): Part[] => {
  const {w, h, d} = PRINTER3D;
  const P = (pos: [number, number, number], size: [number, number, number], col: string): Part => ({pos, size, col, y0: pos[1] - size[1] / 2, y1: pos[1] + size[1] / 2});
  const out: Part[] = [
    P([0, 0.03, 0], [w, 0.06, d], '#2b2f36'),
    P([0, 0.075, 0.02], [0.27, 0.012, 0.27], '#15171b'),
    P([0.1, 0.03, d / 2 + 0.002], [0.08, 0.035, 0.006], '#29b6d8'),
  ];
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => out.push(P([sx * (w / 2 - 0.015), h / 2, sz * (d / 2 - 0.015)], [0.025, h, 0.025], '#4a505a'))));
  out.push(P([0, h - 0.0125, d / 2 - 0.015], [w, 0.025, 0.025], '#4a505a'));
  out.push(P([0, h - 0.0125, -d / 2 + 0.015], [w, 0.025, 0.025], '#4a505a'));
  [-1, 1].forEach((sx) => out.push(P([sx * (w / 2 - 0.015), h - 0.0125, 0], [0.025, 0.025, d], '#4a505a')));
  out.push(P([0, 0.3, 0.02], [w - 0.04, 0.02, 0.02], '#f08a24'));
  out.push(P([0, h + 0.05, -d / 2 + 0.03], [0.06, 0.1, 0.1], '#f08a24'));
  return out;
};
export const Printer3D = ({fill = 1, mark = 0, glow = 0, rumble = 0, time = 0}: {fill?: number; mark?: number; glow?: number; rumble?: number; time?: number}) => {
  const parts = useMemo(parts3d, []);
  const paper = useMemo(() => new THREE.Color('#fbfbf5'), []);
  const mats = useMemo(() => parts.map((p) => std(p.col)), [parts]);
  const build = clamp(fill / 0.75);
  const real = easeInOut(clamp((fill - 0.75) / 0.25));
  const top = PRINTER3D.h + 0.12;
  const clipY = build * top;
  parts.forEach((p, i) => {
    mats[i].color.copy(paper).lerp(new THREE.Color(p.col), real);
  });
  const hx = mark > 0.01 ? Math.sin(time * 6.5) * 0.1 : 0;
  const hz = mark > 0.01 ? Math.sin(time * 4.1 + 1) * 0.08 : 0;
  const jr = rumble * Math.sin(time * 41) * 0.03;
  return (
    <group rotation={[0, 0, jr]}>
      {parts.map((p, i) => {
        if (clipY <= p.y0 + 0.002) return null;
        const vis = Math.min(1, (clipY - p.y0) / (p.y1 - p.y0));
        const hh = p.size[1] * vis;
        return (
          <mesh key={i} material={mats[i]} position={[p.pos[0], p.y0 + hh / 2, p.pos[2]]} castShadow receiveShadow>
            <boxGeometry args={[p.size[0], Math.max(0.001, hh), p.size[2]]} />
          </mesh>
        );
      })}
      {/* Filamentrolle oben hinten */}
      {clipY > PRINTER3D.h && (
        <mesh position={[0, PRINTER3D.h + 0.07, -PRINTER3D.d / 2 + 0.03]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.055, 0.022, 6, 12]} />
          <meshStandardMaterial color={real > 0.5 ? '#f08a24' : '#fbfbf5'} flatShading />
        </mesh>
      )}
      {/* Druckkopf (fährt beim Drucken) */}
      {real > 0.6 && (
        <group position={[hx, 0.27, 0.02 + hz]}>
          <mesh>
            <boxGeometry args={[0.07, 0.05, 0.05]} />
            <meshStandardMaterial color="#f08a24" flatShading />
          </mesh>
          <mesh position={[0, -0.035, 0]}>
            <coneGeometry args={[0.012, 0.025, 6]} />
            <meshStandardMaterial color="#d9d9d9" emissive="#ff8a3a" emissiveIntensity={0.3 + 1.5 * glow} />
          </mesh>
        </group>
      )}
      {/* Papierkanten-Linien während des Aufbaus (Blatt für Blatt) */}
      {build > 0.01 && real < 0.95 && (
        <mesh position={[0, Math.min(clipY, PRINTER3D.h) + 0.004, 0]}>
          <boxGeometry args={[PRINTER3D.w + 0.03, 0.008, PRINTER3D.d + 0.03]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} transparent opacity={0.85 * (1 - real)} />
        </mesh>
      )}
    </group>
  );
};

// ---------- Blatt Papier ----------
const sheetTex = (mode: string) =>
  canvasTex(420, 594, (g) => {
    const W = 420;
    g.fillStyle = '#fdfdf9';
    g.fillRect(0, 0, W, 594);
    if (mode === 'hawaii') {
      g.fillStyle = '#7fd0f5';
      g.fillRect(20, 20, 380, 330);
      g.fillStyle = '#ffd21a';
      g.beginPath();
      g.arc(310, 100, 46, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2f9fd8';
      g.fillRect(20, 250, 380, 100);
      g.fillStyle = '#f4dc9a';
      g.beginPath();
      g.moveTo(20, 350);
      g.quadraticCurveTo(200, 270, 400, 330);
      g.lineTo(400, 350);
      g.fill();
      // Palme
      g.strokeStyle = '#8a5a2e';
      g.lineWidth = 16;
      g.beginPath();
      g.moveTo(120, 330);
      g.quadraticCurveTo(105, 220, 140, 130);
      g.stroke();
      g.fillStyle = '#3faa4a';
      [[-1, 0.2], [-0.6, -0.5], [0.2, -0.7], [0.8, -0.2], [1, 0.4]].forEach(([dx, dy]) => {
        g.beginPath();
        g.ellipse(140 + dx * 50, 130 + dy * 25, 55, 16, Math.atan2(dy, dx), 0, Math.PI * 2);
        g.fill();
      });
      g.fillStyle = '#e8453c';
      fitText(g, 'HAWAII', W / 2, 420, 360, 96);
      g.fillStyle = '#2f3a48';
      fitText(g, 'Sonne · Strand · Urlaub', W / 2, 500, 340, 40, 700);
      return;
    }
    g.fillStyle = '#9aa3ae';
    const lines = (y0: number, n: number) => {
      for (let i = 0; i < n; i++) g.fillRect(40, y0 + i * 30, i % 4 === 3 ? 220 : 340, 11);
    };
    if (mode === 'kuendigung') {
      g.fillStyle = '#1d2026';
      fitText(g, 'KÜNDIGUNG', W / 2, 78, 360, 76);
      g.fillStyle = '#e8453c';
      g.fillRect(40, 122, 340, 8);
      g.fillStyle = '#9aa3ae';
      lines(170, 8);
      g.fillStyle = '#1d2026';
      g.fillRect(40, 520, 300, 5);
      g.textAlign = 'left';
      g.font = `700 28px ${T.font}`;
      g.fillText('Unterschrift', 40, 556);
      return;
    }
    lines(50, 15);
  });

/** Unterschrift als Kritzel-Linie (Punkte auf dem Blatt in Metern, Ursprung = Blattmitte, x nach rechts, z nach unten auf dem Blatt) */
const SIG = (() => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const u = i / 60;
    const x = -0.075 + 0.13 * u;
    const z = 0.098 - 0.012 * Math.sin(u * Math.PI * 7) - 0.006 * Math.sin(u * 23) + (u < 0.15 ? -0.01 * (1 - u / 0.15) : 0);
    pts.push([x, z]);
  }
  return pts;
})();
export const SHEET = {w: 0.21, l: 0.297, sigEnd: [0.055, 0.098] as [number, number]};

export const PrintSheet = ({mode = 'text', sign = 0}: {mode?: string; sign?: number}) => {
  const ink = useMemo(() => new THREE.MeshBasicMaterial({color: '#1f3fa8'}), []);
  const n = Math.floor(sign * (SIG.length - 1));
  return (
    <group>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <TextPlane draw={sheetTex(mode)} k={`Blatt ${mode}`} w={SHEET.w} h={SHEET.l} glow={0.3} />
      </group>
      {Array.from({length: n}, (_, i) => {
        const [x0, z0] = SIG[i];
        const [x1, z1] = SIG[i + 1];
        const len = Math.hypot(x1 - x0, z1 - z0);
        return (
          <mesh key={i} material={ink} position={[(x0 + x1) / 2, 0.0015, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, Math.atan2(z1 - z0, x1 - x0) * -1]}>
            <planeGeometry args={[len + 0.0015, 0.0032]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Drucker spuckt Blätter aus: alle 0,13 s ein Blatt, flattert nach +z und bleibt auf dem Boden liegen */
export const SheetBurst = ({time, power = 1, floor = -0.75}: {time: number; power?: number; floor?: number}) => {
  const N = 26;
  const parts = useMemo(() => {
    const r = rng(9191);
    return Array.from({length: N}, (_, i) => ({
      t0: i * 0.13,
      vx: (r() - 0.5) * 0.9,
      vz: 0.9 + r() * 0.9,
      vy: 0.6 + r() * 0.8,
      spin: (r() - 0.5) * 3,
      flut: 2 + r() * 3,
      ph: r() * 6,
    }));
  }, []);
  return (
    <group>
      {parts.map((p, i) => {
        const u = time - p.t0;
        if (u < 0) return null;
        const g = 2.2;
        const tl = (p.vy * power + Math.sqrt((p.vy * power) ** 2 + 2 * g * -floor)) / g;
        const uu = Math.min(u, tl);
        const x = p.vx * power * uu + 0.04 * Math.sin(uu * p.flut + p.ph);
        const z = p.vz * power * uu;
        const y = Math.max(floor + 0.003 + i * 0.0006, p.vy * power * uu - 0.5 * g * uu * uu);
        const landed = u >= tl;
        const rx = landed ? 0 : Math.sin(uu * p.flut + p.ph) * 0.7;
        const ry = p.spin * uu;
        return (
          <group key={i} position={[x, y, z]} rotation={[rx, ry, landed ? 0 : Math.cos(uu * p.flut) * 0.4]}>
            <PrintSheet mode="text" />
          </group>
        );
      })}
    </group>
  );
};

export const PaperStack = ({fill = 0.5}: {fill?: number}) => {
  const n = Math.max(1, Math.round(fill * 18));
  const m = useMemo(() => std('#fbfbf7', {roughness: 0.9}), []);
  const r = useMemo(() => rng(77), []);
  const offs = useMemo(() => Array.from({length: 18}, () => [(r() - 0.5) * 0.03, (r() - 0.5) * 0.3]), [r]);
  return (
    <group>
      {Array.from({length: n}, (_, i) => (
        <mesh key={i} material={m} position={[offs[i][0], 0.008 + i * 0.016, 0]} rotation={[0, offs[i][1], 0]} castShadow receiveShadow>
          <boxGeometry args={[SHEET.w, 0.015, SHEET.l]} />
        </mesh>
      ))}
    </group>
  );
};

export const Pen = () => (
  <group rotation={[0, 0, Math.PI / 2]}>
    <mesh position={[0, 0, 0]}>
      <cylinderGeometry args={[0.006, 0.006, 0.12, 8]} />
      <meshStandardMaterial color="#f4f4f2" flatShading />
    </mesh>
    <mesh position={[0, 0.045, 0]}>
      <cylinderGeometry args={[0.0075, 0.0075, 0.04, 8]} />
      <meshStandardMaterial color="#1f3fa8" flatShading />
    </mesh>
    <mesh position={[0, -0.068, 0]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[0.006, 0.018, 8]} />
      <meshStandardMaterial color="#9aa3ad" metalness={0.5} />
    </mesh>
  </group>
);

// ---------- Reisepass + Ticket ----------
const passTex = canvasTex(256, 358, (g) => {
  g.fillStyle = '#7d1d2b';
  g.fillRect(0, 0, 256, 358);
  g.strokeStyle = '#e2b84a';
  g.lineWidth = 5;
  g.strokeRect(14, 14, 228, 330);
  g.fillStyle = '#e2b84a';
  fitText(g, 'REISEPASS', 128, 70, 200, 44);
  // Drucker-Symbol statt Wappen
  g.fillRect(78, 160, 100, 46);
  g.fillRect(98, 132, 60, 30);
  g.fillStyle = '#7d1d2b';
  g.fillRect(92, 186, 72, 8);
  g.fillStyle = '#e2b84a';
  g.fillRect(98, 194, 60, 40);
  fitText(g, 'DRUCKER', 128, 290, 180, 30, 700);
});
export const Passport = () => {
  const m = useMemo(() => std('#7d1d2b'), []);
  return (
    <group>
      <mesh material={m} position={[0, 0.005, 0]} castShadow>
        <boxGeometry args={[0.1, 0.01, 0.14]} />
      </mesh>
      <group position={[0, 0.0106, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <TextPlane draw={passTex} k="Reisepass" w={0.1} h={0.14} glow={0.3} />
      </group>
    </group>
  );
};
const ticketTex = canvasTex(420, 170, (g) => {
  g.fillStyle = '#fdfdf9';
  g.fillRect(0, 0, 420, 170);
  g.fillStyle = '#19a7a0';
  g.fillRect(0, 0, 420, 44);
  g.fillStyle = '#ffffff';
  fitText(g, 'BORDKARTE', 110, 24, 190, 32);
  g.fillStyle = '#1d2026';
  fitText(g, '✈ HAWAII', 150, 92, 260, 54);
  g.fillStyle = '#e8453c';
  fitText(g, 'ONE-WAY', 150, 144, 200, 34);
  g.fillStyle = '#1d2026';
  for (let i = 0; i < 22; i++) g.fillRect(310 + i * 4.5, 62, i % 3 === 0 ? 3 : 1.6, 90);
});
export const FlightTicket = () => (
  <group position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <TextPlane draw={ticketTex} k="Flugticket Hawaii" w={0.21} h={0.085} glow={0.35} />
  </group>
);

export const MiniSuitcase = () => {
  const m = useMemo(() => ({shell: std('#f2873a'), dark: std('#2b2f36'), sun: std('#ffd21a'), palm: std('#3faa4a'), trunk: std('#8a5a2e'), band: std('#ffffff')}), []);
  return (
    <group>
      <mesh material={m.shell} position={[0, 0.085, 0]} castShadow>
        <boxGeometry args={[0.2, 0.15, 0.08]} />
      </mesh>
      <mesh material={m.band} position={[0, 0.085, 0]}>
        <boxGeometry args={[0.205, 0.015, 0.085]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.175, 0]}>
        <torusGeometry args={[0.03, 0.007, 6, 10, Math.PI]} />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} material={m.dark} position={[x, 0.006, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.012, 6]} />
        </mesh>
      ))}
      {/* Urlaubs-Aufkleber */}
      <mesh material={m.sun} position={[-0.05, 0.12, 0.0405]}>
        <circleGeometry args={[0.022, 10]} />
      </mesh>
      <mesh material={m.trunk} position={[0.05, 0.05, 0.0405]} rotation={[0, 0, 0.15]}>
        <planeGeometry args={[0.008, 0.05]} />
      </mesh>
      <mesh material={m.palm} position={[0.054, 0.076, 0.041]}>
        <circleGeometry args={[0.02, 5]} />
      </mesh>
    </group>
  );
};

// ---------- gedruckte Objekte ----------
export const PrintObject = ({kind = 'ente', fill = 1, glow = 0}: {kind?: string; fill?: number; glow?: number}) => {
  const m = useMemo(
    () => ({
      crust: std('#e3a85a'),
      sauce: std('#d9432f'),
      cheese: std('#f5d36b'),
      salami: std('#b5302a'),
      basil: std('#3f9a3a'),
      gold: std('#f2c230', {metalness: 0.7, roughness: 0.25, emissive: new THREE.Color('#7a5a00'), emissiveIntensity: 0.3}),
      duck: std('#ffd21a'),
      beak: std('#ff8a24'),
      eye: std('#15171b'),
    }),
    [],
  );
  const f = clamp(fill);
  if (f < 0.01) return null;
  const glowS = 1 + 0.06 * glow;
  return (
    <group scale={[glowS, Math.max(0.02, f) * glowS, glowS]}>
      {kind === 'pizza' && (
        <group>
          <mesh material={m.crust} position={[0, 0.008, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.11, 0.016, 12]} />
          </mesh>
          <mesh material={m.sauce} position={[0, 0.017, 0]}>
            <cylinderGeometry args={[0.095, 0.095, 0.004, 12]} />
          </mesh>
          <mesh material={m.cheese} position={[0, 0.0195, 0]}>
            <cylinderGeometry args={[0.085, 0.085, 0.003, 10]} />
          </mesh>
          {[[0.04, 0.02], [-0.035, 0.04], [-0.02, -0.045], [0.045, -0.035], [0, 0]].map(([x, z], i) => (
            <mesh key={i} material={m.salami} position={[x, 0.022, z]}>
              <cylinderGeometry args={[0.016, 0.016, 0.004, 8]} />
            </mesh>
          ))}
          {[[0.06, -0.005], [-0.055, -0.01], [0.015, 0.06]].map(([x, z], i) => (
            <mesh key={i} material={m.basil} position={[x, 0.023, z]} rotation={[0, i, 0]}>
              <boxGeometry args={[0.018, 0.003, 0.01]} />
            </mesh>
          ))}
        </group>
      )}
      {kind === 'gold' && (
        <group>
          <mesh material={m.gold} position={[0, 0.022, 0]} scale={[1, 1, 0.55]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.095, 0.045, 4]} />
          </mesh>
        </group>
      )}
      {kind === 'ente' && (
        <group>
          <mesh material={m.duck} position={[0, 0.035, 0]} scale={[1.25, 0.85, 1]} castShadow>
            <icosahedronGeometry args={[0.042, 1]} />
          </mesh>
          <mesh material={m.duck} position={[0, 0.082, 0.025]} castShadow>
            <icosahedronGeometry args={[0.027, 1]} />
          </mesh>
          <mesh material={m.beak} position={[0, 0.078, 0.053]} scale={[1.2, 0.5, 1]}>
            <icosahedronGeometry args={[0.013, 0]} />
          </mesh>
          {[-1, 1].map((k) => (
            <mesh key={k} material={m.eye} position={[k * 0.012, 0.09, 0.047]}>
              <sphereGeometry args={[0.004, 6, 4]} />
            </mesh>
          ))}
          <mesh material={m.duck} position={[0, 0.05, -0.045]} rotation={[0.6, 0, 0]}>
            <coneGeometry args={[0.014, 0.03, 5]} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ---------- Zimmerlicht ----------
export const RoomLight = ({glow = 0, h = 2.5}: {glow?: number; h?: number}) => {
  const g = clamp(glow);
  return (
    <group>
      <ambientLight intensity={0.36 * g} color="#fff6ea" />
      <hemisphereLight args={['#fffaf0', '#8a7c6c', 0.5 * g]} />
      <pointLight position={[0, h - 0.35, 0]} intensity={3.4 * g} color="#ffe2b8" distance={12} decay={1.4} />
      <pointLight position={[0, 1.8, 1.6]} intensity={1.5 * g} color="#fff3e2" distance={9} decay={1.6} />
      <mesh position={[0, h - 0.05, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.08, 16]} />
        <meshStandardMaterial color={g > 0.5 ? '#ffffff' : '#8d8f96'} emissive="#fff4dc" emissiveIntensity={1.3 * g} />
      </mesh>
    </group>
  );
};

// ---------- Zzz ----------
const zShape = (() => {
  const s = new THREE.Shape();
  const w = 0.1;
  const t = 0.024;
  s.moveTo(-w / 2, w / 2);
  s.lineTo(w / 2, w / 2);
  s.lineTo(w / 2, w / 2 - t);
  s.lineTo(-w / 2 + t * 1.6, -w / 2 + t);
  s.lineTo(w / 2, -w / 2 + t);
  s.lineTo(w / 2, -w / 2);
  s.lineTo(-w / 2, -w / 2);
  s.lineTo(-w / 2, -w / 2 + t);
  s.lineTo(w / 2 - t * 1.6, w / 2 - t);
  s.lineTo(-w / 2, w / 2 - t);
  s.closePath();
  return s;
})();
export const ZzzBadge = ({amount, time}: {amount: number; time: number}) => {
  if (amount < 0.02) return null;
  return (
    <group scale={amount}>
      {[0, 1, 2].map((i) => {
        const u = ((time * 0.45 + i / 3) % 1 + 1) % 1;
        const a = Math.sin(u * Math.PI);
        const sc = 0.6 + 0.8 * u;
        return (
          <group key={i} position={[0.1 * u + 0.03 * Math.sin(u * 6), 0.35 * u, 0]} scale={sc} rotation={[0, 0, 0.25]}>
            <mesh position={[0.004, -0.004, -0.002]}>
              <shapeGeometry args={[zShape]} />
              <meshBasicMaterial color="#203a68" transparent opacity={a} />
            </mesh>
            <mesh>
              <shapeGeometry args={[zShape]} />
              <meshBasicMaterial color="#cfe6ff" transparent opacity={a} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
