import type { LevelDef } from '../../core/types';

// v0.5 — Le caneton a deux accès (par le bas et par la droite).
// La rangée du haut mène droit à la sortie : c'est le passage du retour, il faut la garder.
// Solution : descendre à gauche, longer le bas, entrer chez le caneton par le bas, ressortir
// par la droite puis remonter vers la sortie.
const level: LevelDef = {
  key: 'chapter01-level03',
  version: 2,
  id: 3,
  name: 'Le caneton perdu',
  theme: 'pond',
  difficulty: 'Facile',
  objective: 'Récupère le caneton, puis rejoins la sortie.',
  exitStyle: 'mother-duck',
  map: [
    'S....E',
    '.###.#',
    '.#D...',
    '.#.##.',
    '......',
  ],
  stars: { three: 13, two: 13 },
  hints: {
    blockedExit: 'Récupère le caneton',
    idea: 'Le caneton a deux entrées : entre par l’une, ressors par l’autre, et garde un chemin jusqu’à la sortie.',
  },
};
export default level;
