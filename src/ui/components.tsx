import type {CSSProperties, ReactNode} from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {clamp} from '../lib/anim';
import {categoryInfo, CommentIcon} from './icons';
import {hazardStripes, T} from './theme';

const textShadow = '0 3px 10px rgba(0,0,0,0.55)';

// ---------- Kategorie-Abzeichen (oben links) ----------
export const CategoryBadge = ({category, frame}: {category: string; frame: number}) => {
  const {label, Icon} = categoryInfo(category);
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 16}});
  return (
    <div
      style={{
        position: 'absolute',
        left: T.left,
        top: T.top,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: T.anthracite,
        border: `4px solid ${T.yellow}`,
        borderRadius: 14,
        padding: '8px 22px 8px 12px',
        transform: `translateX(${(1 - s) * -60}px)`,
        opacity: s,
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 10,
          background: T.yellow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={44} color={T.black} />
      </div>
      <span style={{fontFamily: T.font, fontWeight: 700, fontSize: 40, color: T.white, letterSpacing: 2, textTransform: 'uppercase'}}>
        {label}
      </span>
    </div>
  );
};

// ---------- Überschrift im Warnschild-Look ----------
export const Headline = ({text, frame, top = 300}: {text: string; frame: number; top?: number}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 14}});
  return (
    <div style={{position: 'absolute', left: T.left, width: T.rightTop - T.left, top, transform: `scale(${0.85 + 0.15 * s})`, opacity: s, transformOrigin: 'left center'}}>
      <div style={{height: 14, background: hazardStripes(14), borderRadius: '6px 6px 0 0'}} />
      <div
        style={{
          background: T.yellow,
          color: T.black,
          fontFamily: T.font,
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1,
          padding: '14px 26px 10px',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {text}
      </div>
      <div style={{height: 14, background: hazardStripes(14), borderRadius: '0 0 6px 6px'}} />
    </div>
  );
};

// ---------- Antwortkarten ----------
export type CardState = 'hidden' | 'neutral' | 'correct' | 'wrong';

export const AnswerCard = ({
  number,
  text,
  state,
  appearFrame,
  stateFrame,
  style,
}: {
  number: number;
  text: string;
  state: CardState;
  appearFrame: number; // Bilder seit Erscheinen
  stateFrame: number; // Bilder seit Farbwechsel
  style?: CSSProperties;
}) => {
  const {fps} = useVideoConfig();
  if (state === 'hidden' || appearFrame < 0) return null;
  const s = spring({frame: appearFrame, fps, config: {damping: 15, stiffness: 140}});
  const c = clamp(stateFrame / 8);
  const accent = state === 'correct' ? T.green : state === 'wrong' ? T.red : T.yellow;
  const bg = state === 'correct' ? T.green : T.anthracite;
  const pop = state === 'correct' ? 1 + 0.06 * Math.sin(clamp(stateFrame / 12) * Math.PI) : 1;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 26,
        minHeight: 148,
        background: bg,
        borderRadius: 22,
        border: `5px solid ${accent}`,
        padding: '16px 28px 16px 20px',
        boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
        transform: `translateX(${(1 - s) * 120}px) scale(${pop})`,
        opacity: s * (state === 'wrong' ? 1 - 0.35 * c : 1),
        ...style,
      }}
    >
      <div
        style={{
          flex: '0 0 auto',
          width: 104,
          height: 104,
          borderRadius: '50%',
          background: state === 'correct' ? T.white : accent,
          color: state === 'correct' ? T.green : state === 'wrong' ? T.white : T.black,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: T.font,
          fontWeight: 800,
          fontSize: 76,
          lineHeight: 1,
        }}
      >
        {state === 'correct' && c > 0.5 ? '✓' : state === 'wrong' && c > 0.5 ? '✕' : number}
      </div>
      <div
        style={{
          fontFamily: T.font,
          fontWeight: 700,
          fontSize: text.length > 30 ? 50 : 60,
          lineHeight: 1.05,
          color: T.white,
          textDecoration: state === 'wrong' && c > 0.5 ? 'line-through' : 'none',
          textDecorationThickness: 4,
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ---------- Countdown-Ring ----------
export const CountdownRing = ({frame, seconds, size = 250}: {frame: number; seconds: number; size?: number}) => {
  const {fps} = useVideoConfig();
  const total = seconds * fps;
  const progress = clamp(frame / total);
  const remaining = Math.max(1, Math.ceil(seconds - frame / fps));
  const r = size / 2 - 16;
  const circ = 2 * Math.PI * r;
  const tick = (frame % fps) / fps;
  const pulse = 1 + 0.08 * Math.max(0, 1 - tick * 4);
  return (
    <div style={{width: size, height: size, position: 'relative', transform: `scale(${pulse})`}}>
      <svg width={size} height={size} style={{position: 'absolute', inset: 0}}>
        <circle cx={size / 2} cy={size / 2} r={r + 10} fill={T.anthracite} />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={18} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={T.yellow}
          strokeWidth={18}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: T.font,
          fontWeight: 800,
          fontSize: size * 0.52,
          color: T.white,
          textShadow,
        }}
      >
        {remaining}
      </div>
    </div>
  );
};

