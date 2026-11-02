import Phaser from 'phaser';
import { drawThumb } from '../art/board';
import { C, hex } from '../art/palette';
import { dailyFor, findPuzzle, formatDuration, msUntilNextDaily, today, weeklyFor } from '../content/challenges/calendar';
import { parseLevel } from '../core/grid';
import type { LevelDef } from '../core/types';
import { optimalMoves } from '../progress';
import { Save } from '../save';
import { challengeCode, challengeLink, parseChallengeCode } from '../social/share';
import { backdrop, button, centerCamera, fadeIn, goTo, toast, txt, W } from '../ui/ui';

const DIFF_COLOR: Record<string, string> = { Facile: C.meadow, Intermédiaire: C.orange, Expert: '#b4637a' };

/** Mode Défis : défi du jour, défi hebdomadaire, historique. Même moteur que l'aventure. */
export class ChallengesScene extends Phaser.Scene {
  private linked: string | null = null;
  constructor() {
    super('Challenges');
  }

  init(data: { linked?: string }) {
    this.linked = data.linked ?? null;
  }

  create() {
    this.input.enabled = true;
    centerCamera(this);
    fadeIn(this);
    backdrop(this, { clouds: false });
    const now = today();
    const daily = dailyFor(now);
    Save.noteDaily(daily.contextId, daily.puzzle.key, daily.puzzle.version);

    button(this, 96, 96, 'btn-small', { icon: 'icon-back', iconScale: 0.9 }, () => goTo(this, 'Home'), 'btn-back').setScale(0.95);
    txt(this, W / 2 + 30, 104, 'Défis', 66, { weight: 700 });
    txt(this, W / 2, 182, 'Un labyrinthe par jour, le même pour tous les joueurs', 32, { color: C.inkSoft, weight: 500 });

    this.dailyCard(daily.puzzle, daily.contextId, now);
    this.weeklyCard(now);
    this.historyCard(daily.contextId);
    txt(this, W / 2, 1862, 'Classé : sans annulation, score = nombre de cases (égalité = même rang).\nEntraînement : annulations permises, non classé.', 26, { color: C.inkSoft, weight: 400 });

    if (this.linked) this.linkedPanel(this.linked);
  }

  private panel(top: number, h: number) {
    const g = this.add.graphics();
    g.fillStyle(0x2c4a30, 0.12);
    g.fillRoundedRect(60, top + 8, W - 120, h, 44);
    g.fillStyle(0xfffbf0, 0.96);
    g.fillRoundedRect(60, top, W - 120, h, 44);
    g.lineStyle(3, hex(C.creamDark), 1);
    g.strokeRoundedRect(60, top, W - 120, h, 44);
  }

  private chip(x: number, y: number, label: string) {
    const g = this.add.graphics();
    const w = label.length * 17 + 40;
    g.fillStyle(hex(DIFF_COLOR[label] ?? C.sage), 1);
    g.fillRoundedRect(x - w / 2, y - 24, w, 48, 24);
    txt(this, x, y, label, 28, { color: '#ffffff', weight: 700 });
  }

  private thumb(def: LevelDef, w: number, h: number) {
    const k = `cthumb-${def.key}-${w}`;
    if (!this.textures.exists(k)) this.textures.addCanvas(k, drawThumb(parseLevel(def), def.theme, w, h));
    return k;
  }

