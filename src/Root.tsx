import {Composition, getRemotionEnvironment, staticFile, type CalculateMetadataFunction} from 'remotion';
import {scenarios} from './data/scenarios';
import {buildTimeline, FPS, HEIGHT, MIN_SECONDS, WIDTH, type ClipId} from './data/timeline';
import {validateScenario} from './data/validate';
import {QuizVideo, type QuizProps} from './QuizVideo';
import {Showcase, SHOWCASE_FRAMES} from './Showcase';
import {Test3D} from './Test3D';

type InputProps = {
  scenarioId: string;
  showSafeZones: boolean;
  /** Länge der Sprachaufnahmen in Sekunden (kommt in Schritt 2 "Stimme" automatisch) */
  audioSeconds?: Partial<Record<ClipId, number>>;
};

/** Lädt Sprachlängen + Zeitstempel aus public/voice/<id>/, falls vorhanden */
const loadVoice = async (id: string) => {
  try {
    const [d, a] = await Promise.all([
      fetch(staticFile(`voice/${id}/durations.json`)),
      fetch(staticFile(`voice/${id}/alignment.json`)),
    ]);
    if (!d.ok || !a.ok) return null;
    return {durations: await d.json(), alignment: await a.json()};
  } catch {
    return null;
  }
};

const calculateMetadata: CalculateMetadataFunction<InputProps & Partial<QuizProps>> = async ({props}) => {
  const entry = scenarios.find((e) => e.scenario.id === props.scenarioId);
  if (!entry) throw new Error(`Szenario "${props.scenarioId}" nicht gefunden.`);
  const errors = validateScenario(entry.scenario, entry.file);
  if (errors.length) throw new Error('Fehler in der Szenario-Datei:\n' + errors.join('\n'));

  const voice = props.audioSeconds ? null : await loadVoice(entry.scenario.id);
  const timeline = buildTimeline(entry.scenario, props.audioSeconds ?? voice?.durations);
  if (timeline.totalSeconds < MIN_SECONDS && getRemotionEnvironment().isRendering) {
    throw new Error(
      `STOPP: "${entry.scenario.id}" wäre nur ${timeline.totalSeconds.toFixed(1)} s lang ` +
        `(Minimum ${MIN_SECONDS} s). Es wird nicht gerendert – bitte Inhaber informieren.`,
    );
  }
  return {
    durationInFrames: timeline.totalFrames,
    props: {...props, scenario: entry.scenario, timeline, alignment: voice?.alignment},
    defaultOutName: entry.scenario.id,
  };
};

export const RemotionRoot = () => {
  return (
    <>
      {/* Ein Video pro Datei in /scenarios – automatisch */}
      {scenarios.map(({scenario}) => (
        <Composition
          key={scenario.id}
          id={scenario.id}
          component={QuizVideo as never}
          durationInFrames={FPS * 62}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          defaultProps={{scenarioId: scenario.id, showSafeZones: false}}
          calculateMetadata={calculateMetadata as never}
        />
      ))}
      {/* Baukasten: alle Bewegungen von Dummy und Bär zum Anschauen */}
      <Composition id="Baukasten" component={Showcase} durationInFrames={SHOWCASE_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Test3D" component={Test3D} durationInFrames={60} fps={30} width={1080} height={1920} />
    </>
  );
};
