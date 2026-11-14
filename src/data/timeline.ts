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

/**
 * Abschnitte. Quiz: situation, options, countdown, reveal, explain ×3, outro.
 * Spezial: situation, answer ×3 (Karte + kleine Szene), vote (Abstimmung mit Countdown), outro.
 */
export type SectionKind = 'situation' | 'options' | 'countdown' | 'reveal' | 'explain' | 'outro' | 'answer' | 'vote';

export type Section = {
  kind: SectionKind;
  /** bei "explain"/"answer": welche Option (1–3) */
  option?: 1 | 2 | 3;
  from: number; // Startbild
  duration: number; // Länge in Bildern
  /** bei "options": Startbilder der drei Karten relativ zum Abschnitt */
  cardStarts?: number[];
  /** bei "answer": ab welchem Bild (relativ) die kleine Szene beginnt (vorher wird die Antwort vorgelesen) */
  sceneStart?: number;
  /** Sprach-Clip(s) dieses Abschnitts und wann sie starten (Bilder relativ zum Abschnitt) */
  voice: {clip: ClipId; at: number}[];
};

export type Timeline = {
  sections: Section[];
  totalFrames: number;
  totalSeconds: number;
  usesAudio: boolean;
};

/** Spezial-Format? ("format": "spezial" in der Szenario-Datei – keine richtige Antwort, Abstimmung statt Auflösung) */
export const isSpezial = (s: Scenario) => s.format === 'spezial';

/** Die Sprechtexte je Clip – 1:1 aus der Szenario-Datei (Spezial: ohne "reveal") */
export const clipTexts = (s: Scenario): Partial<Record<ClipId, string>> => {
  const t: Partial<Record<ClipId, string>> = {
    situation: s.situation.speech,
    option1: s.options[0].speech,
    option2: s.options[1].speech,
    option3: s.options[2].speech,
    countdown: s.countdown.speech,
    reveal: s.reveal?.speech,
    explain1: s.options[0].explanation,
    explain2: s.options[1].explanation,
    explain3: s.options[2].explanation,
    outro: s.outro.speech,
  };
  if (isSpezial(s)) delete t.reveal;
  return t;
};

/**
 * Geschätzte Sprechdauer (Sekunden), solange es noch keine Sprachaufnahme gibt.
 * Gemessen an der Pilot-Stimme (M. Danisch – Narrator): ca. 0,84 s + 0,059 s pro Zeichen.
 */
export const estimateSpeechSeconds = (text: string) => 0.84 + 0.0594 * text.length;

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
  const ok = s.correctOption ?? 3;
  const wrong = ([1, 2, 3] as const).filter((n) => n !== ok);
  return [...wrong, ok];
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
  const texts = clipTexts(s);
  const len = (id: ClipId) => {
    const a = audioSeconds?.[id] ?? estimateSpeechSeconds(texts[id] ?? '');
    const base = LEAD[id] + a + PAD_AFTER;
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

  if (isSpezial(s)) {
    // Spezial: je Antwort ein Abschnitt = Karte vorlesen (option<n>), danach die kleine Szene (explain<n>).
    // "sceneExtra" (Sekunden) in der Option verlängert die Szene rein visuell (z. B. für die 61-s-Regel).
    for (const n of [1, 2, 3] as const) {
      const card = len(`option${n}` as ClipId);
      const ex = `explain${n}` as ClipId;
      const extra = Math.round((s.options[n - 1].sceneExtra ?? 0) * FPS);
      const scene = len(ex) + extra;
      push({kind: 'answer', option: n, duration: card + scene, sceneStart: card, voice: [at(`option${n}` as ClipId), at(ex, card)]});
    }
    // Abstimmung: Ansage + 5-s-Countdown laufen gleichzeitig
    push({kind: 'vote', duration: Math.max(len('countdown'), Math.round(5.6 * FPS)), voice: [at('countdown')]});
    push({kind: 'outro', duration: Math.max(len('outro'), Math.round(4 * FPS)), voice: [at('outro')]});
    return {sections, totalFrames: cursor, totalSeconds: cursor / FPS, usesAudio};
  }

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
