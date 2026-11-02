import Phaser from 'phaser';
import { drawThumb } from '../art/board';
import { dailyFor, findPuzzle, formatDuration, msUntilNextDaily, today, weeklyFor } from '../content/challenges/calendar';
import { parseLevel } from '../core/grid';
import type { LevelDef } from '../core/types';
import { optimalMoves } from '../progress';
import { Save } from '../save';
import { challengeCode, challengeLink, parseChallengeCode } from '../social/share';
import { cardBg, chip, fixToScreen, label, uiButton } from '../ui/components';
import { finishScreen, setupScreen } from '../ui/screen';
import { color, font, space, touch } from '../ui/theme';
import { goTo, H, toast, W } from '../ui/ui';

const DIFF_TONE: Record<string, string> = { Facile: color.success, Intermédiaire: color.primary, Expert: '#b4637a' };

/** Mode Défis : le défi du jour est l'élément principal ; hebdomadaire et historique ensuite. */
export class ChallengesScene extends Phaser.Scene {
  private linked: string | null = null;
  private historyOpen = false;
  constructor() {
    super('Challenges');
  }

  init(data: { linked?: string; historyOpen?: boolean }) {
    this.linked = data.linked ?? null;
    this.historyOpen = !!data.historyOpen;
  }

  create() {
    const now = today();
    const daily = dailyFor(now);
    Save.noteDaily(daily.contextId, daily.puzzle.key, daily.puzzle.version);
    let y = setupScreen(this, { title: 'Défis', back: 'Home', nav: 'Challenges' });
    y = this.dailyCard(daily.puzzle, daily.contextId, now, y);
    y = this.weeklyCard(now, y + space.section);
    y = this.historySection(daily.contextId, y + space.section);
    finishScreen(this, y);
    if (this.linked) this.linkedPanel(this.linked);
  }

  private thumb(def: LevelDef, w: number, h: number) {
    const k = `cthumb-${def.key}-${w}`;
    if (!this.textures.exists(k)) this.textures.addCanvas(k, drawThumb(parseLevel(def), def.theme, w, h));
    return k;
  }

