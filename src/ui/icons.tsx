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

const CATEGORIES: Record<string, {label: string; Icon: typeof Paw}> = {
  wildtiere: {label: 'Wildtiere', Icon: Paw},
  verkehr: {label: 'Verkehr', Icon: Car},
  alltag: {label: 'Alltag', Icon: House},
};

export const categoryInfo = (id: string) => CATEGORIES[id] ?? {label: id, Icon: Warning};
