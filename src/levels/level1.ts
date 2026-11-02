import type { LevelDef } from '../core/types';

// La première pousse — tutoriel : un seul chemin, aucun piège.
const level: LevelDef = {
  id: 1,
  name: 'La première pousse',
  theme: 'sunny',
  difficulty: 'Très facile',
  objective: 'Rejoins la petite maison',
  exitStyle: 'house',
  map: [
    'S..ft',
    '##.##',
    'tf..#',
    't##.r',
    'E...#',
  ],
  hints: {
    start: 'Touche Bourgeon puis glisse ton doigt le long du chemin',
    firstMove: 'Une haie pousse derrière toi : on ne revient pas en arrière !',
  },
};
export default level;
