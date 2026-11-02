import Phaser from 'phaser';
import { C, hex } from '../art/palette';
import { syncAmbience } from '../audio/sfx';
import { Save } from '../save';
import { button, centerCamera, toast, toggle, txt, W, H } from '../ui/ui';

/** Paramètres (superposé à l'écran appelant). */
export class SettingsScene extends Phaser.Scene {
  private from = 'Home';
  constructor() {
    super('Settings');
  }

  init(data: { from?: string }) {
    this.from = data.from ?? 'Home';
  }

  create() {
    centerCamera(this);
    this.add.rectangle(W / 2, 960, W, H + 20, 0x2c4a30, 0.4).setInteractive();
    const g = this.add.graphics();
    const top = 380, ph = 1120;
    g.fillStyle(0x2c4a30, 0.2);
    g.fillRoundedRect(W / 2 - 420, top + 12, 840, ph, 56);
    g.fillStyle(0xfffbf0, 0.98);
    g.fillRoundedRect(W / 2 - 420, top, 840, ph, 56);
    g.lineStyle(5, hex(C.sage), 1);
    g.strokeRoundedRect(W / 2 - 420, top, 840, ph, 56);
    this.add.image(W / 2, top + 90, 'icon-gear').setScale(1.2);
    txt(this, W / 2, top + 175, 'Paramètres', 62, { weight: 700 });

    const rows: [string, string, keyof ReturnType<typeof Save.settings>][] = [
      ['icon-sound-on', 'Effets sonores', 'sound'],
      ['icon-sound-on', 'Ambiance du jardin', 'ambience'],
      ['icon-motion', 'Animations réduites', 'reducedMotion'],
    ];
    rows.forEach(([icon, label, key], k) => {
      const y = top + 320 + k * 130;
      this.add.image(W / 2 - 320, y, icon).setScale(0.75);
      txt(this, W / 2 - 270, y, label, 42, { align: 'left', weight: 500 }).setOrigin(0, 0.5);
      toggle(this, W / 2 + 290, y, Save.settings()[key], () => {
        Save.setSetting(key, !Save.settings()[key]);
        syncAmbience();
        return Save.settings()[key];
      }, `toggle-${key}`);
    });
    txt(this, W / 2, top + 700, 'Les animations réduites limitent les mouvements\net les effets à l’écran.', 30, { color: C.inkSoft, weight: 400 });

    let confirm = false;
    const reset = button(this, W / 2, top + 840, 'pill-cream', { label: 'Réinitialiser la progression', size: 36 }, () => {
      if (!confirm) {
        confirm = true;
        toast(this, 'Touche encore pour tout effacer', 1640, 2200);
        this.time.delayedCall(2500, () => (confirm = false));
        return;
      }
      Save.resetProgress();
      toast(this, 'Progression effacée', 1640, 1600);
      confirm = false;
    }, 'btn-reset');
    reset.setScale(0.9);
    button(this, W / 2, top + 990, 'pill-orange', { label: 'Fermer', size: 48 }, () => this.close(), 'btn-close');
  }

  private close() {
    this.scene.resume(this.from);
    if (this.from === 'Home') this.scene.get(this.from).scene.restart();
    this.scene.stop();
  }
}
