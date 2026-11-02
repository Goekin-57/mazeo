import Phaser from 'phaser';
import { generateTextures } from '../art/textures';

/** Génère toutes les textures (dessinées localement) puis lance l'accueil. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    generateTextures(this);
    const params = new URLSearchParams(window.location.search);
    const lvl = Number(params.get('level'));
    // accès direct à un niveau réservé aux tests automatisés (?e2e&level=N)
    if (params.has('e2e') && lvl >= 1 && lvl <= 6) this.scene.start('Game', { level: lvl });
    else this.scene.start('Menu');
  }
}
