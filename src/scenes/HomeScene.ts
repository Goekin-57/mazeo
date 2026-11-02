import Phaser from 'phaser';
import { boardLayout, drawBoard } from '../art/board';
import { C } from '../art/palette';
import { BD, BT, HEDGE_BASE, HEDGE_H } from '../art/textures';
import { unlockAudio } from '../audio/sfx';
import { dailyFor, today } from '../content/challenges/calendar';
import { parseLevel } from '../core/grid';
import { Cell } from '../core/types';
import { continueTarget, homeStage } from '../progress';
import { Save } from '../save';
import { label, navBar, uiButton } from '../ui/components';
import { NAV_H, navDots, navY } from '../ui/screen';
import { color, font, space, touch } from '../ui/theme';
import { backdrop, drift, fadeIn, goTo, reduced, txt, W } from '../ui/ui';
import { Player } from './Player';

/**
 * Accueil : logo, diorama vivant qui évolue avec la progression, UN bouton principal,
 * indication compacte de la progression, navigation basse. Les commandes ne bougent pas.
 */
export class HomeScene extends Phaser.Scene {
  private events_: (() => void)[] = [];
  private pip?: Player;
  constructor() {
    super('Home');
  }

  create() {
    this.input.enabled = true;
    this.cameras.main.setScroll(0, 0);
    this.events_ = [];
    fadeIn(this);
    backdrop(this);
    drift(this, 4);
    // --- haut : logo, sous-titre, paramètres dans un coin ---
    const letters = 'MAZEO'.split('');
    const spacing = 116;
    const x0 = W / 2 - ((letters.length - 1) * spacing) / 2;
    const colors = [C.orange, '#7cc06a', C.turquoiseDeep, '#f2b84b', C.orange];
    const logoY = space.margin + 170;
    letters.forEach((l, i) => {
      const t = txt(this, x0 + i * spacing, logoY, l, 148, { weight: 700, color: colors[i], stroke: '#ffffff', strokeW: 18 });
      t.setShadow(0, 8, 'rgba(60,90,50,0.28)', 0, true, true);
      if (!reduced()) this.tweens.add({ targets: t, y: logoY - 10, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 160 });
    });
    label(this, W / 2, logoY + 112, 'Le Grand Sentier', font.body, { color: color.inkSoft, weight: 500 });
    uiButton(this, W - space.margin - touch.icon / 2, space.margin + touch.icon / 2 + 10, 'icon', { icon: 'icon-gear', name: 'btn-settings' }, () => {
      this.scene.launch('Settings', { from: 'Home' });
      this.scene.pause();
    });

    // --- bas (positions fixes) : navigation, progression, bouton principal ---
    const ny = navY();
    navBar(this, ny, null, (k) => goTo(this, k), navDots());
    const progressY = ny - NAV_H / 2 - space.section - 30;
    const playY = progressY - 30 - touch.primaryH / 2 - space.gap - 14;
    this.buildPrimary(playY, progressY);

    // --- centre : diorama, centré dans l'espace restant ---
    const top = logoY + 170;
    const bottom = playY - touch.primaryH / 2 - space.section;
    this.buildDiorama(top, bottom);
    this.input.once('pointerdown', () => unlockAudio());
    this.scheduleAmbient();
  }

