// Génère HORS LIGNE des candidats de défis, les filtre avec le solveur et écrit la
// bibliothèque figée (src/content/challenges/library.ts). Le jeu n'utilise que ces cartes validées.
// Utilisation : npx vite-node tools/gen-challenges.ts
import { writeFileSync } from 'node:fs';
import { parseLevel } from '../src/core/grid';
import { initialState, stateKey, step, validMoves } from '../src/core/rules';
import { solve } from '../src/core/solver';
import type { Grid, LevelDef } from '../src/core/types';

let seed = 20261102;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];

type Cat = 'F' | 'I' | 'X';
const SPEC: Record<Cat, { w: number; h: number; loops: [number, number]; ducks: [number, number]; lever: number; seed: number; minLen: [number, number]; rate: [number, number]; spread: number }> = {
  F: { w: 5, h: 7, loops: [2, 3], ducks: [0, 1], lever: 0, seed: 0, minLen: [7, 14], rate: [0.12, 0.45], spread: 4 },
  I: { w: 7, h: 7, loops: [3, 4], ducks: [1, 2], lever: 0.5, seed: 0, minLen: [12, 22], rate: [0.03, 0.14], spread: 4 },
  X: { w: 7, h: 9, loops: [3, 6], ducks: [1, 2], lever: 0.6, seed: 0.5, minLen: [16, 32], rate: [0.003, 0.05], spread: 6 },
};

function carve(w: number, h: number, loops: number): string[][] {
  const m = Array.from({ length: h }, () => Array(w).fill('#'));
  const nx = Math.ceil(w / 2), ny = Math.ceil(h / 2);
  const seen = new Set<string>();
  const stack: [number, number][] = [[0, 0]];
  seen.add('0,0');
  m[0][0] = '.';
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const opts = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [cx + dx, cy + dy] as [number, number])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < nx && y < ny && !seen.has(`${x},${y}`));
    if (!opts.length) { stack.pop(); continue; }
    const [x, y] = pick(opts);
    seen.add(`${x},${y}`);
    m[cy + y][cx + x] = '.';
    m[y * 2][x * 2] = '.';
    stack.push([x, y]);
  }
  // boucles : on ouvre quelques murs entre deux nœuds pour créer des trajets de longueurs différentes
  let n = 0, guard = 0;
  while (n < loops && guard++ < 200) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
    if (m[y][x] !== '#') continue;
    const horiz = x % 2 === 1 && y % 2 === 0 && x + 1 < w;
    const vert = y % 2 === 1 && x % 2 === 0 && y + 1 < h;
    if (!horiz && !vert) continue;
    m[y][x] = '.';
    n++;
  }
  return m;
}

const nodes = (m: string[][]) => {
  const out: [number, number][] = [];
  m.forEach((r, y) => r.forEach((c, x) => { if (c === '.' && x % 2 === 0 && y % 2 === 0) out.push([x, y]); }));
  return out;
};

function candidate(cat: Cat): string[] | null {
  const sp = SPEC[cat];
  const m = carve(sp.w, sp.h, sp.loops[0] + Math.floor(rnd() * (sp.loops[1] - sp.loops[0] + 1)));
  const free = nodes(m);
  const take = () => { const i = Math.floor(rnd() * free.length); return free.splice(i, 1)[0]; };
  // départ en bas, sortie en haut (lecture naturelle sur téléphone)
  const bottom = free.filter(([, y]) => y >= sp.h - 2), top = free.filter(([, y]) => y <= 1);
  if (!bottom.length || !top.length) return null;
  const [sx, sy] = pick(bottom); free.splice(free.findIndex(([x, y]) => x === sx && y === sy), 1);
  const [ex, ey] = pick(top); free.splice(free.findIndex(([x, y]) => x === ex && y === ey), 1);
  m[sy][sx] = 'S';
  m[ey][ex] = 'E';
  const ducks = sp.ducks[0] + Math.floor(rnd() * (sp.ducks[1] - sp.ducks[0] + 1));
  for (let i = 0; i < ducks && free.length; i++) { const [x, y] = take(); m[y][x] = 'D'; }
  if (rnd() < sp.lever && free.length) {
    // pont : un connecteur vertical traversé de haut en bas, bordé d'eau
    const conns: [number, number][] = [];
    m.forEach((r, y) => r.forEach((c, x) => { if (c === '.' && y % 2 === 1 && x % 2 === 0) conns.push([x, y]); }));
    if (!conns.length) return null;
    const [bx, by] = pick(conns);
    m[by][bx] = 'B';
    for (const dx of [-1, 1]) if (m[by][bx + dx] === '#') m[by][bx + dx] = '~';
    const [lx, ly] = take();
    m[ly][lx] = 'L';
  }
  if (rnd() < sp.seed && free.length) {
    const conns: [number, number][] = [];
    m.forEach((r, y) => r.forEach((c, x) => { if (c === '.' && (x % 2) + (y % 2) === 1) conns.push([x, y]); }));
    if (!conns.length) return null;
    const [px, py] = pick(conns);
    m[py][px] = 'P';
    const [kx, ky] = take();
    m[ky][kx] = 'K';
  }
  return m.map((r) => r.join(''));
}

