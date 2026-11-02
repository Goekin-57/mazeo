import Phaser from 'phaser';
import { drawThumb } from '../art/board';
import { C, hex } from '../art/palette';
import { Sfx } from '../audio/sfx';
import { chapterById, CHAPTERS } from '../content/chapters';
import { parseLevel } from '../core/grid';
import { isUnlocked } from '../progress';
import { Save } from '../save';
import { backdrop, button, centerCamera, fadeIn, goTo, reduced, toast, txt, W } from '../ui/ui';

const PER_PAGE = 6;

/** Niveaux d'un chapitre (nombre variable : pagination par 6). */
export class ChapterScene extends Phaser.Scene {
  private chapterId = 'chapter01';
  private page = 0;
  constructor() {
    super('Chapter');
  }

  init(data: { chapterId?: string; page?: number }) {
    this.chapterId = data.chapterId && chapterById(data.chapterId)?.available ? data.chapterId : CHAPTERS[0].id;
    this.page = data.page ?? 0;
  }

  create() {
    this.input.enabled = true;
    centerCamera(this);
    fadeIn(this);
    backdrop(this, { clouds: false });
    const ch = chapterById(this.chapterId)!;
    button(this, 96, 96, 'btn-small', { icon: 'icon-back', iconScale: 0.9 }, () => goTo(this, 'Journey'), 'btn-back').setScale(0.95);
    txt(this, W / 2 + 30, 100, `Chapitre ${ch.number}`, 40, { color: C.inkSoft, weight: 600 });
    txt(this, W / 2 + 30, 160, ch.name, 58, { weight: 700 });
    txt(this, W / 2, 236, ch.description, 30, { color: C.inkSoft, weight: 400, wrap: 860 });
    const done = ch.levels.filter((l) => Save.level(l.key)?.completed).length;
    const stars = ch.levels.reduce((a, l) => a + (Save.level(l.key)?.stars ?? 0), 0);
    txt(this, W / 2, 316, `${done}/${ch.levels.length} niveaux · ★ ${stars}/${ch.levels.length * 3}`, 34, { weight: 600 });

    const pages = Math.ceil(ch.levels.length / PER_PAGE);
    const slice = ch.levels.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);
    const cw = 440, chh = 430;
    slice.forEach((def, k) => {
      const x = W / 2 + (k % 2 ? 1 : -1) * 232;
      const y = 600 + Math.floor(k / 2) * (chh + 30);
      this.card(def.key, x, y, cw, chh);
    });
    if (pages > 1) {
      if (this.page > 0) button(this, 120, 1820, 'btn-small', { icon: 'icon-back', iconScale: 0.9 }, () => this.scene.restart({ chapterId: this.chapterId, page: this.page - 1 }), 'page-prev');
      if (this.page < pages - 1) button(this, W - 120, 1820, 'btn-small', { icon: 'icon-next', iconScale: 0.9 }, () => this.scene.restart({ chapterId: this.chapterId, page: this.page + 1 }), 'page-next');
      txt(this, W / 2, 1820, `Page ${this.page + 1}/${pages}`, 32, { weight: 600 });
    }
  }

  private card(key: string, x: number, y: number, w: number, h: number) {
    const ch = chapterById(this.chapterId)!;
    const def = ch.levels.find((l) => l.key === key)!;
    const unlocked = isUnlocked(key);
    const prog = Save.level(key);
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x2c4a30, 0.14);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 10, w, h, 34);
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 34);
    g.lineStyle(4, unlocked ? hex(prog?.completed ? C.meadow : C.orange) : 0xd8d0bd, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 34);
    c.add(g);
    const tk = `thumb-${key}`;
    if (!this.textures.exists(tk)) this.textures.addCanvas(tk, drawThumb(parseLevel(def), def.theme, 380, 210));
    c.add(this.add.image(0, -h / 2 + 130, tk));
    c.add(this.add.circle(-w / 2 + 46, -h / 2 + 42, 34, hex(unlocked ? C.orange : '#c9bfa8')).setStrokeStyle(5, 0xffffff));
    c.add(txt(this, -w / 2 + 46, -h / 2 + 40, String(def.id), 40, { color: '#ffffff', weight: 700 }));
    c.add(txt(this, 0, h / 2 - 150, def.name, 36, { weight: 700, wrap: w - 30 }));
    c.add(txt(this, 0, h / 2 - 104, prog?.bestMoves ? `Record : ${prog.bestMoves} cases` : def.difficulty, 28, { color: C.inkSoft, weight: 500 }));
    for (let k = 0; k < 3; k++) c.add(this.add.image((k - 1) * 66, h / 2 - 50, k < (prog?.stars ?? 0) ? 'star-full' : 'star-empty').setScale(0.48));
    if (!unlocked) {
      const veil = this.add.graphics();
      veil.fillStyle(0xf3ecdc, 0.8);
      veil.fillRoundedRect(-w / 2, -h / 2, w, h, 34);
      c.add(veil);
      c.add(this.add.image(0, -50, 'icon-lock').setScale(1.4));
      c.add(txt(this, 0, 36, 'Termine le niveau précédent', 28, { color: C.inkSoft, weight: 500, wrap: w - 60 }));
    } else if (!prog?.completed) {
      const tag = this.add.container(w / 2 - 74, -h / 2 + 34);
      const tg = this.add.graphics();
      tg.fillStyle(hex(C.turquoiseDeep), 1);
      tg.fillRoundedRect(-62, -22, 124, 44, 22);
      tag.add([tg, txt(this, 0, 0, 'Nouveau', 26, { color: '#fff', weight: 700 })]);
      c.add(tag);
    }
    const hit = this.add.rectangle(0, 0, w, h, 0, 0).setInteractive({ useHandCursor: true });
    hit.name = `card-${key}`;
    let pressed = false;
    hit.on('pointerdown', () => { pressed = true; this.tweens.add({ targets: c, scale: 0.96, duration: 70 }); });
    hit.on('pointerout', () => { pressed = false; this.tweens.add({ targets: c, scale: 1, duration: 120 }); });
    hit.on('pointerup', () => {
      if (!pressed) return;
      pressed = false;
      this.tweens.add({ targets: c, scale: 1, duration: 120 });
      Sfx.click();
      if (unlocked) goTo(this, 'Game', { kind: 'adventure', key });
      else toast(this, 'Termine d’abord le niveau précédent', 1820, 2200);
    });
    c.add(hit);
    if (!reduced()) {
      c.setAlpha(0).setY(y + 30);
      this.tweens.add({ targets: c, alpha: 1, y, duration: 380, delay: 60 * def.id, ease: 'Back.easeOut' });
    }
  }
}
