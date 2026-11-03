// Règles de score et format des résultats (prêts pour une validation serveur ultérieure).
import { parseLevel } from './core/grid';
import { initialState, step } from './core/rules';
import type { LevelDef } from './core/types';

/** Version des règles du jeu : à incrémenter si une règle de déplacement change. */
export const RULES_VERSION = 1;

export type PlayMode = 'adventure' | 'practice' | 'ranked';

export interface ScoreResult {
  /** Identifiant du contexte : « daily-2026-11-02 », « weekly-2026-W45 », « link », « chapter01-level03 ». */
  contextId: string;
  puzzleId: string;
  puzzleVersion: number;
  rulesVersion: number;
  mode: PlayMode;
  /** Score principal : nombre de déplacements (1 déplacement = 1 case ; plus petit = meilleur). */
  moves: number;
  undos: number;
  restarts: number;
  /** Résultat rejoué et confirmé par le moteur. */
  validated: boolean;
  date: string; // ISO
  /** Séquence des cases visitées (indices de grille), pour revalidation. */
  path: number[];
}

/**
 * Rejoue un trajet avec le moteur réel. Un résultat n'est « validé » que si le trajet
 * est légal du premier au dernier pas et se termine sur la sortie, objectifs remplis.
 * (Un serveur pourra appliquer exactement la même fonction.)
 */
export function validatePath(def: LevelDef, path: number[]): boolean {
  const g = parseLevel(def);
  let s = initialState(g);
  for (const cell of path) {
    const r = step(g, s, cell);
    if ('blocked' in r) return false;
    s = r.state;
  }
  return s.won;
}

export function makeResult(def: LevelDef, a: { contextId: string; mode: PlayMode; path: number[]; undos: number; restarts: number; now?: Date }): ScoreResult {
  return {
    contextId: a.contextId,
    puzzleId: def.key,
    puzzleVersion: def.version,
    rulesVersion: RULES_VERSION,
    mode: a.mode,
    moves: a.path.length,
    undos: a.undos,
    restarts: a.restarts,
    validated: validatePath(def, a.path) && (a.mode !== 'ranked' || a.undos === 0),
    date: (a.now ?? new Date()).toISOString(),
    path: a.path.slice(),
  };
}

/**
 * Étoiles d'aventure (facultatives, jamais bloquantes), en déplacements :
 * ★ niveau réussi · ★★ au plus `two` (deuxième meilleur itinéraire possible) · ★★★ au plus `three` (optimal).
 * Les seuils viennent du solveur. Annuler, Recommencer et les indices ne pénalisent jamais.
 */
export function adventureStars(moves: number, t: { three: number; two: number } | number): number {
  const th = typeof t === 'number' ? { three: t, two: Math.ceil(t * 1.25) } : t;
  if (moves <= th.three) return 3;
  if (moves <= th.two) return 2;
  return 1;
}

/** Classement local ex æquo : même nombre de cases = même rang (le temps n'intervient jamais). */
export function rankTies(scores: number[]): number[] {
  const sorted = [...scores].sort((a, b) => a - b);
  return scores.map((s) => sorted.indexOf(s) + 1);
}
