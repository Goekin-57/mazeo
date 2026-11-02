import { expect, test } from '@playwright/test';
import {
  active, drag, errorsOf, idx, open, press, shot, solution, state, tapCell, waitIdle, waitScene,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test('lancement, accueil, carnet, paramètres', async ({ page }, info) => {
  const errors = errorsOf(page);
  await open(page);
  await waitScene(page, 'Menu');
  await page.waitForTimeout(800);
  await shot(page, info, '01-accueil');
  await press(page, info, 'btn-levels');
  await waitScene(page, 'Levels');
  await page.waitForTimeout(900);
  await shot(page, info, '02-carnet');
  // niveau 2 verrouillé : rester dans le carnet
  await press(page, info, 'card-2');
  await page.waitForTimeout(400);
  expect(await active(page)).toContain('Levels');
  await press(page, info, 'btn-back');
  await waitScene(page, 'Menu');
  await press(page, info, 'btn-settings');
  await waitScene(page, 'Settings');
  await shot(page, info, '03-parametres');
  await press(page, info, 'toggle-reducedMotion');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mazeo.save.v1')!).settings.reducedMotion)).toBe(true);
  await press(page, info, 'toggle-reducedMotion');
  await press(page, info, 'btn-close');
  await expect.poll(async () => (await active(page)).includes('Settings')).toBe(false);
  await press(page, info, 'btn-play');
  await waitScene(page, 'Game');
  await waitIdle(page);
  expect((await state(page))!.level).toBe(1);
  expect(errors).toEqual([]);
});

test('niveau 1 : tracé au doigt / à la souris, haies, victoire', async ({ page }, info) => {
  const errors = errorsOf(page);
  await open(page, 'level=1');
  await waitScene(page, 'Game');
  await waitIdle(page);
  await shot(page, info, '10-niveau1-debut');
  const s0 = (await state(page))!;
  const sol = await solution(page);
  // tracé partiel : 4 cases
  await drag(page, info, s0.pos, sol.slice(0, 4));
  await waitIdle(page);
  let s = (await state(page))!;
  expect(s.pos).toBe(sol[3]);
  expect(s.closed.sort((a, b) => a - b)).toEqual([s0.pos, ...sol.slice(0, 3)].sort((a, b) => a - b));
  await page.waitForTimeout(500);
  await shot(page, info, '11-niveau1-haies');
  // une case fermée est infranchissable
  await tapCell(page, info, sol[2]);
  await page.waitForTimeout(500);
  expect((await state(page))!.pos).toBe(sol[3]);
  // fin du trajet
  await drag(page, info, sol[3], sol.slice(4));
  await waitIdle(page);
  s = (await state(page))!;
  expect(s.won).toBe(true);
  await page.waitForTimeout(2600);
  await shot(page, info, '12-niveau1-victoire');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('mazeo.save.v1')!));
  expect(save.unlocked).toBe(2);
  expect(save.stars['1']).toBe(3);
  expect(errors).toEqual([]);
});

test('niveau 2 : impasse, blocage, annuler, recommencer, puis victoire au toucher', async ({ page }, info) => {
  const errors = errorsOf(page);
  await open(page, 'level=2');
  await waitScene(page, 'Game');
  await waitIdle(page);
  const W = 6;
  const s0 = (await state(page))!;
  const dead = [[1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]].map(([x, y]) => idx(W, x, y));
  await drag(page, info, s0.pos, dead);
  await waitIdle(page);
  let s = (await state(page))!;
  expect(s.pos).toBe(idx(W, 0, 6));
  expect(s.closed.length).toBe(10);
  await page.waitForTimeout(600);
  await shot(page, info, '20-niveau2-impasse');
  // tenter de repasser sur une haie
  await tapCell(page, info, idx(W, 0, 5));
  await page.waitForTimeout(400);
  expect((await state(page))!.pos).toBe(idx(W, 0, 6));
  // Annuler : retour exact à l'état précédent
  await press(page, info, 'btn-undo');
  await waitIdle(page);
  s = (await state(page))!;
  expect(s.pos).toBe(s0.pos);
  expect(s.closed).toEqual([]);
  expect(s.history).toBe(0);
  // quelques pas au toucher puis Recommencer
  await tapCell(page, info, idx(W, 1, 0));
  await waitIdle(page);
  await tapCell(page, info, idx(W, 2, 0));
  await waitIdle(page);
  expect((await state(page))!.closed.length).toBe(2);
  await press(page, info, 'btn-restart');
  await waitIdle(page);
  s = (await state(page))!;
  expect(s.pos).toBe(s0.pos);
  expect(s.closed).toEqual([]);
  expect(s.steps).toBe(0);
  // solution, une case à la fois (méthode alternative)
  for (const c of await solution(page)) {
    await tapCell(page, info, c);
    await waitIdle(page);
  }
  expect((await state(page))!.won).toBe(true);
  await page.waitForTimeout(2600);
  await shot(page, info, '21-niveau2-victoire-1etoile');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('mazeo.save.v1')!));
  expect(save.stars['2']).toBe(1); // Annuler + Recommencer utilisés
  expect(errors).toEqual([]);
});

