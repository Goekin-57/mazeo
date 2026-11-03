// Analyse exacte d'un labyrinthe (v0.5) : sert à concevoir les niveaux, à calculer les étoiles,
// à décider du blocage et à donner des indices. Aucune dépendance à Phaser.
//
// Unité de score : le « déplacement » = passer d'une case à une case voisine.
// Un geste qui fait traverser plusieurs cases compte autant de déplacements que de cases.
import { allMask, initialState, stateKey, step, validMoves } from './rules';
import type { GameState, Grid } from './types';

export type Verdict = 'win' | 'lose' | 'unknown';

/**
 * Peut-on encore gagner depuis cet état ? Recherche exhaustive en profondeur avec mémoïsation.
 * Si la limite d'états est atteinte, la réponse est « unknown » (jamais un faux « bloqué »).
 */
export function verdict(g: Grid, s: GameState, maxStates = 250_000): Verdict {
  const memo = new Map<string, boolean>();
  let budget = maxStates;
  let truncated = false;
  const onPath = new Set<string>();
  const win = (st: GameState): boolean => {
    if (st.won) return true;
    const k = stateKey(st);
    const m = memo.get(k);
    if (m !== undefined) return m;
    if (--budget < 0) { truncated = true; return false; }
    onPath.add(k);
    let ok = false;
    let tainted = false;
    for (const mv of validMoves(g, st)) {
      const r = step(g, st, mv);
      if ('blocked' in r) continue;
      if (onPath.has(stateKey(r.state))) { tainted = true; continue; }
      if (win(r.state)) { ok = true; break; }
      if (truncated) break;
    }
    onPath.delete(k);
    // un « perdu » obtenu en ignorant un état du trajet en cours n'est pas définitif
    if (!truncated && (ok || !tainted)) memo.set(k, ok);
    return ok;
  };
  const ok = win(s);
  if (ok) return 'win';
  return truncated ? 'unknown' : 'lose';
}

/** Plus court chemin gagnant depuis un état (BFS), ou null. `truncated` si la limite est atteinte. */
export function shortestFrom(g: Grid, s: GameState, maxStates = 400_000): { path: number[] | null; truncated: boolean } {
  if (s.won) return { path: [], truncated: false };
  const start = stateKey(s);
  const parent = new Map<string, { k: string; cell: number } | null>([[start, null]]);
  let frontier: [GameState, string][] = [[s, start]];
  while (frontier.length) {
    const next: [GameState, string][] = [];
    for (const [st, k] of frontier) {
      for (const mv of validMoves(g, st)) {
        const r = step(g, st, mv);
        if ('blocked' in r) continue;
        const nk = stateKey(r.state);
        if (parent.has(nk)) continue;
        parent.set(nk, { k, cell: mv });
        if (r.state.won) {
          const path: number[] = [];
          let cur: string | undefined = nk;
          while (cur && cur !== start) {
            const p: { k: string; cell: number } = parent.get(cur)!;
            path.unshift(p.cell);
            cur = p.k;
          }
          return { path, truncated: false };
        }
        if (parent.size > maxStates) return { path: null, truncated: true };
        next.push([r.state, nk]);
      }
    }
    frontier = next;
  }
  return { path: null, truncated: false };
}

export interface MoveKind {
  cell: number;
  wins: boolean;
}

export interface LevelAnalysis {
  solvable: boolean;
  optimal: number;
  /** Une solution optimale (cases visitées après le départ). */
  solution: number[];
  /** Longueurs de parcours gagnants possibles (triées). */
  winningLengths: number[];
  /** Nombre de parcours gagnants distincts. */
  winningPaths: number;
  states: number;
  /** États atteignables d'où l'on peut encore gagner. */
  winnableStates: number;
  /** Probabilité exacte de gagner en jouant au hasard (coups légaux équiprobables). */
  randomWin: number;
  /** Long de la solution optimale : coups forcés (1 seul coup légal). */
  forcedOnSolution: number;
  /** Long de la solution optimale : choix où au moins une option fait perdre (décision significative). */
  decisionsOnSolution: number;
  /** Long de la solution optimale : choix sans risque (toutes les options restent gagnantes). */
  freeOnSolution: number;
  /** Positions (cases) des décisions significatives le long de la solution, avec les mauvais coups. */
  decisionPoints: { at: number; step: number; good: number[]; bad: number[] }[];
  /** Nombre total d'états gagnables comportant un piège (difficulté globale). */
  trapStates: number;
  /** Cases praticables qui figurent sur au moins un parcours gagnant. */
  usefulCells: number[];
}

