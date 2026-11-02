import Phaser from 'phaser';
import { C } from '../art/palette';
import { CHAPTERS } from '../content/chapters';
import { Save } from '../save';
import { drawTrail } from '../ui/trail';
import { backdrop, button, centerCamera, fadeIn, goTo, toast, txt, W } from '../ui/ui';

/** Carnet de voyage : la carte du Grand Sentier et ses chapitres. */
export class JourneyScene extends Phaser.Scene {
  constructor() {
    super('Journey');
  }

  create() {
    this.input.enabled = true;
    centerCamera(this);
    fadeIn(this);
    backdrop(this, { clouds: false });
    button(this, 96, 96, 'btn-small', { icon: 'icon-back', iconScale: 0.9 }, () => goTo(this, 'Home'), 'btn-back').setScale(0.95);
    txt(this, W / 2 + 30, 110, 'Carnet de voyage', 62, { weight: 700 });
    txt(this, W / 2, 200, 'Les six balises du Grand Sentier se sont éteintes.', 34, { color: C.inkSoft, weight: 500 });
    const lit = CHAPTERS.filter((c) => Save.chapter(c.id).completed).length;
    const stops = drawTrail(this, 280, 1440, lit);
    stops.forEach((st, i) => {
      const ch = CHAPTERS[i];
      st.hit.on('pointerup', () => {
        if (ch.available) goTo(this, 'Chapter', { chapterId: ch.id });
        else toast(this, `${ch.name} n’est pas encore disponible dans ce prototype`, 1820, 2400);
      });
    });
  }
}
