import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader'] });
const p = await b.newPage();
for (const [size, name, extra] of [[512, 'icon-512', ''], [192, 'icon-192', ''], [512, 'maskable-512', '&maskable'], [180, 'apple-touch-icon', '&maskable'], [64, 'favicon-64', '']]) {
  await p.setViewportSize({ width: size, height: size });
  await p.goto(`http://localhost:5173/tools/icon/index.html?size=${size}${extra}`);
  await p.waitForFunction(() => window.done === true);
  await p.locator('canvas').screenshot({ path: `public/icons/${name}.png`, omitBackground: true });
}
await b.close();
console.log('icônes générées');
