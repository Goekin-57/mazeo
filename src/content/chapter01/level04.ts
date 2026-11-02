import type { LevelDef } from '../../core/types';

// Retouche de la carte de référence : la maison est placée juste au-dessus du pont,
// et deux cases d'obstacle deviennent le ruisseau, pour que le pont le traverse en ligne
// droite. La logique est identique (même levier, mêmes détours, pont atteint par le bas).
const level: LevelDef = {
  key: 'chapter01-level04',
  version: 1,
  id: 4,
  name: 'Le petit pont',
  theme: 'river',
  difficulty: 'Moyen',
  objective: 'Abaisse le levier et franchis le pont',
  exitStyle: 'house',
  map: [
    '#########',
    '######E##',
    '#S...~B~#',
    '#.##.#.##',
    '#...L...#',
    '#.#####.#',
    '#.......#',
    '#########',
  ],
  hints: { blockedExit: 'Le pont est replié : trouve le levier' },
};
export default level;
