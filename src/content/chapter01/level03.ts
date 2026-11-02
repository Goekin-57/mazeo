import type { LevelDef } from '../../core/types';

// La sortie est visible tout de suite, mais il faut d'abord le caneton.
const level: LevelDef = {
  key: 'chapter01-level03',
  version: 1,
  id: 3,
  name: 'Le caneton perdu',
  theme: 'pond',
  difficulty: 'Facile',
  objective: 'Récupère le caneton puis rentre',
  exitStyle: 'mother-duck',
  map: [
    '########',
    '#S....E#',
    '#.####.#',
    '#..D...#',
    '###.##.#',
    '#......#',
    '########',
  ],
  hints: { blockedExit: 'Maman cane attend son caneton' },
};
export default level;