test('niveau 3 : canetons, sortie verrouillée, ordre', async ({ page }, info) => {
  const errors = errorsOf(page);
  await open(page, 'level=3');
  await waitScene(page, 'Game');
  await waitIdle(page);
  const W = 6;
  const s0 = (await state(page))!;
  await drag(page, info, s0.pos, [[3, 5], [4, 5], [5, 5]].map(([x, y]) => idx(W, x, y)));
  await waitIdle(page);
  await tapCell(page, info, idx(W, 5, 6)); // maman cane : verrouillé (0/2)
  await page.waitForTimeout(500);
  let s = (await state(page))!;
  expect(s.pos).toBe(idx(W, 5, 5));
  expect(s.won).toBe(false);
  await shot(page, info, '30-niveau3-sortie-verrouillee');
  await press(page, info, 'btn-undo');
  await waitIdle(page);
  const sol = await solution(page);
  const firstDuck = sol.indexOf(idx(W, 0, 2));
  await drag(page, info, s0.pos, sol.slice(0, firstDuck + 1));
  await waitIdle(page);
  expect((await state(page))!.collected).toBe(1);
  await page.waitForTimeout(400);
  await shot(page, info, '31-niveau3-1-sur-2');
  await drag(page, info, sol[firstDuck], sol.slice(firstDuck + 1));
  await waitIdle(page);
  s = (await state(page))!;
  expect(s.collected).toBe(3);
  expect(s.won).toBe(true);
  await page.waitForTimeout(2600);
  await shot(page, info, '32-niveau3-victoire');
  expect(errors).toEqual([]);
});

test('niveau 4 : interrupteur et pont', async ({ page }, info) => {
  const errors = errorsOf(page);
  await open(page, 'level=4');
  await waitScene(page, 'Game');
  await waitIdle(page);
  const W = 6;
  const s0 = (await state(page))!;
  await drag(page, info, s0.pos, [[1, 7], [0, 7], [0, 6], [0, 5], [0, 4], [1, 4], [2, 4]].map(([x, y]) => idx(W, x, y)));
  await waitIdle(page);
  await tapCell(page, info, idx(W, 2, 3)); // pont replié
  await page.waitForTimeout(500);
  expect((await state(page))!.pos).toBe(idx(W, 2, 4));
  expect((await state(page))!.bridgesOpen).toBe(false);
  await shot(page, info, '40-niveau4-pont-ferme');
  await press(page, info, 'btn-undo');
  await waitIdle(page);
  const sol = await solution(page);
  const sw = sol.indexOf(idx(W, 5, 6));
  await drag(page, info, s0.pos, sol.slice(0, sw + 1));
  await waitIdle(page);
  expect((await state(page))!.bridgesOpen).toBe(true);
  await page.waitForTimeout(1500);
  await shot(page, info, '41-niveau4-pont-deploye');
  await drag(page, info, sol[sw], sol.slice(sw + 1));
  await waitIdle(page);
  const s = (await state(page))!;
  expect(s.won).toBe(true);
  expect(s.closed).not.toContain(idx(W, 2, 3)); // le pont ne se referme pas
  await page.waitForTimeout(2600);
  await shot(page, info, '42-niveau4-victoire');
  expect(errors).toEqual([]);
});

test('niveau 5 : graine magique et arche', async ({ page }, info) => {
  const errors = errorsOf(page);
  await open(page, 'level=5');
  await waitScene(page, 'Game');
  await waitIdle(page);
  const W = 7;
  const s0 = (await state(page))!;
  await drag(page, info, s0.pos, [[2, 6], [1, 6], [0, 6], [0, 5], [0, 4], [0, 3], [0, 2], [1, 2]].map(([x, y]) => idx(W, x, y)));
  await waitIdle(page);
  await tapCell(page, info, idx(W, 1, 1)); // arche fermée
  await page.waitForTimeout(500);
  expect((await state(page))!.pos).toBe(idx(W, 1, 2));
  await shot(page, info, '50-niveau5-arche-fermee');
  await press(page, info, 'btn-undo');
  await waitIdle(page);
  const sol = await solution(page);
  const seed = sol.indexOf(idx(W, 3, 4));
  await drag(page, info, s0.pos, sol.slice(0, seed + 1));
  await waitIdle(page);
  expect((await state(page))!.doorsOpen).toBe(true);
  await page.waitForTimeout(1500);
  await shot(page, info, '51-niveau5-jardin-transforme');
  await drag(page, info, sol[seed], sol.slice(seed + 1));
  await waitIdle(page);
  expect((await state(page))!.won).toBe(true);
  await page.waitForTimeout(2600);
  await shot(page, info, '52-niveau5-victoire');
  expect(errors).toEqual([]);
});

