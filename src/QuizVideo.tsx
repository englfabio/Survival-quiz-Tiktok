import {AbsoluteFill, Freeze, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {AudioLayer} from './AudioLayer';
import {Flash} from './effects/Flash';
import {speechTimer} from './data/speech';
import type {Alignment, Scenario, Shot} from './data/types';
import {sectionAt, type Section, type Timeline} from './data/timeline';
import {Scene3D} from './Scene3D';
import {STAGES} from './stage';
import {
  AnswerCard,
  Banner,
  Callout,
  CategoryBadge,
  CountdownRing,
  ExplainHeader,
  Headline,
  OutroPanel,
  SourceLine,
  StepList,
  Stopwatch,
  Subtitle,
  type CardState,
} from './ui/components';
import {useFonts} from './ui/fonts';
import {SafeZones} from './ui/SafeZones';
import {T} from './ui/theme';

export type QuizProps = {
  scenario: Scenario;
  timeline: Timeline;
  showSafeZones: boolean;
  /** Wort-Zeitstempel je Sprach-Clip (fehlt, solange es keine Stimme gibt) */
  alignment?: Record<string, Alignment>;
};

const shotFor = (s: Scenario, sec: Section): Shot => {
  switch (sec.kind) {
    case 'explain':
      return s.options[(sec.option ?? 1) - 1].choreography;
    default:
      return s.shots[sec.kind];
  }
};

/** Bühne eines Abschnitts zum Zeitpunkt t (Shot-Feld "stage" überschreibt die Bühne des Szenarios) */
export const stageNameAt = (s: Scenario, shot: Shot, t: number) => {
  if (!shot.stage) return s.stage;
  if (typeof shot.stage === 'string') return shot.stage;
  let cur = s.stage;
  for (const k of shot.stage) if (t >= k.t) cur = k.stage;
  return cur;
};

/** Zeitpunkte (0…1) der Bühnenwechsel innerhalb eines Abschnitts */
export const stageCuts = (shot: Shot) => (Array.isArray(shot.stage) ? shot.stage.map((k) => k.t).filter((t) => t > 0) : []);

/** Die drei Karten (während Optionen, Countdown, Auflösung) */
const Cards = ({s, sec, local}: {s: Scenario; sec: Section; local: number}) => {
  const top = 860;
  return (
    <div style={{position: 'absolute', left: T.left, width: T.rightBottom - T.left, top, display: 'flex', flexDirection: 'column', gap: 18}}>
      {s.options.map((o, i) => {
        const n = i + 1;
        let state: CardState = 'neutral';
        let appear = 999;
        let stateFrame = 0;
        if (sec.kind === 'options') appear = local - (sec.cardStarts?.[i] ?? 0);
        if (sec.kind === 'reveal') {
          state = n === s.correctOption ? 'correct' : 'wrong';
          stateFrame = local;
        }
        return <AnswerCard key={n} number={n} text={o.card} state={state} appearFrame={appear} stateFrame={stateFrame} />;
      })}
    </div>
  );
};

export const QuizVideo = ({scenario: s, timeline, showSafeZones, alignment}: QuizProps) => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = sectionAt(timeline, frame);
  const local = frame - sec.from;
  const t = Math.min(1, local / sec.duration);
  const isCorrect = sec.kind === 'explain' && sec.option === s.correctOption;

  // Zeitstempel der Stimme für den aktuellen Abschnitt
  const voice0 = sec.voice[0];
  const timer = (text: string) =>
    speechTimer(text, voice0 && alignment?.[voice0.clip], voice0?.at ?? 0, sec.duration, fps);

  // Einfrieren (falsche Option: Bild bleibt stehen, rotes Aufleuchten in diesem Moment)
  const shot = shotFor(s, sec);
  const freezeLocal = shot.freeze !== undefined ? Math.round(shot.freeze * sec.duration) : undefined;
  const frozen = freezeLocal !== undefined && local >= freezeLocal;
  const sinceFreeze = freezeLocal !== undefined ? local - freezeLocal : 0;
  const flashFrame = freezeLocal !== undefined && !isCorrect ? sinceFreeze : local;
  const stageName = stageNameAt(s, shot, frozen ? shot.freeze! : t);
  const stage = STAGES[stageName];

  // kurzer Abblende-Übergang an jedem Schnitt (auch bei Bühnenwechsel mitten im Abschnitt)
  const cutFade = Math.max(
    interpolate(local, [0, 5], [0.55, 0], {extrapolateRight: 'clamp'}),
    ...stageCuts(shot).map((c) => {
      const d = local - Math.round(c * sec.duration);
      return d < 0 ? 0 : interpolate(d, [0, 6], [0.6, 0], {extrapolateRight: 'clamp'});
    }),
  );

  return (
    <AbsoluteFill style={{backgroundColor: T.anthracite}}>
      {stage ? (
        <AbsoluteFill
          style={{
            filter: frozen
              ? `saturate(${interpolate(sinceFreeze, [0, 6], [1, 0.6], {extrapolateRight: 'clamp'})}) contrast(1.05)`
              : undefined,
          }}
        >
          <Freeze frame={sec.from + (freezeLocal ?? 0)} active={frozen}>
            <Scene3D
              stage={stage}
              shot={shot}
              t={frozen ? shot.freeze! : t}
              camT={t}
              seconds={sec.duration / fps}
            />
          </Freeze>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{color: 'white', fontSize: 50, padding: 100}}>Unbekannte Bühne: {stageName}</AbsoluteFill>
      )}

      {/* Abblenden der Szene (z. B. bevor es kritisch wirkt) – Texte bleiben darüber sichtbar */}
      {shotFor(s, sec).fade && (
        <AbsoluteFill
          style={{
            backgroundColor: '#05090b',
            opacity: interpolate(t, [shotFor(s, sec).fade![0], shotFor(s, sec).fade![1]], [0, shotFor(s, sec).fade![2]], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        />
      )}

      {/* Abdunklung oben/unten für Lesbarkeit */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(15,17,20,0.55) 0%, rgba(15,17,20,0) 22%, rgba(15,17,20,0) 50%, rgba(15,17,20,0.6) 78%, rgba(15,17,20,0.85) 100%)',
        }}
      />
      <AbsoluteFill style={{backgroundColor: 'black', opacity: cutFade}} />

      {sec.kind === 'situation' && (
        <>
          <CategoryBadge category={s.category} frame={local} />
          <Subtitle text={s.situation.speech} t={t} starts={timer(s.situation.speech)?.sentenceStarts} />
        </>
      )}

      {sec.kind === 'options' && (
        <>
          <CategoryBadge category={s.category} frame={99} />
          <Headline text="Was würdest du tun?" frame={local} top={300} />
          <Cards s={s} sec={sec} local={local} />
        </>
      )}

      {sec.kind === 'countdown' && (
        <>
          <CategoryBadge category={s.category} frame={99} />
          <div style={{position: 'absolute', left: 0, width: 1080, top: 300, display: 'flex', justifyContent: 'center'}}>
            <CountdownRing frame={local} seconds={sec.duration / fps} />
          </div>
          <Callout text={s.countdown.screen} frame={local} top={600} />
          <Cards s={s} sec={sec} local={local} />
        </>
      )}

      {sec.kind === 'reveal' && (
        <>
          <Flash color="green" frame={local} hold={0.2} />
          <Banner color={T.green} frame={local} top={400}>
            {s.reveal.screen}
          </Banner>
          <Cards s={s} sec={sec} local={local} />
        </>
      )}

      {sec.kind === 'explain' && sec.option && (
        <>
          {flashFrame >= 0 && <Flash color={isCorrect ? 'green' : 'red'} frame={flashFrame} />}
          <ExplainHeader number={sec.option} text={s.options[sec.option - 1].card} correct={isCorrect} frame={local} />
          <Subtitle
            text={s.options[sec.option - 1].explanation}
            t={t}
            starts={timer(s.options[sec.option - 1].explanation)?.sentenceStarts}
          />
          {isCorrect && <SourceLine text={s.sourceLine} frame={local - 10} top={440} />}
          {s.options[sec.option - 1].steps?.length ? (
            <StepList
              steps={s.options[sec.option - 1].steps!}
              explanation={s.options[sec.option - 1].explanation}
              t={t}
              fps={fps}
              sectionFrames={sec.duration}
              top={520}
              cueT={timer(s.options[sec.option - 1].explanation)?.cueT}
            />
          ) : null}
        </>
      )}

      {/* Stoppuhr (optional, aus der Szenario-Datei: "timer") */}
      {shot.timer && (
        <Stopwatch t={t} timer={shot.timer} sectionFrames={sec.duration} fps={fps} top={sec.kind === 'explain' ? 525 : 300} left={T.rightTop - 215} />
      )}

      {sec.kind === 'outro' && <OutroPanel text={s.outro.screen} frame={local} />}

      <AudioLayer
        s={s}
        timeline={timeline}
        hasVoice={!!alignment}
        fps={fps}
        shotFor={(x) => shotFor(s, x)}
      />

      {showSafeZones && <SafeZones />}
    </AbsoluteFill>
  );
};
