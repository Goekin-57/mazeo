import Phaser from 'phaser';
import { CHAPTERS, type ChapterDef } from '../content/chapters';
import { Save } from '../save';
import { cardBg, chip, label } from '../ui/components';
import { finishScreen, setupScreen } from '../ui/screen';
import { color, font, hexOf, space } from '../ui/theme';
import { goTo, reduced, toast, W } from '../ui/ui';

/** Carnet de voyage : chapitres terminé / actif / futurs, reliés par le tracé du Grand Sentier. */
export class JourneyScene extends Phaser.Scene {
  constructor() {
    super('Journey');
  }

  create() {
    let y = setupScreen(this, { title: 'Carnet de voyage', back: 'Home', nav: 'Journey', subtitle: 'Les six balises du Grand Sentier se sont éteintes.' });
    const pathX = space.margin + 70;
    const cardX = pathX + 60;
    const cardW = W - cardX - space.margin;
    const nodes: { y: number; lit: boolean }[] = [];
    const path = this.add.graphics().setDepth(-1);
    CHAPTERS.forEach((ch) => {
      const done = Save.chapter(ch.id).completed;
      const big = ch.available;
      const h = big ? 470 : 176;
      this.chapterCard(ch, cardX, y, cardW, h, done);
      nodes.push({ y: y + (big ? 120 : h / 2), lit: done });
      y += h + space.gap + 12;
    });
    // tracé du voyage (pointillés), allumé jusqu'aux chapitres terminés
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const lit = a.lit;
      for (let yy = a.y + 40; yy < b.y - 36; yy += 30) {
        path.fillStyle(lit ? hexOf(color.primary) : hexOf(color.locked), lit ? 1 : 0.8);
        path.fillCircle(pathX, yy, 8);
      }
    }
    nodes.forEach((n, i) => {
      const avail = CHAPTERS[i].available;
      const c = this.add.circle(pathX, n.y, 34, n.lit ? hexOf('#f7d35c') : avail ? 0xffffff : hexOf('#efe7d4')).setStrokeStyle(6, n.lit ? hexOf(color.primary) : avail ? hexOf(color.success) : hexOf(color.locked));
      label(this, pathX, n.y, String(i + 1), font.label, { weight: 700, color: avail ? color.ink : color.inkMuted });
      void c;
    });
    // courte animation au premier passage après un chapitre terminé
    const firstLit = nodes.findIndex((n) => !n.lit);
    if (firstLit > 0 && !Save.introSeen(`journey-${firstLit}`) && !reduced()) {
      Save.markIntroSeen(`journey-${firstLit}`);
      const from = nodes[firstLit - 1].y, to = nodes[firstLit].y;
      const dot = this.add.circle(pathX, from, 14, hexOf(color.primary));
      this.tweens.add({ targets: dot, y: to, duration: 900, ease: 'Sine.easeInOut', onComplete: () => this.tweens.add({ targets: dot, scale: 3, alpha: 0, duration: 400 }) });
    }
    finishScreen(this, y);
  }

  private chapterCard(ch: ChapterDef, x: number, y: number, w: number, h: number, done: boolean) {
    const total = ch.levels.length;
    const levelsDone = ch.levels.filter((l) => Save.level(l.key)?.completed).length;
    const stars = ch.levels.reduce((a, l) => a + (Save.level(l.key)?.stars ?? 0), 0);
    if (!ch.available) {
      // chapitre futur : présence graphique réduite
      cardBg(this, x, y, w, h, { fill: '#f3ecdc', alpha: 0.85 });
      this.add.image(x + 90, y + h / 2, `region-${ch.visual.icon}`).setScale(0.62).setTint(0x9a968a).setAlpha(0.6);
      label(this, x + 180, y + h / 2 - 26, `Chapitre ${ch.number}`, font.caption, { color: color.inkMuted, weight: 600, align: 'left' });
      label(this, x + 180, y + h / 2 + 24, ch.name, font.body - 2, { color: color.inkSoft, weight: 600, align: 'left' });
      chip(this, x + w - space.pad, y + 44, 'À venir', 'locked', { align: 'right' }).setScale(0.85);
    } else {
      const active = !done;
      cardBg(this, x, y, w, h, { border: active ? color.primary : color.success, borderW: 5 });
      const ill = this.add.graphics();
      ill.fillStyle(hexOf(ch.visual.sky), 1);
      ill.fillRoundedRect(x + space.pad, y + space.pad, 210, 210, 30);
      this.add.image(x + space.pad + 105, y + space.pad + 112, `region-${ch.visual.icon}`).setScale(1.15);
      const tx = x + space.pad + 240;
      label(this, tx, y + 70, `Chapitre ${ch.number}`, font.caption, { color: color.inkSoft, weight: 600, align: 'left' });
      label(this, tx, y + 135, ch.name, font.heading - 4, { weight: 700, align: 'left', wrap: w - space.pad - 260 });
      chip(this, tx, y + 210, done ? 'Terminé' : 'En cours', done ? 'success' : 'primary', { align: 'left' });
      // progression
      const by = y + 290;
      const bw = w - space.pad * 2;
      const bar = this.add.graphics();
      bar.fillStyle(hexOf('#efe7d4'), 1);
      bar.fillRoundedRect(x + space.pad, by, bw, 24, 12);
      bar.fillStyle(hexOf(done ? color.success : color.primary), 1);
      if (levelsDone) bar.fillRoundedRect(x + space.pad, by, Math.max(24, (bw * levelsDone) / total), 24, 12);
      label(this, x + space.pad, by + 70, `${levelsDone}/${total} niveaux`, font.label, { weight: 600, align: 'left' });
      label(this, x + w - space.pad, by + 70, `★ ${stars}/${total * 3}`, font.label, { weight: 700, align: 'right', color: color.primaryDeep });
      label(this, x + w - space.pad, y + h - 50, 'Voir les niveaux ›', font.label, { weight: 700, align: 'right', color: color.accent });
    }
    const hit = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });
    hit.name = `chapter-${ch.id}`;
    hit.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (Math.abs(p.getDistanceY()) > 30) return; // c'était un défilement
      if (ch.available) goTo(this, 'Chapter', { chapterId: ch.id });
      else toast(this, `${ch.name} n’est pas encore disponible dans ce prototype`, this.cameras.main.scrollY + 1600, 2400);
    });
  }
}
