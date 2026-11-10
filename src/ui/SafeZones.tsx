import {AbsoluteFill} from 'remotion';
import {T} from './theme';

/**
 * Hilfsansicht: blendet die Bereiche ein, die von TikTok/Instagram/YouTube verdeckt werden.
 * - oben 160 px
 * - unten 480 px
 * - untere Bildhälfte: rechts 140 px
 */
const zone = {
  position: 'absolute' as const,
  background: 'repeating-linear-gradient(45deg, rgba(255,0,80,0.42) 0 18px, rgba(255,0,80,0.22) 18px 36px)',
  border: '3px dashed rgba(255,255,255,0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: T.font,
  fontWeight: 700,
  fontSize: 34,
  color: 'white',
  textShadow: '0 2px 6px black',
};

export const SafeZones = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{...zone, left: 0, top: 0, width: 1080, height: 160}}>Sperrzone oben · 160 px</div>
    <div style={{...zone, left: 0, top: 1440, width: 1080, height: 480}}>Sperrzone unten · 480 px</div>
    <div style={{...zone, left: 940, top: 960, width: 140, height: 480, writingMode: 'vertical-rl'}}>rechts · 140 px</div>
    <div style={{position: 'absolute', left: 0, top: 959, width: 1080, borderTop: '2px dotted rgba(255,255,255,0.6)'}} />
  </AbsoluteFill>
);
