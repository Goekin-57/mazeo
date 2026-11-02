// Logique de progression : étoiles, meilleurs parcours, récompenses, accueil évolutif.
import { CHAPTERS, findLevel } from './content/chapters';
import { LEVEL_REWARDS, rewardById } from './content/rewards';
import { parseLevel } from './core/grid';
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
  bestMoves: number;
  rewards: string[];
  chapterCompleted: string | null;
  nextKey: string | null;
}

export function recordAdventureWin(def: LevelDef, path: number[]): AdventureOutcome {
  const optimal = optimalMoves(def);
  const stars = adventureStars(path.length, optimal);
  const newBest = Save.recordLevel(def.key, stars, path.length, path);
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
  return { stars, optimal, newBest, bestMoves: Save.level(def.key)!.bestMoves!, rewards, chapterCompleted, nextKey: next };
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

/** Niveau proposé par le bouton JOUER / CONTINUER. */
export function continueTarget(): { key: string; label: string; isNew: boolean; allDone: boolean; chapterId: string } {
  let key = Save.get().currentLevel;
  if (!findLevel(key) || !isUnlocked(key)) key = CHAPTERS[0].levels[0].key;
  const f = findLevel(key)!;
  const anyDone = Object.values(Save.get().levels).some((l) => l.completed);
  // tous les chapitres disponibles terminés : on l'indique au lieu de proposer le dernier niveau
  const playable = CHAPTERS.filter((c) => c.available);
  const allDone = playable.every((c) => Save.chapter(c.id).completed);
  if (allDone) {
    const next = CHAPTERS.find((c) => !c.available);
    return { key, label: `Chapitre ${f.chapter.number} terminé${next ? ` · ${next.name} : pas encore disponible` : ''}`, isNew: false, allDone, chapterId: f.chapter.id };
  }
  return { key, label: `Chapitre ${f.chapter.number} · Niveau ${f.level.id} — ${f.level.name}`, isNew: !anyDone, allDone, chapterId: f.chapter.id };
}
