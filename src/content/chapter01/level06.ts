import type { LevelDef } from '../../core/types';

// v0.5 — Final en trois zones : la rive de départ (caneton + levier), le pont, puis
// l'autre rive séparée en deux par une plateforme du pont. Le pont ne disparaît pas :
// on fait le tour de la rive ouest pour le second caneton et l'on revient sur la plateforme.
const level: LevelDef = {
  key: 'chapter01-level06',
  version: 2,
  id: 6,
  name: 'Le grand parcours',
  theme: 'grand',
  difficulty: 'Avancé',
  objective: 'Récupère les 2 canetons, puis rejoins la sortie.',
  exitStyle: 'beacon',
  map: [
    '....#.E',
    '.##.#.#',
    '.D.B...',
    '~~~B~~~',
    '..#....',
    '.#.#.#.',
    'S.D..L.',
  ],
  stars: { three: 28, two: 28 },
  hints: {
    blockedExit: 'Récupère les 2 canetons',
    idea: 'Le pont ne disparaît pas : sa plateforme te permet de repartir dans une autre direction.',
  },
};
export default level;
