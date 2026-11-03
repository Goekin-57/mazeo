import { expect, test } from '@playwright/test';
import {
  a11yNames, active, dismissHelp, drag, errorsOf, info, isPaused, open, press, save, shot, solution, solveCurrent, state, tapCell, visible, waitIdle, waitScene, walk,
} from './helpers';

// chaque test ouvre une page neuve (sauvegarde vide) : ils sont indépendants

test('accueil, navigation à quatre onglets, aventure, réglages, anciennes routes', async ({ page }, info_) => {
  const errors = errorsOf(page);
  await open(page, 'today=2026-11-02');
  await waitScene(page, 'Home');
  await page.waitForTimeout(700);
  await shot(page, info_, '01-accueil');
  expect((await info(page, 'btn-play'))!.text).toBe('Commencer l’aventure');
  expect((await info(page, 'tagline'))!.text).toBe('Chaque pas compte.');
  expect((await info(page, 'home-level'))!.text).toBe('Niveau 1 · La première pousse');
  expect(await visible(page, 'home-preview-hit')).toBe(true);
  const names = await a11yNames(page);
  for (const n of ['Accueil (page actuelle)', 'Aventure', 'Défis', 'Collection', 'Réglages', 'Commencer l’aventure']) expect(names).toContain(n);
  expect(names.join(' ')).not.toContain('Communauté');
  // pastille « Défis » : nouveauté réelle, retirée après consultation
  expect((await save(page))?.challengesSeenDay ?? null).toBeNull();
  for (const [nav, scene, file] of [['nav-Journey', 'Journey', '02-aventure'], ['nav-Challenges', 'Challenges', '03-defis'], ['nav-Collection', 'Collection', '04-collection']] as const) {
    await press(page, info_, nav);
    await waitScene(page, scene);
    await page.waitForTimeout(500);
    await shot(page, info_, file);
  }
  expect((await save(page)).challengesSeenDay).toBe('daily-2026-11-02');
  await press(page, info_, 'nav-Home');
  await waitScene(page, 'Home');
  await press(page, info_, 'nav-Journey');
  await waitScene(page, 'Journey');
  expect((await info(page, 'screen-title'))!.text).toBe('Aventure');
  await press(page, info_, 'card-chapter01-level02'); // verrouillé : rien ne se passe
  await page.waitForTimeout(400);
  expect(await active(page)).toContain('Journey');
  expect((await info(page, 'level-sub-chapter01-level02'))!.text).toBe('Termine le niveau 1');
  await press(page, info_, 'card-chapter01-level01');
  await waitScene(page, 'Game');
  expect((await state(page))!.key).toBe('chapter01-level01');
  // anciennes routes redirigées
  await open(page, 'scene=Community');
  await waitScene(page, 'Challenges');
  await open(page, 'scene=Chapter');
  await waitScene(page, 'Journey');
  // réglages : effacement global derrière une confirmation explicite
  await open(page);
  await waitScene(page, 'Home');
  await press(page, info_, 'btn-settings');
  await waitScene(page, 'Settings');
  await shot(page, info_, '07-reglages');
  await press(page, info_, 'toggle-levelIntro');
  expect((await save(page)).settings.levelIntro).toBe(false);
  await press(page, info_, 'toggle-levelIntro');
  await press(page, info_, 'btn-reset');
  await expect.poll(() => visible(page, 'reset-cancel')).toBe(true);
  await shot(page, info_, '08-confirmation-effacement');
  await press(page, info_, 'reset-cancel');
  await press(page, info_, 'btn-close');
  await expect.poll(async () => (await active(page)).includes('Settings')).toBe(false);
  expect(errors).toEqual([]);
});

