import Phaser from 'phaser';
import { C, hex } from '../art/palette';
import { Sfx } from '../audio/sfx';
import { REWARDS, type RewardDef } from '../content/rewards';
import { Save } from '../save';
import { backdrop, button, centerCamera, fadeIn, goTo, reduced, toast, txt, W } from '../ui/ui';
import { Player } from './Player';

/** Collection : objets obtenus, équipement visible sur Bourgeon et sur l'accueil. */
export class CollectionScene extends Phaser.Scene {
  constructor() {
    super('Collection');
  }

  create() {
    this.input.enabled = true;
    centerCamera(this);
    fadeIn(this);
    backdrop(this, { clouds: false });
    const fresh = Save.get().collection.fresh.slice();
    button(this, 96, 96, 'btn-small', { icon: 'icon-back', iconScale: 0.9 }, () => goTo(this, 'Home'), 'btn-back').setScale(0.95);
    txt(this, W / 2 + 30, 104, 'Collection', 66, { weight: 700 });
    const owned = REWARDS.filter((r) => Save.owns(r.id)).length;
    txt(this, W / 2, 182, `${owned}/${REWARDS.length} objets · uniquement décoratifs`, 32, { color: C.inkSoft, weight: 500 });

    // aperçu de Bourgeon équipé
    const g = this.add.graphics();
    g.fillStyle(0xfffbf0, 0.9);
    g.fillRoundedRect(140, 230, W - 280, 440, 60);
    const eq = Save.get().collection.equipped;
    const pip = new Player(this, W / 2, 630, 1.7, { hat: eq.hat === 'hat-gardener', golden: eq.scarf === 'scarf-golden' });
    pip.setName('collection-pip');
    if (eq.companion === 'companion-duckling') this.add.image(W / 2 + 190, 620, 'duckling').setOrigin(0.5, 0.9).setScale(1.5).setFlipX(true);
    if (eq.decor.includes('deco-magic-flower')) this.add.image(W / 2 - 250, 640, 'magic-flower').setOrigin(0.5, 0.95).setScale(1.6);
    if (eq.decor.includes('deco-lanterns')) this.add.image(W / 2 + 330, 640, 'lantern').setOrigin(0.5, 0.95).setScale(1.6);

    REWARDS.forEach((r, k) => this.card(r, 290 + (k % 2) * 500, 790 + Math.floor(k / 2) * 250, fresh.includes(r.id)));
    Save.clearFresh();
  }

  private equipped(r: RewardDef) {
    const e = Save.get().collection.equipped;
    if (r.slot === 'decor') return e.decor.includes(r.id);
    if (r.slot === 'badge') return false;
    return e[r.slot] === r.id;
  }

  private card(r: RewardDef, x: number, y: number, isNew: boolean) {
    const own = Save.owns(r.id);
    const on = this.equipped(r);
    const w = 460, h = 220;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x2c4a30, 0.12);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 8, w, h, 34);
    g.fillStyle(own ? 0xffffff : 0xf3ecdc, 0.96);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 34);
    g.lineStyle(on ? 6 : 3, on ? hex(C.meadow) : own ? hex(C.orange) : 0xd8d0bd, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 34);
    c.add(g);
    const icon = this.add.image(-w / 2 + 90, 0, own ? r.icon : r.slot === 'badge' ? 'badge-locked' : r.icon).setScale(r.slot === 'badge' ? 0.85 : r.icon === 'magic-flower' || r.icon === 'lantern' ? 1.2 : 1);
    if (!own) icon.setTint(0x8f8b80).setAlpha(0.45);
    c.add(icon);
    c.add(txt(this, -w / 2 + 180, -40, r.name, 32, { weight: 700, align: 'left', wrap: 260, color: own ? C.ink : C.inkSoft }).setOrigin(0, 0.5));
    const state = !own ? r.how : r.slot === 'badge' ? 'Badge obtenu' : on ? 'Équipé · toucher pour retirer' : 'Toucher pour équiper';
    c.add(txt(this, -w / 2 + 180, 36, state, 26, { weight: 500, align: 'left', wrap: 260, color: on ? C.meadowDark : C.inkSoft }).setOrigin(0, 0.5).setName(`state-${r.id}`));
    if (!own) c.add(this.add.image(w / 2 - 40, -h / 2 + 40, 'icon-lock').setScale(0.5));
    if (isNew) {
      const tag = this.add.container(w / 2 - 70, -h / 2 + 4);
      const tg = this.add.graphics();
      tg.fillStyle(hex(C.orange), 1);
      tg.fillRoundedRect(-62, -22, 124, 44, 22);
      tag.add([tg, txt(this, 0, 0, 'Nouveau', 26, { color: '#fff', weight: 700 })]);
      c.add(tag);
      if (!reduced()) this.tweens.add({ targets: tag, scale: 1.1, duration: 600, yoyo: true, repeat: -1 });
    }
    const hit = this.add.rectangle(0, 0, w, h, 0, 0).setInteractive({ useHandCursor: true });
    hit.name = `item-${r.id}`;
    hit.on('pointerup', () => {
      Sfx.click();
      if (!own) return toast(this, r.how, 1820, 2000);
      if (r.slot === 'badge') return toast(this, `Badge : ${r.name}`, 1820, 1600);
      if (r.slot === 'decor') Save.toggleDecor(r.id, !on);
      else Save.equip(r.slot, on ? null : r.id);
      this.scene.restart();
    });
    c.add(hit);
  }
}
