import type {Scenario} from './types';

/** Prüft eine Szenario-Datei und liefert verständliche deutsche Fehlermeldungen. */
export const validateScenario = (s: Scenario, file: string): string[] => {
  const errors: string[] = [];
  const need = (cond: unknown, msg: string) => {
    if (!cond) errors.push(`${file}: ${msg}`);
  };
  need(/^[a-z0-9-]+$/.test(s.id ?? ''), 'id fehlt oder enthält andere Zeichen als a–z, 0–9, "-"');
  need(s.category, 'category fehlt');
  need(s.stage, 'stage fehlt');
  need(s.situation?.speech, 'situation.speech fehlt');
  need(Array.isArray(s.options) && s.options.length === 3, 'es müssen genau 3 options sein');
  (s.options ?? []).forEach((o, i) => {
    need(o.card, `Option ${i + 1}: card fehlt`);
    need(o.speech, `Option ${i + 1}: speech fehlt`);
    need(o.explanation, `Option ${i + 1}: explanation fehlt`);
    need(o.choreography?.camera?.length, `Option ${i + 1}: choreography.camera fehlt`);
    (o.steps ?? []).forEach((st, j) =>
      need(
        st.text && o.explanation?.includes(st.cue),
        `Option ${i + 1}, Schritt ${j + 1}: "cue" ("${st.cue}") kommt im Erklärtext nicht vor`,
      ),
    );
  });
  need([1, 2, 3].includes(s.correctOption), 'correctOption muss 1, 2 oder 3 sein');
  need(s.countdown?.speech && s.countdown?.screen, 'countdown.speech/screen fehlt');
  need(s.reveal?.speech && s.reveal?.screen, 'reveal.speech/screen fehlt');
  need(s.outro?.speech && s.outro?.screen, 'outro.speech/screen fehlt');
  need(s.sourceLine, 'sourceLine fehlt');
  need(s.sources?.length, 'sources fehlt');
  need(s.publishing?.description && s.publishing?.pinnedComment, 'publishing.description/pinnedComment fehlt');
  for (const k of ['situation', 'options', 'countdown', 'reveal', 'outro'] as const) {
    need(s.shots?.[k]?.camera?.length, `shots.${k}.camera fehlt`);
  }
  return errors;
};
