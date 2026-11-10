import type {ReactElement} from 'react';
import {Html5Audio, Sequence, staticFile} from 'remotion';
import type {Scenario, SfxCue, Shot} from './data/types';
import type {Section, Timeline} from './data/timeline';
import type {StageDef} from './stage/types';

/**
 * Tonspur: Stimme, Hintergrundgeräusch der Bühne und Soundeffekte.
 * Lautstärken hier zentral einstellen.
 */
export const VOLUME = {
  voice: 1,
  ambience: 0.16,
  whoosh: 0.35,
  pop: 0.45,
  tick: 0.5,
  tension: 0.35,
  chime: 0.55,
  buzzer: 0.5,
};

const Sfx = ({id, from, volume}: {id: string; from: number; volume: number}) => (
  <Sequence from={Math.max(0, Math.round(from))} layout="none" name={`SFX ${id}`}>
    <Html5Audio src={staticFile(`sfx/${id}.mp3`)} volume={volume} />
  </Sequence>
);

export const AudioLayer = ({
  s,
  timeline,
  stage,
  hasVoice,
  fps,
  shotFor,
}: {
  s: Scenario;
  timeline: Timeline;
  stage?: StageDef;
  hasVoice: boolean;
  fps: number;
  shotFor: (sec: Section) => Shot;
}) => {
  const items: ReactElement[] = [];
  timeline.sections.forEach((sec, i) => {
    // Stimme
    if (hasVoice) {
      sec.voice.forEach((v) =>
        items.push(
          <Sequence key={`v-${v.clip}`} from={sec.from + v.at} layout="none" name={`Stimme ${v.clip}`}>
            <Html5Audio src={staticFile(`voice/${s.id}/${v.clip}.mp3`)} volume={VOLUME.voice} />
          </Sequence>,
        ),
      );
    }
    // Übergang
    if (i > 0) items.push(<Sfx key={`w-${i}`} id="whoosh" from={sec.from - 4} volume={VOLUME.whoosh} />);
    // Abschnitts-Effekte
    if (sec.kind === 'options') {
      sec.cardStarts?.forEach((c, j) => items.push(<Sfx key={`p-${j}`} id="karte-pop" from={sec.from + c} volume={VOLUME.pop} />));
    }
    if (sec.kind === 'countdown') {
      items.push(<Sfx key="tension" id="spannung" from={sec.from} volume={VOLUME.tension} />);
      for (let k = 0; k < 5; k++) items.push(<Sfx key={`t-${k}`} id="tick" from={sec.from + k * fps} volume={VOLUME.tick} />);
    }
    if (sec.kind === 'reveal') items.push(<Sfx key="rv" id="richtig" from={sec.from} volume={VOLUME.chime} />);
    if (sec.kind === 'explain') {
      const ok = sec.option === s.correctOption;
      items.push(<Sfx key={`e-${i}`} id={ok ? 'richtig' : 'falsch'} from={sec.from} volume={ok ? VOLUME.chime : VOLUME.buzzer} />);
    }
    // Effekte aus der Szenario-Datei (z. B. Bär brummt, Schritte)
    (shotFor(sec).sfx ?? []).forEach((c: SfxCue, j) =>
      items.push(<Sfx key={`c-${i}-${j}`} id={c.id} from={sec.from + c.t * sec.duration} volume={c.volume ?? 0.6} />),
    );
  });

  return (
    <>
      {stage?.ambience && (
        <Html5Audio src={staticFile(`sfx/${stage.ambience}.mp3`)} volume={VOLUME.ambience} loop />
      )}
      {items}
    </>
  );
};
