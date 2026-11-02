import type { LevelDef } from '../../core/types';

// La graine ouvre la porte florale ; il faut l'atteindre sans fermer le retour.
const level: LevelDef = {
  key: 'chapter01-level05',
  version: 1,
  id: 5,
  name: 'Le jardin secret',
  theme: 'botanic',
  difficulty: 'Moyen',
  objective: 'Trouve la graine pour ouvrir la porte florale',
  exitStyle: 'gate',
  map: [
    '#########',
    '#S...#PE#',
    '#.#.##.##',
    '#...K...#',
    '###.#.#.#',
    '#.......#',
    '#########',
  ],
  hints: { blockedExit: 'La porte florale est fermée : il faut la graine' },
};
export default level;
