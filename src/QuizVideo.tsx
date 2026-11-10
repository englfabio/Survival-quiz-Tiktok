import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Flash} from './effects/Flash';
import type {Scenario, Shot} from './data/types';
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
};

const shotFor = (s: Scenario, sec: Section): Shot => {
  switch (sec.kind) {
    case 'explain':
      return s.options[(sec.option ?? 1) - 1].choreography;
    default:
      return s.shots[sec.kind];
  }
};

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

export const QuizVideo = ({scenario: s, timeline, showSafeZones}: QuizProps) => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = sectionAt(timeline, frame);
  const local = frame - sec.from;
  const t = Math.min(1, local / sec.duration);
  const stage = STAGES[s.stage];
  const isCorrect = sec.kind === 'explain' && sec.option === s.correctOption;

  // kurzer Abblende-Übergang an jedem Schnitt
  const cutFade = interpolate(local, [0, 5], [0.55, 0], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: T.anthracite}}>
      {stage ? (
        <Scene3D stage={stage} shot={shotFor(s, sec)} t={t} seconds={sec.duration / fps} />
      ) : (
        <AbsoluteFill style={{color: 'white', fontSize: 50, padding: 100}}>Unbekannte Bühne: {s.stage}</AbsoluteFill>
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
          <Subtitle text={s.situation.speech} t={t} />
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
          <Flash color={isCorrect ? 'green' : 'red'} frame={local} />
          <ExplainHeader number={sec.option} text={s.options[sec.option - 1].card} correct={isCorrect} frame={local} />
          <Subtitle text={s.options[sec.option - 1].explanation} t={t} />
          {isCorrect && <SourceLine text={s.sourceLine} frame={local - 10} top={440} />}
        </>
      )}

      {sec.kind === 'outro' && <OutroPanel text={s.outro.screen} frame={local} />}

      {showSafeZones && <SafeZones />}
    </AbsoluteFill>
  );
};
