// Logique de progression : étoiles, meilleurs parcours, récompenses, accueil évolutif.
import { ALL_ADVENTURE_LEVELS, CHAPTERS, findLevel } from './content/chapters';
import { LEVEL_REWARDS, rewardById } from './content/rewards';
import { parseLevel } from './core/grid';
import { analyze, starThresholds } from './core/analysis';
import { solve } from './core/solver';
import type { LevelDef } from './core/types';
import { Save } from './save';
import { adventureStars, type ScoreResult } from './score';

const optimalCache = new Map<string, number>();
/** Nombre minimal de cases (solveur), mis en cache par puzzle et version. */
export function optimalMoves(def: LevelDef): number {
  const k = `${def.key}@${def.version}`;
  let v = optimalCache.get(k);
  if (v === undefined) {
    v = solve(parseLevel(def)).shortest?.length ?? 0;
    optimalCache.set(k, v);
  }
  return v;
}

const thresholdCache = new Map<string, { three: number; two: number }>();
/**
 * Seuils d'étoiles d'un niveau, en déplacements. Ceux déclarés dans la carte sont vérifiés par
 * les tests contre le solveur ; à défaut ils sont calculés à la volée.
 */
export function starsFor(def: LevelDef): { three: number; two: number } {
  if (def.stars) return def.stars;
  const k = `${def.key}@${def.version}`;
  let t = thresholdCache.get(k);
  if (!t) {
    t = starThresholds(analyze(parseLevel(def)).winningLengths);
    thresholdCache.set(k, t);
  }
  return t;
}

/** Les records d'une ancienne version de carte sont mis de côté (appelé au démarrage). */
export function reconcileLevelVersions() {
  for (const def of ALL_ADVENTURE_LEVELS) Save.syncLevelVersion(def.key, def.version);
  const run = Save.run();
  if (run) {
    const f = findLevel(run.key);
    if (!f || f.level.version !== run.version) Save.saveRun(null);
  }
}

/** Équipe automatiquement une récompense qui vient d'être obtenue (pour qu'elle se voie tout de suite). */
function grantAndEquip(id: string): boolean {
  if (!Save.grant(id)) return false;
  const r = rewardById(id);
  if (r?.slot === 'hat' || r?.slot === 'scarf' || r?.slot === 'companion') Save.equip(r.slot, id);
  if (r?.slot === 'decor') Save.toggleDecor(id, true);
  return true;
}

export const isUnlocked = (key: string): boolean => {
  const f = findLevel(key);
  if (!f || !f.chapter.available) return false;
  if (f.chapter.requires && !Save.chapter(f.chapter.requires).completed) return false;
  if (f.index === 0) return true;
  return !!Save.level(f.chapter.levels[f.index - 1].key)?.completed;
};

export interface AdventureOutcome {
  stars: number;
  optimal: number;
  newBest: boolean;
  /** Première réussite sur cette version de la carte (l'optimal n'était pas encore révélé). */
  firstWin: boolean;
  thresholds: { three: number; two: number };
  bestMoves: number;
  rewards: string[];
  chapterCompleted: string | null;
  nextKey: string | null;
}

export function recordAdventureWin(def: LevelDef, path: number[]): AdventureOutcome {
  const optimal = optimalMoves(def);
  const stars = adventureStars(path.length, starsFor(def));
  const firstWin = !Save.level(def.key)?.completed || Save.level(def.key)?.bestMoves === null;
  const newBest = Save.recordLevel(def.key, def.version, stars, path.length, path);
  Save.saveRun(null);
  const rewards = (LEVEL_REWARDS[def.key] ?? []).filter(grantAndEquip);
  const f = findLevel(def.key)!;
  let chapterCompleted: string | null = null;
  const chapterDone = f.chapter.levels.every((l) => Save.level(l.key)?.completed);
  if (chapterDone && !Save.chapter(f.chapter.id).completed) {
    Save.completeChapter(f.chapter.id);
    chapterCompleted = f.chapter.id;
    rewards.push(...f.chapter.rewards.filter(grantAndEquip));
  }
  const next = f.chapter.levels[f.index + 1]?.key ?? null;
  Save.setCurrent(next ?? def.key);
  return { stars, optimal, newBest, firstWin, bestMoves: Save.level(def.key)!.bestMoves!, rewards, chapterCompleted, nextKey: next, thresholds: starsFor(def) };
}

