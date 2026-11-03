import Phaser from 'phaser';

/**
 * Ancienne rubrique « Communauté » (V4). Depuis la v0.5, « Mes records » et « Défier un ami »
 * sont dans Défis : cette scène ne fait que rediriger les anciens liens et appels.
 */
export class CommunityScene extends Phaser.Scene {
  constructor() {
    super('Community');
  }

  create() {
    this.scene.start('Challenges', { focus: 'records' });
  }
}
