import { expect, test } from '@playwright/test';
import {
  active, drag, errorsOf, open, press, save, shot, solution, solveCurrent, state, tapCell, visible, waitIdle, waitScene,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test('accueil et navigation : Aventure, Défis, Collection, Communauté, Paramètres', async ({ page }, info) => {
  const errors = errorsOf(page);
  await open(page, 'today=2026-11-02');
  await waitScene(page, 'Home');
  await page.waitForTimeout(700);
  await shot(page, info, '01-accueil');
  expect(await visible(page, 'home-beacon')).toBe(true);
  expect(await visible(page, 'home-bridge')).toBe(false);
  for (const [nav, scene, file] of [['nav-adventure', 'Journey', '02-carnet-voyage'], ['nav-challenges', 'Challenges', '03-defis'], ['nav-collection', 'Collection', '04-collection'], ['nav-community', 'Community', '05-communaute']] as const) {
    await press(page, info, nav);
    await waitScene(page, scene);
    await page.waitForTimeout(500);
    await shot(page, info, file);
    await press(page, info, 'btn-back');
    await waitScene(page, 'Home');
  }
  // chapitre 2 indisponible depuis le carnet de voyage
  await press(page, info, 'nav-adventure');
  await waitScene(page, 'Journey');
  await press(page, info, 'trail-chapter02');
  await page.waitForTimeout(400);
  expect(await active(page)).toContain('Journey');
  await press(page, info, 'trail-chapter01');
  await waitScene(page, 'Chapter');
  await shot(page, info, '06-chapitre1');
  await press(page, info, 'card-chapter01-level02'); // verrouillé
  await page.waitForTimeout(400);
  expect(await active(page)).toContain('Chapter');
  await press(page, info, 'btn-back');
  await waitScene(page, 'Journey');
  await press(page, info, 'btn-back');
  await waitScene(page, 'Home');
  await press(page, info, 'btn-settings');
  await waitScene(page, 'Settings');
  await press(page, info, 'toggle-reducedMotion');
  expect((await save(page)).settings.reducedMotion).toBe(true);
  await press(page, info, 'toggle-reducedMotion');
  await press(page, info, 'btn-close');
  await expect.poll(async () => (await active(page)).includes('Settings')).toBe(false);
  expect(errors).toEqual([]);
});

test('chapitre 1 complet : six niveaux, récompenses, fin de chapitre, accueil évolutif', async ({ page }, info) => {
  test.setTimeout(600_000);
  const errors = errorsOf(page);
  await open(page);
  await waitScene(page, 'Home');
  await press(page, info, 'btn-play');
  await waitScene(page, 'Game');
  for (let n = 1; n <= 6; n++) {
    await waitIdle(page);
    expect((await state(page))!.key).toBe(`chapter01-level0${n}`);
    if (n === 1) expect(await visible(page, 'btn-undo')).toBe(false); // Annuler masqué au tutoriel
    await solveCurrent(page, info);
    expect((await state(page))!.won).toBe(true);
    if (n < 6) {
      await page.waitForTimeout(2400);
      await shot(page, info, `1${n}-niveau${n}-victoire`);
      await press(page, info, 'btn-next');
      await expect.poll(async () => (await state(page))?.key, { timeout: 30_000 }).toBe(`chapter01-level0${n + 1}`);
    }
  }
  // fin de chapitre : carte du Grand Sentier puis aperçu du Port des Marées
  await waitScene(page, 'ChapterEnd');
  await page.waitForTimeout(2500);
  await shot(page, info, '17-fin-chapitre');
  const sv = await save(page);
  for (let n = 1; n <= 6; n++) expect(sv.levels[`chapter01-level0${n}`]).toMatchObject({ completed: true, stars: 3 });
  expect(sv.chapters.chapter01.completed).toBe(true);
  expect(sv.collection.owned).toEqual(expect.arrayContaining(['companion-duckling', 'deco-magic-flower', 'hat-gardener', 'badge-garden-keeper']));
  expect(sv.collection.equipped.hat).toBe('hat-gardener');
  await press(page, info, 'btn-home');
  await waitScene(page, 'Home');
  await page.waitForTimeout(800);
  await shot(page, info, '18-accueil-apres-chapitre');
  for (const n of ['home-beacon-lit', 'home-bridge', 'home-magic-flower', 'home-duckling']) expect(await visible(page, n)).toBe(true);
  // la collection permet de retirer le chapeau, et le jeu l'affiche ou non
  await press(page, info, 'nav-collection');
  await waitScene(page, 'Collection');
  await shot(page, info, '19-collection-pleine');
  await press(page, info, 'item-hat-gardener');
  await expect.poll(async () => (await save(page)).collection.equipped.hat).toBe(null);
  await press(page, info, 'item-hat-gardener');
  await expect.poll(async () => (await save(page)).collection.equipped.hat).toBe('hat-gardener');
  expect(errors).toEqual([]);
});

test('niveau 2 : impasse, Bourgeon surpris, Recommencer proposé, Annuler exact', async ({ page }, info) => {
  const errors = errorsOf(page);
  await open(page, 'level=2');
  await waitScene(page, 'Game');
  await waitIdle(page);
  const s0 = (await state(page))!;
  const W = s0.width;
  await drag(page, info, s0.pos, [1, 2, 2 + W, 2 + 2 * W, 1 + 2 * W, 2 * W]);
  await waitIdle(page);
  await expect.poll(async () => visible(page, 'stuck-restart'), { timeout: 15_000 }).toBe(true);
  await shot(page, info, '20-impasse');
  await tapCell(page, info, 1 + 2 * W); // case fermée
  await page.waitForTimeout(400);
  expect((await state(page))!.pos).toBe(2 * W);
  await press(page, info, 'stuck-undo');
  await waitIdle(page);
  let s = (await state(page))!;
  expect(s.pos).toBe(s0.pos);
  expect(s.closed).toEqual([]);
  await tapCell(page, info, 1);
  await waitIdle(page);
  await press(page, info, 'btn-restart');
  await waitIdle(page);
  s = (await state(page))!;
  expect(s.closed).toEqual([]);
  expect(s.moves).toBe(0);
  expect(errors).toEqual([]);
});

test('défi du jour : entraînement avec annulation, tentative classée sans annulation, record', async ({ page }, info) => {
  const errors = errorsOf(page);
  await open(page, 'scene=Challenges&today=2026-11-02');
  await waitScene(page, 'Challenges');
  await press(page, info, 'daily-practice');
  await waitScene(page, 'Game');
  await waitIdle(page);
  let s = (await state(page))!;
  expect(s.kind).toBe('challenge');
  expect(s.ranked).toBe(false);
  const sol = await solution(page);
  await drag(page, info, s.pos, sol.slice(0, 2));
  await waitIdle(page);
  await press(page, info, 'btn-undo');
  await waitIdle(page);
  expect((await state(page))!.moves).toBe(0);
  await solveCurrent(page, info);
  await page.waitForTimeout(2200);
  await shot(page, info, '30-defi-entrainement');
  await press(page, info, 'btn-next');
  await waitScene(page, 'Challenges');
  await press(page, info, 'daily-ranked');
  await waitScene(page, 'Game');
  await waitIdle(page);
  s = (await state(page))!;
  expect(s.ranked).toBe(true);
  expect(await visible(page, 'btn-undo')).toBe(false);
  await shot(page, info, '31-defi-classe');
  await solveCurrent(page, info);
  expect((await state(page))!.won).toBe(true);
  await page.waitForTimeout(2200);
  await shot(page, info, '32-defi-classe-reussi');
  const sv = await save(page);
  const rec = Object.values(sv.challenges.records)[0] as { bestRankedMoves: number; bestMoves: number };
  expect(rec.bestRankedMoves).toBe(sol.length);
  const ranked = sv.challenges.results.find((r: { mode: string }) => r.mode === 'ranked');
  expect(ranked).toMatchObject({ contextId: 'daily-2026-11-02', validated: true, undos: 0, rulesVersion: 1, puzzleVersion: 1, moves: sol.length });
  expect(ranked.path).toEqual(sol);
  expect(sv.collection.owned).toContain('badge-first-daily');
  await press(page, info, 'btn-next');
  await waitScene(page, 'Challenges');
  await page.waitForTimeout(500);
  await shot(page, info, '33-defis-apres');
  expect(errors).toEqual([]);
});

test('défi hebdomadaire : trois labyrinthes classés et score total', async ({ page }, info) => {
  test.setTimeout(400_000);
  const errors = errorsOf(page);
  await open(page, 'scene=Challenges&today=2026-11-02');
  await waitScene(page, 'Challenges');
  let total = 0;
  for (let i = 0; i < 3; i++) {
    await press(page, info, `weekly-${i}`);
    await waitScene(page, 'Game');
    await waitIdle(page);
    expect((await state(page))!.ranked).toBe(true);
    total += (await solution(page)).length;
    await solveCurrent(page, info);
    expect((await state(page))!.won).toBe(true);
    await page.waitForTimeout(2000);
    await press(page, info, 'btn-next');
    await waitScene(page, 'Challenges');
  }
  await page.waitForTimeout(600);
  await shot(page, info, '40-semaine-terminee');
  const txt = await page.evaluate(() => {
    const sc = (window as any).__MAZEO__.game.scene.getScene('Challenges');
    return sc.children.getByName('weekly-total')?.text;
  });
  expect(txt).toBe(`Score de la semaine : ${total} cases`);
  expect(errors).toEqual([]);
});

test('changement de date : le défi du jour change, les jours passés vont dans l’historique', async ({ page }, info) => {
  const errors = errorsOf(page);
  const key = async (day: string) => {
    await open(page, `scene=Challenges&today=${day}`);
    await waitScene(page, 'Challenges');
    await press(page, info, 'daily-practice');
    await waitScene(page, 'Game');
    await waitIdle(page);
    return (await state(page))!.key;
  };
  const a = await key('2026-11-02');
  const b = await key('2026-11-03');
  expect(a).not.toBe(b);
  await open(page, 'scene=Challenges&today=2026-11-03');
  await waitScene(page, 'Challenges');
  expect(await visible(page, 'history-0')).toBe(true);
  await shot(page, info, '50-historique');
  expect(errors).toEqual([]);
});

test('lien de défi partagé : même puzzle et même version', async ({ page }, info) => {
  const errors = errorsOf(page);
  await page.goto('/?e2e&defi=puzzle-x02%401');
  await waitScene(page, 'Challenges');
  await shot(page, info, '60-defi-recu');
  await press(page, info, 'linked-practice');
  await waitScene(page, 'Game');
  await waitIdle(page);
  expect((await state(page))!.key).toBe('puzzle-x02');
  await page.goto('/?e2e&defi=puzzle-x02%4099');
  await waitScene(page, 'Challenges');
  expect(await visible(page, 'linked-practice')).toBe(false);
  expect(errors).toEqual([]);
});

test('migration d’une sauvegarde v1 : progression conservée', async ({ page }, info) => {
  const errors = errorsOf(page);
  await page.addInitScript(() => {
    if (!localStorage.getItem('mazeo.save.v2')) localStorage.setItem('mazeo.save.v1', JSON.stringify({ unlocked: 3, stars: { 1: 3, 2: 2 }, completed: { 1: true, 2: true }, settings: { sound: false, ambience: true, reducedMotion: false } }));
  });
  await open(page);
  await waitScene(page, 'Home');
  const sv = await save(page);
  expect(sv.version).toBe(2);
  expect(sv.levels['chapter01-level02']).toMatchObject({ completed: true, stars: 2 });
  expect(sv.settings.sound).toBe(false);
  await press(page, info, 'btn-play');
  await waitScene(page, 'Game');
  await waitIdle(page);
  expect((await state(page))!.key).toBe('chapter01-level03');
  expect(errors).toEqual([]);
});
