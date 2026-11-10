import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';

/** Wartet beim Rendern, bis die Schrift Barlow Condensed (lokal aus npm) geladen ist. */
export const useFonts = () => {
  const [handle] = useState(() => delayRender('Schrift Barlow Condensed laden'));
  useEffect(() => {
    Promise.all(
      ['500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 40px "Barlow Condensed"`)),
    ).finally(() => continueRender(handle));
  }, [handle]);
};
