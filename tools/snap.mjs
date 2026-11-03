// Capture rapide : node tools/snap.mjs "<query>" <largeur>x<hauteur> <fichier.png> [attente ms] [script js]
import { chromium } from '@playwright/test';
const [q, size = '360x800', out = 'snap.png', wait = '2500', js] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 900, isMobile: w < 900 });
const errs = [];
if (process.env.SEEN) await p.addInitScript(() => {
  if (sessionStorage.getItem('snap-init')) return;
  sessionStorage.setItem('snap-init', '1');
  const save = JSON.parse(localStorage.getItem('mazeo.save.v2') || 'null') || { version: 3 };
  save.introSeen = [...(save.introSeen || []), 'tip-controls'];
  localStorage.setItem('mazeo.save.v2', JSON.stringify(save));
});
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://localhost:5173/?e2e${q ? '&' + q : ''}`);
await p.waitForFunction(() => window.__MAZEO__?.active?.().length > 0, null, { timeout: 60000 });
await p.waitForTimeout(Number(wait));
if (js) { await p.evaluate(js); await p.waitForTimeout(1500); }
await p.screenshot({ path: out });
console.log(JSON.stringify({ active: await p.evaluate(() => window.__MAZEO__.active()), errs }));
await b.close();
