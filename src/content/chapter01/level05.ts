import type { LevelDef } from '../../core/types';

// v0.5 — La graine est au fond d'un cul-de-sac fermé par l'arche florale.
// Ramasser la graine ouvre l'arche, qui ne disparaît jamais : le cul-de-sac devient un passage.
// L'arche est visible dès le départ, à côté de la graine, avant toute décision irréversible.
const level: LevelDef = {
  key: 'chapter01-level05',
  version: 2,
  id: 5,
  name: 'Le jardin secret',
  theme: 'botanic',
  difficulty: 'Moyen',
  objective: 'Récupère la graine : elle ouvre l’arche florale.',
  exitStyle: 'gate',
  map: [
    '.....#E',
    '.###.#.',
    'S.#KP..',
    '.#..#.#',
    '...##.#',
    '#.....#',
  ],
  stars: { three: 12, two: 14 },
  hints: {
    blockedExit: 'Récupère la graine',
    idea: 'L’arche florale ne disparaît pas. Un cul-de-sac fermé par une arche n’en est plus un une fois la graine trouvée.',
  },
};
export default level;