test('écran de jeu : barre d’icônes, Annuler le coup, confirmation, pause, reprise exacte', async ({ page }, info_) => {
  const errors = errorsOf(page);
  // niveaux 1 et 2 déjà terminés : le niveau 3 est débloqué
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const lv = { completed: true, stars: 3, bestMoves: 8, version: 2 };
    localStorage.setItem('mazeo.save.v2', JSON.stringify({ version: 3, levels: { 'chapter01-level01': lv, 'chapter01-level02': lv } }));
  });
  await open(page, 'level=3');
  await waitScene(page, 'Game');
  await waitIdle(page);
  // première partie : présentation des commandes
  await expect.poll(() => visible(page, 'help-close'), { timeout: 10_000 }).toBe(true);
  await shot(page, info_, '10-aide-commandes');
  await dismissHelp(page, info_);
  await page.waitForTimeout(300);
  await shot(page, info_, '11-jeu-sortie-fermee');
  expect((await state(page))!.exitCondition).toBe('Récupère le caneton');
  expect(await visible(page, 'exit-lock')).toBe(true);
  expect((await info(page, 'btn-undo'))!.enabled).toBe(false); // rien à annuler
  expect((await info(page, 'btn-restart'))!.enabled).toBe(false);
  const names = await a11yNames(page);
  for (const n of ['Annuler le coup', 'Recommencer le niveau', 'Mettre en pause', 'Quitter le niveau', 'Demander un indice']) expect(names).toContain(n);
  // un geste de deux cases = deux coups : « Annuler le coup » revient d'exactement un déplacement
  const s0 = (await state(page))!;
  const sol = await solution(page);
  await drag(page, info_, s0.pos, sol.slice(0, 2));
  await waitIdle(page);
  expect((await state(page))!.moves).toBe(2);
  await press(page, info_, 'btn-undo');
  await waitIdle(page);
  let s = (await state(page))!;
  expect(s.moves).toBe(1);
  expect(s.pos).toBe(sol[0]);
  expect(s.closed).toEqual([s0.pos]);
  // jusqu'au caneton : la sortie s'ouvre (cadenas retiré, condition remplie)
  await drag(page, info_, s.pos, sol.slice(1, 8));
  await waitIdle(page);
  await expect.poll(async () => (await state(page))!.collected).toBe(1);
  await expect.poll(async () => (await state(page))!.exitCondition).toBe(null);
  await expect.poll(() => visible(page, 'exit-lock')).toBe(false);
  await page.waitForTimeout(500);
  await shot(page, info_, '12-sortie-ouverte');
  // recommencer : confirmation compacte
  await press(page, info_, 'btn-restart');
  await expect.poll(() => visible(page, 'confirm-restart')).toBe(true);
  await shot(page, info_, '13-confirmation');
  await press(page, info_, 'confirm-cancel');
  expect((await state(page))!.moves).toBe(8);
  await press(page, info_, 'btn-restart');
  await press(page, info_, 'confirm-restart');
  await waitIdle(page);
  expect((await state(page))!.moves).toBe(0);
  expect(await visible(page, 'exit-lock')).toBe(true);
  // pause : le niveau est réellement suspendu ; aide consultable
  await press(page, info_, 'btn-pause');
  await waitScene(page, 'Pause');
  expect(await isPaused(page)).toBe(true);
  await shot(page, info_, '14-pause');
  await press(page, info_, 'pause-help');
  await expect.poll(() => visible(page, 'help-close')).toBe(true);
  expect(await isPaused(page)).toBe(false);
  await dismissHelp(page, info_);
  // quitter en cours de partie : le parcours est sauvegardé et « Reprendre » le restitue
  await drag(page, info_, (await state(page))!.pos, sol.slice(0, 3));
  await waitIdle(page);
  await press(page, info_, 'btn-quit');
  await waitScene(page, 'Journey');
  expect((await save(page)).run).toMatchObject({ key: 'chapter01-level03', path: sol.slice(0, 3) });
  await shot(page, info_, '15-aventure-partie-en-cours');
  await press(page, info_, 'nav-Home');
  await waitScene(page, 'Home');
  expect((await info(page, 'btn-play'))!.text).toBe('Reprendre le niveau');
  await shot(page, info_, '16-accueil-reprendre');
  await press(page, info_, 'btn-play');
  await waitScene(page, 'Game');
  await waitIdle(page);
  s = (await state(page))!;
  expect(s.moves).toBe(3);
  expect(s.pos).toBe(sol[2]);
  expect((await info(page, 'btn-undo'))!.enabled).toBe(true);
  expect(errors).toEqual([]);
});

