// Validateur automatique : explore l'espace d'états complet de chaque niveau.
import { parseLevel, trimBorder, xy } from '../src/core/grid';
import { solve } from '../src/core/solver';
import { ALL_ADVENTURE_LEVELS } from '../src/content/chapters';
import { PUZZLES } from '../src/content/challenges/library';
const LEVELS = [...ALL_ADVENTURE_LEVELS, ...PUZZLES];

let ok = true;
for (const def of LEVELS) {
  const g = parseLevel(def);
  const t = performance.now();
  const r = solve(g);
  const ms = (performance.now() - t).toFixed(0);
  console.log(`\n${def.key} v${def.version} — ${def.name} (${g.width}x${g.height}, ${def.difficulty})`);
  console.log(`  solvable=${r.solvable} plus_court=${r.shortest?.length ?? '-'} pas  trajets_gagnants=${r.winningPaths}  états=${r.statesExplored}  impasses=${r.deadEnds}  (${ms} ms)`);
  if (!r.solvable) ok = false;
  if (r.shortest) {
    const rows = trimBorder(def.map).map((l) => [...l]);
    r.shortest.forEach((c, i) => {
      const [x, y] = xy(g, c);
      if (rows[y][x] === '.') rows[y][x] = '•';
    });
    rows.forEach((l) => console.log('   ' + l.join(' ')));
  }
}
if (!ok) { console.error('\n❌ Au moins un niveau est insoluble'); process.exit(1); }
console.log(`\n✅ ${LEVELS.length} cartes solubles (aventure + défis)`);
