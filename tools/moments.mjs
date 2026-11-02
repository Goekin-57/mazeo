import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const ready = async () => page.waitForFunction(() => { const s = window.__MAZEO__?.state?.(); return s && !s.fading && s.mode === 'idle'; }, null, { timeout: 60000 });
const pos = (c) => page.evaluate((c) => window.__MAZEO__.cellToPage(c), c);
const cdp = await ctx.newCDPSession(page);
const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });

// 1) prévisualisation du tracé (doigt encore posé)
await page.goto('http://localhost:5173/?e2e&level=2'); await ready();
const W = 6; const cells = [[0,0],[1,0],[2,0],[2,1],[2,2],[3,2],[4,2]].map(([x,y]) => y*W+x);
await touch('touchStart', await pos(cells[0]));
for (const c of cells.slice(1)) { const a = await pos(c); await touch('touchMove', a); await page.waitForTimeout(60); }
await page.waitForTimeout(500);
await page.screenshot({ path: 'tests/shots/m1-preview.png' });
await touch('touchEnd');
// 2) haie en train de pousser
await page.waitForTimeout(330);
await page.screenshot({ path: 'tests/shots/m2-growing.png' });
await ready();
// 3) niveau 1 gagné : panneau
await page.goto('http://localhost:5173/?e2e&level=1'); await ready();
const sol1 = await page.evaluate(() => window.__MAZEO__.solution());
const st = await page.evaluate(() => window.__MAZEO__.state().pos);
await touch('touchStart', await pos(st));
for (const c of sol1) { await touch('touchMove', await pos(c)); await page.waitForTimeout(40); }
await touch('touchEnd');
await page.waitForFunction(() => window.__MAZEO__.state().won, null, { timeout: 60000 });
await page.waitForTimeout(3500);
await page.screenshot({ path: 'tests/shots/m3-win1.png' });
// 4) niveau 5 floraison
await page.goto('http://localhost:5173/?e2e&level=5'); await ready();
const sol5 = await page.evaluate(() => window.__MAZEO__.solution());
const seedIdx = sol5.indexOf(4*7+3);
await touch('touchStart', await pos(await page.evaluate(() => window.__MAZEO__.state().pos)));
for (const c of sol5.slice(0, seedIdx + 1)) { await touch('touchMove', await pos(c)); await page.waitForTimeout(40); }
await touch('touchEnd');
await page.waitForFunction(() => window.__MAZEO__.state().doorsOpen, null, { timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'tests/shots/m4-bloom.png' });
console.log('errors', errors);
await browser.close();
