import { expect, test } from '@playwright/test';
import {
  active, drag, errorsOf, info, isPaused, open, press, save, shot, solution, solveCurrent, state, tapCell, visible, waitIdle, waitScene,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test('accueil, navigation basse, carnet de voyage, sélection des niveaux, paramètres', async ({ page }, info_) => {
  const errors = errorsOf(page);
  await open(page, 'today=2026-11-02');
  await waitScene(page, 'Home');
  await page.waitForTimeout(700);
  await shot(page, info_, '01-accueil');
  expect((await info(page, 'btn-play'))!.text).toBe('JOUER');
  expect(await visible(page, 'home-beacon')).toBe(true);
  for (const [nav, scene, file] of [['nav-Journey', 'Journey', '02-carnet-voyage'], ['nav-Challenges', 'Challenges', '03-defis'], ['nav-Collection', 'Collection', '04-collection'], ['nav-Community', 'Community', '05-communaute']] as const) {
    await press(page, info_, nav);
    await waitScene(page, scene);
    await page.waitForTimeout(500);
    await shot(page, info_, file);
  }
  // navigation entre onglets sans repasser par l'accueil, puis retour
  await press(page, info_, 'nav-Journey');
  await waitScene(page, 'Journey');
  await press(page, info_, 'chapter-chapter02'); // indisponible
  await page.waitForTimeout(400);
  expect(await active(page)).toContain('Journey');
  await press(page, info_, 'chapter-chapter01');
  await waitScene(page, 'Chapter');
  await shot(page, info_, '06-chapitre1');
  await press(page, info_, 'card-chapter01-level02'); // verrouillé
  await page.waitForTimeout(400);
  expect(await active(page)).toContain('Chapter');
  await press(page, info_, 'btn-back');
  await waitScene(page, 'Journey');
  await press(page, info_, 'btn-back');
  await waitScene(page, 'Home');
  await press(page, info_, 'btn-settings');
  await waitScene(page, 'Settings');
  await shot(page, info_, '07-parametres');
  await press(page, info_, 'toggle-levelIntro');
  expect((await save(page)).settings.levelIntro).toBe(false);
  await press(page, info_, 'toggle-levelIntro');
  await press(page, info_, 'btn-close');
  await expect.poll(async () => (await active(page)).includes('Settings')).toBe(false);
  expect(errors).toEqual([]);
});

test('écran de jeu : bandeau, sortie verrouillée puis active, pause réelle, quitter', async ({ page }, info_) => {
  const errors = errorsOf(page);
  await open(page, 'level=3');
  await waitScene(page, 'Game');
  await waitIdle(page);
  await page.waitForTimeout(600);
  await shot(page, info_, '10-jeu-sortie-verrouillee');
  expect((await save(page)).introSeen).toContain('chapter01-level03');
  expect(await visible(page, 'exit-pin-locked')).toBe(true);
  expect((await info(page, 'btn-undo'))!.enabled).toBe(false); // rien à annuler
  // pause : le niveau est réellement suspendu
  await press(page, info_, 'btn-pause');
  await waitScene(page, 'Pause');
  expect(await isPaused(page)).toBe(true);
  await shot(page, info_, '11-pause');
  await press(page, info_, 'pause-resume');
  await expect.poll(() => isPaused(page)).toBe(false);
  // récupérer le caneton : la sortie s'active
  const sol = await solution(page);
  const duck = sol.findIndex((_, i) => i >= 0 && i === sol.length - 1) - 0;
  void duck;
  const s0 = (await state(page))!;
  await drag(page, info_, s0.pos, sol.slice(0, 4));
  await waitIdle(page);
  await expect.poll(async () => (await state(page))!.collected).toBe(1);
  await expect.poll(() => visible(page, 'exit-pin-open')).toBe(true);
  expect((await info(page, 'btn-undo'))!.enabled).toBe(true);
  await shot(page, info_, '12-sortie-active');
  // pause → recommencer
  await press(page, info_, 'btn-pause');
  await waitScene(page, 'Pause');
  await press(page, info_, 'pause-restart');
  await waitIdle(page);
  expect((await state(page))!.moves).toBe(0);
  expect(await visible(page, 'exit-pin-locked')).toBe(true);
  // quitter le niveau depuis le bandeau
  await press(page, info_, 'btn-quit');
  await waitScene(page, 'Chapter');
  expect(errors).toEqual([]);
});

test('chapitre 1 complet : victoires compactes, récompenses, fin de chapitre, accueil évolutif', async ({ page }, info_) => {
  test.setTimeout(600_000);
  const errors = errorsOf(page);
  await open(page, 'today=2026-11-02');
  await waitScene(page, 'Home');
  await press(page, info_, 'btn-play');
  await waitScene(page, 'Game');
  for (let n = 1; n <= 6; n++) {
    await waitIdle(page);
    expect((await state(page))!.key).toBe(`chapter01-level0${n}`);
    if (n === 1) expect(await visible(page, 'btn-undo')).toBe(false); // Annuler masqué au tutoriel
    await solveCurrent(page, info_);
    expect((await state(page))!.won).toBe(true);
    if (n < 6) {
      await page.waitForTimeout(2200);
      await shot(page, info_, `2${n}-niveau${n}-victoire`);
      expect((await info(page, 'btn-next'))!.text).toBe('NIVEAU SUIVANT');
      expect(await visible(page, 'btn-restart')).toBe(false); // commandes masquées sous la feuille
      await press(page, info_, 'btn-next');
      await expect.poll(async () => (await state(page))?.key, { timeout: 30_000 }).toBe(`chapter01-level0${n + 1}`);
    }
  }
  await waitScene(page, 'ChapterEnd');
  await page.waitForTimeout(2500);
  await shot(page, info_, '27-fin-chapitre');
  const sv = await save(page);
  for (let n = 1; n <= 6; n++) expect(sv.levels[`chapter01-level0${n}`]).toMatchObject({ completed: true, stars: 3 });
  expect(sv.collection.owned).toEqual(expect.arrayContaining(['companion-duckling', 'deco-magic-flower', 'hat-gardener', 'badge-garden-keeper']));
  await press(page, info_, 'btn-home');
  await waitScene(page, 'Home');
  await page.waitForTimeout(800);
  await shot(page, info_, '28-accueil-apres-chapitre');
  for (const n of ['home-beacon-lit', 'home-bridge', 'home-magic-flower', 'home-duckling']) expect(await visible(page, n)).toBe(true);
  // plus rien de nouveau en aventure : le bouton principal propose le défi du jour, jamais « Continuer »
  expect((await info(page, 'btn-play'))!.text).toBe('DÉFI DU JOUR');
  // collection : badges « Nouveau » une seule fois, équipement direct
  expect((await save(page)).collection.fresh.length).toBeGreaterThan(0);
  await press(page, info_, 'nav-Collection');
  await waitScene(page, 'Collection');
  await shot(page, info_, '29-collection-pleine');
  expect((await save(page)).collection.fresh).toEqual([]);
  expect((await info(page, 'state-hat-gardener'))!.visible).toBe(true);
  await press(page, info_, 'item-hat-gardener');
  await expect.poll(async () => (await save(page)).collection.equipped.hat).toBe(null);
  await press(page, info_, 'item-hat-gardener');
  await expect.poll(async () => (await save(page)).collection.equipped.hat).toBe('hat-gardener');
  expect(errors).toEqual([]);
});

test('état bloqué : une seule zone d’actions, Annuler exact, Recommencer', async ({ page }, info_) => {
  const errors = errorsOf(page);
  await open(page, 'level=2');
  await waitScene(page, 'Game');
  await waitIdle(page);
  const s0 = (await state(page))!;
  const W = s0.width;
  await drag(page, info_, s0.pos, [1, 2, 2 + W, 2 + 2 * W, 1 + 2 * W, 2 * W]);
  await waitIdle(page);
  await expect.poll(async () => visible(page, 'stuck-restart'), { timeout: 15_000 }).toBe(true);
  expect(await visible(page, 'btn-undo')).toBe(false); // pas de doublon sous le panneau
  await shot(page, info_, '30-bloque');
  await tapCell(page, info_, 1 + 2 * W); // case fermée : refusée
  await page.waitForTimeout(400);
  expect((await state(page))!.pos).toBe(2 * W);
  await press(page, info_, 'stuck-undo');
  await waitIdle(page);
  let s = (await state(page))!;
  expect(s.pos).toBe(s0.pos);
  expect(s.closed).toEqual([]);
  expect(await visible(page, 'btn-undo')).toBe(true);
  await tapCell(page, info_, 1);
  await waitIdle(page);
  await press(page, info_, 'btn-restart');
  await waitIdle(page);
  s = (await state(page))!;
  expect(s.closed).toEqual([]);
  expect(s.moves).toBe(0);
  expect(errors).toEqual([]);
});

test('défis : entraînement, tentative classée sans annulation, record, hebdomadaire', async ({ page }, info_) => {
  test.setTimeout(500_000);
  const errors = errorsOf(page);
  await open(page, 'scene=Challenges&today=2026-11-02');
  await waitScene(page, 'Challenges');
  await press(page, info_, 'daily-practice');
  await waitScene(page, 'Game');
  await waitIdle(page);
  expect((await state(page))!.ranked).toBe(false);
  const sol = await solution(page);
  await drag(page, info_, (await state(page))!.pos, sol.slice(0, 2));
  await waitIdle(page);
  await press(page, info_, 'btn-undo');
  await waitIdle(page);
  expect((await state(page))!.moves).toBe(0);
  await solveCurrent(page, info_);
  await page.waitForTimeout(2000);
  await shot(page, info_, '40-defi-entrainement');
  expect((await info(page, 'btn-next'))!.text).toBe('RETOUR AUX DÉFIS');
  await press(page, info_, 'btn-next');
  await waitScene(page, 'Challenges');
  await press(page, info_, 'daily-ranked');
  await waitScene(page, 'Game');
  await waitIdle(page);
  expect((await state(page))!.ranked).toBe(true);
  expect(await visible(page, 'btn-undo')).toBe(false);
  await shot(page, info_, '41-defi-classe');
  await solveCurrent(page, info_);
  await page.waitForTimeout(2000);
  await shot(page, info_, '42-defi-classe-reussi');
  const sv = await save(page);
  const ranked = sv.challenges.results.find((r: { mode: string }) => r.mode === 'ranked');
  expect(ranked).toMatchObject({ contextId: 'daily-2026-11-02', validated: true, undos: 0, moves: sol.length });
  expect(ranked.path).toEqual(sol);
  await press(page, info_, 'btn-next');
  await waitScene(page, 'Challenges');
  await page.waitForTimeout(500);
  await shot(page, info_, '43-defis-apres');
  // hebdomadaire : trois labyrinthes classés
  let total = 0;
  for (let i = 0; i < 3; i++) {
    await press(page, info_, `weekly-${i}`);
    await shot(page, info_, `44-semaine-${i}`);
    await waitScene(page, 'Game');
    await waitIdle(page);
    total += (await solution(page)).length;
    await solveCurrent(page, info_);
    await page.waitForTimeout(1800);
    await press(page, info_, 'btn-next');
    await waitScene(page, 'Challenges');
  }
  expect((await info(page, 'weekly-total'))!.text).toBe(`Score de la semaine : ${total} cases`);
  expect(errors).toEqual([]);
});

test('changement de date, historique repliable, lien partagé', async ({ page }, info_) => {
  const errors = errorsOf(page);
  const key = async (day: string) => {
    await open(page, `scene=Challenges&today=${day}`);
    await waitScene(page, 'Challenges');
    await press(page, info_, 'daily-practice');
    await waitScene(page, 'Game');
    await waitIdle(page);
    return (await state(page))!.key;
  };
  const a = await key('2026-11-02');
  await open(page, 'scene=Challenges&today=2026-11-02');
  await waitScene(page, 'Challenges');
  expect(await visible(page, 'history-toggle')).toBe(false); // pas de grande carte vide
  const b = await key('2026-11-03');
  expect(a).not.toBe(b);
  await open(page, 'scene=Challenges&today=2026-11-03');
  await waitScene(page, 'Challenges');
  await press(page, info_, 'history-toggle');
  await expect.poll(() => visible(page, 'history-0')).toBe(true);
  await shot(page, info_, '50-historique');
  await page.goto('/?e2e&defi=puzzle-x02%401');
  await waitScene(page, 'Challenges');
  await shot(page, info_, '51-defi-recu');
  await press(page, info_, 'linked-practice');
  await waitScene(page, 'Game');
  await waitIdle(page);
  expect((await state(page))!.key).toBe('puzzle-x02');
  await page.goto('/?e2e&defi=puzzle-x02%4099');
  await waitScene(page, 'Challenges');
  expect(await visible(page, 'linked-practice')).toBe(false);
  expect(errors).toEqual([]);
});

test('migration d’une sauvegarde v1 : progression conservée', async ({ page }, info_) => {
  const errors = errorsOf(page);
  await page.addInitScript(() => {
    if (!localStorage.getItem('mazeo.save.v2')) localStorage.setItem('mazeo.save.v1', JSON.stringify({ unlocked: 3, stars: { 1: 3, 2: 2 }, completed: { 1: true, 2: true }, settings: { sound: false, ambience: true, reducedMotion: false } }));
  });
  await open(page);
  await waitScene(page, 'Home');
  const sv = await save(page);
  expect(sv.version).toBe(2);
  expect(sv.levels['chapter01-level02']).toMatchObject({ completed: true, stars: 2 });
  expect((await info(page, 'btn-play'))!.text).toBe('CONTINUER');
  await press(page, info_, 'btn-play');
  await waitScene(page, 'Game');
  await waitIdle(page);
  expect((await state(page))!.key).toBe('chapter01-level03');
  expect(errors).toEqual([]);
});
