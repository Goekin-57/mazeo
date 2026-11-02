import type { LevelDef } from '../core/types';

// Le mauvais tournant — deux intersections, deux impasses. Introduit « Annuler ».
const level: LevelDef = {
  id: 2,
  name: 'Le mauvais tournant',
  theme: 'flowers',
  difficulty: 'Facile',
  objective: 'Trouve la bonne route jusqu’au portail',
  exitStyle: 'gate',
  map: [
    'S...ft',
    '##.###',
    '.....#',
    '.f##.b',
    '.#...#',
    '.#.##t',
    '.#...E',
  ],
  hints: {
    start: 'Attention : certaines routes mènent à une impasse',
    stuck: 'Impasse ! Touche Annuler pour revenir en arrière',
  },
};
export default level;
