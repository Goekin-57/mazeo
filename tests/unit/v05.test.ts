import { beforeEach, describe, expect, it } from 'vitest';
import { analyze, shortestFrom, starThresholds, stuckReason, verdict } from '../../src/core/analysis';
import { CHALLENGE_CRITERIA } from '../../src/content/challenges/criteria';
import { PUZZLES } from '../../src/content/challenges/library';
import { CHAPTERS } from '../../src/content/chapters';
import { idx, parseLevel } from '../../src/core/grid';
import { initialState, step } from '../../src/core/rules';
import type { GameState, Grid } from '../../src/core/types';
import { homeAction, nextUnfinished, recordAdventureWin, reconcileLevelVersions, starsFor } from '../../src/progress';
import { Save } from '../../src/save';
import { adventureStars } from '../../src/score';

const LEVELS = CHAPTERS[0].levels;
const D: Record<string, [number, number]> = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };
function walk(g: Grid, seq: string, from?: GameState) {
  let s = from ?? initialState(g);
  const path: number[] = [];
  for (const c of seq) {
    const [dx, dy] = D[c];
    const to = idx(g, (s.pos % g.width) + dx, Math.floor(s.pos / g.width) + dy);
    const r = step(g, s, to);
    if ('blocked' in r) throw new Error(`pas ${c} refusé : ${r.blocked}`);
    s = r.state;
    path.push(to);
  }
  return { s, path };
}

describe('niveaux v0.5 : vrais choix, étoiles calculées', () => {
  // décisions significatives minimales le long de la solution optimale (progression)
  const MIN_DECISIONS = [1, 2, 3, 3, 3, 5];
  LEVELS.forEach((def, i) => {
    it(`${def.name} : seuils d’étoiles = parcours réellement possibles`, () => {
      const a = analyze(parseLevel(def));
      expect(a.solvable).toBe(true);
      expect(def.stars).toEqual(starThresholds(a.winningLengths));
      expect(a.winningLengths).toContain(def.stars!.two);
      expect(def.version).toBe(2);
    });
    it(`${def.name} : au moins ${MIN_DECISIONS[i]} décision(s) significative(s)`, () => {
      const a = analyze(parseLevel(def));
      expect(a.decisionsOnSolution).toBeGreaterThanOrEqual(MIN_DECISIONS[i]);
      if (i > 0) expect(a.randomWin).toBeLessThan(0.5);
    });
  });
  it('grilles compactes après l’introduction (5×5 à 7×7)', () => {
    LEVELS.slice(1).forEach((def) => {
      const g = parseLevel(def);
      expect(Math.max(g.width, g.height)).toBeLessThanOrEqual(7);
      expect(Math.min(g.width, g.height)).toBeGreaterThanOrEqual(5);
    });
  });
  it('les noms demandés sont appliqués, les clés techniques conservées', () => {
    expect(LEVELS.map((l) => l.name)).toEqual(['La première pousse', 'Le mauvais tournant', 'Le caneton perdu', 'Le pont du ruisseau', 'Le jardin secret', 'Le grand parcours']);
    expect(LEVELS.map((l) => l.key)).toEqual(['chapter01-level01', 'chapter01-level02', 'chapter01-level03', 'chapter01-level04', 'chapter01-level05', 'chapter01-level06']);
  });
  it('étoiles : critère en déplacements', () => {
    expect(adventureStars(12, { three: 12, two: 16 })).toBe(3);
    expect(adventureStars(16, { three: 12, two: 16 })).toBe(2);
    expect(adventureStars(18, { three: 12, two: 16 })).toBe(1);
  });
});

