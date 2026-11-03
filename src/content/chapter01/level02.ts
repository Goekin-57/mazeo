import type { LevelDef } from '../../core/types';

// v0.5 — Deux itinéraires autour de la zone centrale.
// Par la gauche (rangée du haut puis colonne de gauche) ou par le centre puis le côté gauche :
// les deux mènent à la sortie. Mauvais tournants : le grand tour par la droite s'arrête contre
// une haie ; en bas, repartir vers la droite ramène sur son propre chemin (cases disparues).
const level: LevelDef = {
  key: 'chapter01-level02',
  version: 2,
  id: 2,
  name: 'Le mauvais tournant',
  theme: 'flowers',
  difficulty: 'Facile',
  objective: 'Garde un passage vers la sortie.',
  exitStyle: 'gate',
  map: [
    '...S...',
    '.##.##.',
    '.#...#.',
    '.#.#.#.',
    '.....#.',
    'E######',
  ],
  stars: { three: 8, two: 10 },
  hints: {
    idea: 'Ton propre chemin devient infranchissable : avant chaque tournant, vérifie qu’il te reste une route vers la sortie.',
  },
};
export default level;
