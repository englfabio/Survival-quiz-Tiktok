import type {Scenario} from './types';

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const MIN_SECONDS = 61;

/** Die einzelnen Sprach-Clips eines Videos (später je eine Audiodatei). */
export type ClipId =
  | 'situation'
  | 'option1'
  | 'option2'
  | 'option3'
  | 'countdown'
  | 'reveal'
  | 'explain1'
  | 'explain2'
  | 'explain3'
  | 'outro';

export type SectionKind = 'situation' | 'options' | 'countdown' | 'reveal' | 'explain' | 'outro';

export type Section = {
  kind: SectionKind;
  /** bei "explain": welche Option (1–3) */
  option?: 1 | 2 | 3;
  from: number; // Startbild
  duration: number; // Länge in Bildern
  /** bei "options": Startbilder der drei Karten relativ zum Abschnitt */
  cardStarts?: number[];
  /** Sprach-Clip(s) dieses Abschnitts und wann sie starten (Bilder relativ zum Abschnitt) */
  voice: {clip: ClipId; at: number}[];
};

export type Timeline = {
  sections: Section[];
  totalFrames: number;
  totalSeconds: number;
  usesAudio: boolean;
};

/** Richtwerte (Sekunden), solange es noch keine Sprachaufnahmen gibt. */
const PLACEHOLDER: Record<ClipId, number> = {
  situation: 7,
  option1: 3.3,
  option2: 3.3,
  option3: 3.4,
  countdown: 5,
  reveal: 2,
  explain1: 11,
  explain2: 11,
  explain3: 12,
  outro: 3.5,
};

/** Kleine Pausen nach jedem Sprach-Clip (Sekunden) und Mindestlängen der Abschnitte. */
const PAD_AFTER = 0.5;
/** Kurze Pause VOR dem Sprechen (z. B. damit erst der Effekt/das Aufleuchten wirkt) */
export const LEAD: Record<ClipId, number> = {
  situation: 0.3,
  option1: 0.15,
  option2: 0.15,
  option3: 0.15,
  countdown: 0.1,
  reveal: 0.3,
  explain1: 0.6,
  explain2: 0.6,
  explain3: 0.6,
  outro: 0.3,
};
const MIN_LEN: Partial<Record<ClipId, number>> = {
  situation: 5,
  countdown: 5, // Countdown ist immer genau 5 s (oder länger, falls die Ansage länger ist)
  reveal: 1.8,
  explain1: 6,
  explain2: 6,
  explain3: 7,
  outro: 3,
};

/** Reihenfolge der Erklärungen: erst die zwei falschen (aufsteigend), dann die richtige. */
export const explainOrder = (s: Scenario): (1 | 2 | 3)[] => {
  const wrong = ([1, 2, 3] as const).filter((n) => n !== s.correctOption);
  return [...wrong, s.correctOption];
};

/**
 * Baut den Zeitplan. Ohne Audio werden die Richtwerte genommen,
 * mit Audio richtet sich jeder Abschnitt nach der Länge der Aufnahme.
 */
export const buildTimeline = (
  s: Scenario,
  audioSeconds?: Partial<Record<ClipId, number>>,
): Timeline => {
  const usesAudio = !!audioSeconds && Object.keys(audioSeconds).length > 0;
  const len = (id: ClipId) => {
    const a = audioSeconds?.[id];
    const base = a !== undefined ? LEAD[id] + a + PAD_AFTER : PLACEHOLDER[id];
    return Math.round(Math.max(base, MIN_LEN[id] ?? 0) * FPS);
  };

  const sections: Section[] = [];
  let cursor = 0;
  const push = (sec: Omit<Section, 'from'>) => {
    sections.push({...sec, from: cursor});
    cursor += sec.duration;
  };

  const at = (id: ClipId, offset = 0) => ({clip: id, at: offset + Math.round(LEAD[id] * FPS)});
  push({kind: 'situation', duration: len('situation'), voice: [at('situation')]});
  const cards = [len('option1'), len('option2'), len('option3')];
  const cardStarts = [0, cards[0], cards[0] + cards[1]];
  push({
    kind: 'options',
    duration: cards[0] + cards[1] + cards[2],
    cardStarts,
    voice: [at('option1', cardStarts[0]), at('option2', cardStarts[1]), at('option3', cardStarts[2])],
  });
  push({kind: 'countdown', duration: len('countdown'), voice: [at('countdown')]});
  push({kind: 'reveal', duration: len('reveal'), voice: [at('reveal')]});
  for (const n of explainOrder(s)) {
    const id = `explain${n}` as ClipId;
    push({kind: 'explain', option: n, duration: len(id), voice: [at(id)]});
  }
  push({kind: 'outro', duration: len('outro'), voice: [at('outro')]});

  return {sections, totalFrames: cursor, totalSeconds: cursor / FPS, usesAudio};
};

export const sectionAt = (tl: Timeline, frame: number): Section => {
  for (let i = tl.sections.length - 1; i >= 0; i--) {
    if (frame >= tl.sections[i].from) return tl.sections[i];
  }
  return tl.sections[0];
};
