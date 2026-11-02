// Fichier généré par tools/gen-challenges.ts puis figé : NE PAS régénérer sans changer les versions.
// Chaque carte est validée par le solveur (voir tests/unit/challenges.test.ts).
import type { LevelDef } from '../../core/types';

export const PUZZLES: LevelDef[] = [
  // min 8 cases · plus long trajet gagnant 16 · réussite au hasard 28.2 % · 145 états · 31 impasses
  { key: 'puzzle-f01', version: 1, id: 1, name: 'La clairière', theme: 'challenge', difficulty: 'Facile', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['.#..E', '.###.', '.....', '.#.#.', '.....', '.###.', '..S..'] },
  // min 8 cases · plus long trajet gagnant 16 · réussite au hasard 41.9 % · 85 états · 11 impasses
  { key: 'puzzle-f02', version: 1, id: 2, name: 'Le sentier des mûres', theme: 'challenge', difficulty: 'Facile', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['..E..', '##.#.', '.#.#.', '.#.#.', '.....', '.#.#.', 'S....'] },
  // min 10 cases · plus long trajet gagnant 22 · réussite au hasard 31.9 % · 151 états · 24 impasses
  { key: 'puzzle-f03', version: 1, id: 3, name: 'Les quatre allées', theme: 'challenge', difficulty: 'Facile', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['E#...', '.#.#.', '...#.', '.#.#.', '...#.', '.#.#.', '....S'] },
  // min 10 cases · plus long trajet gagnant 14 · réussite au hasard 23.4 % · 49 états · 5 impasses
  { key: 'puzzle-f04', version: 1, id: 4, name: 'Le verger', theme: 'challenge', difficulty: 'Facile', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['..E#.', '.#.#.', '...#.', '.###.', '.....', '##.#.', '..S..'] },
  // min 10 cases · plus long trajet gagnant 14 · réussite au hasard 33.2 % · 87 états · 12 impasses
  { key: 'puzzle-f05', version: 1, id: 5, name: 'La haie sinueuse', theme: 'challenge', difficulty: 'Facile', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['....E', '.###.', '...#D', '.#.#.', '.....', '.###.', 'S....'] },
  // min 20 cases · plus long trajet gagnant 24 · réussite au hasard 3.5 % · 181 états · 34 impasses
  { key: 'puzzle-i01', version: 1, id: 6, name: 'Le jardin des lavandes', theme: 'challenge', difficulty: 'Intermédiaire', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['E......', '.#.###.', '......D', '.#.###.', '..D#...', '.#.#.##', '.#....S'] },
  // min 12 cases · plus long trajet gagnant 20 · réussite au hasard 9.9 % · 115 états · 17 impasses
  { key: 'puzzle-i02', version: 1, id: 7, name: 'Le petit labyrinthe', theme: 'challenge', difficulty: 'Intermédiaire', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['E.D....', '.#.##~B', '.....#.', '.###.##', '.......', '##.###.', '..S...L'] },
  // min 12 cases · plus long trajet gagnant 20 · réussite au hasard 7.3 % · 168 états · 25 impasses
  { key: 'puzzle-i03', version: 1, id: 8, name: 'La boucle du ruisseau', theme: 'challenge', difficulty: 'Intermédiaire', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['E..#...', '##.#.#.', '.#.....', '.#.#.#.', '...#.#.', '.###.#.', '..S.D..'] },
  // min 12 cases · plus long trajet gagnant 20 · réussite au hasard 4.8 % · 331 états · 64 impasses
  { key: 'puzzle-i04', version: 1, id: 9, name: 'Le carré des simples', theme: 'challenge', difficulty: 'Intermédiaire', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['..E....', '####.#.', '..L.D#.', '.#.#.#.', '.#D....', '.#.#.~B', '....S#.'] },
  // min 14 cases · plus long trajet gagnant 22 · réussite au hasard 7.7 % · 105 états · 13 impasses
  { key: 'puzzle-i05', version: 1, id: 10, name: 'Les allées croisées', theme: 'challenge', difficulty: 'Intermédiaire', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['....E.D', '.#####.', '....D..', '.###.#.', '.....#.', '.###.#.', 'S..#...'] },
  // min 26 cases · plus long trajet gagnant 34 · réussite au hasard 0.7 % · 475 états · 98 impasses
  { key: 'puzzle-x01', version: 1, id: 11, name: 'Le grand détour', theme: 'challenge', difficulty: 'Expert', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['K...E..', '.#.###.', '.#D..#.', '.#.#.#P', '.#.#...', '.#.#.#.', '.....#.', '.#.#.~B', 'L.S.D..'] },
  // min 22 cases · plus long trajet gagnant 34 · réussite au hasard 4.1 % · 1377 états · 264 impasses
  { key: 'puzzle-x02', version: 1, id: 12, name: 'Le jardin suspendu', theme: 'challenge', difficulty: 'Expert', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['E#.....', '.#.###.', '.......', '.#.###.', '......D', '.#.###.', '..D..#.', '.###.#.', '..S....'] },
  // min 24 cases · plus long trajet gagnant 36 · réussite au hasard 4.0 % · 162 états · 29 impasses
  { key: 'puzzle-x03', version: 1, id: 13, name: 'Le dédale des roses', theme: 'challenge', difficulty: 'Expert', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['....D.E', '##P#.#.', '.......', '.#####.', '....K..', '##.###.', '..D....', '.######', '......S'] },
  // min 18 cases · plus long trajet gagnant 30 · réussite au hasard 0.4 % · 1251 états · 303 impasses
  { key: 'puzzle-x04', version: 1, id: 14, name: 'Le cœur du parc', theme: 'challenge', difficulty: 'Expert', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['...#.PE', '#~B~##.', '....L.K', '.###.#.', '....D#.', '.#.#.#.', 'D#.....', '.#.#.#.', '....S..'] },
  // min 18 cases · plus long trajet gagnant 34 · réussite au hasard 2.9 % · 703 états · 161 impasses
  { key: 'puzzle-x05', version: 1, id: 15, name: 'La promenade du soir', theme: 'challenge', difficulty: 'Expert', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['E#.....', '.#.#.#.', '..D....', '.###.#.', 'L......', '.#####.', '.#.....', 'B~.#.#.', '..S#...'] },
  // min 18 cases · plus long trajet gagnant 34 · réussite au hasard 1.1 % · 810 états · 199 impasses
  { key: 'puzzle-x06', version: 1, id: 16, name: 'La clairière', theme: 'challenge', difficulty: 'Expert', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: ['.#..D.E', '.~B~##.', '.......', '.#.#.#.', '..D....', '.#####.', '.....#.', '.#.#.#.', 'S.L#...'] },
];
