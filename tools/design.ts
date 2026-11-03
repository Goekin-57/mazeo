// Atelier de conception : analyse des cartes candidates (fichier JSON passé en argument,
// ou les niveaux du jeu par défaut). Usage : npx vite-node tools/design.ts [cartes.json]
import { readFileSync } from 'node:fs';
import { analyze, starThresholds } from '../src/core/analysis';
import { parseLevel, trimBorder, xy } from '../src/core/grid';
import type { LevelDef } from '../src/core/types';
import { ALL_ADVENTURE_LEVELS } from '../src/content/chapters';

const file = process.argv[2];
const defs: LevelDef[] = file
  ? (JSON.parse(readFileSync(file, 'utf8')) as { name: string; map: string[] }[]).map((d, i) => ({
      key: `cand-${i}`, version: 1, id: i + 1, name: d.name, theme: 'sunny', difficulty: '', objective: '', exitStyle: 'gate', map: d.map,
    }))
  : ALL_ADVENTURE_LEVELS;

for (const def of defs) {
  const g = parseLevel(def);
  const t = performance.now();
  const a = analyze(g);
  const ms = (performance.now() - t).toFixed(0);
  const st = a.solvable ? starThresholds(a.winningLengths) : null;
  console.log(`\n=== ${def.name} (${g.width}×${g.height}) — ${ms} ms`);
  console.log(`  soluble=${a.solvable} optimal=${a.optimal} longueurs=${a.winningLengths.slice(0, 8).join(',')}${a.winningLengths.length > 8 ? '…' : ''} parcours=${a.winningPaths}`);
  console.log(`  états=${a.states} gagnables=${a.winnableStates} pièges=${a.trapStates} hasard=${(a.randomWin * 100).toFixed(1)}%`);
  console.log(`  sur la solution : forcés=${a.forcedOnSolution} décisions=${a.decisionsOnSolution} libres=${a.freeOnSolution}  étoiles ★★★≤${st?.three} ★★≤${st?.two}`);
  const rows = trimBorder(def.map).map((l) => [...l]);
  a.solution.forEach((c, i) => {
    const [x, y] = xy(g, c);
    if (rows[y][x] === '.') rows[y][x] = String.fromCharCode(i < 26 ? 97 + i : 65 + i - 26);
  });
  const dec = new Set(a.decisionPoints.map((d) => d.at));
  rows.forEach((l, y) => console.log('   ' + l.map((ch, x) => (dec.has(y * g.width + x) ? `${ch}*` : `${ch} `)).join('')));
  for (const d of a.decisionPoints) {
    const p = (c: number) => xy(g, c).join(',');
    console.log(`   décision pas ${d.step} en (${p(d.at)}) : bon ${d.good.map(p).join(' / ')}  mauvais ${d.bad.map(p).join(' / ')}`);
  }
}
