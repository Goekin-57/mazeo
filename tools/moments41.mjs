// Captures de l'écran de jeu V4.1 (360×800) : intro, sortie verrouillée, tracé, bloqué, pause, victoire.
import { chromium } from '@playwright/test';
const W = +(process.argv[2] ?? 360), Hh = +(process.argv[3] ?? 800);
const out = process.argv[4] ?? 'tests/shots/v41';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: Hh }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e.stack || e)));
const cdp = await ctx.newCDPSession(p);
const pos = (c) => p.evaluate((c) => window.__MAZEO__.cellToPage(c), c);
const t = (type, q) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: q ? [{ x: q.x, y: q.y, id: 1 }] : [] });
const idle = () => p.waitForFunction(() => { const s = window.__MAZEO__?.state?.(); return s && !s.fading && (s.mode === 'idle' || s.mode === 'won'); }, null, { timeout: 60000 });
const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
await p.goto('http://localhost:5173/?e2e&level=1'); await p.waitForTimeout(700); await shot('g1-intro'); await idle(); await p.waitForTimeout(800); await shot('g2-niveau1');
await p.goto('http://localhost:5173/?e2e&level=3'); await idle(); await p.waitForTimeout(1200); await shot('g3-niveau3-verrouille');
// tracé en cours (doigt posé)
const sol = await p.evaluate(() => window.__MAZEO__.solution());
const st = await p.evaluate(() => window.__MAZEO__.state().pos);
await t('touchStart', await pos(st)); for (const c of sol.slice(0, 5)) { await t('touchMove', await pos(c)); await p.waitForTimeout(50); }
await p.waitForTimeout(400); await shot('g4-trace'); await t('touchEnd'); await idle();
await t('touchStart', await pos(sol[4])); for (const c of sol.slice(5)) { await t('touchMove', await pos(c)); await p.waitForTimeout(50); }
await t('touchEnd'); await p.waitForFunction(() => window.__MAZEO__.state().won, null, { timeout: 60000 }); await p.waitForTimeout(2600); await shot('g7-victoire');
// bloqué
await p.goto('http://localhost:5173/?e2e&level=2'); await idle();
const w = await p.evaluate(() => window.__MAZEO__.state().width);
const s0 = await p.evaluate(() => window.__MAZEO__.state().pos);
await t('touchStart', await pos(s0)); for (const c of [1, 2, 2 + w, 2 + 2 * w, 1 + 2 * w, 2 * w]) { await t('touchMove', await pos(c)); await p.waitForTimeout(50); }
await t('touchEnd'); await idle(); await p.waitForTimeout(2600); await shot('g5-bloque');
// pause
const pp = await p.evaluate(() => window.__MAZEO__.objectPage('btn-pause'));
await p.touchscreen.tap(pp.x, pp.y); await p.waitForTimeout(800); await shot('g6-pause');
console.log(JSON.stringify(await p.evaluate(() => ({ act: window.__MAZEO__.active(), paused: window.__MAZEO__.game.scene.isPaused('Game') }))));
console.log(errs.join('\n'));
await b.close();
