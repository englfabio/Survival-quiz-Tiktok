/** Farben und Maße im Stil "Warnschild". Hier zentral ändern. */
export const T = {
  anthracite: '#1e2226',
  anthraciteLight: '#2c3238',
  yellow: '#ffc400',
  green: '#22b85a',
  red: '#e5322d',
  white: '#ffffff',
  black: '#111111',
  font: '"Barlow Condensed", sans-serif',
  /** Ränder innerhalb der sicheren Bereiche */
  left: 60,
  rightTop: 1020, // obere Bildhälfte: bis 60 px vor dem Rand
  rightBottom: 920, // untere Bildhälfte: 140 px Sperrzone + 20 px Luft
  top: 190,
  bottom: 1420, // 1920 − 480 − 20 px Luft
};

export const hazardStripes = (size = 28) =>
  `repeating-linear-gradient(-45deg, ${T.yellow} 0 ${size}px, ${T.black} ${size}px ${size * 2}px)`;
