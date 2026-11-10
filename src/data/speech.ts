import {sentenceTimes} from '../ui/components';
import type {Alignment} from './types';

/**
 * Rechnet Wort-Zeitstempel (Sekunden im Audio) in Abschnitts-Zeit t (0…1) um.
 * Ohne Aufnahme → null, dann wird nach Textlänge geschätzt.
 */
export const speechTimer = (
  text: string,
  alignment: Alignment | undefined,
  startFrame: number,
  sectionFrames: number,
  fps: number,
) => {
  if (!alignment || alignment.characters.join('') !== text) return null;
  const starts = alignment.character_start_times_seconds;
  const toT = (sec: number) => (startFrame + sec * fps) / sectionFrames;
  const charT = (idx: number) => toT(starts[Math.max(0, Math.min(idx, starts.length - 1))]);
  return {
    sentenceStarts: sentenceTimes(text).map((s) => charT(s.charStart)),
    cueT: (cue: string) => charT(text.indexOf(cue)),
  };
};