function randomWinRate(g: Grid, n = 4000) {
  let wins = 0;
  for (let i = 0; i < n; i++) {
    let s = initialState(g);
    for (let k = 0; k < 300; k++) {
      const mv = validMoves(g, s);
      if (!mv.length) break;
      const r = step(g, s, mv[Math.floor(rnd() * mv.length)]);
      if ('blocked' in r) break;
      s = r.state;
      if (s.won) { wins++; break; }
    }
  }
  return wins / n;
}

/** Longueur du plus long trajet gagnant (pour s'assurer que le nombre de cases départage). */
function longestWin(g: Grid): number {
  const memo = new Map<string, number>();
  const rec = (s: ReturnType<typeof initialState>, depth: number): number => {
    if (s.won) return 0;
    if (depth > 80) return -Infinity;
    const k = stateKey(s);
    const m = memo.get(k);
    if (m !== undefined) return m;
    memo.set(k, -Infinity);
    let best = -Infinity;
    for (const mv of validMoves(g, s)) {
      const r = step(g, s, mv);
      if ('blocked' in r) continue;
      best = Math.max(best, 1 + rec(r.state, depth + 1));
    }
    memo.set(k, best);
    return best;
  };
  return rec(initialState(g), 0);
}

const want: Record<Cat, number> = { F: 5, I: 5, X: 6 };
const out: { cat: Cat; map: string[]; min: number; max: number; rate: number; paths: number; states: number; dead: number }[] = [];
for (const cat of ['F', 'I', 'X'] as Cat[]) {
  const sp = SPEC[cat];
  let got = 0, tries = 0;
  while (got < want[cat] && tries++ < 20000) {
    const map = candidate(cat);
    if (!map) continue;
    let g: Grid;
    try { g = parseLevel({ key: 'x', version: 1, id: 0, name: '', theme: 'challenge', difficulty: '', objective: '', exitStyle: 'gate', map } as LevelDef); } catch { continue; }
    const r = solve(g, { maxStates: 300_000 });
    if (!r.solvable || r.truncated) continue;
    const min = r.shortest!.length;
    if (min < sp.minLen[0] || min > sp.minLen[1]) continue;
    const max = longestWin(g);
    if (max - min < sp.spread) continue;
    const rate = randomWinRate(g);
    if (rate < sp.rate[0] || rate > sp.rate[1]) continue;
    if (out.some((o) => o.map.join() === map.join())) continue;
    out.push({ cat, map, min, max, rate, paths: r.winningPaths, states: r.statesExplored, dead: r.deadEnds });
    got++;
  }
  console.log(`${cat}: ${got} défis retenus après ${tries} essais`);
}

const label = { F: 'Facile', I: 'Intermédiaire', X: 'Expert' } as const;
const names = ['La clairière', 'Le sentier des mûres', 'Les quatre allées', 'Le verger', 'La haie sinueuse', 'Le jardin des lavandes', 'Le petit labyrinthe', 'La boucle du ruisseau', 'Le carré des simples', 'Les allées croisées', 'Le grand détour', 'Le jardin suspendu', 'Le dédale des roses', 'Le cœur du parc', 'La promenade du soir'];
const lines = out.map((o, i) => {
  const n = out.filter((p, j) => p.cat === o.cat && j <= i).length;
  const key = `puzzle-${o.cat.toLowerCase()}${String(n).padStart(2, '0')}`;
  return `  // min ${o.min} cases · plus long trajet gagnant ${o.max} · réussite au hasard ${(o.rate * 100).toFixed(1)} % · ${o.states} états · ${o.dead} impasses
  { key: '${key}', version: 1, id: ${i + 1}, name: '${names[i % names.length].replace(/'/g, "\\'")}', theme: 'challenge', difficulty: '${label[o.cat]}', objective: 'Atteins la sortie en un minimum de cases', exitStyle: 'gate',
    map: [${o.map.map((r) => `'${r}'`).join(', ')}] },`;
});
writeFileSync('src/content/challenges/library.ts', `// Fichier généré par tools/gen-challenges.ts puis figé : NE PAS régénérer sans changer les versions.
// Chaque carte est validée par le solveur (voir tests/unit/challenges.test.ts).
import type { LevelDef } from '../../core/types';

export const PUZZLES: LevelDef[] = [
${lines.join('\n')}
];
`);
console.log('bibliothèque écrite :', out.length, 'puzzles');