  private dailyCard(p: LevelDef, contextId: string, now: Date) {
    const top = 240, h = 650;
    this.panel(top, h);
    const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    txt(this, 110, top + 60, 'Défi du jour', 44, { weight: 700, align: 'left' }).setOrigin(0, 0.5);
    txt(this, 110, top + 110, date.charAt(0).toUpperCase() + date.slice(1), 30, { color: C.inkSoft, weight: 500, align: 'left' }).setOrigin(0, 0.5);
    this.chip(W - 220, top + 62, p.difficulty);
    this.add.image(270, top + 300, this.thumb(p, 300, 260));
    const rec = Save.record(p.key, p.version);
    const x = 460;
    txt(this, x, top + 190, p.name, 40, { weight: 700, align: 'left' }).setOrigin(0, 0.5);
    const lines = [
      rec?.bestMoves ? `Meilleur : ${rec.bestMoves} cases` : 'Pas encore réussi',
      rec?.bestRankedMoves ? `Meilleur classé : ${rec.bestRankedMoves} cases` : 'Aucune tentative classée réussie',
      // l'optimal du solveur n'est révélé qu'après une première réussite
      rec?.bestMoves ? `Optimal connu : ${optimalMoves(p)} cases` : 'Optimal : révélé après une réussite',
    ];
    lines.forEach((l, i) => txt(this, x, top + 252 + i * 50, l, 31, { weight: i === 0 ? 600 : 500, color: i === 0 ? C.ink : C.inkSoft, align: 'left' }).setOrigin(0, 0.5).setName(`daily-line-${i}`));
    const label = 'Défi du jour';
    button(this, 320, top + 500, 'pill-sm-cream', { label: 'Entraînement', size: 36 }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId, ranked: false, label }), 'daily-practice');
    button(this, 760, top + 500, 'pill-sm-orange', { label: 'Tentative classée', size: 32 }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId, ranked: true, label }), 'daily-ranked');
    const cd = txt(this, 110, top + 600, '', 30, { color: C.inkSoft, weight: 600, align: 'left' }).setOrigin(0, 0.5);
    const tick = () => cd.setText(`Prochain défi dans ${formatDuration(msUntilNextDaily(today()))}`);
    tick();
    this.time.addEvent({ delay: 30_000, loop: true, callback: tick });
    button(this, W - 250, top + 600, 'pill-sm-cream', { label: 'Défier un ami', icon: 'icon-share', iconScale: 0.55, size: 30, iconX: -110 }, () => this.copyLink(p), 'daily-share').setScale(0.8);
  }

  private weeklyCard(now: Date) {
    const wk = weeklyFor(now);
    const top = 920, h = 570;
    this.panel(top, h);
    const n = wk.contextId.split('-W')[1];
    txt(this, 110, top + 58, `Défi de la semaine · S${n}`, 40, { weight: 700, align: 'left' }).setOrigin(0, 0.5);
    txt(this, W - 110, top + 58, `Fin dans ${formatDuration(wk.endsAt.getTime() - today().getTime())}`, 28, { color: C.inkSoft, weight: 500, align: 'right' }).setOrigin(1, 0.5);
    let total = 0;
    let doneCount = 0;
    wk.puzzles.forEach((p, i) => {
      const y = top + 160 + i * 112;
      const rec = Save.record(p.key, p.version);
      const best = rec?.bestRankedMoves ?? null;
      if (best !== null) { total += best; doneCount++; }
      this.add.image(150, y, this.thumb(p, 110, 92));
      txt(this, 230, y - 18, p.name, 32, { weight: 700, align: 'left' }).setOrigin(0, 0.5);
      txt(this, 230, y + 22, `${p.difficulty} · ${best !== null ? `${best} cases` : 'à jouer'}`, 28, { color: C.inkSoft, weight: 500, align: 'left' }).setOrigin(0, 0.5);
      button(this, W - 190, y, 'pill-sm-orange', { label: best !== null ? 'Améliorer' : 'Jouer', size: 34 }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: wk.contextId, ranked: true, label: `Semaine · ${i + 1}/3` }), `weekly-${i}`).setScale(0.7);
    });
    const msg = doneCount === 3 ? `Score de la semaine : ${total} cases` : `Score de la semaine : termine les 3 labyrinthes (${doneCount}/3)`;
    txt(this, W / 2, top + 500, msg, 32, { weight: 700, color: doneCount === 3 ? C.orangeDeep : C.ink }).setName('weekly-total');
  }

  private historyCard(todayId: string) {
    const top = 1520, h = 290;
    this.panel(top, h);
    txt(this, 110, top + 50, 'Défis précédents', 36, { weight: 700, align: 'left' }).setOrigin(0, 0.5);
    const past = Object.entries(Save.get().challenges.dailies).filter(([k]) => k !== todayId).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 3);
    if (!past.length) {
      txt(this, W / 2, top + 160, 'Les défis du jour que tu découvres apparaîtront ici.', 30, { color: C.inkSoft, weight: 500 });
      return;
    }
    past.forEach(([ctx, info], i) => {
      const p = findPuzzle(info.puzzleId);
      if (!p || p.version !== info.version) return;
      const y = top + 120 + i * 62;
      const rec = Save.record(p.key, p.version);
      const day = ctx.replace('daily-', '');
      txt(this, 110, y, `${day.slice(8)}/${day.slice(5, 7)} · ${p.name}`, 30, { weight: 600, align: 'left' }).setOrigin(0, 0.5);
      txt(this, W - 330, y, rec?.bestMoves ? `${rec.bestMoves} cases` : '—', 30, { color: C.inkSoft, weight: 500, align: 'right' }).setOrigin(1, 0.5);
      button(this, W - 190, y, 'pill-sm-cream', { label: 'Rejouer', size: 34 }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: ctx, ranked: false, label: 'Défi précédent' }), `history-${i}`).setScale(0.55);
    });
  }

  private copyLink(p: LevelDef) {
    const link = challengeLink(p.key, p.version);
    const ok = () => toast(this, 'Lien copié : ton ami jouera exactement le même labyrinthe', 1780, 2600);
    const fail = () => toast(this, `Code du défi : ${challengeCode(p.key, p.version)}`, 1780, 5000);
    try {
      navigator.clipboard.writeText(link).then(ok, fail);
    } catch {
      fail();
    }
  }

  /** Défi reçu par lien (?defi=puzzle@version). */
  private linkedPanel(code: string) {
    const parsed = parseChallengeCode(code);
    if (!parsed || !parsed.ok) {
      toast(this, parsed && !parsed.ok ? parsed.reason : 'Lien de défi invalide', 1780, 4000);
      return;
    }
    const p = findPuzzle(parsed.puzzleId)!;
    const c = this.add.container(0, 0).setDepth(5000);
    c.add(this.add.rectangle(W / 2, 960, W, 3000, 0x2c4a30, 0.4).setInteractive());
    const g = this.add.graphics();
    g.fillStyle(0xfffbf0, 0.98);
    g.fillRoundedRect(110, 560, W - 220, 760, 50);
    g.lineStyle(5, hex(C.orange));
    g.strokeRoundedRect(110, 560, W - 220, 760, 50);
    c.add(g);
    c.add(txt(this, W / 2, 640, 'Défi reçu', 56, { weight: 700 }));
    c.add(txt(this, W / 2, 710, `${p.name} · ${p.difficulty}`, 34, { color: C.inkSoft, weight: 600 }));
    c.add(this.add.image(W / 2, 920, this.thumb(p, 300, 260)));
    const ctx = `link-${p.key}@${p.version}`;
    c.add(button(this, W / 2 - 200, 1170, 'pill-sm-cream', { label: 'Entraînement', size: 36 }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: ctx, ranked: false, label: 'Défi reçu' }), 'linked-practice'));
    c.add(button(this, W / 2 + 200, 1170, 'pill-sm-orange', { label: 'Classée', size: 36 }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: ctx, ranked: true, label: 'Défi reçu' }), 'linked-ranked'));
    c.add(button(this, W / 2, 1270, 'pill-sm-cream', { label: 'Plus tard', size: 32 }, () => c.destroy(), 'linked-close').setScale(0.75));
  }
}
