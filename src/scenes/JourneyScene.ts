import Phaser from 'phaser';
import { CHAPTERS, type ChapterDef } from '../content/chapters';
import type { LevelDef } from '../core/types';
import { isUnlocked, nextUnfinished } from '../progress';
import { Save } from '../save';
import { a11yButton } from '../ui/a11y';
import { cardBg, chip, label } from '../ui/components';
import { finishScreen, setupScreen } from '../ui/screen';
import { color, font, hexOf, space } from '../ui/theme';
import { goTo, reduced, W } from '../ui/ui';

/**
 * Aventure (v0.5) : le chapitre en cours et ses niveaux sont directement jouables ici ;
 * le prochain niveau est mis en avant ; les niveaux verrouillés indiquent leur condition ;
 * les chapitres futurs occupent peu de place.
 */
export class JourneyScene extends Phaser.Scene {
  constructor() {
    super('Journey');
  }

  create() {
    let y = setupScreen(this, { title: 'Aventure', back: 'Home', nav: 'Journey', subtitle: 'Le Grand Sentier' });
    const next = nextUnfinished();
    for (const ch of CHAPTERS.filter((c) => c.available)) y = this.chapterBlock(ch, y, next) + space.section;
    const future = CHAPTERS.filter((c) => !c.available);
    if (future.length) {
      label(this, space.margin + 8, y + 20, 'Prochains chapitres', font.body + 1, { weight: 700, align: 'left' });
      y += 70;
      future.forEach((ch) => { this.futureRow(ch, y); y += 118 + space.sm; });
    }
    finishScreen(this, y);
  }

  private chapterBlock(ch: ChapterDef, top: number, next: string | null) {
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 8;
    const done = Save.chapter(ch.id).completed;
    const levelsDone = ch.levels.filter((l) => Save.level(l.key)?.completed).length;
    const stars = ch.levels.reduce((a, l) => a + (Save.level(l.key)?.stars ?? 0), 0);
    const rowH = 168;
    const headH = 250;
    const h = headH + ch.levels.length * (rowH + space.sm) + pad;
    cardBg(this, x, top, w, h, { border: done ? color.success : color.primary, borderW: 5 });
    const ill = this.add.graphics();
    ill.fillStyle(hexOf(ch.visual.sky), 1);
    ill.fillRoundedRect(x + pad, top + pad, 150, 150, 26);
    this.add.image(x + pad + 75, top + pad + 80, `region-${ch.visual.icon}`).setScale(0.82);
    const tx = x + pad + 180;
    label(this, tx, top + 54, `Chapitre ${ch.number}`, font.caption + 1, { color: color.inkSoft, weight: 700, align: 'left' });
    label(this, tx, top + 108, ch.name, font.heading, { weight: 700, align: 'left', wrap: w - pad - 200 });
    chip(this, tx, top + 170, done ? 'Terminé' : 'En cours', done ? 'success' : 'primary', { align: 'left' }).setName(`chapter-state-${ch.id}`);
    label(this, x + w - pad, top + 170, `${levelsDone}/${ch.levels.length} · ${stars} ★`, font.label, { weight: 700, align: 'right' }).setName(`chapter-progress-${ch.id}`);
    ch.levels.forEach((lv, i) => this.levelRow(lv, i, x + pad, top + headH + i * (rowH + space.sm), w - pad * 2, rowH, lv.key === next, ch.levels[i - 1]));
    return top + h;
  }

