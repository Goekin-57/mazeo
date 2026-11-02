import type { LevelDef } from '../core/types';

// Le jardin secret — la graine magique ouvre l'arche florale.
const level: LevelDef = {
  id: 5,
  name: 'Le jardin secret',
  theme: 'botanic',
  difficulty: 'Moyen',
  objective: 'Trouve la graine magique pour ouvrir l’arche',
  exitStyle: 'gate',
  collectibles: { '1': 'seed' },
  map: [
    'tE#r#ft',
    '#D#t###',
    '.......',
    '.##f##.',
    '...1...',
    '.#f#b#.',
    '...S...',
  ],
  hints: {
    start: 'La graine magique ouvre l’arche fleurie',
    blockedExit: 'L’arche est fermée : il faut la graine magique',
  },
};
export default level;