// ---------- Untertitel ----------
/** Teilt Text in Sätze (Inhalt bleibt unverändert) */
export const splitSentences = (text: string): string[] =>
  text.match(/[^.!?:]+[.!?:]+["“”]?\s*|[^.!?:]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];

/**
 * Zeitplan der Sätze (0…1), solange es noch keine Audio-Zeitstempel gibt: nach Zeichenanzahl.
 * Später (mit Stimme) wird das durch echte Wort-Zeitstempel ersetzt.
 */
export const sentenceTimes = (text: string) => {
  const parts = splitSentences(text);
  const lens = parts.map((p) => p.length + 8);
  const sum = lens.reduce((a, b) => a + b, 0);
  let acc = 0;
  let searchFrom = 0;
  return parts.map((p, i) => {
    const start = acc / sum;
    acc += lens[i];
    const charStart = text.indexOf(p, searchFrom);
    searchFrom = charStart + p.length;
    return {text: p, start, end: acc / sum, charStart};
  });
};

/** Zeitpunkt (0…1), an dem eine Textstelle gesprochen wird */
export const cueTime = (text: string, cue: string): number => {
  const idx = text.indexOf(cue);
  if (idx < 0) return 0;
  const times = sentenceTimes(text);
  const s = [...times].reverse().find((x) => x.charStart <= idx) ?? times[0];
  const within = (idx - s.charStart) / Math.max(1, s.text.length);
  return s.start + within * (s.end - s.start);
};

/**
 * Zeigt den passenden Satz zum Zeitpunkt t (0…1).
 * Solange es keine Audio-Zeitstempel gibt, wird nach Zeichenanzahl verteilt.
 */
export const Subtitle = ({
  text,
  t,
  bottom = T.bottom,
  starts,
}: {
  text: string;
  t: number;
  bottom?: number;
  /** echte Satz-Startzeiten (aus der Sprachaufnahme), sonst geschätzt */
  starts?: number[];
}) => {
  const est = sentenceTimes(text);
  const times = starts
    ? est.map((x, i) => ({...x, start: i === 0 ? Math.min(0, starts[0]) : starts[i], end: starts[i + 1] ?? 1}))
    : est;
  const parts = times.map((x) => x.text);
  let idx = parts.length - 1;
  let local = 1;
  for (let i = 0; i < times.length; i++) {
    if (t < times[i].end) {
      idx = i;
      local = (t - times[i].start) / (times[i].end - times[i].start);
      break;
    }
  }
  const fadeIn = clamp(local * 12);
  return (
    <div
      style={{
        position: 'absolute',
        left: T.left,
        width: T.rightBottom - T.left,
        bottom: 1920 - bottom,
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      <div
        style={{
          background: 'rgba(20,23,26,0.88)',
          borderLeft: `10px solid ${T.yellow}`,
          borderRadius: 14,
          padding: '18px 26px',
          fontFamily: T.font,
          fontWeight: 600,
          fontSize: 56,
          lineHeight: 1.12,
          color: T.white,
          opacity: fadeIn,
          transform: `translateY(${(1 - fadeIn) * 14}px)`,
        }}
      >
        {parts[idx]}
      </div>
    </div>
  );
};

// ---------- Kopfzeile in der Erklärung ----------
export const ExplainHeader = ({
  number,
  text,
  correct,
  frame,
}: {
  number: number;
  text: string;
  correct: boolean;
  frame: number;
}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 14}});
  const color = correct ? T.green : T.red;
  return (
    <div style={{position: 'absolute', left: T.left, top: T.top, width: T.rightTop - T.left, opacity: s, transform: `translateY(${(1 - s) * -40}px)`}}>
      <div
        style={{
          display: 'inline-block',
          background: color,
          color: T.white,
          fontFamily: T.font,
          fontWeight: 800,
          fontSize: 48,
          letterSpacing: 3,
          padding: '6px 22px',
          borderRadius: '12px 12px 0 0',
        }}
      >
        {correct ? '✓ RICHTIG' : '✕ FALSCH'}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          background: T.anthracite,
          border: `5px solid ${color}`,
          borderRadius: '0 18px 18px 18px',
          padding: '16px 24px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            flex: '0 0 auto',
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: color,
            color: T.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: T.font,
            fontWeight: 800,
            fontSize: 70,
          }}
        >
          {number}
        </div>
        <div style={{fontFamily: T.font, fontWeight: 700, fontSize: text.length > 30 ? 52 : 64, lineHeight: 1.05, color: T.white}}>{text}</div>
      </div>
    </div>
  );
};