/** Analyse complète par exploration de tout l'espace d'états (petites cartes uniquement). */
export function analyze(g: Grid, maxStates = 1_500_000): LevelAnalysis {
  const start = initialState(g);
  const k0 = stateKey(start);
  // 1) Graphe complet des états atteignables
  const nodes = new Map<string, { st: GameState; kids: { cell: number; k: string }[] }>();
  const parents = new Map<string, string[]>();
  const queue: GameState[] = [start];
  nodes.set(k0, { st: start, kids: [] });
  while (queue.length) {
    const st = queue.pop()!;
    const k = stateKey(st);
    const node = nodes.get(k)!;
    if (st.won) continue;
    for (const mv of validMoves(g, st)) {
      const r = step(g, st, mv);
      if ('blocked' in r) continue;
      const nk = stateKey(r.state);
      node.kids.push({ cell: mv, k: nk });
      if (!parents.has(nk)) parents.set(nk, []);
      parents.get(nk)!.push(k);
      if (!nodes.has(nk)) {
        nodes.set(nk, { st: r.state, kids: [] });
        if (nodes.size > maxStates) throw new Error('analyse : espace d’états trop grand');
        queue.push(r.state);
      }
    }
  }
  // 2) Gagnabilité exacte (propagation arrière depuis les victoires, cycles compris)
  const win = new Set<string>();
  const back: string[] = [];
  for (const [k, n] of nodes) if (n.st.won) { win.add(k); back.push(k); }
  while (back.length) {
    const k = back.pop()!;
    for (const p of parents.get(k) ?? []) if (!win.has(p)) { win.add(p); back.push(p); }
  }
  // 3) Longueurs, nombre de parcours et probabilité au hasard (trajets sans répétition d'état)
  const lenMemo = new Map<string, Set<number>>();
  const countMemo = new Map<string, number>();
  const pMemo = new Map<string, number>();
  const onPath = new Set<string>();
  const visit = (k: string): void => {
    if (lenMemo.has(k)) return;
    const n = nodes.get(k)!;
    if (n.st.won) { lenMemo.set(k, new Set([0])); countMemo.set(k, 1); pMemo.set(k, 1); return; }
    onPath.add(k);
    const lens = new Set<number>();
    let count = 0, p = 0;
    for (const ch of n.kids) {
      if (onPath.has(ch.k)) continue;
      visit(ch.k);
      for (const l of lenMemo.get(ch.k)!) lens.add(l + 1);
      count = Math.min(1e9, count + countMemo.get(ch.k)!);
      p += pMemo.get(ch.k)!;
    }
    onPath.delete(k);
    lenMemo.set(k, lens);
    countMemo.set(k, count);
    pMemo.set(k, n.kids.length ? p / n.kids.length : 0);
  };
  visit(k0);

  const solvable = win.has(k0);
  const best = solvable ? shortestFrom(g, start, maxStates).path ?? [] : [];
  let forced = 0, decisions = 0, free = 0;
  const decisionPoints: LevelAnalysis['decisionPoints'] = [];
  let st = start;
  best.forEach((cell, i) => {
    const cs = nodes.get(stateKey(st))!.kids;
    if (cs.length === 1) forced++;
    else {
      const good = cs.filter((c) => win.has(c.k)).map((c) => c.cell);
      const bad = cs.filter((c) => !win.has(c.k)).map((c) => c.cell);
      if (bad.length) { decisions++; decisionPoints.push({ at: st.pos, step: i, good, bad }); }
      else free++;
    }
    const r = step(g, st, cell);
    if (!('blocked' in r)) st = r.state;
  });
  let traps = 0;
  const useful = new Set<number>();
  for (const k of win) {
    const n = nodes.get(k)!;
    useful.add(n.st.pos);
    if (n.kids.some((c) => !win.has(c.k))) traps++;
  }

  return {
    solvable,
    optimal: best.length,
    solution: best,
    winningLengths: [...(lenMemo.get(k0) ?? [])].sort((a, b) => a - b),
    winningPaths: countMemo.get(k0) ?? 0,
    states: nodes.size,
    winnableStates: win.size,
    randomWin: pMemo.get(k0) ?? 0,
    forcedOnSolution: forced,
    decisionsOnSolution: decisions,
    freeOnSolution: free,
    decisionPoints,
    trapStates: traps,
    usefulCells: [...useful].sort((a, b) => a - b),
  };
}

/** Seuils d'étoiles calculés à partir des parcours gagnants réellement possibles. */
export function starThresholds(winningLengths: number[]): { three: number; two: number } {
  const three = winningLengths[0];
  // ★★ : le deuxième itinéraire gagnant le plus court (ou l'optimal s'il n'y en a qu'un)
  const two = winningLengths[1] ?? three;
  return { three, two };
}

/** Pourquoi la partie ne peut plus être gagnée (texte exact, sans deviner). */
export function stuckReason(g: Grid, s: GameState): 'no-move' | 'item-unreachable' | 'exit-unreachable' | 'no-route' {
  if (validMoves(g, s).length === 0) return 'no-move';
  // accessibilité « statique » depuis la position (cases encore ouvertes, mécanismes ignorés)
  const open = (i: number) => !s.closed[i] && g.cells[i] !== 'wall' && g.cells[i] !== 'water';
  const seen = new Set<number>([s.pos]);
  const q = [s.pos];
  while (q.length) {
    const c = q.shift()!;
    const [x, y] = [c % g.width, Math.floor(c / g.width)];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= g.width || ny >= g.height) continue;
      const n = ny * g.width + nx;
      if (seen.has(n) || !open(n)) continue;
      seen.add(n);
      q.push(n);
    }
  }
  const missing = g.collectibles.filter((c) => !((s.collected >> c.id) & 1));
  if (missing.some((c) => !seen.has(c.y * g.width + c.x))) return 'item-unreachable';
  if (!seen.has(g.exit)) return 'exit-unreachable';
  void allMask;
  return 'no-route';
}
