import Phaser from 'phaser';
import { boardLayout, drawBoard } from '../art/board';
import { C, hex } from '../art/palette';
import { BD, BT, HEDGE_BASE, HEDGE_H } from '../art/textures';
import { unlockAudio } from '../audio/sfx';
import { dailyFor, today } from '../content/challenges/calendar';
import { parseLevel } from '../core/grid';
import { Cell } from '../core/types';
import { continueTarget, homeStage } from '../progress';
import { Save } from '../save';
import { button, centerCamera, drift, fadeIn, goTo, reduced, backdrop, txt, W } from '../ui/ui';
import { Player } from './Player';

/**
 * Accueil : logo, diorama qui évolue avec la progression réelle, bouton JOUER/CONTINUER,
 * navigation secondaire. Les commandes restent à la même place quel que soit le décor.
 */
export class HomeScene extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create() {
    this.input.enabled = true;
    centerCamera(this);
    fadeIn(this);
    backdrop(this);
    drift(this, 5);
    this.buildLogo();
    this.buildDiorama();
    this.buildActions();
    this.input.once('pointerdown', () => unlockAudio());
  }

  private buildLogo() {
    const letters = 'MAZEO'.split('');
    const spacing = 118;
    const x0 = W / 2 - ((letters.length - 1) * spacing) / 2;
    const colors = [C.orange, '#7cc06a', C.turquoiseDeep, '#f2b84b', C.orange];
    letters.forEach((l, i) => {
      const t = txt(this, x0 + i * spacing, 200, l, 150, { weight: 700, color: colors[i], stroke: '#ffffff', strokeW: 18 });
      t.setShadow(0, 8, 'rgba(60,90,50,0.28)', 0, true, true);
      if (!reduced()) this.tweens.add({ targets: t, y: 186, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 140 });
    });
    txt(this, W / 2, 312, 'Le Grand Sentier', 46, { color: C.inkSoft, weight: 500 });
    button(this, W - 90, 96, 'btn-small', { icon: 'icon-gear', iconScale: 0.8 }, () => {
      this.scene.launch('Settings', { from: 'Home' });
      this.scene.pause();
    }, 'btn-settings').setScale(0.85);
  }

  /** Diorama : petit jardin dont les éléments apparaissent au fil du chapitre 1. */
  private buildDiorama() {
    const stage = homeStage();
    const eq = Save.get().collection.equipped;
    const g = parseLevel({
      key: 'home', version: 1, id: 0, name: '', theme: 'sunny', difficulty: '', objective: '', exitStyle: 'beacon',
      map: ['t#..E#', '.f.#..', '~~~B~~', '.S..b.'],
    });
    const tw = 150;
    const L = boardLayout(g, tw);
    const key = 'board-home';
    if (!this.textures.exists(key)) this.textures.addCanvas(key, drawBoard(g, 'sunny', L, 4242));
    const s = tw / BT;
    const bx = W / 2 - L.width / 2;
    const by = 520;
    const root = this.add.container(0, 0);
    root.add(this.add.image(bx, by, key).setOrigin(0));
    const ox = bx + L.pad, oy = by + L.pad, td = L.td;
    const at = (x: number, y: number) => ({ cx: ox + (x + 0.5) * tw, cy: oy + (y + 0.5) * td, bottom: oy + (y + 1) * td });
    const objs: { y: number; o: Phaser.GameObjects.GameObject }[] = [];
    const add = (y: number, o: Phaser.GameObjects.GameObject) => objs.push({ y, o });

    g.cells.forEach((cell, i) => {
      const x = i % g.width, y = Math.floor(i / g.width);
      const { cx, cy, bottom } = at(x, y);
      if (cell === Cell.Wall) {
        const d = g.decor[i]!;
        const img = d === 'tree'
          ? this.add.image(cx, cy, 'tree').setOrigin(0.5, (300 - BD / 2 - 6) / 300)
          : this.add.image(cx, bottom, d === 'hedge' ? `hedge${i % 3}` : d).setOrigin(0.5, HEDGE_BASE / HEDGE_H);
        img.setScale(s);
        if (!reduced() && d !== 'hedge') this.tweens.add({ targets: img, scaleX: s * 1.02, scaleY: s * 0.985, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        add(bottom, img);
      } else if (cell === Cell.Water || cell === Cell.Bridge) {
        if (i % 2 === 0) {
          const sh = this.add.image(cx, cy, 'shine').setScale(s);
          if (!reduced()) this.tweens.add({ targets: sh, alpha: 0.2, x: cx + 14, duration: 1400, yoyo: true, repeat: -1 });
          add(0, sh);
        }
      }
    });

    // petit pont (après le niveau 4)
    const b = at(3, 2);
    for (const side of [-1, 1]) for (const ey of [b.cy - td / 2, b.cy + td / 2]) add(ey + 6 * s, this.add.image(b.cx + side * tw * 0.42, ey + 6 * s, 'post').setOrigin(0.5, 1).setScale(s));
    if (stage.bridge) for (let k = 0; k < 4; k++) add(1, this.add.image(b.cx, b.cy - td / 2 + (k + 0.5) * (td / 4), 'plank').setScale(s * 0.86, s * 0.95).setName(k === 0 ? 'home-bridge' : ''));

    // balise (allumée après le niveau 6)
    const e = at(4, 0);
    const beacon = this.add.image(e.cx, e.bottom - 4 * s, stage.beaconLit ? 'beacon-lit' : 'beacon').setOrigin(0.5, 1).setScale(s * 0.8).setName(stage.beaconLit ? 'home-beacon-lit' : 'home-beacon');
    add(e.bottom, beacon);
    if (stage.beaconLit) {
      const glow = this.add.image(e.cx, e.bottom - beacon.displayHeight * 0.8, 'glow').setScale(s * 3).setAlpha(0.7);
      if (!reduced()) this.tweens.add({ targets: glow, alpha: 0.35, duration: 1400, yoyo: true, repeat: -1 });
      add(e.bottom + 1, glow);
    }

    // fleur magique (décoration obtenue au niveau 5)
    if (eq.decor.includes('deco-magic-flower')) {
      const f = at(2, 1);
      const fl = this.add.image(f.cx, f.cy + 30 * s, 'magic-flower').setOrigin(0.5, 0.95).setScale(s * 1.1).setName('home-magic-flower');
      if (!reduced()) this.tweens.add({ targets: fl, scaleY: s * 1.16, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      add(f.cy + 30 * s, fl);
    }
    // lanternes (décoration des défis)
    if (eq.decor.includes('deco-lanterns')) {
      for (const [x, y] of [[0, 1], [3, 3]] as const) {
        const l = at(x, y);
        add(l.cy + 30 * s, this.add.image(l.cx + 40 * s, l.cy + 30 * s, 'lantern').setOrigin(0.5, 0.95).setScale(s).setName('home-lantern'));
      }
    }
    // Bourgeon, avec ses cosmétiques équipés
    const p = at(1, 3);
    const pip = new Player(this, p.cx, p.cy + 6, s * 0.95, { hat: eq.hat === 'hat-gardener', golden: eq.scarf === 'scarf-golden' });
    add(p.cy + 6, pip);
    // caneton compagnon (après le niveau 3)
    if (eq.companion === 'companion-duckling') {
      const duck = this.add.image(p.cx + 62 * s, p.cy + 22, 'duckling').setOrigin(0.5, 0.9).setScale(s * 0.9).setFlipX(true).setName('home-duckling');
      if (!reduced()) this.tweens.add({ targets: duck, y: duck.y - 10, duration: 450, yoyo: true, repeat: -1, ease: 'Quad.easeOut', hold: 1200 });
      add(p.cy + 22, duck);
    }
    objs.sort((a, bb) => a.y - bb.y).forEach(({ o }) => root.add(o));
    if (!reduced()) this.tweens.add({ targets: root, y: -14, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private buildActions() {
    const target = continueTarget();
    const play = target.allDone
      ? button(this, W / 2, 1340, 'pill-orange', { label: 'REJOUER', icon: 'icon-map', size: 56, iconScale: 1, iconX: -170 }, () => goTo(this, 'Chapter', { chapterId: target.chapterId }), 'btn-play')
      : button(this, W / 2, 1340, 'pill-orange', { label: target.isNew ? 'JOUER' : 'CONTINUER', icon: 'icon-play', size: 56, iconScale: 1, iconX: -180 },
        () => goTo(this, 'Game', { kind: 'adventure', key: target.key }), 'btn-play');
    if (!reduced()) this.tweens.add({ targets: play, scale: 1.035, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    txt(this, W / 2, 1440, target.label, 30, { color: C.inkSoft, weight: 600, wrap: 900 });

    const daily = dailyFor(today());
    const dailyDone = !!Save.record(daily.puzzle.key, daily.puzzle.version)?.bestMoves;
    const nav: [string, string, string, string, boolean][] = [
      ['Aventure', 'icon-map', 'Journey', 'nav-adventure', false],
      ['Défis', 'icon-flag', 'Challenges', 'nav-challenges', !dailyDone],
      ['Collection', 'icon-chest', 'Collection', 'nav-collection', Save.get().collection.fresh.length > 0],
      ['Communauté', 'icon-people', 'Community', 'nav-community', false],
    ];
    nav.forEach(([label, icon, scene, name, dot], k) => {
      const x = 165 + k * 250;
      const y = 1625;
      button(this, x, y, 'btn-round', { icon, iconScale: 1 }, () => goTo(this, scene), name).setScale(0.86);
      txt(this, x, y + 96, label, 32, { weight: 600 });
      if (dot) {
        const d = this.add.circle(x + 46, y - 50, 16, hex(C.orange)).setStrokeStyle(4, 0xffffff);
        if (!reduced()) this.tweens.add({ targets: d, scale: 1.2, duration: 600, yoyo: true, repeat: -1 });
      }
    });
    const stars = Save.totalStars();
    const done = Save.challengesCompleted();
    txt(this, W / 2, 1820, `★ ${stars} étoiles · ${done} défi${done > 1 ? 's' : ''} réussi${done > 1 ? 's' : ''}`, 30, { color: C.inkSoft, weight: 500 });
  }
}