describe('blocage : prouvé ou indéterminé, jamais deviné', () => {
  const g3 = parseLevel(LEVELS[2]);
  it('aucun coup légal → « no-move »', () => {
    const g1 = parseLevel(LEVELS[0]);
    const { s } = walk(g1, 'RRRDDR');
    expect(stuckReason(g1, s)).toBe('no-move');
    expect(verdict(g1, s)).toBe('lose');
  });
  it('des coups restent mais la partie est prouvée perdue', () => {
    const { s } = walk(g3, 'RRRR');
    expect(verdict(g3, s)).toBe('lose');
    expect(stuckReason(g3, s)).not.toBe('no-move');
  });
  it('recherche interrompue par la limite → « unknown » (pas de faux blocage)', () => {
    const g6 = parseLevel(LEVELS[5]);
    expect(verdict(g6, initialState(g6), 3)).toBe('unknown');
    expect(verdict(g6, initialState(g6))).toBe('win');
  });
  it('indice : le prochain coup d’un parcours gagnant depuis la position', () => {
    const { s } = walk(g3, 'DDDD');
    const p = shortestFrom(g3, s).path!;
    expect(p.length).toBe(9);
    expect(p[0]).toBe(idx(g3, 1, 4));
  });
});

describe('défis générés : critères documentés', () => {
  for (const p of PUZZLES) {
    it(`${p.key} respecte les critères ${p.difficulty}`, () => {
      const c = CHALLENGE_CRITERIA[p.difficulty as keyof typeof CHALLENGE_CRITERIA];
      const a = analyze(parseLevel(p));
      expect(a.optimal).toBeGreaterThanOrEqual(c.minMoves);
      expect(a.optimal).toBeLessThanOrEqual(c.maxMoves);
      expect(a.randomWin).toBeLessThanOrEqual(c.maxRandomWin);
      expect(a.winningLengths[a.winningLengths.length - 1] - a.optimal).toBeGreaterThanOrEqual(c.minSpread);
      expect(a.decisionsOnSolution).toBeGreaterThanOrEqual(c.minDecisions);
    });
  }
});

describe('progression et bouton principal de l’accueil', () => {
  beforeEach(() => Save.resetProgress());
  const win = (n: number) => {
    const def = LEVELS[n - 1];
    recordAdventureWin(def, analyze(parseLevel(def)).solution);
  };
  it('première ouverture → Commencer l’aventure (niveau 1)', () => {
    expect(homeAction()).toMatchObject({ kind: 'start', label: 'Commencer l’aventure', key: 'chapter01-level01' });
  });
  it('niveau terminé → Continuer l’aventure vers le prochain niveau non terminé', () => {
    win(1);
    expect(homeAction()).toMatchObject({ kind: 'continue', label: 'Continuer l’aventure', key: 'chapter01-level02' });
  });
  it('partie commencée → Reprendre le niveau (état exact)', () => {
    win(1);
    const g = parseLevel(LEVELS[1]);
    const { path } = walk(g, 'DDL');
    Save.saveRun({ key: LEVELS[1].key, version: 2, path, undos: 1, restarts: 0, updatedAt: '' });
    expect(homeAction()).toMatchObject({ kind: 'resume', label: 'Reprendre le niveau', key: 'chapter01-level02' });
    // un redémarrage (parcours vide) ne propose plus « Reprendre »
    Save.saveRun({ key: LEVELS[1].key, version: 2, path: [], undos: 0, restarts: 1, updatedAt: '' });
    expect(homeAction().kind).toBe('continue');
  });
  it('tout terminé → Rejouer un niveau, jamais « Continuer » vers un niveau déjà fini', () => {
    for (let n = 1; n <= 6; n++) win(n);
    expect(nextUnfinished()).toBeNull();
    expect(homeAction()).toMatchObject({ kind: 'replay', label: 'Rejouer un niveau', allDone: true });
  });
  it('carte modifiée : le record passe en « ancienne version », la progression reste', () => {
    Save.get().levels['chapter01-level03'] = { completed: true, stars: 2, bestMoves: 9 };
    reconcileLevelVersions();
    const l = Save.level('chapter01-level03')!;
    expect(l).toMatchObject({ completed: true, stars: 2, bestMoves: null, version: 2 });
    expect(l.legacy).toEqual([{ version: 1, bestMoves: 9, stars: 2 }]);
    expect(starsFor(LEVELS[2])).toEqual({ three: 13, two: 13 });
  });
  it('une partie sauvegardée d’une ancienne carte est ignorée', () => {
    Save.saveRun({ key: LEVELS[2].key, version: 1, path: [1, 2], undos: 0, restarts: 0, updatedAt: '' });
    reconcileLevelVersions();
    expect(Save.run()).toBeNull();
  });
});
