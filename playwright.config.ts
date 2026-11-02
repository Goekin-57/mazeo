import { defineConfig } from '@playwright/test';

const launchOptions = {
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
};

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 240_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'tests/report/results.json' }]],
  use: { baseURL: 'http://localhost:5173', launchOptions, trace: 'off' },
  webServer: { command: 'npx vite --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true },
  projects: [
    { name: 'iphone-390x844', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'android-412x915', use: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'small-360x640', use: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'desktop-1280x800', use: { viewport: { width: 1280, height: 800 }, hasTouch: false } },
  ],
});