test('chapitre 1 complet : six niveaux, résultats, fin de chapitre, accueil « Jardin terminé »', async ({ page }, info_) => {
  test.setTimeout(600_000);
  const errors = errorsOf(page);
  await open(page, 'today=2026-11-02');
  await waitScene(page, 'Home');
  await press(page, info_, 'btn-play');
  await waitScene(page, 'Game');
  for (let n = 1; n <= 6; n++) {
    await waitIdle(page);
    await dismissHelp(page, info_);
    expect((await state(page))!.key).toBe(`chapter01-level0${n}`);
    await solveCurrent(page, info_);
    expect((await state(page))!.won).toBe(true);
    if (n < 6) {
      await expect.poll(() => visible(page, 'btn-next'), { timeout: 20_000 }).toBe(true);
      await page.waitForTimeout(1200);
      await shot(page, info_, `2${n}-niveau${n}-reussi`);
      expect((await info(page, 'btn-next'))!.text).toBe('Niveau suivant');
      expect((await info(page, 'result-goal'))!.text).toBe('Parcours optimal !');
      expect(await visible(page, 'btn-restart')).toBe(false); // commandes masquées sous la feuille
      if (n === 2) {
        // reprise depuis l'accueil : « Continuer l’aventure » ouvre le prochain niveau non terminé
        await open(page, 'today=2026-11-02');
        await waitScene(page, 'Home');
        expect((await info(page, 'btn-play'))!.text).toBe('Continuer l’aventure');
        await press(page, info_, 'btn-play');
      } else await press(page, info_, 'btn-next');
      await expect.poll(async () => (await state(page))?.key, { timeout: 30_000 }).toBe(`chapter01-level0${n + 1}`);
    }
  }
  await waitScene(page, 'ChapterEnd');
  await page.waitForTimeout(2500);
  await shot(page, info_, '27-fin-chapitre');
  const sv = await save(page);
  for (let n = 1; n <= 6; n++) expect(sv.levels[`chapter01-level0${n}`]).toMatchObject({ completed: true, stars: 3, version: 2 });
  expect(sv.run).toBeNull();
  expect(sv.collection.owned).toEqual(expect.arrayContaining(['companion-duckling', 'deco-magic-flower', 'hat-gardener', 'badge-garden-keeper']));
  await press(page, info_, 'btn-home');
  await waitScene(page, 'Home');
  await page.waitForTimeout(800);
  await shot(page, info_, '28-accueil-jardin-termine');
  // tout est terminé : jamais « Continuer » vers un niveau déjà fini
  expect((await info(page, 'btn-play'))!.text).toBe('Rejouer un niveau');
  expect((await info(page, 'home-chapter'))!.text).toBe('Jardin terminé !');
  await press(page, info_, 'btn-play');
  await waitScene(page, 'Journey');
  // collection : « Nouveau » une seule fois, Équiper / Retirer explicites
  expect((await save(page)).collection.fresh.length).toBeGreaterThan(0);
  await press(page, info_, 'nav-Collection');
  await waitScene(page, 'Collection');
  await shot(page, info_, '29-collection');
  expect((await save(page)).collection.fresh).toEqual([]);
  expect((await info(page, 'state-hat-gardener'))!.text).toBe('Retirer');
  await press(page, info_, 'state-hat-gardener');
  await expect.poll(async () => (await save(page)).collection.equipped.hat).toBe(null);
  await expect.poll(async () => (await info(page, 'state-hat-gardener'))?.text).toBe('Équiper');
  await press(page, info_, 'state-hat-gardener');
  await expect.poll(async () => (await save(page)).collection.equipped.hat).toBe('hat-gardener');
  expect(errors).toEqual([]);
});

