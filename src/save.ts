// Sauvegarde locale versionnée (navigateur). Tolère l'absence de localStorage.
// v1 (prototype) : { unlocked, stars, completed, settings } — migrée automatiquement vers v2.

import type { ScoreResult } from './score';

export interface Settings {
  sound: boolean;
  ambience: boolean;
  reducedMotion: boolean;
  /** Courte présentation (Bourgeon, sortie, objectifs) au premier passage d'un niveau. */
  levelIntro: boolean;
}

export interface LevelProgress {
  completed: boolean;
  stars: number;
  /** Meilleur parcours : nombre de cases du trajet gagnant le plus court. */
  bestMoves: number | null;
  bestPath?: number[];
}

export interface ChallengeRecord {
  puzzleId: string;
  version: number;
  bestMoves: number | null;
  bestRankedMoves: number | null;
  attempts: number;
  completedAt?: string;
}

export interface SaveData {
  version: 2;
  /** Dernier niveau d'aventure joué ou à jouer (« chapter01-level04 »). */
  currentLevel: string;
  levels: Record<string, LevelProgress>;
  chapters: Record<string, { completed: boolean; endSeen: boolean }>;
  collection: {
    owned: string[];
    /** Récompenses pas encore vues dans l'écran Collection. */
    fresh: string[];
    equipped: { hat: string | null; scarf: string | null; companion: string | null; decor: string[] };
  };
  challenges: {
    /** Records par puzzle et version : clé « puzzle-e02@1 ». */
    records: Record<string, ChallengeRecord>;
    /** Défis du jour rencontrés : clé « daily-2026-11-02 » → puzzle. */
    dailies: Record<string, { puzzleId: string; version: number }>;
    /** Derniers résultats (format prêt pour une validation serveur). */
    results: ScoreResult[];
  };
  /** Niveaux dont la présentation a déjà été montrée. */
  introSeen: string[];
  settings: Settings;
}

const KEY_V2 = 'mazeo.save.v2';
const KEY_V1 = 'mazeo.save.v1';
const MAX_RESULTS = 200;

const prefersReduced = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export function defaultSave(): SaveData {
  return {
    version: 2,
    currentLevel: 'chapter01-level01',
    levels: {},
    chapters: {},
    collection: { owned: [], fresh: [], equipped: { hat: null, scarf: null, companion: null, decor: [] } },
    challenges: { records: {}, dailies: {}, results: [] },
    settings: { sound: true, ambience: true, reducedMotion: prefersReduced(), levelIntro: true },
    introSeen: [],
  };
}

/** Migration v1 → v2 : les niveaux 1..6 terminés gardent leur statut et leurs étoiles. */
export function migrateV1(v1: { unlocked?: number; stars?: Record<string, number>; completed?: Record<string, boolean>; settings?: Partial<Settings> }): SaveData {
  const d = defaultSave();
  const key = (n: number) => `chapter01-level0${n}`;
  for (let n = 1; n <= 6; n++) {
    if (v1.completed?.[n]) d.levels[key(n)] = { completed: true, stars: Math.max(1, Math.min(3, v1.stars?.[n] ?? 1)), bestMoves: null };
  }
  const unlocked = Math.max(1, Math.min(6, Number(v1.unlocked) || 1));
  d.currentLevel = key(unlocked);
  d.settings = { ...d.settings, ...(v1.settings ?? {}) };
  return d;
}