  private dailyCard(p: LevelDef, contextId: string, now: Date, top: number) {
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 12;
    const rec = Save.record(p.key, p.version);
    const done = !!rec?.bestMoves;
    const h = 1120;
    cardBg(this, x, top, w, h, { border: color.primary, borderW: 5 });
    const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    label(this, x + pad, top + 66, 'Défi du jour', font.heading + 4, { weight: 700, align: 'left' });
    label(this, x + pad, top + 124, date.charAt(0).toUpperCase() + date.slice(1), font.caption, { color: color.inkSoft, weight: 500, align: 'left' });
    chip(this, x + w - pad, top + 70, p.difficulty, DIFF_TONE[p.difficulty] ?? color.accent, { align: 'right' });
    // aperçu + état
    this.add.image(x + pad + 160, top + 350, this.thumb(p, 320, 300));
    const tx = x + pad + 360;
    label(this, tx, top + 230, p.name, font.heading, { weight: 700, align: 'left', wrap: w - pad - 380 });
    chip(this, tx, top + 312, done ? `Réussi · ${rec!.bestMoves} cases` : 'À faire', done ? 'success' : 'neutral', { align: 'left' });
    label(this, tx, top + 392, rec?.bestRankedMoves ? `Meilleur classé : ${rec.bestRankedMoves}` : 'Pas encore de score classé', font.caption + 2, { color: color.inkSoft, weight: 500, align: 'left', wrap: x + w - pad - tx }).setName('daily-line-1');
    // l'optimal du solveur n'est révélé qu'après une première réussite
    label(this, tx, top + 460, done ? `Optimal connu : ${optimalMoves(p)} cases` : 'Optimal révélé après une réussite', font.caption + 2, { color: color.inkSoft, weight: 500, align: 'left', wrap: x + w - pad - tx }).setName('daily-line-2');
    // actions : classé (principal) puis entraînement (secondaire), avec leur différence
    const bw = w - pad * 2;
    const label_ = 'Défi du jour';
    let by = top + 600;
    uiButton(this, W / 2, by, 'primary', { label: 'TENTATIVE CLASSÉE', width: bw, name: 'daily-ranked' }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId, ranked: true, label: label_ }));
    label(this, W / 2, by + touch.primaryH / 2 + 40, 'Mêmes règles pour tous · sans annulation', font.caption, { color: color.inkSoft, weight: 500, wrap: bw });
    by += touch.primaryH + 130;
    uiButton(this, W / 2, by, 'secondary', { label: 'Entraînement', width: bw, name: 'daily-practice' }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId, ranked: false, label: label_ }));
    label(this, W / 2, by + touch.secondaryH / 2 + 40, 'Annulation permise · non classé', font.caption, { color: color.inkSoft, weight: 500, wrap: bw });
    // rotation + partage
    const cd = label(this, x + pad, top + h - 56, '', font.caption + 2, { color: color.inkSoft, weight: 600, align: 'left' });
    const tick = () => cd.setText(`Prochain défi dans ${formatDuration(msUntilNextDaily(today()))}`);
    tick();
    this.time.addEvent({ delay: 30_000, loop: true, callback: tick });
    uiButton(this, x + w - pad - touch.iconVisual / 2, top + h - 60, 'icon', { icon: 'icon-share', name: 'daily-share' }, () => this.copyLink(p));
    return top + h;
  }

  private weeklyCard(now: Date, top: number) {
    const wk = weeklyFor(now);
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 12;
    const rowH = 210;
    const h = 170 + rowH * 3 + 110;
    cardBg(this, x, top, w, h);
    const n = wk.contextId.split('-W')[1];
    label(this, x + pad, top + 66, `Défi de la semaine · S${n}`, font.heading, { weight: 700, align: 'left' });
    label(this, x + pad, top + 122, `3 labyrinthes classés · fin dans ${formatDuration(wk.endsAt.getTime() - today().getTime())}`, font.caption, { color: color.inkSoft, weight: 500, align: 'left' });
    let total = 0, doneCount = 0;
    wk.puzzles.forEach((p, i) => {
      const y = top + 170 + i * rowH + rowH / 2;
      const rec = Save.record(p.key, p.version);
      const best = rec?.bestRankedMoves ?? null;
      if (best !== null) { total += best; doneCount++; }
      this.add.image(x + pad + 70, y, this.thumb(p, 140, 140));
      label(this, x + pad + 170, y - 30, p.name, font.body, { weight: 700, align: 'left', wrap: w - pad * 2 - 170 - 300 });
      chip(this, x + pad + 170, y + 32, best !== null ? `✓ ${best} cases` : p.difficulty, best !== null ? 'success' : 'neutral', { align: 'left' });
      uiButton(this, x + w - pad - 130, y, 'secondary', { label: best !== null ? 'Améliorer' : 'Jouer', width: 260, name: `weekly-${i}` },
        () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: wk.contextId, ranked: true, label: `Semaine ${i + 1}/3` }));
    });
    const msg = doneCount === 3 ? `Score de la semaine : ${total} cases` : `Termine les 3 labyrinthes pour obtenir ton score (${doneCount}/3)`;
    label(this, W / 2, top + h - 60, msg, font.label, { weight: 700, color: doneCount === 3 ? color.primaryDeep : color.ink, wrap: w - pad * 2 }).setName('weekly-total');
    return top + h;
  }

  /** Historique compact, repliable ; absent tant qu'il est vide. */
  private historySection(todayId: string, top: number) {
    const past = Object.entries(Save.get().challenges.dailies).filter(([k]) => k !== todayId).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 7);
    if (!past.length) return top - space.section;
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 12;
    const rowH = 140;
    const h = 130 + (this.historyOpen ? past.length * rowH : 0);
    cardBg(this, x, top, w, h, { alpha: 0.85 });
    label(this, x + pad, top + 65, `Défis précédents (${past.length})`, font.body, { weight: 700, align: 'left' });
    label(this, x + w - pad, top + 65, this.historyOpen ? 'Masquer ▴' : 'Afficher ▾', font.label, { weight: 700, align: 'right', color: color.accent });
    const hit = this.add.rectangle(x + w / 2, top + 65, w, 130, 0, 0).setInteractive({ useHandCursor: true });
    hit.name = 'history-toggle';
    hit.on('pointerup', () => this.scene.restart({ historyOpen: !this.historyOpen }));
    if (this.historyOpen) {
      past.forEach(([ctx, info], i) => {
        const p = findPuzzle(info.puzzleId);
        if (!p || p.version !== info.version) return;
        const y = top + 130 + i * rowH + rowH / 2;
        const rec = Save.record(p.key, p.version);
        const day = ctx.replace('daily-', '');
        label(this, x + pad, y - 22, `${day.slice(8)}/${day.slice(5, 7)} · ${p.name}`, font.label, { weight: 600, align: 'left' });
        label(this, x + pad, y + 26, rec?.bestMoves ? `Meilleur : ${rec.bestMoves} cases` : 'Non réussi', font.caption, { color: color.inkSoft, weight: 500, align: 'left' });
        uiButton(this, x + w - pad - 140, y, 'secondary', { label: 'Rejouer', width: 280, name: `history-${i}` }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: ctx, ranked: false, label: 'Défi précédent' }));
      });
    }
    return top + h;
  }

  private copyLink(p: LevelDef) {
    const link = challengeLink(p.key, p.version);
    const y = this.cameras.main.scrollY + H / 2;
    const ok = () => toast(this, 'Lien copié : ton ami jouera exactement le même labyrinthe', y, 2600);
    const fail = () => toast(this, `Code du défi : ${challengeCode(p.key, p.version)}`, y, 5000);
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
      toast(this, parsed && !parsed.ok ? parsed.reason : 'Lien de défi invalide', H / 2, 4000);
      return;
    }
    const p = findPuzzle(parsed.puzzleId)!;
    const c = this.add.container(0, 0).setDepth(50000).setScrollFactor(0);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, color.scrim, 0.42).setInteractive());
    const w = W - space.margin * 2, h = 1150, top = (H - h) / 2;
    c.add(cardBg(this, space.margin, top, w, h, { border: color.primary, borderW: 5 }));
    c.add(label(this, W / 2, top + 80, 'Défi reçu', font.title + 4, { weight: 700 }));
    c.add(label(this, W / 2, top + 150, `${p.name} · ${p.difficulty}`, font.body, { color: color.inkSoft, weight: 600 }));
    c.add(this.add.image(W / 2, top + 380, this.thumb(p, 320, 300)));
    const ctx = `link-${p.key}@${p.version}`;
    const bw = w - 2 * (space.pad + 12);
    c.add(uiButton(this, W / 2, top + 620, 'primary', { label: 'TENTATIVE CLASSÉE', width: bw, name: 'linked-ranked' }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: ctx, ranked: true, label: 'Défi reçu' })));
    c.add(uiButton(this, W / 2, top + 620 + touch.primaryH + space.section, 'secondary', { label: 'Entraînement', width: bw, name: 'linked-practice' }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: ctx, ranked: false, label: 'Défi reçu' })));
    c.add(uiButton(this, W / 2, top + h - space.pad - touch.secondaryH / 2 - 20, 'secondary', { label: 'Plus tard', width: 360, name: 'linked-close', small: true }, () => c.destroy()));
    fixToScreen(c);
  }
}
