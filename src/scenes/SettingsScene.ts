import Phaser from 'phaser';
import { syncAmbience } from '../audio/sfx';
import { Save, type Settings } from '../save';
import { cardBg, label, uiButton } from '../ui/components';
import { color, font, space, touch } from '../ui/theme';
import { H, toast, toggle, W } from '../ui/ui';

/** Paramètres (superposés à l'écran appelant, qui est mis en pause). */
export class SettingsScene extends Phaser.Scene {
  private from = 'Home';
  constructor() {
    super('Settings');
  }

  init(data: { from?: string }) {
    this.from = data.from ?? 'Home';
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, color.scrim, 0.42).setInteractive();
    const w = W - space.margin * 2 - 40, h = 1420;
    const x0 = (W - w) / 2, top = (H - h) / 2;
    cardBg(this, x0, top, w, h);
    label(this, W / 2, top + 90, 'Paramètres', font.title + 4, { weight: 700 });
    const rows: [string, keyof Settings, string][] = [
      ['Effets sonores', 'sound', ''],
      ['Ambiance du jardin', 'ambience', ''],
      ['Animations réduites', 'reducedMotion', 'Limite les mouvements et effets à l’écran'],
      ['Présentation des niveaux', 'levelIntro', 'Met en évidence la sortie à la première visite'],
    ];
    rows.forEach(([text, key, help], i) => {
      const y = top + 250 + i * 190;
      label(this, x0 + space.pad + 30, y - (help ? 20 : 0), text, font.body, { weight: 600, align: 'left' });
      if (help) label(this, x0 + space.pad + 30, y + 34, help, font.caption, { color: color.inkSoft, weight: 500, align: 'left', wrap: w - 360 });
      toggle(this, x0 + w - space.pad - 100, y, Save.settings()[key] as boolean, () => {
        Save.setSetting(key, !Save.settings()[key]);
        syncAmbience();
        return Save.settings()[key] as boolean;
      }, `toggle-${key}`);
    });
    const bw = w - space.pad * 2 - 40;
    let confirm = false;
    const reset = uiButton(this, W / 2, top + h - 330, 'secondary', { label: 'Réinitialiser la progression', width: bw, name: 'btn-reset' }, () => {
      if (!confirm) {
        confirm = true;
        reset.setLabel('Toucher encore pour tout effacer');
        this.time.delayedCall(3000, () => { confirm = false; reset.setLabel('Réinitialiser la progression'); });
        return;
      }
      Save.resetProgress();
      reset.setLabel('Progression effacée');
      toast(this, 'Progression effacée', top + h - 470, 1600);
      confirm = false;
    });
    uiButton(this, W / 2, top + h - space.pad - touch.primaryH / 2 - 30, 'primary', { label: 'FERMER', width: bw, name: 'btn-close' }, () => this.close());
  }

  private close() {
    this.scene.resume(this.from);
    if (this.from === 'Home') this.scene.get(this.from).scene.restart();
    this.scene.stop();
  }
}