test('blocage exact, Annuler le coup prioritaire, indices progressifs', async ({ page }, info_) => {
  const errors = errorsOf(page);
  await open(page, 'level=1');
  await waitScene(page, 'Game');
  await waitIdle(page);
  await dismissHelp(page, info_);
  // l'impasse d'une case du niveau 1 : plus aucun coup légal
  await walk(page, info_, 'RRRDDR');
  await expect.poll(() => visible(page, 'stuck-undo'), { timeout: 15_000 }).toBe(true);
  expect((await info(page, 'stuck-reason'))!.text).toBe('Aucune case accessible autour de toi.');
  expect(await visible(page, 'btn-undo')).toBe(false); // pas de doublon sous le panneau
  await shot(page, info_, '30-bloque');
  await press(page, info_, 'stuck-undo');
  await waitIdle(page);
  let s = (await state(page))!;
  expect(s.moves).toBe(5);
  expect(await visible(page, 'btn-undo')).toBe(true);
  // niveau 3 : encore des coups, mais l'échec est prouvé par le solveur
  await open(page, 'level=3');
  await waitScene(page, 'Game');
  await waitIdle(page);
  await walk(page, info_, 'RRRR');
  await expect.poll(async () => (await state(page))!.blocked, { timeout: 15_000 }).not.toBe(null);
  expect((await info(page, 'stuck-reason'))!.text).toContain('plus aucun parcours');
  await shot(page, info_, '31-bloque-prouve');
  // indices : idée, puis prochaine case, puis trois déplacements
  await press(page, info_, 'stuck-restart');
  await waitIdle(page);
  await press(page, info_, 'btn-hint');
  await expect.poll(async () => (await info(page, 'hint-text'))?.text).toContain('deux entrées');
  await press(page, info_, 'hint-next');
  await expect.poll(() => visible(page, 'hint-cell-0')).toBe(true);
  expect(await visible(page, 'hint-cell-1')).toBe(false);
  await press(page, info_, 'hint-next');
  await expect.poll(() => visible(page, 'hint-cell-2')).toBe(true);
  await shot(page, info_, '32-indice');
  await press(page, info_, 'hint-close');
  s = (await state(page))!;
  expect(s.moves).toBe(0);
  expect(errors).toEqual([]);
});

