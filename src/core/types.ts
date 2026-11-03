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
export type ExitStyle = 'house' | 'mother-duck' | 'gate' | 'burrow' | 'beacon';
export type Theme = 'sunny' | 'flowers' | 'pond' | 'river' | 'botanic' | 'grand' | 'challenge';

export interface CollectibleDef {
  id: number;
  x: number;
  y: number;
  kind: CollectibleKind;
}

export interface LevelDef {
  /** Identifiant stable, ex. « chapter01-level03 » ou « puzzle-e03 ». */
  key: string;
  /** Version de la carte : à incrémenter dès que la carte change (les records restent comparables par version). */
  version: number;
  /** Numéro affiché (1, 2, 3…). */
  id: number;
  name: string;
  theme: Theme;
  difficulty: string;
  objective: string;
  /**
   * Lignes de la carte (légende V4, voir core/grid.ts). Une bordure extérieure
   * entièrement composée de « # » est retirée automatiquement.
   */
  map: string[];
  /** Type des collectibles numérotés 1-9 (les lettres D et K sont déjà typées). */
  collectibles?: Record<string, CollectibleKind>;
  exitStyle: ExitStyle;
  /** Masquer « Annuler » quand il n'apporte rien (déconseillé depuis la v0.5). */
  hideUndo?: boolean;
  /**
   * Seuils d'étoiles en déplacements, calculés par le solveur à partir des parcours gagnants
   * réellement possibles (vérifiés par les tests) : ★★★ ≤ three, ★★ ≤ two, ★ = réussite.
   */
  stars?: { three: number; two: number };
  /** Conseils courts. `idea` est le premier indice : il oriente la réflexion sans donner le chemin. */
  hints?: { start?: string; firstMove?: string; stuck?: string; blockedExit?: string; idea?: string };
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
