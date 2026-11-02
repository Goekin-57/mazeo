import { Cell, type CollectibleDef, type Grid, type LevelDef, type WallDecor } from './types';

/**
 * Légende des cartes :
 *  .  sol (chemin)        S  départ          E  sortie
 *  #  haie (mur)          t  arbre (mur)     f  massif fleuri (mur)
 *  r  rocher (mur)        b  buisson (mur)   ~  eau (infranchissable)
 *  1-9 collectible (type défini dans level.collectibles)
 *  T  interrupteur        B  pont (fermé tant que l'interrupteur n'est pas activé)
 *  D  porte florale (ouverte par la graine)
 */
const WALLS: Record<string, WallDecor> = { '#': 'hedge', t: 'tree', f: 'flowers', r: 'rock', b: 'bush' };

export function parseLevel(def: LevelDef): Grid {
  const height = def.map.length;
  const width = def.map[0].length;
  const cells: Cell[] = [];
  const decor: (WallDecor | null)[] = [];
  const collectibles: CollectibleDef[] = [];
  let start = -1;
  let exit = -1;

  def.map.forEach((row, y) => {
    if (row.length !== width) throw new Error(`Niveau ${def.id} : ligne ${y} de longueur ${row.length} ≠ ${width}`);
    [...row].forEach((ch, x) => {
      const i = y * width + x;
      decor[i] = null;
      if (WALLS[ch]) {
        cells[i] = Cell.Wall;
        decor[i] = WALLS[ch];
      } else if (ch === '.') cells[i] = Cell.Ground;
      else if (ch === '~') cells[i] = Cell.Water;
      else if (ch === 'S') {
        cells[i] = Cell.Start;
        if (start !== -1) throw new Error(`Niveau ${def.id} : plusieurs départs`);
        start = i;
      } else if (ch === 'E') {
        cells[i] = Cell.Exit;
        if (exit !== -1) throw new Error(`Niveau ${def.id} : plusieurs sorties`);
        exit = i;
      } else if (ch === 'T') cells[i] = Cell.Switch;
      else if (ch === 'B') cells[i] = Cell.Bridge;
      else if (ch === 'D') cells[i] = Cell.Door;
      else if (/[1-9]/.test(ch)) {
        const kind = def.collectibles?.[ch];
        if (!kind) throw new Error(`Niveau ${def.id} : collectible '${ch}' sans type`);
        cells[i] = Cell.Collectible;
        collectibles.push({ id: collectibles.length, x, y, kind });
      } else throw new Error(`Niveau ${def.id} : caractère inconnu '${ch}' en (${x},${y})`);
    });
  });

  if (start < 0) throw new Error(`Niveau ${def.id} : pas de départ`);
  if (exit < 0) throw new Error(`Niveau ${def.id} : pas de sortie`);
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
