import Phaser from 'phaser';
import { generateRegionTextures } from '../art/regions';
import { generateTextures } from '../art/textures';
import { generateTexturesV5 } from '../art/textures-v5';
import { reconcileLevelVersions } from '../progress';

/** Génère toutes les textures (dessinées localement) puis ouvre l'écran demandé. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    generateTextures(this);
    generateTexturesV5(this);
    generateRegionTextures(this);
    // cartes modifiées en v0.5 : les anciens records sont mis de côté, la progression est conservée
    reconcileLevelVersions();
    const q = new URLSearchParams(window.location.search);
    // lien de défi partagé : ?defi=puzzle-f01@1
    const defi = q.get('defi');
    if (defi) return void this.scene.start('Challenges', { linked: defi });
    // accès direct réservé aux tests automatisés (?e2e&level=N ou ?e2e&scene=…)
    if (q.has('e2e')) {
      const lvl = q.get('level');
      if (lvl) {
        const key = /^\d$/.test(lvl) ? `chapter01-level0${lvl}` : lvl;
        return void this.scene.start('Game', { kind: 'adventure', key });
      }
      const sc = q.get('scene');
      if (sc && ['Journey', 'Chapter', 'Challenges', 'Collection', 'Community', 'ChapterEnd', 'Settings'].includes(sc)) return void this.scene.start(sc, {});
    }
    this.scene.start('Home');
  }
}