function normalize(raw: unknown): SaveData {
  const base = defaultSave();
  const r = (raw ?? {}) as Partial<SaveData>;
  return {
    version: 2,
    currentLevel: typeof r.currentLevel === 'string' ? r.currentLevel : base.currentLevel,
    levels: r.levels ?? {},
    chapters: r.chapters ?? {},
    collection: {
      owned: r.collection?.owned ?? [],
      fresh: r.collection?.fresh ?? [],
      equipped: { ...base.collection.equipped, ...(r.collection?.equipped ?? {}) },
    },
    challenges: {
      records: r.challenges?.records ?? {},
      dailies: r.challenges?.dailies ?? {},
      results: r.challenges?.results ?? [],
    },
    introSeen: Array.isArray(r.introSeen) ? r.introSeen : [],
    settings: { ...base.settings, ...(r.settings ?? {}) },
  };
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function load(): SaveData {
  const st = storage();
  if (!st) return defaultSave();
  try {
    const v2 = st.getItem(KEY_V2);
    if (v2) return normalize(JSON.parse(v2));
    const v1 = st.getItem(KEY_V1);
    if (v1) {
      const migrated = migrateV1(JSON.parse(v1));
      st.setItem(KEY_V2, JSON.stringify(migrated)); // l'ancienne sauvegarde est conservée telle quelle
      return migrated;
    }
  } catch {
    /* sauvegarde illisible : on repart d'une sauvegarde neuve sans effacer l'ancienne */
  }
  return defaultSave();
}

let data: SaveData = load();

function persist() {
  try {
    storage()?.setItem(KEY_V2, JSON.stringify(data));
  } catch {
    /* stockage indisponible : la partie continue sans sauvegarde */
  }
}

export const Save = {
  get: () => data,
  /** Pour les tests : recharge depuis le stockage. */
  reload() {
    data = load();
  },
  settings: () => data.settings,
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
    data.settings[k] = v;
    persist();
  },
  level: (key: string): LevelProgress | undefined => data.levels[key],
  introSeen: (key: string) => data.introSeen.includes(key),
  markIntroSeen(key: string) {
    if (data.introSeen.includes(key)) return;
    data.introSeen.push(key);
    persist();
  },
  setCurrent(key: string) {
    data.currentLevel = key;
    persist();
  },
  /** Enregistre une victoire d'aventure. Retourne true si c'est un nouveau meilleur parcours. */
  recordLevel(key: string, stars: number, moves: number, path: number[]) {
    const prev = data.levels[key];
    const better = !prev?.bestMoves || moves < prev.bestMoves;
    data.levels[key] = {
      completed: true,
      stars: Math.max(prev?.stars ?? 0, stars),
      bestMoves: better ? moves : prev!.bestMoves,
      bestPath: better ? path : prev?.bestPath,
    };
    persist();
    return better;
  },
  chapter: (id: string) => data.chapters[id] ?? { completed: false, endSeen: false },
  completeChapter(id: string) {
    data.chapters[id] = { ...Save.chapter(id), completed: true };
    persist();
  },
  markChapterEndSeen(id: string) {
    data.chapters[id] = { ...Save.chapter(id), endSeen: true };
    persist();
  },
  owns: (item: string) => data.collection.owned.includes(item),
  /** Ajoute une récompense ; retourne true si elle est nouvelle. */
  grant(item: string) {
    if (data.collection.owned.includes(item)) return false;
    data.collection.owned.push(item);
    data.collection.fresh.push(item);
    persist();
    return true;
  },
  clearFresh() {
    data.collection.fresh = [];
    persist();
  },
  equip(slot: 'hat' | 'scarf' | 'companion', item: string | null) {
    data.collection.equipped[slot] = item;
    persist();
  },
  toggleDecor(item: string, on: boolean) {
    const d = data.collection.equipped.decor.filter((x) => x !== item);
    if (on) d.push(item);
    data.collection.equipped.decor = d;
    persist();
  },
  record: (puzzleId: string, version: number) => data.challenges.records[`${puzzleId}@${version}`],
  addResult(r: ScoreResult) {
    const k = `${r.puzzleId}@${r.puzzleVersion}`;
    const prev = data.challenges.records[k] ?? { puzzleId: r.puzzleId, version: r.puzzleVersion, bestMoves: null, bestRankedMoves: null, attempts: 0 };
    prev.attempts += 1;
    if (r.validated) {
      if (prev.bestMoves === null || r.moves < prev.bestMoves) prev.bestMoves = r.moves;
      if (r.mode === 'ranked' && (prev.bestRankedMoves === null || r.moves < prev.bestRankedMoves)) prev.bestRankedMoves = r.moves;
      prev.completedAt ??= r.date;
    }
    data.challenges.records[k] = prev;
    data.challenges.results.unshift(r);
    data.challenges.results = data.challenges.results.slice(0, MAX_RESULTS);
    persist();
  },
  noteDaily(dayKey: string, puzzleId: string, version: number) {
    if (data.challenges.dailies[dayKey]) return;
    data.challenges.dailies[dayKey] = { puzzleId, version };
    persist();
  },
  /** Nombre de puzzles de défi différents réussis. */
  challengesCompleted: () => Object.values(data.challenges.records).filter((r) => r.bestMoves !== null).length,
  totalStars: () => Object.values(data.levels).reduce((a, l) => a + (l.stars || 0), 0),
  resetProgress() {
    const s = data.settings;
    data = { ...defaultSave(), settings: s };
    persist();
  },
};
