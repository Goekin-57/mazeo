import { beforeEach, describe, expect, it } from 'vitest';
import { CALENDAR_VERSION, DAILY_ROTATION, dailyFor, msUntilNextDaily, PUZZLES, WEEKLY_SETS, weeklyFor } from '../../src/content/challenges/calendar';
import { parseLevel } from '../../src/core/grid';
import { initialState, stateKey, step, validMoves } from '../../src/core/rules';
import { solve } from '../../src/core/solver';
import { makeResult, rankTies, validatePath, adventureStars } from '../../src/score';
import { migrateV1 } from '../../src/save';
import { parseChallengeCode, challengeLink } from '../../src/social/share';

/** Plus long trajet gagnant (les défis doivent départager les joueurs). */
function longestWin(def: (typeof PUZZLES)[number]) {
  const g = parseLevel(def);
  const memo = new Map<string, number>();
  const rec = (s: ReturnType<typeof initialState>, d: number): number => {
    if (s.won) return 0;
    if (d > 80) return -Infinity;
    const k = stateKey(s);
    if (memo.has(k)) return memo.get(k)!;
    memo.set(k, -Infinity);
    let b = -Infinity;
    for (const m of validMoves(g, s)) { const r = step(g, s, m); if (!('blocked' in r)) b = Math.max(b, 1 + rec(r.state, d + 1)); }
    memo.set(k, b);
    return b;
  };
  return rec(initialState(g), 0);
}

describe('bibliothèque de défis', () => {
  it('au moins 7 défis quotidiens et des séries hebdomadaires de 3', () => {
    expect(DAILY_ROTATION.length).toBeGreaterThanOrEqual(7);
    WEEKLY_SETS.forEach((s) => expect(s.length).toBe(3));
  });
  it('identifiants uniques et versionnés', () => {
    const keys = PUZZLES.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    PUZZLES.forEach((p) => expect(p.version).toBeGreaterThanOrEqual(1));
  });
  it('trois catégories présentes', () => {
    expect(new Set(PUZZLES.map((p) => p.difficulty))).toEqual(new Set(['Facile', 'Intermédiaire', 'Expert']));
  });
  for (const p of PUZZLES) {
    it(`${p.key} (${p.difficulty}) : soluble et le nombre de cases départage`, () => {
      const r = solve(parseLevel(p));
      expect(r.truncated).toBe(false);
      expect(r.solvable).toBe(true);
      expect(validatePath(p, r.shortest!)).toBe(true);
      expect(longestWin(p) - r.shortest!.length).toBeGreaterThanOrEqual(4);
    });
  }
});

describe('calendrier', () => {
  const d = (s: string, h = 12) => new Date(`${s}T${String(h).padStart(2, '0')}:00:00Z`);
  it('même défi toute la journée (UTC), change le lendemain', () => {
    expect(dailyFor(d('2026-11-02', 0)).puzzle.key).toBe(dailyFor(d('2026-11-02', 23)).puzzle.key);
    expect(dailyFor(d('2026-11-02')).puzzle.key).not.toBe(dailyFor(d('2026-11-03')).puzzle.key);
    expect(dailyFor(d('2026-11-02')).contextId).toBe('daily-2026-11-02');
  });
  it('rotation cyclique, y compris avant la date de départ', () => {
    const n = DAILY_ROTATION.length;
    const a = dailyFor(d('2026-11-02')).puzzle.key;
    const b = new Date(d('2026-11-02').getTime() + n * 86400000);
    expect(dailyFor(b).puzzle.key).toBe(a);
    expect(() => dailyFor(d('2025-01-01'))).not.toThrow();
  });
  it('semaine ISO et série hebdomadaire', () => {
    expect(weeklyFor(d('2026-11-02')).contextId).toBe('weekly-2026-W45');
    expect(weeklyFor(d('2026-11-08')).puzzles).toEqual(weeklyFor(d('2026-11-02')).puzzles);
    expect(weeklyFor(d('2026-11-09')).puzzles).not.toEqual(weeklyFor(d('2026-11-02')).puzzles);
  });
  it('compte à rebours jusqu’à minuit UTC', () => {
    expect(msUntilNextDaily(d('2026-11-02', 22))).toBe(2 * 3600000);
    expect(CALENDAR_VERSION).toBe(1);
  });
});

describe('scores', () => {
  const p = PUZZLES[0];
  const best = solve(parseLevel(p)).shortest!;
  it('un trajet légal et gagnant est validé', () => {
    const r = makeResult(p, { contextId: 'daily-2026-11-02', mode: 'ranked', path: best, undos: 0, restarts: 0 });
    expect(r).toMatchObject({ puzzleId: p.key, puzzleVersion: 1, rulesVersion: 1, moves: best.length, validated: true });
    expect(r.path).toEqual(best);
  });
  it('un trajet falsifié est refusé', () => {
    expect(validatePath(p, best.slice(0, -1))).toBe(false);
    expect(validatePath(p, [...best.slice(0, 2), best[4], ...best.slice(5)])).toBe(false);
  });
  it('une tentative classée avec annulation n’est pas validée', () => {
    expect(makeResult(p, { contextId: 'x', mode: 'ranked', path: best, undos: 1, restarts: 0 }).validated).toBe(false);
  });
  it('ex æquo : même nombre de cases = même rang', () => {
    expect(rankTies([12, 10, 12, 14])).toEqual([2, 1, 2, 4]);
  });
  it('étoiles d’aventure fondées sur le parcours, jamais sur les annulations', () => {
    expect(adventureStars(10, 10)).toBe(3);
    expect(adventureStars(12, 10)).toBe(2);
    expect(adventureStars(20, 10)).toBe(1);
  });
});

describe('sauvegarde', () => {
  it('migration v1 → sauvegarde actuelle sans perte', () => {
    const v2 = migrateV1({ unlocked: 4, stars: { 1: 3, 2: 2, 3: 1 }, completed: { 1: true, 2: true, 3: true }, settings: { sound: false } });
    expect(v2.version).toBe(3);
    expect(v2.run).toBeNull();
    expect(v2.levels['chapter01-level02']).toMatchObject({ completed: true, stars: 2 });
    expect(v2.levels['chapter01-level04']).toBeUndefined();
    expect(v2.currentLevel).toBe('chapter01-level04');
    expect(v2.settings.sound).toBe(false);
  });
});

describe('partage', () => {
  beforeEach(() => undefined);
  it('le code identifie puzzle et version', () => {
    const p = PUZZLES[3];
    expect(parseChallengeCode(`${p.key}@${p.version}`)).toEqual({ ok: true, puzzleId: p.key, version: p.version });
    expect(parseChallengeCode(`${p.key}@99`)).toMatchObject({ ok: false });
    expect(parseChallengeCode('n-importe-quoi')).toMatchObject({ ok: false });
    expect(challengeLink(p.key, 1)).toContain(`?defi=${p.key}%401`);
  });
});
