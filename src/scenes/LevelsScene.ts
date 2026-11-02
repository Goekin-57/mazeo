import Phaser from 'phaser';
import { drawThumb } from '../art/board';
import { canvas, fillEllipse, rr, vGrad } from '../art/draw';
import { C, hex } from '../art/palette';
import { Sfx } from '../audio/sfx';
import { parseLevel } from '../core/grid';
import { LEVELS } from '../levels';
import { Save } from '../save';
import { backdrop, button, centerCamera, fadeIn, goTo, reduced, toast, txt, W } from '../ui/ui';

/** Carnet illustré des niveaux. */
export class LevelsScene extends Phaser.Scene {
  constructor() {
    super('Levels');
  }

  create() {
    this.input.enabled = true;
    centerCamera(this);
    fadeIn(this);
    backdrop(this, { clouds: false });
    this.buildNotebook();

    button(this, 104, 96, 'btn-small', { icon: 'icon-back', iconScale: 0.9 }, () => goTo(this, 'Menu'), 'btn-back').setScale(0.95);
    txt(this, W / 2 + 30, 196, 'Carnet des jardins', 64, { weight: 700 });
    txt(this, W / 2 + 30, 262, `★ ${Save.totalStars()} / ${LEVELS.length * 3} étoiles`, 36, { color: C.inkSoft, weight: 500 });

    const cw = 400, ch = 440;
    const gx = [W / 2 + 30 - 215, W / 2 + 30 + 215];
    LEVELS.forEach((def, k) => {
      const x = gx[k % 2];
      const y = 560 + Math.floor(k / 2) * (ch + 34);
      this.card(def.id, x, y, cw, ch);
    });
  }

