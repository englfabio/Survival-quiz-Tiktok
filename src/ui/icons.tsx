/** Kategorie-Symbole. Neue Kategorie = hier ein Symbol ergänzen (sonst Warndreieck). */

const Paw = ({size, color}: {size: number; color: string}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <ellipse cx="50" cy="66" rx="22" ry="18" fill={color} />
    <ellipse cx="22" cy="42" rx="9" ry="12" fill={color} transform="rotate(-20 22 42)" />
    <ellipse cx="40" cy="26" rx="9" ry="12" fill={color} />
    <ellipse cx="60" cy="26" rx="9" ry="12" fill={color} />
    <ellipse cx="78" cy="42" rx="9" ry="12" fill={color} transform="rotate(20 78 42)" />
  </svg>
);

const Warning = ({size, color}: {size: number; color: string}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M50 8 L94 88 H6 Z" fill="none" stroke={color} strokeWidth="9" strokeLinejoin="round" />
    <rect x="45" y="36" width="10" height="28" rx="3" fill={color} />
    <circle cx="50" cy="74" r="6" fill={color} />
  </svg>
);

export const CommentIcon = ({size, color}: {size: number; color: string}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path
      d="M14 18 H86 A8 8 0 0 1 94 26 V64 A8 8 0 0 1 86 72 H44 L24 90 V72 H14 A8 8 0 0 1 6 64 V26 A8 8 0 0 1 14 18 Z"
      fill={color}
    />
  </svg>
);

const Car = ({size, color}: {size: number; color: string}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M14 58 L22 34 Q25 27 33 27 H67 Q75 27 78 34 L86 58 Q92 60 92 66 V76 H8 V66 Q8 60 14 58 Z M27 56 H73 L67 38 Q66 35 62 35 H38 Q34 35 33 38 Z" fill={color} fillRule="evenodd" />
    <circle cx="26" cy="78" r="9" fill={color} />
    <circle cx="74" cy="78" r="9" fill={color} />
  </svg>
);

const House = ({size, color}: {size: number; color: string}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M50 10 L92 48 H80 V88 H58 V64 H42 V88 H20 V48 H8 Z" fill={color} />
  </svg>
);

const Water = ({size, color}: {size: number; color: string}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M50 6 C62 26 74 38 74 54 A24 24 0 0 1 26 54 C26 38 38 26 50 6 Z" fill={color} />
    <path d="M6 80 Q17 71 28 80 T50 80 T72 80 T94 80" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />
    <path d="M6 93 Q17 84 28 93 T50 93 T72 93 T94 93" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />
  </svg>
);

const FirstAid = ({size, color}: {size: number; color: string}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect x="8" y="24" width="84" height="64" rx="10" fill={color} />
    <path d="M36 24 V16 A6 6 0 0 1 42 10 H58 A6 6 0 0 1 64 16 V24" fill="none" stroke={color} strokeWidth="7" />
    <path d="M43 38 H57 V49 H68 V63 H57 V74 H43 V63 H32 V49 H43 Z" fill="#2a2d31" />
  </svg>
);

const Fire = ({size, color}: {size: number; color: string}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path
      d="M50 6 C56 22 72 30 76 50 C80 70 68 92 50 94 C32 92 20 78 22 60 C24 46 34 40 36 28 C42 36 44 42 44 48 C50 40 54 26 50 6 Z"
      fill={color}
    />
    <path d="M50 58 C55 66 62 70 60 80 C58 88 42 88 40 80 C38 72 46 68 50 58 Z" fill="#2a2d31" />
  </svg>
);

/** Psyche: Kopf im Profil mit Herz darin */
const Psyche = ({size, color}: {size: number; color: string}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path
      d="M44 8 C66 8 82 24 82 44 C82 52 86 58 90 64 C92 67 90 70 86 70 H80 V80 C80 86 75 90 69 90 H58 V96 H24 V76 C14 68 8 56 8 44 C8 24 24 8 44 8 Z"
      fill={color}
    />
    <path d="M44 66 C30 56 24 50 24 42 C24 36 29 32 34 32 C38 32 42 34 44 38 C46 34 50 32 54 32 C59 32 64 36 64 42 C64 50 58 56 44 66 Z" fill="#2a2d31" />
  </svg>
);

/** Fundstücke: Lupe */
const Finds = ({size, color}: {size: number; color: string}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle cx="42" cy="42" r="26" fill="none" stroke={color} strokeWidth="11" />
    <path d="M61 61 L88 88" stroke={color} strokeWidth="14" strokeLinecap="round" />
    <path d="M30 34 A14 14 0 0 1 42 26" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
  </svg>
);

const CATEGORIES: Record<string, {label: string; Icon: typeof Paw}> = {
  wildtiere: {label: 'Wildtiere', Icon: Paw},
  verkehr: {label: 'Verkehr', Icon: Car},
  alltag: {label: 'Alltag', Icon: House},
  wasser: {label: 'Wasser', Icon: Water},
  'erste-hilfe': {label: 'Erste Hilfe', Icon: FirstAid},
  feuer: {label: 'Feuer', Icon: Fire},
  psyche: {label: 'Psyche', Icon: Psyche},
  fundstuecke: {label: 'Fundstücke', Icon: Finds},
};

export const categoryInfo = (id: string) => CATEGORIES[id] ?? {label: id, Icon: Warning};