  private levelRow(def: LevelDef, i: number, x: number, y: number, w: number, h: number, isNext: boolean, prev?: LevelDef) {
    const prog = Save.level(def.key);
    const unlocked = isUnlocked(def.key);
    const run = Save.run();
    const inProgress = !!run && run.key === def.key && run.version === def.version;
    const g = this.add.graphics();
    g.fillStyle(hexOf(unlocked ? (isNext || inProgress ? '#fff4e2' : '#ffffff') : '#f1ebdd'), 1);
    g.fillRoundedRect(x, y, w, h, 28);
    g.lineStyle(isNext || inProgress ? 5 : 3, hexOf(isNext || inProgress ? color.primary : color.border), 1);
    g.strokeRoundedRect(x, y, w, h, 28);
    // pastille numérotée (forme) + couleur selon l'état
    const cx = x + 78, cy = y + h / 2;
    this.add.circle(cx, cy, 46, hexOf(prog?.completed ? color.success : unlocked ? color.primary : color.locked));
    if (unlocked) label(this, cx, cy, String(def.id), font.heading, { weight: 700, color: '#ffffff', display: true });
    else this.add.image(cx, cy, 'ic-lock').setScale(0.42).setTint(0xffffff);
    const tx = x + 150;
    label(this, tx, cy - 6, def.name, font.body + 2, { weight: 700, align: 'left', color: unlocked ? color.ink : color.inkSoft }).setOrigin(0, 1);
    let sub: string;
    if (!unlocked) sub = prev ? `Termine le niveau ${prev.id}` : 'Termine le chapitre précédent';
    else if (inProgress) sub = `En cours · ${run!.path.length} déplacement${run!.path.length > 1 ? 's' : ''}`;
    else if (prog?.completed && prog.bestMoves) sub = `Record : ${prog.bestMoves} déplacements · ${def.difficulty}`;
    else if (prog?.completed) sub = `Terminé (ancienne carte) · ${def.difficulty}`;
    else sub = def.difficulty;
    label(this, tx, cy + 4, sub, font.caption + 1, { color: color.inkSoft, weight: 700, align: 'left', wrap: w - 150 - 230 }).setOrigin(0, 0).setName(`level-sub-${def.key}`);
    // droite : étoiles ou action
    const rx = x + w - 30;
    if (prog?.completed) {
      for (let k = 0; k < 3; k++) this.add.image(rx - 30 - (2 - k) * 62, cy, k < prog.stars ? 'star-full' : 'star-empty').setScale(0.36);
    } else if (unlocked) {
      chip(this, rx, cy, inProgress ? 'Reprendre' : isNext ? 'Jouer' : 'À jouer', isNext || inProgress ? 'primary' : 'neutral', { align: 'right' });
    }
    const hit = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0, 0).setInteractive({ useHandCursor: unlocked });
    hit.name = `card-${def.key}`;
    const open = () => { if (unlocked) goTo(this, 'Game', { kind: 'adventure', key: def.key, resume: inProgress }); };
    hit.on('pointerup', (p: Phaser.Input.Pointer) => { if (Math.abs(p.getDistanceY()) < 30) open(); });
    a11yButton(this, hit, unlocked ? `Niveau ${def.id}, ${def.name}. ${sub}` : `Niveau ${def.id}, verrouillé. ${sub}`, open, () => unlocked);
    if (isNext && !reduced() && !Save.introSeen(`unlock-${def.key}`) && i > 0) {
      // courte animation au déblocage d'un niveau
      Save.markIntroSeen(`unlock-${def.key}`);
      const ring = this.add.circle(cx, cy, 46).setStrokeStyle(8, hexOf(color.primary));
      this.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 700, repeat: 1 });
    }
  }

  private futureRow(ch: ChapterDef, y: number) {
    const x = space.margin, w = W - space.margin * 2, h = 118;
    cardBg(this, x, y, w, h, { fill: '#f3ecdc', alpha: 0.85 });
    this.add.image(x + 70, y + h / 2, `region-${ch.visual.icon}`).setScale(0.42).setTint(0x9a968a).setAlpha(0.7);
    label(this, x + 140, y + h / 2, `Chapitre ${ch.number} · ${ch.name}`, font.label, { color: color.inkSoft, weight: 700, align: 'left', wrap: w - 140 - 250 });
    chip(this, x + w - space.pad, y + h / 2, 'À venir', 'locked', { align: 'right' });
  }
}