  private buildPrimary(y: number, progressY: number) {
    const t = continueTarget();
    const daily = dailyFor(today());
    const dailyDone = !!Save.record(daily.puzzle.key, daily.puzzle.version)?.bestMoves;
    let text: string, act: () => void, sub: string;
    if (!t.allDone) {
      text = t.isNew ? 'JOUER' : 'CONTINUER';
      act = () => goTo(this, 'Game', { kind: 'adventure', key: t.key });
      sub = t.label;
    } else if (!dailyDone) {
      // chapitre terminé, rien de nouveau en aventure : on propose le défi du jour
      text = 'DÉFI DU JOUR';
      act = () => goTo(this, 'Challenges');
      sub = `${t.label}`;
    } else {
      text = 'REJOUER LE CHAPITRE';
      act = () => goTo(this, 'Chapter', { chapterId: t.chapterId });
      sub = `${t.label} · défi du jour réussi`;
    }
    const b = uiButton(this, W / 2, y, 'primary', { label: text, icon: 'icon-play', width: 780, name: 'btn-play' }, act);
    if (!reduced()) this.tweens.add({ targets: b, scale: 1.025, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    label(this, W / 2, progressY, sub, font.label, { color: color.inkSoft, weight: 600, wrap: W - space.margin * 2 }).setName('home-progress');
  }

  /** Diorama : petit jardin dont les éléments apparaissent au fil du chapitre 1. */
  private buildDiorama(top: number, bottom: number) {
    const stage = homeStage();
    const eq = Save.get().collection.equipped;
    const g = parseLevel({
      key: 'home', version: 1, id: 0, name: '', theme: 'sunny', difficulty: '', objective: '', exitStyle: 'beacon',
      map: ['t#..E#', '.f.#..', '~~~B~~', '.S..b.'],
    });
    const overflow = 0.8; // arbres et balise dépassent au-dessus
    const avail = bottom - top;
    const tw = Math.floor(Math.min(150, (W - space.margin) / (g.width + 0.76), avail / (g.height * 0.825 + 0.76 + 0.42 + overflow)));
    const L = boardLayout(g, tw);
    const key = `board-home-${tw}`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, drawBoard(g, 'sunny', L, 4242));
    const s = tw / BT;
    const bx = W / 2 - L.width / 2;
    const by = top + (avail - (L.height + overflow * tw)) / 2 + overflow * tw;
    const root = this.add.container(0, 0);
    root.add(this.add.image(bx, by, key).setOrigin(0));
    const ox = bx + L.pad, oy = by + L.pad, td = L.td;
    const at = (x: number, y: number) => ({ cx: ox + (x + 0.5) * tw, cy: oy + (y + 0.5) * td, bottom: oy + (y + 1) * td });
    const objs: { y: number; o: Phaser.GameObjects.GameObject }[] = [];
    const add = (y: number, o: Phaser.GameObjects.GameObject) => objs.push({ y, o });

    g.cells.forEach((cell, i) => {
      const x = i % g.width, y = Math.floor(i / g.width);
      const { cx, cy, bottom: b } = at(x, y);
      if (cell === Cell.Wall) {
        const d = g.decor[i]!;
        const img = d === 'tree'
          ? this.add.image(cx, cy, 'tree').setOrigin(0.5, (300 - BD / 2 - 6) / 300)
          : this.add.image(cx, b, d === 'hedge' ? `hedge${i % 3}` : d).setOrigin(0.5, HEDGE_BASE / HEDGE_H);
        img.setScale(s);
        add(b, img);
      } else if ((cell === Cell.Water || cell === Cell.Bridge) && i % 2 === 0) {
        const sh = this.add.image(cx, cy, 'shine').setScale(s);
        if (!reduced()) this.tweens.add({ targets: sh, alpha: 0.2, x: cx + 14, duration: 1600, yoyo: true, repeat: -1 });
        add(0, sh);
      }
    });

    // petit pont (après le niveau 4)
    const b = at(3, 2);
    for (const side of [-1, 1]) for (const ey of [b.cy - td / 2, b.cy + td / 2]) add(ey + 6 * s, this.add.image(b.cx + side * tw * 0.42, ey + 6 * s, 'post').setOrigin(0.5, 1).setScale(s));
    const planks: Phaser.GameObjects.Image[] = [];
    if (stage.bridge) {
      for (let k = 0; k < 4; k++) {
        const pl = this.add.image(b.cx, b.cy - td / 2 + (k + 0.5) * (td / 4), 'plank').setScale(s * 0.86, s * 0.95);
        if (k === 0) pl.setName('home-bridge');
        planks.push(pl);
        add(1, pl);
      }
      // le pont bouge légèrement, de temps en temps
      this.events_.push(() => planks.forEach((pl, k) => this.tweens.add({ targets: pl, y: pl.y + 4, duration: 260, yoyo: true, delay: k * 70, ease: 'Sine.easeInOut' })));
    }

    // balise (allumée après le niveau 6)
    const e = at(4, 0);
    const beacon = this.add.image(e.cx, e.bottom - 4 * s, stage.beaconLit ? 'beacon-lit' : 'beacon').setOrigin(0.5, 1).setScale(s * 0.8).setName(stage.beaconLit ? 'home-beacon-lit' : 'home-beacon');
    add(e.bottom, beacon);
    if (stage.beaconLit) {
      const glow = this.add.image(e.cx, e.bottom - beacon.displayHeight * 0.8, 'glow').setScale(s * 3).setAlpha(0.55);
      add(e.bottom + 1, glow);
      this.events_.push(() => this.tweens.add({ targets: glow, alpha: 0.95, scale: s * 3.6, duration: 700, yoyo: true, ease: 'Sine.easeInOut' }));
    }

    // fleur magique (récompense du niveau 5) : s'ouvre de temps en temps
    if (eq.decor.includes('deco-magic-flower')) {
      const f = at(2, 1);
      const fl = this.add.image(f.cx, f.cy + 30 * s, 'magic-flower').setOrigin(0.5, 0.95).setScale(s * 1.1).setName('home-magic-flower');
      add(f.cy + 30 * s, fl);
      this.events_.push(() => this.tweens.add({ targets: fl, scaleX: s * 1.25, scaleY: s * 1.2, duration: 500, yoyo: true, ease: 'Sine.easeInOut' }));
    } else {
      // petite fleur sauvage qui s'ouvre
      const f = at(5, 1);
      const wild = this.add.image(f.cx, f.cy, 'bloom-a').setScale(s * 0.5).setAlpha(0.95);
      add(f.cy, wild);
      this.events_.push(() => this.tweens.add({ targets: wild, scale: s * 0.95, duration: 600, yoyo: true, hold: 1600, ease: 'Back.easeOut' }));
    }
    if (eq.decor.includes('deco-lanterns')) {
      for (const [x, y] of [[0, 1], [3, 3]] as const) {
        const l = at(x, y);
        add(l.cy + 30 * s, this.add.image(l.cx + 40 * s, l.cy + 30 * s, 'lantern').setOrigin(0.5, 0.95).setScale(s).setName('home-lantern'));
      }
    }
    // Bourgeon, avec ses cosmétiques
    const p = at(1, 3);
    this.pip = new Player(this, p.cx, p.cy + 6, s * 0.95, { hat: eq.hat === 'hat-gardener', golden: eq.scarf === 'scarf-golden' });
    add(p.cy + 6, this.pip);
    this.events_.push(() => this.pip?.lookAround());
    if (eq.companion === 'companion-duckling') {
      const duck = this.add.image(p.cx + 62 * s, p.cy + 22, 'duckling').setOrigin(0.5, 0.9).setScale(s * 0.9).setFlipX(true).setName('home-duckling');
      add(p.cy + 22, duck);
      this.events_.push(() => this.tweens.add({ targets: duck, y: duck.y - 14, duration: 180, yoyo: true, repeat: 1, ease: 'Quad.easeOut' }));
    }
    // un lapin traverse parfois le jardin, au premier plan
    const front = at(0, 3).bottom + 20;
    const bunny = this.add.image(bx - 80, front, 'bunny').setOrigin(0.5, 0.95).setScale(s * 0.75).setVisible(false);
    add(front + 100, bunny);
    this.events_.push(() => {
      bunny.setVisible(true).setX(bx - 60).setFlipX(false);
      this.tweens.add({ targets: bunny, x: bx + L.width + 60, duration: 4200, ease: 'Linear', onComplete: () => bunny.setVisible(false) });
      this.tweens.add({ targets: bunny, y: front - 26, duration: 230, yoyo: true, repeat: 8, ease: 'Quad.easeOut' });
    });
    objs.sort((a, bb) => a.y - bb.y).forEach(({ o }) => root.add(o));
  }

  /** Un petit événement à la fois, espacé, pour un jardin vivant sans agitation permanente. */
  private scheduleAmbient() {
    if (reduced() || !this.events_.length) return;
    let last = -1;
    const next = () => {
      let i = Math.floor(Math.random() * this.events_.length);
      if (i === last && this.events_.length > 1) i = (i + 1) % this.events_.length;
      last = i;
      this.events_[i]();
      this.time.delayedCall(4500 + Math.random() * 3500, next);
    };
    this.time.delayedCall(2200, next);
  }
}