/** Récompenses des défis (cosmétiques uniquement). */
export function recordChallengeWin(r: ScoreResult, difficulty: string): string[] {
  Save.addResult(r);
  if (!r.validated) return [];
  const got: string[] = [];
  if (r.contextId.startsWith('daily-') && grantAndEquip('badge-first-daily')) got.push('badge-first-daily');
  if (Save.challengesCompleted() >= 5 && grantAndEquip('deco-lanterns')) got.push('deco-lanterns');
  const experts = Object.values(Save.get().challenges.records).filter((x) => x.bestMoves !== null && x.puzzleId.startsWith('puzzle-x')).length;
  if (difficulty === 'Expert' && experts >= 3 && grantAndEquip('scarf-golden')) got.push('scarf-golden');
  return got;
}

/** Ce que le diorama d'accueil affiche, selon la progression réelle du chapitre 1. */
export function homeStage() {
  const done = (n: number) => !!Save.level(`chapter01-level0${n}`)?.completed;
  return { duckling: done(3), bridge: done(4), magicFlower: done(5), beaconLit: done(6) };
}

export type HomeActionKind = 'start' | 'resume' | 'continue' | 'next-chapter' | 'replay';

export interface HomeAction {
  kind: HomeActionKind;
  /** Libellé du bouton principal. */
  label: string;
  /** Niveau annoncé (aperçu) : celui que l'action ouvre, ou le dernier niveau joué. */
  key: string;
  chapterId: string;
  /** Tout le contenu d'aventure disponible est terminé. */
  allDone: boolean;
}

/** Premier niveau accessible et pas encore terminé (null si tout est terminé). */
export function nextUnfinished(): string | null {
  for (const c of CHAPTERS) {
    if (!c.available) continue;
    for (const l of c.levels) if (isUnlocked(l.key) && !Save.level(l.key)?.completed) return l.key;
  }
  return null;
}

/**
 * Action du bouton principal de l'accueil selon la progression réelle :
 * Commencer l'aventure · Reprendre le niveau · Continuer l'aventure · Découvrir le chapitre suivant · Rejouer un niveau.
 */
export function homeAction(): HomeAction {
  const run = Save.run();
  if (run && run.path.length && findLevel(run.key) && findLevel(run.key)!.level.version === run.version && isUnlocked(run.key)) {
    return { kind: 'resume', label: 'Reprendre le niveau', key: run.key, chapterId: findLevel(run.key)!.chapter.id, allDone: false };
  }
  const anyDone = Object.values(Save.get().levels).some((l) => l.completed);
  const next = nextUnfinished();
  if (!anyDone && next) return { kind: 'start', label: 'Commencer l’aventure', key: next, chapterId: findLevel(next)!.chapter.id, allDone: false };
  if (next) {
    const f = findLevel(next)!;
    // premier niveau d'un chapitre dont le précédent vient d'être terminé
    if (f.index === 0 && f.chapter.requires) return { kind: 'next-chapter', label: 'Découvrir le chapitre suivant', key: next, chapterId: f.chapter.id, allDone: false };
    return { kind: 'continue', label: 'Continuer l’aventure', key: next, chapterId: f.chapter.id, allDone: false };
  }
  const last = CHAPTERS.filter((c) => c.available).flatMap((c) => c.levels).pop()!;
  return { kind: 'replay', label: 'Rejouer un niveau', key: last.key, chapterId: findLevel(last.key)!.chapter.id, allDone: true };
}

/** @deprecated remplacé par homeAction (conservé pour les anciens appels). */
export function continueTarget() {
  const a = homeAction();
  const f = findLevel(a.key)!;
  return { key: a.key, label: `Chapitre ${f.chapter.number} · Niveau ${f.level.id} — ${f.level.name}`, isNew: a.kind === 'start', allDone: a.allDone, chapterId: a.chapterId };
}
