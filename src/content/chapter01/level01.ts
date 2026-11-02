import type { LevelDef } from '../../core/types';

// Tutoriel : un seul chemin évident. Aucun texte, une main montre le geste.
const level: LevelDef = {
  key: 'chapter01-level01',
  version: 1,
  id: 1,
  name: 'La première pousse',
  theme: 'sunny',
  difficulty: 'Très facile',
  objective: 'Rejoins la maison',
  exitStyle: 'house',
  hideUndo: true,
  map: [
    '#####',
    '#S..#',
    '###.#',
    '#E..#',
    '#####',
  ],
};
export default level;
