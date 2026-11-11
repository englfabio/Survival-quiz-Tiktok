import {useThree} from '@react-three/fiber';
import {useEffect, useMemo, useState} from 'react';
import {continueRender, delayRender, spring} from 'remotion';
import * as THREE from 'three';
import {T} from '../ui/theme';

/**
 * Thermometer-Schild (Figurname "thermometer"): Schild im Warnschild-Look mit Thermometer-Symbol und Text,
 * schaut immer zur Kamera. Bewegung "show" = erscheint (springt auf), alles andere = unsichtbar.
 * Text standardmäßig "ca. 45 °C". Breite ca. 0,5 m.
 */
const W = 640;
const Hh = 260;

const draw = (text: string) => {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = Hh;
  const g = c.getContext('2d')!;
  const r = 36;
  const box = (x: number, y: number, w: number, h: number, rad: number) => {
    g.beginPath();
    g.moveTo(x + rad, y);
    g.arcTo(x + w, y, x + w, y + h, rad);
    g.arcTo(x + w, y + h, x, y + h, rad);
    g.arcTo(x, y + h, x, y, rad);
    g.arcTo(x, y, x + w, y, rad);
    g.closePath();
  };
  box(8, 8, W - 16, Hh - 16, r);
  g.fillStyle = T.anthracite;
  g.fill();
  g.lineWidth = 14;
  g.strokeStyle = T.yellow;
  g.stroke();
  // Thermometer-Symbol
  const cx = 120;
  g.fillStyle = T.white;
  box(cx - 26, 40, 52, 140, 26);
  g.fill();
  g.beginPath();
  g.arc(cx, 186, 42, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = T.red;
  box(cx - 13, 78, 26, 110, 13);
  g.fill();
  g.beginPath();
  g.arc(cx, 186, 30, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = T.anthracite;
  for (let k = 0; k < 4; k++) g.fillRect(cx + 30, 62 + k * 26, 22, 7);
  // Text
  g.fillStyle = T.white;
  g.font = `800 118px ${T.font}`;
  g.textBaseline = 'middle';
  g.fillText(text, 200, Hh / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
};

export const Thermometer = ({time, visible, text = 'ca. 45 °C'}: {time: number; visible: boolean; text?: string}) => {
  // Erst zeichnen, wenn die Schrift geladen ist
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Thermometer-Schrift'));
  const advance = useThree((st) => st.advance);
  useEffect(() => {
    document.fonts.load(`800 118px "Barlow Condensed"`).finally(() => setReady(true));
  }, []);
  const tex = useMemo(() => (ready ? draw(text) : null), [ready, text]);
  const mat = useMemo(
    () => (tex ? new THREE.SpriteMaterial({map: tex, depthTest: false, transparent: true}) : null),
    [tex],
  );
  // Sobald das Schild gezeichnet ist: Bild neu berechnen, dann erst weiterrendern
  useEffect(() => {
    if (!mat) return;
    advance(performance.now());
    continueRender(handle);
  }, [mat, advance, handle]);
  if (!visible || !mat) return null;
  const s = spring({frame: time * 30, fps: 30, config: {damping: 12, stiffness: 170}});
  const w = 0.5 * s;
  return <sprite material={mat} scale={[w, (w * Hh) / W, 1]} renderOrder={30} />;
};
