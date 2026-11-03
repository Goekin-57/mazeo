import type { LevelDef } from '../../core/types';

// v0.5 — Ordre des actions : le levier est dans un renfoncement à deux accès.
// La case au pied du pont ne doit être utilisée qu'une fois le levier abaissé.
// Solution courte : entrer chez le levier par la gauche, ressortir par la droite, remonter
// la colonne du milieu jusqu'au pied du pont.
const level: LevelDef = {
  key: 'chapter01-level04',
  version: 2,
  id: 4,
  name: 'Le pont du ruisseau',
  theme: 'river',
  difficulty: 'Moyen',
  objective: 'Active le levier, puis traverse le pont.',
  exitStyle: 'house',
  map: [
    '###E###',
    '~~~B~~~',
    '.......',
    '.#.#.#.',
    '...#...',
    'S#.L.#.',
  ],
  stars: { three: 12, two: 16 },
  hints: {
    blockedExit: 'Active le levier',
    idea: 'Le pied du pont ne sert qu’une fois : n’y passe qu’après avoir abaissé le levier.',
  },
};
export default level;
