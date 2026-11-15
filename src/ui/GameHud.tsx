import {interpolate} from 'remotion';
import {T} from './theme';

/**
 * Selbst gestaltete Spiel-Anzeige (Spezial "T-Rex-Stau", Antwort A). KEINE Original-Grafik, kein Logo:
 * eigene Formen, Farben und Schrift (Barlow Condensed) im Look des Videos.
 *  - oben rechts: Minikarte (Autobahn als Band, Pfeil = Auto, roter Punkt = T-Rex)
 *  - unten Mitte/links: Lebensbalken (Herz + 100)
 *  - unten rechts: leeres Inventar (5 leere Felder)
 *  - darüber rechts: Bau-Auswahl (Wand, Treppe, Boden, Dach) – ausgewähltes Feld leuchtet gelb
 * Steht (bis auf die Minikarte) unten im Bereich, den die App teilweise verdeckt – reine Deko, nichts Wichtiges.
 */
const PANEL = 'rgba(16,20,26,0.62)';
const LINE = '#eaf4ff';

const Icon = ({kind, active}: {kind: string; active: boolean}) => {
  const c = active ? T.black : LINE;
  const sw = 5;
  return (
    <svg width={50} height={50} viewBox="0 0 50 50" style={{display: 'block'}}>
      {kind === 'wall' && (
        <g fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round">
          <rect x={10} y={8} width={30} height={34} />
          <line x1={20} y1={8} x2={20} y2={42} strokeWidth={3} />
          <line x1={30} y1={8} x2={30} y2={42} strokeWidth={3} />
        </g>
      )}
      {kind === 'stair' && (
        <g fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round">
          <path d="M8 42 L8 34 L18 34 L18 25 L28 25 L28 16 L38 16 L38 8 L42 8 L42 42 Z" />
        </g>
      )}
      {kind === 'floor' && (
        <g fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round">
          <path d="M6 30 L25 20 L44 30 L25 40 Z" />
        </g>
      )}
      {kind === 'roof' && (
        <g fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round">
          <path d="M6 36 L25 10 L44 36 Z" />
          <line x1={25} y1={10} x2={25} y2={36} strokeWidth={3} />
        </g>
      )}
    </svg>
  );
};

const Slot = ({size, active, children}: {size: number; active?: boolean; children?: React.ReactNode}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 12,
      background: active ? T.yellow : PANEL,
      border: `3px solid ${active ? '#fff3b0' : 'rgba(234,244,255,0.55)'}`,
      boxShadow: active ? `0 0 22px ${T.yellow}` : '0 4px 12px rgba(0,0,0,0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: active ? 'scale(1.08)' : undefined,
    }}
  >
    {children}
  </div>
);

export const GameHud = ({local, from, to, sel, carX = 0}: {local: number; from: number; to: number; sel: string; carX?: number}) => {
  const a = Math.min(
    interpolate(local - from, [0, 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
    interpolate(local - to, [0, 6], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );
  if (a <= 0) return null;
  const slide = (1 - a) * 40;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: a, pointerEvents: 'none'}}>
      {/* Minikarte oben rechts */}
      <div
        style={{
          position: 'absolute',
          right: 60,
          top: 118,
          width: 168,
          height: 168,
          borderRadius: 18,
          overflow: 'hidden',
          border: `4px solid rgba(234,244,255,0.8)`,
          background: '#6fa64a',
          boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
          transform: `translateY(${-slide}px)`,
        }}
      >
        <svg width={168} height={168} viewBox="0 0 168 168">
          <rect x={0} y={0} width={168} height={168} fill="#79ad50" />
          <rect x={0} y={20} width={50} height={40} fill="#d9c45a" opacity={0.8} />
          <rect x={110} y={118} width={58} height={50} fill="#a9c454" opacity={0.8} />
          <rect x={0} y={66} width={168} height={40} fill="#5a5e63" />
          <line x1={0} y1={86} x2={168} y2={86} stroke="#f2f2ee" strokeWidth={2} strokeDasharray="8 8" />
          {/* Stau (kleine Punkte) */}
          {[10, 22, 34, 46, 58].map((x) => (
            <rect key={x} x={x} y={74} width={7} height={5} fill="#e3b94b" />
          ))}
          {/* T-Rex */}
          <circle cx={96} cy={86} r={8} fill="#e5322d" stroke="#fff" strokeWidth={2} />
          {/* Auto = Pfeil */}
          <g transform={`translate(${Math.max(8, Math.min(160, 72 + carX * 1.6))} 92)`}>
            <path d="M-9 6 L0 -9 L9 6 L0 2 Z" fill="#ffffff" stroke="#1d1f22" strokeWidth={1.5} transform="rotate(90)" />
          </g>
          <circle cx={84} cy={84} r={70} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
        </svg>
      </div>

      {/* Bau-Auswahl (über dem Inventar, rechts) */}
      <div style={{position: 'absolute', right: 60, top: 1448, display: 'flex', gap: 10, transform: `translateX(${slide}px)`}}>
        {(['wall', 'stair', 'floor', 'roof'] as const).map((k) => (
          <Slot key={k} size={74} active={sel === k}>
            <Icon kind={k} active={sel === k} />
          </Slot>
        ))}
      </div>

      {/* Inventar unten rechts (leer) */}
      <div style={{position: 'absolute', right: 60, top: 1540, display: 'flex', gap: 9, transform: `translateX(${slide}px)`}}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Slot key={i} size={62} />
        ))}
      </div>

      {/* Lebensbalken unten Mitte/links */}
      <div style={{position: 'absolute', left: 120, top: 1556, display: 'flex', alignItems: 'center', gap: 12, transform: `translateY(${slide}px)`}}>
        <svg width={44} height={40} viewBox="0 0 44 40">
          <path d="M22 37 C6 25 2 18 2 11 C2 5 7 2 12 2 C16 2 20 5 22 8 C24 5 28 2 32 2 C37 2 42 5 42 11 C42 18 38 25 22 37 Z" fill="#ff5a6e" stroke="#fff" strokeWidth={3} />
        </svg>
        <div style={{width: 250, height: 26, borderRadius: 13, background: PANEL, border: '3px solid rgba(234,244,255,0.7)', overflow: 'hidden'}}>
          <div style={{width: '100%', height: '100%', background: 'linear-gradient(180deg, #7ef08a, #2fbf55)'}} />
        </div>
        <div style={{fontFamily: T.font, fontWeight: 800, fontSize: 40, color: T.white, textShadow: '0 2px 6px rgba(0,0,0,0.6)'}}>100</div>
      </div>
    </div>
  );
};