// ---------- Quellenzeile ----------
export const SourceLine = ({text, frame, top}: {text: string; frame: number; top: number}) => {
  const o = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        left: T.left,
        maxWidth: (top < 960 ? T.rightTop : T.rightBottom) - T.left,
        top,
        opacity: o,
        fontFamily: T.font,
        fontWeight: 500,
        fontSize: 32,
        color: 'rgba(255,255,255,0.92)',
        background: 'rgba(20,23,26,0.75)',
        borderRadius: 10,
        padding: '8px 16px',
      }}
    >
      {text}
    </div>
  );
};

// ---------- Großes Banner (Auflösung) ----------
export const Banner = ({children, color, frame, top}: {children: ReactNode; color: string; frame: number; top: number}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 11, stiffness: 160}});
  return (
    <div
      style={{
        position: 'absolute',
        left: T.left,
        width: T.rightTop - T.left,
        top,
        display: 'flex',
        justifyContent: 'center',
        transform: `scale(${0.6 + 0.4 * s})`,
        opacity: clamp(s * 1.5),
      }}
    >
      <div
        style={{
          background: color,
          color: T.white,
          fontFamily: T.font,
          fontWeight: 800,
          fontSize: 100,
          lineHeight: 1,
          padding: '22px 40px 16px',
          borderRadius: 22,
          textTransform: 'uppercase',
          boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
          border: `6px solid ${T.white}`,
          textAlign: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ---------- Text-Hinweis (z. B. beim Countdown) ----------
export const Callout = ({text, frame, top}: {text: string; frame: number; top: number}) => {
  const o = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: T.left, width: T.rightTop - T.left, top, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div
        style={{
          background: T.anthracite,
          border: `4px solid ${T.yellow}`,
          borderRadius: 16,
          padding: '12px 26px',
          fontFamily: T.font,
          fontWeight: 700,
          fontSize: 54,
          color: T.white,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <CommentIcon size={52} color={T.yellow} />
        {text}
      </div>
    </div>
  );
};

// ---------- Outro ----------
export const OutroPanel = ({text, frame}: {text: string; frame: number}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 13}});
  const parts = splitSentences(text);
  return (
    <div
      style={{
        position: 'absolute',
        left: T.left,
        width: T.rightTop - T.left,
        top: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 22,
        transform: `scale(${0.8 + 0.2 * s})`,
        opacity: s,
      }}
    >
      <CommentIcon size={150} color={T.yellow} />
      <div style={{background: T.yellow, height: 16, width: '70%', backgroundImage: hazardStripes(14), borderRadius: 6}} />
      {parts.map((p, i) => (
        <div
          key={i}
          style={{
            fontFamily: T.font,
            fontWeight: 800,
            fontSize: i === 0 ? 120 : 70,
            lineHeight: 1,
            color: i === 0 ? T.yellow : T.white,
            textTransform: 'uppercase',
            textAlign: 'center',
            textShadow,
          }}
        >
          {p}
        </div>
      ))}
    </div>
  );
};

// ---------- Schritt-Liste (z. B. bei der richtigen Option) ----------
export const StepList = ({
  steps,
  explanation,
  t,
  fps,
  sectionFrames,
  top,
  cueT,
}: {
  steps: {text: string; cue: string}[];
  explanation: string;
  t: number;
  fps: number;
  sectionFrames: number;
  top: number;
  /** echte Zeitpunkte aus der Sprachaufnahme, sonst geschätzt */
  cueT?: (cue: string) => number;
}) => (
  <div style={{position: 'absolute', left: T.left, top, display: 'flex', flexDirection: 'column', gap: 12}}>
    {steps.map((st, i) => {
      const at = cueT ? cueT(st.cue) : cueTime(explanation, st.cue);
      const f = (t - at) * sectionFrames; // Bilder seit Erscheinen
      if (f < 0) return null;
      const s = spring({frame: f, fps, config: {damping: 14, stiffness: 150}});
      const active = steps.every((o, j) => j <= i || (cueT ? cueT(o.cue) : cueTime(explanation, o.cue)) > t);
      return (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            alignSelf: 'flex-start',
            background: active ? T.green : 'rgba(20,23,26,0.88)',
            border: `4px solid ${T.green}`,
            borderRadius: 14,
            padding: '8px 22px 8px 10px',
            transform: `translateX(${(1 - s) * -80}px)`,
            opacity: clamp(s * 1.4),
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: active ? T.white : T.green,
              color: active ? T.green : T.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: T.font,
              fontWeight: 800,
              fontSize: 38,
            }}
          >
            ✓
          </div>
          <span style={{fontFamily: T.font, fontWeight: 700, fontSize: 50, color: T.white, lineHeight: 1}}>{st.text}</span>
        </div>
      );
    })}
  </div>
);

