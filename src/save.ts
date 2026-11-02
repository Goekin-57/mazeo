// Sauvegarde locale (navigateur). Tolère l'absence de localStorage (navigation privée…).

export interface Settings {
  sound: boolean;
  ambience: boolean;
  reducedMotion: boolean;
}

export interface SaveData {
  unlocked: number; // plus haut niveau débloqué (1..6)
  stars: Record<number, number>;
  completed: Record<number, boolean>;
  settings: Settings;
}

const KEY = 'mazeo.save.v1';

const prefersReduced = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const defaults = (): SaveData => ({
  unlocked: 1,
  stars: {},
  completed: {},
  settings: { sound: true, ambience: true, reducedMotion: prefersReduced() },
});

let data: SaveData = load();

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw);
    const base = defaults();
    return {
      unlocked: Math.max(1, Math.min(6, Number(d.unlocked) || 1)),
      stars: d.stars ?? {},
      completed: d.completed ?? {},
      settings: { ...base.settings, ...(d.settings ?? {}) },
    };
  } catch {
    return defaults();
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* stockage indisponible : la partie continue sans sauvegarde */
  }
}

export const Save = {
  get: () => data,
  settings: () => data.settings,
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
    data.settings[k] = v;
    persist();
  },
  isUnlocked: (id: number) => id <= data.unlocked,
  stars: (id: number) => data.stars[id] ?? 0,
  totalStars: () => Object.values(data.stars).reduce((a, b) => a + b, 0),
  recordWin(id: number, stars: number, total: number) {
    data.completed[id] = true;
    data.stars[id] = Math.max(data.stars[id] ?? 0, stars);
    if (id < total) data.unlocked = Math.max(data.unlocked, id + 1);
    persist();
  },
  /** Premier niveau non terminé (pour le bouton JOUER). */
  nextLevel(total: number) {
    for (let i = 1; i <= Math.min(data.unlocked, total); i++) if (!data.completed[i]) return i;
    return Math.min(data.unlocked, total);
  },
  reset() {
    const s = data.settings;
    data = { ...defaults(), settings: s };
    persist();
  },
};
