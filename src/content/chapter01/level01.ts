import type { LevelDef } from '../../core/types';

// v0.5 — Introduction courte et active.
// Les 4 premiers déplacements sont forcés : on voit les cases disparaître derrière Bourgeon.
// Puis deux choix simples : chaque mauvais côté est une impasse d'une case, et comme la case
// d'où l'on vient a disparu, on ne peut plus revenir. C'est la règle, découverte par l'essai.
const level: LevelDef = {
  key: 'chapter01-level01',
  version: 2,
  id: 1,
  name: 'La première pousse',
  theme: 'sunny',
  difficulty: 'Très facile',
  objective: 'Rejoins la sortie.',
  exitStyle: 'house',
  map: [
    'S...#',
    '###.#',
    'E....',
    '##.##',
  ],
  stars: { three: 8, two: 8 },
  hints: {
    start: 'Les cases disparaissent après ton passage.',
    idea: 'Avant de tourner, regarde si le chemin continue : tu ne pourras pas revenir en arrière.',
  },
};
export default level;
