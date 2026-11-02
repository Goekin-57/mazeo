import Phaser from 'phaser';
import { syncAmbience } from '../audio/sfx';
import { Save, type Settings } from '../save';
import { cardBg, label, uiButton } from '../ui/components';
import { color, font, space, touch } from '../ui/theme';
import { H, toggle, W } from '../ui/ui';
import type { GameScene } from './GameScene';

/** Menu pause superposé : le niveau en dessous est réellement suspendu (scene.pause). */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const game = this.scene.get('Game') as GameScene;
    const close = (action: 'resume' | 'restart' | 'quit') => {
      this.scene.stop();
      game.resumeFromPause(action);
    };
    this.add.rectangle(W / 2, H / 2, W, H, color.scrim, 0.42).setInteractive();
    const w = W - space.margin * 2 - 60;
    const h = 1180;
    const top = (H - h) / 2;
    const x0 = (W - w) / 2;
    cardBg(this, x0, top, w, h);
    label(this, W / 2, top + 90, 'Pause', font.title + 6, { weight: 700 });
    const bw = w - 2 * space.pad - 40;
    uiButton(this, W / 2, top + 230, 'primary', { label: 'REPRENDRE', icon: 'icon-play', width: bw, name: 'pause-resume' }, () => close('resume'));
    uiButton(this, W / 2, top + 230 + touch.primaryH + space.gap + 10, 'secondary', { label: 'Recommencer', icon: 'icon-restart', width: bw, name: 'pause-restart' }, () => close('restart'));
    const rows: [string, keyof Settings][] = [['Son', 'sound'], ['Animations réduites', 'reducedMotion'], ['Présentation des niveaux', 'levelIntro']];
    rows.forEach(([text, key], i) => {
      const y = top + 560 + i * 140;
      label(this, x0 + space.pad + 30, y, text, font.body, { weight: 600, align: 'left' });
      toggle(this, x0 + w - space.pad - 90, y, Save.settings()[key] as boolean, () => {
        Save.setSetting(key, !Save.settings()[key]);
        if (key === 'sound') syncAmbience();
        return Save.settings()[key] as boolean;
      }, `pause-toggle-${key}`);
    });
    uiButton(this, W / 2, top + h - space.pad - touch.secondaryH / 2 - 20, 'secondary', { label: 'Quitter le niveau', icon: 'icon-back', width: bw, name: 'pause-quit' }, () => close('quit'));
    this.input.keyboard?.on('keydown-ESC', () => close('resume'));
  }
}
