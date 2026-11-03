import Phaser from 'phaser';

/**
 * Ancienne sélection des niveaux d'un chapitre (V4). Depuis la v0.5, les niveaux sont listés
 * directement dans « Aventure » : cette scène redirige les anciens appels et liens.
 */
export class ChapterScene extends Phaser.Scene {
  constructor() {
    super('Chapter');
  }

  create() {
    this.scene.start('Journey');
  }
}
