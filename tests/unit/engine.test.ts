import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../../src/content/chapters';
import { idx, parseLevel, trimBorder } from '../../src/core/grid';
import { allMask, canEnter, initialState, step } from '../../src/core/rules';
import { canStillWin, replay, solve } from '../../src/core/solver';
import { Cell, type GameState, type Grid } from '../../src/core/types';

const LEVELS = CHAPTERS[0].levels;
const grid = (n: number) => parseLevel(LEVELS[n - 1]);
const D: Record<string, [number, number]> = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };

/** Suit des directions (R, L, U, D) ; échoue si un pas est refusé. */
function moves(g: Grid, seq: string, from?: GameState): GameState {
  let s = from ?? initialState(g);
  for (const c of seq) {
    const [dx, dy] = D[c];
    const x = (s.pos % g.width) + dx, y = Math.floor(s.pos / g.width) + dy;
    const r = step(g, s, idx(g, x, y));
    if ('blocked' in r) throw new Error(`pas « ${c} » refusé : ${r.blocked}`);
    s = r.state;
  }
  return s;
}

describe('légende V4 et cartes', () => {
  it('retire la bordure de « # »', () => {
    expect(trimBorder(['#####', '#S..#', '#####'])).toEqual(['S..']);
  });
  it('reconnaît D, K, L, P, B', () => {
    const g = parseLevel({ key: 't', version: 1, id: 0, name: '', theme: 'sunny', difficulty: '', objective: '', exitStyle: 'house', map: ['SDKLPBE'] });
    expect(g.collectibles.map((c) => c.kind)).toEqual(['duckling', 'seed']);
    expect(g.cells.slice(3, 6)).toEqual([Cell.Switch, Cell.Door, Cell.Bridge]);
  });
  it('les clés de niveaux sont stables et uniques', () => {
    const keys = LEVELS.map((l) => l.key);
    expect(keys).toEqual(['chapter01-level01', 'chapter01-level02', 'chapter01-level03', 'chapter01-level04', 'chapter01-level05', 'chapter01-level06']);
  });
});

describe('règles', () => {
  it('ferme la case quittée, départ compris', () => {
    const g = grid(1);
    const s = moves(g, 'R');
    expect(s.closed[g.start]).toBe(1);
    expect(canEnter(g, s, g.start)).toBe(false);
  });
  it('ne modifie jamais l’état précédent (annulation exacte)', () => {
    const g = grid(6);
    const s0 = initialState(g);
    const snap = JSON.stringify({ ...s0, closed: [...s0.closed] });
    moves(g, 'DD', s0);
    expect(JSON.stringify({ ...s0, closed: [...s0.closed] })).toBe(snap);
  });
  it('le pont et la porte ne se referment pas, le levier reste abaissé', () => {
    const g = grid(4);
    const s = moves(g, 'DDRRRRRUU');
    expect(s.bridgesOpen).toBe(true);
    const bridge = g.cells.indexOf(Cell.Bridge);
    expect(s.pos).toBe(bridge);
    const s2 = moves(g, 'U', s);
    expect(s2.won).toBe(true);
    expect(s2.closed[bridge]).toBe(0);
  });
});

describe('chapitre 1 : solutions de référence et intentions', () => {
  // Solutions de référence du cahier des charges (N4 : « haut » final au lieu de « droite », la maison est au-dessus du pont).
  const REF = ['RRDDLL', 'RRRRRDDD', 'DDRRRRRUU', 'DDRRRRRUUU', 'DDRRRRRUUR', 'DDDDRRRRRRDD'];
  REF.forEach((seq, i) => {
    it(`niveau ${i + 1} : la solution ${seq} gagne`, () => {
      const g = grid(i + 1);
      const s = moves(g, seq);
      expect(s.won).toBe(true);
      expect(s.collected).toBe(allMask(g));
    });
  });

  for (const def of LEVELS) {
    it(`${def.key} est soluble (espace d’états complet)`, () => {
      const g = parseLevel(def);
      const r = solve(g);
      expect(r.truncated).toBe(false);
      expect(r.solvable).toBe(true);
      expect(replay(g, r.shortest!).ok).toBe(true);
    });
  }

  it('niveau 1 : un seul trajet, aucun piège', () => {
    const r = solve(grid(1));
    expect(r.winningPaths).toBe(1);
    expect(r.deadEnds).toBe(0);
  });
  it('niveau 2 : la branche du bas est une impasse', () => {
    const g = grid(2);
    const s = moves(g, 'RRDD');
    expect(canStillWin(g, s)).toBe(false);
  });
  it('niveau 3 : sortie visible mais verrouillée sans le caneton', () => {
    const g = grid(3);
    const s = moves(g, 'RRRR');
    expect(step(g, s, g.exit)).toEqual({ blocked: 'exit-locked' });
    expect(canStillWin(g, s)).toBe(false);
  });
  it('niveau 4 : pont fermé avant le levier', () => {
    const g = grid(4);
    const bridge = g.cells.indexOf(Cell.Bridge);
    // atteindre le pied du pont sans le levier (par le bas)
    const s = moves(g, 'DDDDRRRRRRUULU');
    expect(s.bridgesOpen).toBe(false);
    expect(step(g, s, bridge)).toEqual({ blocked: 'bridge-closed' });
  });
  it('niveau 5 : porte fermée sans la graine', () => {
    const g = grid(5);
    const door = g.cells.indexOf(Cell.Door);
    const s = moves(g, 'DDRRDDRRRRUULU');
    expect(s.collected).toBe(0);
    expect(step(g, s, door)).toEqual({ blocked: 'door-closed' });
  });
  it('niveau 6 : les deux canetons et le levier sont nécessaires', () => {
    const g = grid(6);
    const r = solve(g);
    const s = replay(g, r.shortest!.slice(0, -1)).state;
    expect(s.collected).toBe(allMask(g));
    expect(s.bridgesOpen).toBe(true);
    expect(r.deadEnds).toBeGreaterThan(10);
  });
});