// ---------- Stoppuhr (z. B. "60 bis 90 Sekunden treiben") ----------
/**
 * Läuft zwischen tStart und tEnd (Anteil am Abschnitt) im Zeitraffer von 0:00 bis "seconds".
 * Am Ende wird der Ring grün; ca. 1,5 s später blendet sie sich aus.
 */
export const Stopwatch = ({
  t,
  timer,
  sectionFrames,
  fps,
  top,
  left,
  size = 210,
}: {
  t: number;
  timer: [number, number, number];
  sectionFrames: number;
  fps: number;
  top: number;
  left: number;
  size?: number;
}) => {
  const [a, b, total] = timer;
  const sinceStart = (t - a) * sectionFrames;
  const sinceEnd = (t - b) * sectionFrames;
  if (sinceStart < 0) return null;
  const appear = spring({frame: sinceStart, fps, config: {damping: 13, stiffness: 150}});
  const fadeOut = interpolate(sinceEnd, [1.5 * fps, 1.5 * fps + 10], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (fadeOut <= 0) return null;
  const k = clamp((t - a) / (b - a));
  const secs = Math.floor(k * total + 1e-6);
  const done = k >= 1;
  const label = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const col = done ? T.green : T.yellow;
  const pop = done ? 1 + 0.08 * Math.max(0, 1 - sinceEnd / 8) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size * 1.12,
        opacity: clamp(appear * 1.4) * fadeOut,
        transform: `scale(${(0.7 + 0.3 * appear) * pop})`,
        transformOrigin: 'center top',
      }}
    >
      <svg width={size} height={size * 1.12} viewBox="0 0 100 112">
        {/* Krone + Knopf */}
        <rect x="42" y="0" width="16" height="9" rx="2" fill={T.white} />
        <rect x="47" y="7" width="6" height="8" fill={T.white} />
        <rect x="74" y="12" width="10" height="6" rx="2" fill={T.white} transform="rotate(40 79 15)" />
        <circle cx="50" cy="62" r="49" fill={T.anthracite} stroke={T.white} strokeWidth="3.5" />
        <circle cx="50" cy="62" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
        <circle
          cx="50"
          cy="62"
          r={r}
          fill="none"
          stroke={col}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${circ * k} ${circ}`}
          transform="rotate(-90 50 62)"
        />
        <line
          x1="50"
          y1="62"
          x2={50 + Math.sin(k * total * ((2 * Math.PI) / 60)) * 30}
          y2={62 - Math.cos(k * total * ((2 * Math.PI) / 60)) * 30}
          stroke={col}
          strokeWidth="3"
          strokeLinecap="round"
          opacity={0.55}
        />
        <text x="50" y="74" textAnchor="middle" fontFamily='"Barlow Condensed", sans-serif' fontWeight="800" fontSize="34" fill={T.white}>
          {label}
        </text>
      </svg>
    </div>
  );
};
