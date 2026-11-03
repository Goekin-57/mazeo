import Phaser from 'phaser';
import { C } from '../art/palette';
import { Sfx } from '../audio/sfx';
import { chapterById, CHAPTERS } from '../content/chapters';
import { rewardById } from '../content/rewards';
import { Save } from '../save';
import { drawTrail } from '../ui/trail';
import { backdrop, centerCamera, fadeIn, goTo, reduced, txt, W } from '../ui/ui';
import { uiButton } from '../ui/components';
import { font } from '../ui/theme';
import { Player } from './Player';

/** Fin de chapitre : carte du Grand Sentier, récompenses, aperçu du chapitre suivant (indisponible). */
export class ChapterEndScene extends Phaser.Scene {
  private chapterId = 'chapter01';
  private rewards: string[] = [];
  constructor() {
    super('ChapterEnd');
  }

  init(data: { chapterId?: string; rewards?: string[] }) {
    this.chapterId = data.chapterId ?? 'chapter01';
    this.rewards = data.rewards ?? [];
  }

  create() {
    this.input.enabled = true;
    centerCamera(this);
    fadeIn(this);
    backdrop(this);
    const ch = chapterById(this.chapterId)!;
    Save.markChapterEndSeen(ch.id);
    Sfx.win();
    const title = txt(this, W / 2, 110, `Chapitre ${ch.number} terminé !`, 72, { weight: 700, color: C.orangeDeep, stroke: '#ffffff', strokeW: 14 });
    txt(this, W / 2, 196, 'La première balise du Grand Sentier brille à nouveau.', font.caption + 3, { color: C.inkSoft, weight: 500 });
    if (!reduced()) this.tweens.add({ targets: title, scale: { from: 0.6, to: 1 }, duration: 600, ease: 'Back.easeOut' });

    // l'ancienne carte du Grand Sentier apparaît
    const lit = CHAPTERS.filter((c) => Save.chapter(c.id).completed).length;
    const map = this.add.container(0, 0);
    const before = this.children.list.length;
    drawTrail(this, 250, 780, lit, { names: false });
    this.children.list.slice(before).forEach((o) => map.add(o));
    map.setScale(0.9).setPosition(54, 25);
    if (!reduced()) {
      map.setAlpha(0);
      this.tweens.add({ targets: map, alpha: 1, duration: 800, delay: 300 });
    }

    // récompenses obtenues
    const ids = this.rewards.length ? this.rewards : ch.rewards;
    txt(this, W / 2, 1075, 'Récompenses', font.heading, { weight: 700 });
    ids.forEach((id, k) => {
      const r = rewardById(id);
      if (!r) return;
      const x = W / 2 + (k - (ids.length - 1) / 2) * 340;
      const ic = this.add.image(x - 90, 1160, r.icon).setScale(r.slot === 'badge' ? 0.6 : 0.8);
      txt(this, x + 20, 1160, r.name, font.label, { weight: 600, align: 'left', wrap: 220 }).setOrigin(0, 0.5);
      if (!reduced()) this.tweens.add({ targets: ic, scale: { from: 0, to: ic.scale }, duration: 500, delay: 900 + k * 250, ease: 'Back.easeOut' });
    });

    // aperçu du chapitre suivant
    const next = CHAPTERS.find((c) => c.requires === ch.id);
    if (next) {
      const prev = this.add.image(W / 2, 1420, 'preview-harbor').setScale(1.05);
      txt(this, W / 2, 1290, `Prochaine étape · Chapitre ${next.number}`, font.caption + 2, { color: C.inkSoft, weight: 600 });
      const lbl = txt(this, W / 2, 1540, next.name, 44, { weight: 700, color: '#ffffff', stroke: '#2f5f6f', strokeW: 10 });
      txt(this, W / 2, 1625, 'Pas encore disponible dans ce prototype', font.caption + 2, { color: C.inkSoft, weight: 500 });
      if (!reduced()) this.tweens.add({ targets: [prev, lbl], alpha: { from: 0, to: 1 }, duration: 900, delay: 1400 });
    }

    // Bourgeon célèbre (avec son nouveau chapeau)
    const eq = Save.get().collection.equipped;
    const pip = new Player(this, 150, 1190, 0.9, { hat: eq.hat === 'hat-gardener', golden: eq.scarf === 'scarf-golden' });
    this.time.delayedCall(500, () => pip.joy());

    // une seule action principale ; l'accueil reste accessible en secondaire
    uiButton(this, W / 2 + 150, 1790, 'primary', { label: 'Retour à l’aventure', width: 600, name: 'btn-journey' }, () => goTo(this, 'Journey'));
    uiButton(this, W / 2 - 330, 1790, 'secondary', { label: 'Accueil', icon: 'ic-home', width: 300, name: 'btn-home' }, () => goTo(this, 'Home'));
  }
}