  private buildNotebook() {
    const key = 'notebook';
    if (!this.textures.exists(key)) {
      const w = 980, h = 1700;
      const [cv, c] = canvas(w, h);
      // ombre + couverture
      rr(c, 18, 26, w - 24, h - 30, 50);
      c.fillStyle = 'rgba(60,80,50,0.25)';
      c.fill();
      rr(c, 6, 6, w - 20, h - 24, 50);
      c.fillStyle = vGrad(c, 0, h, [[0, '#7fb98a'], [1, '#5f9a6b']]);
      c.fill();
      // page
      rr(c, 40, 30, w - 76, h - 80, 36);
      c.fillStyle = vGrad(c, 30, h, [[0, '#fffaf0'], [1, '#f5ead2']]);
      c.fill();
      c.strokeStyle = 'rgba(126,207,196,0.35)';
      c.lineWidth = 2;
      for (let y = 330; y < h - 80; y += 46) {
        c.beginPath(); c.moveTo(110, y); c.lineTo(w - 70, y); c.stroke();
      }
      c.strokeStyle = 'rgba(242,156,75,0.35)';
      c.beginPath(); c.moveTo(104, 40); c.lineTo(104, h - 60); c.stroke();
      // anneaux de reliure
      for (let y = 90; y < h - 80; y += 120) {
        fillEllipse(c, 40, y, 16, 16, '#d8cdb5');
        c.strokeStyle = '#9aa0a0';
        c.lineWidth = 7;
        c.beginPath(); c.arc(28, y, 22, -1.2, 1.2); c.stroke();
      }
      // marque-page
      c.fillStyle = C.orange;
      c.beginPath(); c.moveTo(w - 170, 0); c.lineTo(w - 120, 0); c.lineTo(w - 120, 150); c.lineTo(w - 145, 128); c.lineTo(w - 170, 150); c.closePath(); c.fill();
      // petites illustrations dans les marges
      for (const [x, y, col] of [[160, 300, '#f4a7b9'], [w - 130, 1600, C.yellow], [190, 1610, '#b9a3e3']] as const) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          fillEllipse(c, x + Math.cos(a) * 9, y + Math.sin(a) * 9, 8, 8, col);
        }
        fillEllipse(c, x, y, 6, 6, C.yellowDeep);
      }
      this.textures.addCanvas(key, cv);
    }
    this.add.image(W / 2 + 10, 1000, key);
  }

  private card(id: number, x: number, y: number, w: number, h: number) {
    const def = LEVELS[id - 1];
    const unlocked = Save.isUnlocked(id);
    const stars = Save.stars(id);
    const done = !!Save.get().completed[id];
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x2c4a30, 0.14);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 10, w, h, 34);
    g.fillStyle(0xffffff, 0.94);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 34);
    g.lineStyle(4, unlocked ? hex(done ? C.meadow : C.orange) : 0xd8d0bd, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 34);
    c.add(g);
    // miniature
    const tk = `thumb-${id}`;
    if (!this.textures.exists(tk)) this.textures.addCanvas(tk, drawThumb(parseLevel(def), def.theme, 340, 220));
    const th = this.add.image(0, -h / 2 + 140, tk);
    c.add(th);
    // pastille numéro
    const badge = this.add.circle(-w / 2 + 44, -h / 2 + 40, 34, hex(unlocked ? C.orange : '#c9bfa8')).setStrokeStyle(5, 0xffffff);
    c.add(badge);
    c.add(txt(this, -w / 2 + 44, -h / 2 + 38, String(id), 40, { color: '#ffffff', weight: 700 }));
    c.add(txt(this, 0, h / 2 - 128, def.name, 36, { weight: 700, wrap: w - 30 }));
    c.add(txt(this, 0, h / 2 - 84, def.difficulty, 26, { color: C.inkSoft, weight: 500 }));
    for (let k = 0; k < 3; k++) c.add(this.add.image((k - 1) * 66, h / 2 - 38, k < stars ? 'star-full' : 'star-empty').setScale(0.5));
    if (!unlocked) {
      const veil = this.add.graphics();
      veil.fillStyle(0xf3ecdc, 0.78);
      veil.fillRoundedRect(-w / 2, -h / 2, w, h, 34);
      c.add(veil);
      c.add(this.add.image(0, -40, 'icon-lock').setScale(1.4));
      c.add(txt(this, 0, 40, 'Termine le niveau précédent', 28, { color: C.inkSoft, weight: 500, wrap: w - 60 }));
    } else if (!done) {
      const tag = this.add.container(w / 2 - 70, -h / 2 + 30);
      const tg = this.add.graphics();
      tg.fillStyle(hex(C.turquoiseDeep), 1);
      tg.fillRoundedRect(-62, -22, 124, 44, 22);
      tag.add([tg, txt(this, 0, 0, 'Nouveau', 26, { color: '#fff', weight: 700 })]);
      c.add(tag);
      if (!reduced()) this.tweens.add({ targets: tag, scale: 1.08, duration: 700, yoyo: true, repeat: -1 });
    }
    const hit = this.add.rectangle(0, 0, w, h, 0, 0).setInteractive({ useHandCursor: true });
    hit.name = `card-${id}`;
    let pressed = false;
    hit.on('pointerdown', () => { pressed = true; this.tweens.add({ targets: c, scale: 0.96, duration: 70 }); });
    hit.on('pointerout', () => { pressed = false; this.tweens.add({ targets: c, scale: 1, duration: 120 }); });
    hit.on('pointerup', () => {
      if (!pressed) return;
      pressed = false;
      this.tweens.add({ targets: c, scale: 1, duration: 120 });
      Sfx.click();
      if (unlocked) goTo(this, 'Game', { level: id });
      else toast(this, 'Ce jardin est encore fermé : termine le niveau précédent', 1800, 2200);
    });
    c.add(hit);
    if (!reduced()) {
      c.setAlpha(0).setY(y + 30);
      this.tweens.add({ targets: c, alpha: 1, y, duration: 380, delay: 60 * id, ease: 'Back.easeOut' });
    }
  }
}
