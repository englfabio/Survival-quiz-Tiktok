import type {ReactElement} from 'react';
import {Html5Audio, Sequence, staticFile} from 'remotion';
import type {Scenario, SfxCue, Shot} from './data/types';
import type {Section, Timeline} from './data/timeline';
import {STAGES} from './stage';

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
  hasVoice,
  fps,
  shotFor,
}: {
  s: Scenario;
  timeline: Timeline;
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
      // Mit "freeze": Falsch-Ton genau beim Einfrieren
      const fz = shotFor(sec).freeze;
      const at = !ok && fz !== undefined ? sec.from + fz * sec.duration : sec.from;
      items.push(<Sfx key={`e-${i}`} id={ok ? 'richtig' : 'falsch'} from={at} volume={ok ? VOLUME.chime : VOLUME.buzzer} />);
    }
    // Effekte aus der Szenario-Datei (z. B. Bär brummt, Schritte)
    (shotFor(sec).sfx ?? []).forEach((c: SfxCue, j) =>
      items.push(<Sfx key={`c-${i}-${j}`} id={c.id} from={sec.from + c.t * sec.duration} volume={c.volume ?? 0.6} />),
    );
  });

  // Hintergrundgeräusch je Bühne (wechselt mit der Bühne; gleiche Geräusche hintereinander laufen durch)
  const amb: {from: number; to: number; id?: string}[] = [];
  const pushAmb = (from: number, to: number, stageName: string) => {
    const id = STAGES[stageName]?.ambience;
    const last = amb[amb.length - 1];
    if (last && last.id === id) last.to = to;
    else if (to > from) amb.push({from, to, id});
  };
  timeline.sections.forEach((sec) => {
    const st = shotFor(sec).stage;
    if (!st) return pushAmb(sec.from, sec.from + sec.duration, s.stage);
    if (typeof st === 'string') return pushAmb(sec.from, sec.from + sec.duration, st);
    const keys = st[0]?.t > 0 ? [{t: 0, stage: s.stage}, ...st] : st;
    keys.forEach((k, j) => {
      const a = sec.from + Math.round(k.t * sec.duration);
      const b = j + 1 < keys.length ? sec.from + Math.round(keys[j + 1].t * sec.duration) : sec.from + sec.duration;
      pushAmb(a, b, k.stage);
    });
  });

  return (
    <>
      {amb
        .filter((a) => a.id)
        .map((a) => (
          <Sequence key={`amb-${a.from}`} from={a.from} durationInFrames={a.to - a.from} layout="none" name={`Atmo ${a.id}`}>
            <Html5Audio src={staticFile(`sfx/${a.id}.mp3`)} volume={VOLUME.ambience} loop />
          </Sequence>
        ))}
      {items}
    </>
  );
};