test('niveau 6 : le grand détour', async ({ page }, info) => {
  const errors = errorsOf(page);
  await open(page, 'level=6');
  await waitScene(page, 'Game');
  await waitIdle(page);
  await shot(page, info, '60-niveau6-debut');
  const s0 = (await state(page))!;
  const sol = await solution(page);
  const half = 12;
  await drag(page, info, s0.pos, sol.slice(0, half));
  await waitIdle(page);
  const mid = (await state(page))!;
  expect(mid.pos).toBe(sol[half - 1]);
  expect(mid.bridgesOpen).toBe(true);
  await shot(page, info, '61-niveau6-milieu');
  await drag(page, info, sol[half - 1], sol.slice(half));
  await waitIdle(page);
  const s = (await state(page))!;
  expect(s.won).toBe(true);
  expect(s.collected).toBe(3);
  await page.waitForTimeout(2800);
  await shot(page, info, '62-niveau6-final');
  expect(errors).toEqual([]);
});

test('progression : JOUER → victoire → Continuer → rechargement', async ({ page }, info) => {
  const errors = errorsOf(page);
  await open(page);
  await waitScene(page, 'Menu');
  await press(page, info, 'btn-play');
  await waitScene(page, 'Game');
  await waitIdle(page);
  const sol = await solution(page);
  await drag(page, info, (await state(page))!.pos, sol);
  await waitIdle(page);
  expect((await state(page))!.won).toBe(true);
  await page.waitForTimeout(2600);
  await press(page, info, 'btn-next');
  await expect.poll(async () => (await state(page))?.level, { timeout: 30_000 }).toBe(2);
  await waitIdle(page);
  // rechargement : la progression est conservée
  await page.goto('/?e2e');
  await waitScene(page, 'Menu');
  await press(page, info, 'btn-levels');
  await waitScene(page, 'Levels');
  await page.waitForTimeout(1000);
  await shot(page, info, '70-carnet-apres-progression');
  await press(page, info, 'card-2');
  await waitScene(page, 'Game');
  await waitIdle(page);
  expect((await state(page))!.level).toBe(2);
  // Pause puis retour au carnet
  await press(page, info, 'btn-pause');
  await page.waitForTimeout(300);
  await shot(page, info, '71-pause');
  await press(page, info, 'pause-0');
  expect((await state(page))!.mode).toBe('idle');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('mazeo.save.v1')!));
  expect(save.unlocked).toBe(2);
  expect(save.completed['1']).toBe(true);
  expect(errors).toEqual([]);
});

test('animations réduites : niveau 4 jouable, pont et état cohérents', async ({ page }, info) => {
  const errors = errorsOf(page);
  await page.addInitScript(() => localStorage.setItem('mazeo.save.v1', JSON.stringify({ unlocked: 1, stars: {}, completed: {}, settings: { sound: false, ambience: false, reducedMotion: true } })));
  await open(page, 'level=4');
  await waitScene(page, 'Game');
  await waitIdle(page);
  const s0 = (await state(page))!;
  const sol = await solution(page);
  await drag(page, info, s0.pos, sol.slice(0, 8));
  await waitIdle(page);
  await press(page, info, 'btn-undo');
  await waitIdle(page);
  expect((await state(page))!.bridgesOpen).toBe(false);
  await drag(page, info, s0.pos, sol);
  await waitIdle(page);
  expect((await state(page))!.won).toBe(true);
  await page.waitForTimeout(800);
  await shot(page, info, '80-animations-reduites-victoire');
  expect(errors).toEqual([]);
});

test('clavier (ordinateur) : flèches, Z pour annuler, R pour recommencer', async ({ page }, info) => {
  test.skip(!!info.project.use.hasTouch, 'clavier testé sur le profil ordinateur');
  const errors = errorsOf(page);
  await open(page, 'level=1');
  await waitScene(page, 'Game');
  await waitIdle(page);
  await page.keyboard.press('ArrowRight');
  await waitIdle(page);
  await page.keyboard.press('ArrowRight');
  await waitIdle(page);
  expect((await state(page))!.pos).toBe(2);
  await page.keyboard.press('KeyZ');
  await waitIdle(page);
  expect((await state(page))!.pos).toBe(1);
  await page.keyboard.press('KeyR');
  await waitIdle(page);
  expect((await state(page))!.pos).toBe(0);
  expect((await state(page))!.closed).toEqual([]);
  const keys: Record<string, string> = { '1': 'ArrowRight', '-1': 'ArrowLeft', '5': 'ArrowDown', '-5': 'ArrowUp' };
  let pos = 0;
  for (const c of await solution(page)) {
    await page.keyboard.press(keys[String(c - pos)]);
    await waitIdle(page);
    pos = c;
  }
  expect((await state(page))!.won).toBe(true);
  expect(errors).toEqual([]);
});
