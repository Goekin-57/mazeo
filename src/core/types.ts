// Types purs du moteur MAZEO — aucune dépendance à Phaser.

export enum Cell {
  Ground = 'ground',
  Wall = 'wall',
  Water = 'water',
  Start = 'start',
  Exit = 'exit',
  Collectible = 'collectible',
  Switch = 'switch',
  Door = 'door',
  Bridge = 'bridge',
}

/** Variante purement décorative d'un mur (n'a aucun effet sur la logique). */
export type WallDecor = 'hedge' | 'tree' | 'flowers' | 'rock' | 'bush';

export type CollectibleKind = 'duckling' | 'seed' | 'hedgehog' | 'bunny';
export type ExitStyle = 'house' | 'mother-duck' | 'gate' | 'burrow';
export type Theme = 'sunny' | 'flowers' | 'pond' | 'river' | 'botanic' | 'grand';

export interface CollectibleDef {
  id: number;
  x: number;
  y: number;
  kind: CollectibleKind;
}

export interface LevelDef {
  id: number;
  name: string;
  theme: Theme;
  difficulty: string;
  objective: string;
  /** Lignes de la carte. Légende : voir levels/legend.ts */
  map: string[];
  /** Type d'objet pour chaque lettre de collectible, dans l'ordre de lecture. */
  collectibles?: Record<string, CollectibleKind>;
  exitStyle: ExitStyle;
  /** Conseils affichés au joueur (tutoriel naturel). */
  hints?: { start?: string; firstMove?: string; stuck?: string; blockedExit?: string };
}

export interface Grid {
  width: number;
  height: number;
  cells: Cell[]; // index = y * width + x
  decor: (WallDecor | null)[];
  start: number;
  exit: number;
  collectibles: CollectibleDef[];
}

export interface GameState {
  pos: number;
  /** 1 = case définitivement fermée (haie poussée). */
  closed: Uint8Array;
  /** Bitmask des collectibles récupérés (par id). */
  collected: number;
  switchesOn: number; // bitmask des interrupteurs activés (index dans switchList)
  doorsOpen: boolean;
  bridgesOpen: boolean;
  won: boolean;
  steps: number;
}

export type Dir = 'up' | 'down' | 'left' | 'right';

export const DIRS: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export type BlockReason =
  | 'out'
  | 'wall'
  | 'water'
  | 'closed'
  | 'bridge-closed'
  | 'door-closed'
  | 'exit-locked'
  | 'not-adjacent'
  | 'won';

/** Ce qui s'est passé lors d'un pas : sert au rendu et aux sons. */
export interface StepEvents {
  from: number;
  to: number;
  closedCell: number | null;
  collected: CollectibleDef | null;
  switchActivated: boolean;
  bridgesOpened: boolean;
  doorsOpened: boolean;
  won: boolean;
  stuck: boolean;
}
