import { Cell, type CollectibleDef, type CollectibleKind, type Grid, type LevelDef, type WallDecor } from './types';

/**
 * Légende des cartes (V4) :
 *  .  chemin              S  départ              E  sortie
 *  #  obstacle (haie)     ~  eau                 B  pont (fermé tant que le levier n'est pas abaissé)
 *  D  caneton             K  graine magique      L  levier
 *  P  porte florale (ouverte par la graine)
 *  1-9 autre collectible (type dans LevelDef.collectibles)
 *  Variantes décoratives d'obstacle : t arbre · f massif fleuri · r rocher · b buisson
 */
const WALLS: Record<string, WallDecor> = { '#': 'hedge', t: 'tree', f: 'flowers', r: 'rock', b: 'bush' };
const LETTER_KINDS: Record<string, CollectibleKind> = { D: 'duckling', K: 'seed' };

/** Retire une bordure extérieure composée uniquement d'obstacles « # ». */
export function trimBorder(map: string[]): string[] {
  let rows = map.slice();
  const allWall = (s: string) => s.length > 0 && [...s].every((c) => c === '#');
  while (rows.length > 2 && allWall(rows[0]) && rows.every((r) => r[0] === '#') && allWall(rows[rows.length - 1]) && rows.every((r) => r[r.length - 1] === '#')) {
    rows = rows.slice(1, -1).map((r) => r.slice(1, -1));
  }
  return rows;
}

export function parseLevel(def: LevelDef): Grid {
  const map = trimBorder(def.map);
  const height = map.length;
  const width = map[0].length;
  const cells: Cell[] = [];
  const decor: (WallDecor | null)[] = [];
  const collectibles: CollectibleDef[] = [];
  let start = -1;
  let exit = -1;

  map.forEach((row, y) => {
    if (row.length !== width) throw new Error(`${def.key} : ligne ${y} de longueur ${row.length} ≠ ${width}`);
    [...row].forEach((ch, x) => {
      const i = y * width + x;
      decor[i] = null;
      if (WALLS[ch]) {
        cells[i] = Cell.Wall;
        decor[i] = WALLS[ch];
      } else if (ch === '.') cells[i] = Cell.Ground;
      else if (ch === '~') cells[i] = Cell.Water;
      else if (ch === 'S') {
        if (start !== -1) throw new Error(`${def.key} : plusieurs départs`);
        cells[i] = Cell.Start;
        start = i;
      } else if (ch === 'E') {
        if (exit !== -1) throw new Error(`${def.key} : plusieurs sorties`);
        cells[i] = Cell.Exit;
        exit = i;
      } else if (ch === 'L') cells[i] = Cell.Switch;
      else if (ch === 'B') cells[i] = Cell.Bridge;
      else if (ch === 'P') cells[i] = Cell.Door;
      else if (LETTER_KINDS[ch] || /[1-9]/.test(ch)) {
        const kind = LETTER_KINDS[ch] ?? def.collectibles?.[ch];
        if (!kind) throw new Error(`${def.key} : collectible '${ch}' sans type`);
        cells[i] = Cell.Collectible;
        collectibles.push({ id: collectibles.length, x, y, kind });
      } else throw new Error(`${def.key} : caractère inconnu '${ch}' en (${x},${y})`);
    });
  });

  if (start < 0) throw new Error(`${def.key} : pas de départ`);
  if (exit < 0) throw new Error(`${def.key} : pas de sortie`);
  if (collectibles.length > 30) throw new Error('Trop de collectibles');
  return { width, height, cells, decor, start, exit, collectibles };
}

export const idx = (g: Grid, x: number, y: number) => y * g.width + x;
export const xy = (g: Grid, i: number): [number, number] => [i % g.width, Math.floor(i / g.width)];

export function neighbors(g: Grid, i: number): number[] {
  const [x, y] = xy(g, i);
  const out: number[] = [];
  if (y > 0) out.push(i - g.width);
  if (y < g.height - 1) out.push(i + g.width);
  if (x > 0) out.push(i - 1);
  if (x < g.width - 1) out.push(i + 1);
  return out;
}

export function areAdjacent(g: Grid, a: number, b: number): boolean {
  const [ax, ay] = xy(g, a);
  const [bx, by] = xy(g, b);
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}

/** Variété du décor : les « # » deviennent parfois arbres, massifs, buissons ou rochers (purement visuel, déterministe). */
export function autoDecor(g: Grid, seed: number): (WallDecor | null)[] {
  return g.decor.map((d, i) => {
    if (d !== 'hedge') return d;
    const [x, y] = xy(g, i);
    const h = ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0;
    const r = (h % 1000) / 1000;
    const below = y < g.height - 1 ? g.cells[i + g.width] : null;
    // les arbres (hauts) vont plutôt sur la première rangée pour ne rien masquer
    if (y === 0 && r < 0.3) return 'tree';
    if (r < 0.1) return 'flowers';
    if (r < 0.16) return 'bush';
    if (r < 0.2 && below === Cell.Wall) return 'rock';
    return 'hedge';
  });
}
