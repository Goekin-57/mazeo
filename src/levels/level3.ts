import type { LevelDef } from '../core/types';

// Les canetons perdus — l'ordre de récupération compte.
const level: LevelDef = {
  id: 3,
  name: 'Les canetons perdus',
  theme: 'pond',
  difficulty: 'Facile à moyen',
  objective: 'Ramène les 2 canetons à leur maman',
  exitStyle: 'mother-duck',
  collectibles: { '1': 'duckling', '2': 'duckling' },
  map: [
    '......',
    '.####.',
    '1#~~#2',
    '.#~~#.',
    '.####.',
    '..S...',
    'tbf#rE',
  ],
  hints: {
    start: 'Récupère les 2 canetons avant de rejoindre leur maman',
    blockedExit: 'Maman cane attend ses 2 canetons !',
    stuck: 'Bloqué… Annule et essaie un autre ordre',
  },
};
export default level;
