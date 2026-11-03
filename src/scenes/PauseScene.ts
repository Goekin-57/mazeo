import Phaser from 'phaser';
import { syncAmbience } from '../audio/sfx';
import { Save, type Settings } from '../save';
import { cardBg, label, uiButton } from '../ui/components';
import { color, font, space, touch } from '../ui/theme';
import { H, toggle, W } from '../ui/ui';
import type { GameScene } from './GameScene';

/**
 * Menu pause superposé : le niveau en dessous est réellement suspendu (scene.pause).
 * Boutons avec texte : la décision doit être claire.
 */
export class PauseScene extends Phaser.Scene {
  private opts: { canRestart: boolean; hints: boolean } = { canRestart: false, hints: false };
  constructor() {
    super('Pause');
  }

  init(data: { canRestart?: boolean; hints?: boolean }) {
    this.opts = { canRestart: !!data.canRestart, hints: !!data.hints };
  }

  create() {
    const game = this.scene.get('Game') as GameScene;
    const close = (action: 'resume' | 'restart' | 'quit' | 'hint' | 'help') => {
      this.scene.stop();
      game.resumeFromPause(action);
    };
    this.add.rectangle(W / 2, H / 2, W, H, color.scrim, 0.42).setInteractive();
    const w = W - space.margin * 2 - 40;
    const rows: [string, keyof Settings][] = [['Son', 'sound'], ['Animations réduites', 'reducedMotion']];
    const nBtn = 3 + (this.opts.hints ? 1 : 0);
    const h = 150 + touch.primaryH + nBtn * (touch.secondaryH + space.gap) + rows.length * 130 + 70;
    const top = Math.round((H - h) / 2);
    const x0 = (W - w) / 2;
    cardBg(this, x0, top, w, h);
    label(this, W / 2, top + 80, 'Pause', font.title + 6, { weight: 700 });
    const bw = w - 2 * space.pad - 40;
    let y = top + 160 + touch.primaryH / 2;
    uiButton(this, W / 2, y, 'primary', { label: 'Reprendre', icon: 'ic-play', width: bw, name: 'pause-resume' }, () => close('resume'));
    y += touch.primaryH / 2 + space.gap + 6 + touch.secondaryH / 2;
    const restart = uiButton(this, W / 2, y, 'secondary', { label: 'Recommencer', icon: 'ic-restart', width: bw, name: 'pause-restart' }, () => close('restart'));
    restart.setEnabled(this.opts.canRestart);
    if (this.opts.hints) {
      y += touch.secondaryH + space.gap;
      uiButton(this, W / 2, y, 'secondary', { label: 'Un indice', icon: 'ic-hint', width: bw, name: 'pause-hint' }, () => close('hint'));
    }
    y += touch.secondaryH + space.gap;
    uiButton(this, W / 2, y, 'secondary', { label: 'Aide des commandes', icon: 'ic-help', width: bw, name: 'pause-help' }, () => close('help'));
    y += touch.secondaryH / 2 + 40;
    rows.forEach(([text, key]) => {
      const ry = y + 65;
      label(this, x0 + space.pad + 30, ry, text, font.body + 1, { weight: 700, align: 'left' });
      toggle(this, x0 + w - space.pad - 90, ry, Save.settings()[key] as boolean, () => {
        Save.setSetting(key, !Save.settings()[key]);
        if (key === 'sound') syncAmbience();
        return Save.settings()[key] as boolean;
      }, `pause-toggle-${key}`, text);
      y += 130;
    });
    y += 20 + touch.secondaryH / 2;
    uiButton(this, W / 2, y, 'secondary', { label: 'Quitter le niveau', icon: 'ic-back', width: bw, name: 'pause-quit' }, () => close('quit'));
    this.input.keyboard?.on('keydown-ESC', () => close('resume'));
  }
}
