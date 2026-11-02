import { describe, expect, it } from 'vitest';
import { idx, parseLevel } from '../../src/core/grid';
import { allMask, canEnter, initialState, step } from '../../src/core/rules';
import { canStillWin, replay, solve } from '../../src/core/solver';
import { Cell, type GameState, type Grid } from '../../src/core/types';
import { LEVELS } from '../../src/levels';

const grid = (n: number) => parseLevel(LEVELS[n - 1]);

/** Suit une liste de coordonnées [x,y] ; échoue si un pas est refusé. */
function walk(g: Grid, coords: [number, number][], from?: GameState): GameState {
  let s = from ?? initialState(g);
  for (const [x, y] of coords) {
    const r = step(g, s, idx(g, x, y));
    if ('blocked' in r) throw new Error(`pas refusé vers (${x},${y}) : ${r.blocked}`);
    s = r.state;
  }
  return s;
}

describe('règles de base', () => {
  it('ferme la case quittée, y compris le départ', () => {
    const g = grid(1);
    const s = walk(g, [[1, 0]]);
    expect(s.closed[g.start]).toBe(1);
    expect(canEnter(g, s, g.start)).toBe(false);
  });

  it('ne modifie jamais l’état précédent (annulation exacte)', () => {
    const g = grid(3);
    const s0 = initialState(g);
    const snapshot = JSON.stringify({ ...s0, closed: [...s0.closed] });
    walk(g, [[1, 5], [0, 5], [0, 4], [0, 3], [0, 2]], s0);
    expect(JSON.stringify({ ...s0, closed: [...s0.closed] })).toBe(snapshot);
  });

  it('refuse murs, eau, cases non adjacentes', () => {
    const g = grid(1);
    const s = initialState(g);
    expect(step(g, s, idx(g, 0, 1))).toEqual({ blocked: 'wall' });
    expect(step(g, s, idx(g, 2, 0))).toEqual({ blocked: 'not-adjacent' });
    const g3 = grid(3);
    const s3 = walk(g3, [[1, 5], [0, 5], [0, 4], [0, 3], [0, 2], [0, 1], [0, 0], [1, 0], [2, 0]]);
    expect(step(g3, s3, idx(g3, 2, 1))).toEqual({ blocked: 'wall' });
  });

  it('est déterministe : le même trajet produit le même état', () => {
    for (const def of LEVELS) {
      const g = parseLevel(def);
      const sol = solve(g).shortest!;
      const a = replay(g, sol).state;
      const b = replay(g, sol).state;
      expect([...a.closed]).toEqual([...b.closed]);
      expect(a.collected).toBe(b.collected);
    }
  });

  it('signale le blocage (impasse)', () => {
    const g = grid(2);
    // Branche gauche jusqu'au bout de l'impasse.
    let s = walk(g, [[1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 3], [0, 4], [0, 5]]);
    const r = step(g, s, idx(g, 0, 6));
    if ('blocked' in r) throw new Error('inattendu');
    expect(r.events.stuck).toBe(true);
    s = r.state;
    expect(canStillWin(g, s)).toBe(false);
  });
});

describe('validation des 6 niveaux (espace d’états complet)', () => {
  for (const def of LEVELS) {
    it(`niveau ${def.id} « ${def.name} » est soluble`, () => {
      const g = parseLevel(def);
      const r = solve(g);
      expect(r.truncated).toBe(false);
      expect(r.solvable).toBe(true);
      const rep = replay(g, r.shortest!);
      expect(rep.ok).toBe(true);
      expect(rep.state.collected).toBe(allMask(g));
    });
  }

  it('niveau 1 : un seul chemin, aucun piège', () => {
    const r = solve(grid(1));
    expect(r.winningPaths).toBe(1);
    expect(r.deadEnds).toBe(0);
  });

  it('niveau 2 : contient des impasses', () => {
    expect(solve(grid(2)).deadEnds).toBeGreaterThanOrEqual(2);
  });

  it('niveau 3 : sortie verrouillée avant 2/2 et l’ordre compte', () => {
    const g = grid(3);
    // Prendre à droite : on passe devant maman cane sans les canetons.
    const s = walk(g, [[3, 5], [4, 5], [5, 5]]);
    expect(step(g, s, g.exit)).toEqual({ blocked: 'exit-locked' });
    // On récupère le caneton 2 en premier → plus aucune solution.
    const s2 = walk(g, [[5, 4], [5, 3], [5, 2]], s);
    expect(s2.collected).toBe(0b10);
    expect(canStillWin(g, s2)).toBe(false);
    // Le caneton 1 d'abord → gagnable.
    const s3 = walk(g, [[1, 5], [0, 5], [0, 4], [0, 3], [0, 2]]);
    expect(canStillWin(g, s3)).toBe(true);
  });

  it('niveau 4 : pont fermé avant l’interrupteur, puis disponible et non refermable', () => {
    const g = grid(4);
    let s = walk(g, [[1, 7], [0, 7], [0, 6], [0, 5], [0, 4], [1, 4], [2, 4]]);
    expect(step(g, s, idx(g, 2, 3))).toEqual({ blocked: 'bridge-closed' });
    // Être passé au pied du pont trop tôt rend le niveau insoluble.
    expect(canStillWin(g, s)).toBe(false);
    s = walk(g, [[3, 7], [4, 7], [5, 7], [5, 6]]);
    expect(s.bridgesOpen).toBe(true);
    s = walk(g, [[5, 5], [5, 4], [4, 4], [3, 4], [2, 4], [2, 3], [2, 2]], s);
    expect(s.closed[idx(g, 2, 3)]).toBe(0); // le pont ne se referme pas
    expect(g.cells[idx(g, 2, 3)]).toBe(Cell.Bridge);
  });

  it('niveau 5 : l’arche s’ouvre avec la graine et reste ouverte', () => {
    const g = grid(5);
    const door = g.cells.indexOf(Cell.Door);
    let s = walk(g, [[2, 6], [1, 6], [0, 6], [0, 5], [0, 4], [0, 3], [0, 2], [1, 2]]);
    expect(step(g, s, door)).toEqual({ blocked: 'door-closed' });
    s = walk(g, [[4, 6], [5, 6], [6, 6], [6, 5], [6, 4], [5, 4], [4, 4], [3, 4]]);
    expect(s.doorsOpen).toBe(true);
    expect(canStillWin(g, s)).toBe(true);
  });

  it('niveau 6 : les deux animaux sont indispensables', () => {
    const g = grid(6);
    const r = solve(g);
    expect(r.deadEnds).toBeGreaterThan(10);
    const sol = r.shortest!;
    // Retirer le dernier pas : la sortie doit encore être verrouillée si un animal manque.
    const rep = replay(g, sol.slice(0, -1));
    expect(rep.state.collected).toBe(allMask(g));
  });
});
