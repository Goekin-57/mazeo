// Recherche locale de cartes candidates à partir d'un gabarit (aide à la conception).
// Gabarit : « ? » = case libre (chemin ou haie), les autres caractères sont fixés.
// Usage : npx vite-node tools/search.ts gabarit.json
import { readFileSync } from 'node:fs';
import { analyze } from '../src/core/analysis';
import { parseLevel, xy } from '../src/core/grid';
import { Cell, type LevelDef } from '../src/core/types';

interface Spec { name: string; template: string[]; iters?: number; restarts?: number; minOpt?: number; maxOpt?: number; seed?: number }
const specs = JSON.parse(readFileSync(process.argv[2], 'utf8')) as Spec[];

let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

function evaluate(map: string[], spec: Spec) {
  const def: LevelDef = { key: 'x', version: 1, id: 1, name: '', theme: 'sunny', difficulty: '', objective: '', exitStyle: 'gate', map };
  let g;
  try { g = parseLevel(def); } catch { return null; }
  // pas de bloc 2×2 entièrement praticable (lisibilité), pas de case isolée
  const floor = (i: number) => g.cells[i] !== Cell.Wall && g.cells[i] !== Cell.Water;
  for (let y = 0; y < g.height - 1; y++) for (let x = 0; x < g.width - 1; x++) {
    const i = y * g.width + x;
    if (floor(i) && floor(i + 1) && floor(i + g.width) && floor(i + g.width + 1)) return null;
  }
  let a;
  try { a = analyze(g, 300_000); } catch { return null; }
  if (!a.solvable) return null;
  if (a.optimal < (spec.minOpt ?? 6) || a.optimal > (spec.maxOpt ?? 40)) return null;
  const floors = g.cells.map((_, i) => i).filter(floor);
  const useless = floors.length - a.usefulCells.length;
  const meaningful = a.decisionPoints.filter((d) => !d.good.includes(g.exit)).length;
  const score = meaningful * 10 + Math.min(a.trapStates, 40) * 0.6 - a.randomWin * 60 - useless * 3 - Math.max(0, a.winningPaths - 6) * 0.5 + a.optimal * 0.2;
  return { score, a, meaningful, useless };
}

for (const spec of specs) {
  seed = spec.seed ?? 777;
  const free: [number, number][] = [];
  spec.template.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '?') free.push([x, y]); }));
  const best: { score: number; map: string[] }[] = [];
  for (let rs = 0; rs < (spec.restarts ?? 30); rs++) {
    let cur = spec.template.map((r) => [...r].map((ch) => (ch === '?' ? (rnd() < 0.55 ? '.' : '#') : ch)));
    let curE = evaluate(cur.map((r) => r.join('')), spec);
    for (let it = 0; it < (spec.iters ?? 600); it++) {
      const n = cur.map((r) => r.slice());
      const flips = 1 + Math.floor(rnd() * 2);
      for (let f = 0; f < flips; f++) {
        const [x, y] = free[Math.floor(rnd() * free.length)];
        n[y][x] = n[y][x] === '.' ? '#' : '.';
      }
      const e = evaluate(n.map((r) => r.join('')), spec);
      if (e && (!curE || e.score >= curE.score - (rnd() < 0.05 ? 3 : 0))) { cur = n; curE = e; }
    }
    if (curE) best.push({ score: curE.score, map: cur.map((r) => r.join('')) });
  }
  best.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  console.log(`\n##### ${spec.name}`);
  let shown = 0;
  for (const b of best) {
    const k = b.map.join('/');
    if (seen.has(k)) continue;
    seen.add(k);
    const e = evaluate(b.map, spec)!;
    console.log(`\n score=${b.score.toFixed(1)} opt=${e.a.optimal} décisions=${e.meaningful} pièges=${e.a.trapStates} hasard=${(e.a.randomWin * 100).toFixed(1)}% inutiles=${e.useless} parcours=${e.a.winningPaths} longueurs=${e.a.winningLengths.slice(0, 5).join(',')}`);
    console.log('  ' + JSON.stringify(b.map));
    const g = parseLevel({ key: 'x', version: 1, id: 1, name: '', theme: 'sunny', difficulty: '', objective: '', exitStyle: 'gate', map: b.map });
    const rows = b.map.map((r) => [...r]);
    e.a.solution.forEach((c, i) => { const [x, y] = xy(g, c); if (rows[y][x] === '.') rows[y][x] = String.fromCharCode(97 + (i % 26)); });
    rows.forEach((r) => console.log('    ' + r.join(' ')));
    if (++shown >= 4) break;
  }
}
