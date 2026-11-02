import Phaser from 'phaser';
import { drawThumb } from '../art/board';
import { Sfx } from '../audio/sfx';
import { chapterById, CHAPTERS } from '../content/chapters';
import { parseLevel } from '../core/grid';
import { isUnlocked } from '../progress';
import { Save } from '../save';
import { cardBg, chip, label } from '../ui/components';
import { finishScreen, setupScreen } from '../ui/screen';
import { color, font, hexOf, space } from '../ui/theme';
import { goTo, reduced, toast, W } from '../ui/ui';

/** Sélection des niveaux d'un chapitre (nombre de niveaux variable). */
export class ChapterScene extends Phaser.Scene {
  private chapterId = 'chapter01';
  constructor() {
    super('Chapter');
  }

  init(data: { chapterId?: string }) {
    this.chapterId = data.chapterId && chapterById(data.chapterId)?.available ? data.chapterId : CHAPTERS[0].id;
  }

  create() {
    const ch = chapterById(this.chapterId)!;
    const done = ch.levels.filter((l) => Save.level(l.key)?.completed).length;
    const stars = ch.levels.reduce((a, l) => a + (Save.level(l.key)?.stars ?? 0), 0);
    let y = setupScreen(this, { title: `Chapitre ${ch.number}`, back: 'Journey', nav: 'Journey' });
    label(this, W / 2, y + 30, ch.name, font.heading, { weight: 700 });
    label(this, W / 2, y + 90, `${done}/${ch.levels.length} niveaux · ★ ${stars}/${ch.levels.length * 3}`, font.label, { color: color.inkSoft, weight: 600 });
    y += 150;
    const cw = (W - space.margin * 2 - space.gap) / 2;
    const chh = 500;
    ch.levels.forEach((def, k) => {
      const x = space.margin + (k % 2) * (cw + space.gap);
      const yy = y + Math.floor(k / 2) * (chh + space.gap);
      this.card(def.key, x, yy, cw, chh, k);
    });
    finishScreen(this, y + Math.ceil(ch.levels.length / 2) * (chh + space.gap));
  }

  private card(key: string, x: number, y: number, w: number, h: number, index: number) {
    const ch = chapterById(this.chapterId)!;
    const def = ch.levels.find((l) => l.key === key)!;
    const unlocked = isUnlocked(key);
    const prog = Save.level(key);
    const c = this.add.container(0, 0);
    const current = unlocked && !prog?.completed;
    c.add(cardBg(this, x, y, w, h, { border: current ? color.primary : prog?.completed ? color.success : color.border, borderW: current ? 5 : 3, fill: unlocked ? '#ffffff' : '#f3ecdc' }));
    const tk = `thumb-${key}`;
    if (!this.textures.exists(tk)) this.textures.addCanvas(tk, drawThumb(parseLevel(def), def.theme, 400, 230));
    const th = this.add.image(x + w / 2, y + 150, tk).setScale(Math.min(1, (w - 40) / 400));
    if (!unlocked) th.setAlpha(0.35);
    c.add(th);
    const badge = this.add.circle(x + 52, y + 52, 36, hexOf(unlocked ? color.primary : color.locked)).setStrokeStyle(5, 0xffffff);
    c.add([badge, label(this, x + 52, y + 50, String(def.id), font.label + 2, { color: '#ffffff', weight: 700 })]);
    c.add(label(this, x + w / 2, y + 310, def.name, font.body + 2, { weight: 700, wrap: w - 40, color: unlocked ? color.ink : color.inkSoft }));
    if (!unlocked) {
      c.add(this.add.image(x + w / 2, y + 150, 'icon-lock').setScale(1.2));
      c.add(label(this, x + w / 2, y + 400, `Termine le niveau ${def.id - 1}`, font.caption, { color: color.inkSoft, weight: 500 }));
    } else {
      c.add(label(this, x + w / 2, y + 372, prog?.bestMoves ? `Record : ${prog.bestMoves} cases` : def.difficulty, font.caption, { color: color.inkSoft, weight: 500 }));
      for (let k = 0; k < 3; k++) c.add(this.add.image(x + w / 2 + (k - 1) * 64, y + 440, k < (prog?.stars ?? 0) ? 'star-full' : 'star-empty').setScale(0.44));
      if (current) c.add(chip(this, x + w - 20, y + 52, prog ? 'À rejouer' : 'À jouer', 'primary', { align: 'right' }));
    }
    const hit = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });
    hit.name = `card-${key}`;
    hit.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (Math.abs(p.getDistanceY()) > 30) return;
      Sfx.click();
      if (unlocked) goTo(this, 'Game', { kind: 'adventure', key });
      else toast(this, `Termine d’abord le niveau ${def.id - 1}`, this.cameras.main.scrollY + 1600, 2200);
    });
    c.add(hit);
    if (!reduced()) {
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 260, delay: 40 * index });
    }
  }
}