test('défis : entraînement, mode défi sans annulation, records, partage, hebdomadaire', async ({ page }, info_) => {
  test.setTimeout(500_000);
  const errors = errorsOf(page);
  await open(page, 'scene=Challenges&today=2026-11-02');
  await waitScene(page, 'Challenges');
  expect((await info(page, 'daily-line-2'))!.text).toBe('Réussis ce défi pour découvrir le meilleur parcours');
  await press(page, info_, 'daily-practice');
  await waitScene(page, 'Game');
  await waitIdle(page);
  await dismissHelp(page, info_);
  expect((await state(page))!.ranked).toBe(false);
  expect(await visible(page, 'btn-hint')).toBe(false); // pas d'indice en défi
  const sol = await solution(page);
  await drag(page, info_, (await state(page))!.pos, sol.slice(0, 2));
  await waitIdle(page);
  await press(page, info_, 'btn-undo');
  await waitIdle(page);
  expect((await state(page))!.moves).toBe(1);
  await press(page, info_, 'btn-undo');
  await waitIdle(page);
  await solveCurrent(page, info_);
  await expect.poll(() => visible(page, 'btn-next'), { timeout: 20_000 }).toBe(true);
  await shot(page, info_, '40-defi-entrainement');
  expect((await info(page, 'btn-next'))!.text).toBe('Retour aux défis');
  await press(page, info_, 'btn-next');
  await waitScene(page, 'Challenges');
  await press(page, info_, 'daily-ranked');
  await waitScene(page, 'Game');
  await waitIdle(page);
  expect((await state(page))!.ranked).toBe(true);
  expect(await visible(page, 'btn-undo')).toBe(false);
  expect(await a11yNames(page)).not.toContain('Annuler le coup');
  await shot(page, info_, '41-mode-defi');
  await solveCurrent(page, info_);
  await expect.poll(() => visible(page, 'btn-next'), { timeout: 20_000 }).toBe(true);
  await shot(page, info_, '42-mode-defi-reussi');
  const sv = await save(page);
  const ranked = sv.challenges.results.find((r: { mode: string }) => r.mode === 'ranked');
  expect(ranked).toMatchObject({ contextId: 'daily-2026-11-02', validated: true, undos: 0, moves: sol.length });
  expect(ranked.path).toEqual(sol);
  await press(page, info_, 'btn-share'); // copie du lien en secours (aucune erreur)
  await page.waitForTimeout(400);
  await press(page, info_, 'btn-next');
  await waitScene(page, 'Challenges');
  await page.waitForTimeout(500);
  expect((await info(page, 'daily-status'))!.text).toBe(`Réussi · ${sol.length} déplacements`);
  await shot(page, info_, '43-defis-apres');
  expect(await visible(page, 'records-title')).toBe(true);
  await press(page, info_, 'share-link');
  await page.waitForTimeout(400);
  await shot(page, info_, '44-records-partage');
  let total = 0;
  for (let i = 0; i < 3; i++) {
    await press(page, info_, `weekly-${i}`);
    await waitScene(page, 'Game');
    await waitIdle(page);
    total += (await solution(page)).length;
    await solveCurrent(page, info_);
    await expect.poll(() => visible(page, 'btn-next'), { timeout: 20_000 }).toBe(true);
    await press(page, info_, 'btn-next');
    await waitScene(page, 'Challenges');
  }
  expect((await info(page, 'weekly-total'))!.text).toBe(`Score de la semaine : ${total} déplacements`);
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
  await expect.poll(() => visible(page, 'linked-practice')).toBe(true);
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

test('migrations : sauvegarde v1 et sauvegarde V4.1, progression conservée, anciens records mis de côté', async ({ page }, info_) => {
  const errors = errorsOf(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      localStorage.setItem('mazeo.save.v1', JSON.stringify({ unlocked: 3, stars: { 1: 3, 2: 2 }, completed: { 1: true, 2: true }, settings: { sound: false, ambience: true, reducedMotion: false } }));
    }
  });
  await open(page);
  await waitScene(page, 'Home');
  let sv = await save(page);
  expect(sv.version).toBe(3);
  expect(sv.levels['chapter01-level02']).toMatchObject({ completed: true, stars: 2, version: 2 });
  expect(sv.settings.sound).toBe(false);
  expect((await info(page, 'btn-play'))!.text).toBe('Continuer l’aventure');
  await press(page, info_, 'btn-play');
  await waitScene(page, 'Game');
  await waitIdle(page);
  expect((await state(page))!.key).toBe('chapter01-level03');
  // sauvegarde V4.1 (cartes v1) : record d'aventure mis de côté, défis et collection intacts
  await page.evaluate(() => {
    localStorage.setItem('mazeo.save.v2', JSON.stringify({
      version: 2, currentLevel: 'chapter01-level04',
      levels: { 'chapter01-level01': { completed: true, stars: 3, bestMoves: 6 }, 'chapter01-level03': { completed: true, stars: 2, bestMoves: 11 } },
      chapters: {}, collection: { owned: ['companion-duckling'], fresh: [], equipped: { hat: null, scarf: null, companion: 'companion-duckling', decor: [] } },
      challenges: { records: { 'puzzle-f01@1': { puzzleId: 'puzzle-f01', version: 1, bestMoves: 8, bestRankedMoves: 8, attempts: 2 } }, dailies: {}, results: [] },
      introSeen: ['tip-controls'], settings: { sound: true, ambience: true, reducedMotion: true, levelIntro: true },
    }));
  });
  await open(page);
  await waitScene(page, 'Home');
  sv = await save(page);
  expect(sv.levels['chapter01-level03']).toMatchObject({ completed: true, stars: 2, bestMoves: null, version: 2, legacy: [{ version: 1, bestMoves: 11, stars: 2 }] });
  expect(sv.challenges.records['puzzle-f01@1'].bestMoves).toBe(8);
  expect(sv.collection.equipped.companion).toBe('companion-duckling');
  expect(sv.settings.reducedMotion).toBe(true);
  expect(errors).toEqual([]);
  void tapCell;
});
