// Captures d'écran rapides : node tools/shoot.mjs <url-query> <out.png> [w] [h] [waitMs]
import { chromium } from '@playwright/test';
const [, , q = '', out = 'tests/shots/x.png', w = '390', h = '844', wait = '2500'] = process.argv;
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
await page.goto('http://localhost:5173/' + q);
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();
