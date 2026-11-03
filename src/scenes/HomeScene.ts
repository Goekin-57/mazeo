import Phaser from 'phaser';
import { C } from '../art/palette';
import { levelPreview } from '../art/preview';
import { unlockAudio } from '../audio/sfx';
import { dailyFor, today } from '../content/challenges/calendar';
import { CHAPTERS, findLevel } from '../content/chapters';
import { homeAction, type HomeAction } from '../progress';
import { Save } from '../save';
import { a11yButton } from '../ui/a11y';
import { cardBg, chip, label, navBar, uiButton } from '../ui/components';
import { NAV_H, navDots, navY } from '../ui/screen';
import { color, font, hexOf, space, touch } from '../ui/theme';
import { backdrop, fadeIn, goTo, reduced, txt, W } from '../ui/ui';

const DIFF_TONE: Record<string, string> = { Facile: color.success, Intermédiaire: color.primary, Expert: '#b4637a' };

/**
 * Accueil (v0.5) : logo et réglages ; aperçu réel du niveau annoncé ; chapitre, niveau et
 * progression ; UN bouton principal dont l'action dépend de la progression ; carte « Défi du jour » ;
 * navigation stable Accueil · Aventure · Défis · Collection.
 */
export class HomeScene extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create() {
    this.input.enabled = true;
    this.cameras.main.setScroll(0, 0);
    fadeIn(this);
    backdrop(this);
    const H = this.scale.height;

    // --- logo, réglages, signature ---
    const letters = 'MAZEO'.split('');
    const spacing = 104;
    const x0 = W / 2 - ((letters.length - 1) * spacing) / 2;
    const colors = [C.orange, '#6db45c', C.turquoiseDeep, '#e5a93a', C.orange];
    const logoY = space.margin + 96;
    letters.forEach((l, i) => {
      const t = txt(this, x0 + i * spacing, logoY, l, 128, { weight: 700, color: colors[i], stroke: '#ffffff', strokeW: 16 });
      t.setShadow(0, 6, 'rgba(60,90,50,0.25)', 0, true, true);
      t.setName(i === 0 ? 'logo' : '');
    });
    label(this, W / 2, logoY + 100, 'Chaque pas compte.', font.body + 1, { color: color.inkSoft, weight: 700 }).setName('tagline');
    uiButton(this, W - space.margin - touch.icon / 2, space.margin + touch.icon / 2, 'icon', { icon: 'ic-gear', name: 'btn-settings', aria: 'Réglages', tooltip: 'Réglages' }, () => {
      this.scene.launch('Settings', { from: 'Home' });
      this.scene.pause();
    });

    // --- bas, positions fixes : navigation, défi du jour, bouton principal, progression ---
    const ny = navY();
    navBar(this, ny, 'Home', (k) => goTo(this, k), navDots());
    const dailyH = 168;
    const dailyTop = ny - NAV_H / 2 - space.section - dailyH;
    this.dailyCard(dailyTop, dailyH);
    const action = homeAction();
    const playY = dailyTop - space.section - touch.primaryH / 2;
    const play = () => this.run(action);
    uiButton(this, W / 2, playY, 'primary', { label: action.label, icon: 'ic-play', width: W - space.margin * 2 - 80, name: 'btn-play' }, play);
    const infoBottom = playY - touch.primaryH / 2 - space.gap;
    const infoTop = this.progressBlock(action, infoBottom);

