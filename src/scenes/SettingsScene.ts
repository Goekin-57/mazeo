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
    label(this, W / 2, top + 90, 'Réglages', font.title + 4, { weight: 700 });
    const rows: [string, keyof Settings, string][] = [
      ['Effets sonores', 'sound', ''],
      ['Ambiance du jardin', 'ambience', ''],
      ['Animations réduites', 'reducedMotion', 'Limite les mouvements et effets à l’écran'],
      ['Présentation des niveaux', 'levelIntro', 'Met en évidence la sortie à la première visite'],
    ];
    rows.forEach(([text, key, help], i) => {
      const y = top + 250 + i * 190;
      label(this, x0 + space.pad + 30, help ? y - 6 : y, text, font.body + 1, { weight: 700, align: 'left', wrap: w - 360 }).setOrigin(0, help ? 1 : 0.5);
      if (help) label(this, x0 + space.pad + 30, y + 6, help, font.caption + 1, { color: color.inkSoft, weight: 600, align: 'left', wrap: w - 360 }).setOrigin(0, 0);
      toggle(this, x0 + w - space.pad - 100, y, Save.settings()[key] as boolean, () => {
        Save.setSetting(key, !Save.settings()[key]);
        syncAmbience();
        return Save.settings()[key] as boolean;
      }, `toggle-${key}`, text);
    });
    const bw = w - space.pad * 2 - 40;
    uiButton(this, W / 2, top + h - 330, 'secondary', { label: 'Effacer la progression…', width: bw, name: 'btn-reset' }, () => this.confirmReset());
    uiButton(this, W / 2, top + h - space.pad - touch.primaryH / 2 - 30, 'primary', { label: 'Fermer', width: bw, name: 'btn-close' }, () => this.close());
  }

  /** Effacement global : confirmation distincte et explicite. */
  private confirmReset() {
    const c = this.add.container(0, 0).setDepth(1000).setName('reset-confirm');
    c.add(this.add.rectangle(W / 2, H / 2, W, H, color.scrim, 0.5).setInteractive());
    const w = W - space.margin * 2 - 80, h = 640, x0 = (W - w) / 2, top = (H - h) / 2;
    c.add(cardBg(this, x0, top, w, h, { border: color.danger, borderW: 5 }));
    c.add(label(this, W / 2, top + 84, 'Effacer toute la progression ?', font.heading + 2, { weight: 700, wrap: w - 80 }));
    c.add(label(this, W / 2, top + 190, 'Niveaux, étoiles, collection, partie en cours et records de défis seront effacés. Les réglages sont conservés.', font.body, { color: color.inkSoft, weight: 600, wrap: w - 100 }).setOrigin(0.5, 0));
    const bw = (w - 2 * space.pad - space.gap) / 2;
    const by = top + h - space.pad - touch.primaryH / 2 - 10;
    c.add(uiButton(this, x0 + space.pad + bw / 2, by, 'secondary', { label: 'Annuler', width: bw, name: 'reset-cancel' }, () => c.destroy()));
    c.add(uiButton(this, x0 + w - space.pad - bw / 2, by, 'primary', { label: 'Tout effacer', width: bw, name: 'reset-confirm-btn' }, () => {
      Save.resetProgress();
      c.destroy();
      toast(this, 'Progression effacée', top - 60, 1800, 2000);
    }));
  }

  private close() {
    this.scene.resume(this.from);
    if (this.from === 'Home') this.scene.get(this.from).scene.restart();
    this.scene.stop();
  }
}
