// Calendrier des défis : un même puzzle pour tous les joueurs selon la date (UTC) et la version du calendrier.
import type { LevelDef } from '../../core/types';
import { PUZZLES } from './library';

/** À incrémenter si l'ordre de rotation change (les anciens résultats gardent leur version). */
export const CALENDAR_VERSION = 1;
/** Premier jour du calendrier (lundi). */
const EPOCH = Date.UTC(2026, 10, 2);
const DAY = 86_400_000;

const byKey = (k: string) => {
  const p = PUZZLES.find((x) => x.key === k);
  if (!p) throw new Error(`puzzle inconnu ${k}`);
  return p;
};

/** Rotation quotidienne (10 jours) : alternance des difficultés. */
export const DAILY_ROTATION: LevelDef[] = ['puzzle-f01', 'puzzle-i01', 'puzzle-x01', 'puzzle-f02', 'puzzle-i02', 'puzzle-x02', 'puzzle-f03', 'puzzle-i03', 'puzzle-x03', 'puzzle-i04'].map(byKey);
/** Séries hebdomadaires de trois labyrinthes (rotation sur 2 semaines). */
export const WEEKLY_SETS: LevelDef[][] = [
  ['puzzle-f04', 'puzzle-i05', 'puzzle-x04'].map(byKey),
  ['puzzle-f05', 'puzzle-x05', 'puzzle-x06'].map(byKey),
];

const pad = (n: number) => String(n).padStart(2, '0');
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Date du jour, éventuellement fixée pour les tests automatisés (?e2e&today=AAAA-MM-JJ). */
export function today(): Date {
  try {
    const q = new URLSearchParams(window.location.search);
    const t = q.get('today');
    if (q.has('e2e') && t && /^\d{4}-\d{2}-\d{2}$/.test(t)) {
      const [y, m, d] = t.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d, 12));
    }
  } catch {
    /* hors navigateur */
  }
  return new Date();
}

export const utcDayKey = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const dayIndex = (d: Date) => Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - EPOCH) / DAY);

export interface DailyInfo {
  contextId: string; // « daily-2026-11-02 »
  date: string;
  puzzle: LevelDef;
}

export function dailyFor(d: Date): DailyInfo {
  const key = utcDayKey(d);
  return { contextId: `daily-${key}`, date: key, puzzle: DAILY_ROTATION[mod(dayIndex(d), DAILY_ROTATION.length)] };
}

/** Semaine ISO (pour l'affichage et l'identifiant). */
export function isoWeek(d: Date): { year: number; week: number } {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return { year: t.getUTCFullYear(), week: Math.ceil(((t.getTime() - yearStart) / DAY + 1) / 7) };
}

export interface WeeklyInfo {
  contextId: string; // « weekly-2026-W45 »
  puzzles: LevelDef[];
  endsAt: Date;
}

export function weeklyFor(d: Date): WeeklyInfo {
  const w = isoWeek(d);
  const idx = Math.floor(dayIndex(d) / 7);
  const mondayIdx = idx * 7;
  return {
    contextId: `weekly-${w.year}-W${pad(w.week)}`,
    puzzles: WEEKLY_SETS[mod(idx, WEEKLY_SETS.length)],
    endsAt: new Date(EPOCH + (mondayIdx + 7) * DAY),
  };
}

/** Millisecondes avant le prochain défi du jour (minuit UTC). */
export function msUntilNextDaily(d: Date): number {
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return next - d.getTime();
}

export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)} j ${h % 24} h`;
  return h > 0 ? `${h} h ${pad(m)}` : `${m} min`;
}

export const findPuzzle = (key: string) => PUZZLES.find((p) => p.key === key) ?? null;
export { PUZZLES };
