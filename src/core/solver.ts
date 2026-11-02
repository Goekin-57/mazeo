import { initialState, stateKey, step, validMoves } from './rules';
import type { GameState, Grid } from './types';

export interface SolveReport {
  solvable: boolean;
  /** Une solution la plus courte (liste des cases visitées après le départ). */
  shortest: number[] | null;
  /** Nombre de trajets gagnants distincts (plafonné). */
  winningPaths: number;
  /** États distincts explorés (position + haies + objets + mécanismes). */
  statesExplored: number;
  /** États où le joueur est bloqué sans avoir gagné (impasses). */
  deadEnds: number;
  truncated: boolean;
}

/**
 * Exploration exhaustive de l'espace d'états complet du labyrinthe.
 * Contrairement à une simple recherche de chemin, chaque état inclut les
 * cases fermées, les objets récupérés et les mécanismes activés.
 */
export function solve(g: Grid, opts: { maxStates?: number; from?: GameState } = {}): SolveReport {
  const maxStates = opts.maxStates ?? 2_000_000;
  const start = opts.from ?? initialState(g);

  // 1) BFS : plus courte solution + comptage des états / impasses.
  const seen = new Set<string>([stateKey(start)]);
  const parent = new Map<string, { key: string; cell: number } | null>();
  parent.set(stateKey(start), null);
  let frontier: GameState[] = [start];
  let shortest: number[] | null = null;
  let deadEnds = 0;
  let truncated = false;

  while (frontier.length) {
    const next: GameState[] = [];
    for (const s of frontier) {
      const k = stateKey(s);
      if (s.won) {
        if (!shortest) {
          const path: number[] = [];
          let cur: string | null = k;
          while (cur) {
            const p = parent.get(cur);
            if (!p) break;
            path.unshift(posFromKey(cur));
            cur = p.key;
          }
          shortest = path;
        }
        continue;
      }
      const moves = validMoves(g, s);
      if (moves.length === 0) deadEnds++;
      for (const m of moves) {
        const r = step(g, s, m);
        if ('blocked' in r) continue;
        const nk = stateKey(r.state);
        if (seen.has(nk)) continue;
        seen.add(nk);
        parent.set(nk, { key: k, cell: m });
        next.push(r.state);
        if (seen.size > maxStates) {
          truncated = true;
          break;
        }
      }
      if (truncated) break;
    }
    if (truncated) break;
    frontier = next;
  }

  // 2) Comptage des trajets gagnants (mémoïsé par état).
  // Les ponts et arches ne se referment pas : des allers-retours sont possibles,
  // on ignore donc les états déjà présents sur le trajet en cours.
  const memo = new Map<string, number>();
  const onStack = new Set<string>();
  const CAP = 1_000_000;
  const count = (s: GameState): number => {
    if (s.won) return 1;
    const k = stateKey(s);
    const m = memo.get(k);
    if (m !== undefined) return m;
    if (onStack.has(k)) return 0;
    onStack.add(k);
    let total = 0;
    for (const mv of validMoves(g, s)) {
      const r = step(g, s, mv);
      if ('blocked' in r) continue;
      total = Math.min(CAP, total + count(r.state));
    }
    onStack.delete(k);
    memo.set(k, total);
    return total;
  };
  const winningPaths = truncated ? -1 : count(start);

  return {
    solvable: shortest !== null,
    shortest,
    winningPaths,
    statesExplored: seen.size,
    deadEnds,
    truncated,
  };
}

function posFromKey(k: string): number {
  return parseInt(k.slice(0, k.indexOf('|')), 10);
}

/** Rejoue un trajet et indique s'il gagne (utile pour les tests). */
export function replay(g: Grid, path: number[], from?: GameState): { state: GameState; ok: boolean; failedAt: number } {
  let s = from ?? initialState(g);
  for (let i = 0; i < path.length; i++) {
    const r = step(g, s, path[i]);
    if ('blocked' in r) return { state: s, ok: false, failedAt: i };
    s = r.state;
  }
  return { state: s, ok: s.won, failedAt: -1 };
}

/** Est-il encore possible de gagner depuis cet état ? */
export function canStillWin(g: Grid, s: GameState): boolean {
  return solve(g, { from: s, maxStates: 200_000 }).solvable;
}
