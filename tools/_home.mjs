import { chromium } from '@playwright/test';
const D = process.argv[2];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const saves = {
  resume: { version: 3, introSeen: ['tip-controls'], levels: { 'chapter01-level01': { completed: true, stars: 3, bestMoves: 8, version: 2 } }, run: { key: 'chapter01-level02', version: 2, path: [10, 17], undos: 0, restarts: 0, updatedAt: '' }, collection: { owned: ['companion-duckling'], fresh: [], equipped: { hat: null, scarf: null, companion: 'companion-duckling', decor: [] } } },
  done: { version: 3, introSeen: ['tip-controls'], levels: Object.fromEntries([1,2,3,4,5,6].map((n) => [`chapter01-level0${n}`, { completed: true, stars: 3, bestMoves: 10, version: 2 }])), chapters: { chapter01: { completed: true, endSeen: true } }, collection: { owned: ['hat-gardener','deco-magic-flower'], fresh: [], equipped: { hat: 'hat-gardener', scarf: null, companion: null, decor: ['deco-magic-flower'] } } },
};
for (const [k, sv] of Object.entries(saves)) {
  for (const [w, h] of [[360, 800], [1280, 800]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await p.addInitScript((s) => { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', '1'); localStorage.setItem('mazeo.save.v2', JSON.stringify(s)); } }, sv);
    await p.goto('http://localhost:5173/?e2e');
    await p.waitForFunction(() => window.__MAZEO__?.active?.().includes('Home'));
    await p.waitForTimeout(1800);
    await p.screenshot({ path: `${D}/h-${k}-${w}.png` });
    console.log(k, w, await p.evaluate(() => window.__MAZEO__.info('btn-play').text));
    await p.close();
  }
}
await b.close();
