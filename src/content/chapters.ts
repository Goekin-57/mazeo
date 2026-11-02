import type { LevelDef } from '../core/types';
import l1 from './chapter01/level01';
import l2 from './chapter01/level02';
import l3 from './chapter01/level03';
import l4 from './chapter01/level04';
import l5 from './chapter01/level05';
import l6 from './chapter01/level06';

/** Thème d'accueil (diorama). Seul « garden » est implémenté dans ce prototype. */
export type HomeTheme = 'garden' | 'harbor' | 'city' | 'peaks' | 'workshop' | 'lanterns';

export interface ChapterDef {
  id: string; // identifiant stable « chapter01 »
  number: number;
  name: string;
  description: string;
  /** Niveaux (nombre variable selon les chapitres). */
  levels: LevelDef[];
  /** Disponible dans cette version du jeu. */
  available: boolean;
  /** Chapitre à terminer pour débloquer celui-ci. */
  requires?: string;
  /** Récompenses de fin de chapitre (identifiants de collection). */
  rewards: string[];
  visual: { accent: string; sky: string; ground: string; icon: 'garden' | 'harbor' | 'city' | 'peaks' | 'workshop' | 'lanterns' };
  homeTheme: HomeTheme;
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'chapter01', number: 1, name: 'Le Jardin des Origines',
    description: 'Les chemins disparaissent derrière les habitants. Bourgeon découvre le phénomène et rallume la première balise.',
    levels: [l1, l2, l3, l4, l5, l6], available: true, rewards: ['hat-gardener', 'badge-garden-keeper'],
    visual: { accent: '#7dbf5b', sky: '#cdeee9', ground: '#8fcd63', icon: 'garden' }, homeTheme: 'garden',
  },
  {
    id: 'chapter02', number: 2, name: 'Le Port des Marées',
    description: 'Par les chemins du littoral, Bourgeon rejoint un navire.',
    levels: [], available: false, requires: 'chapter01', rewards: [],
    visual: { accent: '#4fb3a9', sky: '#cfe8f3', ground: '#e8d6a8', icon: 'harbor' }, homeTheme: 'harbor',
  },
  {
    id: 'chapter03', number: 3, name: 'La Ville des Passages',
    description: 'Il répare les portes et les passages mécaniques de la ville.',
    levels: [], available: false, requires: 'chapter02', rewards: [],
    visual: { accent: '#d9772b', sky: '#f3e3cf', ground: '#d8c3a5', icon: 'city' }, homeTheme: 'city',
  },
  {
    id: 'chapter04', number: 4, name: 'Les Sommets Gelés',
    description: 'Il atteint la source des anciennes machines.',
    levels: [], available: false, requires: 'chapter03', rewards: [],
    visual: { accent: '#7fa7d9', sky: '#e3eef8', ground: '#f1f5f9', icon: 'peaks' }, homeTheme: 'peaks',
  },
  {
    id: 'chapter05', number: 5, name: "L'Atelier Oublié",
    description: 'Il remet en marche le système qui reliait les régions.',
    levels: [], available: false, requires: 'chapter04', rewards: [],
    visual: { accent: '#b9a3e3', sky: '#ece6f5', ground: '#c9b28a', icon: 'workshop' }, homeTheme: 'workshop',
  },
  {
    id: 'chapter06', number: 6, name: 'La Nuit des Lanternes',
    description: 'De retour chez lui, il restaure le Grand Sentier.',
    levels: [], available: false, requires: 'chapter05', rewards: [],
    visual: { accent: '#f2c94c', sky: '#2f3d5c', ground: '#5f7a5a', icon: 'lanterns' }, homeTheme: 'lanterns',
  },
];

export const chapterById = (id: string) => CHAPTERS.find((c) => c.id === id);

/** Retrouve un niveau d'aventure par sa clé. */
export function findLevel(key: string): { chapter: ChapterDef; level: LevelDef; index: number } | null {
  for (const chapter of CHAPTERS) {
    const index = chapter.levels.findIndex((l) => l.key === key);
    if (index >= 0) return { chapter, level: chapter.levels[index], index };
  }
  return null;
}

export const ALL_ADVENTURE_LEVELS = CHAPTERS.flatMap((c) => c.levels);
