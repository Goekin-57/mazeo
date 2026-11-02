import type { LevelDef } from '../core/types';

// Le grand détour — tout ce qui a été appris, réuni.
const level: LevelDef = {
  id: 6,
  name: 'Le grand détour',
  theme: 'grand',
  difficulty: 'Moyen à avancé',
  objective: 'Sauve le hérisson et le lapin, puis rentre',
  exitStyle: 'burrow',
  collectibles: { '1': 'hedgehog', '2': 'bunny' },
  map: [
    'E.....2',
    '.#f#.#.',
    '.......',
    '~~B~~~~',
    '~~B~~~~',
    '.......',
    '.#f.#b.',
    '1#..T#.',
    '...S...',
  ],
  hints: {
    start: 'Pense à ton trajet avant de foncer !',
    blockedExit: 'Il faut d’abord sauver les deux animaux',
  },
};
export default level;
