import { areAdjacent, neighbors } from './grid';
import { Cell, type BlockReason, type GameState, type Grid, type StepEvents } from './types';

/**
 * Règles de MAZEO (entièrement déterministes) :
 * - Quitter une case de chemin (sol, départ, collectible, interrupteur) la ferme
 *   définitivement : une haie y pousse.
 * - Les ponts et l'arche florale ne se referment pas : une fois ouverts,
 *   ils restent disponibles pendant toute la tentative.
 * - Un interrupteur déploie tous les ponts du niveau.
 * - La graine magique ouvre toutes les portes florales.
 * - La sortie n'est accessible qu'une fois tous les objets récupérés.
 */

export function initialState(g: Grid): GameState {
  return {
    pos: g.start,
    closed: new Uint8Array(g.width * g.height),
    collected: 0,
    switchesOn: 0,
    doorsOpen: false,
    bridgesOpen: false,
    won: false,
    steps: 0,
  };
}

export function cloneState(s: GameState): GameState {
  return { ...s, closed: s.closed.slice() };
}

export const allMask = (g: Grid) => (1 << g.collectibles.length) - 1;
export const countCollected = (s: GameState) => {
  let n = 0;
  for (let m = s.collected; m; m &= m - 1) n++;
  return n;
};

export function isClosable(cell: Cell): boolean {
  return cell === Cell.Ground || cell === Cell.Start || cell === Cell.Collectible || cell === Cell.Switch;
}

export function collectibleAt(g: Grid, i: number) {
  const w = g.width;
  return g.collectibles.find((c) => c.y * w + c.x === i) ?? null;
}

/** Pourquoi la case `to` est-elle inaccessible depuis l'état `s` ? `null` = accessible. */
export function blockReason(g: Grid, s: GameState, to: number): BlockReason | null {
  if (s.won) return 'won';
  if (to < 0 || to >= g.cells.length) return 'out';
  if (!areAdjacent(g, s.pos, to)) return 'not-adjacent';
  if (s.closed[to]) return 'closed';
  switch (g.cells[to]) {
    case Cell.Wall:
      return 'wall';
    case Cell.Water:
      return 'water';
    case Cell.Bridge:
      return s.bridgesOpen ? null : 'bridge-closed';
    case Cell.Door:
      return s.doorsOpen ? null : 'door-closed';
    case Cell.Exit:
      return s.collected === allMask(g) ? null : 'exit-locked';
    default:
      return null;
  }
}

export const canEnter = (g: Grid, s: GameState, to: number) => blockReason(g, s, to) === null;

export function validMoves(g: Grid, s: GameState): number[] {
  if (s.won) return [];
  return neighbors(g, s.pos).filter((n) => canEnter(g, s, n));
}

/** Applique un pas. Retourne le nouvel état (l'ancien n'est jamais modifié). */
export function step(g: Grid, s: GameState, to: number): { state: GameState; events: StepEvents } | { blocked: BlockReason } {
  const reason = blockReason(g, s, to);
  if (reason) return { blocked: reason };

  const n = cloneState(s);
  const from = s.pos;
  let closedCell: number | null = null;
  if (isClosable(g.cells[from])) {
    n.closed[from] = 1;
    closedCell = from;
  }
  n.pos = to;
  n.steps = s.steps + 1;

  const events: StepEvents = {
    from,
    to,
    closedCell,
    collected: null,
    switchActivated: false,
    bridgesOpened: false,
    doorsOpened: false,
    won: false,
    stuck: false,
  };

  const cell = g.cells[to];
  if (cell === Cell.Collectible) {
    const c = collectibleAt(g, to)!;
    if (!(n.collected & (1 << c.id))) {
      n.collected |= 1 << c.id;
      events.collected = c;
      if (c.kind === 'seed' && !n.doorsOpen) {
        n.doorsOpen = true;
        events.doorsOpened = true;
      }
    }
  } else if (cell === Cell.Switch) {
    if (!n.bridgesOpen) {
      n.bridgesOpen = true;
      events.bridgesOpened = true;
    }
    events.switchActivated = true;
    n.switchesOn = 1;
  } else if (cell === Cell.Exit) {
    n.won = true;
    events.won = true;
  }

  events.stuck = !n.won && validMoves(g, n).length === 0;
  return { state: n, events };
}

export function stateKey(s: GameState): string {
  // Le reste de l'état (portes, ponts) se déduit des objets et interrupteurs.
  let k = `${s.pos}|${s.collected}|${s.switchesOn}|`;
  for (let i = 0; i < s.closed.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8 && i + b < s.closed.length; b++) byte |= s.closed[i + b] << b;
    k += String.fromCharCode(65 + (byte >> 4), 65 + (byte & 15));
  }
  return k;
}
