import { expect, type Page, type TestInfo } from '@playwright/test';

export interface S {
  level: number; key: string; kind: string; ranked: boolean; moves: number; pos: number; won: boolean; collected: number; bridgesOpen: boolean; doorsOpen: boolean;
  closed: number[]; steps: number; width: number; mode: string; history: number; fading: boolean;
}

export const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
};

export async function open(page: Page, query = '') {
  await page.goto('/?e2e' + (query ? '&' + query : ''));
  await page.waitForFunction(() => (window as any).__MAZEO__?.active?.().length > 0, null, { timeout: 60_000 });
}

export const active = (page: Page) => page.evaluate(() => (window as any).__MAZEO__.active() as string[]);
export const state = (page: Page) => page.evaluate(() => (window as any).__MAZEO__.state() as S | null);

export async function waitScene(page: Page, key: string) {
  await expect.poll(async () => (await active(page)).includes(key), { timeout: 60_000 }).toBe(true);
  await page.waitForTimeout(400);
}

export async function waitIdle(page: Page) {
  await expect.poll(async () => {
    const s = await state(page);
    return !!s && !s.fading && (s.mode === 'idle' || s.mode === 'won');
  }, { timeout: 90_000, intervals: [100, 200, 300] }).toBe(true);
}

export async function cellPos(page: Page, cell: number) {
  return page.evaluate((c) => (window as any).__MAZEO__.cellToPage(c), cell) as Promise<{ x: number; y: number }>;
}

export async function objectPos(page: Page, name: string) {
  const p = await page.evaluate((n) => (window as any).__MAZEO__.objectPage(n), name);
  if (!p) throw new Error(`objet introuvable : ${name}`);
  return p as { x: number; y: number };
}

export const isTouch = (info: TestInfo) => !!info.project.use.hasTouch;

/** Toucher/cliquer un point de la page (vrai événement d'entrée). */
export async function tapAt(page: Page, info: TestInfo, p: { x: number; y: number }) {
  if (isTouch(info)) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}

export async function press(page: Page, info: TestInfo, name: string) {
  await tapAt(page, info, await objectPos(page, name));
  await page.waitForTimeout(250);
}

export async function tapCell(page: Page, info: TestInfo, cell: number) {
  await tapAt(page, info, await cellPos(page, cell));
}

/** Glisser le doigt (ou la souris) depuis le personnage le long des cases données. */
export async function drag(page: Page, info: TestInfo, start: number, cells: number[]) {
  const pts = [await cellPos(page, start)];
  for (const c of cells) pts.push(await cellPos(page, c));
  const seq: { x: number; y: number }[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    for (let k = 1; k <= 3; k++) seq.push({ x: pts[i - 1].x + ((pts[i].x - pts[i - 1].x) * k) / 3, y: pts[i - 1].y + ((pts[i].y - pts[i - 1].y) * k) / 3 });
  }
  if (isTouch(info)) {
    const cdp = await page.context().newCDPSession(page);
    const tp = (p: { x: number; y: number }) => [{ x: p.x, y: p.y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(seq[0]) });
    for (const p of seq.slice(1)) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(p) });
      await page.waitForTimeout(30);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(seq[0].x, seq[0].y);
    await page.mouse.down();
    for (const p of seq.slice(1)) {
      await page.mouse.move(p.x, p.y, { steps: 2 });
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
  }
}

export async function solution(page: Page): Promise<number[]> {
  return page.evaluate(() => (window as any).__MAZEO__.solution());
}

export async function shot(page: Page, info: TestInfo, name: string) {
  const path = `tests/shots/e2e/${info.project.name}/${name}.png`;
  await page.screenshot({ path });
  return path;
}

export const idx = (w: number, x: number, y: number) => y * w + x;

export const save = (page: Page) => page.evaluate(() => (window as any).__MAZEO__.save());

export async function visible(page: Page, name: string) {
  return page.evaluate((n) => !!(window as any).__MAZEO__.objectPage(n), name);
}

/** Joue la solution optimale du niveau courant (vrai geste de glisser). */
export async function solveCurrent(page: Page, info: TestInfo) {
  await waitIdle(page);
  const st = (await state(page))!;
  await drag(page, info, st.pos, await solution(page));
  await waitIdle(page);
}
