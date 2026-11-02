import type { LevelDef } from '../../core/types';

// Dernier niveau du chapitre : combinaison des mécanismes connus, sans nouveauté.
// Retouche de la carte de référence : le petit cul-de-sac sous le levier devient le
// ruisseau que franchit le pont (une impasse triviale de moins, même logique).
const level: LevelDef = {
  key: 'chapter01-level06',
  version: 1,
  id: 6,
  name: 'La grande promenade',
  theme: 'grand',
  difficulty: 'Moyen à avancé',
  objective: 'Sauve les 2 canetons et rallume la balise',
  exitStyle: 'beacon',
  map: [
    '#########',
    '#S....###',
    '#.##.####',
    '#D...####',
    '#.##.####',
    '#..D.L..#',
    '###.~~~B#',
    '#######E#',
    '#########',
  ],
  hints: { blockedExit: 'Il manque encore quelque chose…' },
};
export default level;
