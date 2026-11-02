import type { LevelDef } from '../../core/types';

// Une intersection dont une branche descend vers une impasse (rien ne la signale).
const level: LevelDef = {
  key: 'chapter01-level02',
  version: 1,
  id: 2,
  name: 'Le mauvais tournant',
  theme: 'flowers',
  difficulty: 'Facile',
  objective: 'Trouve la sortie sans te bloquer',
  exitStyle: 'gate',
  map: [
    '########',
    '#S.....#',
    '###.##.#',
    '#...#..#',
    '#####.E#',
    '#......#',
    '########',
  ],
};
export default level;
