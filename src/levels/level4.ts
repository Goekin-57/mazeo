import type { LevelDef } from '../core/types';

// Le vieux pont — l'interrupteur déploie le pont.
const level: LevelDef = {
  id: 4,
  name: 'Le vieux pont',
  theme: 'river',
  difficulty: 'Moyen',
  objective: 'Déploie le pont et traverse la rivière',
  exitStyle: 'gate',
  map: [
    'f.#..E',
    '#...##',
    '~~B~~~',
    '~~B~~~',
    '......',
    '.#ff#.',
    '.#ff#T',
    '..S...',
  ],
  hints: {
    start: 'Marche sur l’interrupteur pour déployer le pont',
    stuck: 'Le chemin vers le pont s’est refermé… Annule !',
  },
};
export default level;
