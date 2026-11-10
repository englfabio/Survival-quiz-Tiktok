import type {FC} from 'react';

export type StageDef = {
  id: string;
  /** Die 3D-Bühne (Licht, Boden, Bäume …) */
  Component: FC;
  /** Bäume, an denen Figuren mit der Bewegung "climb" hochklettern */
  climbTrees: {x: number; z: number; r: number}[];
  groundHeight: (x: number, z: number) => number;
};