    // --- aperçu du niveau annoncé (toucher = même action que le bouton principal) ---
    const top = logoY + 160;
    const boxH = infoTop - space.gap - top;
    const f = findLevel(action.key)!;
    const run = Save.run();
    const pv = levelPreview(this, f.level, { x: space.margin, y: top, w: W - space.margin * 2, h: boxH }, {
      path: action.kind === 'resume' && run ? run.path : undefined,
      atExit: action.allDone,
    });
    pv.root.setName('home-preview');
    const hit = this.add.rectangle(pv.x + pv.w / 2, pv.y + pv.h / 2, pv.w, pv.h, 0, 0).setInteractive({ useHandCursor: true });
    hit.name = 'home-preview-hit';
    hit.on('pointerup', (p: Phaser.Input.Pointer) => { if (p.getDistance() < 30) play(); });
    a11yButton(this, hit, `Aperçu : ${f.level.name}. ${action.label}`, play);
    if (!reduced()) this.tweens.add({ targets: pv.pip, y: pv.pip.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    void H;
    this.input.once('pointerdown', () => unlockAudio());
  }

  private run(a: HomeAction) {
    if (a.kind === 'replay') return goTo(this, 'Journey');
    goTo(this, 'Game', { kind: 'adventure', key: a.key, resume: a.kind === 'resume' });
  }

  /** Chapitre, niveau annoncé et progression compacte (données réelles). Retourne le haut du bloc. */
  private progressBlock(a: HomeAction, bottom: number) {
    const f = findLevel(a.key)!;
    const ch = f.chapter;
    const done = ch.levels.filter((l) => Save.level(l.key)?.completed).length;
    const stars = ch.levels.reduce((n, l) => n + (Save.level(l.key)?.stars ?? 0), 0);
    const barW = 560, barY = bottom - 30;
    const g = this.add.graphics();
    g.fillStyle(hexOf(color.surfaceAlt), 1);
    g.fillRoundedRect(W / 2 - barW / 2 - 180, barY - 12, barW, 24, 12);
    g.fillStyle(hexOf(color.success), 1);
    if (done) g.fillRoundedRect(W / 2 - barW / 2 - 180, barY - 12, Math.max(24, (barW * done) / ch.levels.length), 24, 12);
    g.setName('home-progress-bar');
    label(this, W / 2 + barW / 2 - 160, barY, `${done}/${ch.levels.length} niveaux · ${stars} ★`, font.label, { weight: 700, align: 'left' }).setName('home-progress');
    // empilement vers le haut selon la hauteur réelle des textes (pas de chevauchement)
    let y = barY - 36;
    const up = (t: Phaser.GameObjects.Text) => { t.setOrigin(0.5, 1).setY(y); y = y - t.height - 12; return t; };
    if (a.allDone) {
      const next = CHAPTERS.find((c) => !c.available);
      up(label(this, W / 2, 0, next ? `Prochain chapitre : ${next.name} · à venir` : 'Tout le contenu disponible est terminé', font.caption + 1, { color: color.inkSoft, weight: 700, wrap: W - space.margin * 2 })).setName('home-level');
      up(label(this, W / 2, 0, 'Jardin terminé !', font.heading + 6, { weight: 700, color: color.primaryDeep })).setName('home-chapter');
      return y - 10;
    }
    if (a.kind === 'resume') {
      const n = Save.run()?.path.length ?? 0;
      up(label(this, W / 2, 0, `Partie en cours : ${n} déplacement${n > 1 ? 's' : ''}`, font.caption + 1, { color: color.primaryDeep, weight: 800 })).setName('home-run');
    }
    up(label(this, W / 2, 0, `Niveau ${f.level.id} · ${f.level.name}`, font.body + 2, { weight: 700, wrap: W - space.margin * 2 })).setName('home-level');
    up(label(this, W / 2, 0, `Chapitre ${ch.number} · ${ch.name}`, font.caption + 1, { color: color.inkSoft, weight: 700, wrap: W - space.margin * 2 })).setName('home-chapter');
    return y - 10;
  }

  /** Petite carte « Défi du jour » : difficulté, statut réel, bouton « Jouer ». */
  private dailyCard(top: number, h: number) {
    const d = dailyFor(today());
    const p = d.puzzle;
    const rec = Save.record(p.key, p.version);
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 8;
    cardBg(this, x, top, w, h);
    this.add.image(x + pad + 40, top + h / 2, 'ic-flag').setScale(0.6).setTint(hexOf(color.accent));
    label(this, x + pad + 96, top + 50, 'Défi du jour', font.body + 2, { weight: 700, align: 'left' });
    const status = rec?.bestMoves ? `Réussi · ${rec.bestMoves} dépl.` : rec?.attempts ? 'Tenté' : 'À faire';
    const c1 = chip(this, x + pad + 96, top + 112, p.difficulty, DIFF_TONE[p.difficulty] ?? color.accent, { align: 'left' });
    chip(this, x + pad + 96 + c1.width + 14, top + 112, status, rec?.bestMoves ? 'success' : 'neutral', { align: 'left' }).setName('home-daily-status');
    uiButton(this, x + w - pad - 130, top + h / 2, 'secondary', { label: 'Jouer', width: 260, name: 'home-daily' }, () => goTo(this, 'Challenges'));
  }
}
