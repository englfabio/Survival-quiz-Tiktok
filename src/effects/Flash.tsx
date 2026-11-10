import {AbsoluteFill, interpolate} from 'remotion';
import {T} from '../ui/theme';

/**
 * Effekt "Aufleuchten": farbiger Blitz am Bildrand (rot = falsch, grün = richtig).
 * frame = Bilder seit Beginn; danach bleibt ein leichter Farbrand stehen (hold).
 */
export const Flash = ({color, frame, hold = 0.35}: {color: 'red' | 'green'; frame: number; hold?: number}) => {
  const c = color === 'red' ? T.red : T.green;
  const burst = interpolate(frame, [0, 3, 18], [0, 1, 0], {extrapolateRight: 'clamp'});
  const strength = Math.max(burst, hold * interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'}));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{boxShadow: `inset 0 0 ${120 + 120 * burst}px ${30 + 50 * burst}px ${c}`, opacity: strength}} />
      <AbsoluteFill style={{backgroundColor: c, opacity: burst * 0.22}} />
    </AbsoluteFill>
  );
};
