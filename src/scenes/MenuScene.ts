import Phaser from 'phaser';
import { boardLayout, drawBoard } from '../art/board';
import { C } from '../art/palette';
import { BD, BT, HEDGE_BASE, HEDGE_H } from '../art/textures';
import { unlockAudio } from '../audio/sfx';
import { parseLevel } from '../core/grid';
import { Cell } from '../core/types';
import { LEVELS } from '../levels';
import { Save } from '../save';
import { backdrop, button, centerCamera, drift, fadeIn, goTo, reduced, txt, W } from '../ui/ui';
import { Player } from './Player';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.input.enabled = true;
    centerCamera(this);
    fadeIn(this);
    backdrop(this);
    drift(this, 7);
    this.buildLogo();
    this.buildDiorama();

    const next = Save.nextLevel(LEVELS.length);
    const play = button(this, W / 2, 1420, 'pill-orange', { label: 'JOUER', icon: 'icon-play', size: 60, iconScale: 1, iconX: -150 }, () => goTo(this, 'Game', { level: next }), 'btn-play');
    if (!reduced()) this.tweens.add({ targets: play, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    button(this, W / 2, 1590, 'pill-cream', { label: 'NIVEAUX', icon: 'icon-book', size: 46, iconScale: 0.9, iconX: -170 }, () => goTo(this, 'Levels'), 'btn-levels');
    button(this, W / 2, 1735, 'pill-cream', { label: 'PARAMÈTRES', icon: 'icon-gear', size: 46, iconScale: 0.9, iconX: -190 }, () => this.openSettings(), 'btn-settings');
    txt(this, W / 2, 1860, `★ ${Save.totalStars()} / ${LEVELS.length * 3}`, 34, { color: C.inkSoft, weight: 600 });
    this.input.once('pointerdown', () => unlockAudio());
  }

  private openSettings() {
    this.scene.launch('Settings', { from: 'Menu' });
    this.scene.pause();
  }

  private buildLogo() {
    const letters = 'MAZEO'.split('');
    const size = 190;
    const spacing = 150;
    const x0 = W / 2 - ((letters.length - 1) * spacing) / 2;
    const colors = [C.orange, '#7cc06a', C.turquoiseDeep, '#f2b84b', C.orange];
    letters.forEach((l, i) => {
      const t = txt(this, x0 + i * spacing, 300, l, size, { weight: 700, color: colors[i], stroke: '#ffffff', strokeW: 22 });
      t.setShadow(0, 10, 'rgba(60,90,50,0.28)', 0, true, true);
      if (!reduced()) {
        this.tweens.add({ targets: t, y: 280, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 140 });
      }
      if (i === letters.length - 1) {
        // une pousse sur le « O »
        const sp = this.add.image(t.x + 10, 196, 'pip-sprout').setScale(1.5).setOrigin(0.5, 0.95);
        if (!reduced()) {
          this.tweens.add({ targets: sp, y: 176, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 140 });
          this.tweens.add({ targets: sp, angle: { from: -8, to: 8 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      }
    });
    txt(this, W / 2, 440, 'Les labyrinthes vivants', 52, { color: C.inkSoft, weight: 500 });
  }

  /** Petit jardin miniature animé en fond d'accueil. */
  private buildDiorama() {
    const g = parseLevel({
      id: 99, name: '', theme: 'sunny', difficulty: '', objective: '', exitStyle: 'house',
      map: ['t#..#', '..#.E', 'S..f.', '#~~..'],
    });
    const tw = 150;
    const L = boardLayout(g, tw);
    const key = 'board-menu';
    if (!this.textures.exists(key)) this.textures.addCanvas(key, drawBoard(g, 'sunny', L, 4242));
    const s = tw / BT;
    const bx = W / 2 - L.width / 2;
    const by = 640;
    const root = this.add.container(0, 0);
    root.add(this.add.image(bx, by, key).setOrigin(0));
    const ox = bx + L.pad, oy = by + L.pad, td = L.td;
    const objs: { y: number; o: Phaser.GameObjects.GameObject }[] = [];
    g.cells.forEach((cell, i) => {
      const x = i % g.width, y = Math.floor(i / g.width);
      const cx = ox + (x + 0.5) * tw, cy = oy + (y + 0.5) * td, bottom = oy + (y + 1) * td;
      if (cell === Cell.Wall) {
        const d = g.decor[i]!;
        const img = d === 'tree'
          ? this.add.image(cx, cy, 'tree').setOrigin(0.5, (300 - BD / 2 - 6) / 300)
          : this.add.image(cx, bottom, d === 'hedge' ? `hedge${i % 3}` : d).setOrigin(0.5, HEDGE_BASE / HEDGE_H);
        img.setScale(s);
        if (!reduced() && d !== 'hedge') this.tweens.add({ targets: img, scaleX: s * 1.02, scaleY: s * 0.985, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        objs.push({ y: bottom, o: img });
      } else if (cell === Cell.Exit) {
        objs.push({ y: bottom, o: this.add.image(cx, bottom - 4 * s, 'house-lit').setOrigin(0.5, 1).setScale(s * 0.86) });
      } else if (cell === Cell.Water) {
        const sh = this.add.image(cx, cy, 'shine').setScale(s);
        if (!reduced()) this.tweens.add({ targets: sh, alpha: 0.2, x: cx + 14, duration: 1400, yoyo: true, repeat: -1 });
        objs.push({ y: 0, o: sh });
      }
    });
    // haie qui vient de pousser derrière Bourgeon + caneton
    const hb = oy + 2 * td;
    objs.push({ y: hb, o: this.add.image(ox + 1.5 * tw, hb, 'young1').setOrigin(0.5, HEDGE_BASE / HEDGE_H).setScale(s) });
    const p = new Player(this, ox + 1.5 * tw, oy + 2.5 * td + 6, s * 0.95);
    objs.push({ y: oy + 2.5 * td + 6, o: p });
    const duck = this.add.image(ox + 1.1 * tw, oy + 2.8 * td, 'duckling').setOrigin(0.5, 0.9).setScale(s * 0.9);
    if (!reduced()) this.tweens.add({ targets: duck, y: duck.y - 10, duration: 500, yoyo: true, repeat: -1, ease: 'Quad.easeOut', hold: 900 });
    objs.push({ y: oy + 2.8 * td, o: duck });
    objs.sort((a, b) => a.y - b.y).forEach(({ o }) => root.add(o));
    if (!reduced()) this.tweens.add({ targets: root, y: -18, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
